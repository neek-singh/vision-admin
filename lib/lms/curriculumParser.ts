export interface ParsedClassItem {
  id: string;
  title: string;
  type: 'video' | 'notes' | 'assignment' | 'project' | 'mcq';
  selected: boolean;
}

export interface ParsedChapterItem {
  id: string;
  title: string;
  selected: boolean;
  classes: ParsedClassItem[];
}

export interface ParseOptions {
  defaultType?: 'video' | 'notes' | 'assignment' | 'project' | 'mcq';
  keepNumbering?: boolean;
  autoDetectType?: boolean;
}

/**
 * Smart type detector based on keywords in title
 */
export function detectLessonType(
  title: string,
  defaultType: 'video' | 'notes' | 'assignment' | 'project' | 'mcq' = 'video'
): 'video' | 'notes' | 'assignment' | 'project' | 'mcq' {
  const lower = title.toLowerCase();
  if (lower.includes('project') || lower.includes('mini-project') || lower.includes('mini project')) {
    return 'project';
  }
  if (lower.includes('quiz') || lower.includes('test') || lower.includes('mcq') || lower.includes('exam')) {
    return 'mcq';
  }
  if (lower.includes('assignment') || lower.includes('homework') || lower.includes('task') || lower.includes('exercise')) {
    return 'assignment';
  }
  if (lower.includes('theory') || lower.includes('notes') || lower.includes('reading') || lower.includes('handout') || lower.includes('docs')) {
    return 'notes';
  }
  return defaultType;
}

/**
 * Cleans tree characters (├──, └──, |, │), bullets, and formatting from a title
 */
export function cleanTitleText(line: string, keepNumbering = true): string {
  let cleaned = line;

  // 1. Strip ASCII / Tree prefixes (e.g., "|   ├── ", "└── ", "+--- ", "`-- ")
  cleaned = cleaned.replace(/^[|\s│]*[├└+`\-]+[─\-]*\s*/, '');
  cleaned = cleaned.replace(/^[|\s│]+/, '');

  // 2. Strip bullet points (- , * , • )
  cleaned = cleaned.replace(/^[-*•]\s+/, '');

  // 3. Strip "Class X: ", "Lesson X: ", "Lecture X: "
  cleaned = cleaned.replace(/^(?:Class|Lesson|Topic|Lecture|Session)\s*\d+[:.\-\s]+/i, '');

  // 4. Optionally strip leading numbers (e.g. "01. ", "01 ", "1) ", "1 - ")
  if (!keepNumbering) {
    cleaned = cleaned.replace(/^\d+[\s.\-_)]+\s*/, '');
  }

  // 5. Clean trailing colons or excess whitespace
  cleaned = cleaned.replace(/\s+$/, '').trim();

  return cleaned;
}

/**
 * Parses flat class list for a single Chapter
 */
export function parseBulkClasses(rawText: string, options: ParseOptions = {}): ParsedClassItem[] {
  const {
    defaultType = 'video',
    keepNumbering = true,
    autoDetectType = true
  } = options;

  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const result: ParsedClassItem[] = [];

  for (const line of lines) {
    const rawTrimmed = line.trim();
    if (!rawTrimmed) continue;

    // Skip lone separators like "|", "│"
    if (/^[|\s│─\-]+$/.test(rawTrimmed)) continue;

    const title = cleanTitleText(rawTrimmed, keepNumbering);
    if (!title || title.length < 2) continue;

    const type = autoDetectType ? detectLessonType(title, defaultType) : defaultType;

    result.push({
      id: Math.random().toString(36).substring(2, 9),
      title,
      type,
      selected: true
    });
  }

  return result;
}

/**
 * Parses a hierarchical tree containing Chapters and their child Classes
 * Supports:
 * - ChatGPT tree format:
 *     ├── 02 CSS
 *     |   ├── 01 Introduction to CSS
 * - Markdown format:
 *     ## 01 CSS
 *     - Introduction to CSS
 * - Section format:
 *     Chapter 1: CSS
 *     1. Introduction
 */
export function parseFullCurriculumTree(rawText: string, options: ParseOptions = {}): ParsedChapterItem[] {
  const {
    defaultType = 'video',
    keepNumbering = true,
    autoDetectType = true
  } = options;

  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const chapters: ParsedChapterItem[] = [];
  let currentChapter: ParsedChapterItem | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^[|\s│─\-]+$/.test(trimmed)) continue; // spacer lines like "|"

    // Check if line is a chapter header:
    // Criteria 1: Explicit keyword (Chapter 1, Module 1, Unit 1, Section 1, Part 1)
    const isExplicitChapter = /^(?:Chapter|Module|Unit|Section|Part)\s*\d+/i.test(trimmed);

    // Criteria 2: Markdown header (## Chapter Name or # Chapter Name)
    const isMarkdownHeader = /^#{1,3}\s+/.test(trimmed);

    // Criteria 3: Tree root without pipes/indentations at start (e.g. "├── 02 CSS" or "02 CSS")
    // whereas child classes have a pipe or indentation beforehand (e.g. "|   ├── 01 ...")
    const isTreeRoot = /^[├└+`\-]+[─\-]*\s+/.test(trimmed) && !rawLine.startsWith('|') && !rawLine.startsWith('│') && !/^\s{2,}/.test(rawLine);

    // Criteria 4: Starts with number and ends with colon, e.g. "02 CSS:"
    const endsWithColon = trimmed.endsWith(':') && !trimmed.startsWith('|') && !trimmed.startsWith('│');

    const isChapter = isExplicitChapter || isMarkdownHeader || isTreeRoot || endsWithColon;

    if (isChapter) {
      let chapterTitle = cleanTitleText(trimmed, keepNumbering);
      // Remove trailing colon if any
      chapterTitle = chapterTitle.replace(/:$/, '').trim();

      currentChapter = {
        id: Math.random().toString(36).substring(2, 9),
        title: chapterTitle || `Chapter ${chapters.length + 1}`,
        selected: true,
        classes: []
      };
      chapters.push(currentChapter);
    } else {
      // It's a class
      const classTitle = cleanTitleText(trimmed, keepNumbering);
      if (!classTitle || classTitle.length < 2) continue;

      const type = autoDetectType ? detectLessonType(classTitle, defaultType) : defaultType;

      const classItem: ParsedClassItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: classTitle,
        type,
        selected: true
      };

      if (!currentChapter) {
        // Fallback: create default first chapter if classes appear before a chapter header
        currentChapter = {
          id: Math.random().toString(36).substring(2, 9),
          title: "General Topics",
          selected: true,
          classes: []
        };
        chapters.push(currentChapter);
      }

      currentChapter.classes.push(classItem);
    }
  }

  // Filter out chapters that have no classes and empty titles
  return chapters.filter(c => c.classes.length > 0 || c.title.trim().length > 0);
}
