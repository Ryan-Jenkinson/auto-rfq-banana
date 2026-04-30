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

// Decision Summary xlsx — the legal-hold narrative companion. Generated on
// demand from current state; analyst should download once they've finalized
// the award decision (typically right before generating award letters).
const _genDecBtn = $('gen-decision-summary');
if (_genDecBtn) {
  _genDecBtn.addEventListener('click', async () => {
    if (!_py) { alert('Engine not loaded yet.'); return; }
    _genDecBtn.disabled = true;
    const orig = _genDecBtn.textContent;
    _genDecBtn.textContent = '⏳ Building Decision Summary…';
    try {
      // Use the source-data filename stem if available so the Decision Summary
      // file lives next to the rest of the RFQ packet (audit log, exclusion
      // log, award letters) without naming collisions.
      const stem = (_exportFile && _exportFile.name)
        ? _exportFile.name.replace(/\.xlsx$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '_')
        : 'rfq';
      const ts = new Date().toISOString().slice(0, 10);
      const rfqId = (window._rfqResult && window._rfqResult.rfq_id) || stem;
      const rfqIdLit = JSON.stringify(rfqId);
      const out = await _py.runPythonAsync(`
import base64
from app_engine import gen_decision_summary_xlsx
b = gen_decision_summary_xlsx(scenario_name=None, rfq_id=${rfqIdLit})
base64.b64encode(b).decode("ascii")
`);
      const bytes = Uint8Array.from(atob(out), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `DecisionSummary_auto-rfq-banana_${stem}_${ts}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error('[decision-summary]', err);
      alert('Decision Summary export failed: ' + (err.message || err));
    } finally {
      _genDecBtn.disabled = false;
      _genDecBtn.textContent = orig;
    }
  });
}
$('to-bids').addEventListener('click', async () => {
  _showStep(4);
  await _refreshBidViews();
});

// ==========================================================================
// Step 2: column mapping (auto-detect via aliases + manual override)
// ==========================================================================
const RFQ_FIELDS = [
  { key: 'item_num',    label: 'Item #',                hint: 'Andersen Item Number — usually populated; blank for some cXML / PunchOut supplier exports (where the supplier\'s own SKU lives in the Part Number column instead)' },
  { key: 'eam_pn',      label: 'EAM Part Number',       hint: 'Andersen-side fallback if Item # missing' },
  { key: 'part_number', label: 'Supplier Part Number',  hint: 'Supplier\'s own catalog SKU (e.g. Red Team\'s "RT-5709A45"). Used as fallback dedup key when Item # / EAM are blank' },
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
  const name = prompt('Name this mapping template (e.g. "Coupa-RedTeam-export"):');
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
  _refreshExclusionLogBanner();
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

  // Each KPI is wired as a filter — click flips the RFQ-table filters to
  // show that slice. data-* attributes pick this up via the listener at the
  // bottom of this function. tabindex + role expose them as buttons for
  // keyboard nav. Hover cue lives in app.css (.kpi.clickable).
  $('kpi-row').innerHTML = `
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="show-all" title="Show all items in the candidate list — clears window/tier/include/min-spend filters."><div class="kpi-label">Items</div><div class="kpi-value">${k.item_count.toLocaleString()}</div><div class="kpi-sub">unique part numbers · click to clear filters</div></div>
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="show-all" title="Total all-time spend across every PO line — click to clear filters and show every item."><div class="kpi-label">Total spend (all)</div><div class="kpi-value">${fmt$(k.total_spend)}</div><div class="kpi-sub">${k.po_count.toLocaleString()} POs · ${k.line_count.toLocaleString()} lines</div></div>
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="scroll-charts" title="Click to scroll to the annual-spend + top-15 charts."><div class="kpi-label">Date range</div><div class="kpi-value">${k.years_span.toFixed(2)} yr</div><div class="kpi-sub">${k.first_order} → ${k.last_order}</div></div>
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="window-12" title="Filter the table to the 12-month window (qty + spend re-pivot to last 12 months)."><div class="kpi-label">12-mo spend</div><div class="kpi-value">${fmt$(k.spend_12mo)}</div><div class="kpi-sub">${k.items_12mo.toLocaleString()} items active · click to filter</div></div>
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="window-24" title="Filter the table to the 24-month window — the default RFQ baseline."><div class="kpi-label">24-mo spend</div><div class="kpi-value">${fmt$(k.spend_24mo)}</div><div class="kpi-sub">${k.items_24mo.toLocaleString()} items active · click to filter</div></div>
    <div class="kpi clickable" tabindex="0" role="button" data-kpi-action="window-36" title="Filter the table to the 36-month window — wider net, catches slow-moving items."><div class="kpi-label">36-mo spend</div><div class="kpi-value">${fmt$(k.spend_36mo)}</div><div class="kpi-sub">${k.items_36mo.toLocaleString()} items active · click to filter</div></div>
    ${difficultyTile.replace('<div class="kpi"', '<div class="kpi clickable" tabindex="0" role="button" data-kpi-action="difficulty"').replace('">', '" title="Click to view the difficulty signals (what\'s dragging the score down).">')}
  `;
  for (const tile of $('kpi-row').querySelectorAll('[data-kpi-action]')) {
    const handle = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      _handleRfqKpiClick(tile.getAttribute('data-kpi-action'));
    };
    tile.addEventListener('click', handle);
    tile.addEventListener('keydown', handle);
  }
}

function _handleRfqKpiClick(action) {
  // Each branch flips the filter inputs the user already understands and
  // triggers the same _renderRfqTable / _saveMgr.markDirty flow that
  // typing into the filter would. No new render path; just shortcuts.
  if (action === 'show-all') {
    if ($('active-window')) $('active-window').value = 'all';
    if ($('tier-filter'))   $('tier-filter').value = 'all';
    if ($('include-filter'))$('include-filter').value = 'all';
    if ($('min-spend'))     $('min-spend').value = '0';
    if ($('rfq-search'))    $('rfq-search').value = '';
  } else if (action === 'window-12' || action === 'window-24' || action === 'window-36') {
    const w = action.split('-')[1];
    if ($('active-window')) $('active-window').value = w;
  } else if (action === 'scroll-charts') {
    const stage = $('charts-stage');
    if (stage) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  } else if (action === 'difficulty') {
    _showDifficultyModal();
    return;
  } else {
    return;
  }
  _renderRfqTable();
  if (_saveMgr) _saveMgr.markDirty();
}

function _showDifficultyModal() {
  if (!_rfqResult || !_rfqResult.difficulty) return;
  const d = _rfqResult.difficulty;
  let modal = document.getElementById('difficulty-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'difficulty-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const diffColor = d.score >= 70 ? 'var(--red)' : d.score >= 50 ? 'var(--accent)' : d.score >= 30 ? 'var(--cyan)' : 'var(--green)';
  let signalsHtml = '';
  for (const sig of (d.signals || [])) {
    signalsHtml += `<li style="margin-bottom:8px;color:var(--ink-1);">
      <strong style="color:var(--ink-0);">${_escapeHtml(sig.label || sig.name || '?')}</strong>
      ${sig.value != null ? ` <span style="color:var(--ink-2);font-family:var(--mono);">(${_escapeHtml(String(sig.value))})</span>` : ''}
      ${sig.detail ? ` — ${_escapeHtml(sig.detail)}` : ''}
    </li>`;
  }
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:680px;width:100%;max-height:88vh;overflow:auto;padding:28px 32px;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">FILE DIFFICULTY</div>
          <div style="font-size:48px;font-weight:700;line-height:1;color:${diffColor};font-family:var(--mono);">${d.score}<span style="font-size:18px;color:var(--ink-2);font-weight:400;">/100</span></div>
          <div style="font-size:14px;font-weight:600;color:${diffColor};margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">${d.level}</div>
        </div>
        <button id="diff-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <p style="color:var(--ink-1);font-size:14px;line-height:1.6;margin-bottom:18px;">${_escapeHtml(d.summary || '')}</p>
      <h3 style="margin:18px 0 10px;font-size:11px;color:var(--ink-2);font-weight:600;text-transform:uppercase;letter-spacing:0.10em;">Signals dragging the score</h3>
      <ul style="padding-left:20px;line-height:1.6;font-size:13px;margin:0;">${signalsHtml || '<li style="color:var(--ink-2);">No signals — this is a clean file.</li>'}</ul>
    </div>
  `;
  document.getElementById('diff-close').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
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

  // ELI5 tooltips on every column header — plain-language explanations a
  // procurement person reads first time they look at the table.
  let head = `<tr>
    <th class="cell-include" title="Untick to drop an item from the RFQ. Default tick = had qty in the last 24 months. The 'Smart trim' button bulk-unticks WEAK/SKIP rows + risky description patterns.">RFQ</th>
    <th title="Andersen item number (or supplier Part Number when EAM is blank — common in cXML / PunchOut supplier exports). The dedup key the engine matched on across the multi-year export.">Item #</th>
    <th title="Engine score 0-100 + tier. STRONG = order frequency + recent activity + clean data. MODERATE = some flags. WEAK = thin/dormant history. SKIP = almost certainly not RFQ-worthy. Hover any tier chip for the per-item reason list.">Tier</th>
    <th title="The description Andersen has on file for this item. Chips next to it: red = service / freight / tariff / obsolete / rental (usually don't belong in an RFQ); amber = custom / repair / misc (caution); UOM mixed / MFG blank flags surface data hygiene issues.">Description</th>
    <th title="Manufacturer name. Often the strongest signal an RFQ has — suppliers price by manufacturer first, item number second. 'MFG blank' chip means the export didn't carry one for this item.">MFG</th>
    <th title="Manufacturer's part number. The supplier-side anchor key — what the bidder uses to look up their cost. Blank means the export didn't carry one (common in cXML / PunchOut supplier data).">MFG PN</th>
    <th class="num" title="Quantity ordered in the last 12 months (anchored to the dataset's most recent order date, not today's date — exports are often weeks stale).">12mo qty</th>
    <th class="num" title="12mo $ = qty_12mo × LAST $/ea. Internally consistent: 5 bananas at $5 each = $25. NOT the historical sum of line totals — that's spend_12mo_actual which you'd see in the headline KPI tile above.">12mo $</th>
    <th class="num" title="Quantity ordered in the last 24 months. The default RFQ baseline window — what the outbound RFQ xlsx asks suppliers to bid against.">24mo qty</th>
    <th class="num" title="24mo $ = qty_24mo × LAST $/ea. The spend baseline this RFQ is bidding against.">24mo $</th>
    <th class="num" title="Quantity ordered in the last 36 months. Wider net — catches slow-moving items the 24-mo window would miss.">36mo qty</th>
    <th class="num" title="36mo $ = qty_36mo × LAST $/ea.">36mo $</th>
    <th class="num" title="The exact unit price of the most-recent priced order line for this item — to-the-penny, no rounding, no averaging. Drives every spend column in this row. Excluding outliers in the per-item modal recomputes this from the cleaned set.">Last $/ea</th>
    <th title="Unit of measure (canonicalized — Each / EA / EACH all map to EA). 'UOM mixed' chip means the history has more than one distinct UOM for this item — worth confirming before sending out the RFQ.">UOM</th>
    <th title="Date of the most recent priced order. 'Stale &gt;12mo' chip if it's been over a year — supplier may have changed pricing or stopped carrying the part.">Last order</th>
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
      // clutter on data sets where most items are generic).
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

  // Click row (anywhere except the include checkbox) → open per-item history modal.
  // tabindex="0" makes the row focusable so arrow-key nav (below) can move
  // focus across rows and Enter opens the modal.
  $('rfq-table').querySelectorAll('tbody tr[data-item]').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.setAttribute('tabindex', '0');
    tr.addEventListener('click', (e) => {
      // Ignore clicks on the checkbox cell
      if (e.target.closest('.cell-include')) return;
      const itemNum = tr.getAttribute('data-item');
      _openItemHistory(itemNum);
    });
    tr.addEventListener('focus', () => _setKbFocusRow(tr));
  });

  // After re-render, if there's a remembered keyboard-focused item_num,
  // restore focus + the kbd-focus class so arrow nav resumes seamlessly.
  if (_kbFocusedItemNum) {
    const target = $('rfq-table').querySelector(`tbody tr[data-item="${CSS.escape(_kbFocusedItemNum)}"]`);
    if (target) {
      _setKbFocusRow(target, /*scrollIntoView=*/false);
    } else {
      _kbFocusedItemNum = null;
    }
  }
}

// ----------------------------------------------------------------------------
// Keyboard navigation across the RFQ-list table + comparison-matrix table.
//
// ↑ / ↓     move focus to prev/next row in the same tbody (wraps)
// Home / End jump to first / last row in the visible tbody
// Enter      open the per-item modal for the focused row
// Esc        close the per-item modal (if open) — handled in _ensureItemModal
//
// Module state: _kbFocusedItemNum tracks the last-focused item_num so a
// re-render (filter change, sort) can restore focus to the same row when
// it's still in the visible set.
// ----------------------------------------------------------------------------
let _kbFocusedItemNum = null;

function _setKbFocusRow(tr, scrollIntoView = true) {
  if (!tr) return;
  // Strip prior focus indicators
  for (const old of document.querySelectorAll('tr.kbd-focus')) {
    old.classList.remove('kbd-focus');
  }
  tr.classList.add('kbd-focus');
  _kbFocusedItemNum = tr.getAttribute('data-item') || tr.getAttribute('data-comp-item') || null;
  if (scrollIntoView) {
    try { tr.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch (_) {}
  }
}

function _kbNavRows(direction, fromTr) {
  // direction: -1 (up), +1 (down), 'home', 'end'
  const tbody = fromTr ? fromTr.parentElement : null;
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr[tabindex="0"]'));
  if (!rows.length) return;
  const idx = rows.indexOf(fromTr);
  let next;
  if (direction === 'home') next = rows[0];
  else if (direction === 'end') next = rows[rows.length - 1];
  else if (direction === -1) next = rows[(idx - 1 + rows.length) % rows.length];
  else next = rows[(idx + 1) % rows.length];
  next.focus();
}

document.addEventListener('keydown', (ev) => {
  // Ignore when the user is typing in an input / select / textarea.
  const tag = (ev.target && ev.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  // Ignore when the per-item modal is open — its own keyboard handler
  // catches Esc; arrow keys inside it would just scroll the modal.
  const modal = document.getElementById('item-modal');
  if (modal && modal.style.display === 'flex') return;

  const tr = ev.target.closest && ev.target.closest('tr[tabindex="0"]');
  if (!tr) return;

  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    _kbNavRows(+1, tr);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    _kbNavRows(-1, tr);
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    _kbNavRows('home', tr);
  } else if (ev.key === 'End') {
    ev.preventDefault();
    _kbNavRows('end', tr);
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    const itemNum = tr.getAttribute('data-item') || tr.getAttribute('data-comp-item');
    if (itemNum) _openItemHistory(itemNum);
  }
});

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
// ----------------------------------------------------------------------------
// Smart Trim — policy-driven bulk RFQ-include flipper.
//
// Replaces the old single-button "untick WEAK/SKIP + red desc" with a
// collapsible panel that lets the analyst pick:
//   - Dormancy window (12 / 24 / 36 mo OR off) — different supplier
//     categories have different ordering cadences
//   - Drop red description flags (service/freight/tariff/obsolete/rental)
//   - Drop by tier (WEAK + SKIP, or SKIP only — keeps WEAK borderline items)
//   - Drop below a $ minimum 24-mo spend
//
// Every toggle change recomputes the live summary on the right (no commit).
// Apply commits the unticks, snapshots the prior include-state into
// _smartTrimUndoSnapshot, and shows an Undo button for 30 seconds.
// Manual decisions (items where the user has already toggled vs the default)
// are surfaced in the summary so a careless Apply doesn't silently overwrite
// 20 minutes of per-item review work.
// ----------------------------------------------------------------------------
const _SMART_TRIM_RED_FLAGS = new Set(['service', 'freight', 'tariff', 'obsolete', 'rental']);

let _smartTrimUndoSnapshot = null;     // {item_num: bool} — RFQ-include state immediately before last apply
let _smartTrimUndoTimer = null;

function _smartTrimReadPolicy() {
  return {
    dormancy_on: !!$('st-dormancy-on') && $('st-dormancy-on').checked,
    dormancy_window: (() => {
      const r = document.querySelector('input[name="st-dormancy"]:checked');
      return r ? r.value : '24';
    })(),
    redflags_on: !!$('st-redflags-on') && $('st-redflags-on').checked,
    tier_on: !!$('st-tier-on') && $('st-tier-on').checked,
    tier_mode: (() => {
      const r = document.querySelector('input[name="st-tier"]:checked');
      return r ? r.value : 'WEAK_SKIP';
    })(),
    minspend_on: !!$('st-minspend-on') && $('st-minspend-on').checked,
    minspend_value: parseFloat(($('st-minspend-value') && $('st-minspend-value').value) || '0') || 0,
  };
}

function _smartTrimEvaluate(policy) {
  // Returns { willCut, willKeep, byBucket, manualOverwrites, examples } —
  // willCut = items that would be unticked if Apply ran right now.
  // Each item evaluated against every active rule; bucket counts are
  // per-rule (an item can land in multiple buckets — counts may overlap).
  if (!_rfqResult) return null;
  const wKey12 = '_12mo', wKey24 = '_24mo', wKey36 = '_36mo';
  const dormQty = (it) => {
    const w = policy.dormancy_window;
    if (w === '12') return it.qty_12mo || 0;
    if (w === '24') return it.qty_24mo || 0;
    if (w === '36') return it.qty_36mo || 0;
    return 0;
  };
  let willCut = 0, willKeep = 0;
  let bucketDormant = 0, bucketRedflag = 0, bucketTier = 0, bucketMinspend = 0;
  let manualOverwrites = 0;
  const examplesCut = [];
  for (const it of _rfqResult.items) {
    let cut = false;
    if (policy.dormancy_on && dormQty(it) === 0) { cut = true; bucketDormant++; }
    if (policy.redflags_on && (it.desc_flags || []).some(f => _SMART_TRIM_RED_FLAGS.has(f))) {
      cut = true; bucketRedflag++;
    }
    if (policy.tier_on) {
      const t = it.tier || 'WEAK';
      if (policy.tier_mode === 'WEAK_SKIP' && (t === 'WEAK' || t === 'SKIP')) { cut = true; bucketTier++; }
      else if (policy.tier_mode === 'SKIP_ONLY' && t === 'SKIP') { cut = true; bucketTier++; }
    }
    if (policy.minspend_on && (it.spend_24mo_actual || it.spend_24mo || 0) < policy.minspend_value) {
      cut = true; bucketMinspend++;
    }
    if (cut) {
      willCut++;
      if (it.included && examplesCut.length < 3) {
        examplesCut.push({
          item_num: it.item_num,
          description: (it.description || '').slice(0, 50),
        });
      }
      // Manual-overwrite guard: default-included = qty_24mo > 0. If the
      // user has explicitly TICKED an item that the engine would have
      // un-ticked by default, that's a manual override we'd be erasing.
      const defaultIncluded = (it.qty_24mo || 0) > 0;
      if (it.included && !defaultIncluded) manualOverwrites++;
    } else {
      if (it.included) willKeep++;
    }
  }
  return {
    willCut, willKeep,
    byBucket: { dormant: bucketDormant, redflag: bucketRedflag, tier: bucketTier, minspend: bucketMinspend },
    manualOverwrites,
    examplesCut,
  };
}

function _smartTrimRenderSummary() {
  const body = document.getElementById('st-summary-body');
  if (!body) return;
  const policy = _smartTrimReadPolicy();
  const hasAnyRule = policy.dormancy_on || policy.redflags_on || policy.tier_on || policy.minspend_on;
  if (!hasAnyRule) {
    body.innerHTML = '<span style="color:var(--ink-2);">No rules active. Tick at least one toggle on the left to see a preview.</span>';
    document.getElementById('st-apply').disabled = true;
    return;
  }
  document.getElementById('st-apply').disabled = false;
  const e = _smartTrimEvaluate(policy);
  if (!e) {
    body.innerHTML = '<span style="color:var(--ink-2);">Need to extract the RFQ first.</span>';
    return;
  }
  const fmt = (n) => n.toLocaleString();
  const activeRules = [];
  if (policy.dormancy_on)  activeRules.push(`zero qty in ${policy.dormancy_window}-mo (${fmt(e.byBucket.dormant)})`);
  if (policy.redflags_on)  activeRules.push(`red description flags (${fmt(e.byBucket.redflag)})`);
  if (policy.tier_on)      activeRules.push(`tier ${policy.tier_mode === 'SKIP_ONLY' ? 'SKIP only' : 'WEAK + SKIP'} (${fmt(e.byBucket.tier)})`);
  if (policy.minspend_on)  activeRules.push(`24-mo spend &lt; $${fmt(policy.minspend_value)} (${fmt(e.byBucket.minspend)})`);
  let html = `<div style="margin-bottom:8px;color:var(--ink-2);">Active rules: ${activeRules.join(' · ')}</div>`;
  html += `<div style="font-size:14px;color:var(--ink-0);margin-bottom:6px;"><strong style="color:var(--red);">${fmt(e.willCut)}</strong> items will be unticked</div>`;
  html += `<div style="font-size:14px;color:var(--ink-0);margin-bottom:14px;"><strong style="color:var(--green);">${fmt(e.willKeep)}</strong> items kept ticked for the RFQ</div>`;
  if (e.manualOverwrites > 0) {
    html += `<div style="margin-bottom:10px;padding:8px 10px;background:rgba(255,77,109,0.08);border:1px solid var(--red);border-radius:3px;color:var(--red);font-size:11px;">⚠ <strong>${fmt(e.manualOverwrites)}</strong> manual decisions will be overwritten — items you've ticked despite the engine's default. Confirm dialog will list them before commit.</div>`;
  }
  if (e.examplesCut.length) {
    html += '<div style="color:var(--ink-2);margin-bottom:6px;">Examples that would be cut:</div>';
    for (const ex of e.examplesCut) {
      html += `<div style="padding-left:8px;font-size:11px;color:var(--ink-1);">· <code>${_escapeHtml(ex.item_num)}</code> ${_escapeHtml(ex.description)}</div>`;
    }
  }
  body.innerHTML = html;
}

function _smartTrimApply() {
  if (!_rfqResult) return;
  const policy = _smartTrimReadPolicy();
  const e = _smartTrimEvaluate(policy);
  if (!e || e.willCut === 0) {
    alert('No items match the current policy — nothing to untick.');
    return;
  }
  let confirmMsg = `Apply Smart Trim?\n\n${e.willCut.toLocaleString()} items will be unticked.\n${e.willKeep.toLocaleString()} items will remain ticked for the RFQ.`;
  if (e.manualOverwrites > 0) {
    confirmMsg += `\n\n⚠ ${e.manualOverwrites} of the items being unticked are manual decisions you previously made (ticked despite engine default). These will be overwritten.`;
  }
  confirmMsg += `\n\nReversible — click Undo within 30 seconds, or 'Include all visible' to undo broadly.`;
  if (!confirm(confirmMsg)) return;

  // Snapshot prior include-state for undo
  const snapshot = {};
  for (const it of _rfqResult.items) snapshot[it.item_num] = !!it.included;
  _smartTrimUndoSnapshot = snapshot;

  // Apply
  let trimmed = 0;
  for (const it of _rfqResult.items) {
    if (!it.included) continue;
    let cut = false;
    if (policy.dormancy_on) {
      const w = policy.dormancy_window;
      const q = (w === '12') ? it.qty_12mo : (w === '36') ? it.qty_36mo : it.qty_24mo;
      if ((q || 0) === 0) cut = true;
    }
    if (policy.redflags_on && (it.desc_flags || []).some(f => _SMART_TRIM_RED_FLAGS.has(f))) cut = true;
    if (policy.tier_on) {
      const t = it.tier || 'WEAK';
      if (policy.tier_mode === 'WEAK_SKIP' && (t === 'WEAK' || t === 'SKIP')) cut = true;
      else if (policy.tier_mode === 'SKIP_ONLY' && t === 'SKIP') cut = true;
    }
    if (policy.minspend_on && (it.spend_24mo_actual || it.spend_24mo || 0) < policy.minspend_value) cut = true;
    if (cut) { it.included = false; trimmed++; }
  }
  $('trim-status').textContent = `Trimmed ${trimmed.toLocaleString()} items · ${e.willKeep.toLocaleString()} still included`;
  _renderRfqTable();
  _smartTrimRenderSummary();  // refresh in case re-eval reflects post-trim state
  _saveMgr.markDirty();

  // Show the Undo button for 30 seconds
  const undoBtn = document.getElementById('st-undo');
  if (undoBtn) {
    undoBtn.style.display = '';
    if (_smartTrimUndoTimer) clearTimeout(_smartTrimUndoTimer);
    _smartTrimUndoTimer = setTimeout(() => {
      undoBtn.style.display = 'none';
      _smartTrimUndoSnapshot = null;
    }, 30000);
  }
}

function _smartTrimUndo() {
  if (!_smartTrimUndoSnapshot || !_rfqResult) return;
  let restored = 0;
  for (const it of _rfqResult.items) {
    const prior = _smartTrimUndoSnapshot[it.item_num];
    if (prior !== undefined && it.included !== prior) {
      it.included = prior;
      restored++;
    }
  }
  $('trim-status').textContent = `Undo: restored ${restored.toLocaleString()} items to their prior include state.`;
  _renderRfqTable();
  _smartTrimRenderSummary();
  _saveMgr.markDirty();
  // Clear the snapshot + hide button
  _smartTrimUndoSnapshot = null;
  if (_smartTrimUndoTimer) { clearTimeout(_smartTrimUndoTimer); _smartTrimUndoTimer = null; }
  const undoBtn = document.getElementById('st-undo');
  if (undoBtn) undoBtn.style.display = 'none';
}

// Wire toggles + buttons
if ($('smart-trim-toggle')) {
  $('smart-trim-toggle').addEventListener('click', () => {
    const panel = document.getElementById('smart-trim-panel');
    if (!panel) return;
    const showing = panel.style.display !== 'none';
    panel.style.display = showing ? 'none' : '';
    if (!showing) _smartTrimRenderSummary();
  });
}
for (const id of ['st-dormancy-on', 'st-redflags-on', 'st-tier-on', 'st-minspend-on', 'st-minspend-value']) {
  const el = $(id);
  if (el) el.addEventListener('input', _smartTrimRenderSummary);
}
document.querySelectorAll('input[name="st-dormancy"], input[name="st-tier"]').forEach(r => {
  r.addEventListener('change', _smartTrimRenderSummary);
});
if ($('st-apply')) $('st-apply').addEventListener('click', _smartTrimApply);
if ($('st-undo')) $('st-undo').addEventListener('click', _smartTrimUndo);

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
  // Each bar is wrapped in a <g data-bar-item="..."> so a delegated click
  // handler below can route bar/label clicks to _openItemHistory. Hover
  // cue: subtle accent fill so the user knows the bar is interactive.
  top.forEach((it, i) => {
    const w = (it.spend_24mo || 0) / max * innerW;
    const y = padT + i * (barH + 3);
    const lbl = _truncate(it.item_num, 14);
    s += `<g class="top-bar-row" data-bar-item="${_escapeHtml(it.item_num)}" style="cursor:pointer;">`;
    // Invisible full-row hit-box so the label text is also clickable.
    s += `<rect x="0" y="${y}" width="${W}" height="${barH.toFixed(1)}" fill="transparent" pointer-events="all"/>`;
    s += `<rect class="bar" x="${padL}" y="${y}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" rx="2"/>`;
    s += `<text x="${padL - 6}" y="${y + barH / 2 + 3}" text-anchor="end" font-size="10" fill="var(--ink-1)" font-family="var(--mono)">${_escapeHtml(lbl)}</text>`;
    s += `<text x="${padL + w + 4}" y="${y + barH / 2 + 3}" font-size="10" fill="var(--ink-2)" font-family="var(--mono)">$${Math.round(it.spend_24mo || 0).toLocaleString()}</text>`;
    s += `<title>${_escapeHtml(it.item_num)} — $${Math.round(it.spend_24mo || 0).toLocaleString()} 24-mo · click to drill in</title>`;
    s += `</g>`;
  });
  svg.innerHTML = s;
  svg.querySelectorAll('[data-bar-item]').forEach(g => {
    g.addEventListener('click', () => _openItemHistory(g.getAttribute('data-bar-item')));
  });
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
    'Red Team\nBlue Team\nGreen Team'
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

// ----------------------------------------------------------------------------
// Exclusion log (master data-quality record) — export + reminder banner.
//
// Every per-item modal exclusion / unexclusion appends an entry to a
// Python-side log with the line snapshot + pre-exclusion median + avg of
// the OTHER priced lines. The xlsx export uses a cross-app-friendly schema
// (app_source / event_type / item_num / line snapshot / before metrics) so
// downstream this can be concatenated with the supplier-pricing and
// tariff-impact data-quality logs into one audit packet.
// ----------------------------------------------------------------------------
async function _refreshExclusionLogBanner() {
  const banner = document.getElementById('exclusion-log-banner');
  if (!banner) return;
  if (!_pyAppLoaded || !_py) { banner.style.display = 'none'; return; }
  try {
    const out = _py.runPython(`
import json
from app_engine import get_exclusion_log_summary
json.dumps(get_exclusion_log_summary())
`);
    const s = JSON.parse(out || '{}');
    const n = s.n_exclusions || 0;
    if (!n) { banner.style.display = 'none'; banner.innerHTML = ''; return; }
    const fmt$ = (v) => '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const dollars = s.total_dollars_removed ? ` (${fmt$(s.total_dollars_removed)} of removed line totals)` : '';
    const reverted = s.n_unexclusions ? ` · ${s.n_unexclusions} re-included` : '';
    banner.style.display = '';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span style="color:var(--cyan);font-weight:700;font-family:var(--mono);letter-spacing:0.06em;">📋 ${n} EXCLUSIONS THIS SESSION</span>
        <span>across ${s.n_distinct_items || 0} item${(s.n_distinct_items||0) === 1 ? '' : 's'}${dollars}${reverted}.</span>
        <span style="color:var(--ink-2);font-size:11px;">Reminder: export the log before you close — it's part of the master data-quality record (cross-app concat with supplier-pricing + tariff-impact).</span>
        <button type="button" class="btn ghost" id="exclusion-log-banner-export" title="Same as the toolbar button — export the cross-app data-quality event log xlsx." style="padding:4px 10px;font-size:11px;margin-left:auto;">📋 Export now</button>
      </div>
    `;
    const b = document.getElementById('exclusion-log-banner-export');
    if (b) b.addEventListener('click', _exportExclusionLog);
  } catch (err) {
    banner.style.display = 'none';
  }
}

async function _exportExclusionLog() {
  if (!_pyAppLoaded || !_py) { alert('Python runtime still booting — wait a moment and try again.'); return; }
  const btn = $('export-exclusion-log');
  if (btn) { btn.disabled = true; btn.textContent = 'Building xlsx…'; }
  try {
    const out = await _py.runPythonAsync(`
import base64
from app_engine import gen_exclusion_log_xlsx, get_exclusion_log_summary
_b = gen_exclusion_log_xlsx()
_s = get_exclusion_log_summary()
import json
json.dumps({"xlsx_b64": base64.b64encode(_b).decode('ascii'), "summary": _s})
`);
    const result = JSON.parse(out);
    if ((result.summary && result.summary.n_exclusions === 0) && (result.summary.n_unexclusions === 0)) {
      alert('No exclusions yet — nothing to export. Untick a suspicious row in the per-item modal first.');
      return;
    }
    const bytes = Uint8Array.from(atob(result.xlsx_b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 10);
    const stem = (_exportFile && _exportFile.name) ? _exportFile.name.replace(/\.xlsx$/i, '') : 'rfq';
    a.href = url; a.download = `DataQualityLog_auto-rfq-banana_${stem}_${ts}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error('[exclusion-log export]', err);
    alert('Exclusion-log export failed: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📋 Export exclusion log…'; }
  }
}

if ($('export-exclusion-log')) {
  $('export-exclusion-log').addEventListener('click', _exportExclusionLog);
}

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

// ----------------------------------------------------------------------------
// Comparison-matrix filter state — drives the working-table filtering surfaced
// by the click-targets audit (KPI tiles, recommendation chips, supplier cards,
// consolidation rows all funnel into here). Each field is independent — set
// any combo and `_applyMatrixFilter(rows)` returns the filtered subset:
//   coverage:        'FULL' | 'PARTIAL' | 'SINGLE' | 'NONE' | null
//   recommendation:  'ACCEPT' | 'PUSH_BACK' | 'ASK_CLARIFICATION' |
//                    'MANUAL_REVIEW' | 'EXCLUDE' | null
//   supplier:        supplier name (only show items where this supplier
//                    has a priced bid; their column gets emphasized)
//   outliersOnly:    true → only rows with outlier_flag set
//   typoOnly:        true → only rows where any priced bid has ratio ≤ 0.4
//                    against history (the per-item POSSIBLE_TYPO threshold)
// `_lastMatrixData` caches the last server-side payload so filter clicks can
// re-render without re-running the Python matrix compute (the matrix is
// expensive — ~1-2 s on 11k items).
// ----------------------------------------------------------------------------
let _matrixFilter = { coverage: null, recommendation: null, supplier: null, outliersOnly: false, typoOnly: false };
let _lastMatrixData = null;

// Round 2 / Rn focused-RFQ selection — Set of item_num picked from the
// comparison matrix for the next negotiation round. Synced to Python state
// via set_round2_selection on every change so save/reload preserves picks.
let _round2Selection = new Set();

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
    .replace(/[\s_-]*Round[\s_]*\d+.*/i, '')
    .replace(/[\s_-]*R\d+.*/i, '')
    .replace(/[\s_-]*\d+[\.\-]\d+.*/g, '')
    .replace(/[\s_-]+/g, ' ')
    .trim() || stem;
  const name = prompt(`Supplier name for "${file.name}":`, suggest);
  if (!name) return;

  $('bid-add-btn').disabled = true;
  $('bid-add-btn').textContent = 'Parsing…';
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    _py.globals.set('_bid_bytes', bytes);
    _py.globals.set('_bid_supplier', name);
    // Always sniff for Round-N first regardless of filename — the sheet
    // names (set by gen_round2_rfq_xlsx as "Round N Response") are
    // intrinsic to the file and survive any rename. parse_round2_supplier_bid
    // returns {error: ...} for R1 files (no Round-style sheet found,
    // header pattern doesn't match), so we fall back cleanly. This
    // prevents a renamed R2 file from being misrouted as R1 (which would
    // clobber the supplier's R1 bid set).
    const out = await _py.runPythonAsync(`
import json
from app_engine import ingest_supplier_bid, ingest_round2_supplier_bid, parse_round2_supplier_bid
sniff = parse_round2_supplier_bid(_bid_bytes.to_py(), supplier_name=_bid_supplier)
is_round_n = (not sniff.get("error")) and bool(sniff.get("items")) and (sniff.get("round") or 0) >= 2
if is_round_n:
    result = ingest_round2_supplier_bid(_bid_bytes.to_py(), _bid_supplier)
    result["routed_via"] = f"round_{result.get('round', 2)}"
else:
    result = ingest_supplier_bid(_bid_bytes.to_py(), _bid_supplier)
    result["routed_via"] = "round_1"
json.dumps(result, default=str)
`);
    const parsed = JSON.parse(out);
    if (parsed.routed_via && parsed.routed_via.startsWith('round_') && parsed.routed_via !== 'round_1' && parsed.routed_via !== 'round_1_fallback_after_round_sniff') {
      // Round-N overwrite path — surface the result via a focused toast
      // (we don't replace _loadedBids since R2 is an overwrite, not a
      // fresh bid set; the underlying _STATE["bids"][supplier]["bids"]
      // was patched in place and the next _refreshBidViews picks it up).
      alert(
        `Round ${parsed.round} ingest for ${parsed.supplier}:\n` +
        `  • ${parsed.n_repriced} item(s) repriced\n` +
        `  • ${parsed.n_no_bid_overwrites} explicit decline(s)\n` +
        `  • ${parsed.n_new_items} new item(s) (not in R1)\n` +
        `  • ${parsed.n_unchanged_r1} R1 bid(s) untouched (blank in R2)\n\n` +
        `Comparison matrix below will refresh with the new prices.`
      );
      // Refresh _loadedBids from Python's _STATE["bids"] so the intake
      // panel shows the updated counts.
      const refreshed = await _py.runPythonAsync(`
import json
from app_engine import _STATE
json.dumps((_STATE.get('bids', {}) or {}).get(${JSON.stringify(name)}, {}), default=str)
`);
      try {
        _loadedBids[name] = JSON.parse(refreshed);
      } catch (_) { /* swallow */ }
    } else {
      _loadedBids[name] = parsed;
    }
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
  // Card body is itself a click-target — clicking sets the matrix filter to
  // this supplier (single-supplier focus mode in the comparison matrix
  // below). The × and follow-up buttons inside the card stop propagation
  // so they keep their original behavior.
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">';
  for (const sup of suppliers) {
    const p = _loadedBids[sup];
    const s = p.summary || {};
    const isFocused = (_matrixFilter.supplier === sup);
    const focusBorder = isFocused ? 'var(--accent)' : 'var(--line)';
    const focusBg = isFocused ? 'rgba(255,183,51,0.06)' : 'var(--bg-1)';
    html += `
      <div class="clickable-card" tabindex="0" role="button" data-supplier-card="${_escapeHtml(sup)}" title="Click to focus the comparison matrix on ${_escapeHtml(sup)} — only items they priced will show. Click again to clear." style="background:${focusBg};border:1px solid ${focusBorder};border-radius:6px;padding:18px;${isFocused ? 'box-shadow:0 0 0 1px var(--accent) inset;' : ''}">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;">
          <div style="font-family:var(--ui);font-weight:600;font-size:16px;color:var(--ink-0);">${_escapeHtml(sup)}${isFocused ? ' <span style="font-size:10px;color:var(--accent);font-family:var(--mono);letter-spacing:0.1em;margin-left:4px;">FOCUSED</span>' : ''}</div>
          <button class="btn ghost" data-remove-supplier="${_escapeHtml(sup)}" title="Remove this supplier's bid from the analysis (does not delete the source xlsx)." style="padding:4px 10px;font-size:11px;">×</button>
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
          <button class="btn ghost" data-followup-supplier="${_escapeHtml(sup)}" title="Build a 7-tab follow-up xlsx with the items where ${_escapeHtml(sup)} bid NO_BID / NEED_INFO / UOM_DISC / SUBSTITUTE — for one round of cleanup before awarding." style="padding:6px 12px;font-size:11px;">⬇ Follow-up xlsx</button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  wrap.innerHTML = html;
  // Card-body click → toggle supplier focus on the matrix.
  wrap.querySelectorAll('[data-supplier-card]').forEach(card => {
    const handle = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      // Don't re-fire if the inner buttons (× / follow-up) handled it.
      if (ev.target.closest('[data-remove-supplier]') || ev.target.closest('[data-followup-supplier]')) return;
      ev.preventDefault();
      const sup = card.getAttribute('data-supplier-card');
      _matrixFilter.supplier = (_matrixFilter.supplier === sup) ? null : sup;
      _rerenderMatrixWithFilters();
      // Scroll to the matrix so the user sees what they filtered.
      const compEl = $('comparison-section');
      if (compEl) compEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    card.addEventListener('click', handle);
    card.addEventListener('keydown', handle);
  });
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

// Step-4 redesign — module-level state.
//
// _activeChip:  which strategy chip is currently selected in the headline.
//   Defaults to 'consolidate_to' when bids loaded (Ryan's standard playbook),
//   or 'lowest_qualified' when no consolidation candidate exists.
// _consolidateSupplier: the supplier the user picked from the consolidate-to
//   dropdown (null = use system default = top consolidation candidate).
// _lastHeadline: cache of the most recent compute_headline_strategies payload
//   so chip flips can re-render the headline without round-tripping Python.
let _activeChip = null;
let _consolidateSupplier = null;
let _lastHeadline = null;

async function _refreshConsolidationAndMatrix() {
  const consolEl = $('consolidation-block');
  const compEl = $('comparison-section');
  const scenEl = $('scenarios-section');
  const headlineEl = $('headline-card');
  const drawerStack = $('drawer-stack');
  const partialBanner = $('partial-data-banner');

  if (!Object.keys(_loadedBids).length) {
    if (consolEl) consolEl.innerHTML = '';
    compEl.innerHTML = '';
    if (scenEl) scenEl.innerHTML = '';
    $('bid-summary-row').innerHTML = '';
    if (headlineEl) { headlineEl.innerHTML = ''; headlineEl.hidden = true; }
    if (drawerStack) drawerStack.hidden = true;
    if (partialBanner) { partialBanner.innerHTML = ''; partialBanner.hidden = true; }
    return;
  }
  if (consolEl) consolEl.innerHTML = '<div style="padding:24px;color:var(--ink-2);font-family:var(--mono);font-size:12px;">Computing consolidation analysis…</div>';
  compEl.innerHTML = '';

  // Pass the current consolidate supplier into compute_headline_strategies
  // so the consolidate_to chip's totals reflect the user's picked target
  // (or the system default if they haven't picked one yet).
  const consolSupplierLit = _consolidateSupplier ? JSON.stringify(_consolidateSupplier) : 'None';
  const out = await _py.runPythonAsync(`
import json
from app_engine import (
  compute_comparison_matrix, compute_consolidation_analysis,
  list_award_scenarios, compute_clean_savings_summary,
  list_round2_selection, compute_headline_strategies,
)
result = {
  "matrix": compute_comparison_matrix(),
  "consolidation": compute_consolidation_analysis(),
  "scenarios": list_award_scenarios(),
  "clean_savings": compute_clean_savings_summary(),
  "round2_selection": list_round2_selection(),
  "headline": compute_headline_strategies(${consolSupplierLit}),
}
json.dumps(result, default=str)
`);
  const data = JSON.parse(out);
  // Rehydrate the round-2 selection from saved Python state so a reloaded
  // session shows the analyst's prior R2 picks intact.
  _round2Selection = new Set(data.round2_selection || []);
  _lastHeadline = data.headline;
  if (_activeChip == null) {
    _activeChip = data.headline.default_chip || 'lowest_qualified';
  }
  if (_consolidateSupplier == null) {
    _consolidateSupplier = data.headline.default_consolidate_supplier || null;
  }
  if (headlineEl) headlineEl.hidden = false;
  if (drawerStack) drawerStack.hidden = false;
  _renderHeadlineCard(data.headline, data.consolidation);
  _renderPartialDataBanner();
  _renderBidCoverageKPIs(data.matrix);
  _renderCleanSavingsPanel(data.clean_savings);
  _renderConsolidation(data.consolidation);
  _renderComparisonMatrix(data.matrix);
  _renderScenariosBlock(data.scenarios, data.consolidation);
  _updateDrawerTeasers(data);
}

// Returns the count of expected suppliers — sourced from the outbound RFQs
// the analyst generated in step 3. If we don't have that record, return null
// (and the partial-data banner suppresses itself).
function _expectedSupplierCount() {
  try {
    const list = (window._rfqResult && window._rfqResult.outbound_history) || [];
    if (Array.isArray(list) && list.length) {
      const seen = new Set();
      for (const o of list) { if (o && o.supplier) seen.add(String(o.supplier).toLowerCase()); }
      return seen.size || null;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function _renderPartialDataBanner() {
  const el = $('partial-data-banner');
  if (!el) return;
  const expected = _expectedSupplierCount();
  const loaded = Object.keys(_loadedBids).length;
  if (!expected || loaded >= expected) {
    el.innerHTML = ''; el.hidden = true; return;
  }
  el.hidden = false;
  el.className = 'partial-data-banner';
  el.innerHTML = `<span class="pdb-icon">⚠</span><span>Showing analysis based on <b style="color:var(--ink-0);">${loaded}</b> of <b style="color:var(--ink-0);">${expected}</b> expected suppliers — drop the remaining bid xlsx files for the full comparison. The recommendation below will sharpen as more bids arrive.</span>`;
}

// HEADLINE CARD — the "system recommendation" surface. Reads from _lastHeadline
// and _activeChip; can be re-rendered cheaply on chip flip without a Python
// round-trip (chip flip just changes which strategy's totals we display).
function _renderHeadlineCard(headline, consolidation) {
  const el = $('headline-card');
  if (!el) return;
  el.className = 'headline-card';
  const fmt$ = (n) => n == null ? '—' : (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtPct = (n) => n == null ? '—' : (n < 0 ? '+' : '−') + Math.abs(n).toFixed(1) + '%';

  const strategies = headline.strategies || {};
  const active = strategies[_activeChip] || strategies.lowest_qualified || null;
  const ovr = headline.manual_overrides || {n_locks: 0, n_exclusions: 0, n_uom_resolutions: 0};
  const totalOverrides = (ovr.n_locks||0) + (ovr.n_exclusions||0) + (ovr.n_uom_resolutions||0);
  const th = headline.thresholds || {};
  const carvePct = th.carve_out_min_savings_pct != null ? Math.round(th.carve_out_min_savings_pct * 100) : 20;
  const carveDollar = th.carve_out_min_savings_annual_dollar != null ? th.carve_out_min_savings_annual_dollar : 3000;

  // Determine the display supplier for the verdict line:
  //   - consolidate_to: show the chip's named target (consolidate_supplier)
  //     even if carves shift the actual $-primary supplier elsewhere.
  //     The chip strip's caption + drawer teaser surface the carve $.
  //   - everything else: show the highest-$ supplier (supplier_primary).
  let verdictSupplier = null;
  if (active) {
    verdictSupplier = (_activeChip === 'consolidate_to') ? active.consolidate_supplier : active.supplier_primary;
  }
  // Headline reads apples-to-apples covered numbers — uncovered (no-bid) items
  // are surfaced separately so they don't masquerade as savings. The "11,169
  // items" pre-fix was the total; we now show the count flowing to the verdict
  // supplier (or the consolidate target for consolidate_to). Uncovered items
  // get their own line.
  const savingsTotal = active ? active.covered_savings_total : 0;
  const savingsPct = active ? active.covered_savings_pct : 0;
  const awardTotal = active ? active.covered_award_total : 0;
  const nCarved = active ? (active.n_carved || 0) : 0;
  const nSuspectHeld = active ? (active.n_suspect_carves_held || 0) : 0;
  const nLocksUnhonored = active ? (active.n_locks_unhonored || 0) : 0;
  const nUncovered = active ? (active.uncovered_count || 0) : 0;
  const uncoveredHistTotal = active ? (active.uncovered_historical_total || 0) : 0;
  // Items going to the headline supplier — for consolidate_to that's the
  // chip's named target; for everything else it's the supplier_primary.
  let headlineSupplierItems = 0;
  if (active && active.items_by_supplier) {
    if (_activeChip === 'consolidate_to' && active.consolidate_supplier) {
      headlineSupplierItems = active.items_by_supplier[active.consolidate_supplier] || 0;
    } else {
      headlineSupplierItems = active.supplier_primary_items || 0;
    }
  }
  const nItemsAwarded = active ? (active.n_awarded || 0) : 0;

  // Strategy chip list — labels + tooltips
  const chips = [
    {key: 'lowest_price',        label: 'Lowest Price',         tip: 'For each item, pick whoever bid lowest. No filtering of UOM mismatches or substitutions. Use sparingly — exposes you to UOM-pollution.'},
    {key: 'lowest_qualified',    label: 'Lowest Qualified',     tip: 'Same as Lowest Price but skips bids flagged UOM_DISC or SUBSTITUTE. Standard "best on paper" cut. This is what the recommendation engine produces.'},
    {key: 'consolidate_to',      label: 'Consolidate to ▾',     tip: `Award everything to one supplier — except items where another saves ≥${carvePct}% OR ≥$${carveDollar.toLocaleString()}/yr (the carve-out OR-rule). Click to pick supplier.`},
    {key: 'incumbent_preferred', label: 'Incumbent Preferred',  tip: 'Stay with the historical supplier when their bid is within ~5% of the lowest. Avoids switching costs / new-supplier setup overhead when savings are marginal.'},
    {key: 'manual',              label: 'Manual',               tip: 'Use saved manual scenarios (created via the Saved Scenarios drawer). The headline reflects whatever scenario is loaded.'},
  ];

  const chipHtml = chips.map(c => {
    const isActive = _activeChip === c.key;
    const summary = strategies[c.key];
    let savings = '';
    if (summary && summary.covered_savings_total != null) {
      const s = summary.covered_savings_total;
      const sign = s >= 0 ? '' : '−';
      savings = `<span class="chip-savings">${sign}$${Math.abs(s).toLocaleString('en-US',{maximumFractionDigits:0})}</span>`;
    } else if (c.key === 'manual') {
      savings = '<span class="chip-savings">load saved</span>';
    }
    let label = c.label;
    if (c.key === 'consolidate_to') {
      const sup = active && _activeChip === 'consolidate_to' && active.consolidate_supplier
        ? active.consolidate_supplier : (headline.default_consolidate_supplier || '—');
      label = `Consolidate to: ${sup} <span class="chip-caret">▾</span>`;
    }
    return `<button class="chip${isActive?' active':''}" data-chip="${c.key}" type="button" title="${c.tip.replace(/"/g,'&quot;')}">${label}${savings}</button>`;
  }).join('');

  // Manual-override pip row — clickable per-class
  const lockPip = ovr.n_locks > 0
    ? `<span class="override-pip" data-override="locks" title="${ovr.n_locks} item lock(s). Click to open the locks panel and review/clear individually."><span class="pip-dot"></span>${ovr.n_locks} lock${ovr.n_locks===1?'':'s'}</span>`
    : `<span class="override-pip empty"><span class="pip-dot"></span>0 locks</span>`;
  const excPip = ovr.n_exclusions > 0
    ? `<span class="override-pip" data-override="exclusions" title="${ovr.n_exclusions} item(s) with at least one excluded order line. Click to see the exclusion review log."><span class="pip-dot"></span>${ovr.n_exclusions} outlier-exclusion${ovr.n_exclusions===1?'':'s'}</span>`
    : `<span class="override-pip empty"><span class="pip-dot"></span>0 outlier-exclusions</span>`;
  const uomPip = ovr.n_uom_resolutions > 0
    ? `<span class="override-pip" data-override="uom" title="${ovr.n_uom_resolutions} UOM annotation(s) applied. Click to open the UOM resolution drawer."><span class="pip-dot"></span>${ovr.n_uom_resolutions} UOM resolution${ovr.n_uom_resolutions===1?'':'s'}</span>`
    : `<span class="override-pip empty"><span class="pip-dot"></span>0 UOM resolutions</span>`;
  const resetBtn = totalOverrides > 0
    ? `<button class="btn-reset-auto" id="btn-reset-auto" type="button" title="Clear every manual override (locks, outlier exclusions, UOM annotations). The system returns to its purely-auto recommendation. Audit-logged. Confirms first.">↺ Reset to auto</button>`
    : `<button class="btn-reset-auto" disabled title="No manual overrides applied — already at auto.">↺ Reset to auto</button>`;

  // Verdict line variants
  // Verdict line — for consolidate_to, show the named target. For everything
  // else, the strategy distributes awards across N suppliers; show the primary
  // and tease the per-supplier split below.
  let verdictLine;
  if (verdictSupplier) {
    if (_activeChip === 'consolidate_to') {
      verdictLine = `<span class="arrow">→</span><span class="award-label">CONSOLIDATE TO</span><span class="supplier-name">${_escapeHtml(verdictSupplier)}</span>`;
    } else {
      verdictLine = `<span class="arrow">→</span><span class="award-label">AWARD: PRIMARY</span><span class="supplier-name">${_escapeHtml(verdictSupplier)}</span>`;
    }
  } else {
    verdictLine = `<span class="arrow">→</span><span class="placeholder">No clear winner — review bids below.</span>`;
  }

  // Per-supplier split line — small mono row directly under the money line.
  // Shows where the awarded $ actually lands across suppliers (the "AWARD TO X"
  // primary alone hides the split when 3 suppliers each get a chunk).
  const byS = (active && active.award_by_supplier) || {};
  const itemsByS = (active && active.items_by_supplier) || {};
  const supEntries = Object.entries(byS).filter(([s, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  let splitLine = '';
  if (supEntries.length > 1) {
    const parts = supEntries.map(([s, v]) => {
      const items = itemsByS[s] || 0;
      return `<span style="color:var(--ink-0);">${_escapeHtml(s)}</span> <span style="color:var(--ink-2);">${fmt$(v)}</span> <span style="color:var(--ink-2);">(${items.toLocaleString()})</span>`;
    });
    splitLine = `<div class="headline-split" title="Distribution of awarded $ across suppliers under the active strategy. Counts in parens are item counts." style="font-family:var(--mono);font-size:11px;color:var(--ink-2);letter-spacing:0.02em;margin-top:6px;margin-bottom:14px;">SPLIT: ${parts.join(' &nbsp;·&nbsp; ')}</div>`;
  }

  // Subhead counts line — items-going-to-headline-supplier (not the total RFQ),
  // carves count, R2 candidates, and the all-important UNCOVERED line so the
  // analyst sees no-bid items as a follow-up signal.
  const headlineSupplierLbl = (_activeChip === 'consolidate_to') ? (active && active.consolidate_supplier) : verdictSupplier;
  const itemsCountTxt = headlineSupplierLbl
    ? `<span title="Items flowing to ${_escapeHtml(headlineSupplierLbl)} under the active strategy (n_carved go to other suppliers; uncovered items get no award).">${headlineSupplierItems.toLocaleString()} items → ${_escapeHtml(headlineSupplierLbl)}</span>`
    : `<span>${nItemsAwarded.toLocaleString()} items awarded</span>`;
  const carveCountTxt = nCarved > 0 ? `<span class="sep">·</span><span style="color:var(--ink-1);" title="Items carved off the consolidate target to a cheaper supplier per the OR-rule (≥${carvePct}% or ≥$${carveDollar.toLocaleString()}/yr).">${nCarved} carve-out${nCarved===1?'':'s'}</span>` : '';
  const suspectHeldTxt = nSuspectHeld > 0 ? `<span class="sep">·</span><span style="color:var(--accent);" title="Carves that would have fired but the cheaper bid was UOM-suspect (UOM_DISC or extreme price ratio). Held at the consolidate target's price — verify UOM before counting these as savings.">${nSuspectHeld} suspect carve${nSuspectHeld===1?'':'s'} held</span>` : '';
  const unhonoredTxt = nLocksUnhonored > 0 ? `<span class="sep">·</span><span style="color:var(--accent);" title="Item locks where the locked supplier had no priced bid → the lock fell through to strategy logic.">${nLocksUnhonored} lock${nLocksUnhonored===1?'':'s'} unhonored</span>` : '';
  const r2Count = (typeof _round2Selection !== 'undefined' ? _round2Selection.size : 0);
  const r2CountTxt = r2Count > 0 ? `<span class="sep">·</span><span style="color:var(--cyan);">${r2Count} R2 candidate${r2Count===1?'':'s'}</span>` : '';
  const uncoveredTxt = nUncovered > 0
    ? `<div style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--red);letter-spacing:0.02em;" title="Items where NO supplier provided a priced bid. Their historical spend ($X) is NOT included in the savings figure above. Send a follow-up RFQ or consolidate elsewhere.">⚠ ${nUncovered.toLocaleString()} items uncovered (no bid) — ${fmt$(uncoveredHistTotal)} historical, NOT in savings</div>`
    : '';

  // Strategy explainer — incumbent-not-bidding fallthrough warning
  const incumbentBidding = (typeof headline !== 'undefined' && headline) ? headline.incumbent_is_bidding : true;
  const incumbentName = (typeof headline !== 'undefined' && headline) ? (headline.incumbent_name || 'incumbent') : '';
  let strategyExplainer = '';
  if (_activeChip === 'incumbent_preferred' && !incumbentBidding) {
    strategyExplainer = `<div class="strategy-explainer" title="Incumbent Preferred only differs from Lowest Price when the historical supplier has a bid you'd consider keeping. Since they don't, this strategy degrades to Lowest Price for every item." style="margin-top:10px;padding:6px 12px;background:rgba(255,183,51,0.08);border:1px solid var(--accent-deep);border-radius:3px;font-family:var(--mono);font-size:10px;color:var(--accent);letter-spacing:0.04em;">ⓘ ${_escapeHtml(incumbentName) || 'The incumbent'} isn't bidding — this strategy is identical to Lowest Price for every item.</div>`;
  }

  el.innerHTML = `
    <div class="headline-pretitle" title="The system's automatic award recommendation given the current bids + your manual overrides. Flip the chip strip below to see what each strategy would produce. The numbers update live.">SYSTEM RECOMMENDATION</div>
    <div class="headline-verdict">${verdictLine}</div>
    <div class="headline-money">
      <span class="total" title="Total $ awarded under the active strategy on items that received a priced bid. Apples-to-apples — items with no bid are not in this number.">${fmt$(awardTotal)}</span>
      <span class="${savingsTotal >= 0 ? 'saves' : 'saves-bad'}" title="Cost avoidance vs the historical baseline of awarded items only. Positive = saves vs what we paid historically. Items with no priced bid are excluded — see the warning line if any.">${savingsTotal >= 0 ? 'saves' : 'costs'} ${fmt$(Math.abs(savingsTotal))}</span>
      <span class="pct" title="Savings as a percent of the covered (awarded-items-only) historical baseline.">${fmtPct(savingsPct)}</span>
    </div>
    ${splitLine}
    <div class="headline-counts">
      ${itemsCountTxt}${carveCountTxt}${suspectHeldTxt}${r2CountTxt}${unhonoredTxt}
    </div>
    ${uncoveredTxt}
    <div class="chip-strip" id="chip-strip">${chipHtml}</div>
    ${strategyExplainer}
    <div class="override-row">
      <span class="muted" style="text-transform:uppercase;letter-spacing:0.10em;font-size:10px;">Manual overrides:</span>
      ${lockPip} ${excPip} ${uomPip}
      <span class="override-spacer"></span>
      ${resetBtn}
    </div>
  `;

  // Wire chip clicks
  for (const btn of el.querySelectorAll('[data-chip]')) {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const key = btn.getAttribute('data-chip');
      if (key === 'consolidate_to') {
        _toggleConsolidatePicker(btn, headline);
        return;
      }
      _setActiveChip(key);
    });
  }
  // Override pip clicks
  for (const pip of el.querySelectorAll('[data-override]')) {
    pip.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _handleOverridePipClick(pip.getAttribute('data-override'));
    });
  }
  // Reset-to-auto
  const resetBtnEl = $('btn-reset-auto');
  if (resetBtnEl && !resetBtnEl.disabled) {
    resetBtnEl.addEventListener('click', _handleResetToAuto);
  }
}

// Set the active chip + re-render the headline (and re-fetch headline data
// only when the chip is consolidate_to with a different supplier — the other
// strategies are pre-computed on every refresh).
async function _setActiveChip(key) {
  _activeChip = key;
  if (_lastHeadline) _renderHeadlineCard(_lastHeadline, null);
}

function _toggleConsolidatePicker(anchorBtn, headline) {
  // If picker already open, close it
  const prior = document.getElementById('consolidate-picker');
  if (prior) { prior.remove(); _setActiveChip('consolidate_to'); return; }

  const wrap = document.createElement('div');
  wrap.className = 'consolidate-picker-wrap';
  // The picker positions absolutely below the chip
  const picker = document.createElement('div');
  picker.id = 'consolidate-picker';
  picker.className = 'consolidate-picker';
  const suppliers = (headline && headline.available_consolidate_suppliers) || Object.keys(_loadedBids);
  picker.innerHTML = suppliers.map(s => {
    const sel = (s === _consolidateSupplier) ? ' selected' : '';
    return `<div class="picker-row${sel}" data-supplier="${_escapeHtml(s)}">${_escapeHtml(s)}</div>`;
  }).join('') || '<div class="picker-row" style="cursor:default;color:var(--ink-2);">No priced bids</div>';

  // Anchor below the chip button
  const rect = anchorBtn.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';
  document.body.appendChild(picker);

  // Pick → set _consolidateSupplier and re-fetch headline
  for (const row of picker.querySelectorAll('[data-supplier]')) {
    row.addEventListener('click', async () => {
      _consolidateSupplier = row.getAttribute('data-supplier');
      picker.remove();
      _activeChip = 'consolidate_to';
      // Re-fetch — Python recomputes the consolidate_to summary with the
      // newly-picked supplier as the consolidation target.
      await _refreshConsolidationAndMatrix();
    });
  }
  // Click outside closes
  setTimeout(() => {
    const closeOnOutside = (ev) => {
      if (!picker.contains(ev.target) && ev.target !== anchorBtn) {
        picker.remove();
        document.removeEventListener('click', closeOnOutside, true);
      }
    };
    document.addEventListener('click', closeOnOutside, true);
  }, 0);
}

function _handleOverridePipClick(kind) {
  if (kind === 'locks') {
    // Scroll the analyst to the matrix and surface a list of locked items.
    // For now, simple: open the audit-log modal filtered to lock events.
    if (typeof _openAuditModal === 'function') _openAuditModal({filter: 'lock'});
    else alert('Lock list — feature pending. Use the per-item modal\'s lock button to review/clear.');
  } else if (kind === 'exclusions') {
    // Trigger the exclusion-log download (the master record).
    const btn = document.getElementById('export-exclusion-log');
    if (btn) btn.click();
    else alert('Exclusion log — open the per-item modals to review.');
  } else if (kind === 'uom') {
    // Open the UOM resolution drawer + scroll to it.
    const drawer = document.getElementById('drawer-advanced');
    if (drawer) { drawer.open = true; drawer.scrollIntoView({behavior:'smooth', block:'start'}); }
    const panel = document.getElementById('uom-resolution-panel');
    if (panel) panel.style.display = 'block';
  }
}

async function _handleResetToAuto() {
  const ok = confirm(
    'Reset to auto? This will clear:\n' +
    '  • all item locks\n' +
    '  • all per-item outlier exclusions\n' +
    '  • all UOM annotations\n\n' +
    'The system returns to its purely-auto recommendation. The action is audit-logged. Continue?'
  );
  if (!ok) return;
  await _py.runPythonAsync(`
from app_engine import reset_to_auto
import json
json.dumps(reset_to_auto())
`);
  // Fully refresh — RFQ list aggregates may have changed
  await _refreshConsolidationAndMatrix();
  // Patch the RFQ table too if exclusions changed last_unit_price
  if (typeof _renderRfqTable === 'function' && window._rfqResult) {
    // pull fresh items
    const out = await _py.runPythonAsync(`
import json
from app_engine import _STATE
json.dumps(_STATE.get("items", []))
`);
    try {
      window._rfqResult.items = JSON.parse(out);
      _renderRfqTable();
    } catch (e) { /* ignore */ }
  }
}

// Drawer teaser update — the collapsed-row caption that shows $ + count.
// Called after every refresh. Reads _activeChip to flow strategy-specific
// numbers (the carve-out drawer's $ depends on the active strategy's carves).
function _updateDrawerTeasers(data) {
  const fmt$ = (n) => n == null ? '—' : (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', {maximumFractionDigits: 0});

  // Hybrid drawer: carve-out savings from consolidation analysis
  const hybridT = $('drawer-hybrid-teaser');
  if (hybridT) {
    const w = (data.consolidation && data.consolidation.winner) || null;
    const carves = (w && w.carve_outs) || [];
    const carveSavings = (w && w.carve_out_savings_total) || 0;
    if (carves.length === 0) {
      hybridT.innerHTML = '<span class="empty">no carve-outs at current thresholds</span>';
    } else {
      hybridT.innerHTML = `<span class="savings">+${fmt$(carveSavings)}</span> &nbsp;<span class="count">${carves.length} item${carves.length===1?'':'s'} carved</span>`;
    }
  }

  // R2 drawer: count selected + estimated impact
  const r2T = $('drawer-r2-teaser');
  if (r2T) {
    const n = (typeof _round2Selection !== 'undefined') ? _round2Selection.size : 0;
    if (n === 0) {
      r2T.innerHTML = '<span class="empty">no items selected — pick rows in the matrix above</span>';
    } else {
      r2T.innerHTML = `<span class="count">${n} item${n===1?'':'s'} flagged</span> &nbsp;<span style="color:var(--cyan);">ready to send</span>`;
    }
  }

  // Scenarios drawer
  const scT = $('drawer-scenarios-teaser');
  if (scT) {
    const scs = data.scenarios || [];
    if (scs.length === 0) {
      scT.innerHTML = '<span class="empty">0 saved — bookmark the active chip below to come back to it</span>';
    } else {
      scT.innerHTML = `<span class="count">${scs.length} scenario${scs.length===1?'':'s'} saved</span>`;
    }
  }

  // Advanced drawer
  const advT = $('drawer-advanced-teaser');
  if (advT) {
    const t = (data.clean_savings && data.clean_savings.totals) || {};
    if (t.strict != null) {
      advT.innerHTML = `<span style="color:var(--ink-1);">CLEAN ${fmt$(t.clean)}</span> &nbsp;<span class="savings">STRICT ${fmt$(t.strict)}</span>`;
    } else {
      advT.innerHTML = '<span class="empty">savings tiers · UOM resolution · audit log</span>';
    }
  }
}

function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
}

// Renders the RAW / CLEAN / STRICT savings tiers as a panel below the bid-coverage KPIs.
// Added on the demo-existing-rfq branch to surface the "real" savings number for the
// the multi-supplier demo (Red / Blue / Green Team) where the RAW number is polluted by UOM mismatches.
//
// Tiers (per supplier + aggregate):
//   RAW    = current dashboard behavior — every priced bid contributes (UOM-mismatched lines too)
//   CLEAN  = excludes lines flagged UOM_DISC / NO_BID / NEED_INFO / SUBSTITUTE
//   STRICT = CLEAN + bid UOM matches history UOM after normalization
function _renderCleanSavingsPanel(clean) {
  if (!clean || !clean.by_supplier) return;
  // Step-4 redesign: clean-savings panel lives in the Advanced drawer.
  // Append as a child of clean-savings-host so the panel sits cleanly inside
  // the drawer body (legacy behavior of inserting AFTER bid-summary-row
  // would split the panel out of any container).
  const wrap = $('clean-savings-host');
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
  wrap.insertAdjacentHTML('beforeend', html);
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
// Built on the demo-existing-rfq branch to support a multi-supplier (Red /
// Blue / Green Team) real-bid demo where UOM mismatches dominate the discrepancy bucket. The
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
          Items where the bid's unit-of-measure differs from your history. Look up the supplier catalog (or stockroom) to find the conversion factor, type it in below, hit Save. Item moves out of the queue and into the NORMALIZED savings tier. State persists with the save file — your colleague sees your resolutions when they open your shared backup.
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

  // Quick-create row — each strategy button carries an ELI5 explanation of
  // what the engine does when you pick it, so the analyst can tell which
  // award philosophy matches the situation without re-reading the docs.
  html += `<div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
    <button class="btn ghost" data-scenario-quick="lowest_price" title="Award every item to whichever supplier bid the lowest priced offer — UOM mismatches and substitute parts INCLUDED. Maximizes raw savings on paper; least defensible if a 'lowest' price is actually a UOM error.">＋ Lowest price</button>
    <button class="btn ghost" data-scenario-quick="lowest_qualified" title="Like 'Lowest price' but EXCLUDES bids flagged UOM_DISC or SUBSTITUTE — picks the lowest 'clean' bid per item. The defensible default — what you'd present in an audit.">＋ Lowest qualified (no UOM/sub)</button>`;
  // One consolidate-to button per supplier
  for (const sup of (Object.keys(_loadedBids) || [])) {
    html += `<button class="btn ghost" data-scenario-consolidate="${_escapeHtml(sup)}" title="Award everything to ${_escapeHtml(sup)} as primary, but carve out items where another supplier saves &gt;30% (the carve_out_min_savings_pct threshold). Models 'one PO, fewer relationships, identified exceptions' — Ryan's actual award strategy.">＋ Consolidate to ${_escapeHtml(sup)}</button>`;
  }
  html += `<button class="btn ghost" data-scenario-quick="incumbent_preferred" title="Stay with the incumbent supplier wherever they bid — unless competition saves at least min_savings_pct_to_switch (threshold setting). Use when relationship continuity matters or switching costs are real.">＋ Incumbent preferred</button>`;
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
    <th title="Items awarded a priced bid under this strategy / total items in the RFQ. The gap = items with no priced bid (uncovered)." style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Awarded</th>
    <th style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Uncovered</th>
    <th title="Total $ awarded to suppliers under this strategy. Apples-to-apples — covers awarded items only." style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Award total</th>
    <th title="Historical $ paid for the same set of items the strategy awarded. Apples-to-apples — covers awarded items only." style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Historical (covered)</th>
    <th title="Cost avoidance vs historical, on the awarded items only. Items with no priced bid are NOT included — see Uncovered column." style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Savings</th>
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
      <td style="padding:12px 14px;text-align:right;color:${(t.uncovered_count||0) > 0 ? 'var(--red)' : 'var(--ink-2)'};" title="${(t.uncovered_count||0) > 0 ? `${t.uncovered_count} items with no priced bid — ${fmt$(t.uncovered_historical_total)} historical NOT in savings` : ''}">${(t.uncovered_count||0).toLocaleString()}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-0);">${fmt$(t.covered_award_total)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${fmt$(t.covered_historical_total)}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--green);font-weight:600;">${fmt$(t.covered_savings_total)} <span style="color:var(--ink-2);">(${fmtPct(t.covered_savings_pct)})</span></td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-1);">${(t.items_switched||0).toLocaleString()}</td>
      <td style="padding:12px 14px;text-align:right;color:var(--ink-2);font-size:11px;">${(s.saved_at||'').slice(0,16).replace('T',' ')}</td>
      <td style="padding:12px 14px;text-align:right;white-space:nowrap;">
        <button class="btn ghost" data-scen-letters="${_escapeHtml(s.name)}" title="Generate ONE award letter xlsx per awarded supplier — each letter contains only that supplier's awarded items + their bid + the qty awarded. Strict isolation guard: any cross-supplier name leaks throws IsolationViolation. Safe to email." style="padding:4px 10px;font-size:11px;">📨 Letters</button>
        <button class="btn ghost" data-scen-summary="${_escapeHtml(s.name)}" title="Generate the cross-supplier full-detail summary xlsx — all bids, all decisions, all suppliers in one workbook. Banner says 'INTERNAL — NEVER FORWARD'. For Andersen-internal use only; never send to a supplier." style="padding:4px 10px;font-size:11px;">📊 Internal</button>
        <button class="btn ghost" data-scen-decision="${_escapeHtml(s.name)}" title="Build the Decision Log — a per-RFQ legal-hold record per awarded item: every bid received, the engine's recommendation + reason, the scenario applied, manual overrides + rationale, threshold values active at the time, the audit trail. xlsx + matching markdown for Copilot. Retain for several years." style="padding:4px 10px;font-size:11px;">📜 Decision Log</button>
        <button class="btn ghost" data-scen-delete="${_escapeHtml(s.name)}" title="Delete this scenario from the saved set. Doesn't undo any letters or logs already exported." style="padding:4px 10px;font-size:11px;">×</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table></div>';

  html += `<div style="display:flex;gap:10px;margin-bottom:18px;">
    <button class="btn primary" id="scen-compare-btn" title="Tick exactly two scenarios in the table above, then click here to see a side-by-side: per-item award diffs, totals delta, where they agree/disagree. The 'show me which is the better strategy' view.">⇄ Compare selected (pick exactly 2)</button>
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
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Award total</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:${colorDelta(sd.covered_award_total)};margin-top:4px;">${sd.covered_award_total >= 0 ? '+' : ''}${fmt$(sd.covered_award_total)}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Savings</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:${colorDelta(-sd.covered_savings_total)};margin-top:4px;">${sd.covered_savings_total >= 0 ? '+' : ''}${fmt$(sd.covered_savings_total)}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Items switched</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-0);margin-top:4px;">${sd.items_switched >= 0 ? '+' : ''}${(sd.items_switched||0).toLocaleString()}</div></div>
      <div><div style="font-size:10px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.12em;">Δ Uncovered items</div><div style="font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink-0);margin-top:4px;">${sd.uncovered_count >= 0 ? '+' : ''}${(sd.uncovered_count||0).toLocaleString()}</div></div>
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
  // Each coverage / outlier KPI is wired into the matrix filter so clicking
  // narrows the comparison matrix below to that slice. The two totals
  // (lowest-bid total + historical baseline) stay non-interactive — they
  // are aggregates with no obvious filter equivalent.
  const isActive = (cov) => _matrixFilter.coverage === cov ? ' active' : '';
  const isOutliers = _matrixFilter.outliersOnly ? ' active' : '';
  wrap.innerHTML = `
    <div class="kpi clickable${isActive('FULL')}" tabindex="0" role="button" data-cov-filter="FULL" title="Click to filter the comparison matrix to items with 3+ priced bids — full competition. Click again to clear."><div class="kpi-label">3+ bids</div><div class="kpi-value" style="color:var(--green);">${(sm.n_with_3plus_bids||0).toLocaleString()}</div><div class="kpi-sub">full competition · click to filter</div></div>
    <div class="kpi clickable${isActive('PARTIAL')}" tabindex="0" role="button" data-cov-filter="PARTIAL" title="Click to filter the matrix to items with exactly 2 priced bids — partial competition."><div class="kpi-label">2 bids</div><div class="kpi-value" style="color:var(--accent);">${(sm.n_with_2_bids||0).toLocaleString()}</div><div class="kpi-sub">partial competition · click to filter</div></div>
    <div class="kpi clickable${isActive('SINGLE')}" tabindex="0" role="button" data-cov-filter="SINGLE" title="Click to filter the matrix to single-source items — only one supplier bid. Worth a follow-up before awarding."><div class="kpi-label">1 bid</div><div class="kpi-value" style="color:var(--cyan);">${(sm.n_with_1_bid||0).toLocaleString()}</div><div class="kpi-sub">single source · click to filter</div></div>
    <div class="kpi clickable${isActive('NONE')}" tabindex="0" role="button" data-cov-filter="NONE" title="Click to filter the matrix to items with NO priced bid from any supplier — these need a follow-up RFQ or to be dropped."><div class="kpi-label">0 bids</div><div class="kpi-value" style="color:var(--red);">${(sm.n_with_0_bids||0).toLocaleString()}</div><div class="kpi-sub">no bid — follow up · click to filter</div></div>
    <div class="kpi clickable${isOutliers}" tabindex="0" role="button" data-cov-filter="OUTLIERS" title="Click to filter the matrix to items where at least one bid is flagged as an outlier (>3× the cross-supplier median or vs history)."><div class="kpi-label">Outliers</div><div class="kpi-value" style="color:var(--red);">${(sm.n_outliers_flagged||0).toLocaleString()}</div><div class="kpi-sub">>3× median or vs hist · click to filter</div></div>
    <div class="kpi" title="If every item went to its lowest priced bidder, this is the total spend.${matrix.summary && matrix.summary.flagged_only_total_lowest_value ? ' This is the RAW figure — see the savings tiers panel for CLEAN/STRICT.' : ''}"><div class="kpi-label">Lowest-bid total</div><div class="kpi-value">${fmt$(sm.total_lowest_value)}</div><div class="kpi-sub">if every item awarded to its lowest bid</div></div>
    <div class="kpi" title="What we paid historically for the same items (qty × last-paid price). The savings comparison baseline."><div class="kpi-label">Historical baseline</div><div class="kpi-value">${fmt$(sm.total_historical_value)}</div><div class="kpi-sub">qty × last-paid price</div></div>
  `;
  for (const tile of wrap.querySelectorAll('[data-cov-filter]')) {
    const handle = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      _toggleCoverageFilter(tile.getAttribute('data-cov-filter'));
    };
    tile.addEventListener('click', handle);
    tile.addEventListener('keydown', handle);
  }
}

function _toggleCoverageFilter(cov) {
  // OUTLIERS is a different axis from coverage — it can stack with a
  // coverage filter. Coverage filters (FULL/PARTIAL/SINGLE/NONE) are
  // mutually exclusive — clicking the active one clears it.
  if (cov === 'OUTLIERS') {
    _matrixFilter.outliersOnly = !_matrixFilter.outliersOnly;
  } else {
    _matrixFilter.coverage = (_matrixFilter.coverage === cov) ? null : cov;
  }
  _rerenderMatrixWithFilters();
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
    const isFocused = (_matrixFilter.supplier === c.supplier);
    const rowBg = isFocused ? 'background:rgba(255,183,51,0.12);' : (isWinner ? 'background:rgba(255,183,51,0.06);' : '');
    html += `<tr class="clickable-row" data-consol-supplier="${_escapeHtml(c.supplier)}" title="Click to focus the comparison matrix on ${_escapeHtml(c.supplier)} — see exactly which items they bid and at what price." style="border-bottom:1px solid var(--line);${rowBg}">
      <td style="padding:12px 14px;font-weight:${isWinner ? '700' : '400'};color:${isWinner ? 'var(--accent)' : 'var(--ink-0)'};">
        ${isWinner ? '★ ' : ''}${_escapeHtml(c.supplier)}${isFocused ? ' <span style="font-size:10px;color:var(--accent);font-family:var(--mono);letter-spacing:0.08em;margin-left:6px;">FOCUSED</span>' : ''}
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
  // Wire candidate rows → focus matrix on that supplier.
  el.querySelectorAll('[data-consol-supplier]').forEach(tr => {
    tr.addEventListener('click', () => {
      const sup = tr.getAttribute('data-consol-supplier');
      _matrixFilter.supplier = (_matrixFilter.supplier === sup) ? null : sup;
      _rerenderMatrixWithFilters();
      const compEl = $('comparison-section');
      if (compEl) compEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Module-level color/label maps reused by the matrix renderer + the
// recommendation-chip filter. Kept at file scope so the chip click handler
// reads the same palette without duplicating literals.
const _MATRIX_REC_COLORS = {
  ACCEPT:           'var(--green)',
  PUSH_BACK:        'var(--accent)',
  ASK_CLARIFICATION:'var(--cyan)',
  MANUAL_REVIEW:    'var(--ink-1)',
  EXCLUDE:          'var(--red)',
};
const _MATRIX_REC_LABELS = {
  ACCEPT:           'Accept',
  PUSH_BACK:        'Push back',
  ASK_CLARIFICATION:'Ask clarification',
  MANUAL_REVIEW:    'Manual review',
  EXCLUDE:          'Exclude',
};

function _applyMatrixFilter(rows) {
  // Single point of truth for the filter logic — used by the matrix render
  // AND by the row-count badge above the filter pill bar. Returns the
  // filtered subset; does not mutate.
  const f = _matrixFilter;
  let out = rows;
  // Always hide pure-no-bid items by default — same baseline as before
  // the audit. The "0 bids" coverage filter overrides it to surface them.
  if (f.coverage === 'NONE') {
    out = out.filter(r => r.coverage === 'NONE');
  } else if (f.coverage) {
    out = out.filter(r => r.coverage === f.coverage);
  } else {
    out = out.filter(r => r.n_quoted > 0);
  }
  if (f.recommendation) {
    out = out.filter(r => (r.recommendation || 'MANUAL_REVIEW') === f.recommendation);
  }
  if (f.supplier) {
    out = out.filter(r => {
      const b = (r.bids || {})[f.supplier];
      return b && b.price != null && b.price > 0;
    });
  }
  if (f.outliersOnly) {
    out = out.filter(r => !!r.outlier_flag || r.has_outlier === true || r.outliers_n > 0);
  }
  if (f.typoOnly) {
    out = out.filter(r => {
      const hist = r.last_unit_price || 0;
      if (!hist) return false;
      for (const sup of Object.keys(r.bids || {})) {
        const b = r.bids[sup];
        if (b && b.price != null && b.price / hist <= 0.4) return true;
      }
      return false;
    });
  }
  return out;
}

function _rerenderMatrixWithFilters() {
  if (_lastMatrixData) _renderComparisonMatrix(_lastMatrixData);
  _renderBidIntakeRow();
  if (_lastMatrixData) _renderBidCoverageKPIs(_lastMatrixData);
}

function _renderMatrixFilterPills() {
  const f = _matrixFilter;
  const pills = [];
  if (f.coverage)        pills.push({ label: `coverage=${f.coverage}`, key: 'coverage' });
  if (f.recommendation)  pills.push({ label: `rec=${_MATRIX_REC_LABELS[f.recommendation] || f.recommendation}`, key: 'recommendation' });
  if (f.supplier)        pills.push({ label: `supplier=${f.supplier}`, key: 'supplier' });
  if (f.outliersOnly)    pills.push({ label: 'outliers only', key: 'outliersOnly' });
  if (f.typoOnly)        pills.push({ label: 'possible typos only', key: 'typoOnly' });
  if (!pills.length) return '';
  let html = '<div class="matrix-filter-bar"><span style="color:var(--ink-2);">Filtering:</span>';
  for (const p of pills) {
    html += `<span class="matrix-filter-pill">${_escapeHtml(p.label)}<button type="button" data-pill-clear="${p.key}" title="Remove this filter">×</button></span>`;
  }
  html += '<button type="button" class="matrix-filter-clear" data-pill-clear-all>clear all</button></div>';
  return html;
}

function _clearMatrixFilter(key) {
  if (key === 'coverage')         _matrixFilter.coverage = null;
  else if (key === 'recommendation') _matrixFilter.recommendation = null;
  else if (key === 'supplier')    _matrixFilter.supplier = null;
  else if (key === 'outliersOnly')_matrixFilter.outliersOnly = false;
  else if (key === 'typoOnly')    _matrixFilter.typoOnly = false;
  else if (key === '*')           _matrixFilter = { coverage: null, recommendation: null, supplier: null, outliersOnly: false, typoOnly: false };
  _rerenderMatrixWithFilters();
}

function _renderComparisonMatrix(matrix) {
  // Cache the latest matrix payload so filter clicks can re-render without
  // re-fetching from Python (the compute is multi-second on a large
  // dataset).
  _lastMatrixData = matrix;
  const el = $('comparison-section');
  const suppliers = matrix.suppliers || [];
  const rows = matrix.rows || [];
  if (!suppliers.length) { el.innerHTML = ''; return; }

  // Recommendation distribution chips — each chip is a filter toggle.
  const recCounts = (matrix.summary && matrix.summary.recommendation_counts) || {};
  let recDistHtml = '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;font-family:var(--mono);font-size:12px;">';
  for (const k of ['ACCEPT','PUSH_BACK','ASK_CLARIFICATION','MANUAL_REVIEW','EXCLUDE']) {
    const n = recCounts[k] || 0;
    const active = _matrixFilter.recommendation === k ? ' active' : '';
    recDistHtml += `<div class="clickable-chip${active}" tabindex="0" role="button" data-rec-filter="${k}" title="Click to filter the comparison matrix to items the engine recommended ${_MATRIX_REC_LABELS[k]}. Click again to clear." style="padding:10px 14px;background:var(--bg-1);border:1px solid var(--line);border-left:3px solid ${_MATRIX_REC_COLORS[k]};border-radius:4px;">
      <div style="color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">${_MATRIX_REC_LABELS[k]}</div>
      <div style="color:${_MATRIX_REC_COLORS[k]};font-size:18px;font-weight:600;margin-top:2px;">${n.toLocaleString()}</div>
    </div>`;
  }
  recDistHtml += '</div>';

  const filtered = _applyMatrixFilter(rows);
  const totalShown = filtered.length;
  const totalAll = rows.length;
  const pillBar = _renderMatrixFilterPills();

  let html = `<h2 style="margin-top:0;">Comparison matrix · ${totalShown.toLocaleString()} items shown <span style="color:var(--ink-2);font-size:14px;font-weight:400;">(of ${totalAll.toLocaleString()} total · click any KPI tile, recommendation chip, or supplier card to filter)</span></h2>`;
  html += pillBar;
  html += recDistHtml;
  // Round 2 selection toolbar — quick-selects + count + Generate button.
  // Renders only if at least one supplier has bid (otherwise R2 doesn't apply yet).
  html += _renderRound2Toolbar(filtered, rows);
  html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:auto;max-height:70vh;">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
  html += `<thead style="background:var(--bg-2);position:sticky;top:0;z-index:1;"><tr>
    <th title="Tick to select this item for the next Round 2 / Rn focused-RFQ batch. Use to push back on items where bids look uncompetitive — selected items get sent to picked suppliers for a re-quote, with the historical-trend reference price shown for context." style="padding:10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;width:36px;">R2</th>
    <th title="Item description (Coupa exports call this the 'Item' field — it's the mandatory, always-populated long descriptive name). The text most analysts recognize at a glance, leading with this column rather than the bare part number." style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
    <th title="Andersen item number — the part-number dedup key (item_num / eam_pn / part_number cascade). Distinct from the descriptive 'Item' column to its left." style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Part #</th>
    <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty 24mo</th>
    <th style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Last $/ea</th>`;
  for (const sup of suppliers) {
    const emph = (_matrixFilter.supplier === sup) ? ' matrix-supplier-emphasized' : '';
    html += `<th class="${emph.trim()}" style="padding:10px;text-align:right;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;border-left:1px solid var(--line);">${_escapeHtml(sup)}</th>`;
  }
  html += `<th style="padding:10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Cov</th>
    <th style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Recommendation</th>
  </tr></thead><tbody>`;

  // Sort by 24-mo qty × hist price desc (highest-value items first)
  filtered.sort((a, b) => (b.qty_24mo * (b.last_unit_price || 0)) - (a.qty_24mo * (a.last_unit_price || 0)));
  const cap = 500;
  const slice = filtered.slice(0, cap);
  for (const r of slice) {
    const lowestSup = r.lowest_supplier;
    let cells = '';
    for (const sup of suppliers) {
      const b = r.bids[sup] || {};
      const isLow = (sup === lowestSup);
      const emph = (_matrixFilter.supplier === sup) ? ' matrix-supplier-emphasized' : '';
      let cellContent = '';
      let cellColor = 'var(--ink-1)';
      let cellTitle = `Click to drill into ${_escapeHtml(r.item_num)} — opens the per-item modal with ${_escapeHtml(sup)}'s bid + history overlay.`;
      if (b.status === 'MISSING') {
        cellContent = '—';
        cellColor = 'var(--ink-2)';
        cellTitle = `${_escapeHtml(sup)} did not bid this item. Click to open the per-item modal anyway (other suppliers' bids will be visible).`;
      } else if (b.status === 'NO_BID') {
        cellContent = 'no bid';
        cellColor = 'var(--ink-2)';
        cellTitle = `${_escapeHtml(sup)} explicitly declined this item. Click to open the per-item modal.`;
      } else if (b.status === 'NEED_INFO') {
        cellContent = 'need info';
        cellColor = 'var(--accent)';
        cellTitle = `${_escapeHtml(sup)} flagged this as needing more info before quoting. Click to open the per-item modal.`;
      } else if (b.price != null) {
        cellContent = '$' + b.price.toFixed(2);
        if (b.status === 'UOM_DISC') cellContent += ' ⚠';
        if (b.status === 'SUBSTITUTE') cellContent += ' †';
        cellColor = isLow ? 'var(--green)' : 'var(--ink-0)';
      }
      // R2 delta indicator — when this bid has round_history, the cell
      // gets a strong visual treatment: cyan-tinted background, cyan
      // left-edge stripe, italic price, and a delta badge. Scannable
      // at-a-glance across the whole matrix so the analyst can spot
      // every R2 update without zooming in on individual cells.
      const roundHist = (b.round_history || []);
      let r2Badge = '';
      let r2CellClass = '';
      let r2InlineStyle = '';
      if (roundHist.length && b.price != null) {
        const prior = roundHist[roundHist.length - 1];
        const priorPrice = prior && prior.price;
        if (priorPrice != null && priorPrice > 0) {
          const delta = ((b.price / priorPrice) - 1.0) * 100;
          const arrow = delta < 0 ? '↓' : (delta > 0 ? '↑' : '·');
          const deltaColor = delta < 0 ? 'var(--green)' : delta > 0 ? 'var(--red)' : 'var(--ink-2)';
          r2Badge = `<span style="font-size:9px;color:${deltaColor};margin-left:4px;letter-spacing:0.04em;font-weight:700;" title="Round ${b.round || 2} — was $${priorPrice.toFixed(2)} in R${(prior.round || 1)}, now $${b.price.toFixed(2)} (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%)">R${b.round || 2}${arrow}${Math.abs(delta).toFixed(0)}%</span>`;
          cellTitle = `R${b.round || 2} update: prior $${priorPrice.toFixed(2)} → $${b.price.toFixed(2)} (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%). ${cellTitle}`;
          r2CellClass = ' matrix-cell-r2';
          // Inline override on the cell color: italics + cyan-leaning so
          // it's distinct from the green/lowest cue without losing the
          // "this is the lowest bid" signal when both apply.
          r2InlineStyle = isLow
            ? `color:var(--green);font-weight:700;font-style:italic;`
            : `color:var(--cyan);font-weight:600;font-style:italic;`;
        }
      }
      const baseStyle = r2InlineStyle || `color:${cellColor};font-weight:${isLow ? '700' : '400'};`;
      cells += `<td class="matrix-cell${emph}${r2CellClass}" data-cell-item="${_escapeHtml(r.item_num)}" data-cell-supplier="${_escapeHtml(sup)}" title="${cellTitle}" style="padding:8px 10px;text-align:right;border-left:1px solid var(--line);${baseStyle}">${cellContent}${r2Badge}</td>`;
    }
    const covColor = r.coverage === 'FULL' ? 'var(--green)' : r.coverage === 'PARTIAL' ? 'var(--accent)' : r.coverage === 'SINGLE' ? 'var(--cyan)' : 'var(--red)';
    const rec = r.recommendation || 'MANUAL_REVIEW';
    const recColor = _MATRIX_REC_COLORS[rec] || 'var(--ink-1)';
    const recLbl = _MATRIX_REC_LABELS[rec] || rec;
    const recReason = r.recommendation_reason || '';
    const isSelectedR2 = _round2Selection.has(r.item_num);
    html += `<tr class="clickable-row${isSelectedR2 ? ' r2-selected' : ''}" style="border-bottom:1px solid rgba(122,109,115,0.25);" data-comp-item="${_escapeHtml(r.item_num)}" data-row-rec="${rec}">
      <td style="padding:6px 8px;text-align:center;" class="r2-cell">
        <input type="checkbox" class="r2-row-check" data-r2-item="${_escapeHtml(r.item_num)}" ${isSelectedR2 ? 'checked' : ''} title="Tick to include this item in the next Round 2 batch — pushes the supplier(s) for a sharper-pencil re-quote with their R1 echo + reference price shown." style="cursor:pointer;accent-color:var(--accent);">
      </td>
      <td style="padding:8px 10px;color:var(--ink-0);max-width:340px;" title="${_escapeHtml(r.description || '')}">${_escapeHtml(_truncate(r.description, 70))}</td>
      <td style="padding:8px 10px;color:var(--ink-2);font-family:var(--mono);font-size:11px;">${_escapeHtml(r.item_num)}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-0);">${(r.qty_24mo||0).toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-1);">$${(r.last_unit_price||0).toFixed(2)}</td>
      ${cells}
      <td style="padding:8px 10px;text-align:center;color:${covColor};font-weight:600;font-size:10px;">${r.coverage}</td>
      <td style="padding:8px 10px;color:${recColor};font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" title="${_escapeHtml(recReason)} · click to filter to ${_MATRIX_REC_LABELS[rec] || rec}" data-rec-row-filter="${rec}">${recLbl}</td>
    </tr>`;
  }
  // colspan accounts for the new R2 column (+1 from prior layout)
  const totalCols = suppliers.length + 7;
  if (filtered.length > cap) {
    html += `<tr><td colspan="${totalCols}" style="padding:14px;text-align:center;color:var(--ink-2);">… and ${(filtered.length - cap).toLocaleString()} more items hidden (sort by qty × hist price desc — narrow the filters to bring more into view)</td></tr>`;
  }
  if (!slice.length) {
    html += `<tr><td colspan="${totalCols}" style="padding:24px;text-align:center;color:var(--ink-2);">No items match the active filter set. <button type="button" class="matrix-filter-clear" data-pill-clear-all style="margin-left:8px;">clear all filters</button></td></tr>`;
  }
  html += '</tbody></table></div>';
  html += '<div style="margin-top:8px;color:var(--ink-2);font-size:11px;font-family:var(--mono);">⚠ = UOM discrepancy noted by supplier &nbsp;·&nbsp; † = substitute part offered &nbsp;·&nbsp; <strong style="color:var(--green);">green</strong> = lowest non-flagged bid &nbsp;·&nbsp; click any cell to open the per-item drill-down</div>';

  el.innerHTML = html;

  // Recommendation chips — toggle the matrix filter.
  el.querySelectorAll('[data-rec-filter]').forEach(chip => {
    const handle = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      const rec = chip.getAttribute('data-rec-filter');
      _matrixFilter.recommendation = (_matrixFilter.recommendation === rec) ? null : rec;
      _rerenderMatrixWithFilters();
    };
    chip.addEventListener('click', handle);
    chip.addEventListener('keydown', handle);
  });

  // Per-row recommendation cell — click filters to that recommendation.
  el.querySelectorAll('[data-rec-row-filter]').forEach(td => {
    td.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const rec = td.getAttribute('data-rec-row-filter');
      _matrixFilter.recommendation = (_matrixFilter.recommendation === rec) ? null : rec;
      _rerenderMatrixWithFilters();
    });
  });

  // Filter-pill × buttons + "clear all".
  el.querySelectorAll('[data-pill-clear]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _clearMatrixFilter(btn.getAttribute('data-pill-clear'));
    });
  });
  el.querySelectorAll('[data-pill-clear-all]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _clearMatrixFilter('*');
    });
  });

  // Per-cell click → open per-item modal.
  el.querySelectorAll('.matrix-cell').forEach(td => {
    td.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _openItemHistory(td.getAttribute('data-cell-item'));
    });
  });

  // R2 row checkbox → toggle the round-2 selection set + sync to Python.
  el.querySelectorAll('.r2-row-check').forEach(cb => {
    cb.addEventListener('click', (ev) => {
      ev.stopPropagation();
    });
    cb.addEventListener('change', (ev) => {
      const itemNum = ev.target.getAttribute('data-r2-item');
      if (ev.target.checked) _round2Selection.add(itemNum);
      else _round2Selection.delete(itemNum);
      _round2SyncSelectionToPython();
      _round2RefreshToolbar();
      // Toggle the .r2-selected class on the row for the visual cue
      const tr = ev.target.closest('tr');
      if (tr) tr.classList.toggle('r2-selected', ev.target.checked);
    });
  });

  // R2 quick-select / clear / generate buttons (rendered in the toolbar above).
  const r2SelPushback = document.getElementById('r2-select-pushback');
  const r2SelOver25 = document.getElementById('r2-select-over25');
  const r2SelSingle = document.getElementById('r2-select-single');
  const r2Clear = document.getElementById('r2-clear');
  const r2Gen = document.getElementById('r2-generate');
  if (r2SelPushback) r2SelPushback.addEventListener('click', () => _round2QuickSelect('pushback'));
  if (r2SelOver25) r2SelOver25.addEventListener('click', () => _round2QuickSelect('over25'));
  if (r2SelSingle) r2SelSingle.addEventListener('click', () => _round2QuickSelect('single'));
  if (r2Clear) r2Clear.addEventListener('click', () => _round2QuickSelect('clear'));
  if (r2Gen) r2Gen.addEventListener('click', _round2OpenGenerateDialog);

  // Row click (anywhere outside a cell that has its own handler) → open per-item modal.
  // tabindex="0" enables arrow-key navigation across the matrix rows too.
  el.querySelectorAll('tr[data-comp-item]').forEach(tr => {
    tr.setAttribute('tabindex', '0');
    tr.addEventListener('click', (ev) => {
      // R2 checkbox is its own click target; let it handle, don't open modal.
      if (ev.target.closest('.r2-cell') || ev.target.classList.contains('r2-row-check')) return;
      // If a child cell already handled it, our listener still fires due to
      // bubble — but the cell's handler called stopPropagation, so this
      // path only runs for clicks on the non-cell row chrome.
      _openItemHistory(tr.getAttribute('data-comp-item'));
    });
    tr.addEventListener('focus', () => _setKbFocusRow(tr));
  });
}

// ----------------------------------------------------------------------------
// Round 2 / Rn toolbar — selection counter + quick-selects + generate button.
// Sits above the comparison-matrix table; only rendered when at least one
// supplier has bid R1 (otherwise R2 doesn't apply yet).
// ----------------------------------------------------------------------------
function _renderRound2Toolbar(filteredRows, allRows) {
  if (!_lastMatrixData || !(_lastMatrixData.suppliers || []).length) return '';
  const sel = _round2Selection;
  const dollarsCovered = (allRows || []).reduce((sum, r) => {
    if (sel.has(r.item_num)) {
      sum += (r.qty_24mo || 0) * (r.last_unit_price || 0);
    }
    return sum;
  }, 0);
  const fmt$ = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const hasSelection = sel.size > 0;
  return `
    <div id="r2-toolbar" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 14px;margin-bottom:14px;background:rgba(86,210,255,0.05);border:1px solid var(--cyan);border-radius:6px;font-family:var(--mono);font-size:12px;color:var(--ink-1);">
      <span style="color:var(--cyan);font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:11px;">ROUND 2 / RN SELECTION</span>
      <button type="button" class="btn ghost" id="r2-select-pushback" title="Select every item the engine recommended PUSH_BACK — typically the most useful R2 starting set." style="padding:5px 10px;font-size:11px;">SELECT ALL PUSH_BACK</button>
      <button type="button" class="btn ghost" id="r2-select-over25" title="Select every item where at least one bid is &gt;25% above the lowest bid — the spread suggests room to negotiate." style="padding:5px 10px;font-size:11px;">SELECT WIDE-SPREAD ITEMS</button>
      <button type="button" class="btn ghost" id="r2-select-single" title="Select every single-source item (1 bid only) to push other suppliers to enter the running." style="padding:5px 10px;font-size:11px;">SELECT SINGLE-SOURCE</button>
      ${hasSelection ? `<button type="button" class="btn ghost" id="r2-clear" title="Clear the entire R2 selection set." style="padding:5px 10px;font-size:11px;">CLEAR SELECTION</button>` : ''}
      <span style="margin-left:auto;color:var(--ink-1);" id="r2-count-label">
        <strong style="color:${hasSelection ? 'var(--cyan)' : 'var(--ink-2)'};">${sel.size.toLocaleString()}</strong>
        item${sel.size === 1 ? '' : 's'} selected
        ${hasSelection ? `· est. ${fmt$(dollarsCovered)} 24-mo spend covered` : ''}
      </span>
      ${hasSelection ? `<button type="button" class="btn primary" id="r2-generate" title="Open the Round 2 generation dialog — pick suppliers + Quote-Terms options + click Generate to download per-supplier xlsx files." style="padding:6px 14px;font-size:12px;">GENERATE ROUND 2 RFQ FILES…</button>` : ''}
    </div>
  `;
}

function _round2RefreshToolbar() {
  // Re-render only the toolbar without re-rendering the entire matrix.
  // Saves 1-2 seconds on a large dataset and preserves scroll position.
  const existing = document.getElementById('r2-toolbar');
  if (!existing || !_lastMatrixData) return;
  const html = _renderRound2Toolbar(null, _lastMatrixData.rows || []);
  if (!html) { existing.remove(); return; }
  // Replace the existing toolbar element with the new HTML.
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const fresh = wrap.firstElementChild;
  existing.replaceWith(fresh);
  // Re-bind handlers.
  const r2SelPushback = document.getElementById('r2-select-pushback');
  const r2SelOver25 = document.getElementById('r2-select-over25');
  const r2SelSingle = document.getElementById('r2-select-single');
  const r2Clear = document.getElementById('r2-clear');
  const r2Gen = document.getElementById('r2-generate');
  if (r2SelPushback) r2SelPushback.addEventListener('click', () => _round2QuickSelect('pushback'));
  if (r2SelOver25) r2SelOver25.addEventListener('click', () => _round2QuickSelect('over25'));
  if (r2SelSingle) r2SelSingle.addEventListener('click', () => _round2QuickSelect('single'));
  if (r2Clear) r2Clear.addEventListener('click', () => _round2QuickSelect('clear'));
  if (r2Gen) r2Gen.addEventListener('click', _round2OpenGenerateDialog);
}

function _round2QuickSelect(kind) {
  if (!_lastMatrixData || !_lastMatrixData.rows) return;
  const rows = _lastMatrixData.rows;
  if (kind === 'clear') {
    _round2Selection.clear();
  } else if (kind === 'pushback') {
    for (const r of rows) {
      if ((r.recommendation || '') === 'PUSH_BACK') _round2Selection.add(r.item_num);
    }
  } else if (kind === 'over25') {
    for (const r of rows) {
      const prices = Object.values(r.bids || {})
        .map(b => (b && b.price != null && b.price > 0) ? b.price : null)
        .filter(p => p != null);
      if (prices.length < 2) continue;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min > 0 && (max - min) / min >= 0.25) _round2Selection.add(r.item_num);
    }
  } else if (kind === 'single') {
    for (const r of rows) {
      if ((r.coverage || '') === 'SINGLE') _round2Selection.add(r.item_num);
    }
  }
  _round2SyncSelectionToPython();
  // Full matrix re-render so the per-row checkboxes reflect the new state.
  if (_lastMatrixData) _renderComparisonMatrix(_lastMatrixData);
}

