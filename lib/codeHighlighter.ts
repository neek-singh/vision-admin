// Utility for colorful syntax highlighting and copy button on code blocks

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
  if (/^<!DOCTYPE/i.test(trimmed) || /<\/?(html|head|body|div|span|p|a|h[1-6]|table|tr|td|form|input|button|script|style|meta|link)/i.test(trimmed)) {
    return 'html';
  }
  if (/(def\s+[a-zA-Z_]|import\s+[a-zA-Z_]|from\s+[a-zA-Z_]|print\(|elif\s+|if\s+__name__)/.test(trimmed)) {
    return 'python';
  }
  if (/(\bconst\s+|\blet\s+|\bvar\s+|\bfunction\s*\(|\bconsole\.log\(|=>|import\s+.*from)/.test(trimmed)) {
    return 'javascript';
  }
  if (/(\.[a-zA-Z0-9_-]+\s*\{|#[a-zA-Z0-9_-]+\s*\{|@media|@keyframes|font-size:|background-color:)/.test(trimmed)) {
    return 'css';
  }
  if (/(SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|CREATE\s+TABLE|DELETE\s+FROM)/i.test(trimmed)) {
    return 'sql';
  }
  return 'code';
}

function highlightHtml(code: string): { html: string; lang: string } {
  const tokenRegex = /(<!--[\s\S]*?-->)|(<!DOCTYPE[\s\S]*?>)|(<\/?[a-zA-Z0-9\-]+)([\s\S]*?)(\/?>)/gi;
  
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [, comment, doctype, tagStart, tagAttrs, tagEnd] = match;

    if (comment) {
      result += `<span style="color:#64748b;font-style:italic;">${escapeHtml(comment)}</span>`;
    } else if (doctype) {
      result += `<span style="color:#94a3b8;font-weight:600;">${escapeHtml(doctype)}</span>`;
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

          renderedAttrs += `<span style="color:#c084fc;">${escapeHtml(attrName)}</span>`;
          if (eq && attrVal !== undefined) {
            renderedAttrs += `<span style="color:#94a3b8;">=</span>`;
            renderedAttrs += `<span style="color:#34d399;">${escapeHtml(attrVal)}</span>`;
          }
        }
        renderedAttrs += escapeHtml(tagAttrs.slice(lastAttrIndex));
      }

      const closeBracket = tagEnd === '/>' ? '/&gt;' : '&gt;';
      result += `<span style="color:#38bdf8;">${openBracket}</span><span style="color:#38bdf8;font-weight:600;">${escapeHtml(tagName)}</span>${renderedAttrs}<span style="color:#38bdf8;">${closeBracket}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'HTML' };
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
      result += `<span style="color:#64748b;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#34d399;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#f43f5e;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (builtin) {
      result += `<span style="color:#38bdf8;">${escapeHtml(token)}</span>`;
    } else if (literal) {
      result += `<span style="color:#a78bfa;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'JAVASCRIPT' };
}

function highlightCss(code: string): { html: string; lang: string } {
  const tokenRegex = /(\/\*[\s\S]*?\*\/)|([a-zA-Z\-]+)(?=\s*:)|(:\s*)([^;]+)(;)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, prop, colon, val, semi] = match;
    if (comment) {
      result += `<span style="color:#64748b;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (prop) {
      result += `<span style="color:#c084fc;">${escapeHtml(prop)}</span>`;
    } else if (colon) {
      result += `<span style="color:#94a3b8;">${colon}</span><span style="color:#34d399;">${escapeHtml(val)}</span><span style="color:#94a3b8;">${semi}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'CSS' };
}

function highlightPython(code: string): { html: string; lang: string } {
  const tokenRegex = /(#.*$)|("(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(\b(?:def|class|if|elif|else|while|for|in|return|import|from|as|try|except|finally|raise|with|lambda|yield)\b)|(\b(?:True|False|None)\b)|(\b(?:print|len|range|str|int|float|list|dict|set|tuple|type|input|open)\b)|(\b\d+(?:\.\d+)?\b)/gm;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    result += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = tokenRegex.lastIndex;

    const [token, comment, str, keyword, literal, builtin, num] = match;
    if (comment) {
      result += `<span style="color:#64748b;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#34d399;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#f43f5e;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (literal) {
      result += `<span style="color:#a78bfa;font-weight:600;">${escapeHtml(token)}</span>`;
    } else if (builtin) {
      result += `<span style="color:#38bdf8;">${escapeHtml(token)}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c;">${escapeHtml(token)}</span>`;
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
      result += `<span style="color:#64748b;font-style:italic;">${escapeHtml(token)}</span>`;
    } else if (str) {
      result += `<span style="color:#34d399;">${escapeHtml(token)}</span>`;
    } else if (keyword) {
      result += `<span style="color:#38bdf8;font-weight:600;">${escapeHtml(token.toUpperCase())}</span>`;
    } else if (num) {
      result += `<span style="color:#fb923c;">${escapeHtml(token)}</span>`;
    }
  }

  result += escapeHtml(code.slice(lastIndex));
  return { html: result, lang: 'SQL' };
}

export function highlightSyntax(rawCode: string, forcedLang?: string): { html: string; lang: string } {
  const lang = forcedLang || detectLanguage(rawCode);
  const cleanCode = rawCode.replace(/\r\n/g, '\n');

  if (lang === 'html') {
    return highlightHtml(cleanCode);
  }
  if (lang === 'python') {
    return highlightPython(cleanCode);
  }
  if (lang === 'javascript') {
    return highlightJs(cleanCode);
  }
  if (lang === 'css') {
    return highlightCss(cleanCode);
  }
  if (lang === 'sql') {
    return highlightSql(cleanCode);
  }

  return { html: escapeHtml(cleanCode), lang: 'CODE' };
}

export function enhanceCodeBlocks(container?: HTMLElement | Document | null) {
  if (typeof window === 'undefined') return;
  const root = container || document;
  const preBlocks = root.querySelectorAll<HTMLElement>('.rich-content pre, article pre, .prose pre, .notes-content pre');

  preBlocks.forEach((pre) => {
    if (pre.getAttribute('data-code-enhanced') === 'true') return;
    pre.setAttribute('data-code-enhanced', 'true');

    const codeEl = pre.querySelector('code');
    const rawCode = (codeEl ? codeEl.textContent : pre.textContent) || '';
    if (!rawCode.trim()) return;

    const { html, lang } = highlightSyntax(rawCode);

    pre.style.position = 'relative';
    pre.style.backgroundColor = '#0d1117';
    pre.style.color = '#e2e8f0';
    pre.style.borderRadius = '12px';
    pre.style.border = '1px solid #21262d';
    pre.style.overflow = 'hidden';
    pre.style.padding = '0';
    pre.style.margin = '18px 0';
    pre.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';

    // Header Toolbar
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '8px 14px';
    header.style.backgroundColor = '#161b22';
    header.style.borderBottom = '1px solid #21262d';
    header.style.userSelect = 'none';

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
      <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;opacity:0.85;"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#eab308;display:inline-block;opacity:0.85;"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:inline-block;opacity:0.85;"></span>
    `;

    const langBadge = document.createElement('span');
    langBadge.innerText = lang;
    langBadge.style.fontSize = '10px';
    langBadge.style.fontWeight = '700';
    langBadge.style.letterSpacing = '0.08em';
    langBadge.style.color = '#94a3b8';
    langBadge.style.marginLeft = '4px';

    leftSide.appendChild(dots);
    leftSide.appendChild(langBadge);

    // Right side: Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
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
    const checkSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    copyBtn.innerHTML = `${copySvg}<span>Copy</span>`;

    copyBtn.onmouseenter = () => {
      copyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
      copyBtn.style.color = '#ffffff';
    };
    copyBtn.onmouseleave = () => {
      copyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      copyBtn.style.color = '#cbd5e1';
    };

    copyBtn.onclick = async (e) => {
      e.stopPropagation();
      const ok = await copyToClipboard(rawCode);
      if (ok) {
        copyBtn.innerHTML = `${checkSvg}<span style="color:#34d399;">Copied!</span>`;
        copyBtn.style.borderColor = 'rgba(52, 211, 153, 0.5)';
        setTimeout(() => {
          copyBtn.innerHTML = `${copySvg}<span>Copy</span>`;
          copyBtn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        }, 2000);
      }
    };

    header.appendChild(leftSide);
    header.appendChild(copyBtn);

    // Code container
    const codeContainer = document.createElement('div');
    codeContainer.style.padding = '14px 18px';
    codeContainer.style.overflowX = 'auto';

    if (codeEl) {
      codeEl.innerHTML = html;
      codeEl.style.display = 'block';
      codeEl.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      codeEl.style.fontSize = '13px';
      codeEl.style.lineHeight = '1.65';
      codeEl.style.whiteSpace = 'pre';
      codeContainer.appendChild(codeEl);
    } else {
      const newCode = document.createElement('code');
      newCode.innerHTML = html;
      newCode.style.display = 'block';
      newCode.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      newCode.style.fontSize = '13px';
      newCode.style.lineHeight = '1.65';
      newCode.style.whiteSpace = 'pre';
      codeContainer.appendChild(newCode);
    }

    pre.innerHTML = '';
    pre.appendChild(header);
    pre.appendChild(codeContainer);
  });
}
