/**
 * Smart Reading Time & Content Analytics
 * Specifically calibrated for bilingual (Hinglish/Hindi/English) technical education.
 */

export interface ReadingStats {
  words: number;
  chars: number;
  readingTime: number; // in minutes (minimum 1)
  breakdown: {
    textMinutes: number;
    codeMinutes: number;
    mediaMinutes: number;
    codeBlocksCount: number;
    codeLinesCount: number;
    imagesCount: number;
    tablesCount: number;
    questionsCount: number;
  };
  summaryTooltip: string;
}

export function calculateReadingStats(
  rawContent: string | null | undefined,
  options?: {
    lessonType?: string;
    questionCount?: number;
  }
): ReadingStats {
  if (!rawContent || typeof rawContent !== 'string') {
    const qCount = options?.questionCount || 0;
    const qMinutes = qCount > 0 ? Math.max(1, Math.round(qCount * 1.0)) : 1;
    return {
      words: 0,
      chars: 0,
      readingTime: qCount > 0 ? qMinutes : 1,
      breakdown: {
        textMinutes: 0,
        codeMinutes: 0,
        mediaMinutes: 0,
        codeBlocksCount: 0,
        codeLinesCount: 0,
        imagesCount: 0,
        tablesCount: 0,
        questionsCount: qCount
      },
      summaryTooltip: qCount > 0 ? `Quiz: ${qCount} questions (~${qMinutes}m)` : 'Empty content (~1m)'
    };
  }

  let content = rawContent;

  // 1. Strip hidden metadata and HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Count & calculate Code Blocks (<pre> ... </pre>)
  let codeBlocksCount = 0;
  let codeLinesCount = 0;
  let codeSeconds = 0;

  const preMatches = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi) || [];
  for (const pre of preMatches) {
    codeBlocksCount++;
    // Extract code text without HTML tags
    const cleanCode = pre.replace(/<[^>]+>/g, '').trim();
    const lines = cleanCode.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0).length;
    codeLinesCount += lines;

    // Baseline: 25s for scanning structure + 2.5s per line of code (capped at 120s per snippet)
    const blockSeconds = Math.min(150, Math.max(30, 25 + lines * 2.5));
    codeSeconds += blockSeconds;
  }

  // Remove code blocks from prose content so code tokens don't inflate text word count
  let proseContent = content.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, ' ');

  // Also remove script and style tags if present
  proseContent = proseContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  proseContent = proseContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');

  // 3. Count Media (Images & Diagrams)
  const imgMatches = content.match(/<img[^>]*>/gi) || [];
  const imagesCount = imgMatches.length;
  const imageSeconds = imagesCount * 25; // 25s per diagram / screenshot

  // 4. Count Tables (<table ... </table>)
  const tableMatches = content.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  const tablesCount = tableMatches.length;
  const tableSeconds = tablesCount * 35; // 35s per data table

  // 5. MCQ Questions (if quiz / mcq)
  let questionsCount = options?.questionCount || 0;
  if (!questionsCount) {
    // Try detecting questions from MCQ markers or questions JSON if present
    const mcqMatches = rawContent.match(/"question":\s*"[^"]+"/gi) || [];
    if (mcqMatches.length > 0) {
      questionsCount = mcqMatches.length;
    }
  }
  const mcqSeconds = questionsCount * 60; // ~1 minute per question

  // 6. Calculate Prose Text Words
  // Remove remaining HTML tags
  let text = proseContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = text ? (text.match(/\S+/g) || []).length : 0;
  const chars = text.length;

  // Technical prose reading speed: 140 words per minute (~2.33 words per second)
  const textSeconds = words > 0 ? (words / 140) * 60 : 0;

  // 7. Aggregate Total Time
  const mediaSeconds = imageSeconds + tableSeconds;
  const totalSeconds = textSeconds + codeSeconds + mediaSeconds + mcqSeconds;

  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const textMinutes = Math.round(textSeconds / 60);
  const codeMinutes = Math.round(codeSeconds / 60);
  const mediaMinutes = Math.round(mediaSeconds / 60);
  const mcqMinutes = Math.round(mcqSeconds / 60);

  // 8. Build detailed summary tooltip
  const parts: string[] = [];
  if (words > 0) {
    parts.push(`Text: ~${Math.max(1, textMinutes)}m (${words}w)`);
  }
  if (codeBlocksCount > 0) {
    parts.push(`Code: ~${Math.max(1, codeMinutes)}m (${codeBlocksCount} blocks, ${codeLinesCount} lines)`);
  }
  if (imagesCount > 0 || tablesCount > 0) {
    parts.push(`Media/Tables: ~${Math.max(1, mediaMinutes)}m (${imagesCount} imgs, ${tablesCount} tbls)`);
  }
  if (questionsCount > 0) {
    parts.push(`Quiz: ~${mcqMinutes}m (${questionsCount} questions)`);
  }

  const summaryTooltip = parts.length > 0 ? parts.join(' • ') : `~${totalMinutes}m read`;

  return {
    words,
    chars,
    readingTime: totalMinutes,
    breakdown: {
      textMinutes,
      codeMinutes,
      mediaMinutes,
      codeBlocksCount,
      codeLinesCount,
      imagesCount,
      tablesCount,
      questionsCount
    },
    summaryTooltip
  };
}