async function _round2SyncSelectionToPython() {
  if (!_pyAppLoaded || !_py) return;
  try {
    _py.globals.set('_r2_sel_in', [..._round2Selection]);
    await _py.runPythonAsync(`
from app_engine import set_round2_selection
set_round2_selection(list(_r2_sel_in))
`);
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) _saveMgr.markDirty();
  } catch (err) {
    console.error('[round2 sync]', err);
  }
}

function _round2OpenGenerateDialog() {
  if (!_round2Selection.size) return;
  // Suppliers that bid R1 — defaults to all checked. Pulled from
  // _loadedBids since that's the canonical "who bid" list.
  const suppliers = Object.keys(_loadedBids || {});
  if (!suppliers.length) {
    alert('No suppliers have bid yet — load at least one R1 bid before generating Round 2.');
    return;
  }
  let modal = document.getElementById('r2-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'r2-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(8,12,22,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const supplierRows = suppliers.map(s =>
    `<label style="display:block;margin-bottom:6px;color:var(--ink-0);font-family:var(--mono);font-size:12px;">
      <input type="checkbox" class="r2-sup-pick" value="${_escapeHtml(s)}" checked style="vertical-align:middle;margin-right:8px;accent-color:var(--accent);">
      ${_escapeHtml(s)}
      <span style="color:var(--ink-2);font-size:11px;margin-left:6px;">(bid R1)</span>
    </label>`
  ).join('');
  modal.innerHTML = `
    <div style="background:var(--bg-1);border:1px solid var(--line);border-radius:8px;max-width:680px;width:100%;max-height:88vh;overflow:auto;padding:28px 32px;box-shadow:0 24px 80px rgba(0,0,0,0.6);font-family:var(--ui);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">
        <div>
          <div style="font-size:10px;color:var(--ink-2);font-family:var(--mono);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">ROUND 2 RFQ — FOCUSED LIST</div>
          <h2 style="margin:0;font-size:20px;color:var(--ink-0);">Generate per-supplier Round 2 files</h2>
          <p style="margin:8px 0 0;color:var(--ink-1);font-size:13px;line-height:1.55;">
            ${_round2Selection.size} item${_round2Selection.size === 1 ? '' : 's'} selected.
            Each supplier you tick gets a focused xlsx with their R1 echo + the Andersen-projected reference price + 8 supplier-input fields. Strict isolation: no cross-supplier data leaks into any file.
          </p>
        </div>
        <button id="r2-modal-close" type="button" style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-size:18px;line-height:1;padding:6px 12px;border-radius:4px;cursor:pointer;">×</button>
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.10em;margin-bottom:8px;font-family:var(--mono);">Send to</label>
        ${supplierRows}
      </div>
      <div style="margin-bottom:14px;padding:12px 14px;background:var(--bg-2);border:1px solid var(--line);border-radius:4px;">
        <label style="display:block;margin-bottom:8px;color:var(--ink-0);font-family:var(--mono);font-size:12px;">
          <input type="checkbox" id="r2-include-r1-echo" checked style="vertical-align:middle;margin-right:8px;accent-color:var(--accent);">
          Include R1 echo column (their prior price + UOM + notes as gray context)
        </label>
        <label style="display:block;color:var(--ink-0);font-family:var(--mono);font-size:12px;">
          <input type="checkbox" id="r2-include-reference" checked style="vertical-align:middle;margin-right:8px;accent-color:var(--accent);">
          Include Reference Price column (Andersen-projected from cleaned trend, with explanatory banner)
        </label>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:14px;">
        <label style="color:var(--ink-1);font-family:var(--mono);font-size:12px;">
          Round number
          <input type="number" id="r2-round-num" value="2" min="2" max="9" style="width:60px;background:var(--bg-2);color:var(--ink-0);border:1px solid var(--line);border-radius:3px;padding:4px 8px;font-family:var(--mono);font-size:12px;margin-left:6px;">
        </label>
        <label style="color:var(--ink-1);font-family:var(--mono);font-size:12px;">
          Response due
          <input type="date" id="r2-due-date" style="background:var(--bg-2);color:var(--ink-0);border:1px solid var(--line);border-radius:3px;padding:4px 8px;font-family:var(--mono);font-size:12px;margin-left:6px;">
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="r2-modal-cancel" class="btn ghost" type="button">Cancel</button>
        <button id="r2-modal-go" class="btn primary" type="button">GENERATE</button>
      </div>
    </div>
  `;
  const close = () => { modal.style.display = 'none'; };
  document.getElementById('r2-modal-close').addEventListener('click', close);
  document.getElementById('r2-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.getElementById('r2-modal-go').addEventListener('click', _round2GenerateBatch);
}

async function _round2GenerateBatch() {
  const picks = [...document.querySelectorAll('.r2-sup-pick')]
    .filter(cb => cb.checked).map(cb => cb.value);
  if (!picks.length) {
    alert('Pick at least one supplier.');
    return;
  }
  const includeR1 = document.getElementById('r2-include-r1-echo').checked;
  const includeRef = document.getElementById('r2-include-reference').checked;
  const roundNum = parseInt(document.getElementById('r2-round-num').value || '2', 10);
  const dueDate = document.getElementById('r2-due-date').value || '';
  const items = [..._round2Selection];

  const goBtn = document.getElementById('r2-modal-go');
  goBtn.disabled = true;
  goBtn.textContent = 'BUILDING…';
  try {
    _py.globals.set('_r2_items_in', items);
    _py.globals.set('_r2_suppliers_in', picks);
    _py.globals.set('_r2_round_in', roundNum);
    _py.globals.set('_r2_due_in', dueDate);
    _py.globals.set('_r2_inc_r1', includeR1);
    _py.globals.set('_r2_inc_ref', includeRef);
    const out = await _py.runPythonAsync(`
import json, base64
from app_engine import gen_round2_rfqs_for_selection
result = gen_round2_rfqs_for_selection(
  selected_item_nums=list(_r2_items_in),
  suppliers=list(_r2_suppliers_in),
  round_num=int(_r2_round_in),
  response_due_date=str(_r2_due_in or ''),
  include_r1_echo=bool(_r2_inc_r1),
  include_reference_price=bool(_r2_inc_ref),
)
encoded = {sup: base64.b64encode(b).decode('ascii') for sup, b in result['files'].items()}
json.dumps({"files": encoded, "errors": result.get("errors", {}), "n_items": result.get("n_items", 0)})
`);
    const result = JSON.parse(out);
    const errs = result.errors || {};
    const successCount = Object.keys(result.files || {}).length;
    // Trigger one download per supplier.
    for (const [sup, b64] of Object.entries(result.files || {})) {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeSup = sup.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `Round${roundNum}_RFQ_${safeSup}_${ts}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    let msg = `Generated ${successCount} Round ${roundNum} file${successCount === 1 ? '' : 's'} (${result.n_items || 0} items each).`;
    if (Object.keys(errs).length) {
      msg += `\n\nErrors:\n` + Object.entries(errs).map(([s, e]) => `  • ${s}: ${e}`).join('\n');
    }
    alert(msg);
    document.getElementById('r2-modal').style.display = 'none';
  } catch (err) {
    console.error('[round2 generate]', err);
    alert('Round 2 generation failed: ' + (err.message || err));
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = 'GENERATE';
  }
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
          <div id="im-followup-row" style="margin-top:10px;display:flex;align-items:center;gap:10px;"></div>
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
  if (_lastViewedItemNum) {
    _markLastViewedRow(_lastViewedItemNum);
    // Return keyboard focus to the originating row so arrow keys
    // immediately navigate from where the user left off — no clicking
    // back into the table to re-acquire focus.
    const sel = `tr[data-item="${CSS.escape(_lastViewedItemNum)}"], tr[data-comp-item="${CSS.escape(_lastViewedItemNum)}"]`;
    const target = document.querySelector(sel);
    if (target) {
      try { target.focus({ preventScroll: false }); } catch (_) { target.focus(); }
    }
  }
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

  // Follow-up flag — analyst can mark this SKU for post-award double-check.
  // Surfaces in Decision Summary Tab 6 (Items_Needing_Follow_Up). The button
  // is a state toggle; clicking it prompts for an optional note and either
  // sets the flag (flag_item_for_follow_up) or marks an existing flag
  // resolved (resolve_item_follow_up) — resolved flags are kept on the
  // record, just marked done.
  _renderFollowUpButton(h.item_num, h.follow_up || null);

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

  // Build callout — only render the box when there's something actionable
  // to say. Once an analyst has cleaned outliers and the spike is resolved
  // and the trend extrapolation is close to the latest priced line, the
  // box becomes pure noise ("Latest $X vs median $X (+0%)") so we hide it.
  // Renders for: confirmed spikes (red), no-spike-but-trend-meaningfully-
  // diverges-from-latest (amber/neutral), or low-confidence-trend warnings.
  let callout = '';
  const calloutEl = document.getElementById('im-trend-callout');
  calloutEl.style.borderColor = '';
  calloutEl.style.background = 'var(--bg-2)';

  // 1. Spike — most actionable, always renders if real.
  if (t.spike && t.spike.is_spike) {
    const direction = t.spike.pct_diff > 0 ? 'above' : 'below';
    callout = `<strong style="color:var(--red);">⚠ PRICE SPIKE</strong> &nbsp; Latest line $${t.latest_unit_price.toFixed(2)} is <strong style="color:var(--red);">${Math.abs(t.spike.pct_diff).toFixed(0)}% ${direction}</strong> the ${t.median_window_label} ($${t.median_90d.toFixed(2)}). Worth confirming this isn't a one-off price hike before the RFQ goes out.`;
    calloutEl.style.borderColor = 'var(--red)';
    calloutEl.style.background = 'rgba(255,77,109,0.08)';
  }
  // (No "else if (t.spike)" with the +0% noise message — that's the
  // banner Ryan wanted gone once the data's clean.)

  // 2. Trend-extrapolation line — only render when the extrapolation
  // diverges meaningfully from the latest priced line (>15% gap), AND
  // the trend has at least 'medium' confidence. Anything tighter than
  // that is just chart-decoration noise; the chart already shows the
  // EXPECTED marker visually.
  if (t.expected_today != null && s.last_unit_price != null) {
    const expected = t.expected_today;
    const last = s.last_unit_price;
    const divergencePct = last > 0 ? Math.abs((expected - last) / last) * 100 : 0;
    const meaningfulDivergence = divergencePct >= 15 && t.confidence !== 'low';
    if (meaningfulDivergence) {
      const ago = t.days_since_last_order != null
        ? (t.days_since_last_order < 30
            ? `${t.days_since_last_order} days ago`
            : `${(t.days_since_last_order / 30).toFixed(1)} months ago`)
        : '—';
      const trendLine = `${callout ? '<br><br>' : ''}Last actual order: $${last.toFixed(2)} · ${ago}. Trend extrapolation to today: <strong style="color:var(--accent);">$${expected.toFixed(2)}</strong> (${expected > last ? '+' : ''}${(((expected - last) / last) * 100).toFixed(0)}% vs last). Confidence: ${t.confidence} (${t.confidence_reason}).`;
      callout += trendLine;
    }
  } else if (!callout && t.confidence_reason && t.confidence === 'low') {
    // 3. Low-confidence trend warning — only when nothing else triggered.
    callout = `Trend: ${t.confidence_reason}.`;
  }

  // Hide the box entirely if there's nothing meaningful to show.
  if (callout) {
    calloutEl.style.display = '';
    calloutEl.innerHTML = callout;
  } else {
    calloutEl.style.display = 'none';
    calloutEl.innerHTML = '';
  }

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
  // reset link if any exclusions are active. The "✓ Saved" affordance below
  // the status confirms each tick/untick is committed without needing an
  // explicit Save button (which would be misleading, since the data layer
  // is auto-saved per change anyway: Python _STATE writes through, the
  // RFQ table + KPIs reconcile in place, the master data-quality log
  // logs the event, and the save manager autosave kicks in within 60s).
  const statusEl = document.getElementById('im-exclusion-status');
  if (statusEl) {
    if (h.n_excluded > 0) {
      statusEl.innerHTML = `<span style="color:var(--amber, var(--accent));">${h.n_excluded} excluded</span> · trend fit on ${h.n_priced_after_exclusion || 0} priced line${(h.n_priced_after_exclusion || 0) === 1 ? '' : 's'} · <a href="#" id="im-exclusion-reset" style="color:var(--accent);text-decoration:underline;">reset all</a> · <span style="color:var(--ink-2);">auto-saved per change</span>`;
      const resetEl = document.getElementById('im-exclusion-reset');
      if (resetEl) resetEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        _resetItemExclusions(itemNum);
      });
    } else {
      statusEl.innerHTML = 'Untick a row to drop that order from the trend &amp; spike calc · <span style="color:var(--ink-2);">auto-saved per change, no Save button needed</span>';
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
  // Calls into Python to update _STATE["item_exclusions"] AND propagate to
  // _STATE["items"] (last_unit_price, qty_*, spend_*, etc.) + _STATE["kpis"].
  // The returned payload carries the freshly-recomputed item record + the
  // headline KPIs so the JS can patch _rfqResult.items in place and re-
  // render the RFQ table + KPI tiles without doing a full re-extract.
  _showItemModalSavePulse('saving…', 'pending');
  try {
    _py.globals.set('_item_num_in', itemNum);
    _py.globals.set('_excluded_in', indicesArr);
    const out = await _py.runPythonAsync(`
import json
from app_engine import set_item_exclusions
json.dumps(set_item_exclusions(_item_num_in, list(_excluded_in)), default=str)
`);
    let result = null;
    try { result = JSON.parse(out); } catch (_) {}
    if (result && result.item && _rfqResult && Array.isArray(_rfqResult.items)) {
      const idx = _rfqResult.items.findIndex(it => it.item_num === itemNum);
      if (idx !== -1) _rfqResult.items[idx] = result.item;
    }
    if (result && result.kpis && _rfqResult) {
      _rfqResult.kpis = result.kpis;
      // Difficulty isn't re-derived — its inputs (% generic descriptions,
      // missing MFG, etc.) don't shift on a per-item exclusion. Leave it.
    }
    // Re-render the RFQ table + KPI tiles so the cleaned LAST $/ea, qty,
    // spend, and active-items counts all update in place.
    if (typeof _renderRfqTable === 'function') _renderRfqTable();
    if (typeof _renderKpis === 'function') _renderKpis();
    if (typeof _refreshExclusionLogBanner === 'function') _refreshExclusionLogBanner();
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) {
      _saveMgr.markDirty();
    }
    _showItemModalSavePulse('✓ Saved · RFQ table + log updated', 'ok');
  } catch (err) {
    console.error('[item-exclusions] persist failed', err);
    _showItemModalSavePulse('✗ Save failed — see console', 'err');
  }
}

// Transient toast inside the per-item modal (top-right, above the chart)
// confirming the auto-save committed. Avoids the "did my click stick?"
// uncertainty without adding a misleading explicit Save button.
function _showItemModalSavePulse(text, state) {
  let el = document.getElementById('im-save-pulse');
  if (!el) {
    const card = document.getElementById('item-modal-card');
    if (!card) return;
    el = document.createElement('div');
    el.id = 'im-save-pulse';
    el.style.cssText = 'position:absolute;top:18px;right:60px;font-family:var(--mono);font-size:11px;letter-spacing:0.04em;padding:4px 10px;border-radius:3px;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:5;';
    // The header div inside the card has position relative implicitly —
    // ensure the card is a positioning context for the absolute pulse.
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    card.appendChild(el);
  }
  const colors = {
    ok:      { bg: 'rgba(61,220,132,0.16)',  fg: 'var(--green)',  border: 'var(--green)' },
    pending: { bg: 'rgba(122,138,168,0.16)', fg: 'var(--ink-2)',  border: 'var(--line)'  },
    err:     { bg: 'rgba(255,77,109,0.16)',  fg: 'var(--red)',    border: 'var(--red)'   },
  };
  const c = colors[state] || colors.ok;
  el.style.background = c.bg;
  el.style.color = c.fg;
  el.style.border = `1px solid ${c.border}`;
  el.textContent = text;
  el.style.opacity = '1';
  if (el._fadeT) clearTimeout(el._fadeT);
  if (state !== 'pending') {
    el._fadeT = setTimeout(() => { el.style.opacity = '0'; }, 1800);
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

    // 🚩 UOM-suspected flag — pre-fills a needs-review row in the UOM
    // Resolution Queue (step 4) for this (item, supplier) so when the
    // analyst opens the queue, this pair is already at the top with
    // "flagged from per-item modal" as the note. Also writes a master
    // data-quality log entry (event_type="uom_suspected") so the
    // cross-app audit packet shows the lineage.
    const isUomFlagged = b.uom_status === 'needs_review';
    const isUomResolved = b.uom_status === 'resolved';
    let uomBtnLbl, uomBtnTitle;
    if (isUomResolved) {
      uomBtnLbl = `✓ UOM resolved (×${b.uom_factor || '?'})`;
      uomBtnTitle = `Already resolved in the UOM Resolution Queue (step 4) with factor ×${b.uom_factor}. ${b.uom_note ? 'Note: ' + b.uom_note : ''}`;
    } else if (isUomFlagged) {
      uomBtnLbl = '🏳️ UOM FLAGGED — click to clear';
      uomBtnTitle = 'Currently marked needs-review. Will surface in the UOM Resolution Queue (step 4) for conversion-factor entry. Click to clear the flag.';
    } else {
      uomBtnLbl = '🚩 FLAG SUSPECTED UOM ISSUE';
      uomBtnTitle = 'Pre-fill a needs-review row in the UOM Resolution Queue (step 4) for this supplier + item, so when bids come back / step 4 opens, this pair is already at the top of the queue. Use when an outlier-corrected trend makes a bid only make sense if their UOM is wrong (per-box vs per-each, etc.). Also writes a master data-quality log entry so the audit trail shows the lineage. Doesn\'t commit a conversion factor — that step happens in the queue once you know the right one.';
    }
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
        ${(b.n_alt_quotes && b.n_alt_quotes > 0) ? `
          <details style="margin-top:6px;">
            <summary style="cursor:pointer;color:var(--ink-2);font-size:10px;letter-spacing:0.04em;list-style:none;">+${b.n_alt_quotes} other quote${b.n_alt_quotes === 1 ? '' : 's'} from ${_escapeHtml(b.supplier)} for this item ▾</summary>
            <div style="margin-top:4px;padding:4px 6px;background:rgba(0,0,0,0.18);border-radius:3px;font-size:10px;color:var(--ink-1);line-height:1.55;">
              ${(b.alt_quotes || []).map(a => `<div>$${a.price.toFixed(2)}${a.status && a.status !== 'PRICED' ? ` <span style="color:var(--ink-2);">[${_escapeHtml(a.status)}]</span>` : ''}${a.alt_part ? ` <span style="color:var(--ink-2);">alt: ${_escapeHtml(a.alt_part)}</span>` : ''}${a.notes ? ` <span style="color:var(--ink-2);font-style:italic;">${_escapeHtml(a.notes)}</span>` : ''}</div>`).join('')}
              <div style="margin-top:4px;color:var(--ink-2);font-size:9px;">Canonical pick: lowest of (PRICED &gt; UOM_DISC &gt; SUBSTITUTE). Multiple quotes per supplier per item usually mean qty-break tiers, alt SKUs, or duplicate template rows. Worth confirming with the supplier if the spread is wide.</div>
            </div>
          </details>
        ` : ''}
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
        <button type="button"
          class="im-bid-uom-btn"
          data-supplier="${_escapeHtml(b.supplier)}"
          data-uom-flagged="${isUomFlagged ? '1' : '0'}"
          ${isUomResolved ? 'disabled' : ''}
          title="${uomBtnTitle}"
          style="
            margin-top:6px;
            width:100%;
            background:${isUomFlagged ? 'rgba(255,183,51,0.18)' : (isUomResolved ? 'rgba(61,220,132,0.10)' : 'transparent')};
            color:${isUomFlagged ? 'var(--accent)' : (isUomResolved ? 'var(--green)' : 'var(--ink-2)')};
            border:1px dashed ${isUomFlagged ? 'var(--accent)' : (isUomResolved ? 'var(--green)' : 'var(--line)')};
            padding:5px 8px;
            font-family:var(--mono);
            font-size:9px;
            text-transform:uppercase;
            letter-spacing:0.06em;
            font-weight:600;
            border-radius:3px;
            cursor:${isUomResolved ? 'default' : 'pointer'};
            opacity:${isUomResolved ? '0.7' : '1'};
          ">${uomBtnLbl}</button>
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
  for (const btn of list.querySelectorAll('.im-bid-uom-btn')) {
    btn.addEventListener('click', (ev) => {
      if (ev.currentTarget.disabled) return;
      const sup = ev.currentTarget.getAttribute('data-supplier');
      const wasFlagged = ev.currentTarget.getAttribute('data-uom-flagged') === '1';
      _toggleItemUomFlag(h.item_num, sup, wasFlagged);
    });
  }
}

async function _toggleItemUomFlag(itemNum, supplier, wasFlagged) {
  // Toggle the per-(item, supplier) UOM-suspected flag from the per-item
  // modal. Pre-fills a needs-review row in the step 4 UOM Resolution
  // Queue + writes a master data-quality log entry. Then refreshes the
  // modal so the button state updates in place.
  if (!_pyAppLoaded || !_py) return;
  _showItemModalSavePulse('saving…', 'pending');
  try {
    _py.globals.set('_item_num_in', itemNum);
    _py.globals.set('_supplier_in', supplier);
    if (wasFlagged) {
      await _py.runPythonAsync(`
from app_engine import clear_uom_suspected_flag
clear_uom_suspected_flag(_item_num_in, _supplier_in)
`);
    } else {
      await _py.runPythonAsync(`
from app_engine import flag_uom_suspected
flag_uom_suspected(_item_num_in, _supplier_in)
`);
    }
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) {
      _saveMgr.markDirty();
    }
    if (typeof _refreshExclusionLogBanner === 'function') _refreshExclusionLogBanner();
    await _refreshItemHistoryModal(itemNum);
    _showItemModalSavePulse(wasFlagged ? '✓ UOM flag cleared' : '✓ Flagged for UOM Resolution Queue', 'ok');
  } catch (err) {
    console.error('[uom-flag toggle]', err);
    _showItemModalSavePulse('✗ Save failed', 'err');
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

function _renderFollowUpButton(itemNum, follow) {
  const row = document.getElementById('im-followup-row');
  if (!row) return;
  // 3 states: NEW (no flag) | FLAGGED (flag exists, not resolved) | RESOLVED (flag exists, resolved)
  const state = !follow ? 'NEW' : (follow.resolved ? 'RESOLVED' : 'FLAGGED');
  let label, color, title;
  if (state === 'NEW') {
    label = '🔖 Flag for follow-up';
    color = 'var(--ink-2)';
    title = 'Mark this SKU for post-award double-check. The flag surfaces in Decision Summary Tab 6 ("Items Needing Follow-Up") with a note + timestamp. Use when you want to ship the award now but verify the bid later (suspicious price, unfamiliar mfg, etc.).';
  } else if (state === 'FLAGGED') {
    const note = follow.note ? ` — "${follow.note}"` : '';
    label = `🔖 Flagged${note}`;
    color = 'var(--accent)';
    title = `Already flagged${note}. Click to mark resolved (the flag stays on the record, just marked done).`;
  } else {
    const note = follow.resolved_note ? ` — "${follow.resolved_note}"` : '';
    label = `✓ Follow-up resolved${note}`;
    color = 'var(--green)';
    title = 'Follow-up was flagged and later resolved. Click to re-flag.';
  }
  row.innerHTML = `
    <button type="button" id="im-followup-btn" data-item="${_escapeHtml(itemNum)}" data-state="${state}"
      title="${title.replace(/"/g, '&quot;')}"
      style="background:transparent;border:1px solid ${color};color:${color};font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:0.04em;padding:5px 12px;border-radius:3px;cursor:pointer;text-transform:uppercase;">${label}</button>
  `;
  const btn = document.getElementById('im-followup-btn');
  if (btn) btn.addEventListener('click', () => _handleFollowUpClick(itemNum, state));
}

async function _handleFollowUpClick(itemNum, state) {
  if (!_pyAppLoaded || !_py) return;
  let pyFn, defaultNote;
  if (state === 'NEW' || state === 'RESOLVED') {
    // Re-flag (or first flag) — prompt for a note
    const note = prompt('What needs verifying after award? (free-form note — saved with the flag in the Decision Summary)', '') || '';
    pyFn = 'flag_item_for_follow_up';
    defaultNote = note;
  } else {
    // Resolve
    const note = prompt('Optional resolution note (free-form — what did you find?)', '') || '';
    pyFn = 'resolve_item_follow_up';
    defaultNote = note;
  }
  try {
    _py.globals.set('_item_num_in', itemNum);
    _py.globals.set('_note_in', defaultNote);
    await _py.runPythonAsync(`
from app_engine import ${pyFn}
${pyFn}(_item_num_in, _note_in)
`);
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) _saveMgr.markDirty();
    await _refreshItemHistoryModal(itemNum);
    _showItemModalSavePulse(state === 'FLAGGED' ? '✓ Marked resolved' : '✓ Flagged for follow-up', 'ok');
  } catch (err) {
    console.error('[follow-up toggle]', err);
    _showItemModalSavePulse('✗ Save failed', 'err');
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
