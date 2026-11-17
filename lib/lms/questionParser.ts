export interface ParsedQuestionItem {
  id: string; // temporary client-side ID
  question_text: string;
  options: string[];
  correct_option_index: number;
  isValid: boolean;
  error?: string;
}

/**
 * Sanitizes markdown, backslashes, and chat copy artifacts from a line.
 */
function sanitizeLine(line: string): string {
  let cleaned = line.trim();
  // Strip trailing backslashes (markdown hard linebreaks like \ or \\)
  cleaned = cleaned.replace(/\\+$/, '').trim();
  // Strip escaped characters like 1\. or Q\: or \- or \[ or \]
  cleaned = cleaned.replace(/\\([.:\-\)\(\]\[])/g, '$1');
  // Strip backslash after number e.g. "2\ " -> "2. "
  cleaned = cleaned.replace(/^(\d+)\\\s+/, '$1. ');
  // Strip markdown bold markers at outer edges if any: **Title** -> Title
  cleaned = cleaned.replace(/^\*\*([^*]+)\*\*$/, '$1').trim();
  return cleaned;
}

/**
 * Checks if a line marks the start of a question.
 */
function isQuestionStart(line: string): boolean {
  const cleaned = sanitizeLine(line).replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
  // Match "1.", "1)", "1-", "Q1:", "Question 1:", "(1)", "Q.", "1 "
  return /^(?:Q(?:uestion)?\s*\d*[:.-]|\d+[.)\-]|\(\d+\))\s+\S+/i.test(cleaned);
}

/**
 * Checks if a line marks an answer / correct option.
 */
function parseAnswerLine(line: string): string | null {
  const cleaned = sanitizeLine(line)
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // "Answer: B", "Ans - B", "Correct: B", "Correct Answer: B", "Option B", "Uttar: B"
  const match = cleaned.match(
    /^(?:Answer|Ans|Correct(?:\s*Answer|\s*Option)?|Option|Uttar|Sahi\s*Uttar)\s*[:=\-–.]\s*(.+)$/i
  );
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Checks if a line marks an option (e.g. A. ..., B) ..., (C) ..., Option A: ...)
 */
function parseOptionLine(line: string): { label: string; text: string } | null {
  const cleaned = sanitizeLine(line)
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();

  // Matches:
  // "A. Option", "A) Option", "(A) Option", "[A] Option", "A - Option", "A: Option"
  // "Option A: Text", "Opt A - Text"
  const match = cleaned.match(
    /^(?:(?:Option|Opt)\s*([A-Fa-f0-9])[:.\-]\s*|(?:\(([A-Fa-f0-9])\)|\[([A-Fa-f0-9])\]|([A-Fa-f0-9])[.)\]\-:])\s*)(.+)$/
  );
  if (match) {
    const label = (match[1] || match[2] || match[3] || match[4]).toUpperCase();
    const text = match[5].trim();
    return { label, text };
  }
  return null;
}

/**
 * Splits CSV line respecting double quotes.
 */
function splitCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Maps answer string (e.g. "A", "B", "1", "2", "B) Option text", or option text) to 0-based index.
 */
