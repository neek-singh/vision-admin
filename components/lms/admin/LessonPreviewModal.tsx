"use client";

import { useEffect } from "react";
import { X, Video, ExternalLink } from "lucide-react";

interface LessonPreviewModalProps {
  lesson: any;
  onClose: () => void;
}

export default function LessonPreviewModal({ 
  lesson, 
  onClose 
}: LessonPreviewModalProps) {
  
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

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true">
      <div className="bg-white shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col w-full max-w-5xl rounded-[3rem] max-h-[95vh]">
        <div className="px-8 py-6 flex items-center justify-between bg-white rounded-t-[3rem] border-b border-slate-50">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">Admin Preview</span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{lesson.title}</h3>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{(lesson.lesson_type || lesson.type)} • {lesson.duration || '0'} Mins</p>
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
             {(lesson.lesson_type || lesson.type) === 'video' ? (
                <div className="w-full bg-black rounded-xl overflow-hidden shadow-sm aspect-video mb-10">
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
             ) : (
                <div className="mb-10">
                   <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
                      {lesson.content_url?.startsWith('http') && (
                        <a 
                          href={lesson.content_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 bg-[#2196F3] text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-600 transition-all shadow-sm shrink-0"
                        >
                           Open Resource <ExternalLink size={14} />
                        </a>
                      )}
                   </div>
                   <article className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base">
                      {lesson.notes_content ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: lesson.notes_content }} 
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
