/**
 * Source Viewer — drop-in "View Source" for simulation pages.
 * Include with: <script src="source-viewer.js"></script> (before </body>)
 *
 * Adds a floating "</> Source" button that opens a slide-out panel with
 * the full page HTML, lightweight syntax colouring, and one-click copy.
 */
(function () {
  'use strict';

  // ── Capture source BEFORE injecting anything into the DOM ──
  var _capturedHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  // Strip the source-viewer script tag so the copied output is a clean standalone file
  _capturedHTML = _capturedHTML.replace(/<script\s+src=["']source-viewer\.js["']\s*><\/script>\s*/gi, '');

  // ── Styles ─────────────────────────────────────────────
  var STYLE = document.createElement('style');
  STYLE.textContent = [
    '.sv-trigger{position:fixed;bottom:24px;right:24px;z-index:9998;display:flex;align-items:center;gap:6px;background:rgba(20,24,40,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 16px;cursor:pointer;font-family:inherit;color:#9aa0a6;font-size:0.78rem;font-weight:600;transition:all 0.25s ease;box-shadow:0 4px 20px rgba(0,0,0,0.35)}',
    '.sv-trigger:hover{background:rgba(30,36,60,0.96);color:#e8eaed;border-color:rgba(99,102,241,0.4);transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,0,0,0.45)}',
    '.sv-trigger .sv-icon{font-family:"SF Mono","Fira Code",Consolas,monospace;font-size:0.82rem;color:#6366f1}',
    '.sv-trigger-inline{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#c9d1d9;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;transition:all 0.18s;flex-shrink:0;box-shadow:none;position:static}',
    '.sv-trigger-inline:hover{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.4);color:#a5b4fc;transform:none;box-shadow:none}',
    '.sv-trigger-inline .sv-icon{font-family:"SF Mono","Fira Code",Consolas,monospace;font-size:11px;color:#6366f1}',
    '.sv-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);opacity:0;pointer-events:none;transition:opacity 0.3s ease}',
    '.sv-backdrop.open{opacity:1;pointer-events:auto}',
    '.sv-panel{position:fixed;top:0;right:-560px;width:540px;height:100vh;z-index:10000;background:#0d1117;border-left:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;transition:right 0.35s cubic-bezier(0.16,1,0.3,1);box-shadow:-8px 0 40px rgba(0,0,0,0.5)}',
    '.sv-panel.open{right:0}',
    '.sv-header{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(13,17,23,0.95);flex-shrink:0}',
    '.sv-header h3{font-size:0.88rem;font-weight:600;color:#e8eaed;font-family:"Inter",-apple-system,sans-serif;margin:0}',
    '.sv-header .sv-filename{font-size:0.7rem;color:#8b949e;font-family:"SF Mono","Fira Code",Consolas,monospace;background:rgba(255,255,255,0.04);padding:3px 8px;border-radius:6px}',
    '.sv-header-actions{margin-left:auto;display:flex;gap:8px}',
    '.sv-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#c9d1d9;padding:7px 14px;border-radius:8px;font-size:0.76rem;font-weight:600;cursor:pointer;font-family:"Inter",-apple-system,sans-serif;transition:all 0.2s;display:flex;align-items:center;gap:5px}',
    '.sv-btn:hover{background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.18)}',
    '.sv-btn.sv-copied{background:rgba(52,211,153,0.12);border-color:rgba(52,211,153,0.3);color:#6ee7b7}',
    '.sv-close-btn{background:none;border:none;color:#8b949e;font-size:1.3rem;cursor:pointer;padding:4px 8px;line-height:1;transition:color 0.2s}',
    '.sv-close-btn:hover{color:#e8eaed}',
    '.sv-code-wrap{flex:1;overflow:auto;padding:0}',
    '.sv-code-wrap::-webkit-scrollbar{width:6px;height:6px}',
    '.sv-code-wrap::-webkit-scrollbar-track{background:transparent}',
    '.sv-code-wrap::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}',
    '.sv-code{margin:0;padding:16px 0;font-family:"SF Mono","Fira Code",Consolas,monospace;font-size:0.74rem;line-height:1.65;color:#c9d1d9;counter-reset:line}',
    '.sv-line{display:block;padding:0 20px 0 60px;position:relative;min-height:1.65em}',
    '.sv-line:hover{background:rgba(255,255,255,0.03)}',
    '.sv-line::before{counter-increment:line;content:counter(line);position:absolute;left:0;width:44px;text-align:right;color:#484f58;font-size:0.7rem;padding-right:12px;user-select:none}',
    '.sv-stats{padding:10px 20px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.68rem;color:#8b949e;display:flex;gap:16px;background:rgba(13,17,23,0.95);flex-shrink:0;font-family:"SF Mono","Fira Code",Consolas,monospace}',
    '@media(max-width:600px){.sv-panel{width:100%;right:-100%}}'
  ].join('\n');
  document.head.appendChild(STYLE);

  // ── State ──────────────────────────────────────────────
  var isOpen = false;

  // ── Syntax Highlighter ─────────────────────────────────
  // Strategy: escape to HTML entities, then use a token-based
  // replacer that inserts placeholder markers (not HTML class names)
  // so that subsequent regex passes can't match injected tokens.
  // Finally, swap placeholders for real <span> tags.

  var _tokenId = 0;
  var _tokenMap = {};

  function tok(className, text) {
    var id = '__SV' + (_tokenId++) + '__';
    _tokenMap[id] = '<span style="' + tokenStyle(className) + '">' + text + '</span>';
    return id;
  }

  function tokenStyle(cls) {
    var map = {
      tag:     'color:#7ee787',
      attr:    'color:#d2a8ff',
      str:     'color:#a5d6ff',
      comment: 'color:#8b949e;font-style:italic',
      kw:      'color:#ff7b72',
      fn:      'color:#d2a8ff',
      num:     'color:#79c0ff',
      punct:   'color:#8b949e'
    };
    return map[cls] || '';
  }

  function restoreTokens(s) {
    // Replace all __SVnnn__ placeholders with actual spans
    return s.replace(/__SV\d+__/g, function (m) { return _tokenMap[m] || m; });
  }

  function highlightLine(raw) {
    _tokenId = 0;
    _tokenMap = {};

    // Escape HTML
    var s = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // 1. HTML comments
    s = s.replace(/(&lt;!--.*?--&gt;)/g, function (_, m) { return tok('comment', m); });

    // 2. HTML tags: &lt;tagname or &lt;/tagname
    s = s.replace(/(&lt;\/?)([\w-]+)/g, function (_, open, tag) {
      return open + tok('tag', tag);
    });

    // 3. HTML attributes: word= before a quote
    s = s.replace(/([\w-]+)(=)(&quot;)/g, function (_, attr, eq, q) {
      return tok('attr', attr) + tok('punct', eq) + q;
    });

    // 4. Quoted strings
    s = s.replace(/(&quot;)(.*?)(&quot;)/g, function (_, q1, inner, q2) {
      return tok('str', q1 + inner + q2);
    });

    // 5. JS keywords (word boundary match)
    s = s.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|true|false|null|undefined|void|delete|yield)\b/g, function (m) {
      return tok('kw', m);
    });

    // 6. Common JS built-ins / DOM methods
    s = s.replace(/\b(document|window|console|Math|Array|Object|JSON|Promise|Map|Set|setTimeout|setInterval|clearTimeout|clearInterval|requestAnimationFrame|addEventListener|removeEventListener|getElementById|querySelector|querySelectorAll|createElement|appendChild|removeChild|insertBefore|innerHTML|outerHTML|textContent|classList|style|getAttribute|setAttribute|parentNode|childNodes|children|nextSibling|previousSibling|forEach|map|filter|reduce|find|some|every|includes|indexOf|push|pop|shift|unshift|splice|slice|concat|join|split|replace|match|test|trim|keys|values|entries|assign|parse|stringify|fetch|then|catch|resolve|reject|all)\b/g, function (m) {
      return tok('fn', m);
    });

    // 7. Numbers with optional units
    s = s.replace(/\b(\d+\.?\d*)(px|rem|em|%|vh|vw|vmin|vmax|ms|s|deg|fr)?\b/g, function (_, n, u) {
      return tok('num', n + (u || ''));
    });

    return restoreTokens(s);
  }

  function buildLines(code) {
    var lines = code.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      result.push('<span class="sv-line">' + (highlightLine(lines[i]) || ' ') + '</span>');
    }
    return result.join('\n');
  }

  // ── Get clean source ───────────────────────────────────
  function getSource() {
    return _capturedHTML;
  }

  // ── Build UI ───────────────────────────────────────────
  var segBar = document.querySelector('.seg-bar');
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.innerHTML = '<span class="sv-icon">&lt;/&gt;</span><span>Source</span>';
  trigger.title = 'View page source \u2014 copy the full HTML to use in your own presentations';
  trigger.onclick = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    openPanel();
  };
  if (segBar) {
    trigger.className = 'sv-trigger-inline';
    var segToggle = segBar.querySelector('.seg-toggle');
    if (segToggle) {
      segBar.insertBefore(trigger, segToggle);
    } else {
      segBar.appendChild(trigger);
    }
  } else {
    trigger.className = 'sv-trigger';
    document.body.appendChild(trigger);
  }

  var backdrop = document.createElement('div');
  backdrop.className = 'sv-backdrop';
  backdrop.onclick = closePanel;
  document.body.appendChild(backdrop);

  var panel = document.createElement('div');
  panel.className = 'sv-panel';
  var filename = location.pathname.split('/').pop() || 'index.html';
  panel.innerHTML =
    '<div class="sv-header">' +
      '<h3>&lt;/&gt; Source Code</h3>' +
      '<span class="sv-filename">' + filename + '</span>' +
      '<div class="sv-header-actions">' +
        '<button class="sv-btn sv-copy-btn" id="sv-copy">Copy HTML</button>' +
        '<button class="sv-close-btn" id="sv-close">&times;</button>' +
      '</div>' +
    '</div>' +
    '<div class="sv-code-wrap"><pre class="sv-code" id="sv-code"></pre></div>' +
    '<div class="sv-stats" id="sv-stats"></div>';
  document.body.appendChild(panel);

  document.getElementById('sv-close').onclick = closePanel;
  document.getElementById('sv-copy').onclick = copySource;

  // ── Open / Close ───────────────────────────────────────
  var rendered = false;

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    backdrop.classList.add('open');
    panel.classList.add('open');

    if (!rendered) {
      rendered = true;
      var code = getSource();
      var codeEl = document.getElementById('sv-code');

      // Render in a rAF to avoid blocking the slide animation
      requestAnimationFrame(function () {
        codeEl.innerHTML = buildLines(code);

        var lines = code.split('\n').length;
        var bytes = new Blob([code]).size;
        var kb = (bytes / 1024).toFixed(1);
        document.getElementById('sv-stats').innerHTML =
          '<span>' + lines + ' lines</span>' +
          '<span>' + kb + ' KB</span>' +
          '<span>Self-contained HTML \u2014 paste into any .html file</span>';
      });
    }
  }

  function closePanel() {
    isOpen = false;
    backdrop.classList.remove('open');
    panel.classList.remove('open');
  }

  function copySource() {
    var code = getSource();
    var btn = document.getElementById('sv-copy');

    function onCopied() {
      btn.classList.add('sv-copied');
      btn.textContent = 'Copied!';
      setTimeout(function () {
        btn.classList.remove('sv-copied');
        btn.textContent = 'Copy HTML';
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(onCopied).catch(function () {
        fallbackCopy(code);
        onCopied();
      });
    } else {
      fallbackCopy(code);
      onCopied();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closePanel();
  });
})();