function resolveCorrectIndex(answerRaw: string, options: string[]): number {
  if (!answerRaw) return 0;
  const cleaned = answerRaw.trim().replace(/^[\(\[\{]/, '').replace(/[\)\]\}]$/, '').trim();
  const upper = cleaned.toUpperCase();

  // If answer starts with a letter like "B) Random Access Memory" or "B. Random Access Memory"
  const letterPrefixMatch = upper.match(/^([A-F])[.)\]\s\-:]/);
  if (letterPrefixMatch) {
    return letterPrefixMatch[1].charCodeAt(0) - 65;
  }

  // Exact letter match: A->0, B->1, C->2, D->3, E->4, F->5
  if (/^[A-F]$/.test(upper)) {
    return upper.charCodeAt(0) - 65;
  }

  // Number match: 1->0, 2->1, 3->2, 4->3
  const num = parseInt(cleaned, 10);
  if (!isNaN(num)) {
    if (num >= 1 && num <= options.length) return num - 1;
    if (num >= 0 && num < options.length) return num;
  }

  // Exact text match
  const lowerAns = cleaned.toLowerCase();
  const textMatchIdx = options.findIndex(
    (opt) => opt.toLowerCase().trim() === lowerAns
  );
  if (textMatchIdx !== -1) return textMatchIdx;

  // Fuzzy match (contains or starts with)
  const fuzzyIdx = options.findIndex((opt) => {
    const lowerOpt = opt.toLowerCase().trim();
    return lowerOpt.includes(lowerAns) || lowerAns.includes(lowerOpt);
  });
  if (fuzzyIdx !== -1) return fuzzyIdx;

  return 0; // fallback to first option
}

/**
 * Parses CSV or TSV text into questions.
 */
export function parseCsvQuestions(rawText: string): ParsedQuestionItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Determine delimiter: tab or comma
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  // Check if header row exists
  const headerParts = splitCsvLine(firstLine, delimiter).map((p) => p.toLowerCase());
  const isHeader = headerParts.some((h) =>
    h.includes('question') || h.includes('option') || h.includes('correct') || h.includes('answer')
  );

  const dataLines = isHeader ? lines.slice(1) : lines;
  const results: ParsedQuestionItem[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const cols = splitCsvLine(dataLines[i], delimiter);
    if (cols.length < 3) continue; // Not enough columns

    const question_text = cols[0]?.trim();
    let options: string[] = [];
    let answerCol = '';

    if (cols.length >= 6) {
      options = [cols[1], cols[2], cols[3], cols[4]].map((o) => o?.trim() || '');
      answerCol = cols[5]?.trim() || '';
    } else if (cols.length === 5) {
      options = [cols[1], cols[2], cols[3]].map((o) => o?.trim() || '');
      answerCol = cols[4]?.trim() || '';
    } else {
      options = [cols[1], cols[2]].map((o) => o?.trim() || '');
      answerCol = cols[3]?.trim() || '';
    }

    const filteredOptions = options.filter((o) => o.length > 0);
    const correctIdx = resolveCorrectIndex(answerCol, options);

    let error: string | undefined;
    if (!question_text) {
      error = 'Question text is empty';
    } else if (filteredOptions.length < 2) {
      error = 'At least 2 options are required';
    }

    results.push({
      id: `csv-${i}-${Date.now()}`,
      question_text: question_text || '',
      options: options.map((opt, idx) => opt || `Option ${String.fromCharCode(65 + idx)}`),
      correct_option_index: correctIdx < options.length ? correctIdx : 0,
      isValid: !error,
      error,
    });
  }

  return results;
}

/**
 * Parses freeform / AI-generated questions text from ChatGPT, Gemini, etc.
 * Handles markdown bold/italic tags, backslashes, introductory titles, and multiple formats.
 */
