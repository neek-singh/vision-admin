// Utility for colorful syntax highlighting, high-visibility contrast, and copy button on code blocks

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /<\/?(html|head|body|div|span|p|a|h[1-6]|table|tr|td|th|form|input|button|script|style|meta|link)/i.test(trimmed)) {
    return 'html';
  }
  if (/(@media|@keyframes|font-size:|background-color:|\.[a-zA-Z0-9_-]+\s*\{|#[a-zA-Z0-9_-]+\s*\{|::?[a-zA-Z0-9_-]+|\[href|text-align:)/.test(trimmed)) {
    return 'css';
  }
  if (/(def\s+[a-zA-Z_]|import\s+[a-zA-Z_]|from\s+[a-zA-Z_]|print\(|elif\s+|if\s+__name__)/.test(trimmed)) {
    return 'python';
  }
  if (/(\bconst\s+|\blet\s+|\bvar\s+|\bfunction\s*\(|\bconsole\.log\(|=>|import\s+.*from)/.test(trimmed)) {
    return 'javascript';
  }
  if (/(SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|CREATE\s+TABLE|DELETE\s+FROM)/i.test(trimmed)) {
    return 'sql';
  }
  return 'code';
}

function highlightCss(code: string): { html: string; lang: string } {
  // Tokenize comments, strings, selectors, property declarations, and punctuation
  const tokenRegex = /(\/\*[\s\S]*?\*\/)|("(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|((?:^|[\n;}])\s*[^;{}]+(?=\{))|([a-zA-Z\-]+)(?=\s*:)|(:\s*)([^;}\n]+)(;)?|([{};])/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [, comment, str, selectorBlock, prop, colon, val, semi, brace] = match;

    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span style="color:#a5d6ff !important;">${escapeHtml(str)}</span>`;
    } else if (selectorBlock) {
      // Fine-grained selector sub-tokens: tags, classes, IDs, pseudo-classes, pseudo-elements, attributes
      const selRegex = /(\/\*[\s\S]*?\*\/)|(\.[a-zA-Z0-9_\-]+)|(#[a-zA-Z0-9_\-]+)|(::?[a-zA-Z0-9_\-]+(?:\([^)]*\))?)|(\[[^\]]+\])|(\b(?:a|div|span|p|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|body|html|img|header|footer|nav|section|article|main)\b)|([,>+~])/g;
      
      let selHtml = '';
      let sLastIndex = 0;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = selRegex.exec(selectorBlock)) !== null) {
        selHtml += escapeHtml(selectorBlock.slice(sLastIndex, sMatch.index));
        sLastIndex = selRegex.lastIndex;

        const [, sComm, sClass, sId, sPseudo, sAttr, sTag, sComb] = sMatch;
        if (sComm) {
          selHtml += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(sComm)}</span>`;
        } else if (sClass) {
          selHtml += `<span style="color:#d2a8ff !important;font-weight:600;">${escapeHtml(sClass)}</span>`;
        } else if (sId) {
          selHtml += `<span style="color:#f472b6 !important;font-weight:600;">${escapeHtml(sId)}</span>`;
        } else if (sPseudo) {
          selHtml += `<span style="color:#c084fc !important;">${escapeHtml(sPseudo)}</span>`;
        } else if (sAttr) {
          selHtml += `<span style="color:#fb923c !important;">${escapeHtml(sAttr)}</span>`;
        } else if (sTag) {
          selHtml += `<span style="color:#79c0ff !important;font-weight:600;">${escapeHtml(sTag)}</span>`;
        } else if (sComb) {
          selHtml += `<span style="color:#e6edf3 !important;">${escapeHtml(sComb)}</span>`;
        }
      }
      selHtml += escapeHtml(selectorBlock.slice(sLastIndex));
      result += selHtml;
    } else if (prop) {
      result += `<span style="color:#79c0ff !important;">${escapeHtml(prop)}</span>`;
    } else if (colon) {
      result += `<span style="color:#8b949e !important;">${escapeHtml(colon)}</span>`;
      if (val) {
        const valRegex = /("(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|pt|s|ms|deg|fr)?\b)|(#[0-9a-fA-F]{3,8}\b)|(\b(?:none|crimson|red|blue|green|white|black|transparent|inherit|initial|unset|solid|dashed|dotted|block|flex|grid|inline|relative|absolute|fixed|sticky|center|left|right|justify|bold|normal|italic|underline|hidden|visible|auto|pointer|cursor|uppercase|lowercase|capitalize|sans-serif|serif|monospace)\b)/g;
        let vHtml = '';
        let vLastIndex = 0;
        let vMatch: RegExpExecArray | null;
        while ((vMatch = valRegex.exec(val)) !== null) {
          vHtml += escapeHtml(val.slice(vLastIndex, vMatch.index));
          vLastIndex = valRegex.lastIndex;
          const [, vStr, vNum, vHex, vKw] = vMatch;
          if (vStr) {
            vHtml += `<span style="color:#a5d6ff !important;">${escapeHtml(vStr)}</span>`;
          } else if (vNum) {
            vHtml += `<span style="color:#fb923c !important;">${escapeHtml(vNum)}</span>`;
          } else if (vHex) {
            vHtml += `<span style="color:#7ee787 !important;font-weight:600;">${escapeHtml(vHex)}</span>`;
          } else if (vKw) {
            vHtml += `<span style="color:#7ee787 !important;">${escapeHtml(vKw)}</span>`;
          }
        }
        vHtml += escapeHtml(val.slice(vLastIndex));
        result += vHtml;
      }
      if (semi) {
        result += `<span style="color:#8b949e !important;">${escapeHtml(semi)}</span>`;
      }
    } else if (brace) {
      result += `<span style="color:#e6edf3 !important;font-weight:600;">${escapeHtml(brace)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'CSS' };
}

function highlightJs(code: string): { html: string; lang: string } {
  const tokenRegex = /(\/\*[\s\S]*?\*\/|\/\/.*$)|(`(?:\\`|[\s\S])*?`|"(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|import|export|from|default|class|extends|try|catch|finally|throw|async|await|yield)\b)|(\b(?:console|window|document|Math|JSON|Array|Object|String|Number|Boolean|Promise|setTimeout|setInterval)\b)|(\b(?:true|false|null|undefined|NaN)\b)|(\b\d+(?:\.\d+)?\b)/gm;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, str, keyword, builtin, literal, num] = match;
    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#a5d6ff !important;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#ff7b72 !important;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (builtin) {
      result += `<span style="color:#79c0ff !important;">${escapeHtml(token)}</span>`;
    } else if (literal) {
      result += `<span style="color:#79c0ff !important;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c !important;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'JAVASCRIPT' };
}

function highlightHtml(code: string): { html: string; lang: string } {
  // Tokenize comments, DOCTYPE, embedded <style>...</style>, embedded <script>...</script>, and HTML tags
  const tokenRegex = /(<!--[\s\S]*?-->)|(<!DOCTYPE[\s\S]*?>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<\/?[a-zA-Z0-9\-]+)([\s\S]*?)(\/?>)/gi;
  
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [, comment, doctype, styleOpen, styleBody, styleClose, scriptOpen, scriptBody, scriptClose, tagStart, tagAttrs, tagEnd] = match;

    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(comment)}</span>`;
    } else if (doctype) {
      result += `<span style="color:#ff7b72 !important;font-weight:600;">${escapeHtml(doctype)}</span>`;
    } else if (styleOpen) {
      result += `<span style="color:#79c0ff !important;">&lt;</span><span style="color:#7ee787 !important;font-weight:600;">style</span><span style="color:#79c0ff !important;">&gt;</span>`;
      result += highlightCss(styleBody).html;
      result += `<span style="color:#79c0ff !important;">&lt;/</span><span style="color:#7ee787 !important;font-weight:600;">style</span><span style="color:#79c0ff !important;">&gt;</span>`;
    } else if (scriptOpen) {
      result += `<span style="color:#79c0ff !important;">&lt;</span><span style="color:#7ee787 !important;font-weight:600;">script</span><span style="color:#79c0ff !important;">&gt;</span>`;
      result += highlightJs(scriptBody).html;
      result += `<span style="color:#79c0ff !important;">&lt;/</span><span style="color:#7ee787 !important;font-weight:600;">script</span><span style="color:#79c0ff !important;">&gt;</span>`;
    } else if (tagStart) {
      const isClose = tagStart.startsWith('</');
      const tagName = isClose ? tagStart.slice(2) : tagStart.slice(1);
      const openBracket = isClose ? '&lt;/' : '&lt;';

      let renderedAttrs = '';
      if (tagAttrs) {
        const attrRegex = /([a-zA-Z0-9\-:]+)(?:(=)("[^"]*"|'[^']*'|[^\s>]+))?/g;
        let attrMatch: RegExpExecArray | null;
        let lastAttrIndex = 0;

        while ((attrMatch = attrRegex.exec(tagAttrs)) !== null) {
          renderedAttrs += escapeHtml(tagAttrs.slice(lastAttrIndex, attrMatch.index));
          lastAttrIndex = attrRegex.lastIndex;

          const attrName = attrMatch[1];
          const eq = attrMatch[2];
          const attrVal = attrMatch[3];

          renderedAttrs += `<span style="color:#d2a8ff !important;">${escapeHtml(attrName)}</span>`;
          if (eq && attrVal !== undefined) {
            renderedAttrs += `<span style="color:#e6edf3 !important;">=</span>`;
            renderedAttrs += `<span style="color:#a5d6ff !important;">${escapeHtml(attrVal)}</span>`;
          }
        }
        renderedAttrs += escapeHtml(tagAttrs.slice(lastAttrIndex));
      }

      const closeBracket = tagEnd === '/>' ? '/&gt;' : '&gt;';
      result += `<span style="color:#79c0ff !important;">${openBracket}</span><span style="color:#7ee787 !important;font-weight:600;">${escapeHtml(tagName)}</span>${renderedAttrs}<span style="color:#79c0ff !important;">${closeBracket}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'HTML' };
}

function highlightPython(code: string): { html: string; lang: string } {
  const tokenRegex = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b(?:def|class|if|elif|else|while|for|in|return|import|from|as|try|except|finally|raise|with|lambda|yield)\b)|(\b(?:True|False|None)\b)|(\b(?:print|len|range|str|int|float|list|dict|set|tuple|type|input|open)\b)|(\b\d+(?:\.\d+)?\b)/gm;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, str, keyword, literal, builtin, num] = match;
    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#a5d6ff !important;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#ff7b72 !important;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (literal) {
      result += `<span style="color:#79c0ff !important;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (builtin) {
      result += `<span style="color:#79c0ff !important;">${escapeHtml(token)}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c !important;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'PYTHON' };
}

function highlightSql(code: string): { html: string; lang: string } {
  const tokenRegex = /(\/\*[\s\S]*?\*\/|--.*$)|('(?:''|[^'\n])*'|"(?:""|[^"\n])*")|(\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|DEFAULT|CHECK|UNIQUE|CASCADE|CONSTRAINT)\b)|(\b\d+(?:\.\d+)?\b)/gim;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, str, keyword, num] = match;
    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#a5d6ff !important;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#ff7b72 !important;font-weight:600;">${escapeHtml(token.toUpperCase())}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c !important;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'SQL' };
}

function highlightGeneric(code: string): { html: string; lang: string } {
  const tokenRegex = /(\/\*[\s\S]*?\*\/|\/\/.*$|#.*$)|("(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b\d+(?:\.\d+)?\b)/gm;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, str, num] = match;
    if (comment) {
      result += `<span style="color:#8b949e !important;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#a5d6ff !important;">${escapeHtml(token)}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c !important;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'CODE' };
}

export function highlightSyntax(rawCode: string, forcedLang?: string): { html: string; lang: string } {
  const lang = forcedLang || detectLanguage(rawCode);
  const cleanCode = rawCode.replace(/\r\n/g, '\n');

  if (lang === 'html') {
    return highlightHtml(cleanCode);
  }
  if (lang === 'css') {
    return highlightCss(cleanCode);
  }
  if (lang === 'python') {
    return highlightPython(cleanCode);
  }
  if (lang === 'javascript') {
    return highlightJs(cleanCode);
  }
  if (lang === 'sql') {
    return highlightSql(cleanCode);
  }

  return highlightGeneric(cleanCode);
}

function bindCopyBtn(btn: HTMLButtonElement, codeText: string) {
  const copySvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
  const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(codeText);
    if (ok) {
      btn.innerHTML = `${checkSvg}<span style="color:#34d399 !important;">Copied!</span>`;
      btn.style.borderColor = 'rgba(52, 211, 153, 0.5)';
      setTimeout(() => {
        btn.innerHTML = `${copySvg}<span>Copy</span>`;
        btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      }, 2000);
    }
  };
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Global copy & scroll handlers accessible from inline onclick attributes
if (typeof window !== 'undefined') {
  (window as any).__scrollCodeBlock = function (btn: HTMLElement, direction: number) {
    if (!btn) return;
    const card = btn.closest('.code-block-card') || btn.closest('pre') || btn.parentElement?.parentElement;
    if (!card) return;
    const container = card.querySelector('.code-body-container') as HTMLElement;
    if (!container) return;
    container.scrollBy({ left: direction * 150, behavior: 'smooth' });
  };

  (window as any).__copyCodeBlock = async function (btn: HTMLElement) {
    if (!btn) return;
    const card = btn.closest('.code-block-card') || btn.closest('pre');
    if (!card) return;
    const codeEl = card.querySelector('code');
    const raw = (card as HTMLElement).dataset.rawCode || (codeEl ? codeEl.textContent : '') || '';
    if (!raw) return;

    const copySvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const ok = await copyToClipboard(raw);
    if (ok) {
      btn.innerHTML = `${checkSvg}<span style="color:#34d399 !important;">Copied!</span>`;
      btn.style.borderColor = 'rgba(52, 211, 153, 0.5)';
      setTimeout(() => {
        btn.innerHTML = `${copySvg}<span>Copy</span>`;
        btn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
      }, 2000);
    }
  };
}

/**
 * Pre-renders an HTML string, turning any <pre> blocks into fully styled,
 * high-contrast code blocks with macOS header, language badge, scroll navigation, and copy button.
 * Safe for use inside dangerouslySetInnerHTML.
 */
export function renderHighlightedHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return html.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi, (fullMatch, preAttrs, preInner) => {
    // If it's already a full v3 block generated by this function, return it
    if (preAttrs.includes('data-code-ready="v3"')) {
      return fullMatch;
    }

    // Extract raw code text
    let rawCode = '';
    const codeMatch = preInner.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
      rawCode = decodeHtml(codeMatch[1].replace(/<[^>]+>/g, ''));
    } else {
      rawCode = decodeHtml(preInner.replace(/<[^>]+>/g, ''));
    }

    if (!rawCode.trim()) {
      return fullMatch;
    }

    const { html: highlightedCodeHtml, lang } = highlightSyntax(rawCode);
    const escapedRawCode = escapeAttr(rawCode);
    const copySvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const leftArrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const rightArrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    return `<div data-code-enhanced="true" data-code-ready="v3" data-raw-code="${escapedRawCode}" class="code-block-card not-prose" style="position:relative;background-color:#0d1117 !important;color:#f0f6fc !important;border-radius:12px;border:1px solid #30363d;overflow:hidden;margin:18px 0;box-shadow:0 8px 24px rgba(0,0,0,0.35);padding:0 !important;display:block;width:100% !important;max-width:100% !important;box-sizing:border-box !important;">` +
      `<div class="code-toolbar-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background-color:#161b22;border-bottom:1px solid #30363d;user-select:none;width:100% !important;box-sizing:border-box !important;">` +
        `<div style="display:flex;align-items:center;gap:8px;">` +
          `<div style="display:flex;align-items:center;gap:6px;">` +
            `<span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;opacity:0.95;"></span>` +
            `<span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;opacity:0.95;"></span>` +
            `<span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;opacity:0.95;"></span>` +
          `</div>` +
          `<span style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:#8b949e;margin-left:4px;text-transform:uppercase;">${lang}</span>` +
        `</div>` +
        `<div style="display:flex;align-items:center;gap:6px;">` +
          `<div class="code-scroll-nav" style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,0.06);border-radius:6px;padding:2px 3px;border:1px solid rgba(255,255,255,0.1);">` +
            `<button type="button" aria-label="Scroll left" onclick="window.__scrollCodeBlock(this, -1)" style="background:none;border:none;color:#8b949e;cursor:pointer;padding:2px 5px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:color 0.15s ease;">` +
              `${leftArrowSvg}` +
            `</button>` +
            `<button type="button" aria-label="Scroll right" onclick="window.__scrollCodeBlock(this, 1)" style="background:none;border:none;color:#8b949e;cursor:pointer;padding:2px 5px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:color 0.15s ease;">` +
              `${rightArrowSvg}` +
            `</button>` +
          `</div>` +
          `<button type="button" class="code-copy-btn" onclick="window.__copyCodeBlock(this)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;color:#cbd5e1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);cursor:pointer;transition:all 0.15s ease;">` +
            `${copySvg}<span>Copy</span>` +
          `</button>` +
        `</div>` +
      `</div>` +
      `<pre class="code-body-container" data-code-ready="v3" style="margin:0 !important;padding:14px 18px !important;overflow-x:auto !important;overflow-y:hidden !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;-webkit-overflow-scrolling:touch !important;touch-action:pan-x pinch-zoom !important;overscroll-behavior:none !important;background:transparent !important;border:none !important;border-radius:0 !important;">` +
        `<code style="display:block !important;width:max-content !important;min-width:100% !important;font-family:'JetBrains Mono','Fira Code','Cascadia Code',Menlo,Monaco,Consolas,monospace;font-size:13.5px;line-height:1.75;letter-spacing:0.02em;tab-size:2;color:#f0f6fc !important;background-color:transparent !important;white-space:pre !important;word-break:normal !important;word-wrap:normal !important;">${highlightedCodeHtml}</code>` +
      `</pre>` +
    `</div>`;
  });
}

export function enhanceCodeBlocks(container?: HTMLElement | Document | null) {
  if (typeof window === 'undefined') return;
  const root = container || document;
  const preBlocks = root.querySelectorAll<HTMLElement>('.rich-content pre, article pre, .prose pre, .notes-content pre');

  preBlocks.forEach((pre) => {
    // If inside an already enhanced card or has v3 ready, bind copy and skip
    if (
      pre.getAttribute('data-code-ready') === 'v3' ||
      pre.classList.contains('code-body-container') ||
      pre.closest('.code-block-card')
    ) {
      const card = pre.closest('.code-block-card') || pre;
      const existingBtn = card.querySelector<HTMLButtonElement>('.code-copy-btn');
      if (existingBtn) {
        const codeEl = card.querySelector('code');
        const raw = (card as HTMLElement).dataset.rawCode || (codeEl ? codeEl.textContent : '') || '';
        bindCopyBtn(existingBtn, raw);
      }
      return;
    }

    // Extract raw text
    const codeEl = pre.querySelector('code');
    const rawCode = (codeEl ? codeEl.textContent : pre.textContent) || '';
    if (!rawCode.trim()) return;

    pre.setAttribute('data-code-enhanced', 'true');
    pre.setAttribute('data-code-ready', 'v3');
    pre.dataset.rawCode = rawCode;

    const { html, lang } = highlightSyntax(rawCode);

    pre.style.position = 'relative';
    pre.style.width = '100%';
    pre.style.maxWidth = '100%';
    pre.style.boxSizing = 'border-box';
    pre.style.setProperty('background-color', '#0d1117', 'important');
    pre.style.setProperty('color', '#f0f6fc', 'important');
    pre.style.borderRadius = '12px';
    pre.style.border = '1px solid #30363d';
    pre.style.overflow = 'hidden';
    pre.style.padding = '0';
    pre.style.margin = '18px 0';
    pre.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';

    // Header Toolbar
    const header = document.createElement('div');
    header.className = 'code-toolbar-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '8px 14px';
    header.style.backgroundColor = '#161b22';
    header.style.borderBottom = '1px solid #30363d';
    header.style.userSelect = 'none';
    header.style.width = '100%';
    header.style.boxSizing = 'border-box';

    // Left side: macOS dots + language badge
    const leftSide = document.createElement('div');
    leftSide.style.display = 'flex';
    leftSide.style.alignItems = 'center';
    leftSide.style.gap = '8px';

    const dots = document.createElement('div');
    dots.style.display = 'flex';
    dots.style.alignItems = 'center';
    dots.style.gap = '6px';
    dots.innerHTML = `
      <span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;opacity:0.95;"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;opacity:0.95;"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;opacity:0.95;"></span>
    `;

    const langBadge = document.createElement('span');
    langBadge.innerText = lang;
    langBadge.style.fontSize = '10px';
    langBadge.style.fontWeight = '700';
    langBadge.style.letterSpacing = '0.08em';
    langBadge.style.color = '#8b949e';
    langBadge.style.marginLeft = '4px';

    leftSide.appendChild(dots);
    leftSide.appendChild(langBadge);

    // Right side: Scroll buttons + Copy button
    const rightSide = document.createElement('div');
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '6px';

    const scrollNav = document.createElement('div');
    scrollNav.className = 'code-scroll-nav';
    scrollNav.style.display = 'inline-flex';
    scrollNav.style.alignItems = 'center';
    scrollNav.style.gap = '2px';
    scrollNav.style.background = 'rgba(255, 255, 255, 0.06)';
    scrollNav.style.borderRadius = '6px';
    scrollNav.style.padding = '2px 3px';
    scrollNav.style.border = '1px solid rgba(255, 255, 255, 0.1)';

    const btnLeft = document.createElement('button');
    btnLeft.type = 'button';
    btnLeft.setAttribute('aria-label', 'Scroll left');
    btnLeft.style.background = 'none';
    btnLeft.style.border = 'none';
    btnLeft.style.color = '#8b949e';
    btnLeft.style.cursor = 'pointer';
    btnLeft.style.padding = '2px 5px';
    btnLeft.style.display = 'flex';
    btnLeft.style.alignItems = 'center';
    btnLeft.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

    const btnRight = document.createElement('button');
    btnRight.type = 'button';
    btnRight.setAttribute('aria-label', 'Scroll right');
    btnRight.style.background = 'none';
    btnRight.style.border = 'none';
    btnRight.style.color = '#8b949e';
    btnRight.style.cursor = 'pointer';
    btnRight.style.padding = '2px 5px';
    btnRight.style.display = 'flex';
    btnRight.style.alignItems = 'center';
    btnRight.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    scrollNav.appendChild(btnLeft);
    scrollNav.appendChild(btnRight);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-copy-btn';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    copyBtn.style.display = 'inline-flex';
    copyBtn.style.alignItems = 'center';
    copyBtn.style.gap = '6px';
    copyBtn.style.padding = '4px 10px';
    copyBtn.style.borderRadius = '6px';
    copyBtn.style.fontSize = '11px';
    copyBtn.style.fontWeight = '600';
    copyBtn.style.color = '#cbd5e1';
    copyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
    copyBtn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.transition = 'all 0.15s ease';

    const copySvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    copyBtn.innerHTML = `${copySvg}<span>Copy</span>`;

    bindCopyBtn(copyBtn, rawCode);

    rightSide.appendChild(scrollNav);
    rightSide.appendChild(copyBtn);

    header.appendChild(leftSide);
    header.appendChild(rightSide);

    // Code container
    const codeContainer = document.createElement('pre');
    codeContainer.className = 'code-body-container';
    codeContainer.setAttribute('data-code-ready', 'v3');
    codeContainer.style.margin = '0';
    codeContainer.style.padding = '14px 18px';
    codeContainer.style.width = '100%';
    codeContainer.style.maxWidth = '100%';
    codeContainer.style.boxSizing = 'border-box';
    codeContainer.style.setProperty('overflow-x', 'auto', 'important');
    codeContainer.style.setProperty('overflow-y', 'hidden', 'important');
    codeContainer.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
    codeContainer.style.setProperty('touch-action', 'pan-x pinch-zoom', 'important');
    codeContainer.style.setProperty('overscroll-behavior', 'none', 'important');
    codeContainer.style.setProperty('background', 'transparent', 'important');
    codeContainer.style.setProperty('border', 'none', 'important');

    btnLeft.onclick = () => codeContainer.scrollBy({ left: -140, behavior: 'smooth' });
    btnRight.onclick = () => codeContainer.scrollBy({ left: 140, behavior: 'smooth' });

    const codeElement = document.createElement('code');
    codeElement.innerHTML = html;
    codeElement.style.display = 'block';
    codeElement.style.width = 'max-content';
    codeElement.style.minWidth = '100%';
    codeElement.style.fontFamily = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace";
    codeElement.style.fontSize = '13.5px';
    codeElement.style.lineHeight = '1.75';
    codeElement.style.letterSpacing = '0.02em';
    codeElement.style.tabSize = '2';
    codeElement.style.setProperty('color', '#f0f6fc', 'important');
    codeElement.style.setProperty('background-color', 'transparent', 'important');
    codeElement.style.setProperty('white-space', 'pre', 'important');
    codeElement.style.setProperty('word-break', 'normal', 'important');
    codeElement.style.setProperty('word-wrap', 'normal', 'important');
    codeContainer.appendChild(codeElement);

    pre.innerHTML = '';
    pre.appendChild(header);
    pre.appendChild(codeContainer);
  });
}
