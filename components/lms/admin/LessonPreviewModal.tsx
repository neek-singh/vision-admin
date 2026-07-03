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
    <div className="dark-modal fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true">
      <div className="bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col w-full max-w-5xl rounded-[3rem] max-h-[95vh]">
        <div className="px-8 py-6 flex items-center justify-between bg-slate-800/60 rounded-t-[3rem] border-b border-slate-700">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-700">Admin Preview</span>
              <h3 className="text-xl font-bold text-white tracking-tight">{lesson.title}</h3>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              {lessonType === 'mcq' ? 'Quiz' : lessonType === 'notes' ? 'Theory' : lessonType === 'assignment' ? 'Assignment' : lessonType === 'project' ? 'Project' : 'Video'} • {lesson.duration || '0'} Mins
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-700 rounded-full transition-all text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-900 p-8 scrollbar-hide">
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-blue-900/30 rounded-2xl border border-blue-700/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-800 text-blue-300 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Class Resource Link</h4>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Reference document or attachment for this class</p>
                        </div>
                      </div>
                      <a 
                        href={lesson.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-blue-900/30 shrink-0 cursor-pointer"
                      >
                         Open Resource <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {lesson.notes_content && (
                    <article className="max-w-none text-white leading-relaxed text-base border-t border-slate-700 pt-6">
                      <h4 className="text-sm font-bold text-white mb-4 font-sans uppercase tracking-wider">Class Notes</h4>
                      <div 
                        dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_DATA_JSON:(.*?) -->/, "").replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} 
                        className="rich-content text-sm text-slate-200 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3 [&_p]:mb-3 [&_p]:text-slate-200 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_li]:pl-1 [&_li]:text-slate-200 [&_img]:rounded-xl [&_img]:max-h-72 [&_img]:object-cover [&_img]:my-3 [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline [&_span]:text-slate-200 [&_td]:text-slate-200 [&_th]:text-white"
                      />
                    </article>
                  )}
                </div>
             )}

             {lessonType === 'assignment' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-amber-900/20 rounded-2xl border border-amber-700/40">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-800/50 text-amber-300 rounded-xl">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Reference Document URL</h4>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Attached document for the assignment task</p>
                      </div>
                    </div>
                    {lesson.pdf_url?.startsWith('http') || lesson.content_url?.startsWith('http') ? (
                      <a 
                        href={lesson.pdf_url || lesson.content_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-amber-900/30 shrink-0 cursor-pointer"
                      >
                         Open Brief / PDF <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">No document file attached</span>
                    )}
                  </div>
                  
                  <article className="max-w-none text-white leading-relaxed text-base">
                    <h4 className="text-sm font-bold text-white mb-4 font-sans uppercase tracking-wider">Assignment Details & Instructions</h4>
                    <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl rich-content text-sm text-slate-200 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3 [&_p]:mb-3 [&_p]:text-slate-200 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_li]:pl-1 [&_li]:text-slate-200 [&_img]:rounded-xl [&_img]:max-h-72 [&_img]:object-cover [&_img]:my-3 [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline [&_span]:text-slate-200">
                      {lesson.notes_content?.includes('<!-- THEORY_BLOCKS_JSON:') || lesson.notes_content?.includes('<p') || lesson.notes_content?.includes('<h2') ? (
                        <div dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} />
                      ) : (
                        <div className="whitespace-pre-wrap font-medium text-slate-200 text-sm">{lesson.notes_content || "No instructions provided."}</div>
                      )}
                    </div>
                  </article>
                </div>
             )}

             {lessonType === 'project' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-indigo-900/20 rounded-2xl border border-indigo-700/40">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-800/50 text-indigo-300 rounded-xl">
                        <FolderCode size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Project Workspace / PDF Brief</h4>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Attached project brief or workspace reference link</p>
                      </div>
                    </div>
                    {lesson.pdf_url?.startsWith('http') || lesson.content_url?.startsWith('http') ? (
                      <a 
                        href={lesson.pdf_url || lesson.content_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-indigo-900/30 shrink-0 cursor-pointer"
                      >
                         Open Brief / PDF <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">No brief file attached</span>
                    )}
                  </div>
                  
                  <article className="max-w-none text-white leading-relaxed text-base">
                    <h4 className="text-sm font-bold text-white mb-4 font-sans uppercase tracking-wider">Project Guidelines & Specifications</h4>
                    <div className="p-6 bg-slate-800 border border-slate-700 rounded-2xl rich-content text-sm text-slate-200 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3 [&_p]:mb-3 [&_p]:text-slate-200 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_li]:pl-1 [&_li]:text-slate-200 [&_img]:rounded-xl [&_img]:max-h-72 [&_img]:object-cover [&_img]:my-3 [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline [&_span]:text-slate-200">
                      {lesson.notes_content?.includes('<!-- THEORY_BLOCKS_JSON:') || lesson.notes_content?.includes('<p') || lesson.notes_content?.includes('<h2') ? (
                        <div dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} />
                      ) : (
                        <div className="whitespace-pre-wrap font-medium text-slate-200 text-sm">{lesson.notes_content || "No specifications provided."}</div>
                      )}
                    </div>
                  </article>
                </div>
             )}

             {lessonType === 'mcq' && (
                <div className="space-y-8 mb-10 animate-in fade-in duration-300">
                  <div className="p-6 bg-purple-900/20 rounded-2xl border border-purple-700/40 flex items-center gap-3">
                    <div className="p-3 bg-purple-800/50 text-purple-300 rounded-xl">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Interactive Quiz Preview</h4>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Test your options below. Correct/incorrect states and answer key explanation will reveal on click.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {questions.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
                        <p className="text-xs font-semibold text-slate-400">No questions found for this quiz.</p>
                      </div>
                    ) : (
                      questions.map((q, idx) => {
                        const answerSelected = selectedAnswers[q.id] !== undefined;
                        const userAns = selectedAnswers[q.id];

                        return (
                          <div 
                            key={q.id}
                            className="p-6 bg-slate-800 border border-slate-700 rounded-2xl flex flex-col gap-4 shadow-sm"
                          >
                            <p className="text-sm font-bold text-white"><span className="text-purple-400 mr-1">Q{idx + 1}.</span> {q.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, optIdx) => {
                                const letter = ['A', 'B', 'C', 'D'][optIdx];
                                const isCorrect = optIdx === q.correctIndex;
                                const isSelected = userAns === optIdx;

                                  let optStyle = "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 hover:border-slate-500";
                                  let Icon = null;

                                  if (answerSelected) {
                                    if (isCorrect) {
                                      optStyle = "bg-emerald-900/40 border-emerald-600 text-emerald-300 font-bold";
                                      Icon = <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
                                    } else if (isSelected) {
                                      optStyle = "bg-rose-900/40 border-rose-600 text-rose-300 font-bold";
                                      Icon = <XCircle size={16} className="text-rose-400 shrink-0" />;
                                    } else {
                                      optStyle = "bg-slate-800/50 border-slate-700 text-slate-500 opacity-60";
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
                                          ? 'bg-emerald-800 text-emerald-300' 
                                          : answerSelected && isSelected 
                                            ? 'bg-rose-800 text-rose-300' 
                                            : 'bg-slate-600 text-slate-300'
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
                              <div className="mt-2 p-4 bg-purple-900/40 rounded-xl border border-purple-700 text-xs font-medium text-purple-200 animate-in fade-in duration-300">
                                <p className="font-bold mb-1">
                                  {userAns === q.correctIndex 
                                    ? "🎉 Correct Answer!" 
                                    : `❌ Incorrect. The correct option is ${['A', 'B', 'C', 'D'][q.correctIndex]}.`
                                  }
                                </p>
                                {q.explanation && (
                                  <p className="mt-1.5 text-purple-300 leading-relaxed"><span className="font-bold">Explanation:</span> {q.explanation}</p>
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
                   <article className="max-w-none text-white leading-relaxed text-base">
                      {lesson.notes_content ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: lesson.notes_content.replace(/<!-- THEORY_DATA_JSON:(.*?) -->/, "").replace(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/, "") }} 
                          className="rich-content text-sm text-slate-200 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3 [&_p]:mb-3 [&_p]:text-slate-200 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3 [&_li]:pl-1 [&_li]:text-slate-200 [&_img]:rounded-xl [&_img]:max-h-72 [&_img]:object-cover [&_img]:my-3 [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline [&_span]:text-slate-200 [&_td]:text-slate-200 [&_th]:text-white"
                        />
                      ) : (lesson.lesson_type || lesson.type)?.toLowerCase().includes('offline') ? (
                        <div>
                          <p className="text-blue-400 font-bold mb-4">Offline Class Details:</p>
                          <p className="text-slate-200">{lesson.content_url}</p>
                        </div>
                      ) : (
                        <>
                          {lesson.content_url?.startsWith('http') ? (
                            <div className="space-y-4">
                              <p className="text-slate-200">Use the button above to view the associated material.</p>
                              <p className="text-slate-400 italic text-sm break-all">Source: {lesson.content_url}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-slate-200">{lesson.content_url}</p>
                          )}
                        </>
                      )}
                   </article>
                </div>
             )}

             <div className="mt-12 p-6 bg-slate-800 rounded-2xl border border-slate-700">
                <h4 className="text-sm font-bold text-white mb-2">Admin Note</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   This is a preview of how the class will appear to students. Progress tracking and homework sections are disabled in preview mode.
                </p>
             </div>
          </div>
        </div>
        
        <div className="px-8 py-6 bg-slate-800/60 rounded-b-[3rem] border-t border-slate-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-600 transition-all active:scale-95 shadow-lg"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
