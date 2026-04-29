// ==========================================================================
// auto-rfq-banana — client orchestration
// Pattern source: supplier-pricing/app.js (boot diag, legal gate, splash)
// ==========================================================================

// Boot marker — first thing that runs. If the screen still says "initializing…"
// after a refresh, the browser is serving cached JS — Empty Cache + Hard Reload.
try {
  const _ls = document.getElementById('load-status');
  if (_ls) _ls.textContent = 'JS LOADED — booting…';
  console.log('[boot] app.js v1 loaded at', new Date().toISOString());
} catch (e) {}

// Top-level error trap — anything that throws synchronously during script
// parse/execution lands here so we can show it on the loading screen instead
// of silently leaving the user on "initializing…".
window.addEventListener('error', (e) => {
  try {
    const _ls = document.getElementById('load-status');
    if (_ls) _ls.textContent = 'BOOT ERROR: ' + (e && e.message ? e.message : e);
  } catch (_) {}
  console.error('[boot error]', e && (e.error || e.message || e));
});

// ==========================================================================
// Legal gate — wired at boot but kept HIDDEN until the user dismisses the
// splash. Sequence is: splash (banana) → warning gate → app. Canonical
// disclaimer copy is in the workpackage skill; do not customize per-tool.
// ==========================================================================
const _legalGate = (function _initLegalGate() {
  const gate = document.getElementById('legal-gate');
  if (!gate) return { show: () => {}, isAccepted: () => true };

  const accept = document.getElementById('legal-gate-accept');
  const exit = document.getElementById('legal-gate-exit');

  if (accept) {
    accept.addEventListener('click', () => {
      try { sessionStorage.setItem('legal-gate-accepted', '1'); } catch (e) {}
      gate.classList.add('is-hidden');
    });
  }
  if (exit) {
    exit.addEventListener('click', () => {
      try { window.close(); } catch (e) {}
      setTimeout(() => {
        document.documentElement.innerHTML =
          '<body style="background:#1a120a;color:#9b8669;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center"><div><h1 style="color:#fdf6e3;font-size:18px;margin:0 0 8px">Closed.</h1><p>You may close this tab.</p></div></body>';
      }, 100);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (gate.classList.contains('is-hidden')) return;
    if (e.key === 'Escape' && exit) exit.click();
  });

  return {
    show() {
      try {
        if (sessionStorage.getItem('legal-gate-accepted') === '1') return;
      } catch (e) { /* fall through and prompt */ }
      gate.classList.remove('is-hidden');
      // Re-focus the Accept button when the gate appears
      setTimeout(() => { if (accept) accept.focus(); }, 50);
    },
    isAccepted() {
      try { return sessionStorage.getItem('legal-gate-accepted') === '1'; }
      catch (e) { return false; }
    },
  };
})();

// ==========================================================================
// Splash screen — pixel art (bunch of bananas) + dismiss on Enter
// ==========================================================================
// Three bananas merging at a brown stem at top, fanning out into separate
// tips at the bottom. Sparkles at the corners for energy.
// 22 cols × 30 rows, 2-char tokens space-separated, ".." = transparent.
const SPLASH_PALETTE = {
  // Banana — warm yellow with deep outline (the brand)
  BO: "#3d2914",   // outline (deep brown, ties to chocolate undertones)
  BB: "#c89220",   // base / darkest yellow (under-shadow)
  BM: "#ecc442",   // mid yellow (body)
  BL: "#ffe066",   // light yellow (highlight side)
  BH: "#fff5b8",   // brightest highlight (specular)
  // Stem — short brown nub at top
  ST: "#2d1d0a",   // stem dark
  SM: "#533618",   // stem mid
  // Sparkles (Frosted Mint — ties to ink-0 and the palette)
  SP: "#C4E7D4",   // dim sparkle
  SH: "#ffffff",   // bright sparkle core
};

const SPLASH_GRID = [
  // Cute bunch of bananas — two horizontal-ish bananas joined at a brown
  // stem at top center, with a tiny third banana peeking between them.
  // Chunky cartoon proportions; reads instantly as a bunch, not as one
  // tall single banana. Gentler bob animation (set in CSS) so it
  // hovers rather than wobbles.
  /*  0 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /*  1 */ ".. SP .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. SH ..",
  /*  2 */ ".. .. .. .. .. .. .. .. .. .. ST .. .. .. .. .. .. .. .. .. .. ..",
  /*  3 */ ".. .. .. .. .. .. .. .. .. ST SM ST .. .. .. .. .. .. .. .. .. ..",
  /*  4 */ ".. .. .. .. .. .. .. .. ST SM SM SM ST .. .. .. .. .. .. .. .. ..",
  /*  5 */ ".. .. .. .. .. .. .. ST SM SM SM SM SM ST .. .. .. .. .. .. .. ..",
  /*  6 */ ".. .. .. .. .. BO BO ST SM SM SM SM ST BO BO .. .. .. .. .. .. ..",
  /*  7 */ ".. .. .. .. BO BB BO ST SM SM SM ST BO BB BO .. .. .. .. .. .. ..",
  /*  8 */ ".. .. .. BO BB BM BO BO BO BO BO BO BO BM BB BO .. .. .. .. .. ..",
  /*  9 */ ".. .. BO BB BM BL BL BO BB BM BB BO BL BL BM BB BO .. .. .. .. ..",
  /* 10 */ ".. BO BB BM BL BH BH BO BM BL BM BO BH BH BL BM BB BO .. .. .. ..",
  /* 11 */ ".. BO BM BL BH BH BL BO BL BH BL BO BL BH BH BL BM BO .. .. .. ..",
  /* 12 */ "BO BB BM BL BL BL BL BO BL BH BL BO BL BL BL BL BM BB BO .. .. ..",
  /* 13 */ "BO BM BL BL BL BL BL BO BL BH BL BO BL BL BL BL BL BM BO .. .. ..",
  /* 14 */ "BO BM BL BL BL BL BL BO BL BL BL BO BL BL BL BL BL BM BO .. .. ..",
  /* 15 */ "BO BM BL BL BL BL BL BO BL BL BL BO BL BL BL BL BL BM BO .. .. ..",
  /* 16 */ ".. BO BM BL BL BL BL BO BM BL BM BO BL BL BL BL BM BO .. .. .. ..",
  /* 17 */ ".. BO BM BM BL BL BL BO BM BL BM BO BL BL BL BM BM BO .. .. .. ..",
  /* 18 */ ".. .. BO BM BM BL BL BO BB BM BB BO BL BL BM BM BO .. .. .. .. ..",
  /* 19 */ ".. .. BO BB BM BM BL BO BO BO BO BO BL BM BM BB BO .. .. .. .. ..",
  /* 20 */ ".. .. .. BO BB BM BM BB BO .. .. BO BB BM BM BB BO .. .. .. .. ..",
  /* 21 */ ".. .. .. .. BO BB BM BB BO .. .. .. BO BB BM BB BO .. .. .. .. ..",
  /* 22 */ ".. .. .. .. .. BO BB BO .. .. .. .. .. BO BB BO .. .. .. .. .. ..",
  /* 23 */ ".. .. .. .. .. .. BO .. .. .. .. .. .. .. BO .. .. .. .. .. .. ..",
  /* 24 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /* 25 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /* 26 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /* 27 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /* 28 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
  /* 29 */ ".. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..",
];

// Splash character is now an <img> element (./assets/splash-bananas.png).
// The pixel-art SPLASH_GRID + SPLASH_PALETTE above are kept as a fallback
// reference but no longer rendered. If you want to revert to pixel art,
// swap the <img id="splash-char-img"> in app.html for an <svg id="splash-char">
// and re-enable the build-svg IIFE.

// Splash dismiss on Enter — once Pyodide is ready
let _pyReady = false;
function _setSplashStatus(text, ready) {
  const el = document.getElementById('splash-status');
  if (!el) return;
  el.textContent = text;
  if (ready) el.classList.add('ready');
}
function _dismissSplash() {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hidden');
  setTimeout(() => {
    if (splash) splash.style.display = 'none';
    // After splash, reveal the legal gate (unless accepted earlier in this tab session)
    if (_legalGate && !_legalGate.isAccepted()) _legalGate.show();
  }, 350);
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && _pyReady) _dismissSplash();
});

// ==========================================================================
// Pyodide bootstrap — local runtime, local wheels, no CDN
// ==========================================================================
let _py = null;
let _pyAppLoaded = false;

async function _initPyodide() {
  const t0 = performance.now();
  function tick(msg) {
    const dt = ((performance.now() - t0) / 1000).toFixed(1);
    const txt = `[initPyodide] ${msg} (${dt}s)`;
    console.log(txt);
    const ls = document.getElementById('load-status');
    if (ls) ls.textContent = txt;
    _setSplashStatus(msg);
  }

  try {
    tick('loading runtime…');
    _py = await loadPyodide({ indexURL: './pyodide/' });
    tick('runtime loaded; loading openpyxl…');

    // Local wheels — no PyPI calls
    await _py.loadPackage(['micropip']);
    const micropip = _py.pyimport('micropip');
    await micropip.install([
      './wheels/et_xmlfile-1.1.0-py3-none-any.whl',
      './wheels/openpyxl-3.1.5-py2.py3-none-any.whl',
    ]);
    tick('openpyxl loaded; fetching app.py…');

    const pyText = await fetch('./app.py').then(r => r.text());
    await _py.runPythonAsync(pyText);
    _pyAppLoaded = true;
    tick('python ready');

    _pyReady = true;
    _setSplashStatus('press Enter to start', true);

    // Hide loading overlay; splash stays until user dismisses
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  } catch (err) {
    console.error('[initPyodide] failed', err);
    const ls = document.getElementById('load-status');
    if (ls) ls.textContent = 'PYTHON BOOT FAILED: ' + (err.message || err);
    throw err;
  }
}

// Kick off Pyodide as soon as the script runs
_initPyodide();

// Resolve wheel filenames at runtime (fallback) — list from local dir
async function _detectWheels() {
  // Hardcoded list matching what's in ./wheels/. Update if wheels change.
  return [
    './wheels/et_xmlfile-1.1.0-py3-none-any.whl',
    './wheels/openpyxl-3.1.5-py2.py3-none-any.whl',
  ];
}

// ==========================================================================
// File intake — Step 1: drop multi-year export
// ==========================================================================
const $ = (id) => document.getElementById(id);

let _exportFile = null;        // File object
let _exportBytes = null;       // Uint8Array
let _exportHeaders = null;     // string[]
let _exportSheetName = null;   // string
let _exportRowCount = 0;
let _mapping = null;           // {field → header_idx}
let _rfqResult = null;         // result of extract_rfq_list
let _kbShortcutsBound = false;

function _bindDropzone(zoneId, inputId, fileNameId, onFile) {
  const zone = $(zoneId), input = $(inputId);
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f) onFile(f, zone, fileNameId);
  });
  input.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) onFile(f, zone, fileNameId);
  });
}

async function _onExportFile(file, zone, fileNameId) {
  _exportFile = file;
  zone.classList.add('loaded');
  $(fileNameId).textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB · reading…`;

  try {
    const buf = await file.arrayBuffer();
    _exportBytes = new Uint8Array(buf);

    if (!_pyAppLoaded) {
      $(fileNameId).textContent = `${file.name} · waiting for python…`;
      while (!_pyAppLoaded) await new Promise(r => setTimeout(r, 100));
    }

    // Inspect headers (cheap — just read sheet 1 row 1)
    _py.globals.set('_export_bytes', _exportBytes);
    const inspect = await _py.runPythonAsync(`
import json
from app_engine import inspect_workbook
_inspect_result = inspect_workbook(_export_bytes.to_py())
json.dumps(_inspect_result)
`);
    const parsed = JSON.parse(inspect);
    _exportHeaders = parsed.headers;
    _exportSheetName = parsed.sheet_name;
    _exportRowCount = parsed.row_count;

    $(fileNameId).textContent =
      `${file.name} · ${parsed.row_count.toLocaleString()} rows · sheet "${parsed.sheet_name}" · ${parsed.headers.length} cols`;
    $('to-mapping').disabled = false;
  } catch (err) {
    console.error('[onExportFile] failed', err);
    $(fileNameId).textContent = `Failed: ${err.message || err}`;
  }
}

_bindDropzone('dz-export', 'file-export', 'f-export', _onExportFile);

// ==========================================================================
// Step transitions
// ==========================================================================
function _showStep(n) {
  for (let i = 1; i <= 4; i++) {
    const s = $(`step-${i}`);
    if (s) s.hidden = (i !== n);
    const dot = document.querySelector(`.step-dot[data-step="${i}"]`);
    if (dot) {
      dot.classList.toggle('active', i === n);
      dot.classList.toggle('done', i < n);
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('to-mapping').addEventListener('click', async () => {
  await _renderMappingTable();
  _showStep(2);
});
$('back-to-1').addEventListener('click', () => _showStep(1));
$('back-to-2').addEventListener('click', () => _showStep(2));
$('back-to-3').addEventListener('click', () => _showStep(3));
$('to-bids').addEventListener('click', async () => {
  _showStep(4);
  await _refreshBidViews();
});

// ==========================================================================
// Step 2: column mapping (auto-detect via aliases + manual override)
// ==========================================================================
const RFQ_FIELDS = [
  { key: 'item_num',    label: 'Item #',                hint: 'Andersen Item Number — usually populated; blank for cXML/PunchOut suppliers like McMaster' },
  { key: 'eam_pn',      label: 'EAM Part Number',       hint: 'Andersen-side fallback if Item # missing' },
  { key: 'part_number', label: 'Supplier Part Number',  hint: 'Supplier\'s own catalog SKU (e.g. McMaster\'s 5709A45). Used as fallback dedup key when Item # / EAM are blank' },
  { key: 'description', label: 'Description',           hint: 'Item / part description', required: true },
  { key: 'mfg_name',    label: 'Manufacturer',          hint: 'Manufacturer name (often blank or "N/A" for distributor-branded items — that\'s OK)' },
  { key: 'mfg_pn',      label: 'Manufacturer Part #',   hint: 'OEM part number' },
  { key: 'order_date',  label: 'Order Date',            hint: 'PO date — drives the time-window aggregations', required: true },
  { key: 'qty',         label: 'Quantity',              hint: 'Order qty per line', required: true },
  { key: 'unit_price',  label: 'Unit Price',            hint: 'Price per unit (or extended ÷ qty if only extended is present)', required: true },
  { key: 'po_number',   label: 'PO #',                  hint: 'Purchase order number (used for distinct-PO counts)' },
  { key: 'uom',         label: 'UOM',                   hint: 'Unit of measure (EA, BX, etc.) — flagged if mixed' },
  { key: 'commodity',   label: 'Commodity',             hint: 'Coupa commodity column if present' },
  { key: 'supplier',    label: 'Supplier',              hint: 'Supplier name — usually one value across the export' },
];

// ----- Column-mapping templates (saved per source format) -----
const MAPPING_TEMPLATES_KEY = 'autorfqbanana:mapping_templates';

function _listMappingTemplates() {
  try { return JSON.parse(localStorage.getItem(MAPPING_TEMPLATES_KEY) || '{}'); }
  catch (e) { return {}; }
}
function _writeMappingTemplates(t) {
  try { localStorage.setItem(MAPPING_TEMPLATES_KEY, JSON.stringify(t)); }
  catch (e) { console.warn('mapping templates write failed', e); }
}
function _headerFingerprint(headers) {
  // Stable fingerprint = first 16 chars of each header concatenated, lowercased
  return (headers || []).map(h => (h || '').toString().trim().toLowerCase().slice(0, 16)).join('|');
}
function _templatesMatchingCurrentFile() {
  if (!_exportHeaders) return [];
  const fp = _headerFingerprint(_exportHeaders);
  const templates = _listMappingTemplates();
  return Object.entries(templates)
    .filter(([_, t]) => t.fingerprint === fp)
    .map(([name, t]) => ({ name, ...t }));
}

function _renderMappingTemplatesRow() {
  const wrap = $('mapping-templates-row');
  if (!wrap) return;
  const matches = _templatesMatchingCurrentFile();
  const all = _listMappingTemplates();
  const others = Object.keys(all).filter(n => !matches.find(m => m.name === n));
  if (!matches.length && !others.length) {
    wrap.innerHTML = '<div style="color:var(--ink-2);font-family:var(--mono);font-size:11px;font-style:italic;">No saved templates yet. After confirming the mapping, click "💾 Save as template…" to remember this header shape for next time.</div>';
    return;
  }
  let html = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-family:var(--ui);">';
  if (matches.length) {
    html += '<span style="font-size:11px;color:var(--green);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Auto-match:</span>';
    for (const m of matches) {
      html += `<button class="btn ghost" data-apply-template="${_escapeHtml(m.name)}" style="padding:5px 12px;font-size:12px;border-color:var(--green);">↩ ${_escapeHtml(m.name)}</button>`;
    }
  }
  if (others.length) {
    html += '<span style="font-size:11px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-left:14px;">Other saved:</span>';
    for (const name of others) {
      html += `<button class="btn ghost" data-apply-template="${_escapeHtml(name)}" style="padding:5px 12px;font-size:12px;">↩ ${_escapeHtml(name)}</button>`;
    }
  }
  html += '<span style="margin-left:auto;"></span>';
  for (const name of Object.keys(all)) {
    html += `<button class="btn ghost" data-delete-template="${_escapeHtml(name)}" title="Delete template ${_escapeHtml(name)}" style="padding:5px 8px;font-size:11px;color:var(--ink-2);">×${_escapeHtml(name)}</button>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('[data-apply-template]').forEach(btn => {
    btn.addEventListener('click', () => _applyMappingTemplate(btn.getAttribute('data-apply-template')));
  });
  wrap.querySelectorAll('[data-delete-template]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = btn.getAttribute('data-delete-template');
      if (!confirm(`Delete saved template "${n}"?`)) return;
      const t = _listMappingTemplates();
      delete t[n];
      _writeMappingTemplates(t);
      _renderMappingTemplatesRow();
    });
  });
}

function _applyMappingTemplate(name) {
  const t = _listMappingTemplates()[name];
  if (!t || !t.mapping) return;
  // Re-render the table with the saved mapping pre-selected
  _renderMappingTable(t.mapping).then(() => {
    // Visual confirmation
    const row = $('mapping-templates-row');
    if (row) {
      const note = document.createElement('div');
      note.style.cssText = 'margin-top:10px;color:var(--green);font-family:var(--mono);font-size:11px;';
      note.textContent = `✓ Applied "${name}"`;
      row.appendChild(note);
      setTimeout(() => note.remove(), 3000);
    }
  });
}

async function _saveCurrentMappingAsTemplate() {
  const current = _readMapping();
  if (!Object.keys(current).length) {
    alert('Map at least one column before saving as a template.');
    return;
  }
  const name = prompt('Name this mapping template (e.g. "Coupa-McMaster-export"):');
  if (!name) return;
  const t = _listMappingTemplates();
  t[name] = {
    created_at: new Date().toISOString(),
    fingerprint: _headerFingerprint(_exportHeaders),
    headers_count: (_exportHeaders || []).length,
    mapping: current,
  };
  _writeMappingTemplates(t);
  _renderMappingTemplatesRow();
}

if ($('save-mapping-template')) {
  $('save-mapping-template').addEventListener('click', _saveCurrentMappingAsTemplate);
}

