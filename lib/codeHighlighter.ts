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

export function enhanceCodeBlocks(container?: HTMLElement | Document | null) {
  if (typeof window === 'undefined') return;
  const root = container || document;
  const preBlocks = root.querySelectorAll<HTMLElement>('.rich-content pre, article pre, .prose pre, .notes-content pre');

  preBlocks.forEach((pre) => {
    // If already enhanced with v3, just ensure copy button handler is bound
    const existingBtn = pre.querySelector<HTMLButtonElement>('.code-copy-btn');
    if (pre.getAttribute('data-code-ready') === 'v3' && existingBtn) {
      const codeEl = pre.querySelector('code');
      const raw = pre.dataset.rawCode || (codeEl ? codeEl.textContent : '') || '';
      bindCopyBtn(existingBtn, raw);
      return;
    }

    // Extract raw text: If pre had an existing header or nested divs from a previously saved session in DB,
    // grab the text directly from the code element
    const codeEl = pre.querySelector('code');
    const rawCode = (codeEl ? codeEl.textContent : pre.textContent) || '';
    if (!rawCode.trim()) return;

    pre.setAttribute('data-code-enhanced', 'true');
    pre.setAttribute('data-code-ready', 'v3');
    pre.dataset.rawCode = rawCode;

    const { html, lang } = highlightSyntax(rawCode);

    pre.style.position = 'relative';
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

    // Right side: Copy Button
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

    copyBtn.onmouseenter = () => {
      copyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
      copyBtn.style.color = '#ffffff';
    };
    copyBtn.onmouseleave = () => {
      copyBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      copyBtn.style.color = '#cbd5e1';
    };

    bindCopyBtn(copyBtn, rawCode);

    header.appendChild(leftSide);
    header.appendChild(copyBtn);

    // Code container
    const codeContainer = document.createElement('div');
    codeContainer.className = 'code-body-container';
    codeContainer.style.padding = '14px 18px';
    codeContainer.style.overflowX = 'auto';

    const codeElement = document.createElement('code');
    codeElement.innerHTML = html;
    codeElement.style.display = 'block';
    codeElement.style.fontFamily = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace";
    codeElement.style.fontSize = '13.5px';
    codeElement.style.lineHeight = '1.75';
    codeElement.style.letterSpacing = '0.02em';
    codeElement.style.tabSize = '2';
    codeElement.style.setProperty('color', '#f0f6fc', 'important');
    codeElement.style.setProperty('background-color', 'transparent', 'important');
    codeElement.style.whiteSpace = 'pre';
    codeContainer.appendChild(codeElement);

    pre.innerHTML = '';
    pre.appendChild(header);
    pre.appendChild(codeContainer);
  });
}