export function parsePlainTextQuestions(rawText: string): ParsedQuestionItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Try JSON array first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson)) {
        return parsedJson.map((item, idx) => {
          const qText = item.question_text || item.question || item.title || '';
          const opts: string[] = Array.isArray(item.options) ? item.options.map(String) : [];
          let correctIdx = 0;
          if (typeof item.correct_option_index === 'number') {
            correctIdx = item.correct_option_index;
          } else if (item.correct !== undefined || item.answer !== undefined) {
            correctIdx = resolveCorrectIndex(String(item.correct ?? item.answer), opts);
          }

          let error: string | undefined;
          if (!qText) error = 'Question text missing';
          else if (opts.length < 2) error = 'At least 2 options required';

          return {
            id: `json-${idx}-${Date.now()}`,
            question_text: qText,
            options: opts.length > 0 ? opts : ['', '', '', ''],
            correct_option_index: correctIdx,
            isValid: !error,
            error,
          };
        });
      }
    } catch {
      // not JSON, continue
    }
  }

  // 2. Check if it's pure tab-separated (from Excel / Google Sheets copy)
  const rawLines = rawText.split(/\r?\n/);
  const isPureTab = rawLines.some(l => l.includes('\t')) && !rawLines.some(isQuestionStart);
  if (isPureTab) {
    const csvParsed = parseCsvQuestions(rawText);
    if (csvParsed.length > 0) return csvParsed;
  }

  // 3. AI / Markdown text parsing
  const sanitizedLines = rawLines.map(sanitizeLine);

  // Ignore any introductory banner/title before the first question
  let firstQIdx = sanitizedLines.findIndex(isQuestionStart);
  if (firstQIdx === -1) firstQIdx = 0;

  const relevantLines = sanitizedLines.slice(firstQIdx);
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of relevantLines) {
    if (!line) continue;
    if (isQuestionStart(line) && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const results: ParsedQuestionItem[] = [];

  blocks.forEach((block, bIdx) => {
    let questionText = '';
    const options: { label: string; text: string }[] = [];
    let answerText = '';

    for (const rawLine of block) {
      const line = sanitizeLine(rawLine);
      if (!line) continue;

      // Check for Answer line
      const ans = parseAnswerLine(line);
      if (ans) {
        answerText = ans;
        continue;
      }

      // Check for Option line
      const opt = parseOptionLine(line);
      if (opt && (options.length > 0 || questionText.length > 0)) {
        options.push(opt);
        continue;
      }

      // If no options started yet, it's part of the question text
      if (options.length === 0) {
        if (!questionText) {
          questionText = line
            .replace(/^\*\*/, '')
            .replace(/\*\*$/, '')
            .replace(/^(?:Q(?:uestion)?\s*\d*[:.-]|\d+[.)\-]|\(\d+\))\s*/i, '')
            .trim();
        } else {
          questionText += ' ' + line;
        }
      } else {
        // Multi-line option text
        if (options.length > 0) {
          options[options.length - 1].text += ' ' + line;
        }
      }
    }

    const optionTexts = options.map((o) => o.text);
    const correctIdx = resolveCorrectIndex(answerText, optionTexts);

    let error: string | undefined;
    if (!questionText) {
      error = 'Question text missing';
    } else if (optionTexts.length < 2) {
      error = 'Could not detect at least 2 options (A, B, C, D)';
    }

    results.push({
      id: `text-${bIdx}-${Date.now()}`,
      question_text: questionText,
      options: optionTexts.length > 0 ? optionTexts : ['', '', '', ''],
      correct_option_index: correctIdx < optionTexts.length ? correctIdx : 0,
      isValid: !error,
      error,
    });
  });

  return results;
}

/**
 * Generates sample CSV string for downloading template.
 */
export function generateSampleQuestionsCsv(): string {
  const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'];
  const rows = [
    [
      'What is the full form of CPU?',
      'Central Processing Unit',
      'Computer Personal Unit',
      'Control Processing Unit',
      'Core Processing Unit',
      'A',
    ],
    [
      'Which of the following is volatile memory?',
      'ROM',
      'RAM',
      'Hard Disk',
      'Optical Disc',
      'B',
    ],
    [
      'What is the keyboard shortcut to copy selected text in Windows?',
      'Ctrl + V',
      'Ctrl + C',
      'Ctrl + X',
      'Ctrl + Z',
      'B',
    ],
    [
      'In MS Word, which key is used for Spell Check?',
      'F5',
      'F7',
      'F12',
      'F2',
      'B',
    ],
    [
      '1 Byte is equal to how many bits?',
      '4 bits',
      '8 bits',
      '16 bits',
      '32 bits',
      'B',
    ],
  ];

  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ];

  return csvLines.join('\r\n');
}