async function _renderMappingTable(presetMapping) {
  if (!_exportHeaders) return;
  // Ask Python for auto-detected mapping (overridden by presetMapping if provided)
  _py.globals.set('_headers_in', _exportHeaders);
  const autoMap = await _py.runPythonAsync(`
import json
from app_engine import auto_map_export
json.dumps(auto_map_export(_headers_in.to_py()))
`);
  const auto = presetMapping || JSON.parse(autoMap);
  _renderMappingTemplatesRow();

  const wrap = $('mapping-table-wrap');
  let html = '<table class="map-table"><tbody>';
  for (const f of RFQ_FIELDS) {
    const sel = auto[f.key];
    html += `<tr><td class="map-label">${f.label}${f.required ? ' <span style="color:var(--accent)">*</span>' : ''}<span class="map-hint">${f.hint}</span></td>`;
    html += `<td><select class="col-select" data-field="${f.key}"><option value="-1">— not mapped —</option>`;
    for (let i = 0; i < _exportHeaders.length; i++) {
      const selAttr = (sel === i) ? ' selected' : '';
      html += `<option value="${i}"${selAttr}>${_escapeHtml(_exportHeaders[i] || '(blank)')}</option>`;
    }
    html += `</select></td></tr>`;
  }
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function _readMapping() {
  const m = {};
  document.querySelectorAll('select.col-select').forEach(sel => {
    const f = sel.getAttribute('data-field');
    const v = parseInt(sel.value, 10);
    if (v >= 0) m[f] = v;
  });
  return m;
}

$('to-extract').addEventListener('click', async () => {
  _mapping = _readMapping();
  // Validate required fields
  const missing = RFQ_FIELDS.filter(f => f.required && !(f.key in _mapping)).map(f => f.label);
  if (missing.length) {
    alert('Missing required column mappings:\n  · ' + missing.join('\n  · '));
    return;
  }
  // At least one identifier required (item_num OR eam_pn OR part_number)
  if (!('item_num' in _mapping) && !('eam_pn' in _mapping) && !('part_number' in _mapping)) {
    alert('Map at least one identifier column: Item #, EAM Part Number, or Supplier Part Number.');
    return;
  }
  await _runExtract();
  _showStep(3);
});

// ==========================================================================
// Step 3: extract RFQ list + render table + KPIs + charts
// ==========================================================================
async function _runExtract() {
  $('rfq-table').querySelector('tbody').innerHTML =
    '<tr><td colspan="99" style="padding:24px;text-align:center;color:var(--ink-2)">Extracting RFQ list…</td></tr>';

  _py.globals.set('_export_bytes', _exportBytes);
  _py.globals.set('_mapping_in', _mapping);
  const out = await _py.runPythonAsync(`
import json
from app_engine import extract_rfq_list
_rfq = extract_rfq_list(_export_bytes.to_py(), _mapping_in.to_py())
json.dumps(_rfq, default=str)
`);
  _rfqResult = JSON.parse(out);
  _renderKpis();
  _renderRfqTable();
  _renderCharts();
  _renderConflictsBanner();
  // Boot the save manager — this run is now a recoverable session
  _saveMgr.init();
  _saveMgr.autosaveLocal();
  _injectSaveBar();
}

async function _renderConflictsBanner() {
  if (!_rfqResult) return;
  let banner = document.getElementById('conflicts-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'conflicts-banner';
    banner.style.cssText = 'margin-bottom:18px;';
    const kpi = $('kpi-row');
    if (kpi && kpi.parentNode) kpi.parentNode.insertBefore(banner, kpi);
  }
  banner.innerHTML = '<div style="padding:14px;color:var(--ink-2);font-family:var(--mono);font-size:11px;">scanning for item conflicts…</div>';
  try {
    const json = await _py.runPythonAsync(`
import json
from app_engine import detect_item_conflicts, _STATE
json.dumps(detect_item_conflicts(_STATE.get("items", [])), default=str)
`);
    const c = JSON.parse(json);
    const s = c.summary || {};
    if (!s.n_conflicts_total) {
      banner.innerHTML = '';
      return;
    }
    banner.innerHTML = `
      <div style="background:rgba(255,77,109,0.06);border:1px solid var(--red);border-radius:6px;padding:12px 16px;display:flex;align-items:center;gap:14px;font-family:var(--ui);font-size:13px;">
        <span style="color:var(--red);font-weight:700;">⚠ ${s.n_conflicts_total} data-hygiene conflict${s.n_conflicts_total===1?'':'s'}</span>
        <span style="color:var(--ink-1);">${s.n_items_affected} item${s.n_items_affected===1?'':'s'} affected · ${s.n_mfg_pn_multi_item} same-MFG-PN-multi-item · ${s.n_desc_multi_item} same-desc-multi-item · ${s.n_mfg_pn_multi_mfr} multi-manufacturer</span>
        <button class="btn ghost" id="conflicts-view-btn" style="padding:5px 12px;font-size:11px;margin-left:auto;">View details</button>
      </div>
    `;
    document.getElementById('conflicts-view-btn').addEventListener('click', () => _showConflictsModal(c));
  } catch (e) {
    console.warn('[conflicts]', e);
    banner.innerHTML = '';
  }
}

function _showConflictsModal(conflicts) {
  let modal = document.getElementById('conflicts-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'conflicts-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  let body = '';
  for (const [type, items] of Object.entries(conflicts.by_type || {})) {
    if (!items.length) continue;
    body += `<h3 style="font-family:var(--ui);font-size:13px;font-weight:600;color:var(--accent);margin:18px 0 8px;text-transform:none;letter-spacing:0;">${type.replace(/_/g,' ')} (${items.length})</h3>`;
    body += '<div style="border:1px solid var(--line);border-radius:4px;overflow:auto;max-height:300px;"><table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);"><tbody>';
    for (const c of items.slice(0, 100)) {
      body += '<tr style="border-bottom:1px solid var(--line);">';
      if (type === 'MFG_PN_MULTI_ITEM') {
        body += `<td style="padding:8px 12px;color:var(--ink-1);">MFG PN <code>${_escapeHtml(c.mfg_pn)}</code> appears under ${c.n_items} item numbers: <strong>${c.item_nums.slice(0,5).map(_escapeHtml).join(', ')}${c.item_nums.length>5?' …':''}</strong></td>`;
      } else if (type === 'DESC_MULTI_ITEM') {
        body += `<td style="padding:8px 12px;color:var(--ink-1);">"${_escapeHtml(c.description)}" appears as ${c.n_items} item numbers: <strong>${c.item_nums.slice(0,5).map(_escapeHtml).join(', ')}${c.item_nums.length>5?' …':''}</strong></td>`;
      } else if (type === 'MFG_PN_MULTI_MFR') {
        body += `<td style="padding:8px 12px;color:var(--ink-1);">MFG PN <code>${_escapeHtml(c.mfg_pn)}</code> attributed to ${c.manufacturers.length} manufacturers: <strong>${c.manufacturers.slice(0,5).map(_escapeHtml).join(', ')}${c.manufacturers.length>5?' …':''}</strong></td>`;
      }
      body += '</tr>';
    }
    body += '</tbody></table></div>';
  }
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:920px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 14px;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">DATA HYGIENE</div>
          <div style="font-size:22px;font-weight:600;color:var(--ink-0);">Item conflicts</div>
          <div style="font-size:13px;color:var(--ink-1);margin-top:6px;">These conflicts won't break the RFQ but they suggest cleanup opportunities — could be duplicate item-master entries, supplier-side typos, or genuine variants worth distinguishing.</div>
        </div>
        <button id="cf-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <div style="overflow:auto;flex:1;padding:0 26px 22px;">${body}</div>
    </div>
  `;
  document.getElementById('cf-close').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

function _renderKpis() {
  if (!_rfqResult) return;
  const k = _rfqResult.kpis;
  const d = _rfqResult.difficulty;
  // Exact-penny dollar formatter — RFQ reporting requires no rounding.
  // No more compact $X.XM / $XK. Per ryan: "no rounding or medians in rfqs".
  const fmt$ = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let difficultyTile = '';
  if (d) {
    const diffColor = d.score >= 70 ? 'var(--red)' : d.score >= 50 ? 'var(--accent)' : d.score >= 30 ? 'var(--cyan)' : 'var(--green)';
    difficultyTile = `
      <div class="kpi" style="border-color: ${diffColor};">
        <div class="kpi-label">Difficulty</div>
        <div class="kpi-value" style="color: ${diffColor};">${d.score}</div>
        <div class="kpi-sub"><strong style="color: ${diffColor};">${d.level}</strong> — ${d.summary}</div>
      </div>
    `;
  }

  $('kpi-row').innerHTML = `
    <div class="kpi"><div class="kpi-label">Items</div><div class="kpi-value">${k.item_count.toLocaleString()}</div><div class="kpi-sub">unique part numbers</div></div>
    <div class="kpi"><div class="kpi-label">Total spend (all)</div><div class="kpi-value">${fmt$(k.total_spend)}</div><div class="kpi-sub">${k.po_count.toLocaleString()} POs · ${k.line_count.toLocaleString()} lines</div></div>
    <div class="kpi"><div class="kpi-label">Date range</div><div class="kpi-value">${k.years_span.toFixed(2)} yr</div><div class="kpi-sub">${k.first_order} → ${k.last_order}</div></div>
    <div class="kpi"><div class="kpi-label">12-mo spend</div><div class="kpi-value">${fmt$(k.spend_12mo)}</div><div class="kpi-sub">${k.items_12mo.toLocaleString()} items active</div></div>
    <div class="kpi"><div class="kpi-label">24-mo spend</div><div class="kpi-value">${fmt$(k.spend_24mo)}</div><div class="kpi-sub">${k.items_24mo.toLocaleString()} items active</div></div>
    <div class="kpi"><div class="kpi-label">36-mo spend</div><div class="kpi-value">${fmt$(k.spend_36mo)}</div><div class="kpi-sub">${k.items_36mo.toLocaleString()} items active</div></div>
    ${difficultyTile}
  `;
}

function _activeWindow() { return $('active-window').value || '24'; }
function _activeWindowKey() {
  const w = _activeWindow();
  if (w === 'all') return 'all';
  return `_${w}mo`;
}

function _renderRfqTable() {
  if (!_rfqResult) return;
  const items = _rfqResult.items;
  const wKey = _activeWindowKey();
  const minSpend = parseFloat($('min-spend').value || '0');
  const search = ($('rfq-search').value || '').trim().toLowerCase();
  const tierFilter = ($('tier-filter') ? $('tier-filter').value : 'all');
  const includeFilter = ($('include-filter') ? $('include-filter').value : 'all');

  // filter
  let filtered = items.filter(it => {
    const sp = wKey === 'all' ? it.spend_all : it[`spend${wKey}`];
    if ((sp || 0) < minSpend) return false;
    if (search) {
      const hay = `${it.item_num} ${it.mfg_pn} ${it.description} ${it.mfg_name}`.toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    if (tierFilter === 'STRONG' && it.tier !== 'STRONG') return false;
    if (tierFilter === 'STRONG_MODERATE' && it.tier !== 'STRONG' && it.tier !== 'MODERATE') return false;
    if (tierFilter === 'WEAK' && it.tier !== 'WEAK' && it.tier !== 'SKIP') return false;
    if (includeFilter === 'included' && !it.included) return false;
    if (includeFilter === 'excluded' && it.included) return false;
    return true;
  });
  // sort by current-window spend desc
  filtered.sort((a, b) => {
    const sa = wKey === 'all' ? a.spend_all : a[`spend${wKey}`];
    const sb = wKey === 'all' ? b.spend_all : b[`spend${wKey}`];
    return (sb || 0) - (sa || 0);
  });

  $('rfq-count').textContent = `${filtered.length.toLocaleString()} of ${items.length.toLocaleString()} items shown`;

  // Exact pennies on every $ value, no rounding — per ryan: RFQs need precision
  const fmt = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty = (n) => n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  let head = `<tr>
    <th class="cell-include">RFQ</th>
    <th>Item #</th>
    <th>Tier</th>
    <th>Description</th>
    <th>MFG</th>
    <th>MFG PN</th>
    <th class="num">12mo qty</th>
    <th class="num">12mo $</th>
    <th class="num">24mo qty</th>
    <th class="num">24mo $</th>
    <th class="num">36mo qty</th>
    <th class="num">36mo $</th>
    <th class="num">Last $/ea</th>
    <th>UOM</th>
    <th>Last order</th>
  </tr>`;
  $('rfq-table').querySelector('thead').innerHTML = head;

  let rows = '';
  // Render at most 500 rows in DOM at once (perf); show a "+N more" hint if larger
  const cap = 500;
  const slice = filtered.slice(0, cap);
  const tierColor = (t) => t === 'STRONG' ? 'var(--green)' : t === 'MODERATE' ? 'var(--accent)' : t === 'WEAK' ? 'var(--cyan)' : 'var(--red)';
  for (const it of slice) {
    const flags = [];
    if (it.uom_mixed) flags.push('<span class="flag-chip warn" title="More than one UOM in history">UOM mixed</span>');
    if (!it.mfg_name) flags.push('<span class="flag-chip warn" title="Manufacturer name missing">MFG blank</span>');
    for (const df of (it.desc_flags || [])) {
      const label = df.toUpperCase();
      if (_RED_DESC_FLAGS.has(df)) {
        flags.push(`<span class="flag-chip red" title="Description suggests this is a ${df} line — usually doesn't belong in an RFQ. Smart-trim will untick.">${label}</span>`);
      } else if (df === 'custom' || df === 'misc' || df === 'repair') {
        flags.push(`<span class="flag-chip warn" title="Description pattern suggests caution before including in RFQ">${label}</span>`);
      }
      // 'generic' is informational only — not rendered as a chip (would
      // clutter on McMaster data where 90% of items are generic).
    }
    // Demand-pattern flags (compact)
    const demandLabels = {
      DORMANT_12MO:    {short: 'DORM',   color: 'red',  hover: 'No orders in the last 12 months but older usage exists'},
      DEMAND_DROP_50:  {short: 'DROP',   color: 'warn', hover: '12-mo demand dropped >50% vs prior year'},
      DEMAND_SURGE_50: {short: 'SURGE',  color: 'warn', hover: '12-mo demand surged >50% vs prior year — verify the new baseline'},
      SINGLE_ORDER:    {short: '1×',     color: 'red',  hover: 'Item has only ever been ordered once — likely one-off, not RFQ-worthy'},
      FEW_ORDERS:      {short: '2×',     color: 'warn', hover: 'Item has only been ordered twice — may not warrant a long-term contract'},
      STALE_OVER_12MO: {short: 'STALE',  color: 'warn', hover: 'Last order was more than 12 months ago'},
    };
    for (const dmf of (it.demand_flags || [])) {
      const meta = demandLabels[dmf];
      if (!meta) continue;
      flags.push(`<span class="flag-chip ${meta.color}" title="${meta.hover}">${meta.short}</span>`);
    }
    const tier = it.tier || 'WEAK';
    const score = it.score != null ? it.score : 0;
    const tierC = tierColor(tier);
    const reasons = (it.score_reasons || []).join('; ');
    rows += `<tr data-item="${_escapeHtml(it.item_num)}" class="${it.included ? '' : 'excluded'}">
      <td class="cell-include"><input type="checkbox" ${it.included ? 'checked' : ''} data-toggle="${_escapeHtml(it.item_num)}"></td>
      <td><code>${_escapeHtml(it.item_num)}</code></td>
      <td><span class="flag-chip" style="background:transparent;color:${tierC};border:1px solid ${tierC};font-weight:600;" title="Score ${score}/100${reasons ? ' — ' + reasons.replace(/"/g,'') : ''}">${tier} ${score}</span></td>
      <td class="cell-desc">${_escapeHtml(it.description)} ${flags.join(' ')}</td>
      <td class="cell-mfg">${_escapeHtml(it.mfg_name || '')}</td>
      <td><code>${_escapeHtml(it.mfg_pn || '')}</code></td>
      <td class="num">${fmtQty(it.qty_12mo)}</td>
      <td class="num">${fmt(it.spend_12mo)}</td>
      <td class="num">${fmtQty(it.qty_24mo)}</td>
      <td class="num">${fmt(it.spend_24mo)}</td>
      <td class="num">${fmtQty(it.qty_36mo)}</td>
      <td class="num">${fmt(it.spend_36mo)}</td>
      <td class="num">${fmt(it.last_unit_price)}</td>
      <td>${_escapeHtml(it.uom || '')}</td>
      <td>${it.last_order ? it.last_order : '—'}</td>
    </tr>`;
  }
  if (filtered.length > cap) {
    rows += `<tr><td colspan="15" style="padding:14px;text-align:center;color:var(--ink-2)">… and ${(filtered.length - cap).toLocaleString()} more rows hidden (narrow filters or use the export)</td></tr>`;
  }
  $('rfq-table').querySelector('tbody').innerHTML = rows;

  // wire include toggles
  $('rfq-table').querySelectorAll('input[data-toggle]').forEach(cb => {
    cb.addEventListener('change', () => {
      const k = cb.getAttribute('data-toggle');
      const it = _rfqResult.items.find(x => x.item_num === k);
      if (it) it.included = cb.checked;
      cb.closest('tr').classList.toggle('excluded', !cb.checked);
      _saveMgr.markDirty();
    });
  });

  // Click row (anywhere except the include checkbox) → open per-item history modal
  $('rfq-table').querySelectorAll('tbody tr[data-item]').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', (e) => {
      // Ignore clicks on the checkbox cell
      if (e.target.closest('.cell-include')) return;
      const itemNum = tr.getAttribute('data-item');
      _openItemHistory(itemNum);
    });
  });
}

['active-window', 'min-spend', 'rfq-search', 'tier-filter', 'include-filter'].forEach(id => {
  const el = $(id);
  if (!el) return;
  const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(evt, () => { _renderRfqTable(); _saveMgr.markDirty(); });
});

// Bulk include/exclude/smart-trim actions
const _RED_DESC_FLAGS = new Set(['service', 'freight', 'tariff', 'obsolete', 'rental']);

function _bulkSetIncluded(target) {
  if (!_rfqResult) return;
  const items = _rfqResult.items;
  const wKey = _activeWindowKey();
  const minSpend = parseFloat($('min-spend').value || '0');
  const search = ($('rfq-search').value || '').trim().toLowerCase();
  const tierFilter = $('tier-filter') ? $('tier-filter').value : 'all';
  const includeFilter = $('include-filter') ? $('include-filter').value : 'all';
  let touched = 0;
  for (const it of items) {
    const sp = wKey === 'all' ? it.spend_all : it[`spend${wKey}`];
    if ((sp || 0) < minSpend) continue;
    if (search) {
      const hay = `${it.item_num} ${it.mfg_pn} ${it.description} ${it.mfg_name}`.toLowerCase();
      if (hay.indexOf(search) === -1) continue;
    }
    if (tierFilter === 'STRONG' && it.tier !== 'STRONG') continue;
    if (tierFilter === 'STRONG_MODERATE' && it.tier !== 'STRONG' && it.tier !== 'MODERATE') continue;
    if (tierFilter === 'WEAK' && it.tier !== 'WEAK' && it.tier !== 'SKIP') continue;
    if (includeFilter === 'included' && !it.included) continue;
    if (includeFilter === 'excluded' && it.included) continue;
    if (it.included !== target) {
      it.included = target;
      touched++;
    }
  }
  return touched;
}

if ($('bulk-include-all')) {
  $('bulk-include-all').addEventListener('click', () => {
    const n = _bulkSetIncluded(true);
    $('trim-status').textContent = `Included ${n.toLocaleString()} items.`;
    _renderRfqTable();
    _saveMgr.markDirty();
  });
}
if ($('bulk-exclude-all')) {
  $('bulk-exclude-all').addEventListener('click', () => {
    const n = _bulkSetIncluded(false);
    $('trim-status').textContent = `Excluded ${n.toLocaleString()} items.`;
    _renderRfqTable();
    _saveMgr.markDirty();
  });
}
if ($('smart-trim')) {
  $('smart-trim').addEventListener('click', () => {
    if (!_rfqResult) return;
    if (!confirm(
      'Smart trim will untick:\n' +
      '  • Items in WEAK or SKIP tier (low spend / few orders / poor data)\n' +
      '  • Items with concerning description patterns (service / freight / tariff / obsolete / rental)\n\n' +
      'You can re-tick individual items afterward. Proceed?'
    )) return;
    let trimmed = 0;
    let kept = 0;
    for (const it of _rfqResult.items) {
      const isWeak = (it.tier === 'WEAK' || it.tier === 'SKIP');
      const dflags = it.desc_flags || [];
      const hasRedFlag = dflags.some(f => _RED_DESC_FLAGS.has(f));
      if ((isWeak || hasRedFlag) && it.included) {
        it.included = false;
        trimmed++;
      } else if (it.included) {
        kept++;
      }
    }
    $('trim-status').textContent = `Trimmed ${trimmed.toLocaleString()} items · ${kept.toLocaleString()} still included`;
    _renderRfqTable();
    _saveMgr.markDirty();
  });
}

// ==========================================================================
// Charts (table-first; charts live below the table per ryan's rule)
// ==========================================================================
function _renderCharts() {
  if (!_rfqResult) return;
  const stage = $('charts-stage');
  stage.innerHTML = `
    <div class="chart-card">
      <h3>Top 15 items by 24-mo spend</h3>
      <svg class="chart-svg" id="chart-top"></svg>
    </div>
    <div class="chart-card">
      <h3>Annual spend by year</h3>
      <svg class="chart-svg" id="chart-annual"></svg>
    </div>
  `;
  _drawTopBars();
  _drawAnnualBars();
}

function _drawTopBars() {
  const svg = $('chart-top');
  if (!svg || !_rfqResult) return;
  const top = [..._rfqResult.items].sort((a, b) => (b.spend_24mo || 0) - (a.spend_24mo || 0)).slice(0, 15);
  const W = svg.clientWidth || 500, H = 240;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const padL = 110, padR = 12, padT = 10, padB = 24;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...top.map(it => it.spend_24mo || 0));
  let s = '';
  const barH = innerH / Math.max(1, top.length) - 3;
  top.forEach((it, i) => {
    const w = (it.spend_24mo || 0) / max * innerW;
    const y = padT + i * (barH + 3);
    s += `<rect class="bar" x="${padL}" y="${y}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" rx="2"/>`;
    const lbl = _truncate(it.item_num, 14);
    s += `<text x="${padL - 6}" y="${y + barH / 2 + 3}" text-anchor="end" font-size="10" fill="var(--ink-1)" font-family="var(--mono)">${_escapeHtml(lbl)}</text>`;
    s += `<text x="${padL + w + 4}" y="${y + barH / 2 + 3}" font-size="10" fill="var(--ink-2)" font-family="var(--mono)">$${Math.round(it.spend_24mo || 0).toLocaleString()}</text>`;
  });
  svg.innerHTML = s;
}

function _drawAnnualBars() {
  const svg = $('chart-annual');
  if (!svg || !_rfqResult) return;
  const series = _rfqResult.annual_spend || [];
  const W = svg.clientWidth || 500, H = 240;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const padL = 50, padR = 12, padT = 14, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  if (!series.length) { svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="var(--ink-2)">no data</text>`; return; }
  const max = Math.max(1, ...series.map(d => d.spend));
  const bw = innerW / series.length - 6;
  let s = '';
  series.forEach((d, i) => {
    const h = d.spend / max * innerH;
    const x = padL + i * (bw + 6);
    const y = padT + (innerH - h);
    s += `<rect class="bar" x="${x}" y="${y}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
    s += `<text x="${x + bw/2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="var(--mono)">${d.year}</text>`;
    s += `<text x="${x + bw/2}" y="${y - 4}" text-anchor="middle" font-size="10" fill="var(--ink-1)" font-family="var(--mono)">$${(d.spend / 1000).toFixed(0)}k</text>`;
  });
  svg.innerHTML = s;
}

