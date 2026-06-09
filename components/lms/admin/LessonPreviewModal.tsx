"use client";

import { useState, useEffect } from "react";
import { X, Video, ExternalLink, FileText, CheckCircle2, XCircle, HelpCircle, FolderCode } from "lucide-react";

interface LessonPreviewModalProps {
  lesson: any;
  onClose: () => void;
}

interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function LessonPreviewModal({ 
  lesson, 
  onClose 
}: LessonPreviewModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  // Add Copy buttons to code blocks
  useEffect(() => {
    const timer = setTimeout(() => {
      const preBlocks = document.querySelectorAll('.rich-content pre');
      preBlocks.forEach((el) => {
        const pre = el as HTMLElement;
        if (pre.querySelector('.copy-button')) return;
        
        pre.style.position = 'relative';
        const button = document.createElement('button');
        button.innerHTML = 'Copy';
        button.className = 'copy-button absolute top-3 right-3 px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100';
        
        pre.classList.add('group');
        
        button.onclick = () => {
          const codeElement = pre.querySelector('code') as HTMLElement;
          const code = codeElement?.innerText || pre.innerText;
          navigator.clipboard.writeText(code);
          button.innerHTML = 'Copied!';
          setTimeout(() => button.innerHTML = 'Copy', 2000);
        };
        
        pre.appendChild(button);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [lesson.notes_content]);

  // Extract MCQ questions
  const getQuestions = (): MCQQuestion[] => {
    const content = lesson.notes_content || "";
    const match = content.match(/<!-- MCQ_QUESTIONS_JSON:(.*?) -->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Error parsing MCQ questions in preview:", e);
      }
    }
    return [];
  };

  const questions = getQuestions();
  const lessonType = lesson.lesson_type || lesson.type || 'video';

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true">
      <div className="bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col w-full max-w-5xl rounded-[3rem] max-h-[95vh]">
        <div className="px-8 py-6 flex items-center justify-between bg-white rounded-t-[3rem] border-b border-slate-50">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">Admin Preview</span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{lesson.title}</h3>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {lessonType === 'mcq' ? 'Quiz' : lessonType === 'notes' ? 'Theory' : lessonType === 'assignment' ? 'Assignment' : lessonType === 'project' ? 'Project' : 'Video'} • {lesson.duration || '0'} Mins
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
             {lessonType === 'video' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="w-full bg-black rounded-xl overflow-hidden shadow-sm aspect-video">
                     {lesson.content_url ? (
                       <iframe 
                         src={
                           lesson.content_url?.includes('youtu.be') 
                             ? `https://www.youtube.com/embed/${lesson.content_url.split('/').pop()}` 
                             : lesson.content_url?.includes('vimeo.com')
                               ? `https://player.vimeo.com/video/${lesson.content_url.split('/').pop()}`
                               : lesson.content_url?.replace('watch?v=', 'embed/')
                         } 
                         className="w-full h-full" 
                         allowFullScreen 
                       />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 gap-4">
                         <Video size={48} className="opacity-20" />
                         <p className="text-sm font-medium">Video content not available</p>
                       </div>
                     )}
                  </div>
                  {lesson.pdf_url && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Class Resource Link</h4>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Reference document or attachment for this class</p>
                        </div>
                      </div>
                      <a 
                        href={lesson.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-blue-500/10 shrink-0 cursor-pointer"
                      >
                         Open Resource <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {lesson.notes_content && (
                    <article className="prose prose-slate max-w-none text-slate-655 leading-relaxed text-base border-t border-slate-100 pt-6">
                      <h4 className="text-sm font-bold text-slate-900 mb-4 font-sans uppercase tracking-wider">Class Notes</h4>
                      <div 
                        dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_DATA_JSON:(.*?) -->/, "") }} 
                        className="rich-content"
                      />
                    </article>
                  )}
                </div>
             )}

             {lessonType === 'assignment' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-105 text-amber-700 rounded-xl">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Reference Document URL</h4>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Attached document for the assignment task</p>
                      </div>
                    </div>
                    {lesson.pdf_url?.startsWith('http') || lesson.content_url?.startsWith('http') ? (
                      <a 
                        href={lesson.pdf_url || lesson.content_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-amber-500/10 shrink-0 cursor-pointer"
                      >
                         Open Brief / PDF <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">No document file attached</span>
                    )}
                  </div>
                  
                  <article className="prose prose-slate max-w-none text-slate-655 leading-relaxed text-base">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 font-sans uppercase tracking-wider">Assignment Details & Instructions</h4>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl rich-content">
                      {lesson.notes_content?.includes('<!-- THEORY_BLOCKS_JSON:') || lesson.notes_content?.includes('<p') || lesson.notes_content?.includes('<h2') ? (
                        <div dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} />
                      ) : (
                        <div className="whitespace-pre-wrap font-medium text-slate-700 text-sm">{lesson.notes_content || "No instructions provided."}</div>
                      )}
                    </div>
                  </article>
                </div>
             )}

             {lessonType === 'project' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                        <FolderCode size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Project Workspace / PDF Brief</h4>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Attached project brief or workspace reference link</p>
                      </div>
                    </div>
                    {lesson.pdf_url?.startsWith('http') || lesson.content_url?.startsWith('http') ? (
                      <a 
                        href={lesson.pdf_url || lesson.content_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-indigo-500/10 shrink-0 cursor-pointer"
                      >
                         Open Brief / PDF <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">No brief file attached</span>
                    )}
                  </div>
                  
                  <article className="prose prose-slate max-w-none text-slate-655 leading-relaxed text-base">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 font-sans uppercase tracking-wider">Project Guidelines & Specifications</h4>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl rich-content">
                      {lesson.notes_content?.includes('<!-- THEORY_BLOCKS_JSON:') || lesson.notes_content?.includes('<p') || lesson.notes_content?.includes('<h2') ? (
                        <div dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} />
                      ) : (
                        <div className="whitespace-pre-wrap font-medium text-slate-700 text-sm">{lesson.notes_content || "No specifications provided."}</div>
                      )}
                    </div>
                  </article>
                </div>
             )}

             {lessonType === 'mcq' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100/50 flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Interactive Quiz Preview</h4>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Test your options below. Correct/incorrect states and answer key explanation will reveal on click.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {questions.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-400">No questions found for this quiz.</p>
                      </div>
                    ) : (
                      questions.map((q, idx) => {
                        const answerSelected = selectedAnswers[q.id] !== undefined;
                        const userAns = selectedAnswers[q.id];

                        return (
                          <div 
                            key={q.id}
                            className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4 shadow-sm"
                          >
                            <p className="text-sm font-bold text-slate-900"><span className="text-purple-650 mr-1">Q{idx + 1}.</span> {q.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, optIdx) => {
                                const letter = ['A', 'B', 'C', 'D'][optIdx];
                                const isCorrect = optIdx === q.correctIndex;
                                const isSelected = userAns === optIdx;

                                  let optStyle = "bg-white hover:bg-slate-55 border-slate-200 text-slate-700 hover:border-slate-300";
                                  let Icon = null;

                                  if (answerSelected) {
                                    if (isCorrect) {
                                      optStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                                      Icon = <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />;
                                    } else if (isSelected) {
                                      optStyle = "bg-rose-50 border-rose-300 text-rose-800 font-bold";
                                      Icon = <XCircle size={16} className="text-rose-600 shrink-0" />;
                                    } else {
                                      optStyle = "bg-slate-50/50 border-slate-100 text-slate-400 opacity-60";
                                    }
                                  }

                                return (
                                  <button
                                    key={optIdx}
                                    disabled={answerSelected}
                                    onClick={() => setSelectedAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                    className={`px-4 py-3 border rounded-xl text-xs font-semibold flex items-center justify-between transition-all gap-3 text-left ${optStyle} ${!answerSelected ? 'cursor-pointer' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ${
                                        answerSelected && isCorrect 
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : answerSelected && isSelected 
                                            ? 'bg-rose-100 text-rose-800' 
                                            : 'bg-slate-50 text-slate-500'
                                      }`}>
                                        {letter}
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                    {Icon}
                                  </button>
                                );
                              })}
                            </div>

                            {answerSelected && (
                              <div className="mt-2 p-4 bg-purple-50/80 rounded-xl border border-purple-100 text-xs font-medium text-purple-800 animate-in fade-in duration-300">
                                <p className="font-bold mb-1">
                                  {userAns === q.correctIndex 
                                    ? "🎉 Correct Answer!" 
                                    : `❌ Incorrect. The correct option is ${['A', 'B', 'C', 'D'][q.correctIndex]}.`
                                  }
                                </p>
                                {q.explanation && (
                                  <p className="mt-1.5 text-purple-700 leading-relaxed"><span className="font-bold">Explanation:</span> {q.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
             )}

             {lessonType !== 'video' && lessonType !== 'assignment' && lessonType !== 'mcq' && lessonType !== 'project' && (
                <div className="mb-10 animate-in fade-in duration-300">
                   <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      {lesson.content_url?.startsWith('http') && (
                        <a 
                          href={lesson.content_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 shrink-0 cursor-pointer"
                        >
                           Open Resource <ExternalLink size={14} />
                        </a>
                      )}
                   </div>
                   <article className="prose prose-slate max-w-none text-slate-655 leading-relaxed text-base">
                      {lesson.notes_content ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_DATA_JSON:(.*?) -->/, "") }} 
                          className="rich-content"
                        />
                      ) : (lesson.lesson_type || lesson.type)?.toLowerCase().includes('offline') ? (
                        <div>
                          <p className="text-blue-600 font-bold mb-4">Offline Class Details:</p>
                          <p>{lesson.content_url}</p>
                        </div>
                      ) : (
                        <>
                          {lesson.content_url?.startsWith('http') ? (
                            <div className="space-y-4">
                              <p>Use the button above to view the associated material.</p>
                              <p className="text-slate-400 italic text-sm break-all">Source: {lesson.content_url}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{lesson.content_url}</p>
                          )}
                        </>
                      )}
                   </article>
                </div>
             )}

             <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-2">Admin Note</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                   This is a preview of how the class will appear to students. Progress tracking and homework sections are disabled in preview mode.
                </p>
             </div>
          </div>
        </div>
        
        <div className="px-8 py-6 bg-slate-50 rounded-b-[3rem] border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
