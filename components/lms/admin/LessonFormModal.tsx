"use client";
import { useState, useRef, useEffect } from "react";
import { 
  X, Loader2, Plus, Trash2, GripVertical, Heading, FileText, Image, List, ArrowUp, ArrowDown, ChevronDown, FolderCode, Maximize2, Minimize2,
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, ListOrdered, Quote, Code, Link2, Table, Sparkles, Eye, Columns, 
  Lightbulb, AlertTriangle, Info, Clock, AlignLeft, AlignCenter, AlignRight, AlignJustify, Check, Upload, LayoutTemplate, HelpCircle, BookOpen, ExternalLink, RotateCcw, Redo2, RemoveFormatting, Search
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";
import DOMPurify from "isomorphic-dompurify";

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
  const [isFullScreen, setIsFullScreen] = useState(true);
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
        if (parsedBlocks.length > 0) {
          const generated = parsedBlocks.map((block) => {
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
          if (generated.trim()) {
            return generated.endsWith('</p>') ? generated : generated + '<p><br></p>';
          }
        }
      } catch (_e) { /* fall through */ }
    }

    // Try parsing legacy theory data JSON (fallback)
    const legacyMatch = content.match(/<!-- THEORY_DATA_JSON:(.*?) -->/);
    if (legacyMatch && legacyMatch[1]) {
      try {
        const oldData = JSON.parse(legacyMatch[1]);
        const parts: string[] = [];
        if (oldData.title?.trim()) parts.push(`<h2>${oldData.title}</h2>`);
        if (oldData.text?.trim()) parts.push(`<p>${oldData.text}</p>`);
        if (oldData.imageUrl?.trim()) parts.push(`<div><img src="${oldData.imageUrl}" alt="Content Image" class="rounded-xl max-h-72 object-cover border border-slate-100 my-3 block" /></div>`);
        if (oldData.points?.length) {
          parts.push(`<ul>${oldData.points.filter((p: string) => p.trim()).map((p: string) => `<li>${p}</li>`).join('')}</ul>`);
        }
        if (parts.length > 0) {
          const gen = parts.join('');
          return gen.endsWith('</p>') ? gen : gen + '<p><br></p>';
        }
      } catch (_e) { /* fall through */ }
    }

    const stripped = content
      .replace(/<!-- THEORY_BLOCKS_JSON:.*? -->/, '')
      .replace(/<!-- THEORY_DATA_JSON:.*? -->/, '')
      .replace(/<!-- MCQ_QUESTIONS_JSON:.*? -->/, '')
      .trim();

    if (stripped) {
      if (stripped.includes('<')) return stripped;
      return `<p>${stripped}</p>`;
    }

    // Default to a clean paragraph so user is NEVER in a heading or bold by default!
    return '<p><br></p>';
  };

  const initialHtmlRef = useRef<string>(getInitialEditorHtml());

  // ── Upgraded Rich Text Editor State ──
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [liveHtml, setLiveHtml] = useState<string>(initialHtmlRef.current);
  const [editorStats, setEditorStats] = useState(() => {
    const text = (initialHtmlRef.current || '').replace(/<[^>]*>/g, ' ').trim();
    const words = text ? (text.match(/\S+/g) || []).length : 0;
    return {
      words,
      chars: text.length,
      readingTime: Math.max(1, Math.ceil(words / 180))
    };
  });

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [imageForm, setImageForm] = useState({
    url: '',
    alt: '',
    size: 'full' as 'full' | 'medium' | 'small'
  });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ text: '', url: '' });
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableForm, setTableForm] = useState({ rows: 3, cols: 3 });
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isCalloutMenuOpen, setIsCalloutMenuOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncEditorState = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = (editorRef.current.innerText || '').trim();
    const words = text ? (text.match(/\S+/g) || []).length : 0;
    setLiveHtml(html);
    setEditorStats({
      words,
      chars: text.length,
      readingTime: Math.max(1, Math.ceil(words / 180))
    });
  };

  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value ?? undefined);
    syncEditorState();
  };

  const formatHeading = (tag: 'h1' | 'h2' | 'h3' | 'p') => {
    editorRef.current?.focus();
    const blockTag = tag === 'p' ? '<p>' : `<${tag}>`;
    try {
      document.execCommand('formatBlock', false, blockTag);
    } catch (_e) {
      document.execCommand('formatBlock', false, tag);
    }
    try {
      if (document.queryCommandState('bold')) {
        document.execCommand('bold', false, undefined);
      }
    } catch (_e) {}
    syncEditorState();
  };

  // ── Multi-tap Heading Cycle Shortcut (Ctrl + Shift + H = H1 -> H2 -> H3 -> Para -> H1) ──
  const lastHeadingCycleTimeRef = useRef<number>(0);
  const lastHeadingLevelRef = useRef<'h1' | 'h2' | 'h3' | 'p' | ''>('');

  const handleHeadingCycleShortcut = () => {
    const now = Date.now();
    const isQuickFollowUp = now - lastHeadingCycleTimeRef.current < 1600;

    let currentDomLevel: 'h1' | 'h2' | 'h3' | 'p' = 'p';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as HTMLElement).tagName.toLowerCase();
          if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'p') {
            currentDomLevel = tag as 'h1' | 'h2' | 'h3' | 'p';
            break;
          }
        }
        node = node.parentNode;
      }
    }

    let nextLevel: 'h1' | 'h2' | 'h3' | 'p' = 'h1';

    if (isQuickFollowUp && lastHeadingLevelRef.current) {
      if (lastHeadingLevelRef.current === 'h1') nextLevel = 'h2';
      else if (lastHeadingLevelRef.current === 'h2') nextLevel = 'h3';
      else if (lastHeadingLevelRef.current === 'h3') nextLevel = 'p';
      else nextLevel = 'h1';
    } else {
      if (currentDomLevel === 'h1') nextLevel = 'h2';
      else if (currentDomLevel === 'h2') nextLevel = 'h3';
      else if (currentDomLevel === 'h3') nextLevel = 'p';
      else nextLevel = 'h1';
    }

    lastHeadingLevelRef.current = nextLevel;
    lastHeadingCycleTimeRef.current = now;

    formatHeading(nextLevel);
  };

  // ── Notion-Style Slash Command Menu (/ Trigger) ──
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 120, left: 120 });
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const slashCommands = [
    {
      id: 'h1',
      title: 'H1',
      label: 'Heading 1',
      desc: 'Top-level main title heading',
      keywords: ['h1', 'heading 1', 'header', 'title', 'main'],
      icon: Heading1,
      action: () => formatHeading('h1')
    },
    {
      id: 'h2',
      title: 'H2',
      label: 'Heading 2',
      desc: 'Section heading title',
      keywords: ['h2', 'heading 2', 'header', 'section', 'subtitle'],
      icon: Heading2,
      action: () => formatHeading('h2')
    },
    {
      id: 'h3',
      title: 'H3',
      label: 'Heading 3',
      desc: 'Sub-section header title',
      keywords: ['h3', 'heading 3', 'header', 'sub', 'topic'],
      icon: Heading3,
      action: () => formatHeading('h3')
    },
    {
      id: 'text',
      title: 'Text',
      label: 'Paragraph Text',
      desc: 'Normal paragraph body text',
      keywords: ['text', 'p', 'para', 'paragraph', 'normal', 'plain', 'body'],
      icon: FileText,
      action: () => formatHeading('p')
    },
    {
      id: 'code',
      title: 'Code',
      label: 'Code Block',
      desc: 'Pre-formatted multi-line code snippet',
      keywords: ['code', 'code block', 'snippet', 'pre', 'script', 'programming'],
      icon: Code,
      action: () => insertCodeBlock()
    },
    {
      id: 'table',
      title: 'Table',
      label: 'Table Grid',
      desc: 'Insert customizable row/column data table',
      keywords: ['table', 'grid', 'rows', 'columns', 'data', 'sheet'],
      icon: Table,
      action: () => setIsTableModalOpen(true)
    },
    {
      id: 'link',
      title: 'Link',
      label: 'Hyperlink',
      desc: 'Insert external web hyperlink into text',
      keywords: ['link', 'url', 'href', 'hyperlink', 'web', 'site'],
      icon: Link2,
      action: () => openLinkModal()
    },
    {
      id: 'image',
      title: 'Image',
      label: 'Upload / Image',
      desc: 'Insert picture via web URL or local device file',
      keywords: ['image', 'img', 'picture', 'photo', 'upload', 'media'],
      icon: Image,
      action: () => openImageModal()
    }
  ];

  const filteredCommands = slashCommands.filter(cmd => {
    if (!slashQuery.trim()) return true;
    const q = slashQuery.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  });

  // Display only top 4 list items at a time, remainder hidden until searched
  const displayCommands = filteredCommands.slice(0, 4);

  const checkForSlashTrigger = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      setIsSlashMenuOpen(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;

    if (node.nodeType !== Node.TEXT_NODE || !editorRef.current.contains(node)) {
      setIsSlashMenuOpen(false);
      return;
    }

    const textBeforeCursor = (node.textContent || '').slice(0, offset);
    const match = textBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);

    if (match) {
      const query = match[1];
      setSlashQuery(query);
      setSlashSelectedIndex(0);

      // Compute bounding rect of cursor
      try {
        const rect = range.getBoundingClientRect();
        const menuHeight = 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        let top = rect.bottom + 6;
        // In user's image 2: menu floats above the cursor when near bottom
        if (spaceBelow < menuHeight + 20 && rect.top > menuHeight + 20) {
          top = rect.top - menuHeight - 6;
        }

        let left = Math.max(16, Math.min(rect.left, window.innerWidth - 270));
        setSlashMenuPos({ top, left });
      } catch (_e) {
        // Fallback
      }

      setIsSlashMenuOpen(true);
    } else {
      setIsSlashMenuOpen(false);
    }
  };

  const executeSlashCommand = (cmd: typeof slashCommands[0]) => {
    setIsSlashMenuOpen(false);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      const offset = range.startOffset;

      if (node.nodeType === Node.TEXT_NODE) {
        const fullText = node.textContent || '';
        const textBefore = fullText.slice(0, offset);
        const slashIndex = textBefore.lastIndexOf('/');

        if (slashIndex !== -1) {
          const beforeSlash = fullText.slice(0, slashIndex);
          const afterCursor = fullText.slice(offset);
          node.textContent = beforeSlash + afterCursor;

          // Reposition cursor at slashIndex
          const newRange = document.createRange();
          newRange.setStart(node, slashIndex);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    setTimeout(() => {
      cmd.action();
      syncEditorState();
    }, 15);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ── Heading 1 / 2 / 3 Cycling shortcut: Ctrl + Shift + H ──
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'h' || e.code === 'KeyH')) {
        e.preventDefault();
        e.stopPropagation();
        handleHeadingCycleShortcut();
        return;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isSlashMenuOpen && slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setIsSlashMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSlashMenuOpen]);

  const insertInlineCode = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString() : '';
    if (selectedText) {
      document.execCommand('insertHTML', false, `<code>${selectedText}</code>`);
    } else {
      document.execCommand('insertHTML', false, `<code>code</code>&nbsp;`);
    }
    syncEditorState();
  };

  const insertCodeBlock = () => {
    editorRef.current?.focus();
    const codeSnippet = `<pre><code>// Write or paste code snippet here\nfunction example() {\n  console.log("Hello, World!");\n}</code></pre><p><br></p>`;
    document.execCommand('insertHTML', false, codeSnippet);
    syncEditorState();
  };

  const insertBlockquote = () => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, 'blockquote');
    syncEditorState();
  };

  const insertCallout = (type: 'tip' | 'warning' | 'info') => {
    editorRef.current?.focus();
    let badge = '💡 PRO TIP';
    let className = 'callout-tip';
    let placeholder = 'Highlight an essential practical tip or best practice for students.';
    if (type === 'warning') {
      badge = '⚠️ CAUTION';
      className = 'callout-warning';
      placeholder = 'Important warning: Avoid common mistakes or deprecated methods.';
    } else if (type === 'info') {
      badge = 'ℹ️ NOTE';
      className = 'callout-info';
      placeholder = 'Helpful note or reference point regarding this lesson.';
    }
    const html = `<div class="${className}"><p><strong>${badge}:</strong> ${placeholder}</p></div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    setIsCalloutMenuOpen(false);
    syncEditorState();
  };

  const insertTable = (rows: number, cols: number) => {
    editorRef.current?.focus();
    let tableHtml = `<div style="overflow-x:auto;margin:12px 0;"><table><thead><tr>`;
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th>Column ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= rows - 1; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td>Item ${r}.${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table></div><p><br></p>`;
    document.execCommand('insertHTML', false, tableHtml);
    setIsTableModalOpen(false);
    syncEditorState();
  };

  const insertDivider = () => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<hr><p><br></p>');
    syncEditorState();
  };

  const insertHighlight = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const selected = sel ? sel.toString() : '';
    if (selected) {
      document.execCommand('insertHTML', false, `<mark>${selected}</mark>`);
    } else {
      document.execCommand('insertHTML', false, `<mark>highlighted text</mark>&nbsp;`);
    }
    syncEditorState();
  };

  const clearFormatting = () => {
    editorRef.current?.focus();
    document.execCommand('removeFormat', false);
    syncEditorState();
  };

  const openLinkModal = () => {
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString() : '';
    setLinkForm({ text: selectedText, url: '' });
    setIsLinkModalOpen(true);
  };

  const applyLink = () => {
    if (!linkForm.url.trim()) return;
    editorRef.current?.focus();
    const url = linkForm.url.trim().startsWith('http') ? linkForm.url.trim() : `https://${linkForm.url.trim()}`;
    const text = linkForm.text.trim() || url;
    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>&nbsp;`);
    setIsLinkModalOpen(false);
    setLinkForm({ text: '', url: '' });
    syncEditorState();
  };

  const openImageModal = () => {
    setImageForm({ url: '', alt: '', size: 'full' });
    setImageTab('url');
    setIsImageModalOpen(true);
  };

  const applyImage = (url: string, alt: string, size: 'full' | 'medium' | 'small') => {
    if (!url.trim()) return;
    editorRef.current?.focus();
    const maxWidth = size === 'small' ? '360px' : size === 'medium' ? '560px' : '100%';
    const html = `<div style="text-align:center;margin:16px 0;"><img src="${url.trim()}" alt="${alt.trim() || 'Lesson illustration'}" style="max-width:${maxWidth};width:100%;height:auto;border-radius:12px;display:inline-block;border:1px solid #334155;" />${alt.trim() ? `<p style="font-size:11px;color:#94a3b8;margin-top:6px;font-style:italic;">${alt.trim()}</p>` : ''}</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    setIsImageModalOpen(false);
    setImageForm({ url: '', alt: '', size: 'full' });
    syncEditorState();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setImageForm(prev => ({ ...prev, url: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const applyTemplate = (templateType: 'theory' | 'code' | 'cheatsheet' | 'assignment') => {
    const hasContent = editorRef.current && editorRef.current.innerText.trim().length > 0;
    if (hasContent) {
      if (!confirm("Is template ko apply karne se current editor content replace ho jayega. Kya aap continue karna chahte hain?")) {
        return;
      }
    }

    let templateHtml = '';
    if (templateType === 'theory') {
      templateHtml = `<h2>1. Introduction & Overview</h2>
<p>Provide a clear, engaging overview of this topic. Why is it important and where is it used in the real world?</p>
<div class="callout-info"><p><strong>ℹ️ NOTE:</strong> Core lesson objective: Master foundational principles through step-by-step reasoning.</p></div>
<h2>2. Core Concepts Explained</h2>
<p>Break down the primary concept into easy-to-digest parts.</p>
<ul>
  <li><strong>Principle 1:</strong> Description and explanation of the first major principle.</li>
  <li><strong>Principle 2:</strong> Description and explanation of the second major principle.</li>
  <li><strong>Principle 3:</strong> Important exceptions or best practices to remember.</li>
</ul>
<h2>3. Practical Demonstration</h2>
<p>Walk through an illustrative example with step-by-step guidance.</p>
<div class="callout-tip"><p><strong>💡 PRO TIP:</strong> Always test with edge case scenarios to ensure robustness.</p></div>
<hr>
<h2>4. Summary & Review Questions</h2>
<ol>
  <li>What is the primary role of this topic in software development?</li>
  <li>Name two advantages of following the recommended pattern.</li>
</ol>`;
    } else if (templateType === 'code') {
      templateHtml = `<h2>1. Tutorial Overview</h2>
<p>In this technical tutorial, we will build a complete solution from scratch.</p>
<div class="callout-info"><p><strong>ℹ️ Prerequisites:</strong> Basic JavaScript knowledge and modern browser terminal access.</p></div>
<h2>2. Step-by-Step Code Walkthrough</h2>
<h3>Step 1: Boilerplate Setup</h3>
<pre><code>// Initialize environment configuration
const appConfig = {
  appName: "Vision LMS",
  version: "1.0.0",
  debug: true
};
console.log("Config loaded:", appConfig.appName);</code></pre>
<h3>Step 2: Processing Implementation</h3>
<pre><code>function calculateProgress(completed, total) {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
}</code></pre>
<div class="callout-warning"><p><strong>⚠️ CAUTION:</strong> Always guard against division by zero errors.</p></div>
<h2>3. Expected Output & Testing</h2>
<p>Verify that your function returns <code>100</code> when total equals completed.</p>`;
    } else if (templateType === 'cheatsheet') {
      templateHtml = `<h2>Quick Reference Cheat Sheet</h2>
<p>Quick lookup guide for syntax, properties, and essential commands.</p>
<div style="overflow-x:auto;margin:12px 0;">
<table>
  <thead>
    <tr>
      <th>Command / Property</th>
      <th>Description</th>
      <th>Example Syntax</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Initialize</strong></td>
      <td>Creates a new instance in memory</td>
      <td><code>new Module()</code></td>
    </tr>
    <tr>
      <td><strong>Execute</strong></td>
      <td>Runs asynchronous lifecycle task</td>
      <td><code>await module.run()</code></td>
    </tr>
    <tr>
      <td><strong>Cleanup</strong></td>
      <td>Disposes cached variables</td>
      <td><code>module.destroy()</code></td>
    </tr>
  </tbody>
</table>
</div>
<div class="callout-tip"><p><strong>💡 PRO TIP:</strong> Always run cleanup inside try...finally blocks.</p></div>`;
    } else {
      templateHtml = `<h2>Project Specifications & Brief</h2>
<p>Review the requirements below and complete the implementation before the deadline.</p>
<div class="callout-info"><p><strong>ℹ️ Deliverable:</strong> Submit a public GitHub repository link and deployed live demo URL.</p></div>
<h2>Core Deliverables Checklist</h2>
<ul>
  <li>Clean code architecture adhering to modern standards.</li>
  <li>Proper responsive layout on mobile, tablet, and desktop screens.</li>
  <li>Error-handling for missing data or network latency.</li>
</ul>
<div class="callout-warning"><p><strong>⚠️ Submission Deadline:</strong> Please submit within 7 days of module completion.</p></div>`;
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = templateHtml;
    }
    setIsTemplateMenuOpen(false);
    syncEditorState();
  };

  const clearEditorContent = () => {
    if (confirm("Kya aap saara content clear karna chahte hain?")) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p><br></p>';
      }
      syncEditorState();
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
        finalNotesContent = editorRef.current?.innerHTML || liveHtml || '';
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
    <div className={`light-modal fixed inset-0 z-[100] ${isFullScreen ? 'w-screen h-screen p-0 flex flex-col overflow-hidden bg-slate-100' : 'bg-slate-900/40 backdrop-blur-xs overflow-y-auto p-2 sm:p-4 min-h-full flex items-center justify-center'} animate-in fade-in duration-200`}>
      <div className={`${isFullScreen ? 'w-full h-full p-0 flex-1 flex flex-col' : 'w-full max-w-6xl py-2 sm:py-4 flex items-center justify-center'}`}>
        <div className={`bg-white shadow-2xl overflow-hidden transition-all duration-200 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-6xl rounded-2xl border border-slate-200 max-h-[94vh]'}`}>
          
          {/* Light Modal Header with Non-editable Lesson Title & Studio Controls */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <FileText size={16} />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[160px] xs:max-w-[220px] sm:max-w-xs md:max-w-md lg:max-w-lg" title={lesson.title || getModalTitle()}>
                  {lesson.title || getModalTitle()}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {lesson.type}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(lesson.type === 'notes' || lesson.type === 'assignment' || lesson.type === 'project') && (
                <>
                  {/* Templates Dropdown Button */}
                  <div className="relative">
                    {isTemplateMenuOpen && (
                      <div 
                        className="fixed inset-0 z-[155]" 
                        onClick={() => setIsTemplateMenuOpen(false)} 
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs relative z-[156]"
                      title="Insert pre-structured lesson templates"
                    >
                      <LayoutTemplate size={13} className="text-amber-500" />
                      <span className="hidden sm:inline">Templates</span>
                      <ChevronDown size={11} className={`text-slate-500 transition-transform ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTemplateMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 z-[160] animate-in fade-in zoom-in-95 space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Quick Starter Templates
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplate('theory');
                            setIsTemplateMenuOpen(false);
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            📘 Standard Theory Lesson
                          </span>
                          <span className="text-[10px] text-slate-500">Intro, Concepts, Demonstration & Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplate('code');
                            setIsTemplateMenuOpen(false);
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            💻 Coding Tutorial
                          </span>
                          <span className="text-[10px] text-slate-500">Prerequisites, Steps, Code Blocks & Output</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplate('cheatsheet');
                            setIsTemplateMenuOpen(false);
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            📝 Quick Reference / Cheat Sheet
                          </span>
                          <span className="text-[10px] text-slate-500">Table reference, syntax, and memory tips</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplate('assignment');
                            setIsTemplateMenuOpen(false);
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            🎯 Project & Task Brief
                          </span>
                          <span className="text-[10px] text-slate-500">Objectives, requirements checklist & deadlines</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* View Mode Segmented Controls */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditorViewMode('edit')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        editorViewMode === 'edit'
                          ? 'bg-white text-blue-600 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                      title="Edit Mode (WYSIWYG)"
                    >
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncEditorState();
                        setEditorViewMode('split');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        editorViewMode === 'split'
                          ? 'bg-white text-blue-600 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                      title="Split View (Side-by-side Editor & Student Preview)"
                    >
                      <Columns size={12} />
                      <span className="hidden sm:inline">Split</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncEditorState();
                        setEditorViewMode('preview');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        editorViewMode === 'preview'
                          ? 'bg-white text-blue-600 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                      title="Live Student Preview"
                    >
                      <Eye size={12} />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  </div>

                  {/* Fullscreen Button */}
                  <button 
                    type="button" 
                    onMouseDown={(e) => { e.preventDefault(); setIsFullScreen(!isFullScreen); }}
                    className="p-1.5 hover:bg-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1" 
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen Editor"}
                  >
                    {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                  {/* Reading stats */}
                  <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Clock size={10} className="text-blue-600" /> ~{editorStats.readingTime}m
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-700">{editorStats.words}w</span>
                  </div>
                </>
              )}

              <div className="w-px h-4 bg-slate-200 mx-0.5" />

              <button 
                type="button"
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-all cursor-pointer text-slate-400 hover:text-slate-700"
                title="Close Modal"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden p-2.5 sm:p-3 bg-slate-50/70 space-y-2">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Show title input only when creating a new lesson from scratch */}
              {!isEditing && (
                <div className="mb-2 space-y-1 group shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-blue-600" />
                    Class / Lesson Title
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={lesson.title}
                    placeholder="e.g. Introduction to Variables, Functions and Scope"
                    onChange={(e) => setLesson({...lesson, title: e.target.value})}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-xs" 
                  />
                </div>
              )}

              {!isTypePreSelected && (
                <div className="mb-2 space-y-1.5 shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Content Type</label>
                  <select 
                    value={lesson.type}
                    onChange={(e) => setLesson({...lesson, type: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all text-xs font-bold text-slate-800 shadow-xs"
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
                <div className="space-y-4 shrink-0">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">YouTube Video URL</label>
                    <input 
                      type="text" value={lesson.content_url}
                      placeholder="https://www.youtube.com/watch?v=..."
                      onChange={(e) => setLesson({...lesson, content_url: e.target.value})}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Resource Link (PDF/Document/Website Link)</label>
                    <input 
                      type="text" value={lesson.pdf_url}
                      placeholder="https://example.com/class-resources.pdf"
                      onChange={(e) => setLesson({...lesson, pdf_url: e.target.value})}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-xs" 
                    />
                  </div>
                </div>
              )}

              {(lesson.type === 'notes' || lesson.type === 'assignment' || lesson.type === 'project') && (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-350">
                  <div className="flex-1 flex flex-col min-h-0 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    
                    {/* Rich Formatting Toolbar (Active in edit & split modes) - Light Mode & Full Options */}
                    <div className={`flex flex-wrap items-center gap-1 px-3 py-1.5 bg-slate-50/90 border-b border-slate-200 shrink-0 ${editorViewMode === 'preview' ? 'hidden' : ''}`}>
                      {/* Undo / Redo */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('undo'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Undo (Ctrl+Z)"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('redo'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo2 size={13} />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Headings */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); formatHeading('h1'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition-colors cursor-pointer" 
                        title="Heading 1 (Main Title)"
                      >
                        H1
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); formatHeading('h2'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer" 
                        title="Heading 2 (Section Title)"
                      >
                        H2
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); formatHeading('h3'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer" 
                        title="Heading 3 (Sub-heading)"
                      >
                        H3
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); formatHeading('p'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition-colors cursor-pointer" 
                        title="Normal Paragraph"
                      >
                        Para
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Text Style */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-black transition-colors cursor-pointer" 
                        title="Bold (Ctrl+B)"
                      >
                        <Bold size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs italic transition-colors cursor-pointer" 
                        title="Italic (Ctrl+I)"
                      >
                        <Italic size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs underline transition-colors cursor-pointer" 
                        title="Underline (Ctrl+U)"
                      >
                        <Underline size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('strikeThrough'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded-lg text-xs transition-colors cursor-pointer" 
                        title="Strikethrough"
                      >
                        <Strikethrough size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); insertInlineCode(); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-blue-600 font-mono rounded-lg text-xs font-bold transition-colors cursor-pointer" 
                        title="Inline Code (`code`)"
                      >
                        &lt;/&gt;
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); insertHighlight(); }}
                        className="px-2 py-1 hover:bg-amber-100 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer" 
                        title="Highlight Marker"
                      >
                        Mark
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); clearFormatting(); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded-lg text-xs transition-colors cursor-pointer" 
                        title="Clear Formatting"
                      >
                        <RemoveFormatting size={13} />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Alignments */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Align Left"
                      >
                        <AlignLeft size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Align Center"
                      >
                        <AlignCenter size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Align Right"
                      >
                        <AlignRight size={13} />
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer" 
                        title="Justify Text"
                      >
                        <AlignJustify size={13} />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Lists & Quotes */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer" 
                        title="Bullet List"
                      >
                        <List size={13} />
                        <span>List</span>
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer" 
                        title="Numbered List"
                      >
                        <ListOrdered size={13} />
                        <span>1. 2. 3.</span>
                      </button>
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); insertBlockquote(); }}
                        className="p-1.5 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-lg text-xs transition-colors cursor-pointer" 
                        title="Blockquote Quote"
                      >
                        <Quote size={13} />
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Blocks: Code Block, Callout, Table, Divider */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); insertCodeBlock(); }}
                        className="px-2 py-1 hover:bg-purple-50 text-purple-700 border border-purple-200/70 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer" 
                        title="Multi-line Code Snippet Block"
                      >
                        <Code size={13} className="text-purple-600" />
                        <span>Code Block</span>
                      </button>

                      {/* Callout Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsCalloutMenuOpen(!isCalloutMenuOpen)}
                          className="px-2 py-1 hover:bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Insert Callout Alert Box"
                        >
                          <Lightbulb size={13} className="text-emerald-600" />
                          <span>Callout</span>
                          <ChevronDown size={10} className="text-emerald-600" />
                        </button>
                        {isCalloutMenuOpen && (
                          <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => insertCallout('tip')}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Lightbulb size={12} />
                              <span>💡 Pro Tip Box</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertCallout('info')}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Info size={12} />
                              <span>ℹ️ Note / Info Box</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertCallout('warning')}
                              className="w-full px-2.5 py-1.5 text-left rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <AlertTriangle size={12} />
                              <span>⚠️ Caution Box</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Table Insert Button */}
                      <button 
                        type="button" 
                        onClick={() => setIsTableModalOpen(true)}
                        className="px-2 py-1 hover:bg-cyan-50 text-cyan-700 border border-cyan-200/70 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer" 
                        title="Insert Table"
                      >
                        <Table size={13} className="text-cyan-600" />
                        <span>Table</span>
                      </button>

                      {/* Divider Button */}
                      <button 
                        type="button" 
                        onMouseDown={(e) => { e.preventDefault(); insertDivider(); }}
                        className="px-2 py-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors cursor-pointer" 
                        title="Horizontal Divider (---)"
                      >
                        ―
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Links & Image */}
                      <button 
                        type="button" 
                        onClick={openLinkModal}
                        className="px-2 py-1 hover:bg-blue-50 text-blue-600 border border-blue-200/70 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer" 
                        title="Insert Link (Ctrl+K)"
                      >
                        <Link2 size={13} />
                        <span>Link</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={openImageModal}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs" 
                        title="Insert / Upload Image"
                      >
                        <Image size={13} />
                        <span>Image</span>
                      </button>

                      <div className="w-px h-4 bg-slate-200 mx-1" />

                      {/* Slash Commands Helper */}
                      <button 
                        type="button" 
                        onClick={() => {
                          editorRef.current?.focus();
                          document.execCommand('insertText', false, '/');
                          checkForSlashTrigger();
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs" 
                        title="Type '/' in editor to open commands"
                      >
                        <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">/</span>
                        <span>Commands</span>
                      </button>
                    </div>

                    {/* Workspace Area: Editor & Live Preview */}
                    <div className={`flex-1 min-h-0 flex ${editorViewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200' : ''}`}>
                      
                      {/* Editor Pane */}
                      <div className={`relative flex flex-col min-h-0 ${editorViewMode === 'preview' ? 'hidden' : 'flex-1'}`}>
                        {editorViewMode === 'split' && (
                          <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between shrink-0">
                            <span>✏️ WYSIWYG Editor</span>
                            <span className="font-mono text-slate-400">Auto-syncing preview</span>
                          </div>
                        )}

                        <div
                          ref={(el) => {
                            (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                            if (el && !el.dataset.initialized) {
                              const raw = initialHtmlRef.current;
                              el.innerHTML = (raw && raw.trim()) ? raw : '<p><br></p>';
                              el.dataset.initialized = 'true';
                              try {
                                document.execCommand('defaultParagraphSeparator', false, 'p');
                              } catch (_e) {}
                              syncEditorState();
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => {
                            try {
                              document.execCommand('defaultParagraphSeparator', false, 'p');
                            } catch (_e) {}
                          }}
                          onInput={() => {
                            if (editorRef.current && (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>' || editorRef.current.innerHTML.trim() === '')) {
                              editorRef.current.innerHTML = '<p><br></p>';
                            }
                            handleEditorShortcuts();
                            syncEditorState();
                            checkForSlashTrigger();
                          }}
                          onKeyUp={(e) => {
                            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete'].includes(e.key)) {
                              checkForSlashTrigger();
                            }
                          }}
                          onClick={() => {
                            checkForSlashTrigger();
                          }}
                          onKeyDown={(e) => {
                            if (isSlashMenuOpen) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSlashSelectedIndex((prev) => 
                                  displayCommands.length === 0 ? 0 : (prev + 1) % displayCommands.length
                                );
                                return;
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSlashSelectedIndex((prev) => 
                                  displayCommands.length === 0 ? 0 : (prev - 1 + displayCommands.length) % displayCommands.length
                                );
                                return;
                              } else if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (displayCommands[slashSelectedIndex]) {
                                  executeSlashCommand(displayCommands[slashSelectedIndex]);
                                }
                                return;
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setIsSlashMenuOpen(false);
                                return;
                              }
                            }

                            // ── Enter key on Headings: automatically exit to normal paragraph ──
                            if (e.key === 'Enter' && !e.shiftKey) {
                              const sel = window.getSelection();
                              if (sel && sel.rangeCount > 0) {
                                let node: Node | null = sel.anchorNode;
                                let headingEl: HTMLElement | null = null;
                                while (node && node !== editorRef.current) {
                                  if (node.nodeType === Node.ELEMENT_NODE) {
                                    const tag = (node as HTMLElement).tagName.toLowerCase();
                                    if (['h1', 'h2', 'h3'].includes(tag)) {
                                      headingEl = node as HTMLElement;
                                      break;
                                    }
                                  }
                                  node = node ? node.parentNode : null;
                                }

                                if (headingEl) {
                                  e.preventDefault();
                                  const range = sel.getRangeAt(0);
                                  const p = document.createElement('p');
                                  p.innerHTML = '<br>';

                                  const isAtEnd = range.collapsed && (
                                    (range.endContainer.nodeType === Node.TEXT_NODE && range.endOffset === (range.endContainer.textContent?.length || 0)) ||
                                    (range.endContainer === headingEl && range.endOffset === headingEl.childNodes.length)
                                  );

                                  if (isAtEnd) {
                                    if (headingEl.nextSibling) {
                                      headingEl.parentNode?.insertBefore(p, headingEl.nextSibling);
                                    } else {
                                      headingEl.parentNode?.appendChild(p);
                                    }
                                  } else {
                                    const afterRange = range.cloneRange();
                                    afterRange.selectNodeContents(headingEl);
                                    afterRange.setStart(range.endContainer, range.endOffset);
                                    const extracted = afterRange.extractContents();
                                    p.appendChild(extracted);
                                    if (!p.textContent?.trim() && !p.querySelector('img, pre, table, br')) {
                                      p.innerHTML = '<br>';
                                    }
                                    if (headingEl.nextSibling) {
                                      headingEl.parentNode?.insertBefore(p, headingEl.nextSibling);
                                    } else {
                                      headingEl.parentNode?.appendChild(p);
                                    }
                                  }

                                  const newRange = document.createRange();
                                  newRange.setStart(p, 0);
                                  newRange.collapse(true);
                                  sel.removeAllRanges();
                                  sel.addRange(newRange);

                                  try {
                                    if (document.queryCommandState('bold')) {
                                      document.execCommand('bold', false, undefined);
                                    }
                                  } catch (_e) {}

                                  syncEditorState();
                                  return;
                                }
                              }
                            }

                            // ── Backspace on empty Heading: revert to paragraph ──
                            if (e.key === 'Backspace') {
                              const sel = window.getSelection();
                              if (sel && sel.rangeCount > 0) {
                                let node: Node | null = sel.anchorNode;
                                let headingEl: HTMLElement | null = null;
                                while (node && node !== editorRef.current) {
                                  if (node.nodeType === Node.ELEMENT_NODE) {
                                    const tag = (node as HTMLElement).tagName.toLowerCase();
                                    if (['h1', 'h2', 'h3'].includes(tag)) {
                                      headingEl = node as HTMLElement;
                                      break;
                                    }
                                  }
                                  node = node ? node.parentNode : null;
                                }
                                if (headingEl && (!headingEl.textContent?.trim() || headingEl.textContent === '')) {
                                  e.preventDefault();
                                  formatHeading('p');
                                  return;
                                }
                              }
                            }

                            if (e.key === 'Tab') {
                              e.preventDefault();
                              document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                              syncEditorState();
                            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'h' || e.code === 'KeyH')) {
                              e.preventDefault();
                              handleHeadingCycleShortcut();
                            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                              e.preventDefault();
                              openLinkModal();
                            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                              e.preventDefault();
                              execCmd('bold');
                            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                              e.preventDefault();
                              execCmd('italic');
                            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                              e.preventDefault();
                              execCmd('underline');
                            }
                          }}
                          onPaste={handleEditorPaste}
                          className="rich-content flex-1 h-full overflow-y-auto p-6 sm:p-8 bg-white outline-none focus:ring-0 text-sm font-normal text-slate-800 leading-relaxed cursor-text transition-all"
                        />
                      </div>

                      {/* Student LMS Live Preview Pane */}
                      {(editorViewMode === 'split' || editorViewMode === 'preview') && (
                        <div className={`flex flex-col min-h-0 bg-slate-50/60 ${editorViewMode === 'preview' ? 'w-full' : 'flex-1'}`}>
                          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                Student View Simulation
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Exact rendering on Student Portal
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/60">
                            <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                                {lesson.title || "Untitled Theory Lesson"}
                              </h2>
                              {liveHtml && liveHtml.trim() ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(liveHtml) }} 
                                  className="rich-content text-sm text-slate-800 leading-relaxed"
                                />
                              ) : (
                                <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                  <FileText className="mx-auto text-slate-400 mb-2" size={28} />
                                  <p className="text-xs font-semibold text-slate-500">Content canvas is currently empty</p>
                                  <p className="text-[11px] text-slate-400 mt-1">Start typing in the editor or select a starter template to view live preview.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Compact Stats & Shortcuts Footer */}
                    <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <strong className="text-slate-800">{editorStats.words}</strong> words
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <strong className="text-slate-800">{editorStats.chars}</strong> chars
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-mono text-blue-600">
                          <Clock size={10} /> ~{editorStats.readingTime} min read
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsHelpModalOpen(true)}
                          className="hover:text-slate-900 flex items-center gap-1 text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                        >
                          <HelpCircle size={11} className="text-blue-600" />
                          <span>Keyboard Shortcuts</span>
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={clearEditorContent}
                          className="hover:text-rose-600 flex items-center gap-1 text-[10px] font-semibold text-slate-400 transition-colors cursor-pointer"
                          title="Wipe editor content"
                        >
                          <Trash2 size={10} />
                          <span>Clear Content</span>
                        </button>
                      </div>
                    </div>

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
                                          className={`p-5 bg-white border rounded-2xl flex flex-col gap-4 relative group/question transition-all shadow-xs ${draggedQuestionIndex === qIndex ? 'opacity-40 border-blue-500 border-dashed' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div 
                            className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0" 
                            onClick={() => toggleQuestionCollapse(q.id)}
                          >
                            <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5 select-none" onClick={(e) => e.stopPropagation()}>
                              <GripVertical size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 shrink-0">Question {qIndex + 1}</span>
                            {collapsedQuestions.has(q.id) && q.question && (
                              <span className="text-xs text-slate-700 font-bold truncate max-w-[200px] md:max-w-[350px] border-l border-slate-200 pl-2 ml-1">
                                {q.question}
                              </span>
                            )}
                            <ChevronDown 
                              size={14} 
                              className={`text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${!collapsedQuestions.has(q.id) ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" onClick={() => moveQuestion(qIndex, 'up')}
                              disabled={qIndex === 0}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              type="button" onClick={() => moveQuestion(qIndex, 'down')}
                              disabled={qIndex === questions.length - 1}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              type="button" onClick={() => removeQuestion(qIndex)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
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
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors min-h-[60px] resize-none overflow-hidden placeholder:text-slate-400 shadow-xs"
                               />
                             </div>

                             <div className="space-y-3">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Options (Select radio for Correct Answer)</label>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {q.options.map((opt, optIndex) => {
                                   const letter = ['A', 'B', 'C', 'D'][optIndex];
                                   return (
                                     <div key={optIndex} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
                                       <input 
                                         type="radio" 
                                         name={`correct-${q.id}`}
                                         checked={q.correctIndex === optIndex}
                                         onChange={() => updateCorrectIndex(qIndex, optIndex)}
                                         className="w-4 h-4 text-purple-600 focus:ring-purple-500/20 border-slate-300 cursor-pointer"
                                       />
                                       <span className="text-xs font-black text-slate-700 mr-1">{letter}</span>
                                       <input 
                                         required
                                         type="text" 
                                         value={opt}
                                         placeholder={`Option ${letter}`}
                                         onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                                         className="flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
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
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors placeholder:text-slate-400 shadow-xs"
                               />
                             </div>
                          </>
                        )}
                      </div>
                    ))}

                    {questions.length === 0 && (
                      <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                        <p className="text-xs font-semibold text-slate-500">No questions added yet. Click "+ Add Question" above to start building the quiz.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isGlobal && availableBatches.length > 0 && (
                <div className="md:col-span-2">
                  <MultiSelect 
                    label="Visible to Batches"
                    options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                    selected={lesson.batches}
                    onChange={(s) => setLesson({...lesson, batches: s})}
                  />
                </div>
              )}
            </div>

            <div className="pt-1.5 flex gap-2.5">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl border border-slate-300 transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-[2] py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : (
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Bulk Import Quiz Questions</h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                Apne quiz questions ko niche diye gaye format mein paste karein. Har question ke sath 4 options (A, B, C, D) hone chahiye:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-700 space-y-1">
                <p>Q1. Computer kya hai?</p>
                <p>A. Ek electronic machine (Correct)</p>
                <p>B. Ek mobile phone</p>
                <p>C. Ek TV</p>
                <p>D. Ek printer</p>
                <p className="text-purple-600 font-bold mt-1">// Tip: Correct answer ke aage (Correct) likh sakte hain ya niche Answer: A likhein.</p>
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Paste questions here...&#10;&#10;Q1. Computer kya hai?&#10;A. Ek electronic machine&#10;B. Ek mobile phone&#10;C. Ek TV&#10;D. Ek printer&#10;Answer: A"}
              className="w-full h-64 p-4 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-800 resize-none placeholder:text-slate-400"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl border border-slate-300 text-[10px] cursor-pointer"
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
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-md shadow-purple-500/20"
              >
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Inserter Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[210] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Image size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Insert Image into Lesson</h3>
                  <p className="text-[11px] text-slate-500">Add an image via web URL or upload from your computer</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  imageTab === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Web URL Link
              </button>
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  imageTab === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload from Device
              </button>
            </div>

            {imageTab === 'url' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Direct Image URL</label>
                  <input
                    type="url"
                    value={imageForm.url}
                    onChange={(e) => setImageForm({ ...imageForm, url: e.target.value })}
                    placeholder="https://images.unsplash.com/... or https://..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                >
                  <Upload size={22} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                    {imageForm.url.startsWith('data:') ? 'Image selected! Click to change' : 'Click to choose image file'}
                  </span>
                  <span className="text-[10px] text-slate-400">Supports PNG, JPG, WebP, GIF</span>
                </button>
              </div>
            )}

            {/* Live Image Preview */}
            {imageForm.url && (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <img
                  src={imageForm.url}
                  alt="Preview"
                  className="max-h-36 mx-auto rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Caption & Size options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Caption / Alt Description (Optional)</label>
                <input
                  type="text"
                  value={imageForm.alt}
                  onChange={(e) => setImageForm({ ...imageForm, alt: e.target.value })}
                  placeholder="e.g. Architecture Diagram of the Database"
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Display Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['full', 'medium', 'small'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setImageForm({ ...imageForm, size: sz })}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border cursor-pointer transition-all ${
                        imageForm.size === sz
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl border border-slate-300 text-[10px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!imageForm.url.trim()}
                onClick={() => applyImage(imageForm.url, imageForm.alt, imageForm.size)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-md shadow-blue-500/20"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Inserter Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[210] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Link2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Insert Web Hyperlink</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Link Text to Display</label>
                <input
                  type="text"
                  value={linkForm.text}
                  onChange={(e) => setLinkForm({ ...linkForm, text: e.target.value })}
                  placeholder="e.g. Official Documentation"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target URL</label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://example.com/guide"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl border border-slate-300 text-[10px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!linkForm.url.trim()}
                onClick={applyLink}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-md shadow-blue-500/20"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Generator Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[210] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                  <Table size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Generate Table</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTableModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rows (incl. Header)</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={tableForm.rows}
                  onChange={(e) => setTableForm({ ...tableForm, rows: Math.max(2, parseInt(e.target.value) || 2) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Columns</label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={tableForm.cols}
                  onChange={(e) => setTableForm({ ...tableForm, cols: Math.max(2, parseInt(e.target.value) || 2) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 text-center"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-xl border border-slate-300 text-[10px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => insertTable(tableForm.rows, tableForm.cols)}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[210] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editor Cheatsheet & Hotkeys</h3>
                  <p className="text-[11px] text-slate-500">Keyboard shortcuts and markdown triggers supported</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Inline Keyboard Shortcuts</p>
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/70 border border-indigo-100">
                    <span className="font-bold text-indigo-950">Heading 1 / 2 / 3 Cycle</span>
                    <div className="flex items-center gap-1 font-mono text-[9px]">
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-bold text-indigo-700 border border-indigo-200 shadow-2xs">Ctrl+Shift+H (H1)</kbd>
                      <span>→</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-bold text-indigo-700 border border-indigo-200 shadow-2xs">+H (H2)</kbd>
                      <span>→</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-bold text-indigo-700 border border-indigo-200 shadow-2xs">+H (H3)</kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-100">
                    <div>
                      <span className="font-bold text-blue-950">Slash Command Menu (Type /)</span>
                      <p className="text-[10px] text-blue-600 font-normal">Shows 4 items max • Live keyword filter (H1, H2, H3, Text, Code, Table, Link, Image)</p>
                    </div>
                    <kbd className="px-2 py-0.5 bg-white rounded font-mono text-[10px] font-bold text-blue-700 border border-blue-200 shadow-2xs">Type /</kbd>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span>Bold</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + B</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Italic</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + I</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Underline</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + U</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Insert Link</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + K</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Undo</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + Z</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Redo</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Ctrl + Y</kbd>
                    </div>
                    <div className="flex items-center justify-between col-span-2">
                      <span>Indent / Tab space</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded font-mono text-[10px] text-slate-700 border border-slate-300 shadow-xs">Tab (4 spaces)</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fast Typing Auto-Conversions</p>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Type <code className="text-amber-700 font-mono">-&gt;</code></span>
                    <span>Converts into <strong className="text-slate-900">→</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Type <code className="text-amber-700 font-mono">=&gt;</code></span>
                    <span>Converts into <strong className="text-slate-900">⇒</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Type <code className="text-amber-700 font-mono">---</code> on a new line</span>
                    <span>Converts into <strong className="text-slate-900">Horizontal Divider Line</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Paste copied web images or screenshots</span>
                    <span className="text-slate-500">Directly embeds as inline image</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl text-[10px] cursor-pointer shadow-md shadow-blue-500/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Notion-Style Floating Slash Command Menu (Matches User Reference Image) */}
      {isSlashMenuOpen && (
        <div
          ref={slashMenuRef}
          style={{
            position: 'fixed',
            top: `${slashMenuPos.top}px`,
            left: `${slashMenuPos.left}px`,
          }}
          className="slash-command-menu z-[250] w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.preventDefault()} // prevent editor losing focus on click
        >
          {/* Header (Image 2: "Filtered results") */}
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Filtered results</span>
            {slashQuery && (
              <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                /{slashQuery}
              </span>
            )}
          </div>

          {/* List: strictly maximum 4 visible items, remaining hidden until searched */}
          <div className="space-y-0.5">
            {displayCommands.length === 0 ? (
              <div className="py-4 px-3 text-center">
                <p className="text-xs font-semibold text-slate-500">No matching command found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try /h1, /h2, /code, /table, /link, /image</p>
              </div>
            ) : (
              displayCommands.map((cmd, idx) => {
                const IconComponent = cmd.icon;
                const isSelected = idx === slashSelectedIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executeSlashCommand(cmd)}
                    onMouseEnter={() => setSlashSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-slate-600 shrink-0">
                        <IconComponent size={15} />
                      </div>
                      <span className="text-xs truncate">{cmd.label}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      /{cmd.title.toLowerCase()}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer (Matches Image 2: "Close menu") */}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={() => setIsSlashMenuOpen(false)}
              className="w-full px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Close menu</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-mono rounded text-slate-400 border border-slate-200">
                Esc
              </kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