// ==========================================================================
// Export candidate RFQ list (xlsx)
// ==========================================================================
$('gen-outbound-rfq').addEventListener('click', async () => {
  if (!_rfqResult) return;
  const includedKeys = _rfqResult.items.filter(it => it.included).map(it => it.item_num);
  if (!includedKeys.length) { alert('No items marked included. Tick at least one row.'); return; }

  const supplierBlock = prompt(
    `Generate outbound RFQ xlsx files for ${includedKeys.length.toLocaleString()} included items.\n\n` +
    `Enter supplier names (one per line):`,
    'Grainger\nFastenal\nMSC'
  );
  if (!supplierBlock) return;
  const suppliers = supplierBlock.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!suppliers.length) return;

  const today = new Date();
  const rfqId = prompt('RFQ ID:', `RFQ-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-001`);
  if (!rfqId) return;

  const dueDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const dueDate = prompt('Response due date (YYYY-MM-DD):', dueDefault);
  if (!dueDate) return;

  const btn = $('gen-outbound-rfq');
  btn.disabled = true;
  const orig = btn.textContent;
  try {
    for (const sup of suppliers) {
      btn.textContent = `Building ${sup}…`;
      _py.globals.set('_outbound_supplier', sup);
      _py.globals.set('_outbound_rfq_id', rfqId);
      _py.globals.set('_outbound_due', dueDate);
      _py.globals.set('_outbound_keys', includedKeys);
      const xlsxB64 = await _py.runPythonAsync(`
import base64
from app_engine import gen_outbound_rfq_xlsx
_b = gen_outbound_rfq_xlsx(_outbound_supplier, rfq_id=_outbound_rfq_id,
                            response_due_date=_outbound_due,
                            included_keys=_outbound_keys.to_py())
base64.b64encode(_b).decode('ascii')
`);
      const bytes = Uint8Array.from(atob(xlsxB64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeSup = sup.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `${rfqId}_${safeSup}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      // Stagger downloads slightly so the browser doesn't choke
      await new Promise(r => setTimeout(r, 300));
    }
    btn.textContent = `✓ Sent ${suppliers.length} files`;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
  } catch (err) {
    console.error('[outbound RFQ]', err);
    alert('Outbound RFQ generation failed: ' + (err.message || err));
    btn.textContent = orig;
    btn.disabled = false;
  }
});

$('export-rfq-list').addEventListener('click', async () => {
  if (!_rfqResult) return;
  const btn = $('export-rfq-list');
  btn.disabled = true;
  const t = btn.textContent;
  btn.textContent = 'Building xlsx…';
  try {
    const incl = _rfqResult.items.filter(it => it.included).map(it => it.item_num);
    _py.globals.set('_incl_ids', incl);
    const xlsxB64 = await _py.runPythonAsync(`
import base64
from app_engine import gen_candidate_rfq_list_xlsx
_b = gen_candidate_rfq_list_xlsx(_incl_ids.to_py())
base64.b64encode(_b).decode('ascii')
`);
    const bytes = Uint8Array.from(atob(xlsxB64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stem = (_exportFile && _exportFile.name) ? _exportFile.name.replace(/\.xlsx$/i, '') : 'rfq';
    a.href = url; a.download = `RFQ_candidate_list_${stem}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error('[export rfq list] failed', err);
    alert('Export failed: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.textContent = t;
  }
});

// ==========================================================================
// Thresholds settings modal — exposes the engine knobs to the user.
// ==========================================================================
const THRESHOLD_FIELDS = [
  { key: 'carve_out_min_savings_pct',     label: 'Carve-out min savings',          unit: '%', step: 0.05, min: 0, max: 1, scale: 100, hint: 'A different supplier wins a carve-out only if they save at least this fraction of the consolidation winner\'s price.' },
  { key: 'pushback_threshold_pct',        label: 'Push-back threshold',            unit: '%', step: 0.01, min: 0, max: 1, scale: 100, hint: 'Quote >X% above your historical paid price gets a PUSH_BACK recommendation.' },
  { key: 'min_savings_pct_to_switch',     label: 'Min savings to switch supplier', unit: '%', step: 0.01, min: 0, max: 1, scale: 100, hint: 'Below this savings %, MANUAL_REVIEW instead of ACCEPT — avoids switching for trivial savings.' },
  { key: 'outlier_factor',                label: 'Outlier multiplier',             unit: '×', step: 0.5,  min: 1.5, max: 10, scale: 1, hint: 'A bid is an outlier if >= Nx the median bid OR <= 1/N of median.' },
  { key: 'spike_factor',                  label: 'Price-spike multiplier',         unit: '×', step: 0.1,  min: 1.1, max: 10, scale: 1, hint: 'On the per-item chart, latest price is a "spike" if >= Nx the 90-day median.' },
  { key: 'uom_suspect_ratio',             label: 'UOM-suspect price ratio',        unit: '×', step: 1,    min: 5, max: 100, scale: 1, hint: 'Carve-out savings flagged "verify UOM" if winner-vs-carve price ratio exceeds this. Catches per-each vs per-package errors.' },
  { key: 'max_acceptable_lead_time_days', label: 'Max acceptable lead time',       unit: 'd', step: 1,    min: 1, max: 365, scale: 1, hint: 'Bids with lead time above this get flagged in award filtering.' },
  { key: 'high_spend_no_bid_threshold',   label: 'High-spend no-bid threshold',    unit: '$', step: 100,  min: 0, max: 100000, scale: 1, hint: 'No-bid items with 24-mo spend above this get a follow-up flag (worth chasing).' },
  { key: 'min_spend_for_review',          label: 'Min spend for review',           unit: '$', step: 50,   min: 0, max: 10000, scale: 1, hint: 'Items below this 24-mo spend may not warrant manual review effort.' },
];

async function _openThresholdsModal() {
  if (!_pyAppLoaded) { alert('Python is still loading. Try again in a moment.'); return; }
  const cur = JSON.parse(await _py.runPythonAsync(`
import json
from app_engine import get_thresholds
json.dumps(get_thresholds())
`));
  let modal = document.getElementById('thresholds-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'thresholds-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const rows = THRESHOLD_FIELDS.map(f => {
    const v = cur[f.key];
    const display = v != null ? (v * f.scale).toString() : '';
    return `<tr style="border-bottom:1px solid var(--line);">
      <td style="padding:14px 16px 6px;">
        <div style="font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ink-0);">${_escapeHtml(f.label)}</div>
        <div style="font-family:var(--ui);font-size:11px;color:var(--ink-2);margin-top:2px;line-height:1.4;max-width:480px;">${_escapeHtml(f.hint)}</div>
      </td>
      <td style="padding:14px 16px 6px;text-align:right;white-space:nowrap;">
        <input type="number" data-th-key="${_escapeHtml(f.key)}" data-th-scale="${f.scale}" value="${_escapeHtml(display)}" step="${f.step}" min="${f.min*f.scale}" max="${f.max*f.scale}" style="width:100px;background:var(--bg-2);color:var(--ink-0);border:1px solid var(--line);border-radius:4px;padding:6px 8px;font-family:var(--mono);font-size:13px;text-align:right;">
        <span style="color:var(--ink-2);font-family:var(--mono);font-size:12px;margin-left:6px;">${f.unit}</span>
      </td>
    </tr>`;
  }).join('');
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:760px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 14px;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">PROJECT SETTINGS</div>
          <div style="font-size:22px;font-weight:600;color:var(--ink-0);">Recommendation thresholds</div>
          <div style="font-size:13px;color:var(--ink-1);margin-top:6px;">Tune the engine. Changes apply to the recommendation engine, the consolidation analysis, and the per-item spike detection. Persisted with the session.</div>
        </div>
        <button id="th-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:var(--ui);">${rows}</table>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding:18px 26px;border-top:1px solid var(--line);">
        <button class="btn ghost" id="th-reset" type="button">Reset to defaults</button>
        <button class="btn ghost" id="th-cancel" type="button">Cancel</button>
        <button class="btn primary" id="th-save" type="button">Save & re-run</button>
      </div>
    </div>
  `;
  document.getElementById('th-close').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('th-cancel').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('th-reset').addEventListener('click', async () => {
    if (!confirm('Reset all thresholds to defaults?')) return;
    await _py.runPythonAsync(`
from app_engine import reset_thresholds
reset_thresholds()
None
`);
    modal.style.display = 'none';
    _saveMgr.markDirty();
    await _refreshBidViews();
  });
  document.getElementById('th-save').addEventListener('click', async () => {
    const updates = {};
    modal.querySelectorAll('input[data-th-key]').forEach(input => {
      const key = input.getAttribute('data-th-key');
      const scale = parseFloat(input.getAttribute('data-th-scale')) || 1;
      const raw = parseFloat(input.value);
      if (!isNaN(raw)) updates[key] = raw / scale;
    });
    _py.globals.set('_th_updates', updates);
    await _py.runPythonAsync(`
from app_engine import set_thresholds
set_thresholds(_th_updates.to_py())
None
`);
    modal.style.display = 'none';
    _saveMgr.markDirty();
    // Re-render any views that depend on thresholds
    if (_rfqResult) {
      _renderRfqTable();
    }
    if (Object.keys(_loadedBids).length) {
      await _refreshBidViews();
    }
  });
}

if ($('open-settings')) {
  $('open-settings').addEventListener('click', _openThresholdsModal);
}

async function _openAuditModal() {
  if (!_pyAppLoaded) { alert('Python is still loading. Try again in a moment.'); return; }
  const json = await _py.runPythonAsync(`
import json
from app_engine import list_audit_log
json.dumps(list_audit_log(200), default=str)
`);
  const entries = JSON.parse(json);
  let modal = document.getElementById('audit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'audit-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  let body = '';
  if (!entries.length) {
    body = '<div style="padding:40px;text-align:center;color:var(--ink-2);font-family:var(--mono);font-size:13px;">No audit events yet. Drop a file or save a scenario to start the log.</div>';
  } else {
    body = '<table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12px;">';
    body += '<thead style="background:var(--bg-2);position:sticky;top:0;"><tr>';
    body += '<th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">When</th>';
    body += '<th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Action</th>';
    body += '<th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Detail</th>';
    body += '<th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Related</th>';
    body += '</tr></thead><tbody>';
    for (const e of entries) {
      const ts = (e.timestamp || '').slice(0, 19).replace('T', ' ');
      body += `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:8px 14px;color:var(--ink-2);">${_escapeHtml(ts)}</td>
        <td style="padding:8px 14px;color:var(--accent);">${_escapeHtml(e.action_type || '')}</td>
        <td style="padding:8px 14px;color:var(--ink-1);">${_escapeHtml(e.action_detail || '')}</td>
        <td style="padding:8px 14px;color:var(--cyan);">${_escapeHtml(e.related || '')}</td>
      </tr>`;
    }
    body += '</tbody></table>';
  }
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:1000px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 14px;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">SESSION ACTIVITY</div>
          <div style="font-size:22px;font-weight:600;color:var(--ink-0);">Audit log</div>
          <div style="font-size:13px;color:var(--ink-1);margin-top:6px;">${entries.length} most-recent action${entries.length === 1 ? '' : 's'}. Persisted with the session save state.</div>
        </div>
        <button id="audit-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <div style="overflow:auto;flex:1;">${body}</div>
    </div>
  `;
  document.getElementById('audit-close').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

if ($('open-audit')) {
  $('open-audit').addEventListener('click', _openAuditModal);
}

// ---------- User profile modal ----------
async function _openProfileModal() {
  if (!_pyAppLoaded) { alert('Python is still loading. Try again in a moment.'); return; }
  const profile = JSON.parse(await _py.runPythonAsync(`
import json
from app_engine import get_user_profile
json.dumps(get_user_profile())
`));
  let modal = document.getElementById('profile-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const fld = (label, key, hint) => `
    <div style="margin-bottom:14px;">
      <label style="display:block;font-size:11px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:6px;">${label}</label>
      <input type="text" data-profile-key="${key}" value="${_escapeHtml(profile[key] || '')}" style="width:100%;background:var(--bg-2);color:var(--ink-0);border:1px solid var(--line);border-radius:4px;padding:10px 12px;font-family:var(--ui);font-size:14px;">
      ${hint ? `<div style="font-size:11px;color:var(--ink-2);margin-top:4px;font-style:italic;">${_escapeHtml(hint)}</div>` : ''}
    </div>
  `;
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:560px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 14px;border-bottom:1px solid var(--line);">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">YOUR PROFILE</div>
          <div style="font-size:22px;font-weight:600;color:var(--ink-0);">Operator information</div>
          <div style="font-size:13px;color:var(--ink-1);margin-top:6px;">Used as the contact on outbound RFQ files, supplier follow-up packets, and award letters. Persisted with the session.</div>
        </div>
        <button id="prof-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <div style="padding:22px 26px;">
        ${fld('Your name', 'name', 'How you appear to suppliers — e.g. "Jane Doe"')}
        ${fld('Your email', 'email', 'Where suppliers should send responses')}
        ${fld('Your title', 'title', 'Optional — e.g. "Procurement Analyst"')}
        ${fld('Company', 'company', 'Default: Andersen')}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 26px;border-top:1px solid var(--line);">
        <button class="btn ghost" id="prof-cancel" type="button">Cancel</button>
        <button class="btn primary" id="prof-save" type="button">Save profile</button>
      </div>
    </div>
  `;
  document.getElementById('prof-close').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('prof-cancel').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('prof-save').addEventListener('click', async () => {
    const updates = {};
    modal.querySelectorAll('input[data-profile-key]').forEach(input => {
      updates[input.getAttribute('data-profile-key')] = input.value.trim();
    });
    _py.globals.set('_profile_updates', updates);
    await _py.runPythonAsync(`
from app_engine import set_user_profile
set_user_profile(_profile_updates.to_py())
`);
    modal.style.display = 'none';
    _saveMgr.markDirty();
  });
}
if ($('open-profile')) {
  $('open-profile').addEventListener('click', _openProfileModal);
}

// ---------- Reopen previous session (Step 1 affordance) ----------
if ($('reopen-from-file')) {
  $('reopen-from-file').addEventListener('click', () => {
    $('reopen-file-input').click();
  });
}
if ($('reopen-file-input')) {
  $('reopen-file-input').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const state = await _saveMgr.loadFromFile(f);
      const banner = document.createElement('div');
      banner.style.cssText = 'margin-top:14px;padding:12px 16px;background:rgba(125,216,122,0.08);border:1px solid var(--green);border-radius:4px;color:var(--green);font-family:var(--mono);font-size:12px;';
      banner.innerHTML = `✓ Restored session <strong>${_escapeHtml(state.rfq_id || 'unknown')}</strong>. ${state.source ? `Now drop the source file <code>${_escapeHtml(state.source.name)}</code> (or any compatible export) to re-extract the items.` : 'Drop a source xlsx to continue.'}`;
      $('reopen-block').appendChild(banner);
      setTimeout(() => banner.remove(), 12000);
    } catch (err) {
      console.error('[reopen]', err);
      alert('Restore failed: ' + (err.message || err));
    }
  });
}

// ==========================================================================
// Step 4 — Returned-bid intake + comparison matrix + consolidation
// ==========================================================================
let _loadedBids = {};   // {supplier_name: parsed_result}

async function _onAddBidClick() {
  const input = $('bid-file-input');
  input.value = '';
  input.click();
}

async function _onBidFileSelected(file) {
  if (!file) return;
  // Suggest supplier name from filename (strip extension + dates + RFQ tags)
  const stem = file.name.replace(/\.xlsx$/i, '');
  const suggest = stem
    .replace(/^Andersen[\s_-]*/i, '')
    .replace(/[\s_-]*RFQ.*/i, '')
    .replace(/[\s_-]*\d+[\.\-]\d+.*/g, '')
    .replace(/[\s_-]+/g, ' ')
    .trim() || stem;
  const name = prompt(`Supplier name for "${file.name}":`, suggest);
  if (!name) return;

  // Read + parse
  $('bid-add-btn').disabled = true;
  $('bid-add-btn').textContent = 'Parsing…';
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    _py.globals.set('_bid_bytes', bytes);
    _py.globals.set('_bid_supplier', name);
    const out = await _py.runPythonAsync(`
import json
from app_engine import ingest_supplier_bid
json.dumps(ingest_supplier_bid(_bid_bytes.to_py(), _bid_supplier), default=str)
`);
    const parsed = JSON.parse(out);
    _loadedBids[name] = parsed;
    _saveMgr.markDirty();
    await _refreshBidViews();
  } catch (err) {
    console.error('[bid intake] failed', err);
    alert('Failed to parse bid file: ' + (err.message || err));
  } finally {
    $('bid-add-btn').disabled = false;
    $('bid-add-btn').textContent = '＋ Add supplier bid xlsx';
  }
}

$('bid-add-btn').addEventListener('click', _onAddBidClick);
$('bid-file-input').addEventListener('change', (e) => _onBidFileSelected(e.target.files[0]));
$('bid-clear-btn').addEventListener('click', async () => {
  if (!confirm('Clear all loaded supplier bids?')) return;
  _loadedBids = {};
  await _py.runPythonAsync(`
from app_engine import _STATE
_STATE['bids'] = {}
None
`);
  _saveMgr.markDirty();
  await _refreshBidViews();
});

async function _refreshBidViews() {
  _renderBidIntakeRow();
  _renderBidSummary();
  await _refreshConsolidationAndMatrix();
}

function _renderBidIntakeRow() {
  const wrap = $('bid-intake-row');
  if (!wrap) return;
  const suppliers = Object.keys(_loadedBids);
  if (!suppliers.length) {
    wrap.innerHTML = `<div style="padding:32px;text-align:center;color:var(--ink-2);border:1px dashed var(--line);border-radius:6px;font-family:var(--ui);">No supplier bids loaded yet. Click "Add supplier bid xlsx" below.</div>`;
    return;
  }
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">';
  for (const sup of suppliers) {
    const p = _loadedBids[sup];
    const s = p.summary || {};
    html += `
      <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:6px;padding:18px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;">
          <div style="font-family:var(--ui);font-weight:600;font-size:16px;color:var(--ink-0);">${_escapeHtml(sup)}</div>
          <button class="btn ghost" data-remove-supplier="${_escapeHtml(sup)}" style="padding:4px 10px;font-size:11px;">×</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;font-family:var(--mono);font-size:11px;">
          <div><span style="color:var(--ink-2);">Lines</span> <strong style="color:var(--ink-0);">${(s.n_lines||0).toLocaleString()}</strong></div>
          <div><span style="color:var(--ink-2);">Priced</span> <strong style="color:var(--green);">${(s.n_priced||0).toLocaleString()}</strong></div>
          <div><span style="color:var(--ink-2);">No bid</span> <strong style="color:var(--ink-1);">${(s.n_no_bid||0).toLocaleString()}</strong></div>
          <div><span style="color:var(--ink-2);">Need info</span> <strong style="color:var(--accent);">${(s.n_need_info||0).toLocaleString()}</strong></div>
          <div><span style="color:var(--ink-2);">UOM disc</span> <strong style="color:var(--red);">${(s.n_uom_disc||0).toLocaleString()}</strong></div>
          <div><span style="color:var(--ink-2);">Sub offered</span> <strong style="color:var(--cyan);">${(s.n_substitute||0).toLocaleString()}</strong></div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-family:var(--mono);font-size:13px;">
          <span style="color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Quoted value</span><br>
          <strong style="color:var(--accent);font-size:18px;">$${(s.total_quoted_value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn ghost" data-followup-supplier="${_escapeHtml(sup)}" style="padding:6px 12px;font-size:11px;">⬇ Follow-up xlsx</button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  wrap.innerHTML = html;
  wrap.querySelectorAll('[data-remove-supplier]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sup = btn.getAttribute('data-remove-supplier');
      delete _loadedBids[sup];
      await _py.runPythonAsync(`
from app_engine import remove_supplier_bid
remove_supplier_bid(${JSON.stringify(sup)})
`);
      _saveMgr.markDirty();
      await _refreshBidViews();
    });
  });
  wrap.querySelectorAll('[data-followup-supplier]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sup = btn.getAttribute('data-followup-supplier');
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = 'Building…';
      try {
        _py.globals.set('_followup_supplier', sup);
        const xlsxB64 = await _py.runPythonAsync(`
import base64
from app_engine import gen_supplier_followup_xlsx
_b = gen_supplier_followup_xlsx(_followup_supplier)
base64.b64encode(_b).decode('ascii')
`);
        const bytes = Uint8Array.from(atob(xlsxB64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeSup = sup.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ts = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `Followup_${safeSup}_${ts}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      } catch (err) {
        console.error('[followup xlsx]', err);
        alert('Follow-up xlsx generation failed: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  });
}

function _renderBidSummary() {
  const wrap = $('bid-summary-row');
  if (!wrap) { return; }
  if (!Object.keys(_loadedBids).length) { wrap.innerHTML = ''; return; }
  // wait for async render
}

async function _refreshConsolidationAndMatrix() {
  const consolEl = $('consolidation-block');
  const compEl = $('comparison-section');
  const scenEl = $('scenarios-section');
  if (!Object.keys(_loadedBids).length) {
    consolEl.innerHTML = '';
    compEl.innerHTML = '';
    if (scenEl) scenEl.innerHTML = '';
    $('bid-summary-row').innerHTML = '';
    return;
  }
  consolEl.innerHTML = '<div style="padding:24px;color:var(--ink-2);font-family:var(--mono);font-size:12px;">Computing consolidation analysis…</div>';
  compEl.innerHTML = '';

  const out = await _py.runPythonAsync(`
import json
from app_engine import compute_comparison_matrix, compute_consolidation_analysis, list_award_scenarios, compute_clean_savings_summary
result = {
  "matrix": compute_comparison_matrix(),
  "consolidation": compute_consolidation_analysis(),
  "scenarios": list_award_scenarios(),
  "clean_savings": compute_clean_savings_summary(),
}
json.dumps(result, default=str)
`);
  const data = JSON.parse(out);
  _renderBidCoverageKPIs(data.matrix);
  _renderCleanSavingsPanel(data.clean_savings);
  _renderConsolidation(data.consolidation);
  _renderComparisonMatrix(data.matrix);
  _renderScenariosBlock(data.scenarios, data.consolidation);
}

// Renders the RAW / CLEAN / STRICT savings tiers as a panel below the bid-coverage KPIs.
// Added on the demo-existing-rfq branch to surface the "real" savings number for the
// Fastenal/Grainger/MSC RFQ demo where the RAW number is polluted by UOM mismatches.
//
// Tiers (per supplier + aggregate):
//   RAW    = current dashboard behavior — every priced bid contributes (UOM-mismatched lines too)
//   CLEAN  = excludes lines flagged UOM_DISC / NO_BID / NEED_INFO / SUBSTITUTE
//   STRICT = CLEAN + bid UOM matches history UOM after normalization
function _renderCleanSavingsPanel(clean) {
  if (!clean || !clean.by_supplier) return;
  const wrap = $('bid-summary-row');
  if (!wrap) return;

  // Remove any prior render (so re-runs don't duplicate)
  const prior = document.getElementById('clean-savings-panel');
  if (prior) prior.remove();

  const fmt$ = (n) => n == null ? '—' : (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const colorOf = (n) => n == null ? 'var(--ink-2)' : (n > 0 ? 'var(--green)' : (n < 0 ? 'var(--red)' : 'var(--ink-1)'));
  const t = clean.totals || {};

  let rowsHtml = '';
  for (const s of (clean.by_supplier || [])) {
    rowsHtml += `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:var(--ink-0);">${s.supplier}</td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:${colorOf(s.raw_savings)};">${fmt$(s.raw_savings)} <span style="color:var(--ink-2);font-size:11px;">(${s.n_raw})</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:${colorOf(s.clean_savings)};">${fmt$(s.clean_savings)} <span style="color:var(--ink-2);font-size:11px;">(${s.n_clean})</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:${colorOf(s.strict_savings)};font-weight:700;">${fmt$(s.strict_savings)} <span style="color:var(--ink-2);font-size:11px;font-weight:400;">(${s.n_strict})</span></td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);color:var(--ink-2);font-size:11px;">${s.n_excluded_by_status} status · ${s.n_excluded_by_uom} UOM</td>
      </tr>
    `;
  }

  // Count items still needing resolution for the toggle-button label
  const totalRecovered = (clean.by_supplier || []).reduce((a, s) => a + (s.n_resolved_by_annotation || 0), 0);
  const hasNormalized = (clean.totals || {}).normalized != null && Math.abs(clean.totals.normalized - clean.totals.strict) > 0.01;

  const html = `
    <div id="clean-savings-panel" style="margin-top:18px;padding:18px 20px;background:rgba(138,124,255,0.04);border:1px solid var(--line);border-radius:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:10px;">
        <div style="font-size:13px;color:var(--ink-2);">
          Savings tiers · totals:
          <span style="font-family:var(--mono);color:${colorOf(t.raw)};margin:0 6px;">RAW ${fmt$(t.raw)}</span>·
          <span style="font-family:var(--mono);color:${colorOf(t.clean)};margin:0 6px;">CLEAN ${fmt$(t.clean)}</span>·
          <span style="font-family:var(--mono);color:${colorOf(t.strict)};margin:0 6px;font-weight:700;">STRICT ${fmt$(t.strict)}</span>
          ${hasNormalized ? `· <span style="font-family:var(--mono);color:${colorOf(t.normalized)};margin:0 6px;font-weight:700;">NORMALIZED ${fmt$(t.normalized)}</span> <span style="color:var(--ink-2);font-size:11px;">(${totalRecovered} items recovered)</span>` : ''}
        </div>
        <button class="btn" id="uom-queue-open-btn" style="background:var(--warn);color:#000;font-weight:600;border:none;padding:8px 14px;font-size:12px;cursor:pointer;border-radius:4px;">
          📐 UOM Resolution Queue
        </button>
      </div>
      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--ink-0);user-select:none;">
          Savings comparison — full per-supplier breakdown
          <span style="color:var(--ink-2);font-size:11px;font-weight:400;margin-left:8px;">(click to expand · STRICT is the most defensible figure; NORMALIZED includes UOM-resolved items)</span>
        </summary>
        <div style="margin-top:14px;font-size:12px;color:var(--ink-2);line-height:1.5;">
          <strong style="color:var(--ink-0);">RAW</strong> = every priced bid (current behavior, polluted by UOM mismatches).
          <strong style="color:var(--ink-0);">CLEAN</strong> = excludes UOM_DISC / NO_BID / NEED_INFO / SUBSTITUTE statuses.
          <strong style="color:var(--ink-0);">STRICT</strong> = CLEAN + bid UOM equals history UOM (catches implicit mismatches).
          Positive = savings vs history. Negative = supplier more expensive.
        </div>
        <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--line);color:var(--ink-2);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">
              <th style="padding:6px 12px;text-align:left;">Supplier</th>
              <th style="padding:6px 12px;text-align:right;">RAW</th>
              <th style="padding:6px 12px;text-align:right;">CLEAN</th>
              <th style="padding:6px 12px;text-align:right;background:rgba(255,183,51,0.06);">STRICT</th>
              <th style="padding:6px 12px;text-align:right;">Excluded</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid var(--line);font-weight:700;">
              <td style="padding:10px 12px;color:var(--ink-0);">TOTAL</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--mono);color:${colorOf(t.raw)};">${fmt$(t.raw)}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--mono);color:${colorOf(t.clean)};">${fmt$(t.clean)}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--mono);color:${colorOf(t.strict)};background:rgba(255,183,51,0.06);">${fmt$(t.strict)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </details>
    </div>
  `;
  wrap.insertAdjacentHTML('afterend', html);
  // Wire up the UOM queue button
  const openBtn = document.getElementById('uom-queue-open-btn');
  if (openBtn) openBtn.addEventListener('click', _renderUomResolutionPanel);
}


// ============================================================================
// UOM Resolution Queue panel
// ----------------------------------------------------------------------------
// Renders an interactive table of items where the bid UOM doesn't match the
// history UOM. Per-row inline editor lets the analyst enter a conversion
// factor + direction, save / skip / mark needs-review. Saved annotations
// trigger a re-render of the clean-savings panel so the NORMALIZED total
// updates live.
//
// Built on the demo-existing-rfq branch to support the Fastenal+Grainger+MSC
// real-bid demo where UOM mismatches dominate the discrepancy bucket. The
// underlying Python helpers (set_uom_annotation, list_items_needing_uom_resolution,
// _extract_pack_size_from_notes, etc.) work without AI and are safe for the
// live deployed app — analysts type in factors based on offline catalog
// lookups.
// ============================================================================

async function _renderUomResolutionPanel() {
  const panel = document.getElementById('uom-resolution-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = '<div style="padding:24px;color:var(--ink-2);font-family:var(--mono);font-size:12px;">Loading UOM resolution queue…</div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const out = await _py.runPythonAsync(`
import json
from app_engine import list_items_needing_uom_resolution, get_uom_resolution_summary
result = {
  "queue": list_items_needing_uom_resolution(),
  "summary": get_uom_resolution_summary(),
}
json.dumps(result, default=str)
`);
  const data = JSON.parse(out);
  _renderUomQueueTable(data, panel);
}

function _renderUomQueueTable(data, panel) {
  const queue = data.queue || [];
  const sm = data.summary || {};
  _uomQueueCache = queue;  // cache for _findQueueEntryFromRow lookups
  const fmt$ = (n) => n == null ? '—' : '$' + (n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let rowsHtml = '';
  for (const q of queue) {
    const auto = q.auto_suggestion;
    const autoFactor = auto && auto.factor ? auto.factor : '';
    const autoConf = auto ? auto.confidence : '';
    const autoChip = auto ? (
      autoConf === 'high'
        ? `<span style="display:inline-block;padding:2px 6px;background:rgba(45,212,168,0.15);color:var(--green);border-radius:3px;font-size:10px;font-weight:600;margin-left:6px;">AUTO ✓ ${auto.factor || '?'}</span>`
        : `<span style="display:inline-block;padding:2px 6px;background:rgba(255,183,51,0.15);color:var(--warn);border-radius:3px;font-size:10px;font-weight:600;margin-left:6px;" title="Pattern matched but factor uncertain — confirm before applying">AUTO ? ${auto.raw_match}</span>`
    ) : '';
    const safeKey = (q.item_key + '|' + q.supplier).replace(/[^a-zA-Z0-9_-]/g, '_');
    rowsHtml += `
      <tr data-row-key="${safeKey}" style="border-bottom:1px solid var(--line);">
        <td style="padding:8px 10px;vertical-align:top;">
          <div style="font-family:var(--mono);font-size:12px;color:var(--ink-0);font-weight:600;">${q.item_num || '—'}</div>
          <div style="color:var(--ink-2);font-size:11px;margin-top:2px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(q.description || '').replace(/"/g,'&quot;')}">${(q.description || '').slice(0, 60)}</div>
        </td>
        <td style="padding:8px 10px;vertical-align:top;font-family:var(--mono);font-size:12px;">${q.supplier}</td>
        <td style="padding:8px 10px;vertical-align:top;font-family:var(--mono);font-size:11px;text-align:center;">
          <span style="color:var(--ink-1);">${q.hist_uom || '—'}</span>
          <span style="color:var(--ink-2);">≠</span>
          <span style="color:var(--warn);">${q.bid_uom || '—'}</span>
        </td>
        <td style="padding:8px 10px;vertical-align:top;font-family:var(--mono);font-size:12px;text-align:right;">
          <div style="color:var(--ink-1);">hist ${fmt$(q.hist_price)}</div>
          <div style="color:var(--warn);font-size:11px;margin-top:2px;">bid ${fmt$(q.bid_price)}</div>
        </td>
        <td style="padding:8px 10px;vertical-align:top;font-family:var(--mono);font-size:12px;text-align:right;">
          <div style="color:var(--ink-1);">${(q.qty_24mo || 0).toLocaleString()}</div>
          <div style="color:var(--ink-2);font-size:11px;margin-top:2px;">${fmt$(q.spend_24mo)}</div>
        </td>
        <td style="padding:8px 10px;vertical-align:top;max-width:240px;font-size:11px;color:var(--ink-2);">
          ${(q.notes || '').slice(0, 120)}${autoChip}
        </td>
        <td style="padding:8px 10px;vertical-align:top;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;gap:4px;align-items:center;">
              <span style="color:var(--ink-2);font-size:10px;">1 ${q.hist_uom || 'hist'} =</span>
              <input type="number" step="any" min="0" placeholder="${autoFactor || 'N'}" data-factor-input="${safeKey}" value="${autoFactor || ''}" style="width:70px;padding:4px 6px;background:var(--bg-1);color:var(--ink-0);border:1px solid var(--line);border-radius:3px;font-family:var(--mono);font-size:12px;">
              <span style="color:var(--ink-2);font-size:10px;">${q.bid_uom || 'bid'}</span>
            </div>
            <select data-direction-select="${safeKey}" style="padding:3px 5px;background:var(--bg-1);color:var(--ink-1);border:1px solid var(--line);border-radius:3px;font-size:11px;font-family:var(--mono);">
              <option value="auto_detect">auto-detect direction</option>
              <option value="multiply">multiply (supplier in smaller units)</option>
              <option value="divide">divide (supplier in larger units)</option>
            </select>
          </div>
        </td>
        <td style="padding:8px 10px;vertical-align:top;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn" data-uom-save="${safeKey}" style="background:var(--green);color:#000;border:none;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;border-radius:3px;">Save</button>
            <button class="btn ghost" data-uom-skip="${safeKey}" style="padding:4px 10px;font-size:11px;cursor:pointer;">Skip</button>
            <button class="btn ghost" data-uom-needs="${safeKey}" style="padding:4px 10px;font-size:11px;color:var(--warn);cursor:pointer;">Needs review</button>
          </div>
        </td>
      </tr>
    `;
  }

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px;">
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--ink-0);">📐 UOM Resolution Queue</div>
        <div style="font-size:11px;color:var(--ink-2);margin-top:4px;">
          Items where the bid's unit-of-measure differs from your history. Look up the McMaster catalog (or stockroom) to find the conversion factor, type it in below, hit Save. Item moves out of the queue and into the NORMALIZED savings tier. State persists with the save file — your colleague sees your resolutions when they open your shared backup.
        </div>
      </div>
      <button class="btn ghost" id="uom-queue-close-btn" style="padding:6px 12px;font-size:12px;">✕ Close panel</button>
    </div>
    <div style="display:flex;gap:18px;align-items:center;margin-bottom:14px;padding:10px 14px;background:rgba(0,0,0,0.15);border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--ink-1);">
      <span><strong style="color:var(--green);">${sm.n_resolved || 0}</strong> resolved</span>
      <span><strong style="color:var(--ink-2);">${sm.n_skipped || 0}</strong> skipped</span>
      <span><strong style="color:var(--warn);">${sm.n_needs_review || 0}</strong> needs review</span>
      <span style="margin-left:auto;"><strong style="color:var(--ink-0);">${sm.n_remaining || 0}</strong> remaining in queue</span>
      <span><strong style="color:var(--accent);">${sm.n_auto_resolvable || 0}</strong> have auto-suggestion</span>
    </div>
    ${queue.length === 0 ? `
      <div style="padding:32px;text-align:center;color:var(--ink-2);font-size:13px;">
        No items need UOM resolution right now. Either everything has been resolved/skipped, or your bid + history files don't have any UOM mismatches.
      </div>
    ` : `
      <div style="max-height:600px;overflow-y:auto;border:1px solid var(--line);border-radius:4px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead style="position:sticky;top:0;background:var(--bg-1);border-bottom:2px solid var(--line);z-index:1;">
            <tr style="color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">
              <th style="padding:8px 10px;text-align:left;">Item</th>
              <th style="padding:8px 10px;text-align:left;">Supplier</th>
              <th style="padding:8px 10px;text-align:center;">UOMs</th>
              <th style="padding:8px 10px;text-align:right;">Prices</th>
              <th style="padding:8px 10px;text-align:right;">24mo Qty / Spend</th>
              <th style="padding:8px 10px;text-align:left;">Notes</th>
              <th style="padding:8px 10px;text-align:left;">Conversion</th>
              <th style="padding:8px 10px;text-align:left;">Action</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `}
  `;

  // Wire close button
  document.getElementById('uom-queue-close-btn')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // Wire per-row buttons
  for (const btn of panel.querySelectorAll('[data-uom-save]')) {
    btn.addEventListener('click', () => _saveUomAnnotation(btn.dataset.uomSave, 'resolved'));
  }
  for (const btn of panel.querySelectorAll('[data-uom-skip]')) {
    btn.addEventListener('click', () => _saveUomAnnotation(btn.dataset.uomSkip, 'skipped'));
  }
  for (const btn of panel.querySelectorAll('[data-uom-needs]')) {
    btn.addEventListener('click', () => _saveUomAnnotation(btn.dataset.uomNeeds, 'needs_review'));
  }
}

async function _saveUomAnnotation(rowKey, status) {
  // Find the input + select for this row
  const factorInput = document.querySelector(`[data-factor-input="${rowKey}"]`);
  const dirSelect = document.querySelector(`[data-direction-select="${rowKey}"]`);
  if (!factorInput) return;
  const row = factorInput.closest('tr');
  if (!row) return;
  const queueEntry = _findQueueEntryFromRow(row);
  if (!queueEntry) {
    console.warn('Could not resolve queue entry from row', rowKey);
    return;
  }
  const rawFactor = factorInput.value;
  const factor = (status === 'resolved' && rawFactor) ? parseFloat(rawFactor) : null;
  if (status === 'resolved' && (!factor || factor <= 0)) {
    alert('Enter a positive conversion factor before saving as resolved. Or use Skip / Needs review.');
    return;
  }
  const direction = dirSelect ? dirSelect.value : 'auto_detect';

  _py.globals.set('_uom_args', {
    item_key: queueEntry.item_key,
    supplier: queueEntry.supplier,
    factor: factor,
    direction: direction,
    hist_uom: queueEntry.hist_uom || '',
    bid_uom: queueEntry.bid_uom || '',
    note: '',
    status: status,
    set_by: '',
  });
  await _py.runPythonAsync(`
from app_engine import set_uom_annotation
a = _uom_args.to_py()
set_uom_annotation(
  item_key=a['item_key'], supplier=a['supplier'],
  factor=a['factor'], direction=a['direction'],
  hist_uom=a['hist_uom'], bid_uom=a['bid_uom'],
  note=a['note'], status=a['status'], set_by=a['set_by'],
)
`);
  // Visual: fade the row out
  row.style.transition = 'opacity 250ms';
  row.style.opacity = '0.3';
  // Re-render the panel + the savings panel after a beat
  setTimeout(async () => {
    await _renderUomResolutionPanel();
    // Also recompute + re-render the clean savings panel above
    if (window._lastClean) {  // best-effort cache
      // Easiest: trigger a full re-fetch via the runComparisonAndScenarios pathway
    }
    // The cleanest re-render is to trigger _runComparisonAndScenarios — but that's
    // expensive. For now, just re-fetch the clean_savings and re-render the panel.
    const out = await _py.runPythonAsync(`
import json; from app_engine import compute_clean_savings_summary
json.dumps(compute_clean_savings_summary(), default=str)
`);
    _renderCleanSavingsPanel(JSON.parse(out));
  }, 280);
}

// In-memory cache of the last queue fetch — used to look up item_key + supplier
// from a row's data-row-key attribute when the user clicks Save.
let _uomQueueCache = [];
function _findQueueEntryFromRow(row) {
  // The row carries data-row-key="<item_key>|<supplier>" with non-alphanum
  // chars replaced by underscore. Fall back to scanning the cache.
  const safeKey = row.getAttribute('data-row-key');
  if (!safeKey) return null;
  for (const q of _uomQueueCache) {
    const candidate = (q.item_key + '|' + q.supplier).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (candidate === safeKey) return q;
  }
  return null;
}

// ----- Award scenarios block -----
function _renderScenariosBlock(scenarios, consol) {
  const el = $('scenarios-section');
  if (!el) return;
  const fmt$ = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n) => n == null ? '—' : (n).toFixed(1) + '%';

  let html = '<h2 style="margin-top:0;">Award scenarios</h2>';
  html += '<p class="subtitle" style="margin-bottom:18px;">Save named what-ifs (lowest-price / consolidate to one supplier / incumbent-preferred / qualified-only). Compare two side-by-side to see where the awards differ.</p>';

  // Quick-create row
  html += `<div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
    <button class="btn ghost" data-scenario-quick="lowest_price">＋ Lowest price</button>
    <button class="btn ghost" data-scenario-quick="lowest_qualified">＋ Lowest qualified (no UOM/sub)</button>`;
  // One consolidate-to button per supplier
  for (const sup of (Object.keys(_loadedBids) || [])) {
    html += `<button class="btn ghost" data-scenario-consolidate="${_escapeHtml(sup)}">＋ Consolidate to ${_escapeHtml(sup)}</button>`;
  }
  html += `<button class="btn ghost" data-scenario-quick="incumbent_preferred">＋ Incumbent preferred</button>`;
  html += `</div>`;

  if (!scenarios || !scenarios.length) {
    html += `<div style="padding:32px;text-align:center;color:var(--ink-2);border:1px dashed var(--line);border-radius:6px;font-family:var(--ui);">No scenarios saved yet. Click one of the buttons above to save your first what-if.</div>`;
    el.innerHTML = html;
    _wireScenarioButtons();
    return;
  }

  // Scenarios table
  html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:auto;margin-bottom:18px;"><table style="width:100%;border-collapse:collapse;font-size:13px;font-family:var(--mono);">';
  html += `<thead style="background:var(--bg-2);"><tr>
    <th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;"><input type="checkbox" id="scen-select-all" style="vertical-align:middle;margin-right:6px;">Name</th>
    <th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Strategy</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Items awarded</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Award total</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Historical</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Savings</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Switched</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Saved at</th>
    <th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;"></th>
  </tr></thead><tbody>`;
  for (const s of scenarios) {
    const t = s.totals || {};
    let stratLabel = s.strategy;
    if (s.strategy === 'consolidate_to' && s.parameters && s.parameters.supplier) {
      stratLabel = `consolidate → ${s.parameters.supplier}`;
    }
    html += `<tr style="border-bottom:1px solid var(--line);">
      <td style="padding:12px 14px;color:var(--ink-0);font-weight:600;"><input type="checkbox" class="scen-pick" data-scen-name="${_escapeHtml(s.name)}" style="vertical-align:middle;margin-right:8px;">${_escapeHtml(s.name)}</td>
      <td style="padding:12px 14px;color:var(--ink-1);">${_escapeHtml(stratLabel)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-0);">${(t.n_awarded||0).toLocaleString()} <span style="color:var(--ink-2);">/ ${(t.n_items||0).toLocaleString()}</span></td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-0);">${fmt$(t.award_total)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${fmt$(t.historical_total)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--green);font-weight:600;">${fmt$(t.savings_total)} <span style="color:var(--ink-2);">(${fmtPct(t.savings_pct)})</span></td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${(t.items_switched||0).toLocaleString()}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-2);font-size:11px;">${(s.saved_at||'').slice(0,16).replace('T',' ')}</td>
      <td style="padding:12px 14px;text-align:right;white-space:nowrap;">
        <button class="btn ghost" data-scen-letters="${_escapeHtml(s.name)}" title="Generate one award letter xlsx per awarded supplier" style="padding:4px 10px;font-size:11px;">📨 Letters</button>
        <button class="btn ghost" data-scen-summary="${_escapeHtml(s.name)}" title="Generate the internal-audience full-detail summary xlsx" style="padding:4px 10px;font-size:11px;">📊 Internal</button>
        <button class="btn ghost" data-scen-decision="${_escapeHtml(s.name)}" title="Generate the legal-hold decision log (xlsx + markdown for Copilot)" style="padding:4px 10px;font-size:11px;">📜 Decision Log</button>
        <button class="btn ghost" data-scen-delete="${_escapeHtml(s.name)}" style="padding:4px 10px;font-size:11px;">×</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table></div>';

  html += `<div style="display:flex;gap:10px;margin-bottom:18px;">
    <button class="btn primary" id="scen-compare-btn">⇄ Compare selected (pick exactly 2)</button>
  </div>`;

  html += '<div id="scenarios-compare-result"></div>';
  el.innerHTML = html;
  _wireScenarioButtons();
}

function _wireScenarioButtons() {
  document.querySelectorAll('[data-scenario-quick]').forEach(btn => {
    btn.addEventListener('click', () => _saveScenarioQuick(btn.getAttribute('data-scenario-quick')));
  });
  document.querySelectorAll('[data-scenario-consolidate]').forEach(btn => {
    btn.addEventListener('click', () => _saveScenarioQuick('consolidate_to', btn.getAttribute('data-scenario-consolidate')));
  });
  document.querySelectorAll('[data-scen-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.getAttribute('data-scen-delete');
      if (!confirm(`Delete scenario "${name}"?`)) return;
      _py.globals.set('_scen_name', name);
      await _py.runPythonAsync(`
from app_engine import delete_award_scenario
delete_award_scenario(_scen_name)
`);
      _saveMgr.markDirty();
      await _refreshBidViews();
    });
  });
  if ($('scen-compare-btn')) {
    $('scen-compare-btn').addEventListener('click', _runScenarioCompare);
  }
  document.querySelectorAll('[data-scen-letters]').forEach(btn => {
    btn.addEventListener('click', () => _generateAwardLetters(btn.getAttribute('data-scen-letters'), btn));
  });
  document.querySelectorAll('[data-scen-summary]').forEach(btn => {
    btn.addEventListener('click', () => _generateInternalSummary(btn.getAttribute('data-scen-summary'), btn));
  });
  document.querySelectorAll('[data-scen-decision]').forEach(btn => {
    btn.addEventListener('click', () => _generateDecisionLog(btn.getAttribute('data-scen-decision'), btn));
  });
}

async function _generateDecisionLog(scenarioName, btn) {
  const today = new Date();
  const rfqId = prompt('RFQ ID for the decision log:', `RFQ-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-001`);
  if (!rfqId) return;
  if (btn) { btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Generating…'; }
  try {
    _py.globals.set('_dl_scenario', scenarioName);
    _py.globals.set('_dl_rfq_id', rfqId);
    // xlsx
    const xlsxB64 = await _py.runPythonAsync(`
import base64
from app_engine import gen_decision_log_xlsx
_b = gen_decision_log_xlsx(_dl_scenario, rfq_id=_dl_rfq_id)
base64.b64encode(_b).decode('ascii')
`);
    const xb = Uint8Array.from(atob(xlsxB64), c => c.charCodeAt(0));
    const xblob = new Blob([xb], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const xurl = URL.createObjectURL(xblob);
    const xa = document.createElement('a');
    const safeName = scenarioName.replace(/[^a-zA-Z0-9_-]/g, '_');
    xa.href = xurl; xa.download = `DecisionLog_${safeName}_${rfqId}.xlsx`;
    document.body.appendChild(xa); xa.click(); xa.remove();
    setTimeout(() => URL.revokeObjectURL(xurl), 1500);

    // Markdown (for Copilot)
    await new Promise(r => setTimeout(r, 400));
    const md = await _py.runPythonAsync(`
from app_engine import gen_decision_log_markdown
gen_decision_log_markdown(_dl_scenario, rfq_id=_dl_rfq_id)
`);
    const mblob = new Blob([md], { type: 'text/markdown' });
    const murl = URL.createObjectURL(mblob);
    const ma = document.createElement('a');
    ma.href = murl; ma.download = `DecisionLog_${safeName}_${rfqId}.md`;
    document.body.appendChild(ma); ma.click(); ma.remove();
    setTimeout(() => URL.revokeObjectURL(murl), 1500);

    alert(
      `Decision log generated:\n\n` +
      `  • DecisionLog_${safeName}_${rfqId}.xlsx — full immutable record (legal-hold)\n` +
      `  • DecisionLog_${safeName}_${rfqId}.md — markdown version you can paste into M365 Copilot\n\n` +
      `Retain the xlsx for at least 7 years per the legal-hold convention. The markdown is for your own follow-up — paste a section into Copilot and ask for an executive summary, supplier reply draft, or push-back checklist.`
    );
  } catch (err) {
    console.error('[decision log]', err);
    alert('Decision log generation failed: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

async function _generateAwardLetters(scenarioName, btn) {
  const today = new Date();
  const rfqId = prompt('RFQ ID for the award letters:', `RFQ-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-001`);
  if (!rfqId) return;
  if (btn) { btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Generating…'; }
  try {
    _py.globals.set('_letters_scenario', scenarioName);
    _py.globals.set('_letters_rfq_id', rfqId);
    const out = await _py.runPythonAsync(`
import base64, json
from app_engine import gen_award_letters_for_scenario
_letters = gen_award_letters_for_scenario(_letters_scenario, rfq_id=_letters_rfq_id)
# Encode to base64 dict for JS
_encoded = {k: (base64.b64encode(v).decode('ascii') if v is not None else None) for k, v in _letters.items()}
json.dumps(_encoded)
`);
    const letters = JSON.parse(out);
    let dl = 0, skip = 0;
    for (const [supplier, b64] of Object.entries(letters)) {
      if (b64 === null) { skip++; continue; }
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeSup = supplier.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `AwardLetter_${safeSup}_${rfqId}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      dl++;
      await new Promise(r => setTimeout(r, 300));
    }
    alert(`Generated ${dl} award letter${dl === 1 ? '' : 's'}.${skip ? ` (${skip} skipped — no awards or isolation issue)` : ''}\n\nReminder: each file contains ONLY its intended supplier's awards. Run verify_isolation.py against the download folder before sending if you want a third-party cross-check.`);
  } catch (err) {
    console.error('[award letters]', err);
    alert('Award letter generation failed: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

async function _generateInternalSummary(scenarioName, btn) {
  if (btn) { btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Generating…'; }
  try {
    const today = new Date();
    const rfqId = `RFQ-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-001`;
    _py.globals.set('_summary_scenario', scenarioName);
    _py.globals.set('_summary_rfq_id', rfqId);
    const xlsxB64 = await _py.runPythonAsync(`
import base64
from app_engine import gen_internal_award_summary_xlsx
_b = gen_internal_award_summary_xlsx(_summary_scenario, rfq_id=_summary_rfq_id)
base64.b64encode(_b).decode('ascii')
`);
    const bytes = Uint8Array.from(atob(xlsxB64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = scenarioName.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `INTERNAL_${safeName}_${rfqId}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error('[internal summary]', err);
    alert('Internal summary generation failed: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = orig; }
  }
}

async function _saveScenarioQuick(strategy, consolidate_supplier) {
  let suggestedName = strategy.replace('_', '-');
  if (strategy === 'consolidate_to' && consolidate_supplier) {
    suggestedName = `Consol-${consolidate_supplier}`;
  } else if (strategy === 'lowest_price') suggestedName = 'Lowest price';
  else if (strategy === 'lowest_qualified') suggestedName = 'Lowest qualified';
  else if (strategy === 'incumbent_preferred') suggestedName = 'Incumbent preferred';
  const name = prompt('Scenario name:', suggestedName);
  if (!name) return;
  const params = (strategy === 'consolidate_to' && consolidate_supplier) ? {supplier: consolidate_supplier} : {};
  _py.globals.set('_scen_name', name);
  _py.globals.set('_scen_strategy', strategy);
  _py.globals.set('_scen_params', params);
  await _py.runPythonAsync(`
from app_engine import save_award_scenario
save_award_scenario(_scen_name, _scen_strategy, _scen_params.to_py())
`);
  _saveMgr.markDirty();
  await _refreshBidViews();
}

async function _runScenarioCompare() {
  const picks = Array.from(document.querySelectorAll('.scen-pick:checked')).map(cb => cb.getAttribute('data-scen-name'));
  if (picks.length !== 2) { alert('Pick exactly 2 scenarios to compare.'); return; }
  const out = $('scenarios-compare-result');
  out.innerHTML = '<div style="padding:14px;color:var(--ink-2);font-family:var(--mono);font-size:12px;">Comparing…</div>';
  _py.globals.set('_scen_a', picks[0]);
  _py.globals.set('_scen_b', picks[1]);
  const json = await _py.runPythonAsync(`
import json
from app_engine import compare_award_scenarios
json.dumps(compare_award_scenarios(_scen_a, _scen_b), default=str)
`);
  const cmp = JSON.parse(json);
  const fmt$ = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sd = cmp.summary_delta || {};
  const colorDelta = (n) => n > 0 ? 'var(--red)' : n < 0 ? 'var(--green)' : 'var(--ink-1)';
  let html = `<div style="background:var(--bg-1);border:1px solid var(--accent);border-radius:6px;padding:24px;margin-top:18px;">
    <h3 style="margin:0 0 14px;font-family:var(--ui);font-size:14px;font-weight:600;color:var(--ink-0);text-transform:none;letter-spacing:0;">Side-by-side: ${_escapeHtml(picks[0])} → ${_escapeHtml(picks[1])}</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:18px;">
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Award total</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:${colorDelta(sd.award_total)};margin-top:4px;">${sd.award_total >= 0 ? '+' : ''}${fmt$(sd.award_total)}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Savings</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:${colorDelta(-sd.savings_total)};margin-top:4px;">${sd.savings_total >= 0 ? '+' : ''}${fmt$(sd.savings_total)}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Items switched</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-0);margin-top:4px;">${sd.items_switched >= 0 ? '+' : ''}${(sd.items_switched||0).toLocaleString()}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ No-award items</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-0);margin-top:4px;">${sd.n_no_award >= 0 ? '+' : ''}${(sd.n_no_award||0).toLocaleString()}</div></div>
    </div>
    <div style="font-family:var(--mono);font-size:12px;color:var(--ink-2);margin-bottom:8px;">${(cmp.n_items_differ||0).toLocaleString()} items have a different award decision</div>`;
  if (cmp.diffs && cmp.diffs.length) {
    html += '<div style="border:1px solid var(--line);border-radius:4px;overflow:auto;max-height:400px;"><table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);"><thead style="background:var(--bg-2);position:sticky;top:0;"><tr>';
    html += `<th style="padding:8px 10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item #</th>
      <th style="padding:8px 10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Description</th>
      <th style="padding:8px 10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
      <th style="padding:8px 10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">${_escapeHtml(picks[0])}</th>
      <th style="padding:8px 10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">${_escapeHtml(picks[1])}</th>
      <th style="padding:8px 10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Δ value</th>
    </tr></thead><tbody>`;
    for (const d of cmp.diffs) {
      const dvColor = d.value_delta > 0 ? 'var(--red)' : 'var(--green)';
      html += `<tr style="border-bottom:1px solid var(--line);">
        <td style="padding:8px 10px;color:var(--ink-0);">${_escapeHtml(d.item_num)}</td>
        <td style="padding:8px 10px;color:var(--ink-1);max-width:240px;">${_escapeHtml(_truncate(d.description||'', 50))}</td>
        <td style="padding:8px 10px;text-align:right;color:var(--ink-0);">${(d.qty_24mo||0).toLocaleString()}</td>
        <td style="padding:8px 10px;color:var(--ink-1);">${_escapeHtml(d.supplier_a||'—')} ${d.price_a != null ? '$'+d.price_a.toFixed(2) : ''}</td>
        <td style="padding:8px 10px;color:var(--ink-1);">${_escapeHtml(d.supplier_b||'—')} ${d.price_b != null ? '$'+d.price_b.toFixed(2) : ''}</td>
        <td style="padding:8px 10px;text-align:right;color:${dvColor};font-weight:600;">${d.value_delta >= 0 ? '+' : ''}${fmt$(d.value_delta)}</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
  }
  html += '</div>';
  out.innerHTML = html;
}

function _renderBidCoverageKPIs(matrix) {
  const wrap = $('bid-summary-row');
  if (!wrap) return;
  const sm = matrix.summary || {};
  const fmt$ = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  wrap.innerHTML = `
    <div class="kpi"><div class="kpi-label">3+ bids</div><div class="kpi-value" style="color:var(--green);">${(sm.n_with_3plus_bids||0).toLocaleString()}</div><div class="kpi-sub">full competition</div></div>
    <div class="kpi"><div class="kpi-label">2 bids</div><div class="kpi-value" style="color:var(--accent);">${(sm.n_with_2_bids||0).toLocaleString()}</div><div class="kpi-sub">partial competition</div></div>
    <div class="kpi"><div class="kpi-label">1 bid</div><div class="kpi-value" style="color:var(--cyan);">${(sm.n_with_1_bid||0).toLocaleString()}</div><div class="kpi-sub">single source</div></div>
    <div class="kpi"><div class="kpi-label">0 bids</div><div class="kpi-value" style="color:var(--red);">${(sm.n_with_0_bids||0).toLocaleString()}</div><div class="kpi-sub">no bid — follow up</div></div>
    <div class="kpi"><div class="kpi-label">Outliers</div><div class="kpi-value" style="color:var(--red);">${(sm.n_outliers_flagged||0).toLocaleString()}</div><div class="kpi-sub">>3× median or vs hist</div></div>
    <div class="kpi"><div class="kpi-label">Lowest-bid total</div><div class="kpi-value">${fmt$(sm.total_lowest_value)}</div><div class="kpi-sub">if every item awarded to its lowest bid</div></div>
    <div class="kpi"><div class="kpi-label">Historical baseline</div><div class="kpi-value">${fmt$(sm.total_historical_value)}</div><div class="kpi-sub">qty × last-paid price</div></div>
  `;
}

function _renderConsolidation(consol) {
  const el = $('consolidation-block');
  const fmt$ = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cands = consol.candidates || [];
  const w = consol.winner;
  if (!cands.length) { el.innerHTML = ''; return; }

  // Candidates ranking
  let html = '<h2 style="margin-top:0;">Consolidation candidates</h2>';
  html += '<p class="subtitle" style="margin-bottom:18px;">Default award strategy: consolidate to one supplier. Then carve out exceptions where another supplier saves significantly on a specific item.</p>';
  html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:hidden;margin-bottom:24px;">';
  html += '<table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px;">';
  html += `<thead style="background:var(--bg-2);"><tr>
    <th style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Supplier</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Items quoted</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">% of RFQ</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Lowest on N items</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Award all to them</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Items they didn't quote</th>
  </tr></thead><tbody>`;
  cands.forEach((c, i) => {
    const isWinner = i === 0;
    html += `<tr style="border-bottom:1px solid var(--line);${isWinner ? 'background:rgba(255,183,51,0.06);' : ''}">
      <td style="padding:12px 14px;font-weight:${isWinner ? '700' : '400'};color:${isWinner ? 'var(--accent)' : 'var(--ink-0)'};">
        ${isWinner ? '★ ' : ''}${_escapeHtml(c.supplier)}
      </td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-0);">${c.n_items_quoted.toLocaleString()}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${c.pct_items_quoted.toFixed(1)}%</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${c.n_items_lowest.toLocaleString()} (${c.pct_items_lowest.toFixed(0)}%)</td>
      <td style="padding:12px 14px;text-align:right;color:${isWinner ? 'var(--accent)' : 'var(--ink-0)'};font-weight:${isWinner ? '700' : '500'};">${fmt$(c.consolidation_value)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-2);">${c.items_not_quoted.toLocaleString()}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';

  // Winner award math
  if (w) {
    const realCarves = (w.carve_outs || []).filter(c => !c.verify_uom);
    const uomCarves = (w.carve_outs || []).filter(c => c.verify_uom);
    html += `<div style="background:var(--bg-1);border:1px solid var(--accent);border-radius:6px;padding:24px;margin-bottom:24px;">
      <div style="font-size:11px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.16em;font-weight:600;margin-bottom:6px;">Recommended award (consolidation + carve-outs)</div>
      <div style="font-family:var(--ui);font-size:24px;font-weight:600;color:var(--ink-0);margin-bottom:18px;">★ ${_escapeHtml(w.supplier)} <span style="color:var(--ink-2);font-size:14px;font-weight:400;">as primary, with ${realCarves.length} verified carve-out${realCarves.length === 1 ? '' : 's'}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Winner base</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-0);margin-top:4px;">${fmt$(w.consolidation_value)}</div></div>
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">− Carve-outs (verified)</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--green);margin-top:4px;">−${fmt$(w.carve_out_savings_total)}</div></div>
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">+ Items winner skipped</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-1);margin-top:4px;">+${fmt$(w.items_at_best_alt_value)}</div></div>
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">= Final award</div><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--accent);margin-top:4px;">${fmt$(w.final_award_value)}</div></div>
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">vs Historical</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-1);margin-top:4px;">${fmt$(w.historical_value)}</div></div>
        <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Net savings</div><div style="font-family:var(--mono);font-size:22px;font-weight:700;color:var(--green);margin-top:4px;">${fmt$(w.savings_vs_history)}</div></div>
      </div>
    </div>`;

    // Verified carve-outs
    if (realCarves.length) {
      html += `<details open style="margin-bottom:14px;"><summary style="cursor:pointer;padding:10px 0;font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ink-0);">${realCarves.length} verified carve-out${realCarves.length === 1 ? '' : 's'} — ${fmt$(w.carve_out_savings_total)} additional savings</summary>`;
      html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:auto;max-height:400px;margin-top:8px;"><table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
      html += `<thead style="background:var(--bg-2);position:sticky;top:0;"><tr>
        <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item #</th>
        <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Description</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Winner $/ea</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Carve to → $/ea</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Savings</th>
      </tr></thead><tbody>`;
      for (const co of realCarves.slice(0, 200)) {
        html += `<tr style="border-bottom:1px solid var(--line);">
          <td style="padding:10px;color:var(--ink-0);">${_escapeHtml(co.item_num)}</td>
          <td style="padding:10px;color:var(--ink-1);max-width:280px;">${_escapeHtml(_truncate(co.description, 60))}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">${(co.qty_24mo||0).toLocaleString()}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">$${co.winner_price.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;color:var(--cyan);"><strong>${_escapeHtml(co.carve_supplier)}</strong> $${co.carve_price.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;color:var(--green);font-weight:600;">$${co.savings_total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} <span style="color:var(--ink-2);">(${co.savings_pct.toFixed(0)}%)</span></td>
        </tr>`;
      }
      if (realCarves.length > 200) {
        html += `<tr><td colspan="6" style="padding:14px;text-align:center;color:var(--ink-2);">… and ${realCarves.length - 200} more verified carve-outs</td></tr>`;
      }
      html += '</tbody></table></div></details>';
    }

    // UOM-suspect carve-outs (NOT counted in savings)
    if (uomCarves.length) {
      const uomSuspectTotal = uomCarves.reduce((sum, c) => sum + c.savings_total, 0);
      html += `<details style="margin-bottom:14px;"><summary style="cursor:pointer;padding:10px 0;font-family:var(--ui);font-size:13px;font-weight:600;color:var(--red);">⚠ ${uomCarves.length} UOM-suspect carve-out${uomCarves.length === 1 ? '' : 's'} — apparent ${fmt$(uomSuspectTotal)} savings NOT counted (verify UOM first)</summary>`;
      html += '<p style="color:var(--ink-2);font-size:12px;margin:8px 0;">These look like huge savings but the supplier annotated a UOM mismatch (e.g. "per each vs per package") OR the price ratio is >20×. Almost certainly false positives — confirm with the supplier before treating as real savings.</p>';
      html += '<div style="border:1px solid var(--red);border-radius:6px;overflow:auto;max-height:300px;background:rgba(255,77,109,0.04);"><table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
      html += `<thead style="background:var(--bg-2);position:sticky;top:0;"><tr>
        <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item #</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Winner $/ea</th>
        <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Other → $/ea</th>
        <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Note</th>
      </tr></thead><tbody>`;
      for (const co of uomCarves.slice(0, 100)) {
        const note = (co.carve_notes || co.winner_notes || '').slice(0, 60);
        html += `<tr style="border-bottom:1px solid rgba(255,77,109,0.18);">
          <td style="padding:10px;color:var(--ink-0);">${_escapeHtml(co.item_num)}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">${(co.qty_24mo||0).toLocaleString()}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">$${co.winner_price.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;color:var(--red);"><strong>${_escapeHtml(co.carve_supplier)}</strong> $${co.carve_price.toFixed(2)}</td>
          <td style="padding:10px;color:var(--ink-2);font-style:italic;">${_escapeHtml(note)}</td>
        </tr>`;
      }
      html += '</tbody></table></div></details>';
    }

    // Items winner didn't quote
    const orphans = w.items_winner_didnt_quote || [];
    const noBidByAny = orphans.filter(o => !o.best_alt_supplier);
    const coveredByAlt = orphans.filter(o => o.best_alt_supplier);
    if (orphans.length) {
      html += `<details style="margin-bottom:14px;"><summary style="cursor:pointer;padding:10px 0;font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ink-0);">${orphans.length} items winner didn't quote — ${coveredByAlt.length} covered by alternate, <span style="color:var(--red);">${noBidByAny.length} have NO bid</span></summary>`;
      if (noBidByAny.length) {
        const totalAtRisk = noBidByAny.reduce((s, o) => s + (o.value_at_history || 0), 0);
        html += `<p style="color:var(--red);font-size:12px;margin:8px 0;font-weight:600;">${noBidByAny.length} items got NO bid from any supplier — ${fmt$(totalAtRisk)} of historical spend at risk. Need to follow up or drop from RFQ.</p>`;
      }
      html += '</details>';
    }
  }

  el.innerHTML = html;
}

function _renderComparisonMatrix(matrix) {
  const el = $('comparison-section');
  const suppliers = matrix.suppliers || [];
  const rows = matrix.rows || [];
  if (!suppliers.length) { el.innerHTML = ''; return; }

  // Recommendation distribution callout
  const recCounts = (matrix.summary && matrix.summary.recommendation_counts) || {};
  const recColors = {
    ACCEPT:           'var(--green)',
    PUSH_BACK:        'var(--accent)',
    ASK_CLARIFICATION:'var(--cyan)',
    MANUAL_REVIEW:    'var(--ink-1)',
    EXCLUDE:          'var(--red)',
  };
  const recLabels = {
    ACCEPT:           'Accept',
    PUSH_BACK:        'Push back',
    ASK_CLARIFICATION:'Ask clarification',
    MANUAL_REVIEW:    'Manual review',
    EXCLUDE:          'Exclude',
  };
  let recDistHtml = '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;font-family:var(--mono);font-size:12px;">';
  for (const k of ['ACCEPT','PUSH_BACK','ASK_CLARIFICATION','MANUAL_REVIEW','EXCLUDE']) {
    const n = recCounts[k] || 0;
    recDistHtml += `<div style="padding:10px 14px;background:var(--bg-1);border:1px solid var(--line);border-left:3px solid ${recColors[k]};border-radius:4px;">
      <div style="color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">${recLabels[k]}</div>
      <div style="color:${recColors[k]};font-size:18px;font-weight:600;margin-top:2px;">${n.toLocaleString()}</div>
    </div>`;
  }
  recDistHtml += '</div>';

  // Filter to only items with at least one bid by default — cleaner view
  const rowsWithBids = rows.filter(r => r.n_quoted > 0);

  let html = `<h2 style="margin-top:0;">Comparison matrix · ${rowsWithBids.length.toLocaleString()} items with at least one bid <span style="color:var(--ink-2);font-size:14px;font-weight:400;">(${rows.length - rowsWithBids.length} no-bid items hidden)</span></h2>`;
  html += recDistHtml;
  html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:auto;max-height:70vh;">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
  html += `<thead style="background:var(--bg-2);position:sticky;top:0;z-index:1;"><tr>
    <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item #</th>
    <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Description</th>
    <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty 24mo</th>
    <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Last $/ea</th>`;
  for (const sup of suppliers) {
    html += `<th style="padding:10px;text-align:right;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;border-left:1px solid var(--line);">${_escapeHtml(sup)}</th>`;
  }
  html += `<th style="padding:10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Cov</th>
    <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Recommendation</th>
  </tr></thead><tbody>`;

  // Sort by 24-mo qty × hist price desc (highest-value items first)
  rowsWithBids.sort((a, b) => (b.qty_24mo * (b.last_unit_price || 0)) - (a.qty_24mo * (a.last_unit_price || 0)));
  const cap = 500;
  const slice = rowsWithBids.slice(0, cap);
  for (const r of slice) {
    const lowestSup = r.lowest_supplier;
    let cells = '';
    for (const sup of suppliers) {
      const b = r.bids[sup] || {};
      const isLow = (sup === lowestSup);
      let cellContent = '';
      let cellColor = 'var(--ink-1)';
      if (b.status === 'MISSING') {
        cellContent = '—';
        cellColor = 'var(--ink-2)';
      } else if (b.status === 'NO_BID') {
        cellContent = 'no bid';
        cellColor = 'var(--ink-2)';
      } else if (b.status === 'NEED_INFO') {
        cellContent = 'need info';
        cellColor = 'var(--accent)';
      } else if (b.price != null) {
        cellContent = '$' + b.price.toFixed(2);
        if (b.status === 'UOM_DISC') cellContent += ' ⚠';
        if (b.status === 'SUBSTITUTE') cellContent += ' †';
        cellColor = isLow ? 'var(--green)' : 'var(--ink-0)';
      }
      cells += `<td style="padding:8px 10px;text-align:right;border-left:1px solid var(--line);color:${cellColor};font-weight:${isLow ? '700' : '400'};">${cellContent}</td>`;
    }
    const covColor = r.coverage === 'FULL' ? 'var(--green)' : r.coverage === 'PARTIAL' ? 'var(--accent)' : r.coverage === 'SINGLE' ? 'var(--cyan)' : 'var(--red)';
    const rec = r.recommendation || 'MANUAL_REVIEW';
    const recColor = recColors[rec] || 'var(--ink-1)';
    const recLbl = recLabels[rec] || rec;
    const recReason = r.recommendation_reason || '';
    html += `<tr style="border-bottom:1px solid rgba(122,109,115,0.25);" data-comp-item="${_escapeHtml(r.item_num)}">
      <td style="padding:8px 10px;color:var(--ink-0);">${_escapeHtml(r.item_num)}</td>
      <td style="padding:8px 10px;color:var(--ink-1);max-width:240px;">${_escapeHtml(_truncate(r.description, 50))}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-0);">${(r.qty_24mo||0).toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-1);">$${(r.last_unit_price||0).toFixed(2)}</td>
      ${cells}
      <td style="padding:8px 10px;text-align:center;color:${covColor};font-weight:600;font-size:10px;">${r.coverage}</td>
      <td style="padding:8px 10px;color:${recColor};font-size:11px;font-weight:600;" title="${_escapeHtml(recReason)}">${recLbl}</td>
    </tr>`;
  }
  if (rowsWithBids.length > cap) {
    html += `<tr><td colspan="${suppliers.length + 6}" style="padding:14px;text-align:center;color:var(--ink-2);">… and ${(rowsWithBids.length - cap).toLocaleString()} more items hidden</td></tr>`;
  }
  html += '</tbody></table></div>';
  html += '<div style="margin-top:8px;color:var(--ink-2);font-size:11px;font-family:var(--mono);">⚠ = UOM discrepancy noted by supplier &nbsp;·&nbsp; † = substitute part offered &nbsp;·&nbsp; <strong style="color:var(--green);">green</strong> = lowest non-flagged bid</div>';

  el.innerHTML = html;

  // Wire row click → open per-item history modal
  el.querySelectorAll('tr[data-comp-item]').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      const k = tr.getAttribute('data-comp-item');
      _openItemHistory(k);
    });
  });
}

// ==========================================================================
// Per-item history modal — drill-into for any RFQ row.
//
// Shows: order-history dot chart with linear trend + expected-price overlay
// (extrapolated trend at the dataset's anchor date), summary stats by
// window, and the per-PO line table. Phase 2.5 will overlay incoming
// supplier bids as right-edge markers; for now it's the historical view.
// ==========================================================================
function _ensureItemModal() {
  if (document.getElementById('item-modal')) return;
  const m = document.createElement('div');
  m.id = 'item-modal';
  m.style.cssText = [
    'position:fixed','inset:0','z-index:5000','display:none',
    'align-items:center','justify-content:center',
    'background:rgba(8,12,22,0.78)','backdrop-filter:blur(4px)',
    '-webkit-backdrop-filter:blur(4px)','padding:24px',
  ].join(';');
  m.innerHTML = `
    <div id="item-modal-card" style="
      background:var(--bg-1);border:1px solid var(--line);border-radius:8px;
      max-width:980px;width:100%;max-height:92vh;overflow:auto;
      box-shadow:0 24px 80px rgba(0,0,0,0.6);
      font-family:var(--ui, sans-serif);
      ">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 14px;border-bottom:1px solid var(--line);">
        <div style="flex:1;min-width:0;">
          <div id="im-eyebrow" style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">ITEM HISTORY</div>
          <div id="im-title" style="font-size:24px;font-weight:600;color:var(--ink-0);font-family:var(--mono);letter-spacing:0.01em;line-height:1.2;"></div>
          <div id="im-sub" style="font-size:13px;color:var(--ink-1);margin-top:6px;line-height:1.4;"></div>
        </div>
        <button id="im-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;flex-shrink:0;margin-left:14px;">×</button>
      </div>
      <div id="im-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0;border-bottom:1px solid var(--line);"></div>
      <div style="padding:22px 26px 8px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;">
          <h3 style="margin:0;font-size:11px;color:var(--ink-2);font-weight:600;text-transform:uppercase;letter-spacing:0.10em;font-family:var(--ui);">UNIT PRICE OVER TIME</h3>
          <div id="im-trend-label" style="font-size:11px;color:var(--ink-2);font-family:var(--mono);"></div>
        </div>
        <svg id="im-chart" style="width:100%;height:280px;display:block;" preserveAspectRatio="xMidYMid meet"></svg>
        <div id="im-trend-callout" style="margin-top:10px;padding:10px 12px;background:var(--bg-2);border:1px solid var(--line);border-radius:4px;font-size:12px;color:var(--ink-1);font-family:var(--mono);"></div>
      </div>
      <div id="im-bids-section" style="padding:0 26px;display:none;">
        <div style="padding:12px 14px;background:var(--bg-2);border:1px solid var(--line);border-radius:4px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;gap:14px;flex-wrap:wrap;">
            <h3 style="margin:0;font-size:11px;color:var(--ink-2);font-weight:600;text-transform:uppercase;letter-spacing:0.10em;font-family:var(--ui);">SUPPLIER BIDS — overlaid as horizontal markers above</h3>
            <div id="im-bids-count" style="font-size:11px;color:var(--ink-2);font-family:var(--mono);"></div>
          </div>
          <div id="im-bids-list" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
        </div>
      </div>
      <div style="padding:14px 26px 22px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;gap:14px;flex-wrap:wrap;">
          <h3 style="margin:0;font-size:11px;color:var(--ink-2);font-weight:600;text-transform:uppercase;letter-spacing:0.10em;font-family:var(--ui);">ORDER LINES</h3>
          <div id="im-exclusion-status" style="font-size:11px;color:var(--ink-2);font-family:var(--mono);">Untick a row to drop that order from the trend &amp; spike calc.</div>
        </div>
        <div style="border:1px solid var(--line);border-radius:4px;overflow:auto;max-height:300px;">
          <table id="im-lines" style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:var(--bg-2);">
              <th style="padding:8px 10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);width:38px;" title="Tick = include in trend calc. Untick to exclude an outlier order — the trend, R², 90-day median, and expected-today price all recompute live.">USE</th>
              <th style="padding:8px 12px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">Date</th>
              <th style="padding:8px 12px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">Qty</th>
              <th style="padding:8px 12px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">Unit price</th>
              <th style="padding:8px 12px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">Line total</th>
              <th style="padding:8px 12px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">PO #</th>
              <th style="padding:8px 12px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.10em;font-weight:600;border-bottom:1px solid var(--line);">UOM</th>
            </tr></thead>
            <tbody id="im-lines-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  document.getElementById('im-close').addEventListener('click', _closeItemModal);
  m.addEventListener('click', (e) => { if (e.target === m) _closeItemModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && m.style.display === 'flex') _closeItemModal();
  });
}

// Tracks the most-recently-opened item so on close we can drop a subtle
// "you were just looking at this" stripe on the originating row(s) — works
// across both the RFQ list table (data-item="...") and the comparison
// matrix table (data-comp-item="..."). The stripe fades out via CSS after
// ~12 s; an explicit timer also strips the class so it doesn't linger.
let _lastViewedItemNum = null;
let _lastViewedFadeTimer = null;

function _markLastViewedRow(itemNum) {
  if (!itemNum) return;
  // Strip any prior highlight first so the trail only ever names ONE row.
  for (const tr of document.querySelectorAll('tr.last-viewed-row')) {
    tr.classList.remove('last-viewed-row');
    tr.classList.remove('fade');
  }
  const sel = `tr[data-item="${CSS.escape(itemNum)}"], tr[data-comp-item="${CSS.escape(itemNum)}"]`;
  for (const tr of document.querySelectorAll(sel)) {
    tr.classList.add('last-viewed-row');
  }
  if (_lastViewedFadeTimer) clearTimeout(_lastViewedFadeTimer);
  _lastViewedFadeTimer = setTimeout(() => {
    for (const tr of document.querySelectorAll('tr.last-viewed-row')) {
      tr.classList.add('fade');
    }
    _lastViewedFadeTimer = setTimeout(() => {
      for (const tr of document.querySelectorAll('tr.last-viewed-row')) {
        tr.classList.remove('last-viewed-row');
        tr.classList.remove('fade');
      }
    }, 9000);
  }, 4000);
}

function _closeItemModal() {
  const m = document.getElementById('item-modal');
  if (m) m.style.display = 'none';
  _currentItemHistory = null;
  if (_lastViewedItemNum) _markLastViewedRow(_lastViewedItemNum);
}

async function _openItemHistory(itemNum) {
  _ensureItemModal();
  _lastViewedItemNum = itemNum;
  const m = document.getElementById('item-modal');
  m.style.display = 'flex';
  document.getElementById('im-title').textContent = itemNum;
  document.getElementById('im-sub').textContent = 'Loading…';
  document.getElementById('im-summary').innerHTML = '';
  document.getElementById('im-chart').innerHTML = '';
  document.getElementById('im-lines-body').innerHTML = '';
  document.getElementById('im-trend-callout').textContent = '';
  document.getElementById('im-trend-label').textContent = '';
  // Reset the bid section between opens — keeps the previous item's bids
  // from briefly flashing while the next payload loads.
  const bidsSection = document.getElementById('im-bids-section');
  if (bidsSection) bidsSection.style.display = 'none';
  const bidsList = document.getElementById('im-bids-list');
  if (bidsList) bidsList.innerHTML = '';

  try {
    _py.globals.set('_item_num_in', itemNum);
    const out = await _py.runPythonAsync(`
import json
from app_engine import get_item_history
json.dumps(get_item_history(_item_num_in), default=str)
`);
    const h = JSON.parse(out);
    if (h.error) {
      document.getElementById('im-sub').textContent = `(${h.error})`;
      return;
    }
    _renderItemHistory(h);
  } catch (err) {
    console.error('[openItemHistory] failed', err);
    document.getElementById('im-sub').textContent = `Failed: ${err.message || err}`;
  }
}

function _renderItemHistory(h) {
  // Title block
  document.getElementById('im-title').textContent = h.item_num;
  const subParts = [];
  if (h.description) subParts.push(h.description);
  if (h.mfg_name) subParts.push(`mfg: ${h.mfg_name}`);
  if (h.mfg_pn) subParts.push(`mfg pn: ${h.mfg_pn}`);
  if (h.uom) subParts.push(`uom: ${h.uom}${h.uom_mixed ? ' (mixed!)' : ''}`);
  document.getElementById('im-sub').textContent = subParts.join(' · ');

  // Summary tiles (mini KPI ribbon)
  const s = h.summary || {};
  const fmt$ = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
  const fmtQ = (n) => n == null ? '—' : Math.round(n).toLocaleString();
  const fmtP = (n) => n == null ? '—' : '$' + Number(n).toFixed(2);
  const tile = (label, value, sub) => `
    <div style="padding:14px 18px;border-right:1px solid var(--line);">
      <div style="font-size:9px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.14em;font-weight:600;margin-bottom:4px;">${label}</div>
      <div style="font-family:var(--mono);font-size:18px;color:var(--accent, var(--ink-0));font-weight:600;line-height:1.1;">${value}</div>
      ${sub ? `<div style="font-size:10px;color:var(--ink-2);margin-top:3px;font-family:var(--mono);">${sub}</div>` : ''}
    </div>
  `;
  document.getElementById('im-summary').innerHTML =
    tile('12-MO', fmt$(s.spend_12mo), `${fmtQ(s.qty_12mo)} ${h.uom || 'units'}`) +
    tile('24-MO', fmt$(s.spend_24mo), `${fmtQ(s.qty_24mo)} ${h.uom || 'units'}`) +
    tile('36-MO', fmt$(s.spend_36mo), `${fmtQ(s.qty_36mo)} ${h.uom || 'units'}`) +
    tile('ALL TIME', fmt$(s.spend_all), `${fmtQ(s.qty_all)} ${h.uom || 'units'} · ${s.po_count} POs`) +
    tile('LAST PRICE', fmtP(s.last_unit_price), `last order ${s.last_order || '—'}`);

  // Chart
  _drawItemHistoryChart(h);

  // Trend label + callout
  const t = h.trend || {};
  const trendLbl = `slope $${t.slope_per_day != null ? (t.slope_per_day * 365).toFixed(2) : '—'}/yr · R² ${t.r2 != null ? t.r2.toFixed(2) : '—'} · ${t.confidence || ''}`;
  document.getElementById('im-trend-label').textContent = trendLbl;

  // Build callout — lead with spike if there is one (most actionable)
  let callout = '';
  const calloutEl = document.getElementById('im-trend-callout');
  calloutEl.style.borderColor = '';
  calloutEl.style.background = 'var(--bg-2)';
  if (t.spike && t.spike.is_spike) {
    const direction = t.spike.pct_diff > 0 ? 'above' : 'below';
    callout = `<strong style="color:var(--red);">⚠ PRICE SPIKE</strong> &nbsp; Latest line $${t.latest_unit_price.toFixed(2)} is <strong style="color:var(--red);">${Math.abs(t.spike.pct_diff).toFixed(0)}% ${direction}</strong> the ${t.median_window_label} ($${t.median_90d.toFixed(2)}). Worth confirming this isn't a one-off price hike before the RFQ goes out.`;
    calloutEl.style.borderColor = 'var(--red)';
    calloutEl.style.background = 'rgba(255,77,109,0.08)';
  } else if (t.spike) {
    callout = t.spike.message + '.';
  }
  if (t.expected_today != null) {
    const expected = '$' + t.expected_today.toFixed(2);
    const last = s.last_unit_price != null ? '$' + s.last_unit_price.toFixed(2) : '—';
    const ago = t.days_since_last_order != null
      ? (t.days_since_last_order < 30
          ? `${t.days_since_last_order} days ago`
          : `${(t.days_since_last_order / 30).toFixed(1)} months ago`)
      : '—';
    const trendLine = `<br><br>Last actual order: ${last} · ${ago}. Trend extrapolation to today: <strong style="color:var(--accent);">${expected}</strong>. Confidence: ${t.confidence} (${t.confidence_reason}).`;
    callout += trendLine;
  } else if (!callout && t.confidence_reason) {
    callout = `Trend: ${t.confidence_reason}.`;
  }
  calloutEl.innerHTML = callout;

  // Order lines table — checkbox per row drives the outlier-exclusion set.
  const tbody = document.getElementById('im-lines-body');
  let rows = '';
  // Sort newest-first for display; line_idx stays bound to ascending order.
  const lines = [...h.po_lines].reverse();
  for (const ln of lines) {
    const excluded = !!ln.excluded;
    const rowOpacity = excluded ? '0.45' : '1';
    const rowBg = excluded ? 'rgba(122,109,115,0.06)' : 'transparent';
    const stripeColor = excluded ? 'var(--ink-2)' : 'var(--ink-0)';
    const priceStyle = excluded ? `text-decoration:line-through;color:${stripeColor};` : `color:${stripeColor};`;
    rows += `
      <tr style="border-bottom:1px solid rgba(122,109,115,0.25);background:${rowBg};opacity:${rowOpacity};" data-line-idx="${ln.line_idx}">
        <td style="padding:8px 10px;text-align:center;">
          <input type="checkbox" class="im-line-toggle" data-line-idx="${ln.line_idx}" ${excluded ? '' : 'checked'} title="${excluded ? 'Excluded — tick to include in trend' : 'Included — untick to exclude this order'}" style="cursor:pointer;accent-color:var(--accent);">
        </td>
        <td style="padding:8px 12px;color:var(--ink-1);font-family:var(--mono);">${_escapeHtml(ln.date)}</td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);${priceStyle}">${fmtQ(ln.qty)}</td>
        <td style="padding:8px 12px;text-align:right;font-family:var(--mono);${priceStyle}">${fmtP(ln.unit_price)}</td>
        <td style="padding:8px 12px;text-align:right;color:var(--ink-1);font-family:var(--mono);">${fmt$(ln.line_total)}</td>
        <td style="padding:8px 12px;color:var(--ink-1);font-family:var(--mono);">${_escapeHtml(ln.po || '')}</td>
        <td style="padding:8px 12px;color:var(--ink-1);font-family:var(--mono);">${_escapeHtml(ln.uom || '')}</td>
      </tr>
    `;
  }
  tbody.innerHTML = rows || `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--ink-2);">no order lines</td></tr>`;

  // Wire up the per-line checkbox handlers — toggle the exclusion list and
  // re-fetch the cleaned trend payload from Python so the chart, callout,
  // and bid-distance flags all recompute together.
  const itemNum = h.item_num;
  for (const cb of tbody.querySelectorAll('.im-line-toggle')) {
    cb.addEventListener('change', (ev) => {
      const idx = parseInt(ev.target.getAttribute('data-line-idx'), 10);
      if (!Number.isFinite(idx)) return;
      _toggleItemExclusion(itemNum, idx, !ev.target.checked);
    });
  }

  // Status hint above the table — mention the cleaned-set count and a quick
  // reset link if any exclusions are active.
  const statusEl = document.getElementById('im-exclusion-status');
  if (statusEl) {
    if (h.n_excluded > 0) {
      statusEl.innerHTML = `<span style="color:var(--amber, var(--accent));">${h.n_excluded} excluded</span> · trend fit on ${h.n_priced_after_exclusion || 0} priced line${(h.n_priced_after_exclusion || 0) === 1 ? '' : 's'} · <a href="#" id="im-exclusion-reset" style="color:var(--accent);text-decoration:underline;">reset all</a>`;
      const resetEl = document.getElementById('im-exclusion-reset');
      if (resetEl) resetEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        _resetItemExclusions(itemNum);
      });
    } else {
      statusEl.textContent = 'Untick a row to drop that order from the trend & spike calc.';
    }
  }

  // Render the supplier-bid section (cards below) — populated whether or
  // not bids exist, because the chart overlay markers also key off h.bids.
  _renderItemBidsSection(h);
}

// Currently-rendered modal payload — kept so re-renders after a checkbox
// toggle can preserve scroll position + animate the chart in place. Set
// inside _renderItemHistory; cleared on close.
let _currentItemHistory = null;

async function _toggleItemExclusion(itemNum, lineIdx, shouldExclude) {
  // Compute the next exclusion list locally first (so we don't have to
  // round-trip a "current state" read from Python). The payload Python
  // returned in _renderItemHistory carries the canonical h.exclusions set.
  const current = (_currentItemHistory && _currentItemHistory.exclusions) || [];
  const next = new Set(current);
  if (shouldExclude) next.add(lineIdx);
  else next.delete(lineIdx);
  const nextArr = [...next].sort((a, b) => a - b);
  await _persistItemExclusions(itemNum, nextArr);
  await _refreshItemHistoryModal(itemNum);
}

async function _resetItemExclusions(itemNum) {
  await _persistItemExclusions(itemNum, []);
  await _refreshItemHistoryModal(itemNum);
}

async function _persistItemExclusions(itemNum, indicesArr) {
  try {
    _py.globals.set('_item_num_in', itemNum);
    _py.globals.set('_excluded_in', indicesArr);
    await _py.runPythonAsync(`
from app_engine import set_item_exclusions
set_item_exclusions(_item_num_in, list(_excluded_in))
`);
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) {
      _saveMgr.markDirty();
    }
  } catch (err) {
    console.error('[item-exclusions] persist failed', err);
  }
}

async function _refreshItemHistoryModal(itemNum) {
  try {
    _py.globals.set('_item_num_in', itemNum);
    const out = await _py.runPythonAsync(`
import json
from app_engine import get_item_history
json.dumps(get_item_history(_item_num_in), default=str)
`);
    const h = JSON.parse(out);
    if (h.error) return;
    _renderItemHistory(h);
  } catch (err) {
    console.error('[item-history] refresh failed', err);
  }
}

function _renderItemBidsSection(h) {
  // Plain-language ribbon below the chart that lists every supplier-bid we
  // have for this item. Each card gets a per-bid lock button so the
  // analyst can pin the award after visual confirmation. The card colors
  // match the chart's overlay marker colors so the eye links the two.
  _currentItemHistory = h;
  const section = document.getElementById('im-bids-section');
  const list = document.getElementById('im-bids-list');
  const countEl = document.getElementById('im-bids-count');
  if (!section || !list) return;
  const bids = (h.bids || []);
  if (!bids.length) {
    section.style.display = 'none';
    list.innerHTML = '';
    if (countEl) countEl.textContent = '';
    return;
  }
  section.style.display = '';
  const lockedSupplier = (h.lock && h.lock.supplier) || null;
  if (countEl) {
    countEl.textContent =
      `${bids.length} bid${bids.length === 1 ? '' : 's'}` +
      (lockedSupplier ? ` · LOCKED → ${lockedSupplier}` : '');
  }
  let html = '';
  for (const b of bids) {
    const color = _bidOverlayColor(b);
    const statusBadge = b.status && b.status !== 'PRICED'
      ? `<span style="font-size:9px;color:var(--ink-2);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em;margin-left:6px;border:1px solid var(--line);padding:1px 5px;border-radius:2px;">${_escapeHtml(b.status)}</span>`
      : '';
    const typoBadge = b.possible_typo
      ? `<span style="font-size:9px;color:var(--red);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em;margin-left:6px;border:1px solid var(--red);padding:1px 5px;border-radius:2px;font-weight:700;" title="≥60% below the trend line — looks like a typo. Visually confirm before awarding.">POSSIBLE TYPO</span>`
      : '';
    const refLine = (b.pct_diff != null)
      ? `<span style="color:var(--ink-2);font-size:11px;">${b.pct_diff >= 0 ? '+' : ''}${b.pct_diff.toFixed(0)}% vs ${b.reference === 'trend' ? 'trend' : 'last price'}</span>`
      : `<span style="color:var(--ink-2);font-size:11px;">no trend ref</span>`;
    const isLocked = !!b.is_locked;
    const lockBtnLbl = isLocked ? '🔒 LOCKED — click to unlock' : '🔓 LOCK to this supplier';
    const lockBtnTitle = isLocked
      ? 'Unlock — strategy logic resumes for this item'
      : 'Lock award to this supplier across every scenario. Use after visually auditing this bid.';
    html += `
      <div class="im-bid-card" style="
        border:1px solid ${color};
        background:${color}14;
        border-radius:4px;
        padding:8px 12px;
        font-family:var(--mono);
        min-width:240px;
        flex:1 1 240px;
        ${isLocked ? 'box-shadow:0 0 0 2px ' + color + '55;' : ''}
        ">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
          <strong style="color:var(--ink-0);font-size:13px;">${_escapeHtml(b.supplier)}</strong>
          <span style="color:${color};font-weight:700;font-size:14px;">$${b.price.toFixed(2)}</span>
        </div>
        <div style="margin-top:4px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
          ${refLine}
          ${statusBadge}
          ${typoBadge}
        </div>
        ${b.alt_part ? `<div style="margin-top:4px;color:var(--ink-2);font-size:10px;">alt: ${_escapeHtml(b.alt_part)}</div>` : ''}
        <button type="button"
          class="im-bid-lock-btn"
          data-supplier="${_escapeHtml(b.supplier)}"
          data-locked="${isLocked ? '1' : '0'}"
          title="${lockBtnTitle}"
          style="
            margin-top:8px;
            width:100%;
            background:${isLocked ? color : 'transparent'};
            color:${isLocked ? '#0a0e1a' : color};
            border:1px solid ${color};
            padding:5px 8px;
            font-family:var(--mono);
            font-size:10px;
            text-transform:uppercase;
            letter-spacing:0.08em;
            font-weight:600;
            border-radius:3px;
            cursor:pointer;
          ">${lockBtnLbl}</button>
      </div>
    `;
  }
  list.innerHTML = html;
  for (const btn of list.querySelectorAll('.im-bid-lock-btn')) {
    btn.addEventListener('click', (ev) => {
      const sup = ev.currentTarget.getAttribute('data-supplier');
      const wasLocked = ev.currentTarget.getAttribute('data-locked') === '1';
      _toggleItemLock(h.item_num, sup, wasLocked);
    });
  }
}

function _bidOverlayColor(bid) {
  // Color a bid by distance from the cleaned-trend line (or from the most
  // recent priced line when no trend is available). Used by the chart
  // overlay markers AND the bid cards below the chart so the two stay in
  // visual sync. Locked supplier always renders cyan/accent regardless of
  // distance — the lock IS the signal the analyst is overriding distance
  // judgment.
  if (bid.is_locked) return 'var(--cyan, var(--accent))';
  if (bid.possible_typo) return 'var(--red, #ff4d6d)';
  if (bid.ratio == null) return 'var(--ink-1)';
  const r = bid.ratio;
  if (r >= 0.85 && r <= 1.15) return 'var(--green, #6bd25b)';   // within ±15%
  if (r >= 0.7  && r <= 1.3)  return 'var(--amber, #ffb733)';   // ±15-30%
  return 'var(--red, #ff4d6d)';                                 // >30% off
}

async function _toggleItemLock(itemNum, supplier, wasLocked) {
  try {
    _py.globals.set('_item_num_in', itemNum);
    _py.globals.set('_supplier_in', supplier);
    if (wasLocked) {
      await _py.runPythonAsync(`
from app_engine import clear_item_lock
clear_item_lock(_item_num_in)
`);
    } else {
      // Reason auto-fills with a timestamp + "audited" tag. The full audit
      // trail is on the audit log; richer notes can be added later via a
      // dedicated lock-reason input if needed.
      const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
      _py.globals.set('_reason_in', `audited ${ts}`);
      await _py.runPythonAsync(`
from app_engine import set_item_lock
set_item_lock(_item_num_in, _supplier_in, _reason_in)
`);
    }
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) {
      _saveMgr.markDirty();
    }
    await _refreshItemHistoryModal(itemNum);
  } catch (err) {
    console.error('[item-lock] toggle failed', err);
  }
}

function _drawItemHistoryChart(h) {
  const svg = document.getElementById('im-chart');
  const W = svg.clientWidth || 800, H = 280;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // Right pad widened to ~140 so per-supplier bid labels render beside the
  // anchor-date column without overlapping the EXPECTED marker callout.
  const padL = 56, padR = 140, padT = 16, padB = 36;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const points = (h.po_lines || [])
    .filter(p => p.date && p.unit_price != null)
    .map(p => ({
      date: new Date(p.date),
      price: p.unit_price,
      qty: p.qty,
      excluded: !!p.excluded,
      lineIdx: p.line_idx,
    }));
  if (!points.length) {
    svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="var(--ink-2)" font-family="var(--mono)" font-size="11">no priced order lines</text>`;
    return;
  }
  const minDate = points[0].date.getTime();
  const anchorIso = (h.trend && h.trend.anchor_date) || h.summary.last_order;
  const anchorDate = anchorIso ? new Date(anchorIso) : points[points.length - 1].date;
  const maxDate = anchorDate.getTime();
  const dateRange = Math.max(1, maxDate - minDate);
  // Y range — include the bid-overlay prices so heavy outliers don't clip
  // off the top/bottom of the chart and disappear from view.
  const bidPrices = (h.bids || []).map(b => b.price).filter(v => v != null);
  const minPrice = Math.min(...points.map(p => p.price), ...(bidPrices.length ? bidPrices : [Infinity]));
  const maxPrice = Math.max(
    ...points.map(p => p.price),
    h.trend && h.trend.expected_today != null ? h.trend.expected_today : -Infinity,
    ...(bidPrices.length ? bidPrices : [-Infinity]),
  );
  const priceRange = Math.max(0.01, maxPrice - minPrice);
  // Pad price scale 8% top + 8% bottom
  const yMin = minPrice - priceRange * 0.08;
  const yMax = maxPrice + priceRange * 0.12;
  const yScale = (p) => padT + innerH - ((p - yMin) / (yMax - yMin)) * innerH;
  const xScale = (d) => padL + ((d.getTime() - minDate) / dateRange) * innerW;

  let s = '';

  // Y-axis grid lines + labels (4 ticks)
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yMax - yMin) * (i / 4);
    const y = yScale(v);
    s += `<line x1="${padL}" y1="${y}" x2="${padL + innerW}" y2="${y}" stroke="var(--line)" stroke-dasharray="2,3" opacity="0.5"/>`;
    s += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end" fill="var(--ink-2)" font-family="var(--mono)" font-size="10">$${v.toFixed(2)}</text>`;
  }
  // X-axis labels (year ticks)
  const startYear = new Date(minDate).getFullYear();
  const endYear = anchorDate.getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    const tickDate = new Date(`${y}-01-01`).getTime();
    if (tickDate < minDate || tickDate > maxDate) continue;
    const x = padL + ((tickDate - minDate) / dateRange) * innerW;
    s += `<line x1="${x}" y1="${padT + innerH}" x2="${x}" y2="${padT + innerH + 4}" stroke="var(--line)"/>`;
    s += `<text x="${x}" y="${padT + innerH + 18}" text-anchor="middle" fill="var(--ink-2)" font-family="var(--mono)" font-size="10">${y}</text>`;
  }

  // Trend line — fit through dataset, extended to anchor
  const t = h.trend || {};
  if (t.slope_per_day != null) {
    const x0 = points[0].date.getTime();
    const days0 = 0;
    const days1 = (maxDate - x0) / (1000 * 60 * 60 * 24);
    const y0 = t.intercept;
    const y1 = t.slope_per_day * days1 + t.intercept;
    if (isFinite(y0) && isFinite(y1)) {
      // Solid up to last data point, dashed for the extrapolation
      const lastDays = ((points[points.length - 1].date.getTime() - x0) / (1000 * 60 * 60 * 24));
      const yLast = t.slope_per_day * lastDays + t.intercept;
      const xLast = xScale(points[points.length - 1].date);
      s += `<line x1="${xScale(points[0].date)}" y1="${yScale(y0)}" x2="${xLast}" y2="${yScale(yLast)}" stroke="var(--cyan, var(--accent))" stroke-width="1.5" opacity="0.85"/>`;
      s += `<line x1="${xLast}" y1="${yScale(yLast)}" x2="${xScale(anchorDate)}" y2="${yScale(y1)}" stroke="var(--cyan, var(--accent))" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.65"/>`;
    }
  }

  // 90-day median reference line — analytical baseline for spike detection
  if (t.median_90d != null) {
    const yMed = yScale(t.median_90d);
    s += `<line x1="${padL}" y1="${yMed}" x2="${padL + innerW}" y2="${yMed}" stroke="var(--ink-2)" stroke-dasharray="6,4" opacity="0.45"/>`;
    s += `<text x="${padL + 6}" y="${yMed - 4}" fill="var(--ink-2)" font-family="var(--mono)" font-size="9" letter-spacing="0.08em">90-DAY MEDIAN $${t.median_90d.toFixed(2)}</text>`;
  }

  // Order points — size scales by qty, included points use accent color,
  // EXCLUDED points render greyed and hollow so the eye still sees them
  // (the data isn't gone, just dropped from the trend fit). Most-recent
  // priced+included point is rendered last and styled red if it's a spike.
  const maxQty = Math.max(1, ...points.map(p => p.qty || 1));
  const includedPoints = points.filter(p => !p.excluded);
  const lastPoint = includedPoints.length
    ? includedPoints[includedPoints.length - 1]
    : null;
  const isSpike = t.spike && t.spike.is_spike;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (lastPoint && p === lastPoint) continue; // draw last separately
    const x = xScale(p.date);
    const y = yScale(p.price);
    const r = Math.max(2.5, Math.min(6, 2.5 + (p.qty / maxQty) * 4));
    if (p.excluded) {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--ink-2)" stroke-width="1" opacity="0.55"/>`;
      s += `<line x1="${x - r - 1}" y1="${y - r - 1}" x2="${x + r + 1}" y2="${y + r + 1}" stroke="var(--ink-2)" stroke-width="1" opacity="0.45"/>`;
    } else {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--accent)" opacity="0.78"/>`;
    }
  }
  // Last cleaned-set point — bigger, red if spike, with a price label
  if (lastPoint) {
    const x = xScale(lastPoint.date);
    const y = yScale(lastPoint.price);
    const fill = isSpike ? 'var(--red)' : 'var(--accent)';
    s += `<circle cx="${x}" cy="${y}" r="8" fill="${fill}" opacity="0.25"/>`;
    s += `<circle cx="${x}" cy="${y}" r="5" fill="${fill}"/>`;
    const labelOffsetX = (x > padL + innerW * 0.7) ? -10 : 12;
    const labelAnchor = (x > padL + innerW * 0.7) ? 'end' : 'start';
    s += `<text x="${x + labelOffsetX}" y="${y - 8}" text-anchor="${labelAnchor}" fill="${fill}" font-family="var(--mono)" font-size="11" font-weight="700">$${lastPoint.price.toFixed(2)}</text>`;
    s += `<text x="${x + labelOffsetX}" y="${y + 14}" text-anchor="${labelAnchor}" fill="var(--ink-2)" font-family="var(--mono)" font-size="9" letter-spacing="0.08em">LATEST</text>`;
  }

  // Expected-today marker
  if (t.expected_today != null) {
    const x = xScale(anchorDate);
    const y = yScale(t.expected_today);
    s += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}" stroke="var(--ink-2)" stroke-dasharray="2,3" opacity="0.4"/>`;
    s += `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="var(--green, var(--accent))" stroke-width="2"/>`;
    s += `<text x="${x + 10}" y="${y + 4}" fill="var(--green, var(--ink-0))" font-family="var(--mono)" font-size="11" font-weight="600">$${t.expected_today.toFixed(2)}</text>`;
    s += `<text x="${x + 10}" y="${y - 8}" fill="var(--ink-2)" font-family="var(--mono)" font-size="9" letter-spacing="0.1em">EXPECTED</text>`;
  }

  // Supplier-bid overlays — every priced bid we have for this item, rendered
  // as a horizontal dashed line at its quoted unit price, anchored on the
  // right side of the chart. Color matches the per-bid card below the
  // chart (closest to trend = green; >30% off = red; possible typo = red+
  // dashed). Locked supplier renders solid heavy + cyan/accent.
  const bids = (h.bids || []);
  if (bids.length) {
    // Stack bid labels vertically when their y values are within ~14px so
    // they don't overlap. We render in price-ascending order (server already
    // sorted) and nudge labels up/down only as needed.
    const labelMinSpacing = 14;
    const renderedYs = [];
    for (const b of bids) {
      const yRaw = yScale(b.price);
      const color = _bidOverlayColor(b);
      const dash = b.is_locked ? '' : (b.possible_typo ? '3,3' : '5,3');
      const strokeWidth = b.is_locked ? '2' : '1.2';
      const opacity = b.is_locked ? '1' : '0.85';
      // Horizontal marker — spans the right ~40% of the plot so the
      // historical context on the left isn't visually crowded.
      const xStart = padL + innerW * 0.6;
      s += `<line x1="${xStart}" y1="${yRaw}" x2="${padL + innerW}" y2="${yRaw}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
      // Tick marker at the right edge
      s += `<circle cx="${padL + innerW}" cy="${yRaw}" r="${b.is_locked ? 5 : 3.5}" fill="${color}" opacity="${opacity}"/>`;
      if (b.is_locked) {
        s += `<circle cx="${padL + innerW}" cy="${yRaw}" r="9" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>`;
      }
      // Label position: nudge to avoid collisions with already-rendered labels.
      let yLabel = yRaw + 3;
      for (const yPrev of renderedYs) {
        if (Math.abs(yLabel - yPrev) < labelMinSpacing) {
          yLabel = yPrev + labelMinSpacing;
        }
      }
      renderedYs.push(yLabel);
      const lockGlyph = b.is_locked ? '🔒 ' : '';
      const typoGlyph = b.possible_typo ? ' ⚠' : '';
      const supplierShort = (b.supplier || '').length > 14
        ? (b.supplier.slice(0, 13) + '…')
        : b.supplier;
      s += `<text x="${padL + innerW + 8}" y="${yLabel}" fill="${color}" font-family="var(--mono)" font-size="10" font-weight="${b.is_locked ? '700' : '600'}">${_escapeHtml(lockGlyph + supplierShort)}</text>`;
      s += `<text x="${padL + innerW + 8}" y="${yLabel + 11}" fill="var(--ink-2)" font-family="var(--mono)" font-size="9">$${b.price.toFixed(2)}${typoGlyph}</text>`;
    }
  }

  svg.innerHTML = s;
}

// ==========================================================================
// Save manager — 60s autosave to localStorage + manual named saves
//
// Pattern source: supplier-pricing/app.js (_commitSessionWrite + bookmark
// folder pattern). Two storage tiers:
//   1. localStorage autosave: every 60s if dirty, transparent, no permission
//      prompt. Stores the latest state per-rfq. Acts as the safety net.
//   2. Disk saves (named): require File System Access API + a folder pick.
//      Once picked, manual saves write JSON files into that folder. Falls
//      back to a download if the API isn't available (Firefox / Safari).
//
// State captured (NOT the source xlsx — too large for localStorage):
//   - rfq_id (stable per session)
//   - source meta (filename, headers, sheet name, row count)
//   - column mapping
//   - per-item decisions (included flag overrides + notes)
//   - UI state (active window, min spend, search)
//
// On restore: user re-loads the source xlsx (we don't bundle the binary in
// the JSON), mapping + decisions auto-apply after extraction.
// ==========================================================================
const _saveMgr = (() => {
  const VERSION = 1;
  const AUTOSAVE_PREFIX = 'autorfqbanana:autosave:';
  const AUTOSAVE_INDEX = 'autorfqbanana:autosave_index';
  const AUTOSAVE_INTERVAL_MS = 60 * 1000;

  let _rfqId = null;
  let _folderHandle = null;
  let _autosaveTimer = null;
  let _statusTickTimer = null;
  let _dirty = false;
  let _lastSavedAt = null;       // Date | null
  let _lastSaveMethod = null;    // 'localStorage' | 'folder' | 'download'
  let _onStateChange = null;     // listener for status-bar updates

  function _newRfqId() {
    return 'rfq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function _captureState() {
    const decisions = {};
    if (_rfqResult) {
      for (const it of _rfqResult.items) {
        // Default include policy is "qty_24mo > 0". Only persist deltas.
        const defaultIncluded = (it.qty_24mo || 0) > 0;
        const ds = {};
        if (it.included !== defaultIncluded) ds.included = it.included;
        if (it.note) ds.note = it.note;
        if (Object.keys(ds).length) decisions[it.item_num] = ds;
      }
    }
    // Pull Python-side state synchronously via the runtime
    let pyState = {};
    try {
      if (_pyAppLoaded && _py) {
        const json = _py.runPython(`
import json
from app_engine import serialize_state
json.dumps(serialize_state(), default=str)
`);
        pyState = JSON.parse(json);
      }
    } catch (e) { console.warn('[saveMgr] state serialize failed:', e); }
    return {
      version: VERSION,
      rfq_id: _rfqId,
      saved_at: new Date().toISOString(),
      source: _exportFile ? {
        name: _exportFile.name,
        size: _exportFile.size,
        sheet_name: _exportSheetName,
        row_count: _exportRowCount,
        headers: _exportHeaders,
      } : null,
      mapping: _mapping ? { ..._mapping } : null,
      decisions: decisions,
      ui_state: {
        active_window: $('active-window') ? $('active-window').value : '24',
        min_spend: $('min-spend') ? $('min-spend').value : '0',
        search: $('rfq-search') ? $('rfq-search').value : '',
        tier_filter: $('tier-filter') ? $('tier-filter').value : 'all',
        include_filter: $('include-filter') ? $('include-filter').value : 'all',
      },
      python_state: pyState,
    };
  }

  function _applyState(state) {
    if (!state) return;
    if (state.mapping) _mapping = state.mapping;
    if (state.ui_state) {
      if ($('active-window') && state.ui_state.active_window) $('active-window').value = state.ui_state.active_window;
      if ($('min-spend') && state.ui_state.min_spend != null) $('min-spend').value = state.ui_state.min_spend;
      if ($('rfq-search') && state.ui_state.search != null) $('rfq-search').value = state.ui_state.search;
      if ($('tier-filter') && state.ui_state.tier_filter) $('tier-filter').value = state.ui_state.tier_filter;
      if ($('include-filter') && state.ui_state.include_filter) $('include-filter').value = state.ui_state.include_filter;
    }
    if (state.decisions && _rfqResult) {
      for (const it of _rfqResult.items) {
        const d = state.decisions[it.item_num];
        if (!d) continue;
        if (d.included !== undefined) it.included = d.included;
        if (d.note !== undefined) it.note = d.note;
      }
      if (typeof _renderRfqTable === 'function') _renderRfqTable();
    }
    // Restore python-side state (bids / scenarios / thresholds / difficulty_history)
    if (state.python_state && _pyAppLoaded && _py) {
      try {
        _py.globals.set('_restore_payload', state.python_state);
        _py.runPython(`
from app_engine import restore_state
restore_state(_restore_payload.to_py())
`);
        // Mirror loaded bids back into the JS-side _loadedBids cache
        if (state.python_state.bids) {
          _loadedBids = state.python_state.bids;
        }
      } catch (e) {
        console.warn('[saveMgr] python_state restore failed:', e);
      }
    }
  }

  function autosaveLocal() {
    if (!_rfqId) return false;
    try {
      const s = _captureState();
      const json = JSON.stringify(s);
      // localStorage cap is ~5-10MB per origin — we save mapping + decisions
      // only (no full items list), so we should always be well under that.
      // If we ever start saving items, bytecount + warn.
      localStorage.setItem(AUTOSAVE_PREFIX + _rfqId, json);
      _updateAutosaveIndex(_rfqId, s);
      _lastSavedAt = new Date();
      _lastSaveMethod = 'localStorage';
      _dirty = false;
      _notify();
      return true;
    } catch (err) {
      console.warn('[saveMgr] autosave failed:', err);
      return false;
    }
  }

  function _updateAutosaveIndex(rfqId, state) {
    try {
      const idx = JSON.parse(localStorage.getItem(AUTOSAVE_INDEX) || '{}');
      idx[rfqId] = {
        rfq_id: rfqId,
        saved_at: state.saved_at,
        source_name: state.source ? state.source.name : '(no file)',
      };
      localStorage.setItem(AUTOSAVE_INDEX, JSON.stringify(idx));
    } catch (e) { /* index is best-effort */ }
  }

  function listAutosaves() {
    try {
      const idx = JSON.parse(localStorage.getItem(AUTOSAVE_INDEX) || '{}');
      return Object.values(idx).sort((a, b) => (b.saved_at || '').localeCompare(a.saved_at || ''));
    } catch (e) { return []; }
  }

  function loadAutosave(rfqId) {
    try {
      const raw = localStorage.getItem(AUTOSAVE_PREFIX + (rfqId || ''));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[saveMgr] loadAutosave failed:', err);
      return null;
    }
  }

  function deleteAutosave(rfqId) {
    try {
      localStorage.removeItem(AUTOSAVE_PREFIX + rfqId);
      const idx = JSON.parse(localStorage.getItem(AUTOSAVE_INDEX) || '{}');
      delete idx[rfqId];
      localStorage.setItem(AUTOSAVE_INDEX, JSON.stringify(idx));
    } catch (e) { /* swallow */ }
  }

  async function pickFolder() {
    if (!('showDirectoryPicker' in window)) {
      alert(
        'Folder bookmarking requires Chrome / Edge / Brave (File System Access API).\n\n' +
        'Manual saves still work — they\'ll download as JSON files instead.'
      );
      return false;
    }
    try {
      _folderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      _notify();
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('[saveMgr] folder pick failed:', err);
      return false;
    }
  }

  async function manualSave(name) {
    const safe = (name || 'save').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40) || 'save';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fname = `Save_${_rfqId}_${safe}_${ts}.json`;
    const state = _captureState();
    state.name = name;
    state.kind = 'named';
    const json = JSON.stringify(state, null, 2);

    if (_folderHandle) {
      try {
        const handle = await _folderHandle.getFileHandle(fname, { create: true });
        const w = await handle.createWritable();
        await w.write(json);
        await w.close();
        _lastSavedAt = new Date();
        _lastSaveMethod = 'folder';
        _dirty = false;
        _notify();
        return { ok: true, where: 'folder', name: fname };
      } catch (err) {
        console.warn('[saveMgr] folder save failed; falling back to download:', err);
      }
    }
    // Fallback: trigger a download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    _lastSavedAt = new Date();
    _lastSaveMethod = 'download';
    _dirty = false;
    _notify();
    return { ok: true, where: 'download', name: fname };
  }

  async function loadFromFile(file) {
    const text = await file.text();
    const state = JSON.parse(text);
    if (state.version !== VERSION) {
      console.warn('[saveMgr] version mismatch:', state.version, 'expected', VERSION, '— attempting load anyway');
    }
    _applyState(state);
    if (state.rfq_id) _rfqId = state.rfq_id;
    _notify();
    return state;
  }

  function markDirty() { _dirty = true; _notify(); }

  function isDirty() { return _dirty; }
  function status() {
    return {
      rfq_id: _rfqId,
      dirty: _dirty,
      last_saved_at: _lastSavedAt,
      last_save_method: _lastSaveMethod,
      has_folder: !!_folderHandle,
    };
  }

  function _notify() {
    if (_onStateChange) {
      try { _onStateChange(status()); } catch (e) { /* swallow */ }
    }
  }

  function onChange(fn) { _onStateChange = fn; _notify(); }

  function init(opts) {
    opts = opts || {};
    _rfqId = opts.rfqId || _rfqId || _newRfqId();
    if (_autosaveTimer) clearInterval(_autosaveTimer);
    _autosaveTimer = setInterval(() => { if (_dirty) autosaveLocal(); }, AUTOSAVE_INTERVAL_MS);
    if (_statusTickTimer) clearInterval(_statusTickTimer);
    _statusTickTimer = setInterval(_notify, 1000);  // re-render "Xs ago" labels
    _notify();
  }

  return {
    init, autosaveLocal, manualSave, pickFolder,
    loadFromFile, loadAutosave, listAutosaves, deleteAutosave,
    markDirty, isDirty, status, onChange,
  };
})();

// Expose for console debugging / future UI wiring
window._saveMgr = _saveMgr;

// ==========================================================================
// Save bar UI — injected dynamically (CSS-var styled so it works under
// any palette / design pass). Appears once a session is initialized.
// ==========================================================================
function _injectSaveBar() {
  if (document.getElementById('save-bar')) return; // idempotent
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const bar = document.createElement('div');
  bar.id = 'save-bar';
  bar.style.cssText = [
    'display:flex','align-items:center','gap:8px','flex-wrap:wrap',
    'margin-bottom:24px','padding:10px 14px',
    'background:var(--bg-1)','border:1px solid var(--line)','border-radius:6px',
    'font-family:var(--ui, var(--body, sans-serif))',
    'font-size:13px',
  ].join(';');
  bar.innerHTML = `
    <span style="color:var(--ink-2);font-family:var(--mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">SESSION</span>
    <span id="save-status" style="color:var(--ink-1);font-family:var(--mono);font-size:12px;flex:1;">no auto-save yet</span>
    <button class="btn ghost" id="save-folder-btn" type="button" style="padding:6px 12px;font-size:12px;">📁 Save folder…</button>
    <button class="btn ghost" id="save-as-btn" type="button" style="padding:6px 12px;font-size:12px;">💾 Save as…</button>
    <button class="btn ghost" id="save-restore-btn" type="button" style="padding:6px 12px;font-size:12px;">⮌ Restore…</button>
    <input type="file" id="save-restore-input" accept=".json" style="display:none">
  `;
  // Insert after topbar
  topbar.insertAdjacentElement('afterend', bar);

  // Wire buttons
  document.getElementById('save-folder-btn').addEventListener('click', async () => {
    const ok = await _saveMgr.pickFolder();
    if (ok) _flashStatus('Folder bookmarked — manual saves will write here.');
  });
  document.getElementById('save-as-btn').addEventListener('click', async () => {
    const name = prompt('Name this save point (e.g. "before exclusions" or "post-review"):');
    if (name === null) return; // cancelled
    const res = await _saveMgr.manualSave(name || 'save');
    if (res.ok) {
      _flashStatus(`Saved · ${res.where} · ${res.name}`);
    }
  });
  document.getElementById('save-restore-btn').addEventListener('click', () => {
    document.getElementById('save-restore-input').click();
  });
  document.getElementById('save-restore-input').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const state = await _saveMgr.loadFromFile(f);
      _flashStatus(`Restored · ${state.name || state.rfq_id} · re-extracting if needed…`);
      // If we have a current source file + saved mapping, re-run extract to
      // surface the state in-app. Otherwise the user needs to re-pick a source.
      if (_exportBytes && state.mapping) {
        await _runExtract();
        _saveMgr.init({ rfqId: state.rfq_id });
      }
    } catch (err) {
      alert('Restore failed: ' + (err.message || err));
    }
  });

  // Subscribe to status updates
  _saveMgr.onChange((s) => {
    const el = document.getElementById('save-status');
    if (!el) return;
    if (!s.last_saved_at) {
      el.textContent = 'no auto-save yet';
      el.style.color = 'var(--ink-2)';
      return;
    }
    const sec = Math.max(0, Math.floor((Date.now() - s.last_saved_at.getTime()) / 1000));
    const ago = sec < 60 ? `${sec}s ago` : `${Math.floor(sec/60)}m ago`;
    const folder = s.has_folder ? ' · folder bookmarked' : '';
    if (s.dirty) {
      el.textContent = `unsaved changes · last auto-save ${ago}${folder}`;
      el.style.color = 'var(--accent, var(--red))';
    } else {
      el.textContent = `auto-saved ${ago}${folder}`;
      el.style.color = 'var(--green, var(--ink-1))';
    }
  });
}

function _flashStatus(msg) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = 'var(--green, var(--ink-0))';
  // Next 1s status tick will overwrite this with the live status; that's fine
  // — the flash is just a momentary confirmation.
}

// ==========================================================================
// Helpers
// ==========================================================================
function _escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function _truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
