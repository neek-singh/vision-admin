"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveTestQuestion,
  deleteTestQuestion,
  deleteAllTestQuestions
} from "@/app/actions/lms/tests";
import BulkQuestionModal from "./BulkQuestionModal";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  CheckCircle2,
  UploadCloud,
  FileQuestion,
  Search,
  Pencil,
  AlertTriangle
} from "lucide-react";

export default function QuestionsClient({ testId, initialQuestions }: { testId: string, initialQuestions: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option_index: 0
  });

  const handleOpenAdd = () => {
    setEditingQuestionId(null);
    setFormData({
      question_text: "",
      options: ["", "", "", ""],
      correct_option_index: 0
    });
    setIsAdding(true);
  };

  const handleOpenEdit = (q: any) => {
    setEditingQuestionId(q.id);
    setFormData({
      question_text: q.question_text || "",
      options: Array.isArray(q.options) && q.options.length >= 2
        ? [...q.options]
        : ["", "", "", ""],
      correct_option_index: typeof q.correct_option_index === "number" ? q.correct_option_index : 0
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: any = {
        test_id: testId,
        question_text: formData.question_text,
        options: formData.options,
        correct_option_index: formData.correct_option_index,
      };

      if (editingQuestionId) {
        payload.id = editingQuestionId;
      } else {
        payload.order_index = initialQuestions.length;
      }

      const res = await saveTestQuestion(payload);
      if (!res.success) throw new Error(res.error || "Failed to save question");

      setIsAdding(false);
      setEditingQuestionId(null);
      setFormData({ question_text: "", options: ["", "", "", ""], correct_option_index: 0 });
      router.refresh();
    } catch (err: any) {
      console.error("Error saving question:", err);
      alert(`Failed to save question: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await deleteTestQuestion(id);
      if (!res.success) throw new Error(res.error || "Failed to delete question");
      router.refresh();
    } catch (err: any) {
      console.error("Error deleting question:", err);
      alert(`Failed to delete question: ${err.message || "Unknown error"}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to delete all ${initialQuestions.length} questions from this test? This cannot be undone.`)) return;
    setIsClearingAll(true);
    try {
      const res = await deleteAllTestQuestions(testId);
      if (!res.success) throw new Error(res.error || "Failed to clear questions");
      router.refresh();
    } catch (err: any) {
      console.error("Error clearing questions:", err);
      alert(`Failed to clear questions: ${err.message || "Unknown error"}`);
    } finally {
      setIsClearingAll(false);
    }
  };

  const filteredQuestions = initialQuestions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const qMatches = q.question_text?.toLowerCase().includes(query);
    const optMatches = q.options?.some((opt: string) => opt?.toLowerCase().includes(query));
    return qMatches || optMatches;
  });

  return (
    <div className="space-y-5">
      {/* Action & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

        {/* Left: Questions Count & Search */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-black text-white font-black text-xs flex items-center justify-center shrink-0">
              {initialQuestions.length}
            </span>
            <div className="hidden lg:block">
              <p className="text-xs font-black text-black leading-none">Questions</p>
              <p className="text-[10px] text-slate-500 font-medium">Bank Overview</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search in questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-black placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {initialQuestions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearingAll}
              className="px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              title="Delete all questions"
            >
              {isClearingAll ? <Loader2 size={13} className="animate-spin text-red-500" /> : <Trash2 size={13} />}
              <span className="hidden md:inline">Clear All</span>
            </button>
          )}

          {/* Bulk Import */}
          <button
            type="button"
            onClick={() => setIsBulkAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <UploadCloud size={15} />
            <span>Bulk Import</span>
          </button>

          {/* Add Single */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Bulk Question Modal */}
      <BulkQuestionModal
        testId={testId}
        isOpen={isBulkAdding}
        onClose={() => setIsBulkAdding(false)}
        onSuccess={() => router.refresh()}
      />

      {/* Add / Edit Question Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-900 text-base">
                {editingQuestionId ? "Edit Question" : "Add Single Question"}
              </h3>
              <button
                onClick={() => { setIsAdding(false); setEditingQuestionId(null); }}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Question Text</label>
                <textarea
                  required
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Enter the question text here..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold resize-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows={3}
                />
              </div>

              <div className="space-y-2.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Options (Click letter to mark as Correct)
                </label>
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, correct_option_index: idx })}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all shrink-0 cursor-pointer ${formData.correct_option_index === idx
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      title={formData.correct_option_index === idx ? "Marked as correct" : "Click to mark correct"}
                    >
                      {formData.correct_option_index === idx ? <CheckCircle2 size={16} /> : <span>{String.fromCharCode(65 + idx)}</span>}
                    </button>
                    <input
                      required
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[idx] = e.target.value;
                        setFormData({ ...formData, options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingQuestionId(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {editingQuestionId ? "Update Question" : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {initialQuestions.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <FileQuestion size={28} />
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mb-1">No Questions Added Yet</h3>
          <p className="text-xs text-slate-500 font-medium mb-5">
            Add questions one by one or upload in bulk using a CSV spreadsheet or AI copy-paste.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsBulkAdding(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <UploadCloud size={15} />
              Bulk Import (CSV / AI)
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={15} />
              Add Single Question
            </button>
          </div>
        </div>
      )}

      {/* Search No Results */}
      {initialQuestions.length > 0 && filteredQuestions.length === 0 && (
        <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-500 font-medium">
          No questions match &ldquo;{searchQuery}&rdquo;. Try another keyword or clear search.
        </div>
      )}

      {/* Questions 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {filteredQuestions.map((q, qidx) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            {/* Question Header & Controls */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-md bg-black text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {qidx + 1}
                </span>
                <p className="font-extrabold text-black text-sm sm:text-base leading-snug">
                  {q.question_text}
                </p>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit question & options"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete question"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-8.5 mt-auto pt-2">
              {q.options?.map((opt: string, oidx: number) => {
                const isCorrect = q.correct_option_index === oidx;
                return (
                  <div
                    key={oidx}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all ${
                      isCorrect
                        ? "bg-emerald-50 border-emerald-300 text-black shadow-2xs"
                        : "bg-slate-50/90 border-slate-200 text-black"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-black border border-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + oidx)}
                    </span>
                    <span className="flex-1 break-words font-bold text-black">{opt}</span>
                    {isCorrect && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
