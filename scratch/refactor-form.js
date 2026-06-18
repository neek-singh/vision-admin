const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components/lms/courses/CourseForm.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Refactor form root container
content = content.replace(
  'className="space-y-8 max-w-5xl bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden font-black text-black"',
  'className="space-y-8 max-w-5xl bg-white dark:bg-[#0f172a] p-2 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden text-slate-800 dark:text-slate-100"'
);

// Refactor tab headers background
content = content.replace(
  'className="flex border-b border-gray-50 px-8 bg-gray-50/50"',
  'className="flex border-b border-slate-100 dark:border-slate-800/60 px-8 bg-slate-50/50 dark:bg-slate-900/30"'
);

// Refactor ImagePreview styling
content = content.replace(
  `  const ImagePreview = ({ url, label }: { url?: string, label: string }) => {
    if (!url) return null;
    return (
      <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm flex-shrink-0">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error'; }}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preview: {label}</span>
          <span className="text-[10px] text-blue-600 font-mono truncate">{url}</span>
        </div>
      </div>
    );
  };`,
  `  const ImagePreview = ({ url, label }: { url?: string, label: string }) => {
    if (!url) return null;
    return (
      <div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 flex items-center justify-center">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none';
              const sib = (e.target as HTMLImageElement).nextSibling as HTMLElement;
              if (sib) sib.style.display = 'flex';
            }}
          />
          <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 font-medium">
            No Image
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Preview: {label}</span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 truncate">{url}</span>
        </div>
      </div>
    );
  };`
);

// Helper for inputs, textareas, selects inside form
// Replace inputs with font-black / py-4 to clean design
content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-black text-black"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal"'
);

content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono text-sm font-black text-black"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-mono"'
);

// Standard inputs
content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal"'
);

// Textareas
content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal"'
);

// Select inputs
content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black appearance-none bg-white"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal appearance-none cursor-pointer"'
);

// Discount fee input
content = content.replace(
  /className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-green-50\/20 font-black text-emerald-700"/g,
  'className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/10 dark:bg-emerald-950/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-emerald-600 dark:text-emerald-400 text-sm font-normal"'
);

// Replace label styling
content = content.replace(
  /className="text-xs font-black text-gray-600 uppercase tracking-widest"/g,
  'className="text-xs font-medium text-slate-500 dark:text-slate-455 uppercase tracking-wider"'
);

// Replace bold tab button class
content = content.replace(
  /font-bold text-sm transition-all border-b-2/g,
  'font-medium text-sm transition-all border-b-2'
);

// Replace details tab buttons and descriptions
content = content.replace(
  /font-black/g,
  'font-medium'
);

content = content.replace(
  /font-bold/g,
  'font-medium'
);

content = content.replace(
  /border border-slate-200/g,
  'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
);

content = content.replace(
  /border border-slate-100/g,
  'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
);

content = content.replace(
  /bg-slate-50/g,
  'bg-slate-50 dark:bg-slate-900/40'
);

content = content.replace(
  /bg-gray-50/g,
  'bg-slate-50 dark:bg-slate-900/30'
);

content = content.replace(
  /px-10 py-6 rounded-2xl text-lg shadow-xl shadow-blue-100/g,
  'px-8 py-3 rounded-xl text-base shadow-lg shadow-blue-500/10 font-medium'
);

content = content.replace(
  /px-10 py-6 rounded-2xl text-lg bg-white/g,
  'px-8 py-3 rounded-xl text-base bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 font-medium'
);

// Make sure input and select tags inside form have unique IDs
// For Title input
content = content.replace(
  'type="text" required\n                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal"\n                value={formData.title || ""}',
  'type="text" id="course-title-input" required\n                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-105 text-sm font-normal"\n                value={formData.title || ""}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored CourseForm.tsx');
