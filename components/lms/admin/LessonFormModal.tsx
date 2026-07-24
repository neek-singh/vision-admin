"use client";
import { useState, useRef } from "react";
import { X, Loader2, Plus, Trash2, GripVertical, Heading, FileText, Image, List, ArrowUp, ArrowDown, ChevronDown, FolderCode, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";

interface LessonFormModalProps {
  courseId: string;
  moduleId: string;
  chapterId?: string;
  isEditing: boolean;
  lessonId?: string;
  initialData?: any;
  availableBatches: any[];
  onClose: () => void;
  onSuccess: () => void;
  currentLessonsCount: number;
  selectedBatchId?: string;
  mode?: "global" | "batch";
}

interface TheoryBlock {
  id: string;
  type: 'header' | 'paragraph' | 'image' | 'list';
  value: string;
  points?: string[];
}

interface MCQQuestion {
  id: string;
  question: string;
  options: string[]; // 4 options
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
}

export default function LessonFormModal({ 
  courseId, 
  moduleId, 
  chapterId,
  isEditing, 
  lessonId, 
  initialData, 
  availableBatches, 
  onClose, 
  onSuccess,
  currentLessonsCount,
  selectedBatchId,
  mode
}: LessonFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobal, setIsGlobal] = useState(
    initialData ? (!initialData.batches || initialData.batches.length === 0) : (mode === "global")
  );
  const [lesson, setLesson] = useState({
    title: initialData?.title || "",
    type: initialData?.lesson_type || initialData?.type || "video",
    content_url: initialData?.content_url || "",
    html_content: initialData?.notes_content || "",
    pdf_url: initialData?.pdf_url || "",
    is_free: initialData?.is_free || false,
    is_locked: initialData?.is_locked || false,
    order_index: initialData?.order_index || 0,
    batches: initialData?.batches || (mode === "batch" && selectedBatchId ? [selectedBatchId] : [])
  });

  const isTypePreSelected = !!(initialData?.lesson_type || initialData?.type);

  const getModalTitle = () => {
    if (!isTypePreSelected) {
      return isEditing ? "Edit Class" : "Add New Class";
    }
    switch (lesson.type) {
      case 'assignment':
        return isEditing ? "Edit Assignment" : "Add Assignment";
      case 'project':
        return isEditing ? "Edit Project" : "Add Project";
      case 'notes':
        return isEditing ? "Edit Theory Lesson" : "Add Theory Lesson";
      case 'mcq':
        return isEditing ? "Edit Quiz" : "Add Quiz";
      case 'video':
      default:
        return isEditing ? "Edit Video Class" : "Add Video Class";
    }
  };

  // Extract structured theory blocks from HTML comments if available
  const getInitialBlocks = (): TheoryBlock[] => {
    const content = initialData?.notes_content || "";
    
    // 1. Try parsing blocks JSON
    const match = content.match(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Error parsing theory blocks JSON:", e);
      }
    }
    
    // 2. Try parsing legacy theory data JSON (fallback)
    const legacyMatch = content.match(/<!-- THEORY_DATA_JSON:(.*?) -->/);
    if (legacyMatch && legacyMatch[1]) {
      try {
        const oldData = JSON.parse(legacyMatch[1]);
        const blocks: TheoryBlock[] = [];
        if (oldData.title) {
          blocks.push({ id: 'init-title', type: 'header', value: oldData.title });
        }
        if (oldData.text) {
          blocks.push({ id: 'init-text', type: 'paragraph', value: oldData.text });
        }
        if (oldData.imageUrl) {
          blocks.push({ id: 'init-img', type: 'image', value: oldData.imageUrl });
        }
        if (oldData.points && oldData.points.length > 0) {
          blocks.push({ id: 'init-list', type: 'list', value: '', points: oldData.points });
        }
        return blocks;
      } catch (e) {
        console.error("Error parsing legacy theory JSON:", e);
      }
    }

    const strippedContent = content.replace(/<!-- THEORY_DATA_JSON:(.*?) -->/, "").trim();
    const isNotesOrAssignment = (initialData?.lesson_type || initialData?.type) === 'notes' || (initialData?.lesson_type || initialData?.type) === 'assignment' || (initialData?.lesson_type || initialData?.type) === 'project';
    if (strippedContent && isNotesOrAssignment) {
      return [{ id: 'fallback-text', type: 'paragraph', value: strippedContent }];
    }

    return [];
  };

  // Extract MCQ questions from HTML comments if available
  const getInitialQuestions = (): MCQQuestion[] => {
    const content = initialData?.notes_content || "";
    const match = content.match(/<!-- MCQ_QUESTIONS_JSON:(.*?) -->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Error parsing MCQ questions JSON:", e);
      }
    }
    return [];
  };

  const [blocks, setBlocks] = useState<TheoryBlock[]>(getInitialBlocks());
  const [questions, setQuestions] = useState<MCQQuestion[]>(getInitialQuestions());
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<number | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<string>>(new Set());
  const [newPointInputs, setNewPointInputs] = useState<Record<string, string>>({});
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // ── Rich Text Editor ──
  const editorRef = useRef<HTMLDivElement>(null);

  const getInitialEditorHtml = (): string => {
    const content = initialData?.notes_content || '';
    const blocksMatch = content.match(/<!-- THEORY_BLOCKS_JSON:(.*?) -->/);
    if (blocksMatch?.[1]) {
      try {
        const parsedBlocks: TheoryBlock[] = JSON.parse(blocksMatch[1]);
        return parsedBlocks.map((block) => {
          if (block.type === 'header' && block.value.trim())
            return `<h2>${block.value}</h2>`;
          if (block.type === 'paragraph' && block.value.trim())
            return `<p>${block.value}</p>`;
          if (block.type === 'image' && block.value.trim())
            return `<div><img src="${block.value}" alt="Content Image" class="rounded-xl max-h-72 object-cover border border-slate-100 my-3 block" /></div>`;
          if (block.type === 'list' && block.points?.length)
            return `<ul>${block.points.filter((p) => p.trim()).map((p) => `<li>${p}</li>`).join('')}</ul>`;
          return '';
        }).join('');
      } catch (_e) { /* fall through */ }
    }
    return content
      .replace(/<!-- THEORY_BLOCKS_JSON:.*? -->/, '')
      .replace(/<!-- THEORY_DATA_JSON:.*? -->/, '')
      .trim();
  };

  const initialHtmlRef = useRef<string>(getInitialEditorHtml());

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value ?? undefined);
  };

  const insertEditorImage = () => {
    const url = prompt('Image URL daalen:');
    if (url?.trim()) {
      editorRef.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${url.trim()}" alt="Content Image" class="rounded-xl max-h-72 object-cover border border-slate-100 my-3 block" />`
      );
    }
  };

  const handleEditorShortcuts = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const offset = range.startOffset;

    // Shortcut: -> → →
    if (offset >= 2 && text.slice(offset - 2, offset) === '->') {
      const before = text.slice(0, offset - 2);
      const after = text.slice(offset);
      node.textContent = before + '→' + after;
      const newRange = document.createRange();
      newRange.setStart(node, before.length + 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }

    // Shortcut: => → ⇒
    if (offset >= 2 && text.slice(offset - 2, offset) === '=>') {
      const before = text.slice(0, offset - 2);
      const after = text.slice(offset);
      node.textContent = before + '⇒' + after;
      const newRange = document.createRange();
      newRange.setStart(node, before.length + 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }

    // Shortcut: --- (alone on a line) → <hr />
    if (text.trim() === '---') {
      const parentEl = node.parentElement;
      if (!parentEl) return;

      const hr = document.createElement('hr');
      hr.style.cssText = 'margin: 14px 0; border: 0; border-top: 2px solid #e2e8f0;';

      const newP = document.createElement('p');
      newP.innerHTML = '<br>';

      parentEl.replaceWith(hr, newP);

      const newRange = document.createRange();
      newRange.setStart(newP, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  };

  // ── Smart Paste Handler ──
  const cleanPastedNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(cleanPastedNode).join('');

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return children.trim() ? `<h2>${children}</h2>` : '';
      case 'strong': case 'b':
        return `<strong>${children}</strong>`;
      case 'em': case 'i':
        return `<em>${children}</em>`;
      case 'u':
        return `<u>${children}</u>`;
      case 's': case 'del': case 'strike':
        return children; // strip strikethrough
      case 'p':
        return children.trim() ? `<p>${children}</p>` : '';
      case 'br':
        return '<br>';
      case 'hr':
        return '<hr style="margin:14px 0;border:0;border-top:2px solid #e2e8f0;">';
      case 'ul':
        return children.trim() ? `<ul>${children}</ul>` : '';
      case 'ol':
        return children.trim() ? `<ol>${children}</ol>` : '';
      case 'li':
        return `<li>${children}</li>`;
      case 'code': {
        const isBlock = el.parentElement?.tagName.toLowerCase() === 'pre';
        return isBlock
          ? children
          : `<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.85em;">${children}</code>`;
      }
      case 'pre':
        return `<pre style="background:#f1f5f9;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:0.82em;overflow-x:auto;margin:8px 0;white-space:pre-wrap;">${children}</pre>`;
      case 'blockquote':
        return `<blockquote style="border-left:4px solid #94a3b8;padding:8px 16px;margin:8px 0;color:#64748b;font-style:italic;">${children}</blockquote>`;
      case 'a': {
        const href = el.getAttribute('href') || '#';
        const isImageLink =
          children.trim().toLowerCase() === 'image' ||
          /\.(jpeg|jpg|gif|png|webp|svg)/i.test(href) ||
          href.includes('prod-files-secure') ||
          href.includes('amazonaws.com') ||
          href.includes('chatgpt-user-files');

        if (isImageLink) {
          return `<img src="${href}" alt="Pasted Image" style="max-height:280px;border-radius:8px;margin:8px 0;display:block;object-fit:cover;border:1px solid #e2e8f0;">`;
        }
        return `<a href="${href}" style="color:#2563eb;text-decoration:underline;" target="_blank" rel="noopener noreferrer">${children}</a>`;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        return src ? `<img src="${src}" alt="Pasted Image" style="max-height:280px;border-radius:8px;margin:8px 0;display:block;object-fit:cover;border:1px solid #e2e8f0;">` : '';
      }
      case 'table':
        return `<div style="overflow-x:auto;margin:12px 0;"><table style="border-collapse:collapse;width:100%;font-size:0.875em;">${children}</table></div>`;
      case 'thead': return `<thead>${children}</thead>`;
      case 'tbody': return `<tbody>${children}</tbody>`;
      case 'tr':   return `<tr>${children}</tr>`;
      case 'th':   return `<th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc;font-weight:700;text-align:left;">${children}</th>`;
      case 'td':   return `<td style="border:1px solid #e2e8f0;padding:8px 12px;">${children}</td>`;
      case 'span': {
        const style = el.getAttribute('style') || '';
        if (/font-weight\s*:\s*(700|bold)/i.test(style)) return `<strong>${children}</strong>`;
        if (/font-style\s*:\s*italic/i.test(style)) return `<em>${children}</em>`;
        if (/text-decoration[^:]*:\s*underline/i.test(style)) return `<u>${children}</u>`;
        return children;
      }
      // Block containers — pass children through
      case 'div': case 'section': case 'article':
      case 'header': case 'footer': case 'nav': case 'aside': case 'main':
        return children;
      default:
        return children;
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Check if there are images in clipboard files (e.g. screenshots, right-click "Copy Image")
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result;
            if (base64) {
              document.execCommand(
                'insertHTML',
                false,
                `<img src="${base64}" alt="Pasted Image" class="rounded-xl max-h-72 object-cover border border-slate-100 my-3 block" />`
              );
            }
          };
          reader.readAsDataURL(file);
          return; // Stop processing further to avoid duplicate pasting
        }
      }
    }

    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');

    if (htmlData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const cleaned = Array.from(doc.body.childNodes).map(cleanPastedNode).join('');
      document.execCommand('insertHTML', false, cleaned || plainText);
    } else if (plainText) {
      const escaped = plainText
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      document.execCommand('insertHTML', false, escaped.split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join(''));
    }
  };

  const addBlock = (type: 'header' | 'paragraph' | 'image' | 'list', index?: number) => {
    const newBlock: TheoryBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      value: "",
      points: type === 'list' ? [] : undefined
    };
    if (typeof index === 'number') {
      setBlocks(prev => {
        const updated = [...prev];
        updated.splice(index, 0, newBlock);
        return updated;
      });
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateBlockValue = (index: number, val: string) => {
    setBlocks(prev => prev.map((b, idx) => idx === index ? { ...b, value: val } : b));
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number,
    value: string
  ) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      let tagStart = '';
      let tagEnd = '';
      
      switch (e.key.toLowerCase()) {
        case 'b':
          tagStart = '<strong>';
          tagEnd = '</strong>';
          break;
        case 'i':
          tagStart = '<em>';
          tagEnd = '</em>';
          break;
        case 'u':
          tagStart = '<u>';
          tagEnd = '</u>';
          break;
      }
      
      const selectedText = value.substring(start, end);
      const replacement = `${tagStart}${selectedText}${tagEnd}`;
      
      // Try using document.execCommand to preserve native Undo/Redo (Ctrl+Z / Ctrl+Y) history
      let commandExecuted = false;
      try {
        textarea.focus();
        commandExecuted = document.execCommand('insertText', false, replacement);
      } catch (err) {
        console.error("execCommand error, falling back to state update:", err);
      }
      
      if (!commandExecuted) {
        // Fallback if execCommand is not supported
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        updateBlockValue(index, newValue);
      }
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagStart.length, start + tagStart.length + selectedText.length);
      }, 0);
    }
  };

  const cleanInlineHTML = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Convert styled spans to semantic inline tags
    tempDiv.querySelectorAll('span').forEach(span => {
      const style = span.getAttribute('style') || '';
      
      if (style.includes('font-weight:700') || style.includes('font-weight: 700') || style.includes('font-weight:bold') || style.includes('font-weight: bold')) {
        const strong = document.createElement('strong');
        strong.innerHTML = span.innerHTML;
        span.replaceWith(strong);
      } else if (style.includes('font-style:italic') || style.includes('font-style: italic')) {
        const em = document.createElement('em');
        em.innerHTML = span.innerHTML;
        span.replaceWith(em);
      } else if (style.includes('text-decoration:underline') || style.includes('text-decoration: underline')) {
        const u = document.createElement('u');
        u.innerHTML = span.innerHTML;
        span.replaceWith(u);
      }
    });
    
    const cleanNode = (node: ChildNode): string => {
      if (node.nodeType === 3) { // Text Node
        return node.textContent || "";
      }
      if (node.nodeType === 1) { // Element Node
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        let innerText = "";
        el.childNodes.forEach(child => {
          innerText += cleanNode(child);
        });
        
        if (['strong', 'b'].includes(tagName)) {
          return `<strong>${innerText}</strong>`;
        }
        if (['em', 'i'].includes(tagName)) {
          return `<em>${innerText}</em>`;
        }
        if (['u'].includes(tagName)) {
          return `<u>${innerText}</u>`;
        }
        if (tagName === 'a') {
          const href = el.getAttribute('href') || '#';
          return `<a href="${href}" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">${innerText}</a>`;
        }
        if (tagName === 'code') {
          return `<code class="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-800">${innerText}</code>`;
        }
        if (tagName === 'br') {
          return '<br />';
        }
        
        return innerText;
      }
      return "";
    };
    
    let result = "";
    tempDiv.childNodes.forEach(child => {
      result += cleanNode(child);
    });
    
    return result;
  };

  const cleanMarkdownToHTML = (text: string): string => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return html;
  };

  const cleanTableHTML = (tableEl: HTMLElement): string => {
    let html = '<div class="overflow-x-auto my-4 rounded-xl border border-slate-200/80 shadow-sm"><table class="w-full border-collapse text-left text-xs">\n';
    
    const thead = tableEl.querySelector('thead');
    const tbody = tableEl.querySelector('tbody') || tableEl;
    
    const processRows = (rows: HTMLTableRowElement[], isHeader: boolean) => {
      let rowHtml = "";
      rows.forEach((row) => {
        rowHtml += `  <tr class="${isHeader ? 'bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800' : 'border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors'}">\n`;
        const cells = row.querySelectorAll('th, td');
        cells.forEach(cell => {
          const content = cleanInlineHTML(cell.innerHTML);
          const cellClass = isHeader 
            ? 'px-4 py-3 font-bold text-slate-700 dark:text-slate-350' 
            : 'px-4 py-3 text-slate-600 dark:text-slate-400 font-medium';
          const tag = isHeader ? 'th' : 'td';
          rowHtml += `    <${tag} class="${cellClass}">${content}</${tag}>\n`;
        });
        rowHtml += '  </tr>\n';
      });
      return rowHtml;
    };
    
    if (thead) {
      html += '  <thead>\n';
      html += processRows(Array.from(thead.querySelectorAll('tr')), true);
      html += '  </thead>\n';
    }
    
    if (tbody) {
      html += '  <tbody>\n';
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const hasHeaderRow = !thead && rows[0]?.querySelector('th') !== null;
      if (hasHeaderRow) {
        html += processRows(rows.slice(0, 1), true);
        html += processRows(rows.slice(1), false);
      } else {
        html += processRows(rows, false);
      }
      html += '  </tbody>\n';
    }
    
    html += '</table></div>';
    return html;
  };

  const parseMarkdownTable = (lines: string[]): { tableHtml: string, tableLineCount: number } | null => {
    if (lines.length < 2) return null;
    
    const firstLine = lines[0].trim();
    const secondLine = lines[1].trim();
    
    if (!firstLine.startsWith('|') || !secondLine.startsWith('|')) return null;
    
    const isSeparator = /^\|[\s-|-]*\|$/.test(secondLine);
    if (!isSeparator) return null;
    
    const headers = firstLine.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    
    let html = '<div class="overflow-x-auto my-4 rounded-xl border border-slate-200/80 shadow-sm"><table class="w-full border-collapse text-left text-xs">\n';
    html += '  <thead>\n';
    html += '    <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">\n';
    headers.forEach(h => {
      html += `      <th class="px-4 py-3 font-bold text-slate-700 dark:text-slate-350">${cleanMarkdownToHTML(h)}</th>\n`;
    });
    html += '    </tr>\n';
    html += '  </thead>\n';
    html += '  <tbody>\n';
    
    let lineIdx = 2;
    while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('|')) {
      const cells = lines[lineIdx].trim().split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      html += '    <tr class="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">\n';
      cells.forEach(c => {
        html += `      <td class="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">${cleanMarkdownToHTML(c)}</td>\n`;
      });
      html += '    </tr>\n';
      lineIdx++;
    }
    
    html += '  </tbody>\n';
    html += '</table></div>';
    
    return {
      tableHtml: html,
      tableLineCount: lineIdx
    };
  };

  const cleanListHTML = (listEl: HTMLElement): string => {
    const tagName = listEl.tagName.toLowerCase();
    const isOrdered = tagName === 'ol';
    const listClass = isOrdered 
      ? 'list-decimal list-inside space-y-1.5 text-slate-655 dark:text-slate-400 my-2' 
      : 'list-disc list-inside space-y-1.5 text-slate-655 dark:text-slate-400 my-2';
    
    let html = `<${tagName} class="${listClass}">\n`;
    listEl.querySelectorAll('li').forEach(li => {
      html += `  <li class="pl-1">${cleanInlineHTML(li.innerHTML)}</li>\n`;
    });
    html += `</${tagName}>`;
    return html;
  };

  const handleTextareaPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    index: number
  ) => {
    const htmlData = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    if (!htmlData && !plainText) return;
    
    e.preventDefault();
    
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let parsedContent = "";
    
    if (htmlData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      
      const hasBlocks = doc.querySelector('h1, h2, h3, h4, h5, h6, ul, ol, li, p, br, div, pre, table') !== null;
      
      if (hasBlocks) {
        const newBlocks: TheoryBlock[] = [];
        const childNodes = doc.body.childNodes;
        
        const processNode = (node: Node) => {
          if (node.nodeType === 1) { // Element Node
            const el = node as HTMLElement;
            const tagName = el.tagName.toLowerCase();
            
            if (tagName === 'table') {
              const tableHtml = cleanTableHTML(el);
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'paragraph',
                value: tableHtml
              });
            } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'header',
                value: el.textContent || ""
              });
            } else if (['ul', 'ol'].includes(tagName)) {
              const listHtml = cleanListHTML(el);
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'paragraph',
                value: listHtml
              });
            } else if (tagName === 'li') {
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'paragraph',
                value: `<ul class="list-disc list-inside space-y-1.5 text-slate-655 dark:text-slate-400 my-2"><li class="pl-1">${cleanInlineHTML(el.innerHTML)}</li></ul>`
              });
            } else if (tagName === 'img') {
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'image',
                value: el.getAttribute('src') || ""
              });
            } else if (tagName === 'p' || tagName === 'pre') {
              const content = cleanInlineHTML(el.innerHTML);
              if (content.trim()) {
                newBlocks.push({
                  id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: 'paragraph',
                  value: content
                });
              }
            } else {
              el.childNodes.forEach(child => processNode(child));
            }
          } else if (node.nodeType === 3) { // Text Node
            const text = node.textContent || "";
            if (text.trim()) {
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'paragraph',
                value: text.trim()
              });
            }
          }
        };
        
        childNodes.forEach(child => processNode(child));
        
        // Merge consecutive paragraph blocks (including lists and tables converted to html)
        const mergedBlocks: TheoryBlock[] = [];
        newBlocks.forEach(b => {
          if (b.type === 'paragraph') {
            const last = mergedBlocks[mergedBlocks.length - 1];
            if (last && last.type === 'paragraph') {
              last.value += `\n\n${b.value}`;
            } else {
              mergedBlocks.push(b);
            }
          } else {
            mergedBlocks.push(b);
          }
        });
        
        const shouldSplit = mergedBlocks.length > 1 || (
          mergedBlocks.length === 1 && (
            mergedBlocks[0].type !== 'paragraph' || 
            mergedBlocks[0].value.includes('<table') ||
            mergedBlocks[0].value.includes('<ul') ||
            mergedBlocks[0].value.includes('<ol') ||
            textarea.value.trim() === ""
          )
        );
        
        if (shouldSplit) {
          setBlocks(prev => {
            const updated = [...prev];
            const currentBlockEmpty = prev[index]?.value.trim() === "";
            const replaceCount = currentBlockEmpty ? 1 : 0;
            const insertIndex = currentBlockEmpty ? index : index + 1;
            
            updated.splice(insertIndex, replaceCount, ...mergedBlocks);
            return updated;
          });
          return;
        }
      }
      
      parsedContent = cleanInlineHTML(htmlData);
    } else {
      // Plain text parser fallback with Markdown Table and List parsing support
      const lines = plainText.split('\n');
      const hasStructure = lines.length > 1 && (
        lines.some(l => l.startsWith('#') || l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim().startsWith('• ') || l.trim().startsWith('|'))
      );
      
      if (hasStructure) {
        const newBlocks: TheoryBlock[] = [];
        let currentListPoints: string[] = [];
        let activeListType: 'ul' | 'ol' | null = null;
        
        const flushList = () => {
          if (currentListPoints.length > 0 && activeListType) {
            const listClass = activeListType === 'ol'
              ? 'list-decimal list-inside space-y-1.5 text-slate-655 dark:text-slate-400 my-2'
              : 'list-disc list-inside space-y-1.5 text-slate-655 dark:text-slate-400 my-2';
            
            let listHtml = `<${activeListType} class="${listClass}">\n`;
            currentListPoints.forEach(pt => {
              listHtml += `  <li class="pl-1">${pt}</li>\n`;
            });
            listHtml += `</${activeListType}>`;
            
            newBlocks.push({
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'paragraph',
              value: listHtml
            });
            
            currentListPoints = [];
            activeListType = null;
          }
        };
        
        let i = 0;
        while (i < lines.length) {
          const line = lines[i];
          const trimmed = line.trim();
          
          if (trimmed.startsWith('|')) {
            const tableResult = parseMarkdownTable(lines.slice(i));
            if (tableResult) {
              flushList();
              newBlocks.push({
                id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'paragraph',
                value: tableResult.tableHtml
              });
              i += tableResult.tableLineCount;
              continue;
            }
          }
          
          if (trimmed.startsWith('#')) {
            flushList();
            const text = trimmed.replace(/^#+\s*/, '');
            newBlocks.push({
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'header',
              value: text
            });
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            if (activeListType === 'ol') flushList();
            activeListType = 'ul';
            const text = trimmed.replace(/^[-*•]\s*/, '');
            currentListPoints.push(cleanMarkdownToHTML(text));
          } else if (trimmed.match(/^\d+\.\s/)) {
            if (activeListType === 'ul') flushList();
            activeListType = 'ol';
            const text = trimmed.replace(/^\d+\.\s*/, '');
            currentListPoints.push(cleanMarkdownToHTML(text));
          } else if (trimmed) {
            flushList();
            newBlocks.push({
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'paragraph',
              value: cleanMarkdownToHTML(trimmed)
            });
          } else {
            flushList();
          }
          i++;
        }
        
        flushList();
        
        // Merge consecutive paragraph blocks (including parsed lists/tables)
        const mergedBlocks: TheoryBlock[] = [];
        newBlocks.forEach(b => {
          if (b.type === 'paragraph') {
            const last = mergedBlocks[mergedBlocks.length - 1];
            if (last && last.type === 'paragraph') {
              last.value += `\n\n${b.value}`;
            } else {
              mergedBlocks.push(b);
            }
          } else {
            mergedBlocks.push(b);
          }
        });
        
        const shouldSplit = mergedBlocks.length > 1 || (
          mergedBlocks.length === 1 && (
            mergedBlocks[0].type !== 'paragraph' || 
            mergedBlocks[0].value.includes('<table') ||
            mergedBlocks[0].value.includes('<ul') ||
            mergedBlocks[0].value.includes('<ol') ||
            textarea.value.trim() === ""
          )
        );
        
        if (shouldSplit) {
          setBlocks(prev => {
            const updated = [...prev];
            const currentBlockEmpty = prev[index]?.value.trim() === "";
            const replaceCount = currentBlockEmpty ? 1 : 0;
            const insertIndex = currentBlockEmpty ? index : index + 1;
            
            updated.splice(insertIndex, replaceCount, ...mergedBlocks);
            return updated;
          });
          return;
        }
      }
      
      parsedContent = cleanMarkdownToHTML(plainText);
    }
    
    const value = textarea.value;
    const replacement = parsedContent;
    let commandExecuted = false;
    try {
      textarea.focus();
      commandExecuted = document.execCommand('insertText', false, replacement);
    } catch (err) {
      console.error("Paste execCommand error:", err);
    }
    
    if (!commandExecuted) {
      const newValue = value.substring(0, start) + replacement + value.substring(end);
      updateBlockValue(index, newValue);
    }
  };

  const addPointToBlock = (blockIndex: number, blockId: string) => {
    const val = newPointInputs[blockId] || "";
    if (!val.trim()) return;
    
    setBlocks(prev => prev.map((b, idx) => {
      if (idx === blockIndex) {
        return {
          ...b,
          points: [...(b.points || []), val.trim()]
        };
      }
      return b;
    }));
    
    setNewPointInputs(prev => ({ ...prev, [blockId]: "" }));
  };

  const removePointFromBlock = (blockIndex: number, pointIndex: number) => {
    setBlocks(prev => prev.map((b, idx) => {
      if (idx === blockIndex) {
        return {
          ...b,
          points: (b.points || []).filter((_, pIdx) => pIdx !== pointIndex)
        };
      }
      return b;
    }));
  };

  // MCQ Question Builders
  const handleImportQuiz = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedQuestions: MCQQuestion[] = [];
    
    let currentQuestion: { question: string; options: string[]; correctIndex: number; explanation: string } | null = null;
    
    const qRegex = /^(?:Q|q)?\d+[\.\:\)\s]+(.*)/i;
    const optRegex = /^([A-D])[\.\:\)\s]+(.*)/i;
    
    for (const line of lines) {
      const qMatch = line.match(qRegex);
      const optMatch = line.match(optRegex);
      
      if (qMatch && !optMatch) {
        if (currentQuestion && currentQuestion.question && currentQuestion.options.length > 0) {
          while (currentQuestion.options.length < 4) {
            currentQuestion.options.push(`Option ${currentQuestion.options.length + 1}`);
          }
          parsedQuestions.push({
            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            question: currentQuestion.question,
            options: currentQuestion.options.slice(0, 4),
            correctIndex: currentQuestion.correctIndex,
            explanation: currentQuestion.explanation
          });
        }
        
        currentQuestion = {
          question: qMatch[1].trim(),
          options: [],
          correctIndex: 0,
          explanation: ''
        };
      } else if (optMatch && currentQuestion) {
        const letter = optMatch[1].toUpperCase();
        let optionText = optMatch[2].trim();
        
        let isCorrect = false;
        if (optionText.toLowerCase().includes('(correct)') || optionText.toLowerCase().includes('(ans)') || optionText.toLowerCase().includes('(answer)') || optionText.startsWith('*')) {
          isCorrect = true;
          optionText = optionText
            .replace(/\(correct\)/i, '')
            .replace(/\(ans\)/i, '')
            .replace(/\(answer\)/i, '')
            .replace(/^\*/, '')
            .trim();
        }
        
        currentQuestion.options.push(optionText);
        if (isCorrect) {
          currentQuestion.correctIndex = currentQuestion.options.length - 1;
        }
      } else if (currentQuestion) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('ans:') || lowerLine.startsWith('answer:') || lowerLine.startsWith('correct:')) {
          const ansChar = line.replace(/^(ans|answer|correct):/i, '').trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(ansChar)) {
            currentQuestion.correctIndex = ['A', 'B', 'C', 'D'].indexOf(ansChar);
          }
        } else if (lowerLine.startsWith('explanation:') || lowerLine.startsWith('exp:')) {
          currentQuestion.explanation = line.replace(/^(explanation|exp):/i, '').trim();
        } else {
          if (currentQuestion.options.length === 0) {
            currentQuestion.question += '\n' + line;
          } else {
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + '\n' : '') + line;
          }
        }
      }
    }
    
    if (currentQuestion && currentQuestion.question && currentQuestion.options.length > 0) {
      while (currentQuestion.options.length < 4) {
        currentQuestion.options.push(`Option ${currentQuestion.options.length + 1}`);
      }
      parsedQuestions.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: currentQuestion.question,
        options: currentQuestion.options.slice(0, 4),
        correctIndex: currentQuestion.correctIndex,
        explanation: currentQuestion.explanation
      });
    }
    
    if (parsedQuestions.length > 0) {
      setQuestions(prev => [...prev, ...parsedQuestions]);
    }
  };

  const addQuestion = () => {
    const newQ: MCQQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: ""
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const removeQuestion = (qIndex: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  const updateQuestionText = (qIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, question: text } : q));
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === qIndex) {
        const newOpts = [...q.options];
        newOpts[optIndex] = text;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const updateCorrectIndex = (qIndex: number, correctIdx: number) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, correctIndex: correctIdx } : q));
  };

  const updateExplanation = (qIndex: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, explanation: text } : q));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questions];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, removed);
    setQuestions(reordered);
  };

  // HTML5 Drag and Drop Handlers for Theory Blocks
  const handleBlockDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    
    const reorderedBlocks = [...blocks];
    const [draggedBlock] = reorderedBlocks.splice(draggedBlockIndex, 1);
    reorderedBlocks.splice(index, 0, draggedBlock);
    
    setBlocks(reorderedBlocks);
    setDraggedBlockIndex(index);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockIndex(null);
  };

  // HTML5 Drag and Drop Handlers for MCQ Questions
  const handleQuestionDragStart = (index: number) => {
    setDraggedQuestionIndex(index);
  };

  const handleQuestionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedQuestionIndex === null || draggedQuestionIndex === index) return;
    
    const reorderedQuestions = [...questions];
    const [draggedQ] = reorderedQuestions.splice(draggedQuestionIndex, 1);
    reorderedQuestions.splice(index, 0, draggedQ);
    
    setQuestions(reorderedQuestions);
    setDraggedQuestionIndex(index);
  };

  const handleQuestionDragEnd = () => {
    setDraggedQuestionIndex(null);
  };

  const toggleQuestionCollapse = (id: string) => {
    setCollapsedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateHTMLFromBlocks = (dataBlocks: TheoryBlock[]) => {
    let html = '';
    dataBlocks.forEach(block => {
      if (block.type === 'header' && block.value.trim()) {
        html += `<h2 class="text-xl font-bold text-slate-900 mb-3">${block.value}</h2>\n`;
      } else if (block.type === 'paragraph' && block.value.trim()) {
        html += `<p class="text-slate-655 text-base leading-relaxed mb-4 whitespace-pre-wrap">${block.value}</p>\n`;
      } else if (block.type === 'image' && block.value.trim()) {
        html += `<div class="my-4"><img src="${block.value}" alt="Theory Content Image" class="rounded-xl max-h-96 object-cover border border-slate-100" /></div>\n`;
      } else if (block.type === 'list' && block.points && block.points.length > 0) {
        html += `<ul class="list-disc list-inside space-y-2 text-slate-600 mb-4">\n`;
        block.points.forEach(point => {
          if (point.trim()) {
            html += `  <li>${point}</li>\n`;
          }
        });
        html += `</ul>\n`;
      }
    });
    return html;
  };

  const generateHTMLFromQuestions = (qs: MCQQuestion[]) => {
    let html = '<div class="mcq-quiz-container space-y-6">\n';
    qs.forEach((q, idx) => {
      html += `  <div class="mcq-question-card p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" data-question-id="${q.id}">\n`;
      html += `    <p class="text-sm font-bold text-slate-900 dark:text-white mb-4"><span class="text-purple-600 mr-1">Q${idx + 1}.</span> ${q.question}</p>\n`;
      html += `    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">\n`;
      q.options.forEach((opt, optIdx) => {
        const letter = ['A', 'B', 'C', 'D'][optIdx];
        html += `      <div class="mcq-option px-4 py-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-3" data-option-index="${optIdx}">\n`;
        html += `        <span class="w-6 h-6 shrink-0 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">${letter}</span>\n`;
        html += `        <span>${opt}</span>\n`;
        html += `      </div>\n`;
      });
      html += `    </div>\n`;
      if (q.explanation?.trim()) {
        html += `    <div class="mcq-explanation mt-4 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl text-[11px] font-medium text-purple-700 dark:text-purple-400 hidden">\n`;
        html += `      <span class="font-bold">Explanation:</span> ${q.explanation}\n`;
        html += `    </div>\n`;
      }
      html += `  </div>\n`;
    });
    html += '</div>';
    return html;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson.title || !moduleId) return;

    setIsSubmitting(true);
    try {
      let finalNotesContent = "";
      if (lesson.type === 'video') {
        finalNotesContent = lesson.html_content;
      } else if (lesson.type === 'notes' || lesson.type === 'assignment' || lesson.type === 'project') {
        finalNotesContent = editorRef.current?.innerHTML || '';
      } else if (lesson.type === 'mcq') {
        finalNotesContent = `${generateHTMLFromQuestions(questions)}\n<!-- MCQ_QUESTIONS_JSON:${JSON.stringify(questions)} -->`;
      }

      const payload = {
        module_id: moduleId,
        chapter_id: chapterId || initialData?.chapter_id || null,
        title: lesson.title,
        subtitle: null,
        type: 'video', // Workaround for strict DB check constraint
        content_url: lesson.type === 'assignment' ? lesson.pdf_url : lesson.content_url,
        notes_content: finalNotesContent,
        pdf_url: (lesson.type === 'assignment' || lesson.type === 'video') ? lesson.pdf_url : null,
        duration: null,
        is_free: lesson.is_free,
        batches: isGlobal ? [] : lesson.batches,
        course_id: courseId,
        lesson_type: lesson.type,
        order_index: isEditing ? lesson.order_index : (currentLessonsCount + 1)
      };

      let error;
      if (isEditing && lessonId) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update(payload)
          .eq("id", lessonId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("lessons").insert(payload);
        error = insertError;
      }

      if (!error) {
        onSuccess();
      } else {
        alert("Error saving: " + error.message);
      }
    } catch (err) {
      console.error("Error saving lesson:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInsertBar = (targetIndex: number) => (
    <div className="group/insert-bar flex items-center justify-center h-4 relative -my-2 z-20">
      <div className="absolute left-4 right-4 h-[1px] bg-slate-700 group-hover/insert-bar:bg-blue-500 transition-colors" />
      <div className="opacity-0 group-hover/insert-bar:opacity-100 transition-all flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 shadow-sm scale-90 group-hover/insert-bar:scale-100 duration-200">
        <button 
          type="button" onClick={() => addBlock('header', targetIndex)}
          className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          title="Insert Header Here"
        >
          <Heading size={10} /> Header
        </button>
        <div className="w-[1px] h-3 bg-slate-200" />
        <button 
          type="button" onClick={() => addBlock('paragraph', targetIndex)}
          className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          title="Insert Paragraph Here"
        >
          <FileText size={10} /> Paragraph
        </button>
        <div className="w-[1px] h-3 bg-slate-200" />
        <button 
          type="button" onClick={() => addBlock('image', targetIndex)}
          className="p-1 hover:bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          title="Insert Image Here"
        >
          <Image size={10} /> Image
        </button>
        <div className="w-[1px] h-3 bg-slate-200" />
        <button 
          type="button" onClick={() => addBlock('list', targetIndex)}
          className="p-1 hover:bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          title="Insert Bullet List Here"
        >
          <List size={10} /> List
        </button>
      </div>
    </div>
  );

  return (
    <div className="dark-modal fixed inset-0 bg-black/70 backdrop-blur-md z-[100] overflow-y-auto p-4 animate-in fade-in duration-300">
      <div className="min-h-full flex items-center justify-center py-8">
        <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
            <h3 className="text-lg font-bold text-white">{getModalTitle()}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"><X size={18} className="text-slate-300" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class Title</label>
                <input 
                  required type="text" value={lesson.title}
                  onChange={(e) => setLesson({...lesson, title: e.target.value})}
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-700 focus:border-blue-500 outline-none transition-all font-bold text-white placeholder:text-slate-500" 
                />
              </div>

              {!isTypePreSelected && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Content Type</label>
                  <select 
                    value={lesson.type}
                    onChange={(e) => setLesson({...lesson, type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-white"
                  >
                    <option value="video">Live / Video Class</option>
                    <option value="notes">Theory</option>
                    <option value="assignment">Assignment / Practical Task</option>
                    <option value="project">Practical Project</option>
                    <option value="mcq">Quiz / Test</option>
                  </select>
                </div>
              )}

              {lesson.type === 'video' && (
                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">YouTube Video URL</label>
                    <input 
                      type="text" value={lesson.content_url}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => setLesson({...lesson, content_url: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-white placeholder:text-slate-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resource Link (PDF/Document/Website Link)</label>
                    <input 
                      type="text" value={lesson.pdf_url}
                      placeholder="https://example.com/class-resources.pdf"
                      onChange={(e) => setLesson({...lesson, pdf_url: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-white placeholder:text-slate-500" 
                    />
                  </div>
                </div>
              )}

              {(lesson.type === 'notes' || lesson.type === 'assignment' || lesson.type === 'project') && (
                <div className={`md:col-span-2 animate-in fade-in duration-350 ${isFullScreen ? 'fixed inset-0 bg-slate-900 z-[150] p-3 flex flex-col space-y-2 w-screen h-screen' : 'space-y-0'}`}>
                  <div className={`flex flex-col w-full bg-slate-900 border border-slate-700 ${isFullScreen ? 'flex-1 space-y-2 border-none p-0' : ''}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                        {lesson.type === 'assignment' ? 'Assignment Instructions' : lesson.type === 'project' ? 'Project Guidelines & Specifications' : 'Theory Content'}
                      </label>
                    </div>

                    {/* Rich Text Toolbar */}
                    <div className={`flex flex-wrap items-center gap-1 px-3 py-2 bg-slate-800 border border-slate-700 ${isFullScreen ? 'rounded-t-xl' : 'rounded-t-2xl border-b-0'}`}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-xs font-black text-slate-200 cursor-pointer transition-all" title="Bold (Ctrl+B)">B</button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-xs italic font-semibold text-slate-300 cursor-pointer transition-all" title="Italic (Ctrl+I)">I</button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-xs underline font-semibold text-slate-300 cursor-pointer transition-all" title="Underline (Ctrl+U)">U</button>
                      <div className="w-px h-5 bg-slate-600 mx-1" />
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h2'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-black text-slate-200 cursor-pointer transition-all flex items-center gap-1" title="Heading H2">
                        <Heading size={11} /> H2
                      </button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'p'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-300 cursor-pointer transition-all flex items-center gap-1" title="Normal Paragraph">
                        <FileText size={11} /> Para
                      </button>
                      <div className="w-px h-5 bg-slate-600 mx-1" />
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-300 cursor-pointer transition-all flex items-center gap-1" title="Bullet List">
                        <List size={11} /> • List
                      </button>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-300 cursor-pointer transition-all flex items-center gap-1" title="Numbered List">
                        <List size={11} /> 1. List
                      </button>
                      <div className="w-px h-5 bg-slate-600 mx-1" />
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); insertEditorImage(); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-300 cursor-pointer transition-all flex items-center gap-1" title="Insert Image">
                        <Image size={11} /> Image
                      </button>
                      <div className="flex-1" />
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setIsFullScreen(!isFullScreen); }}
                        className="px-2.5 py-1.5 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg text-[10px] font-semibold text-slate-400 cursor-pointer transition-all flex items-center gap-1" title={isFullScreen ? "Minimize Editor" : "Full Screen Editor"}>
                        {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        {isFullScreen ? "Exit Full Screen" : "Full Screen"}
                      </button>
                    </div>

                    {/* Editable Content Area */}
                    <div
                      ref={(el) => {
                        (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                        if (el && !el.dataset.initialized) {
                          el.innerHTML = initialHtmlRef.current;
                          el.dataset.initialized = 'true';
                        }
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleEditorShortcuts}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                        }
                      }}
                      onPaste={handleEditorPaste}
                      className={`rich-content overflow-y-auto p-5 bg-slate-950 border border-slate-700 rounded-b-2xl outline-none focus:border-blue-500 transition-colors text-sm text-slate-200 leading-relaxed cursor-text ${isFullScreen ? 'flex-1 rounded-b-xl border-t-0 p-8' : 'min-h-[320px] max-h-[55vh]'}`}
                    />
                    <p className="text-[10px] text-slate-500 mt-2">Tip: Ctrl+B Bold │ Ctrl+I Italic │ Ctrl+U Underline │ <strong>-&gt;</strong> → → │ <strong>---</strong> → divider line</p>
                  </div>
                </div>
              )}

              {lesson.type === 'mcq' && (
                <div className="md:col-span-2 space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quiz Builder ({questions.length} Questions)</label>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button" onClick={() => setIsImportModalOpen(true)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-slate-200/60 shadow-sm cursor-pointer transition-all active:scale-95"
                        >
                          Import Quiz
                        </button>
                        <button 
                          type="button" onClick={addQuestion}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-slate-200/60 shadow-sm cursor-pointer transition-all active:scale-95"
                        >
                          <Plus size={12} /> Add Question
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
                    {questions.map((q, qIndex) => (
                      <div 
                        key={q.id}
                        draggable
                        onDragStart={() => handleQuestionDragStart(qIndex)}
                        onDragOver={(e) => handleQuestionDragOver(e, qIndex)}
                        onDragEnd={handleQuestionDragEnd}
                        className={`p-5 bg-slate-800 border rounded-2xl flex flex-col gap-4 relative group/question transition-all ${draggedQuestionIndex === qIndex ? 'opacity-40 border-blue-500 border-dashed' : 'border-slate-700 hover:border-slate-600'}`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                          <div 
                            className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0" 
                            onClick={() => toggleQuestionCollapse(q.id)}
                          >
                            <div className="cursor-grab active:cursor-grabbing text-slate-350 hover:text-slate-500 p-0.5 select-none" onClick={(e) => e.stopPropagation()}>
                              <GripVertical size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 shrink-0">Question {qIndex + 1}</span>
                            {collapsedQuestions.has(q.id) && q.question && (
                              <span className="text-xs text-slate-200 font-bold truncate max-w-[200px] md:max-w-[350px] border-l border-slate-600 pl-2 ml-1">
                                {q.question}
                              </span>
                            )}
                            <ChevronDown 
                              size={14} 
                              className={`text-slate-500 transition-transform duration-200 shrink-0 ml-1 ${!collapsedQuestions.has(q.id) ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" onClick={() => moveQuestion(qIndex, 'up')}
                              disabled={qIndex === 0}
                              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              type="button" onClick={() => moveQuestion(qIndex, 'down')}
                              disabled={qIndex === questions.length - 1}
                              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              type="button" onClick={() => removeQuestion(qIndex)}
                              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {!collapsedQuestions.has(q.id) && (
                          <>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Question Prompt</label>
                               <textarea 
                                 required
                                 value={q.question}
                                 placeholder="Type question prompt..."
                                 onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                                 ref={(el) => {
                                   if (el) {
                                     el.style.height = 'auto';
                                     el.style.height = `${el.scrollHeight}px`;
                                   }
                                 }}
                                 className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-sm font-semibold text-white outline-none focus:border-blue-500 transition-colors min-h-[60px] resize-none overflow-hidden placeholder:text-slate-500"
                               />
                             </div>

                             <div className="space-y-3">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Options (Select radio for Correct Answer)</label>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {q.options.map((opt, optIndex) => {
                                   const letter = ['A', 'B', 'C', 'D'][optIndex];
                                   return (
                                     <div key={optIndex} className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2">
                                       <input 
                                         type="radio" 
                                         name={`correct-${q.id}`}
                                         checked={q.correctIndex === optIndex}
                                         onChange={() => updateCorrectIndex(qIndex, optIndex)}
                                         className="w-4 h-4 text-purple-600 focus:ring-purple-500/20 border-slate-600 cursor-pointer"
                                       />
                                       <span className="text-xs font-black text-slate-300 mr-1">{letter}</span>
                                       <input 
                                         required
                                         type="text" 
                                         value={opt}
                                         placeholder={`Option ${letter}`}
                                         onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                                         className="flex-1 bg-transparent text-xs font-semibold text-white outline-none placeholder:text-slate-500"
                                       />
                                     </div>
                                   );
                                 })}
                               </div>
                             </div>

                             <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Answer Explanation (Optional)</label>
                               <input 
                                 type="text" 
                                 value={q.explanation}
                                 placeholder="Why is this the correct answer? Explain..."
                                 onChange={(e) => updateExplanation(qIndex, e.target.value)}
                                 className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-xs font-medium text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                               />
                             </div>
                          </>
                        )}
                      </div>
                    ))}

                    {questions.length === 0 && (
                      <div className="py-12 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
                        <p className="text-xs font-semibold text-slate-500">No questions added yet. Click "+ Add Question" above to start building the quiz.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2 py-1">
                  <input 
                    type="checkbox" 
                    id="is_global_lesson"
                    checked={isGlobal}
                    onChange={(e) => {
                      setIsGlobal(e.target.checked);
                      if (e.target.checked) setLesson(prev => ({ ...prev, batches: [] }));
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <label htmlFor="is_global_lesson" className="text-xs font-semibold text-slate-400 cursor-pointer">
                    Global Lesson (Visible to all batches)
                  </label>
                </div>

                {!isGlobal && (
                  <MultiSelect 
                    label="Visible to Batches"
                    options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                    selected={lesson.batches}
                    onChange={(s) => setLesson({...lesson, batches: s})}
                  />
                )}
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                  lesson.type === 'assignment' 
                    ? (isEditing ? "Update Assignment" : "Create Assignment") 
                  : lesson.type === 'project'
                    ? (isEditing ? "Update Project" : "Create Project")
                  : lesson.type === 'notes'
                    ? (isEditing ? "Update Theory Lesson" : "Create Theory Lesson")
                  : lesson.type === 'mcq'
                    ? (isEditing ? "Update Quiz" : "Create Quiz")
                    : (isEditing ? "Update Video Class" : "Create Video Class")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Import Quiz Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Bulk Import Quiz Questions</h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Apne quiz questions ko niche diye gaye format mein paste karein. Har question ke sath 4 options (A, B, C, D) hone chahiye:
              </p>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-[10px] font-mono text-slate-400 space-y-1">
                <p>Q1. Computer kya hai?</p>
                <p>A. Ek electronic machine (Correct)</p>
                <p>B. Ek mobile phone</p>
                <p>C. Ek TV</p>
                <p>D. Ek printer</p>
                <p className="text-purple-400 font-bold mt-1">// Tip: Correct answer ke aage (Correct) likh sakte hain ya niche Answer: A likhein.</p>
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Paste questions here...&#10;&#10;Q1. Computer kya hai?&#10;A. Ek electronic machine&#10;B. Ek mobile phone&#10;C. Ek TV&#10;D. Ek printer&#10;Answer: A"}
              className="w-full h-64 p-4 border border-slate-700 bg-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-white resize-none placeholder:text-slate-500"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleImportQuiz(importText);
                  setIsImportModalOpen(false);
                  setImportText("");
                }}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-lg shadow-purple-900/40"
              >
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
