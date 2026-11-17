"use client";

import React, { useState, useRef } from "react";
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Trash2,
  Sparkles,
  Info
} from "lucide-react";
import { 
  parseCsvQuestions, 
  parsePlainTextQuestions, 
  generateSampleQuestionsCsv,
  ParsedQuestionItem 
} from "@/lib/lms/questionParser";
import { saveTestQuestionsBulk } from "@/app/actions/lms/tests";

interface BulkQuestionModalProps {
  testId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkQuestionModal({
  testId,
  isOpen,
  onClose,
  onSuccess,
}: BulkQuestionModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validQuestions = parsedQuestions.filter((q) => q.isValid);
  const invalidCount = parsedQuestions.length - validQuestions.length;

  // Handle CSV file selection
  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
      setErrorMsg("Please upload a .csv or .txt file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCsvQuestions(text);
        if (result.length === 0) {
          setErrorMsg("No valid questions found in this file. Please check format or download the sample template.");
        } else {
          setParsedQuestions(result);
        }
      } catch (err: any) {
        setErrorMsg("Error parsing file: " + (err.message || "Unknown error"));
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Handle Paste text parsing
  const handleParseText = () => {
    setErrorMsg(null);
    if (!pasteText.trim()) {
      setErrorMsg("Please paste your questions or spreadsheet text first.");
      return;
    }
    const result = parsePlainTextQuestions(pasteText);
    if (result.length === 0) {
      setErrorMsg("Could not detect any questions. Please check the sample format below.");
    } else {
      setParsedQuestions(result);
    }
  };

  // Download sample CSV
  const handleDownloadSample = () => {
    const csvContent = generateSampleQuestionsCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete a single row from parsed preview
  const handleRemoveQuestion = (id: string) => {
    setParsedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Change correct option in preview
  const handleChangeCorrectOption = (id: string, optIdx: number) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, correct_option_index: optIdx } : q))
    );
  };

  // Submit bulk save
  const handleSaveBulk = async () => {
    if (validQuestions.length === 0) {
      alert("No valid questions to import.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = validQuestions.map((q) => ({
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
      }));

      const res = await saveTestQuestionsBulk(testId, payload);
      if (!res.success) {
        throw new Error(res.error || "Failed to save questions");
      }

      alert(`Successfully added ${res.count || validQuestions.length} questions!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Bulk save error:", err);
      setErrorMsg(err.message || "Failed to save questions");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg tracking-tight">Bulk Add Questions</h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload CSV spreadsheet or paste AI questions directly
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Tabs */}
          {parsedQuestions.length === 0 && (
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-md">
              <button
                type="button"
                onClick={() => { setActiveTab("file"); setErrorMsg(null); }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === "file" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet size={15} />
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("paste"); setErrorMsg(null); }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === "paste" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText size={15} />
                Paste Text / AI
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm font-medium">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: File Upload */}
          {parsedQuestions.length === 0 && activeTab === "file" && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? "border-indigo-600 bg-indigo-50/50" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm">
                  <FileSpreadsheet size={28} />
                </div>
                <p className="font-bold text-slate-800 text-base mb-1">
                  Click to choose a CSV file or drag & drop here
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Supports standard comma-separated or tab-separated CSV (.csv)
                </p>
              </div>

              {/* Template Download & Info Box */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-800">CSV Header Format:</p>
                    <p className="text-slate-500 font-mono mt-0.5">
                      Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  <Download size={14} />
                  Download Sample CSV
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Paste Text / AI */}
          {parsedQuestions.length === 0 && activeTab === "paste" && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Paste Questions from ChatGPT, Gemini, or Spreadsheet
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPasteText(`1. What is the full form of CPU?
A. Central Processing Unit
B. Computer Personal Unit
C. Control Processing Unit
D. Core Processing Unit
Answer: A

2. Which memory is volatile?
A) ROM
B) RAM
C) Hard Disk
D) Optical Drive
Correct: B

3. In MS Word, what is the shortcut key to Save a document?
A. Ctrl + S
B. Ctrl + P
C. Ctrl + O
D. Ctrl + Z
Ans: A`);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    Insert Example Text
                  </button>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste questions in any standard format:\n\n1. What is the full form of RAM?\nA. Random Access Memory\nB. Read Access Memory\nC. Rapid Access Memory\nD. Real Access Memory\nAnswer: A\n\n(Or paste copied table rows directly from Excel / Google Sheets)`}
                  rows={9}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <Sparkles size={14} />
                  Parse & Preview Questions
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW OF PARSED QUESTIONS */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    {validQuestions.length} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      {invalidCount} Invalid/Incomplete
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParsedQuestions([])}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold hover:bg-slate-200/60 rounded-xl transition-all"
                  >
                    Reset & Upload Again
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      q.isValid 
                        ? "bg-white border-slate-200/90 shadow-2xs" 
                        : "bg-red-50/40 border-red-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-sm leading-snug">
                            {q.question_text || <span className="text-red-500 italic">Empty Question Text</span>}
                          </p>
                          {q.error && (
                            <p className="text-[11px] text-red-600 font-semibold mt-1">
                              ⚠ {q.error}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correct_option_index === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleChangeCorrectOption(q.id, oIdx)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2.5 transition-all ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-black ${
                                isCorrect 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-white text-slate-400 border border-slate-200"
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="flex-1 truncate">{opt || `(Option ${String.fromCharCode(65 + oIdx)})`}</span>
                            {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>

          {parsedQuestions.length > 0 && (
            <button
              type="button"
              onClick={handleSaveBulk}
              disabled={isSubmitting || validQuestions.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  Saving Questions...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Import {validQuestions.length} Questions
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
