/**
 * SE Guide — drop-in collapsible brief for simulation pages.
 * Include with:
 *   <script src="se-guide-content.js"></script>
 *   <script src="se-guide.js"></script>
 * (before </body>, after source-viewer.js if both used)
 *
 * Reads content from window.SE_GUIDE_CONTENT keyed by filename.
 * Renders a collapsible block at the top of <body> with three sections:
 * Premise / What this simulation shows / Talking points.
 * Collapsed state persists per-page in localStorage.
 */
(function () {
  'use strict';

  var filename = (location.pathname.split('/').pop() || '').toLowerCase();
  // Allow trailing slash / index implicit
  if (!filename || filename === 'index.html') return;

  var registry = window.SE_GUIDE_CONTENT || {};
  var brief = registry[filename];
  if (!brief) return; // silently no-op if no entry — keeps the page clean

  var storageKey = 'se-guide:collapsed:' + filename;
  var startCollapsed = false;
  try {
    startCollapsed = localStorage.getItem(storageKey) === '1';
  } catch (e) { /* private mode etc. — ignore */ }

  // ── Styles ─────────────────────────────────────────────
  var STYLE = document.createElement('style');
  STYLE.textContent = [
    '.seg-wrap{position:relative;z-index:5;background:linear-gradient(180deg,rgba(20,24,40,0.96),rgba(15,18,32,0.96));backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.35)}',
    '.seg-bar{display:flex;align-items:center;gap:12px;padding:10px 20px;cursor:pointer;user-select:none}',
    '.seg-bar:hover{background:rgba(255,255,255,0.02)}',
    '.seg-home{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#c9d1d9;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;font-family:inherit;transition:all 0.18s;flex-shrink:0}',
    '.seg-home:hover{background:rgba(150,191,72,0.12);border-color:rgba(150,191,72,0.4);color:#96bf48}',
    '.seg-home svg{width:12px;height:12px;flex-shrink:0}',
    '.seg-icon{font-size:14px;line-height:1;opacity:0.85}',
    '.seg-label{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#96bf48}',
    '.seg-sep{color:rgba(255,255,255,0.18);font-size:11px}',
    '.seg-title{font-size:13px;font-weight:600;color:#e2e8f0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.seg-toggle{margin-left:auto;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#c9d1d9;padding:5px 11px;border-radius:6px;font-size:11px;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:5px;cursor:pointer;transition:all 0.18s}',
    '.seg-toggle:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#fff}',
    '.seg-chev{font-size:10px;transition:transform 0.25s ease;display:inline-block}',
    '.seg-wrap.seg-collapsed .seg-chev{transform:rotate(-180deg)}',
    '.seg-body{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;padding:6px 20px 18px;border-top:1px solid rgba(255,255,255,0.04);overflow:hidden;transition:max-height 0.35s ease,padding 0.25s ease,opacity 0.25s ease;max-height:600px;opacity:1}',
    '.seg-wrap.seg-collapsed .seg-body{max-height:0;padding-top:0;padding-bottom:0;border-top-color:transparent;opacity:0;pointer-events:none}',
    '.seg-section{min-width:0}',
    '.seg-section h4{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#96bf48;margin:0 0 6px 0}',
    '.seg-section p{font-size:12.5px;line-height:1.55;color:#cbd5e1;margin:0}',
    '.seg-section ul{list-style:none;margin:0;padding:0}',
    '.seg-section ul li{font-size:12.5px;line-height:1.5;color:#cbd5e1;padding:3px 0 3px 14px;position:relative}',
    '.seg-section ul li::before{content:"";position:absolute;left:2px;top:11px;width:5px;height:5px;border-radius:50%;background:#34d399}',
    '@media(max-width:960px){.seg-body{grid-template-columns:1fr;gap:14px}.seg-title{font-size:12px}}'
  ].join('\n');
  document.head.appendChild(STYLE);

  // ── Build UI ───────────────────────────────────────────
  var wrap = document.createElement('div');
  wrap.className = 'seg-wrap' + (startCollapsed ? ' seg-collapsed' : '');

  var talkingPointsHTML = (brief.talkingPoints || []).map(function (pt) {
    return '<li>' + escapeHTML(pt) + '</li>';
  }).join('');

  wrap.innerHTML =
    '<div class="seg-bar" id="seg-bar">' +
      '<a class="seg-home" href="index.html" title="Back to all simulations" id="seg-home">' +
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M2 7l6-5 6 5"/>' +
          '<path d="M3.5 6.5V13a1 1 0 0 0 1 1H7v-4h2v4h2.5a1 1 0 0 0 1-1V6.5"/>' +
        '</svg>' +
        '<span>Home</span>' +
      '</a>' +
      '<span class="seg-icon">📖</span>' +
      '<span class="seg-label">SE Guide</span>' +
      '<span class="seg-sep">—</span>' +
      '<span class="seg-title">' + escapeHTML(brief.title || 'Untitled simulation') + '</span>' +
      '<button class="seg-toggle" id="seg-toggle" type="button">' +
        '<span id="seg-toggle-label">' + (startCollapsed ? 'Show' : 'Hide') + '</span>' +
        '<span class="seg-chev">▼</span>' +
      '</button>' +
    '</div>' +
    '<div class="seg-body">' +
      '<div class="seg-section">' +
        '<h4>Premise</h4>' +
        '<p>' + escapeHTML(brief.premise || '') + '</p>' +
      '</div>' +
      '<div class="seg-section">' +
        '<h4>What this simulation shows</h4>' +
        '<p>' + escapeHTML(brief.shows || '') + '</p>' +
      '</div>' +
      '<div class="seg-section">' +
        '<h4>Talking points</h4>' +
        '<ul>' + talkingPointsHTML + '</ul>' +
      '</div>' +
    '</div>';

  // Insert at the very top of <body>
  if (document.body.firstChild) {
    document.body.insertBefore(wrap, document.body.firstChild);
  } else {
    document.body.appendChild(wrap);
  }

  var bar = document.getElementById('seg-bar');
  var toggleBtn = document.getElementById('seg-toggle');
  var toggleLabel = document.getElementById('seg-toggle-label');

  function toggle() {
    var collapsed = wrap.classList.toggle('seg-collapsed');
    toggleLabel.textContent = collapsed ? 'Show' : 'Hide';
    try {
      localStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  // Click anywhere on the bar OR the button toggles — but ignore clicks on Home or the toggle itself
  bar.addEventListener('click', function (e) {
    if (e.target.closest && (e.target.closest('.seg-toggle') || e.target.closest('.seg-home'))) {
      return; // their own handlers / native nav take over
    }
    toggle();
  });
  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggle();
  });
  var homeLink = document.getElementById('seg-home');
  if (homeLink) {
    homeLink.addEventListener('click', function (e) {
      e.stopPropagation(); // let the link navigate; don't toggle
    });
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
