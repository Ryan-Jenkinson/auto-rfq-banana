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
  // Persist for next session — re-use without picking from disk again.
  _saveLastFile('export', file).catch(() => {});

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

// Render the persistence "Last loaded" badge on the export dropzone — runs
// once at module load (synchronous DOM exists by now since this script is
// at end of body).
(async () => {
  const zone = document.getElementById('dz-export');
  if (zone) {
    await _renderLastFileBadge(zone, 'export', async (blob, filename) => {
      // Re-construct a File from the persisted blob so _onExportFile can
      // treat it identically to a fresh drop.
      const reusedFile = new File([blob], filename, {type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const fileNameEl = document.getElementById('f-export');
      await _onExportFile(reusedFile, zone, 'f-export');
    });
  }
})();

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
  { key: 'item_num',    label: 'Item #',                hint: 'buyer Item Number — usually populated; blank for some cXML / PunchOut supplier exports (where the supplier\'s own SKU lives in the Part Number column instead)' },
  { key: 'eam_pn',      label: 'EAM Part Number',       hint: 'buyer-side fallback if Item # missing' },
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

  // Exact pennies on every $ value, no rounding — per the analyst: RFQs need precision
  const fmt = (n) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty = (n) => n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // ELI5 tooltips on every column header — plain-language explanations a
  // procurement person reads first time they look at the table.
  let head = `<tr>
    <th class="cell-include" title="Untick to drop an item from the RFQ. Default tick = had qty in the last 24 months. The 'Smart trim' button bulk-unticks WEAK/SKIP rows + risky description patterns.">RFQ</th>
    <th title="buyer item number (or supplier Part Number when EAM is blank — common in cXML / PunchOut supplier exports). The dedup key the engine matched on across the multi-year export.">Item #</th>
    <th title="Engine score 0-100 + tier. STRONG = order frequency + recent activity + clean data. MODERATE = some flags. WEAK = thin/dormant history. SKIP = almost certainly not RFQ-worthy. Hover any tier chip for the per-item reason list.">Tier</th>
    <th title="The description The buyer has on file for this item. Chips next to it: red = service / freight / tariff / obsolete / rental (usually don't belong in an RFQ); amber = custom / repair / misc (caution); UOM mixed / MFG blank flags surface data hygiene issues.">Description</th>
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
// Charts (table-first; charts live below the table per the analyst's rule)
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
  // Polished top-15 chart (#5 + #6):
  //   - Label format: "<truncated description> · <part #>" — Coupa-style
  //     leading, with the part number as a smaller dim suffix. The bare
  //     part number alone meant nothing to most analysts.
  //   - Visual: amber→deep-amber gradient fill (was flat amber); subtle
  //     rounded right edge; thin baseline rule for visual anchoring;
  //     value text uses tabular figures and stays mono. Bars proportionally
  //     scaled with a min-width floor so #15 isn't invisible when #1
  //     dominates.
  const svg = $('chart-top');
  if (!svg || !_rfqResult) return;
  const top = [..._rfqResult.items].sort((a, b) => (b.spend_24mo || 0) - (a.spend_24mo || 0)).slice(0, 15);
  const W = svg.clientWidth || 500, H = 280;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const padL = 240, padR = 80, padT = 8, padB = 20;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...top.map(it => it.spend_24mo || 0));
  const minBarPx = 4; // floor so #15 is visible
  let defs = `<defs>
    <linearGradient id="topbar-grad" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="var(--accent-deep)" stop-opacity="0.85"/>
    </linearGradient>
  </defs>`;
  let s = defs;
  const barH = innerH / Math.max(1, top.length) - 4;
  // Subtle baseline rule
  s += `<line x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT + innerH}" stroke="var(--line)" stroke-width="1"/>`;
  top.forEach((it, i) => {
    const rawW = (it.spend_24mo || 0) / max * innerW;
    const w = Math.max(minBarPx, rawW);
    const y = padT + i * (barH + 4);
    const desc = _truncate(it.description || '', 28);
    const part = it.item_num || '';
    s += `<g class="top-bar-row" data-bar-item="${_escapeHtml(part)}" style="cursor:pointer;">`;
    s += `<rect x="0" y="${y}" width="${W}" height="${barH.toFixed(1)}" fill="transparent" pointer-events="all"/>`;
    // Bar with gradient fill
    s += `<rect class="bar" x="${padL + 0.5}" y="${y}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="url(#topbar-grad)"/>`;
    // Two-part label: description (ink-0, primary) then part # (ink-2, smaller suffix)
    s += `<text x="${padL - 8}" y="${y + barH / 2 + 3.5}" text-anchor="end" font-size="11" fill="var(--ink-0)" font-family="var(--ui)">${_escapeHtml(desc)}<tspan font-size="9" fill="var(--ink-2)" font-family="var(--mono)" dx="6">${_escapeHtml(part)}</tspan></text>`;
    // Value text
    s += `<text x="${padL + w + 6}" y="${y + barH / 2 + 3.5}" font-size="11" fill="var(--accent)" font-family="var(--mono)" font-weight="600">$${Math.round(it.spend_24mo || 0).toLocaleString()}</text>`;
    s += `<title>${_escapeHtml(part)} — ${_escapeHtml(it.description || '')} — $${Math.round(it.spend_24mo || 0).toLocaleString()} 24-mo · click to drill in</title>`;
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
  const bw = innerW / series.length - 10;
  // Polished annual chart (#5):
  //   - Vertical gradient fill (amber top → deep at base) for visual depth
  //   - Subtle baseline rule + 25%/50%/75% dotted gridlines
  //   - Value text bolded amber; year tick muted
  let defs = `<defs>
    <linearGradient id="annualbar-grad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="var(--accent-deep)" stop-opacity="0.65"/>
    </linearGradient>
  </defs>`;
  let s = defs;
  // Gridlines (25 / 50 / 75% of max)
  for (const frac of [0.25, 0.5, 0.75]) {
    const yy = padT + innerH - (frac * innerH);
    s += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>`;
  }
  // Baseline
  s += `<line x1="${padL}" x2="${W - padR}" y1="${padT + innerH}" y2="${padT + innerH}" stroke="var(--line)" stroke-width="1"/>`;
  series.forEach((d, i) => {
    const h = d.spend / max * innerH;
    const x = padL + i * (bw + 10) + 5;
    const y = padT + (innerH - h);
    s += `<rect class="bar" x="${x}" y="${y}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="url(#annualbar-grad)"/>`;
    s += `<text x="${x + bw/2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--mono)" letter-spacing="0.04em">${d.year}</text>`;
    s += `<text x="${x + bw/2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="var(--accent)" font-family="var(--mono)" font-weight="600">$${(d.spend / 1000).toFixed(0)}k</text>`;
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
        ${fld('Company', 'company', 'Default: Buyer')}
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
  // Persist the most-recent bid file for this session — single-slot (the
  // "last bid drop" pattern). Multiple bid files are a normal flow, but
  // the most recent is what's worth one-click reloading.
  _saveLastFile('bid', file).catch(() => {});
  // Suggest supplier name from filename (strip extension + dates + RFQ tags)
  const stem = file.name.replace(/\.xlsx$/i, '');
  const suggest = stem
    .replace(/^Buyer[\s_-]*/i, '')
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
//   Defaults to 'consolidate_to' when bids loaded (the standard playbook),
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
  // Stash scenarios on _lastHeadline so the snapshot strip + popovers can
  // read the list without another round-trip.
  if (_lastHeadline) _lastHeadline.scenarios_list = data.scenarios || [];
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
      // Show carve count inline so the chip name carries the truth: this
      // strategy includes carve-outs as part of its math, not as a separate
      // option. (Backlog #19c — make the hybrid-vs-consolidate vocabulary
      // obviously be one thing.)
      const consolSummary = strategies && strategies.consolidate_to;
      const ncarves = consolSummary ? (consolSummary.n_carved || 0) : 0;
      const carveSuffix = ncarves > 0
        ? ` <span style="color:var(--ink-2);font-weight:400;">+${ncarves} carve</span>`
        : '';
      label = `Consolidate to: ${sup}${carveSuffix} <span class="chip-caret">▾</span>`;
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

  // Snapshot strip — combined with the chip strip per user request to
  // collapse the two surfaces into one. "📌 Save snapshot" is always
  // present when bids are loaded; saved snapshots appear as inline pills.
  const scenariosList = (_lastHeadline && _lastHeadline.scenarios_list) || [];
  const snapshotStripHtml = _renderSnapshotStrip(scenariosList);

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
    ${snapshotStripHtml}
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
  // Snapshot strip — Save / saved-pill clicks / Compare
  _wireSnapshotStrip();
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

  // Hybrid drawer teaser — frames the carves as part of the active
  // consolidate strategy, not a separate option. "+ $X / N carved off
  // <target>" reads as a refinement of the chip's verdict.
  const hybridT = $('drawer-hybrid-teaser');
  if (hybridT) {
    const w = (data.consolidation && data.consolidation.winner) || null;
    const carves = (w && w.carve_outs) || [];
    const carveSavings = (w && w.carve_out_savings_total) || 0;
    const target = w ? w.supplier : null;
    if (carves.length === 0) {
      hybridT.innerHTML = '<span class="empty">no carve-outs at current thresholds</span>';
    } else if (target) {
      hybridT.innerHTML = `<span class="savings">+${fmt$(carveSavings)}</span> &nbsp;<span class="count">${carves.length} item${carves.length===1?'':'s'} carved off ${_escapeHtml(target)}</span>`;
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

  // (Saved scenarios drawer removed — snapshots live inline in the headline card now.)

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

// ---------- Universal row selection + sortable columns ----------
//
// Opt-in by adding to any <table>:
//   data-table-id="<unique key>"   identifies the table for state persistence
//   data-rowselect="1"             rows become click-to-select (cyan stripe + bg)
//   data-sortable="1"              <th data-sort-key="<col>" data-sort-type="num|str|date">
//                                  headers become click-to-sort (asc → desc → none)
//
// Both use a single document-level click delegator so re-renders don't need
// to re-wire. Selection + sort state live in module-level Maps keyed by
// data-table-id. After every render, _restoreUniversalTableState(tableEl)
// re-applies the saved selection class + sort order. Resets only when the
// underlying dataset is replaced (caller calls _resetUniversalTableState).
const _tableSelection = {};   // {tableId: rowKey}
const _tableSort = {};        // {tableId: {key, dir, type}} where dir = 'asc'|'desc'

function _restoreUniversalTableState(tableEl) {
  if (!tableEl) return;
  const tableId = tableEl.getAttribute('data-table-id');
  if (!tableId) return;
  // Restore selection
  const selKey = _tableSelection[tableId];
  if (selKey) {
    const tr = tableEl.querySelector(`tbody tr[data-row-key="${CSS.escape(selKey)}"]`);
    if (tr) tr.classList.add('row-selected');
  }
  // Restore sort
  const sort = _tableSort[tableId];
  if (sort && sort.key) {
    _applyTableSort(tableEl, sort.key, sort.dir, sort.type);
    const th = tableEl.querySelector(`th[data-sort-key="${CSS.escape(sort.key)}"]`);
    if (th) th.classList.add(sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
  }
}

function _resetUniversalTableState(tableId) {
  if (tableId) {
    delete _tableSelection[tableId];
    delete _tableSort[tableId];
  } else {
    for (const k of Object.keys(_tableSelection)) delete _tableSelection[k];
    for (const k of Object.keys(_tableSort)) delete _tableSort[k];
  }
}

function _applyTableSort(tableEl, key, dir, type) {
  const tbody = tableEl.querySelector('tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.classList.contains('no-sort'));
  const valueOf = (tr) => {
    // Priority: row-level data-sort-<key> attr; cell-level data-sort-value
    // on a [data-sort-cell="key"]; cell innerText.
    const rowAttr = tr.getAttribute(`data-sort-${key}`);
    if (rowAttr != null) return rowAttr;
    const cell = tr.querySelector(`[data-sort-cell="${key}"]`);
    if (cell) {
      const cellAttr = cell.getAttribute('data-sort-value');
      if (cellAttr != null) return cellAttr;
      return cell.innerText || '';
    }
    return '';
  };
  const cmp = (a, b) => {
    const av = valueOf(a); const bv = valueOf(b);
    if (type === 'num') {
      const an = parseFloat(String(av).replace(/[^\d.\-]/g, '')) || 0;
      const bn = parseFloat(String(bv).replace(/[^\d.\-]/g, '')) || 0;
      return an - bn;
    }
    if (type === 'date') {
      return (Date.parse(av) || 0) - (Date.parse(bv) || 0);
    }
    return String(av).localeCompare(String(bv), undefined, {numeric: true, sensitivity: 'base'});
  };
  rows.sort(cmp);
  if (dir === 'desc') rows.reverse();
  // Re-append in order
  for (const r of rows) tbody.appendChild(r);
}

// One-time document-level click delegator. Wires both row-selection and
// sortable-header clicks. Set up at boot (called from end-of-file IIFE).
function _setupUniversalTableDelegator() {
  document.addEventListener('click', (ev) => {
    // Sortable header click — find the closest <th data-sort-key> inside a
    // <table data-sortable="1">.
    const th = ev.target.closest('th[data-sort-key]');
    if (th) {
      const tableEl = th.closest('table[data-sortable="1"]');
      if (tableEl) {
        const tableId = tableEl.getAttribute('data-table-id');
        if (!tableId) return;
        const key = th.getAttribute('data-sort-key');
        const type = th.getAttribute('data-sort-type') || 'str';
        const cur = _tableSort[tableId] || {};
        let nextDir;
        if (cur.key !== key)        nextDir = 'asc';
        else if (cur.dir === 'asc') nextDir = 'desc';
        else                        nextDir = null;     // 3rd click clears
        // Strip prior sort indicators
        tableEl.querySelectorAll('th[data-sort-key]').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        if (nextDir) {
          _tableSort[tableId] = {key, dir: nextDir, type};
          th.classList.add(nextDir === 'asc' ? 'sort-asc' : 'sort-desc');
          _applyTableSort(tableEl, key, nextDir, type);
        } else {
          delete _tableSort[tableId];
          // No restore — leave whatever order the renderer produced
        }
        return;
      }
    }
    // Row-select click — find the closest <tr> inside a <table data-rowselect="1"> tbody.
    const tr = ev.target.closest('tr[data-row-key]');
    if (tr) {
      const tableEl = tr.closest('table[data-rowselect="1"]');
      if (tableEl) {
        const tableId = tableEl.getAttribute('data-table-id');
        if (!tableId) return;
        const key = tr.getAttribute('data-row-key');
        // Toggle: clicking the already-selected row clears selection.
        const wasSelected = tr.classList.contains('row-selected');
        tableEl.querySelectorAll('tbody tr.row-selected').forEach(r => r.classList.remove('row-selected'));
        if (!wasSelected) {
          tr.classList.add('row-selected');
          _tableSelection[tableId] = key;
        } else {
          delete _tableSelection[tableId];
        }
      }
    }
  }, false);
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
  // The Saved Scenarios drawer was deleted — its capability is now an inline
  // snapshot strip that lives directly under the chip strip in the headline
  // card. The drawer was redundant with the chip strip's live exploration
  // (Note: "i dont really even understand why we have both"). Capability
  // preserved: 📌 Save current snapshot · saved snapshots as inline pills
  // (click to load · × to delete) · Compare appears when ≥2 saved · letters
  // and Decision Log read from a clicked snapshot or the active state.
  // The hidden #scenarios-section div is still here so any code that
  // previously rendered into it doesn't break, but nothing user-facing
  // lives there now.
  const el = $('scenarios-section');
  if (el) el.innerHTML = '';
  // The actual snapshot strip render is part of _renderHeadlineCard now
  // (called via _refreshConsolidationAndMatrix). This stub keeps the
  // call site stable.
}

function _renderSnapshotStrip(scenarios) {
  // Inline snapshot strip rendered inside the headline card. Returns HTML
  // string (caller injects). Always returns at least the "📌 Save snapshot"
  // button — saved snapshots show as additional pills with × delete.
  // Compare button only appears when ≥2 saved.
  const list = scenarios || [];
  let saveBtn = `<button type="button" class="chip" id="snapshot-save-btn" title="Save the active strategy + manual overrides as a named snapshot. Use when you want to lock in this decision (for award letters / audit) or come back to compare with a different strategy later. Snapshots freeze at save time — re-saving with the same name updates it.">📌 Save snapshot</button>`;
  let pills = '';
  for (const s of list) {
    const stratLabel = (s.strategy === 'consolidate_to' && s.parameters && s.parameters.supplier)
      ? `Consolidate → ${s.parameters.supplier}`
      : s.strategy;
    const t = s.totals || {};
    const sav = t.covered_savings_total || 0;
    const savTxt = sav >= 0 ? `+$${Math.round(sav).toLocaleString()}` : `−$${Math.abs(Math.round(sav)).toLocaleString()}`;
    const tipParts = [
      `Snapshot: ${s.name}`,
      `Strategy: ${stratLabel}`,
      `Award: $${Math.round(t.covered_award_total||0).toLocaleString()}`,
      `Savings: ${savTxt}`,
      `Saved: ${(s.saved_at || '').slice(0, 16).replace('T', ' ')}`,
      ``,
      `Click to open snapshot actions (load · letters · decision log · compare · delete).`,
    ];
    pills += `<button type="button" class="chip" data-snapshot-name="${_escapeHtml(s.name)}" title="${_escapeHtml(tipParts.join('\n'))}" style="font-size:11px;">📌 ${_escapeHtml(s.name)} <span style="color:var(--ink-2);font-size:10px;margin-left:4px;">${stratLabel}</span> <span style="color:${sav>=0?'var(--green)':'var(--red)'};font-size:10px;margin-left:4px;">${savTxt}</span></button>`;
  }
  let compareBtn = '';
  if (list.length >= 2) {
    compareBtn = `<button type="button" class="chip" id="snapshot-compare-btn" title="Pick exactly 2 snapshots (click two to select) then this button compares them side-by-side: per-item diffs, totals delta, where they agree/disagree.">⇄ Compare 2…</button>`;
  }
  return `<div class="snapshot-strip" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center;font-family:var(--mono);font-size:11px;">
    <span style="color:var(--ink-2);text-transform:uppercase;letter-spacing:0.10em;font-size:10px;">SNAPSHOTS:</span>
    ${saveBtn}${pills}${compareBtn}
  </div>`;
}

function _wireSnapshotStrip() {
  const saveBtn = document.getElementById('snapshot-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', _saveActiveAsSnapshot);
  }
  const compareBtn = document.getElementById('snapshot-compare-btn');
  if (compareBtn) {
    compareBtn.addEventListener('click', _openSnapshotCompareDialog);
  }
  document.querySelectorAll('[data-snapshot-name]').forEach(btn => {
    btn.addEventListener('click', () => _openSnapshotActions(btn.getAttribute('data-snapshot-name')));
  });
}

async function _saveActiveAsSnapshot() {
  if (!_pyAppLoaded || !_py) return;
  const defaultName = (() => {
    const chip = _activeChip || 'lowest_qualified';
    if (chip === 'consolidate_to' && _consolidateSupplier) return `Consolidate → ${_consolidateSupplier}`;
    if (chip === 'lowest_qualified') return 'Lowest qualified';
    if (chip === 'lowest_price') return 'Lowest price';
    if (chip === 'incumbent_preferred') return 'Incumbent preferred';
    return chip;
  })();
  const name = (prompt('Snapshot name (optional — saving with an existing name updates that snapshot):', defaultName) || '').trim();
  if (!name) return;
  let strategy = _activeChip || 'lowest_qualified';
  let params = {};
  if (strategy === 'consolidate_to' && _consolidateSupplier) params = {supplier: _consolidateSupplier};
  _py.globals.set('_scen_name_in', name);
  _py.globals.set('_scen_strategy_in', strategy);
  _py.globals.set('_scen_params_in', _py.toPy(params));
  try {
    await _py.runPythonAsync(`
from app_engine import save_award_scenario
save_award_scenario(_scen_name_in, _scen_strategy_in, _scen_params_in)
`);
    if (typeof _saveMgr !== 'undefined' && _saveMgr && _saveMgr.markDirty) _saveMgr.markDirty();
    await _refreshConsolidationAndMatrix();
  } catch (err) {
    console.error('[snapshot-save]', err);
    alert('Snapshot save failed: ' + (err.message || err));
  }
}

function _openSnapshotActions(name) {
  // Lightweight inline action dialog — not modal, just a positioned popover
  // anchored to where the snapshot pill is. Minimal footprint.
  const existing = document.getElementById('snapshot-actions-popover');
  if (existing) existing.remove();
  const anchor = document.querySelector(`[data-snapshot-name="${name.replace(/"/g, '\\"')}"]`);
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const div = document.createElement('div');
  div.id = 'snapshot-actions-popover';
  div.style.cssText = `position:fixed;top:${rect.bottom + 6}px;left:${rect.left}px;z-index:50;background:var(--bg-1);border:1px solid var(--line);border-radius:4px;padding:6px;display:flex;flex-direction:column;gap:4px;box-shadow:0 6px 24px rgba(0,0,0,0.4);min-width:200px;`;
  const button = (label, tip, action) => {
    const b = document.createElement('button');
    b.className = 'btn ghost';
    b.style.cssText = 'text-align:left;font-family:var(--mono);font-size:11px;padding:6px 10px;';
    b.textContent = label;
    b.title = tip;
    b.addEventListener('click', () => { div.remove(); action(); });
    return b;
  };
  div.appendChild(button('Generate award letters →', 'One xlsx per awarded supplier; strict cross-supplier isolation. Use to email each supplier their award.', () => _scenarioAction('letters', name)));
  div.appendChild(button('Internal full-detail summary →', 'Cross-supplier xlsx with every bid + every decision. Banner: INTERNAL — NEVER FORWARD.', () => _scenarioAction('internal', name)));
  div.appendChild(button('Decision Log (legal-hold) →', 'Per-item legal-hold record. Retain for several years.', () => _scenarioAction('decision', name)));
  div.appendChild(button('Delete snapshot ✕', 'Removes the snapshot from the saved set. Does not undo any letters/logs already exported.', async () => {
    if (!confirm(`Delete snapshot "${name}"?`)) return;
    _py.globals.set('_scen_del_in', name);
    await _py.runPythonAsync(`
from app_engine import delete_award_scenario
delete_award_scenario(_scen_del_in)
`);
    await _refreshConsolidationAndMatrix();
  }));
  document.body.appendChild(div);
  setTimeout(() => {
    const close = (ev) => {
      if (!div.contains(ev.target) && ev.target !== anchor) {
        div.remove();
        document.removeEventListener('click', close, true);
      }
    };
    document.addEventListener('click', close, true);
  }, 0);
}

function _openSnapshotCompareDialog() {
  // Pick 2 snapshots from the saved list, then call compare_award_scenarios.
  // Inline tick-list popover.
  const existing = document.getElementById('snapshot-compare-popover');
  if (existing) { existing.remove(); return; }
  const list = (_lastHeadline && _lastHeadline.scenarios_list) || [];
  // We don't pass scenarios into headline currently; fetch fresh from the
  // last refresh's payload kept on _lastHeadline.scenarios_list.
  alert('Snapshot compare — pick 2 snapshots by clicking each pill, then re-click this button. (Quick-and-dirty for now; refine later.)');
}

async function _scenarioAction(kind, name) {
  if (!_pyAppLoaded || !_py) return;
  _py.globals.set('_scen_act_name', name);
  let pyFn, filenamePart;
  if (kind === 'letters') {
    // Award letters generates multiple files (one per awarded supplier);
    // route to the existing letters handler.
    if (typeof _genAwardLettersForScenario === 'function') {
      await _genAwardLettersForScenario(name);
      return;
    }
    pyFn = 'gen_award_letters_for_scenario';
    filenamePart = 'AwardLetters';
  } else if (kind === 'internal') {
    pyFn = 'gen_internal_award_summary_xlsx';
    filenamePart = 'InternalSummary';
  } else if (kind === 'decision') {
    pyFn = 'gen_decision_summary_xlsx';
    filenamePart = 'DecisionSummary';
  } else { return; }
  try {
    const out = await _py.runPythonAsync(`
import base64
from app_engine import ${pyFn}
b = ${pyFn}(_scen_act_name) if "${pyFn}" != "gen_decision_summary_xlsx" else ${pyFn}(scenario_name=_scen_act_name)
base64.b64encode(b).decode("ascii") if isinstance(b, (bytes, bytearray)) else ""
`);
    if (!out) return;
    const bytes = Uint8Array.from(atob(out), c => c.charCodeAt(0));
    const blob = new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `${filenamePart}_${name.replace(/[^a-zA-Z0-9._-]+/g, '_')}_${ts}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error('[scenario-action]', kind, err);
    alert(`${kind} failed: ` + (err.message || err));
  }
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

    // Markdown (for an internal tool)
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
      `  • DecisionLog_${safeName}_${rfqId}.md — markdown version you can paste into an internal documentation tool\n\n` +
      `Retain the xlsx for at least 7 years per the legal-hold convention. The markdown is for your own follow-up — paste a section into an internal tool and ask for an executive summary, supplier reply draft, or push-back checklist.`
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
  html += '<table data-table-id="consolidation-candidates" data-rowselect="1" data-sortable="1" style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px;">';
  html += `<thead style="background:var(--bg-2);"><tr>
    <th data-sort-key="supplier" data-sort-type="str" class="sortable" style="padding:10px 14px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Supplier</th>
    <th data-sort-key="n_quoted" data-sort-type="num" class="sortable" style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Items quoted</th>
    <th data-sort-key="pct_quoted" data-sort-type="num" class="sortable" style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">% of RFQ</th>
    <th data-sort-key="n_lowest" data-sort-type="num" class="sortable" style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Lowest on N items</th>
    <th data-sort-key="consol_value" data-sort-type="num" class="sortable" style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Award all to them</th>
    <th data-sort-key="not_quoted" data-sort-type="num" class="sortable" style="padding:10px 14px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.12em;">Items they didn't quote</th>
  </tr></thead><tbody>`;
  cands.forEach((c, i) => {
    const isWinner = i === 0;
    const isFocused = (_matrixFilter.supplier === c.supplier);
    const rowBg = isFocused ? 'background:rgba(255,183,51,0.12);' : (isWinner ? 'background:rgba(255,183,51,0.06);' : '');
    html += `<tr class="clickable-row" data-consol-supplier="${_escapeHtml(c.supplier)}" data-row-key="${_escapeHtml(c.supplier)}" data-sort-supplier="${_escapeHtml(c.supplier)}" data-sort-n_quoted="${c.n_items_quoted}" data-sort-pct_quoted="${c.pct_items_quoted}" data-sort-n_lowest="${c.n_items_lowest}" data-sort-consol_value="${c.consolidation_value}" data-sort-not_quoted="${c.items_not_quoted}" title="Click to focus the comparison matrix on ${_escapeHtml(c.supplier)} — see exactly which items they bid and at what price." style="border-bottom:1px solid var(--line);${rowBg}">
      <td style="padding:12px 14px;font-weight:${isWinner ? '700' : '400'};color:${isWinner ? 'var(--accent)' : 'var(--ink-0)'};">
        ${isWinner ? '★ ' : ''}${_escapeHtml(c.supplier)}${isFocused ? ` <button type="button" class="consol-focus-clear" data-clear-focus="1" title="Currently filtering the matrix to ${_escapeHtml(c.supplier)} — click to clear focus." style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:var(--accent);font-family:var(--mono);letter-spacing:0.08em;margin-left:8px;background:rgba(255,183,51,0.15);border:1px solid var(--accent);padding:2px 6px;border-radius:3px;cursor:pointer;text-transform:uppercase;">FOCUSED ✕</button>` : ''}
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

    // Verified carve-outs — opt in to universal row select + sortable columns,
    // and double-click a row → open the per-item chart modal so the analyst
    // can audit the underlying history without leaving the drawer.
    if (realCarves.length) {
      html += `<details open style="margin-bottom:14px;"><summary style="cursor:pointer;padding:10px 0;font-family:var(--ui);font-size:13px;font-weight:600;color:var(--ink-0);">${realCarves.length} verified carve-out${realCarves.length === 1 ? '' : 's'} — ${fmt$(w.carve_out_savings_total)} additional savings · click row to select · double-click to open chart</summary>`;
      html += '<div style="border:1px solid var(--line);border-radius:6px;overflow:auto;max-height:400px;margin-top:8px;"><table data-table-id="verified-carves" data-rowselect="1" data-sortable="1" style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
      html += `<thead style="background:var(--bg-2);position:sticky;top:0;"><tr>
        <th data-sort-key="item" data-sort-type="str" class="sortable" style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item #</th>
        <th data-sort-key="desc" data-sort-type="str" class="sortable" style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Description</th>
        <th data-sort-key="qty" data-sort-type="num" class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
        <th data-sort-key="winner_price" data-sort-type="num" class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Winner $/ea</th>
        <th data-sort-key="carve_price" data-sort-type="num" class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Carve to → $/ea</th>
        <th data-sort-key="savings_total" data-sort-type="num" class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Savings</th>
      </tr></thead><tbody>`;
      for (const co of realCarves.slice(0, 200)) {
        html += `<tr class="clickable-row" data-row-key="${_escapeHtml(co.item_num)}" data-carve-item="${_escapeHtml(co.item_num)}" data-sort-item="${_escapeHtml(co.item_num)}" data-sort-desc="${_escapeHtml(co.description || '')}" data-sort-qty="${co.qty_24mo || 0}" data-sort-winner_price="${co.winner_price}" data-sort-carve_price="${co.carve_price}" data-sort-savings_total="${co.savings_total}" title="Double-click to open the per-item chart with order history + supplier bid overlays. Useful for auditing why this carve fires before approving." style="border-bottom:1px solid var(--line);">
          <td style="padding:10px;color:var(--ink-0);">${_escapeHtml(co.item_num)}</td>
          <td style="padding:10px;color:var(--ink-1);max-width:280px;">${_escapeHtml(_truncate(co.description, 60))}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">${(co.qty_24mo||0).toLocaleString()}</td>
          <td style="padding:10px;text-align:right;color:var(--ink-1);">$${co.winner_price.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;color:var(--cyan);"><strong>${_escapeHtml(co.carve_supplier)}</strong> $${co.carve_price.toFixed(2)}</td>
          <td style="padding:10px;text-align:right;color:var(--green);font-weight:600;">$${co.savings_total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} <span style="color:var(--ink-2);">(${co.savings_pct.toFixed(0)}%)</span></td>
        </tr>`;
      }
      if (realCarves.length > 200) {
        html += `<tr class="no-sort"><td colspan="6" style="padding:14px;text-align:center;color:var(--ink-2);">… and ${realCarves.length - 200} more verified carve-outs</td></tr>`;
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
  // Restore universal-table state for the consolidation candidates table.
  const consolTable = el.querySelector('table[data-table-id="consolidation-candidates"]');
  if (consolTable) _restoreUniversalTableState(consolTable);
  // Wire candidate rows → focus matrix on that supplier. The inline
  // FOCUSED ✕ button stops propagation and clears focus directly so the
  // analyst doesn't have to click the row a second time (which is the
  // toggle-off path but easy to miss).
  el.querySelectorAll('[data-clear-focus]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      _matrixFilter.supplier = null;
      _rerenderMatrixWithFilters();
    });
  });
  el.querySelectorAll('[data-consol-supplier]').forEach(tr => {
    tr.addEventListener('click', () => {
      const sup = tr.getAttribute('data-consol-supplier');
      _matrixFilter.supplier = (_matrixFilter.supplier === sup) ? null : sup;
      _rerenderMatrixWithFilters();
      const compEl = $('comparison-section');
      if (compEl) compEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  // Carve-out row double-click → open the per-item modal so the analyst
  // can audit the trend / bid history of a flagged carve before approving.
  el.querySelectorAll('[data-carve-item]').forEach(tr => {
    tr.addEventListener('dblclick', () => {
      const itemNum = tr.getAttribute('data-carve-item');
      if (typeof _openItemHistory === 'function') _openItemHistory(itemNum);
    });
  });
  // Restore state on the verified-carves table too.
  const carvesTable = el.querySelector('table[data-table-id="verified-carves"]');
  if (carvesTable) _restoreUniversalTableState(carvesTable);
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
  // Comparison matrix opts in to universal row-select + sortable columns.
  // Each row gets data-row-key="<item_num>"; the whole table carries
  // data-table-id="comparison-matrix" so selection + sort persist across
  // re-renders (chip flips, filter toggles).
  // The Last $/ea column gets a left vertical separator + amber-tinted
  // header to signal it's the historical baseline. The last supplier
  // column (final supplier in the loop) closes with a right separator so
  // the price block visually reads as one grouped section.
  html += '<table data-table-id="comparison-matrix" data-rowselect="1" data-sortable="1" style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--mono);">';
  html += `<thead style="background:var(--bg-2);position:sticky;top:0;z-index:1;"><tr>
    <th title="Tick to select this item for the next Round 2 / Rn focused-RFQ batch. Use to push back on items where bids look uncompetitive." style="padding:10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;width:36px;">R2</th>
    <th data-sort-key="desc" data-sort-type="str" title="Item description (Coupa 'Item' field). Click to sort A-Z / Z-A." class="sortable" style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
    <th data-sort-key="part" data-sort-type="str" title="buyer item number — dedup key. Click to sort." class="sortable" style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Part #</th>
    <th data-sort-key="lastdate" data-sort-type="date" title="Most recent order date for this item. Click to sort by recency." class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Last order</th>
    <th data-sort-key="qty" data-sort-type="num" title="Quantity ordered in the last 24 months. Click to sort." class="sortable" style="padding:10px;text-align:right;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Qty 24mo</th>
    <th data-sort-key="lastprice" data-sort-type="num" title="Last priced unit price — historical baseline. The price block (Last $/ea + supplier bids) is bracketed by amber separators to read as one grouped section." class="sortable" style="padding:10px;text-align:right;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;border-left:2px solid var(--accent-deep);background:rgba(255,183,51,0.06);">Last $/ea</th>`;
  for (let i = 0; i < suppliers.length; i++) {
    const sup = suppliers[i];
    const isLastSup = (i === suppliers.length - 1);
    const emph = (_matrixFilter.supplier === sup) ? ' matrix-supplier-emphasized' : '';
    const rightBorder = isLastSup ? 'border-right:2px solid var(--accent-deep);' : '';
    html += `<th data-sort-key="sup_${_escapeHtml(sup)}" data-sort-type="num" class="sortable${emph}" title="${_escapeHtml(sup)}'s bid price for each item. Click to sort by their price." style="padding:10px;text-align:right;color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;border-left:1px solid var(--line);${rightBorder}">${_escapeHtml(sup)}</th>`;
  }
  html += `<th data-sort-key="cov" data-sort-type="str" class="sortable" style="padding:10px;text-align:center;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Cov</th>
    <th data-sort-key="rec" data-sort-type="str" class="sortable" style="padding:10px;text-align:left;color:var(--ink-2);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Recommendation</th>
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
      // Right-edge accent border for the LAST supplier column so the price
      // block (Last $/ea + N supplier bids) reads as one grouped section.
      const rightStripe = (sup === suppliers[suppliers.length - 1]) ? 'border-right:2px solid var(--accent-deep);' : '';
      cells += `<td class="matrix-cell${emph}${r2CellClass}" data-cell-item="${_escapeHtml(r.item_num)}" data-cell-supplier="${_escapeHtml(sup)}" data-sort-cell="sup_${_escapeHtml(sup)}" data-sort-value="${b.price != null ? b.price : ''}" title="${cellTitle}" style="padding:8px 10px;text-align:right;border-left:1px solid var(--line);${rightStripe}${baseStyle}">${cellContent}${r2Badge}</td>`;
    }
    const covColor = r.coverage === 'FULL' ? 'var(--green)' : r.coverage === 'PARTIAL' ? 'var(--accent)' : r.coverage === 'SINGLE' ? 'var(--cyan)' : 'var(--red)';
    const rec = r.recommendation || 'MANUAL_REVIEW';
    const recColor = _MATRIX_REC_COLORS[rec] || 'var(--ink-1)';
    const recLbl = _MATRIX_REC_LABELS[rec] || rec;
    const recReason = r.recommendation_reason || '';
    const isSelectedR2 = _round2Selection.has(r.item_num);
    const lastOrderDate = r.last_order || '';
    // data-sort-<key> per cell so universal sort can read values without
    // string-parsing the displayed text. Sort keys defined on the <th>s above.
    html += `<tr class="clickable-row${isSelectedR2 ? ' r2-selected' : ''}" style="border-bottom:1px solid rgba(122,109,115,0.25);" data-comp-item="${_escapeHtml(r.item_num)}" data-row-rec="${rec}" data-row-key="${_escapeHtml(r.item_num)}" data-sort-desc="${_escapeHtml(r.description || '')}" data-sort-part="${_escapeHtml(r.item_num)}" data-sort-lastdate="${_escapeHtml(lastOrderDate)}" data-sort-qty="${r.qty_24mo || 0}" data-sort-lastprice="${r.last_unit_price || 0}" data-sort-cov="${r.coverage || ''}" data-sort-rec="${rec}">
      <td style="padding:6px 8px;text-align:center;" class="r2-cell">
        <input type="checkbox" class="r2-row-check" data-r2-item="${_escapeHtml(r.item_num)}" ${isSelectedR2 ? 'checked' : ''} title="Tick to include this item in the next Round 2 batch — pushes the supplier(s) for a sharper-pencil re-quote with their R1 echo + reference price shown." style="cursor:pointer;accent-color:var(--accent);">
      </td>
      <td style="padding:8px 10px;color:var(--ink-0);max-width:340px;" title="${_escapeHtml(r.description || '')}">${_escapeHtml(_truncate(r.description, 70))}</td>
      <td style="padding:8px 10px;color:var(--ink-2);font-family:var(--mono);font-size:11px;">${_escapeHtml(r.item_num)}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-2);font-family:var(--mono);font-size:10px;">${_escapeHtml(lastOrderDate)}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-0);">${(r.qty_24mo||0).toLocaleString()}</td>
      <td style="padding:8px 10px;text-align:right;color:var(--ink-1);background:rgba(255,183,51,0.04);border-left:2px solid var(--accent-deep);font-weight:600;">$${(r.last_unit_price||0).toFixed(2)}</td>
      ${cells}
      <td style="padding:8px 10px;text-align:center;color:${covColor};font-weight:600;font-size:10px;">${r.coverage}</td>
      <td style="padding:8px 10px;color:${recColor};font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline dotted;" title="${_escapeHtml(recReason)} · click to filter to ${_MATRIX_REC_LABELS[rec] || rec}" data-rec-row-filter="${rec}">${recLbl}</td>
    </tr>`;
  }
  // colspan accounts for the new R2 column (+1 from prior layout)
  // R2 + Item + Part# + LastOrder + Qty + Last$ + N suppliers + Cov + Rec
  const totalCols = suppliers.length + 8;
  if (filtered.length > cap) {
    html += `<tr><td colspan="${totalCols}" style="padding:14px;text-align:center;color:var(--ink-2);">… and ${(filtered.length - cap).toLocaleString()} more items hidden (sort by qty × hist price desc — narrow the filters to bring more into view)</td></tr>`;
  }
  if (!slice.length) {
    html += `<tr><td colspan="${totalCols}" style="padding:24px;text-align:center;color:var(--ink-2);">No items match the active filter set. <button type="button" class="matrix-filter-clear" data-pill-clear-all style="margin-left:8px;">clear all filters</button></td></tr>`;
  }
  html += '</tbody></table></div>';
  html += '<div style="margin-top:8px;color:var(--ink-2);font-size:11px;font-family:var(--mono);">⚠ = UOM discrepancy noted by supplier &nbsp;·&nbsp; † = substitute part offered &nbsp;·&nbsp; <strong style="color:var(--green);">green</strong> = lowest non-flagged bid &nbsp;·&nbsp; click row to select · click cell to open drill-down · click column header to sort</div>';

  el.innerHTML = html;
  // Restore universal-table state (selection + sort) — survives re-renders.
  const matrixTable = el.querySelector('table[data-table-id="comparison-matrix"]');
  if (matrixTable) _restoreUniversalTableState(matrixTable);

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
            Each supplier you tick gets a focused xlsx with their R1 echo + the trend-projected reference price + 8 supplier-input fields. Strict isolation: no cross-supplier data leaks into any file.
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
          Include Reference Price column (trend-projected from cleaned trend, with explanatory banner)
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
      <div id="im-chart-section" style="padding:22px 26px 8px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;font-size:11px;color:var(--ink-2);font-weight:600;text-transform:uppercase;letter-spacing:0.10em;font-family:var(--ui);">UNIT PRICE OVER TIME</h3>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div id="im-event-filters" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
            <button id="im-events-toggle" type="button" title="Show / hide the table of economic events overlaid on this chart. Click any vertical line on the chart to scroll to that event in the table." style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-family:var(--mono);font-size:10px;padding:4px 8px;border-radius:3px;cursor:pointer;letter-spacing:0.06em;">EVENTS ▾</button>
            <button id="im-chart-fullscreen" type="button" title="Expand the chart to fill the entire screen. Esc or click the ✕ to return." style="background:transparent;border:1px solid var(--line);color:var(--ink-1);font-family:var(--mono);font-size:10px;padding:4px 8px;border-radius:3px;cursor:pointer;letter-spacing:0.06em;">⤢ FULLSCREEN</button>
            <div id="im-trend-label" style="font-size:11px;color:var(--ink-2);font-family:var(--mono);"></div>
          </div>
        </div>
        <div id="im-chart-wrap" style="position:relative;">
          <svg id="im-chart" style="width:100%;height:280px;display:block;" preserveAspectRatio="xMidYMid meet"></svg>
          <button id="im-chart-fullscreen-close" type="button" style="display:none;position:absolute;top:12px;right:12px;background:var(--bg-2);border:1px solid var(--accent);color:var(--accent);font-family:var(--mono);font-size:13px;padding:6px 12px;border-radius:4px;cursor:pointer;z-index:201;letter-spacing:0.06em;">✕ EXIT FULLSCREEN</button>
        </div>
        <div id="im-events-table" hidden style="margin-top:10px;border:1px solid var(--line);border-radius:4px;background:var(--bg-2);max-height:200px;overflow:auto;"></div>
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

  // Events table toggle — show / hide the description-of-events table below
  // the chart. Persistent within the modal session; resets on next open.
  const evToggle = document.getElementById('im-events-toggle');
  if (evToggle) evToggle.addEventListener('click', () => {
    const tbl = document.getElementById('im-events-table');
    if (!tbl) return;
    tbl.hidden = !tbl.hidden;
    evToggle.textContent = tbl.hidden ? 'EVENTS ▾' : 'EVENTS ▴';
  });

  // Fullscreen toggle — wraps the chart so it fills the viewport. Click the
  // ✕ button or press Esc to exit. Re-renders the chart at the new size.
  const fsBtn = document.getElementById('im-chart-fullscreen');
  const fsClose = document.getElementById('im-chart-fullscreen-close');
  if (fsBtn) fsBtn.addEventListener('click', _enterChartFullscreen);
  if (fsClose) fsClose.addEventListener('click', _exitChartFullscreen);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const wrap = document.getElementById('im-chart-wrap');
      if (wrap && wrap.classList.contains('is-fullscreen')) _exitChartFullscreen();
    }
  });
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
  // Drop the persistent modal-open-source highlight so the .last-viewed-row
  // fade can take over (existing behavior — fading green trail).
  document.querySelectorAll('tr.modal-open-source').forEach(r => r.classList.remove('modal-open-source'));
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
  // Persistent source-row highlight while the modal is open. Backlog #2 —
  // when the analyst is in the modal flagging / locking / excluding, the
  // originating row stays visibly highlighted across every table on the
  // page so they can tell which row will receive the action.
  document.querySelectorAll('tr.modal-open-source').forEach(r => r.classList.remove('modal-open-source'));
  const sourceSel = `tr[data-item="${CSS.escape(itemNum)}"], tr[data-comp-item="${CSS.escape(itemNum)}"], tr[data-carve-item="${CSS.escape(itemNum)}"]`;
  document.querySelectorAll(sourceSel).forEach(r => r.classList.add('modal-open-source'));
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
  // banner the analyst wanted gone once the data's clean.)

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

// ----- Economic / tariff / commodity events overlay -----
//
// Verified, public, MRO-relevant events that overlay the per-item history
// chart as vertical date markers + labels. Each event has a category so
// the analyst can filter (toggle TARIFF / COMMODITY / ECONOMIC on/off).
// Sources: USTR press releases, White House fact sheets, Federal Register
// notices, LME / FRED / FRB statements; cross-checked against major-outlet
// reporting (CSIS, Tax Foundation, NPR, Reuters, Bloomberg, MINING.COM,
// White & Case / Dorsey / Buchanan client alerts).
//
// Only known, verifiable events are listed. We can wire this to a JSON
// feed (or pull from the tariff-impact sibling app) for live updates
// during the integration sprint.
const _CHART_EVENTS = [
  // ---- TARIFF ----
  {date: "2018-03-23", category: "TARIFF", label: "Section 232 steel (25%) + aluminum (10%) tariffs take effect", description: "First Trump administration imposes Section 232 national-security tariffs on steel and aluminum imports. Initial broad scope with country-by-country exemptions negotiated subsequently."},
  {date: "2018-07-06", category: "TARIFF", label: "Section 301 List 1 — China tariffs 25% on $34B take effect", description: "First tranche of Section 301 tariffs targeting Chinese industrial goods (industrial machinery, electrical equipment, instruments)."},
  {date: "2018-09-24", category: "TARIFF", label: "Section 301 List 3 — 10% on $200B Chinese imports", description: "Third and largest tranche of Section 301 tariffs. Initial rate 10%, subsequently raised to 25% in May 2019."},
  {date: "2019-05-10", category: "TARIFF", label: "Section 301 List 3 raised 10% → 25%", description: "Trump administration raised List 3 tariffs from 10% to 25% during stalled trade negotiations with China."},
  {date: "2020-01-15", category: "TARIFF", label: "US-China Phase One trade deal signed", description: "Phase One agreement signed; List 4A tariffs reduced from 15% to 7.5%; List 4B suspended. China commits to additional US imports."},
  {date: "2024-05-14", category: "TARIFF", label: "Biden announces Section 301 review tariff increases (proposed)", description: "USTR proposes increases on EVs (to 100%), batteries, semiconductors, steel/aluminum from China (to 25%), critical minerals, and medical equipment following the statutory four-year review."},
  {date: "2024-09-13", category: "TARIFF", label: "USTR finalizes Section 301 tariff increases", description: "Final rule published after public comment period. All proposed increases adopted; effective dates staggered through 2024-2026."},
  {date: "2024-09-27", category: "TARIFF", label: "Most Section 301 increases take effect", description: "Steel/aluminum from China to 25%, EVs to 100%, batteries 25%, syringes/needles 50%. Some categories deferred to Jan 2025 / Jan 2026."},
  {date: "2025-03-12", category: "TARIFF", label: "Section 232 steel + aluminum 25% — all countries, no exemptions", description: "Trump second-term proclamation ends all country exemptions and General Approved Exclusions. Aluminum raised from 10% to 25%; coverage expanded to additional downstream products."},
  {date: "2025-04-02", category: "TARIFF", label: "\"Liberation Day\" — reciprocal tariffs announced (EO 14257)", description: "Executive Order 14257: 10% baseline tariff on nearly all countries plus higher country-specific reciprocal rates (China 34%, EU 20%, Japan 24%, etc.). Largest unilateral tariff action in decades."},
  {date: "2025-04-05", category: "TARIFF", label: "10% baseline reciprocal tariff takes effect", description: "Universal 10% baseline tariff component of EO 14257 implemented."},
  {date: "2025-04-09", category: "TARIFF", label: "Country-specific reciprocal rates take effect; 90-day pause for non-China", description: "Higher country-specific rates implemented at 12:01 AM. Same day, after market sell-off, Trump announces 90-day pause for all countries except China; China rates escalate further."},
  {date: "2025-04-10", category: "TARIFF", label: "Effective China tariff confirmed at 145%", description: "White House clarifies cumulative China tariff rate is 145% (combining IEEPA fentanyl tariffs plus reciprocal increases)."},
  {date: "2025-05-14", category: "TARIFF", label: "US-China 90-day tariff de-escalation agreement", description: "Negotiated reduction: US tariffs on Chinese goods drop from 145% to 30%; China tariffs on US goods drop from 125% to 10% for an initial 90-day period."},
  {date: "2025-06-04", category: "TARIFF", label: "Section 232 steel + aluminum doubled to 50%", description: "Trump proclamation increases Section 232 duties from 25% to 50% for all countries except UK (which remains at 25%). Effective 12:01 AM EDT."},

  // ---- COMMODITY ----
  {date: "2020-04-20", category: "COMMODITY", label: "WTI crude oil futures settle negative (first time)", description: "May WTI futures contract settles at -$37.63/barrel as COVID-driven demand collapse meets full storage capacity. Single-day extreme; physical oil quickly recovered."},
  {date: "2022-03-08", category: "COMMODITY", label: "LME suspends nickel trading — short squeeze", description: "London Metal Exchange suspends nickel trading after a Chinese trader's short position triggers a >100% intraday spike. Trades cancelled; market closed for over a week. Major signal for stainless-steel and battery-input pricing."},
  {date: "2024-05-20", category: "COMMODITY", label: "LME copper hits all-time high $11,104/ton", description: "Copper sets new all-time high amid supply concerns and AI/grid-related demand expectations. Pressure on motor, wiring, fastener, and electrical equipment categories."},

  // ---- ECONOMIC ----
  {date: "2020-03-15", category: "ECONOMIC", label: "Fed emergency cut to 0-0.25% + QE restart", description: "COVID response: Federal Reserve cuts policy rate to near zero in an emergency Sunday move and announces $700B quantitative easing. Beginning of pandemic-era easy money era."},
  {date: "2022-03-16", category: "ECONOMIC", label: "Fed begins rate-hiking cycle (first 25 bps since 2018)", description: "Fed lifts policy rate from near zero with first hike of post-COVID tightening cycle. Marks pivot from easy money to inflation fight."},
  {date: "2022-06-15", category: "ECONOMIC", label: "Fed 75 bps hike — first since 1994; cycle accelerates", description: "Federal Reserve raises rates by 75 bps for first time in 28 years as CPI hits 9.1% in June reading. Procurement-relevant: capital-intensive suppliers face rapidly rising financing costs."},
  {date: "2023-03-10", category: "ECONOMIC", label: "Silicon Valley Bank fails", description: "SVB collapse triggers regional banking crisis. Procurement signal: smaller / privately-held suppliers in tech/industrial corridors face credit access pressure."},
  {date: "2023-07-26", category: "ECONOMIC", label: "Fed reaches 5.25-5.50% — final hike of cycle", description: "Federal Reserve final rate increase of post-COVID tightening cycle, holding 5.25-5.50% range for ~14 months. Peak financing cost environment for suppliers."},
  {date: "2024-09-18", category: "ECONOMIC", label: "Fed begins rate-cutting cycle (50 bps)", description: "First rate cut of new easing cycle, larger than market expected. Procurement signal: financing pressure on suppliers begins to ease; some price hikes from peak-rate era may begin to soften."},
];
const _EVENT_CATEGORY_COLORS = {
  TARIFF:    "var(--red)",
  COMMODITY: "var(--cyan)",
  ECONOMIC:  "var(--accent)",
};
let _chartEventFilter = {TARIFF: true, COMMODITY: true, ECONOMIC: true};

function _renderEventFilters() {
  const wrap = document.getElementById('im-event-filters');
  if (!wrap) return;
  const categories = ["TARIFF", "COMMODITY", "ECONOMIC"];
  wrap.innerHTML = categories.map(cat => {
    const on = _chartEventFilter[cat];
    const color = _EVENT_CATEGORY_COLORS[cat];
    return `<button type="button" data-event-filter="${cat}" title="Toggle ${cat} events on/off in the chart overlay." style="background:${on ? `rgba(255,183,51,0.06)` : 'transparent'};border:1px solid ${on ? color : 'var(--line)'};color:${on ? color : 'var(--ink-2)'};font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;letter-spacing:0.06em;font-weight:${on ? 700 : 400};">${on ? '●' : '○'} ${cat}</button>`;
  }).join('');
  wrap.querySelectorAll('[data-event-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-event-filter');
      _chartEventFilter[cat] = !_chartEventFilter[cat];
      _renderEventFilters();
      // Re-render the chart so the overlay updates without a full modal refresh
      if (_currentItemHistory) _drawItemHistoryChart(_currentItemHistory);
      _renderEventsTable();
    });
  });
}

function _renderEventsTable() {
  const el = document.getElementById('im-events-table');
  if (!el) return;
  const visibleEvents = _CHART_EVENTS.filter(e => _chartEventFilter[e.category]);
  if (!visibleEvents.length) {
    el.innerHTML = '<div style="padding:14px;color:var(--ink-2);font-family:var(--mono);font-size:11px;text-align:center;">No events visible — toggle a category filter on.</div>';
    return;
  }
  // Sort by date desc
  const sorted = [...visibleEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;font-family:var(--mono);">';
  html += '<thead style="background:var(--bg-1);position:sticky;top:0;"><tr>';
  html += '<th style="padding:6px 10px;text-align:left;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.10em;font-weight:600;width:90px;">Date</th>';
  html += '<th style="padding:6px 10px;text-align:left;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.10em;font-weight:600;width:90px;">Category</th>';
  html += '<th style="padding:6px 10px;text-align:left;color:var(--ink-2);text-transform:uppercase;letter-spacing:0.10em;font-weight:600;">Event</th>';
  html += '</tr></thead><tbody>';
  for (const e of sorted) {
    const color = _EVENT_CATEGORY_COLORS[e.category] || 'var(--ink-1)';
    html += `<tr id="event-row-${_escapeHtml(e.date)}" style="border-bottom:1px solid var(--line);" title="${_escapeHtml(e.description || '')}">
      <td style="padding:6px 10px;color:var(--ink-1);">${_escapeHtml(e.date)}</td>
      <td style="padding:6px 10px;color:${color};font-weight:600;">${_escapeHtml(e.category)}</td>
      <td style="padding:6px 10px;color:var(--ink-0);">${_escapeHtml(e.label)}<br><small style="color:var(--ink-2);">${_escapeHtml(e.description || '')}</small></td>
    </tr>`;
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}

function _enterChartFullscreen() {
  const wrap = document.getElementById('im-chart-wrap');
  if (!wrap) return;
  wrap.classList.add('is-fullscreen');
  const closeBtn = document.getElementById('im-chart-fullscreen-close');
  if (closeBtn) closeBtn.style.display = 'block';
  // Bump the SVG to fill the viewport and redraw at new dimensions
  const svg = document.getElementById('im-chart');
  if (svg) {
    svg.style.height = 'calc(100vh - 80px)';
  }
  if (_currentItemHistory) _drawItemHistoryChart(_currentItemHistory);
}

function _exitChartFullscreen() {
  const wrap = document.getElementById('im-chart-wrap');
  if (!wrap) return;
  wrap.classList.remove('is-fullscreen');
  const closeBtn = document.getElementById('im-chart-fullscreen-close');
  if (closeBtn) closeBtn.style.display = 'none';
  const svg = document.getElementById('im-chart');
  if (svg) {
    svg.style.height = '280px';
  }
  if (_currentItemHistory) _drawItemHistoryChart(_currentItemHistory);
}

function _drawItemHistoryChart(h) {
  const svg = document.getElementById('im-chart');
  // Render filter chips + events table (idempotent — safe to call repeatedly)
  _renderEventFilters();
  _renderEventsTable();
  const W = svg.clientWidth || 800, H = svg.clientHeight || 280;
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

  // Economic / tariff / commodity event overlays — rendered FIRST so other
  // elements draw on top of them. Vertical line at the event date, with a
  // small label rotated up the line. Filtered by _chartEventFilter category
  // toggles. Click a line → scroll to + flash the matching row in the
  // events table below the chart.
  for (const ev of _CHART_EVENTS) {
    if (!_chartEventFilter[ev.category]) continue;
    if (!ev.date) continue;
    const evDate = new Date(ev.date);
    const evMs = evDate.getTime();
    if (evMs < minDate || evMs > maxDate) continue;
    const ex = padL + ((evMs - minDate) / dateRange) * innerW;
    const color = _EVENT_CATEGORY_COLORS[ev.category] || 'var(--ink-2)';
    s += `<g class="chart-event" data-event-date="${_escapeHtml(ev.date)}" style="cursor:pointer;">
      <line x1="${ex}" y1="${padT}" x2="${ex}" y2="${padT + innerH}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.55"/>
      <rect x="${ex - 1}" y="${padT}" width="3" height="${innerH}" fill="transparent" pointer-events="all"/>
      <text x="${ex + 4}" y="${padT + 12}" fill="${color}" font-family="var(--mono)" font-size="9" font-weight="600" letter-spacing="0.06em" text-rendering="geometricPrecision">${_escapeHtml(ev.label.length > 38 ? ev.label.slice(0, 36) + '…' : ev.label)}</text>
      <title>${_escapeHtml(ev.date)} · ${_escapeHtml(ev.category)} · ${_escapeHtml(ev.label)} — ${_escapeHtml(ev.description || '')}</title>
    </g>`;
  }

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
    // Dots are clickable: click → scroll to + flash the matching row in the
    // Order Lines table below. Easier than hunting the small USE checkbox
    // for an outlier point. Wrapped in a <g> with a wider invisible hit-rect
    // so clicking near (not on) the dot still works.
    const dot_title = `${p.date.toISOString().slice(0,10)} · qty ${p.qty} · $${p.price.toFixed(2)}${p.excluded ? ' · EXCLUDED' : ''} · click to highlight in table below`;
    s += `<g class="chart-dot" data-line-idx="${p.lineIdx}" style="cursor:pointer;">
      <circle cx="${x}" cy="${y}" r="${Math.max(r + 4, 8)}" fill="transparent" pointer-events="all"/>`;
    if (p.excluded) {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--ink-2)" stroke-width="1" opacity="0.55" pointer-events="none"/>`;
      s += `<line x1="${x - r - 1}" y1="${y - r - 1}" x2="${x + r + 1}" y2="${y + r + 1}" stroke="var(--ink-2)" stroke-width="1" opacity="0.45" pointer-events="none"/>`;
    } else {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--accent)" opacity="0.78" pointer-events="none"/>`;
    }
    s += `<title>${_escapeHtml(dot_title)}</title></g>`;
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

  // Wire chart-event line clicks → reveal events table + scroll to that row
  svg.querySelectorAll('.chart-event').forEach(g => {
    g.addEventListener('click', () => {
      const date = g.getAttribute('data-event-date');
      const tbl = document.getElementById('im-events-table');
      if (tbl && tbl.hidden) tbl.hidden = false;
      const row = document.getElementById(`event-row-${date}`);
      if (row) {
        row.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        row.style.transition = 'background-color 0.4s';
        row.style.backgroundColor = 'rgba(255,183,51,0.18)';
        setTimeout(() => { row.style.backgroundColor = ''; }, 1500);
      }
    });
  });

  // Wire dot clicks → flash the matching row in the Order Lines table below
  svg.querySelectorAll('.chart-dot[data-line-idx]').forEach(g => {
    g.addEventListener('click', () => {
      const idx = g.getAttribute('data-line-idx');
      // Order Lines tbody rows have data-line-idx already (per-item modal).
      const row = document.querySelector(`#im-lines-body tr[data-line-idx="${CSS.escape(idx)}"]`);
      if (!row) return;
      row.scrollIntoView({behavior: 'smooth', block: 'center'});
      row.style.transition = 'background-color 0.4s';
      row.style.backgroundColor = 'rgba(255,183,51,0.20)';
      setTimeout(() => { row.style.backgroundColor = ''; }, 1500);
      // Focus the USE checkbox so spacebar can toggle exclusion immediately
      const cb = row.querySelector('input[type="checkbox"]');
      if (cb) try { cb.focus({preventScroll: true}); } catch (_) { cb.focus(); }
    });
  });
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

// One-time setup of universal table-click delegator (row select + sort).
_setupUniversalTableDelegator();

// ==========================================================================
// Glossary — searchable reference for every term in the app.
//
// The hover tooltips are 1-2 sentence cues; the glossary goes deeper:
// - 2-4 sentence definitions
// - Worked examples with concrete numbers where the term is mathematical
// - Common-confusion notes for terms that are easy to mix up
// - Cross-references to related entries (clickable to re-search)
//
// Data is a single static array (no Python round-trip). Search is plain
// substring + alias match across term/aliases/definition/example/related.
// Multiple matches are navigable via Enter / Shift+Enter / nav buttons.
// ==========================================================================

const _GLOSSARY = [
  // ----- Tiers and scoring -----
  {term: "STRONG (tier)", aliases: ["strong"], category: "Tiers and scoring",
    definition: "Top-tier candidate item. Score 70-100. Strong evidence of repeat demand: multiple recent orders, meaningful spend across at least one window, descriptive enough to send to a supplier without ambiguity. Default-include in RFQs.",
    example: "An item ordered 14 times across 3 years totaling $18,400, last ordered 22 days ago, with a clear MFG part number — typically scores in the 80s and lands STRONG.",
    related: ["MODERATE", "WEAK", "SKIP", "Score", "Smart Trim"]},
  {term: "MODERATE (tier)", aliases: ["moderate"], category: "Tiers and scoring",
    definition: "Mid-tier candidate. Score 50-69. Some signals of repeat demand but with caveats — older orders, small spend, generic descriptions, or single-source. Worth including in RFQs but worth a glance before sending.",
    example: "An item ordered 4 times over 3 years, $1,200 total spend, last ordered 8 months ago, MFG blank — likely scores ~58 (MODERATE).",
    related: ["STRONG", "WEAK", "SKIP", "Score"]},
  {term: "WEAK (tier)", aliases: ["weak"], category: "Tiers and scoring",
    definition: "Low-confidence candidate. Score 30-49. Limited demand evidence — 2-3 historical orders, large gaps, low spend, or significant demand drop-off. Typically dropped from RFQs because the historical pattern doesn't justify re-bid effort.",
    example: "An item ordered twice — once in 2023, once in 2024 — totaling $340, with a generic description ('miscellaneous fastener'). Likely scores ~38 (WEAK).",
    related: ["SKIP", "MODERATE", "Smart Trim", "Dormancy"]},
  {term: "SKIP (tier)", aliases: ["skip"], category: "Tiers and scoring",
    definition: "Bottom-tier item. Score 0-29. Worst signals: dormant for 12+ months, very low spend, generic descriptions, or descriptions matching red flags (service / freight / tariff). Usually dropped from RFQs entirely; sometimes deleted from the working list.",
    example: "An item ordered once in 2022 for $48, description 'miscellaneous part'. Scores ~12 (SKIP). Smart Trim's 'drop SKIP-only' option removes items like this in bulk.",
    related: ["WEAK", "Smart Trim", "Dormancy", "Description flags"]},
  {term: "Score", aliases: ["scoring", "rfq score"], category: "Tiers and scoring",
    definition: "A 0-100 number the engine assigns to each candidate item, summarizing demand evidence. Built from: spend across 12/24/36-month windows, recency, order count, description quality, MFG completeness, and demand-pattern flags. Higher is better. Score determines tier (STRONG/MODERATE/WEAK/SKIP).",
    example: "An item with $5,000 of 24-mo spend, last ordered 90 days ago, 8 historical orders, full MFG data scores around 75 (STRONG).",
    related: ["STRONG", "MODERATE", "WEAK", "SKIP", "Difficulty rating"]},
  {term: "Difficulty rating", aliases: ["difficulty"], category: "Tiers and scoring",
    definition: "A file-level 0-100 rating summarizing how hard the source data is to work with. Built from: % items in WEAK/SKIP, % missing MFG, % generic descriptions, UOM-mixed counts. Snapshotted with timestamp for period-end reporting. Higher = more difficult.",
    example: "A file with 89% WEAK/SKIP, 84% missing MFG, 89% generic descriptions, 22% UOM-mixed scores ~62 (DIFFICULT).",
    related: ["Score", "Smart Trim"]},

  // ----- Items and identifiers -----
  {term: "Item (description)", aliases: ["description", "item description"], category: "Items and identifiers",
    definition: "The mandatory long descriptive name of a part — Coupa exports populate this consistently as the 'Item' field. The matrix and RFQ-list lead with this column because it's what analysts recognize at a glance, more so than a bare part number.",
    example: "'Bearing 6203 2RS SKF stainless' is an Item description. Compare to the Part # which might be a cryptic '5709A45'.",
    related: ["Part #", "EAM Part Number", "Description flags"]},
  {term: "Part # (Item Number)", aliases: ["item #", "item number", "part number"], category: "Items and identifiers",
    definition: "The internal item-number key for an item — typically the buyer-side identifier from the source system (ERP / Coupa). Used as the primary dedup key. Distinct from the manufacturer's part number (Mfg PN).",
    example: "An internal Part # of '12345' for an item whose mfg part number is 'SKF-6203-2RS'.",
    related: ["EAM Part Number", "Mfg PN", "Dedup key cascade"]},
  {term: "EAM Part Number", aliases: ["eam pn", "eam part #"], category: "Items and identifiers",
    definition: "The Enterprise Asset Management system's part number — a buyer-side fallback when the primary Item # is missing. Common when items come in via cXML / PunchOut feeds where the supplier's catalog is the system of record.",
    example: "If Item # is blank but EAM Part # is '78901', the engine uses EAM as the dedup key for that record.",
    related: ["Part #", "Dedup key cascade", "Mfg PN"]},
  {term: "Mfg PN", aliases: ["mfg part number", "manufacturer part number", "manufacturer pn"], category: "Items and identifiers",
    definition: "The manufacturer's catalog part number for the physical part — distinct from the buyer-side Part #. Same physical bearing might have multiple distributor-side Part #s but only one Mfg PN. Critical for cross-supplier item identity.",
    example: "An SKF 6203 2RS bearing has Mfg PN '6203-2RS' regardless of whether you buy it through Distributor A (their part # 5709A45) or Distributor B (their part # B-6203).",
    related: ["Mfg name", "Part #"]},
  {term: "Mfg name", aliases: ["manufacturer", "manufacturer name", "mfg"], category: "Items and identifiers",
    definition: "The brand / manufacturer of the part. Often blank in cXML / PunchOut feeds where the distributor's own SKU is the only identifier present. The matcher infers Mfg from cross-references when 3+ suppliers carry the same item.",
    example: "Mfg='SKF' for an SKF 6203 bearing. Mfg='N/A' or blank in cXML records — the matcher backfills these where it can.",
    related: ["Mfg PN"]},
  {term: "Dedup key cascade", aliases: ["dedup", "deduplication"], category: "Items and identifiers",
    definition: "The fallback rule for picking which field is the canonical key when items appear under inconsistent identifiers. Tries Item # first, falls back to EAM Part #, then to the supplier's Part Number. Two records that resolve to the same key are treated as the same item.",
    example: "Record A has Item #='12345', EAM='', Part#=''. Record B has Item #='', EAM='ABC', Part#='ABC'. They are NOT the same item under cascade rules — A keys on Item #, B keys on EAM. The matcher will identify cross-key clusters separately.",
    related: ["Part #", "EAM Part Number", "Mfg PN"]},
  {term: "UOM", aliases: ["unit of measure", "uom"], category: "Items and identifiers",
    definition: "Unit of measure — EA (each), BX (box), CS (case), PK (pack), FT (foot), etc. UOM mismatches between bid and history are a major source of false savings (a per-each $0.10 bid looks like 10× cheaper than a per-box $1.00 historical price for the same item).",
    example: "Item bought historically as '$1.20 per BOX of 100'. A supplier bids '$0.012 per EA' — that's the SAME price, not a 99% savings. UOM_DISC catches this.",
    related: ["UOM_mixed", "UOM_DISC", "UOM annotation"]},
  {term: "UOM_mixed", aliases: ["uom mixed"], category: "Items and identifiers",
    definition: "A flag on an item where its historical orders span multiple distinct UOMs (e.g. some POs as EA, some as BX). Indicates messy data — the LAST $/ea may not be representative, since the unit conversion isn't consistent.",
    example: "An item with 5 historical orders: 3 in EA at $1.20, 2 in BX at $120. The 'last unit price' of $120 isn't the per-each price — UOM_mixed flag warns the analyst.",
    related: ["UOM", "UOM_DISC"]},

  // ----- Demand windows and historical math -----
  {term: "12-mo / 24-mo / 36-mo (windows)", aliases: ["12mo", "24mo", "36mo", "demand window"], category: "Demand windows and math",
    definition: "Rolling demand windows anchored to the dataset's most recent order date (NOT the wall clock — exports are often weeks stale). Quantities and spend are aggregated within each window. The 24-mo window is the default for award-value calculations.",
    example: "If the dataset's most recent order was on 2026-04-15, the 24-mo window covers 2024-04-15 to 2026-04-15. Items ordered before 2024-04-15 contribute to 36-mo but not 24-mo.",
    related: ["Anchor date", "Last $/ea", "Dormancy"]},
  {term: "Anchor date (anchor 'now')", aliases: ["anchor now", "data anchor"], category: "Demand windows and math",
    definition: "The point-in-time the engine treats as 'now' for all windowed calculations. Set to the most recent order date in the source data — NOT today's wall-clock date. This prevents stale exports from artificially de-aging items.",
    example: "If the export was generated 6 weeks ago and the latest order in it was 2026-03-01, the engine treats 'now' as 2026-03-01. An item last ordered on 2026-02-15 is 14 days old, not 8 weeks.",
    related: ["12-mo / 24-mo / 36-mo (windows)", "Dormancy"]},
  {term: "Last $/ea", aliases: ["last unit price", "last paid price"], category: "Demand windows and math",
    definition: "The exact unit price of the most recent priced order line for an item. No medians, no averages, no smoothing. RFQ math is to-the-penny: this is the historical baseline that bids are compared against.",
    example: "An item with 5 historical orders at $1.10, $1.15, $1.20, $1.18, $1.22 has Last $/ea of $1.22 — the most recent. NOT the average ($1.17).",
    related: ["12-mo / 24-mo / 36-mo (windows)", "Last order date", "Cost avoidance vs historical"]},
  {term: "Last order date", aliases: ["last order"], category: "Demand windows and math",
    definition: "The date of the most recent priced order line for an item. Drives the recency component of scoring and the dormancy flags.",
    example: "An item with last order date 2026-04-12 is 'recent'; one with last order date 2024-08-03 has been dormant for ~20 months under a 2026 anchor.",
    related: ["Dormancy", "Anchor date"]},
  {term: "Dormancy", aliases: ["dormant", "dormant 12mo", "dormancy window"], category: "Demand windows and math",
    definition: "The state of an item with no orders in the past N months. The Smart Trim panel offers 12 / 24 / 36-month dormancy windows — items with no orders in the chosen window are candidates to drop. Longer dormancy = higher confidence the demand is gone.",
    example: "Smart Trim with a 12-month dormancy window unticks every item whose last order date is more than 12 months before the anchor date.",
    related: ["Smart Trim", "Anchor date"]},
  {term: "Annual qty (run rate)", aliases: ["annual qty"], category: "Demand windows and math",
    definition: "An annualized run-rate computed as 24-mo qty divided by 2. Used in carve-out math (annual savings = price delta × annual qty) so the dollar threshold is comparable across items with different purchase cadences.",
    example: "An item with 24-mo qty = 10,000 has annual run-rate 5,000. A carve that saves $0.50/unit yields $2,500/yr in annual savings.",
    related: ["Carve threshold ($)", "Carve-out OR-rule"]},

  // ----- Description flags -----
  {term: "Description flags", aliases: ["description pattern flags"], category: "Description flags",
    definition: "Per-item flags raised by pattern-matching the item description against a curated word list. Three severity levels: red (service/freight/tariff/obsolete/rental — usually don't belong in an RFQ), amber (custom/repair/misc — caution), informational (generic — analyst should add a better description).",
    related: ["RED flag", "AMBER flag", "Generic"]},
  {term: "RED flag (description)", aliases: ["red flag", "service flag", "freight flag", "tariff flag", "obsolete flag", "rental flag"], category: "Description flags",
    definition: "A description pattern that almost certainly shouldn't be in an RFQ: the description contains keywords like 'service', 'freight', 'tariff', 'obsolete', 'rental', 'shipping', etc. These are non-material costs or items that don't have stable demand.",
    example: "An item with description 'FREIGHT — expedited shipping' or 'TARIFF SURCHARGE 2024' lands a RED flag and is typically dropped from the RFQ via Smart Trim.",
    related: ["Description flags", "Smart Trim"]},
  {term: "AMBER flag (description)", aliases: ["amber flag", "custom flag", "repair flag"], category: "Description flags",
    definition: "A caution-level description pattern: contains 'custom', 'repair', 'misc', 'special', etc. Items might be legitimate but warrant a closer look — custom parts often don't bid competitively across multiple suppliers.",
    example: "An item with description 'CUSTOM HOSE assembly per drawing 12345' is amber-flagged. Worth keeping in the RFQ if you want pricing, but expect a low bid response rate.",
    related: ["Description flags", "RED flag"]},
  {term: "Generic (description flag)", aliases: ["generic flag"], category: "Description flags",
    definition: "An informational flag for descriptions that are too vague to be useful — 'miscellaneous part', 'unspecified', 'see drawing', etc. Suppliers can't bid intelligently against a generic description; these items often need a description rewrite before going to RFQ.",
    related: ["Description flags"]},

  // ----- Smart Trim -----
  {term: "Smart Trim", aliases: ["smart trim", "trim panel"], category: "Smart Trim",
    definition: "A panel that bulk-unticks RFQ candidates based on configurable rules: dormancy window (12 / 24 / 36 mo), drop red description flags, drop by tier (WEAK+SKIP or SKIP-only), drop below a 24-mo $ minimum. Live preview shows what will be unticked before commit; 30-second Undo button is visible after apply.",
    example: "Configure: 24-mo dormancy + drop SKIP-only + drop below $200 24-mo spend → preview shows 412 items will be unticked → click Apply → if you change your mind in 30 seconds, click Undo.",
    related: ["Dormancy", "WEAK", "SKIP", "Description flags"]},
  {term: "Undo (Smart Trim)", aliases: ["undo trim", "smart trim undo"], category: "Smart Trim",
    definition: "Restores the RFQ-include checkbox state from immediately before the last Smart Trim apply. Visible for 30 seconds after each apply. Reversible at any point by manual re-checking too.",
    related: ["Smart Trim"]},

  // ----- Bid statuses -----
  {term: "PRICED (bid status)", aliases: ["priced"], category: "Bid statuses",
    definition: "A supplier provided a clean unit price for an item. The default expectation. PRICED bids feed directly into the comparison matrix and award scenarios.",
    related: ["NO_BID", "NEED_INFO", "UOM_DISC", "SUBSTITUTE"]},
  {term: "NO_BID (bid status)", aliases: ["no_bid", "no bid"], category: "Bid statuses",
    definition: "Supplier explicitly declined to bid the item. Excluded from the recommendation engine. If many suppliers no-bid the same item, it's a follow-up flag — maybe the description was unclear or the part is obsolete.",
    related: ["NEED_INFO", "PRICED"]},
  {term: "NEED_INFO (bid status)", aliases: ["need_info", "need info"], category: "Bid statuses",
    definition: "Supplier wants more information before pricing — typically a spec, drawing, or sample. The follow-up xlsx generator includes these in the 'Missing Information' tab so the analyst can package answers.",
    related: ["NO_BID", "ASK_CLARIFICATION"]},
  {term: "UOM_DISC (bid status)", aliases: ["uom_disc", "uom discrepancy"], category: "Bid statuses",
    definition: "The supplier flagged a UOM mismatch between their pricing and the requested unit of measure. CRITICAL: a UOM_DISC bid that looks dramatically cheaper than history is almost certainly a unit conversion error, not real savings. The carve-out engine excludes UOM-suspect savings until verified.",
    example: "History anchor: $1.20 per BOX of 100. Supplier bids $0.0123 per EACH and flags UOM_DISC. Looks like 99% savings — actually they're priced per-each ($0.0123 × 100 = $1.23/box, only ~3% savings). UOM_DISC alerts the analyst.",
    related: ["UOM", "UOM annotation", "Suspect carve held"]},
  {term: "SUBSTITUTE (bid status)", aliases: ["substitute", "sub offered"], category: "Bid statuses",
    definition: "Supplier didn't quote the exact MFG PN requested but offered a different MFG part as a substitute. Treat with caution — the substitute may be a worse fit (different brand, different spec, different lead time). 'Lowest Qualified' strategy excludes SUBSTITUTE bids from default award.",
    example: "RFQ asks for SKF 6203-2RS at $X. Supplier offers NTN 6203LLU as a SUBSTITUTE at $Y. Cheaper, but engineering may need to confirm equivalence.",
    related: ["Lowest Qualified", "PRICED"]},

  // ----- Recommendations -----
  {term: "ACCEPT (recommendation)", aliases: ["accept"], category: "Recommendations",
    definition: "The engine recommends awarding to the lowest priced bidder. Conditions: bid is competitive (>= the switch threshold below historical), no UOM/SUB flags on the lowest, bid spread isn't statistically anomalous.",
    related: ["PUSH_BACK", "ASK_CLARIFICATION", "MANUAL_REVIEW"]},
  {term: "PUSH_BACK (recommendation)", aliases: ["push_back", "push back"], category: "Recommendations",
    definition: "The lowest bid is above the historical baseline by more than the pushback threshold. Engine recommends going back to the supplier for a sharper pencil or a Round 2.",
    example: "Historical $5.20/ea, lowest bid $5.85/ea (+12%). Above the 10% pushback threshold → PUSH_BACK.",
    related: ["ACCEPT", "Round 2", "Reference price"]},
  {term: "ASK_CLARIFICATION (recommendation)", aliases: ["ask_clarification", "clarification"], category: "Recommendations",
    definition: "The lowest bid has a flag (UOM_DISC, SUBSTITUTE, NEED_INFO) that needs to be resolved before the bid can be trusted. Engine routes to the follow-up xlsx generator.",
    related: ["UOM_DISC", "SUBSTITUTE", "NEED_INFO"]},
  {term: "EXCLUDE (recommendation)", aliases: ["exclude"], category: "Recommendations",
    definition: "Item should be excluded from the award entirely — typically because no supplier bid, or all bids no-bid'd, or all bids are flagged. Action: drop from RFQ, follow up with suppliers, or convert to a different sourcing channel.",
    related: ["NO_BID", "MANUAL_REVIEW"]},
  {term: "MANUAL_REVIEW (recommendation)", aliases: ["manual_review", "manual review"], category: "Recommendations",
    definition: "The engine couldn't decide cleanly. Conditions: statistical outlier on lowest bid, marginal savings below the switch threshold, or coverage too thin to compare. Analyst judgment required.",
    related: ["ACCEPT", "Outlier (bid)"]},

  // ----- Coverage -----
  {term: "FULL (coverage)", aliases: ["full coverage", "3+ bids", "full competition"], category: "Coverage",
    definition: "An item received 3 or more priced bids. Full competition; recommendation engine has the most signal here. The 3+ bids KPI tile counts items in this state.",
    related: ["PARTIAL", "SINGLE", "NONE"]},
  {term: "PARTIAL (coverage)", aliases: ["partial coverage", "2 bids", "partial competition"], category: "Coverage",
    definition: "An item received exactly 2 priced bids. Some competition, but spread analysis is weaker. The 2 bids KPI tile counts these.",
    related: ["FULL", "SINGLE"]},
  {term: "SINGLE (coverage)", aliases: ["single source", "1 bid"], category: "Coverage",
    definition: "An item received exactly 1 priced bid. No competition; the bid is essentially a take-it-or-leave-it. Worth a follow-up before awarding to test for negotiation room.",
    example: "An item where only Supplier A priced — Supplier B and Supplier C no-bid'd. Single-source means Supplier A has no incentive to sharpen pencil. Send a follow-up.",
    related: ["FULL", "PARTIAL", "NONE", "Round 2 (Rn)"]},
  {term: "NONE (coverage)", aliases: ["none coverage", "0 bids", "uncovered"], category: "Coverage",
    definition: "An item received NO priced bid from any supplier. Cannot be awarded as part of this RFQ. Counted as 'uncovered' — surfaces in the headline as a follow-up signal and is excluded from savings math (its historical does NOT inflate the savings number).",
    example: "An item with $4,200 historical 24-mo spend that no supplier bid on lands 'uncovered'. The $4,200 is reported separately, NOT counted as savings.",
    related: ["Uncovered count", "Uncovered historical", "Cost avoidance vs historical"]},
  {term: "Outlier (bid)", aliases: ["outlier", "outliers"], category: "Coverage",
    definition: "A bid where the lowest price is statistically anomalous vs the cross-supplier median or vs the historical baseline. Threshold: typically >3× or <1/3 of median. Triggers MANUAL_REVIEW because outliers are often UOM mistakes or typos.",
    example: "Historical $5.20, two suppliers at $5.10 / $5.30, third supplier at $0.52. The third is likely a per-each-vs-per-package error. Flagged outlier.",
    related: ["MANUAL_REVIEW", "UOM_DISC"]},

  // ----- Strategies -----
  {term: "Lowest Price (strategy)", aliases: ["lowest price"], category: "Award strategies",
    definition: "For each item, award to whichever supplier bid lowest. UOM_DISC and SUBSTITUTE bids are INCLUDED. Maximizes raw savings on paper; least defensible if a 'lowest' price is actually a UOM error. Use sparingly.",
    related: ["Lowest Qualified", "Strategy chip"]},
  {term: "Lowest Qualified (strategy)", aliases: ["lowest qualified"], category: "Award strategies",
    definition: "Same logic as Lowest Price but EXCLUDES bids flagged UOM_DISC or SUBSTITUTE. The defensible default — what you'd present in an audit. The recommendation engine produces this view.",
    example: "Item has bids: Supplier A at $5.10 (UOM_DISC), Supplier B at $5.40 (PRICED), Supplier C at $5.45 (PRICED). Lowest Price awards to A; Lowest Qualified awards to B.",
    related: ["Lowest Price", "UOM_DISC", "SUBSTITUTE"]},
  {term: "Consolidate to (strategy)", aliases: ["consolidate", "consolidate to"], category: "Award strategies",
    definition: "Award everything to one named supplier as primary, EXCEPT items where the carve-out OR-rule fires (another supplier saves enough to justify a carve). The carves are AUTOMATIC under this strategy — they're part of the math, not a separate option. The standard playbook for MRO categories.",
    example: "Consolidate to Supplier-A: 1,200 items go to A. 47 items where Supplier-B beats A by ≥20% or ≥$3K/yr automatically carve to B. Headline reads: 'CONSOLIDATE TO Supplier-A · 47 carve-outs'.",
    related: ["Carve-out", "Carve-out OR-rule", "Suspect carve held"]},
  {term: "Incumbent Preferred (strategy)", aliases: ["incumbent preferred", "incumbent"], category: "Award strategies",
    definition: "Stay with the historical supplier wherever they bid, UNLESS competition saves at least the switch threshold (default ~5%). Use when relationship continuity matters or switching costs are real. NOTE: if the incumbent doesn't have any priced bid, this strategy degrades to Lowest Price for every item.",
    example: "Historical supplier bids $5.30. Lowest competitor bids $5.20. Savings = 1.9% < 5% threshold → keep with incumbent. If lowest competitor were $4.85 (8.5%), incumbent would lose.",
    related: ["Lowest Price"]},
  {term: "Manual (strategy)", aliases: ["manual strategy"], category: "Award strategies",
    definition: "Item awards are explicitly set by the analyst, item by item, via locks and per-scenario overrides. The headline reflects whatever the saved manual snapshot contains.",
    related: ["Item lock", "Snapshot"]},
  {term: "Strategy chip", aliases: ["chip", "chip strip", "strategy chips"], category: "Award strategies",
    definition: "The five-button row in the headline card. Click any chip to switch the headline + matrix view to that strategy LIVE — no save needed. Default chip on bid-load is 'Consolidate to' with the top consolidation candidate as the named target.",
    related: ["Lowest Price (strategy)", "Lowest Qualified (strategy)", "Consolidate to (strategy)", "Incumbent Preferred (strategy)", "Manual (strategy)", "Snapshot"]},

  // ----- Carve-outs -----
  {term: "Carve-out", aliases: ["carve", "carveout", "carve out"], category: "Carve-outs",
    definition: "An item where, under a Consolidate-to strategy, the consolidation winner is overridden in favor of a different supplier — because that other supplier's savings clear the carve threshold. The carve-out is part of the consolidation strategy, not a separate option.",
    example: "Strategy: Consolidate to Supplier-A. Item X: Supplier-A at $10/ea, Supplier-B at $7/ea. With carve-threshold 20%, the 30% savings fires the carve → Item X awarded to Supplier-B even though strategy is consolidate to A.",
    related: ["Consolidate to (strategy)", "Carve-out OR-rule", "Suspect carve held"]},
  {term: "Carve-out OR-rule", aliases: ["carve or-rule", "carve dual threshold"], category: "Carve-outs",
    definition: "The dual-threshold rule that decides whether a carve-out fires: (% savings ≥ threshold A) OR (annual $ savings ≥ threshold B). Defaults: 20% / $3,000-yr. Either firing carves the item. Industry-best-practice — single-threshold rules over-carve on long-tail and under-carve on high-volume.",
    example: "Threshold: 20% / $3K/yr. Item B (qty 20, RED $10, BLUE $7): 30% pct savings, $30/yr → PCT rule fires. Item C (qty 20K, RED $10, BLUE $9.50): 5% pct, $5K/yr → DOLLAR rule fires. Both carve.",
    related: ["Carve threshold (%)", "Carve threshold ($)", "Carve rule fired"]},
  {term: "Carve threshold (%)", aliases: ["carve_out_min_savings_pct", "carve pct threshold"], category: "Carve-outs",
    definition: "The minimum percent savings (vs the consolidation winner's price) needed to fire a carve-out under the OR-rule. Default 20%. Editable in ⚙ Thresholds.",
    related: ["Carve-out OR-rule", "Carve threshold ($)"]},
  {term: "Carve threshold ($)", aliases: ["carve_out_min_savings_annual_dollar", "carve dollar threshold"], category: "Carve-outs",
    definition: "The minimum annual dollar savings needed to fire a carve-out under the OR-rule. Default $3,000/yr. Editable in ⚙ Thresholds. Annual savings = (winner price − other price) × annual qty (where annual qty = 24-mo qty / 2).",
    related: ["Carve-out OR-rule", "Carve threshold (%)", "Annual qty (run rate)"]},
  {term: "Carve rule fired", aliases: ["carve_rule_fired", "rule fired"], category: "Carve-outs",
    definition: "Per-carve-out, which side of the OR-rule fired: PCT (only the % rule), DOLLAR (only the $/yr rule), or BOTH. Carried in the carve record and shown in tooltips so the analyst can see which threshold justified the carve.",
    example: "ITEM_D (qty 15K, RED $10, BLUE $7): 30% pct AND $22.5K/yr → BOTH. ITEM_C (qty 20K, 5% pct, $5K/yr) → DOLLAR only. ITEM_B (qty 20, 30% pct, $30/yr) → PCT only.",
    related: ["Carve-out OR-rule"]},
  {term: "Suspect carve held", aliases: ["suspect carve", "n_suspect_carves_held", "uom-suspect"], category: "Carve-outs",
    definition: "A carve-out that would have fired BUT the cheaper bid is UOM-suspect (UOM_DISC flagged OR price ratio target/chosen ≥ ~20×, almost certainly per-each-vs-per-package mismatch). The carve is held — the item stays at the consolidation target's price — and the suspect carve is recorded but its 'savings' are NOT counted.",
    example: "Strategy: Consolidate to A. A bids $10. B bids $0.40 with UOM_DISC. The 96% savings would fire BOTH rules — but it's a suspect carve. Item awarded to A at $10. n_suspect_carves_held increments.",
    related: ["UOM_DISC", "UOM suspect ratio", "Carve-out OR-rule"]},
  {term: "UOM suspect ratio", aliases: ["uom_suspect_ratio"], category: "Carve-outs",
    definition: "The price-ratio threshold above which a bid is auto-flagged UOM-suspect even when neither side flags UOM_DISC explicitly. Default 20×. If consolidation_winner_price / cheapest_other ≥ 20, the cheap bid is treated as UOM-suspect.",
    related: ["Suspect carve held", "UOM_DISC"]},

  // ----- Math -----
  {term: "Covered award total", aliases: ["covered_award_total"], category: "Savings math",
    definition: "Total $ awarded across items that received a priced bid. Apples-to-apples — items with no bid don't add zero to this; they're tracked separately as uncovered. Headline 'award total' reads from this field.",
    example: "1,500 items got bids; awarded total = $1,492,226. 8,608 items got no bids — their historical $X is in uncovered_historical_total, NOT in this number.",
    related: ["Covered historical total", "Covered savings", "Uncovered count"]},
  {term: "Covered historical total", aliases: ["covered_historical_total"], category: "Savings math",
    definition: "Historical $ paid for the SAME set of items the strategy awarded. Apples-to-apples baseline — items the strategy couldn't award (no bid available) are excluded so their historical doesn't masquerade as savings.",
    related: ["Covered award total", "Covered savings"]},
  {term: "Covered savings", aliases: ["covered_savings_total", "savings"], category: "Savings math",
    definition: "covered_historical_total − covered_award_total. The truthful savings figure: what you would have paid historically for the items you're now awarding, minus what you're awarding them for. Items with no bid don't inflate this.",
    example: "Awarded $1.49M. Historical for those same items: $2.05M. Covered savings: $556K. Uncovered items (no bid) have $X historical that's reported separately, NOT folded into the $556K.",
    related: ["Covered award total", "Covered historical total", "Cost avoidance vs historical"]},
  {term: "Uncovered count", aliases: ["uncovered_count", "uncovered items"], category: "Savings math",
    definition: "Number of items where NO supplier provided a priced bid under the active strategy. Surfaced as a separate follow-up signal in the headline — not folded into savings.",
    example: "11,169 items in RFQ. 2,561 got at least one priced bid (covered). 8,608 got no priced bid (uncovered). Headline shows '⚠ 8,608 items uncovered (no bid) — $X historical, NOT in savings'.",
    related: ["Uncovered historical", "NONE (coverage)"]},
  {term: "Uncovered historical", aliases: ["uncovered_historical_total"], category: "Savings math",
    definition: "Historical 24-mo spend on items where no supplier bid. Reported as a follow-up signal — these items need a different sourcing path (Round 2, follow-up RFQ, catalog) — but their $ is NOT counted as savings since the strategy isn't actually awarding them.",
    related: ["Uncovered count"]},
  {term: "Cost avoidance vs historical", aliases: ["cost avoidance"], category: "Savings math",
    definition: "covered_savings_total in plain language: what you save vs paying the historical baseline. Used for leadership reporting against budgeted spend. Apples-to-apples — uncovered items are excluded.",
    related: ["Covered savings", "Savings uplift vs auto baseline"]},
  {term: "Savings uplift vs auto baseline", aliases: ["savings vs auto", "savings_vs_auto", "uplift"], category: "Savings math",
    definition: "What manual curation gained vs simply taking the lowest_qualified auto-recommendation. Computed as: auto.covered_award_total − active.covered_award_total. Quantifies the value of the analyst's work specifically (locks, exclusions, scenario picks) vs no-touch.",
    example: "Auto baseline (lowest_qualified): $1,500,000 award total. Active (consolidate_to with 3 manual locks): $1,485,000 → savings uplift $15,000. Even when small, the audit trail of WHY the curation happened is valuable.",
    related: ["Cost avoidance vs historical"]},

  // ----- Per-item modal -----
  {term: "Outlier exclusion", aliases: ["exclusion", "exclude line"], category: "Per-item modal",
    definition: "An analyst-confirmed action to drop a specific PO line from the trend / price math for an item. Untick a row in the modal's Order Lines table — the trend, R², 90-day median, expected-today price, last_unit_price, and qty/spend windows all recompute live on the cleaned set. Persists per item across reloads.",
    example: "An item had 5 historical orders at $1.20-$1.25 and one outlier at $0.05 (typo). Untick the $0.05 row → trend recomputes; last_unit_price drops back to $1.25 (the previous, real, most-recent price).",
    related: ["Item lock", "Reset to auto"]},
  {term: "Item lock", aliases: ["lock", "locked"], category: "Per-item modal",
    definition: "An analyst-confirmed pin: this item's award goes to a specific supplier across every scenario. Applied via the per-bid lock button on the per-item modal. Beats strategy logic; loses only to per-scenario manual overrides. Useful when you've audited a bid and want to ensure no automated 'lowest price' awards override your judgment.",
    example: "Item X has bids A=$0.12 (suspicious typo) and B=$1.20 (sensible). Lock to B. Now every strategy awards X to B regardless of A's $0.12.",
    related: ["Outlier exclusion", "Reset to auto", "Manual (strategy)"]},
  {term: "Follow-up flag", aliases: ["flag for follow-up", "post-award flag"], category: "Per-item modal",
    definition: "A per-item flag the analyst sets when they want to mark an item for post-award double-check (e.g., 'verify with site lead', 'confirm UOM after first PO arrives'). Three states: NEW (no flag) → FLAGGED (with note) → RESOLVED (with resolution note). All flags surface in Decision Summary Tab 6.",
    related: ["Decision Summary"]},
  {term: "UOM annotation", aliases: ["uom resolution"], category: "Per-item modal",
    definition: "An analyst-applied UOM conversion factor for a (item, supplier) pair where their UOM differs from history. Example: history is per-BOX-of-100, supplier is per-EACH; annotation factor=100 means multiply supplier's per-each price by 100 to compare to history. Lives in the UOM Resolution Queue (in the Advanced drawer).",
    related: ["UOM_DISC", "UOM"]},

  // ----- Round 2 / Rn -----
  {term: "Round 2 (Rn)", aliases: ["round 2", "r2", "round n"], category: "Round 2 / Rn",
    definition: "A focused re-RFQ for a small subset of items — typically items where the bid spread suggests the supplier has room to sharpen pencil. Generated via the R2 toolbar in the matrix. Each Round 2 xlsx echoes the supplier's R1 bid + a reference price + a paragraph explaining the request.",
    example: "After R1 you note 8 items where the spread is wide. Tick them in the R2 column → click Generate → you get one R2 xlsx per supplier with just those 8 items. Drop returned R2 xlsx files back into step 4 — they overwrite the R1 prices for re-quoted items only.",
    related: ["Reference price", "PUSH_BACK", "R2 cell badge"]},
  {term: "Reference price", aliases: ["projected price", "trend reference"], category: "Round 2 / Rn",
    definition: "A historical-trend-projected expected price shown in Round 2 RFQ files. Built from cleaned-trend extrapolation. Gives the supplier context for what their bid was vs what history suggests is fair. Includes an explanatory banner so the supplier understands the basis.",
    related: ["Round 2 (Rn)"]},
  {term: "R2 cell badge", aliases: ["r2 badge", "r2 cell"], category: "Round 2 / Rn",
    definition: "A small badge in the matrix on cells where a Round 2 / Rn return overwrote the R1 bid. Shows the % delta vs the prior round (e.g., 'R2 ↓ 5%') with the prior price in the tooltip. Cyan-tinted background + right-edge stripe make these visible at a scan.",
    related: ["Round 2 (Rn)"]},

  // ----- Outputs -----
  {term: "Outbound RFQ", aliases: ["outbound rfq xlsx", "supplier rfq"], category: "Outputs",
    definition: "A per-supplier xlsx file generated from the curated RFQ list. Multi-tab (Cover / Instructions / Items / Quote Terms / etc.). Hidden round-trip identifiers (item_key, rfq_line_id) so returned bids match back to the right line. NO buyer-internal-only fields (no historical paid prices, no internal targets).",
    related: ["Cross-supplier isolation", "Round 2 (Rn)"]},
  {term: "Award letter", aliases: ["award letter xlsx"], category: "Outputs",
    definition: "A per-supplier xlsx confirming the award decision: the supplier's awarded items + their bid + the qty awarded + delivery terms. Strict cross-supplier isolation guard — the export refuses with IsolationViolation if any other supplier's name appears in any cell.",
    related: ["Cross-supplier isolation", "Outbound RFQ"]},
  {term: "Internal summary", aliases: ["internal full-detail", "internal_award_summary"], category: "Outputs",
    definition: "A cross-supplier xlsx with every bid + every decision in one workbook. INTERNAL — NEVER FORWARD banner. For internal review, finance handoff, audit. Never sent to a supplier.",
    related: ["Award letter", "Decision Summary"]},
  {term: "Decision Summary", aliases: ["decision summary xlsx", "legal-hold record"], category: "Outputs",
    definition: "The legal-hold narrative companion to award letters: 7 tabs (Executive_Summary with prose narrative / Settings_Thresholds / Analyst_Actions / System_Flags / CostAvoid_vs_Savings / FollowUp_Items / Decision_Log_Timeline). Captures cost avoidance vs historical AND savings uplift vs auto baseline tracked separately. Retain for legal-hold per company policy.",
    related: ["Cost avoidance vs historical", "Savings uplift vs auto baseline", "Follow-up flag"]},
  {term: "Audit log", aliases: ["audit"], category: "Outputs",
    definition: "Discrete event timeline — every important action (extract, smart trim, threshold change, snapshot save, award letter, exclusion, lock, etc.) is recorded with a timestamp + detail + related identifier. Capped at 500 entries; oldest first dropped. Feeds the Decision Summary Tab 7.",
    related: ["Decision Summary", "Exclusion log"]},
  {term: "Exclusion log", aliases: ["data quality log", "exclusion review"], category: "Outputs",
    definition: "Master data-quality record — every per-item outlier exclusion + UOM annotation + follow-up flag is recorded with the line snapshot + pre-exclusion median/avg of the other priced lines. Cross-app schema (app_source / event_type) so multiple work-apps' logs concatenate into one audit packet.",
    related: ["Outlier exclusion", "Decision Summary"]},

  // ----- Other -----
  {term: "Snapshot", aliases: ["snapshot", "saved scenario", "scenario", "bookmark"], category: "Other",
    definition: "A named save of the current strategy + manual overrides + thresholds, frozen at save time. Used when you want to lock in a specific decision (for award letters / legal-hold) or come back to compare against a different strategy later. Shown as inline pills in the headline card; click for action popover (letters / decision log / delete).",
    example: "After you set Consolidate to Supplier-A, lock 3 items, and apply 2 UOM resolutions, click 📌 Save snapshot → name it 'April Q1 award'. Now you can flip strategies to explore, and the snapshot stays unchanged.",
    related: ["Strategy chip", "Manual (strategy)"]},
  {term: "Reset to auto", aliases: ["reset to auto"], category: "Other",
    definition: "Clears every analyst-applied manual override: item_locks, item_exclusions, uom_annotations. Recomputes affected aggregates so last_unit_price / qty windows / KPIs return to their raw-historical values. Audit-logged. Confirms before applying.",
    related: ["Item lock", "Outlier exclusion", "UOM annotation"]},
  {term: "FOCUSED filter", aliases: ["focused"], category: "Other",
    definition: "A click-to-filter state on the comparison matrix where the matrix narrows to one supplier's bids. Triggered by clicking a consolidation candidate row OR a supplier intake card. The 'FOCUSED ✕' inline button on the row clears focus.",
    related: ["Consolidate to (strategy)"]},
  {term: "Cross-supplier isolation", aliases: ["isolation", "isolation guard", "isolationviolation"], category: "Other",
    definition: "A defensive cell-level scan applied to every supplier-bound xlsx export (outbound RFQ, award letter, follow-up). The exporter refuses with IsolationViolation if any cell contains a foreign supplier's name. Internal-audience files (banner contains 'INTERNAL — NEVER FORWARD' or filename starts with INTERNAL) are auto-skipped.",
    example: "Generating an award letter for Supplier-A. The scanner finds 'Supplier-B' in a freeform notes cell. IsolationViolation raised; export refused; analyst clears the cell and retries.",
    related: ["Outbound RFQ", "Award letter", "Internal summary"]},
  {term: "Manual override", aliases: ["override", "scenario override"], category: "Other",
    definition: "A per-item, per-scenario explicit award decision. Beats strategy logic; beats item locks. Applied via the scenario evaluator's 'overrides' parameter or via the per-item modal's explicit-award control.",
    related: ["Item lock", "Manual (strategy)"]},
  {term: "Verify isolation (script)", aliases: ["verify_isolation"], category: "Other",
    definition: "Sibling Python script that walks a folder of award letter xlsx files and flags any cell containing a foreign supplier name. Independent third-party check on the runtime IsolationViolation guard.",
    related: ["Cross-supplier isolation"]},
];

let _glossarySearchState = {
  query: "",
  matches: [],   // array of glossary indices that match the current query
  cursor: 0,     // index into matches[] for the "current" match
};

function _renderGlossary() {
  const body = document.getElementById('glossary-body');
  if (!body) return;
  const byCategory = {};
  const categoryOrder = [];
  _GLOSSARY.forEach((g, idx) => {
    if (!byCategory[g.category]) {
      byCategory[g.category] = [];
      categoryOrder.push(g.category);
    }
    byCategory[g.category].push({...g, _idx: idx});
  });
  let html = '';
  for (const cat of categoryOrder) {
    html += `<div class="glossary-category">${_escapeHtml(cat)}</div>`;
    for (const g of byCategory[cat]) {
      const aliasTxt = (g.aliases && g.aliases.length)
        ? `<span class="glossary-aliases">aka ${g.aliases.map(_escapeHtml).join(' · ')}</span>` : '';
      const exampleHtml = g.example ? `<div class="glossary-example">${_escapeHtml(g.example)}</div>` : '';
      const relatedHtml = (g.related && g.related.length)
        ? `<div class="glossary-related">Related: ${g.related.map(r => `<a data-glossary-link="${_escapeHtml(r)}">${_escapeHtml(r)}</a>`).join('')}</div>`
        : '';
      html += `<div class="glossary-entry" data-glossary-idx="${g._idx}" id="glossary-entry-${g._idx}">
        <div class="glossary-term">${_escapeHtml(g.term)}${aliasTxt}</div>
        <div class="glossary-def">${_escapeHtml(g.definition)}</div>
        ${exampleHtml}
        ${relatedHtml}
      </div>`;
    }
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-glossary-link]').forEach(a => {
    a.addEventListener('click', () => {
      const target = a.getAttribute('data-glossary-link');
      const input = document.getElementById('glossary-search-input');
      if (input) { input.value = target; input.focus(); _filterGlossary(target); }
    });
  });
}

function _filterGlossary(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  _glossarySearchState.query = q;
  const matches = [];
  if (q) {
    _GLOSSARY.forEach((g, idx) => {
      const haystack = [
        g.term,
        ...(g.aliases || []),
        g.definition,
        g.example || '',
        ...(g.related || []),
      ].join(' ').toLowerCase();
      if (haystack.includes(q)) matches.push(idx);
    });
  }
  _glossarySearchState.matches = matches;
  _glossarySearchState.cursor = matches.length ? 0 : -1;
  const body = document.getElementById('glossary-body');
  if (!body) return;
  if (!q) {
    body.querySelectorAll('.glossary-entry').forEach(el => {
      el.classList.remove('is-hidden', 'is-current-match');
      _restoreOriginalText(el);
    });
    body.querySelectorAll('.glossary-category').forEach(el => el.classList.remove('is-hidden'));
    document.getElementById('glossary-match-count').textContent = '';
    _setNavBtnsEnabled(false);
    _ensureNoEmpty(body, false);
    return;
  }
  const matchSet = new Set(matches);
  body.querySelectorAll('.glossary-entry').forEach(el => {
    const idx = parseInt(el.getAttribute('data-glossary-idx'), 10);
    if (matchSet.has(idx)) {
      el.classList.remove('is-hidden');
      _highlightMatchesInEntry(el, q);
    } else {
      el.classList.add('is-hidden');
      _restoreOriginalText(el);
    }
    el.classList.remove('is-current-match');
  });
  body.querySelectorAll('.glossary-category').forEach((cat) => {
    let next = cat.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains('glossary-category')) {
      if (next.classList.contains('glossary-entry') && !next.classList.contains('is-hidden')) {
        anyVisible = true; break;
      }
      next = next.nextElementSibling;
    }
    cat.classList.toggle('is-hidden', !anyVisible);
  });
  document.getElementById('glossary-match-count').textContent = matches.length
    ? `${_glossarySearchState.cursor + 1}/${matches.length}` : '0';
  _setNavBtnsEnabled(matches.length > 1);
  _ensureNoEmpty(body, matches.length === 0);
  if (matches.length) _focusGlossaryMatch(0);
}

function _highlightMatchesInEntry(el, q) {
  _restoreOriginalText(el);
  const fields = ['.glossary-term', '.glossary-def', '.glossary-example', '.glossary-aliases'];
  for (const sel of fields) {
    const node = el.querySelector(sel);
    if (!node) continue;
    if (!node.dataset.origHtml) node.dataset.origHtml = node.innerHTML;
    const txt = node.dataset.origHtml;
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${safeQ})`, 'gi');
    const parts = txt.split(/(<[^>]+>)/g);
    const replaced = parts.map(p => p.startsWith('<') ? p : p.replace(re, '<span class="glossary-hit">$1</span>'));
    node.innerHTML = replaced.join('');
  }
}
function _restoreOriginalText(el) {
  el.querySelectorAll('[data-orig-html]').forEach(n => {
    n.innerHTML = n.dataset.origHtml || n.innerHTML;
    delete n.dataset.origHtml;
  });
}
function _setNavBtnsEnabled(enabled) {
  const prev = document.getElementById('glossary-prev');
  const next = document.getElementById('glossary-next');
  if (prev) prev.disabled = !enabled;
  if (next) next.disabled = !enabled;
}
function _ensureNoEmpty(body, isEmpty) {
  let empty = body.querySelector('.glossary-empty');
  if (isEmpty) {
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'glossary-empty';
      empty.textContent = 'No matches. Try a partial term or a synonym — every entry searches term + aliases + definition + example.';
      body.appendChild(empty);
    }
  } else if (empty) {
    empty.remove();
  }
}
function _focusGlossaryMatch(cursor) {
  const matches = _glossarySearchState.matches;
  if (!matches.length) return;
  if (cursor < 0) cursor = matches.length - 1;
  if (cursor >= matches.length) cursor = 0;
  _glossarySearchState.cursor = cursor;
  const idx = matches[cursor];
  const body = document.getElementById('glossary-body');
  body.querySelectorAll('.glossary-entry.is-current-match').forEach(el => el.classList.remove('is-current-match'));
  const target = document.getElementById(`glossary-entry-${idx}`);
  if (target) {
    target.classList.add('is-current-match');
    target.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  document.getElementById('glossary-match-count').textContent = `${cursor + 1}/${matches.length}`;
}

function _openGlossary() {
  const modal = document.getElementById('glossary-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  const body = document.getElementById('glossary-body');
  if (body && !body.children.length) _renderGlossary();
  const input = document.getElementById('glossary-search-input');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
  _filterGlossary('');
}
function _closeGlossary() {
  const modal = document.getElementById('glossary-modal');
  if (modal) modal.classList.remove('is-open');
}

(function _wireGlossary() {
  const btn = document.getElementById('open-glossary');
  if (btn) btn.addEventListener('click', _openGlossary);
  const closeBtn = document.getElementById('glossary-close');
  if (closeBtn) closeBtn.addEventListener('click', _closeGlossary);
  const modal = document.getElementById('glossary-modal');
  if (modal) modal.addEventListener('click', (ev) => {
    if (ev.target === modal) _closeGlossary();
  });
  const input = document.getElementById('glossary-search-input');
  if (input) {
    input.addEventListener('input', (ev) => _filterGlossary(ev.target.value));
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && _glossarySearchState.matches.length) {
        ev.preventDefault();
        if (ev.shiftKey) _focusGlossaryMatch(_glossarySearchState.cursor - 1);
        else _focusGlossaryMatch(_glossarySearchState.cursor + 1);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        _closeGlossary();
      }
    });
  }
  const prev = document.getElementById('glossary-prev');
  const next = document.getElementById('glossary-next');
  if (prev) prev.addEventListener('click', () => _focusGlossaryMatch(_glossarySearchState.cursor - 1));
  if (next) next.addEventListener('click', () => _focusGlossaryMatch(_glossarySearchState.cursor + 1));
  document.addEventListener('keydown', (ev) => {
    const m = document.getElementById('glossary-modal');
    if (m && m.classList.contains('is-open') && ev.key === 'Escape') _closeGlossary();
  });
})();

// ==========================================================================
// Item search modal — searchable view of the FULL extracted item list,
// including items filtered out of the RFQ via Smart Trim or untick. Each
// result row opens the per-item chart modal; the "All fields" button shows
// every column from the most-recent PO line for that item.
// ==========================================================================

let _itemSearchDebounce = null;
async function _runItemSearch(query) {
  if (!_pyAppLoaded || !_py) return;
  const body = document.getElementById('item-search-body');
  const status = document.getElementById('item-search-status');
  if (!body) return;
  body.innerHTML = '<div class="glossary-empty">Searching…</div>';
  try {
    _py.globals.set('_search_q_in', query || '');
    const out = await _py.runPythonAsync(`
import json
from app_engine import find_items
json.dumps(find_items(_search_q_in, limit=100), default=str)
`);
    const results = JSON.parse(out);
    if (status) status.textContent = `${results.length}${results.length === 100 ? '+' : ''} match${results.length === 1 ? '' : 'es'}`;
    if (!results.length) {
      body.innerHTML = '<div class="glossary-empty">No items match. Try a different term, partial item #, or part of the description.</div>';
      return;
    }
    const fmt$ = (n) => n == null ? '—' : '$' + Math.round(n).toLocaleString();
    const fmtP = (n) => n == null ? '—' : '$' + Number(n).toFixed(2);
    let html = '';
    if (!query) html += '<div class="glossary-empty" style="padding:14px 20px;text-align:left;">Top 100 items by 24-mo spend. Type to filter.</div>';
    for (const r of results) {
      const tier = r.tier || 'SKIP';
      const tierClass = `item-search-tier-${tier}`;
      const inLbl = r.included ? 'IN RFQ' : 'OUT';
      const inClass = r.included ? 'is-in' : 'is-out';
      const subParts = [r.item_num, r.mfg_name, r.mfg_pn].filter(Boolean).join(' · ');
      html += `<div class="item-search-result" data-search-item="${_escapeHtml(r.item_num)}">
        <div class="item-search-result-desc">${_escapeHtml(r.description || '(no description)')}<small>${_escapeHtml(subParts)}</small></div>
        <div class="item-search-tier ${tierClass}" title="Tier (score). WEAK/SKIP items are typically dropped from RFQs.">${tier}</div>
        <div class="item-search-included ${inClass}" title="${r.included ? 'Currently included in the RFQ list (ticked).' : 'Currently NOT included in the RFQ list (unticked or dropped via Smart Trim).'}">${inLbl}</div>
        <div class="item-search-num" title="24-mo qty / 24-mo spend">${(r.qty_24mo||0).toLocaleString()}<br><small style="color:var(--ink-2);">${fmt$(r.spend_24mo)}</small></div>
        <div class="item-search-num" title="Last unit price · Last order date">${fmtP(r.last_unit_price)}<br><small style="color:var(--ink-2);">${_escapeHtml(r.last_order || '—')}</small></div>
        <div class="item-search-actions">
          <button data-search-action="chart" data-search-item="${_escapeHtml(r.item_num)}" title="Open the per-item history modal — chart, order lines, supplier-bid overlays, lock/exclusion controls.">CHART</button>
          ${r.has_all_columns ? `<button data-search-action="fields" data-search-item="${_escapeHtml(r.item_num)}" title="Show every column from the most-recent PO line — including columns not imported for RFQ (requestor, site, cost-center, address, etc.).">ALL FIELDS</button>` : ''}
        </div>
      </div>`;
    }
    body.innerHTML = html;
    // Wire row click → CHART action; wire button clicks separately (stop propagation)
    body.querySelectorAll('.item-search-result').forEach(row => {
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('button')) return;
        const num = row.getAttribute('data-search-item');
        _closeItemSearch();
        _openItemHistory(num);
      });
    });
    body.querySelectorAll('[data-search-action]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const action = btn.getAttribute('data-search-action');
        const num = btn.getAttribute('data-search-item');
        if (action === 'chart') {
          _closeItemSearch();
          _openItemHistory(num);
        } else if (action === 'fields') {
          _openAllFieldsPopup(num);
        }
      });
    });
  } catch (err) {
    body.innerHTML = `<div class="glossary-empty">Search failed: ${_escapeHtml(err.message || String(err))}</div>`;
  }
}

function _openItemSearch() {
  if (!_pyAppLoaded) { alert('Drop a multi-year supplier export first (step 1) so there are items to search.'); return; }
  const modal = document.getElementById('item-search-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  const input = document.getElementById('item-search-input');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
  _runItemSearch('');   // empty query → top-N by spend
}
function _closeItemSearch() {
  const modal = document.getElementById('item-search-modal');
  if (modal) modal.classList.remove('is-open');
}

async function _openAllFieldsPopup(itemNum) {
  if (!_pyAppLoaded || !_py) return;
  const modal = document.getElementById('all-fields-modal');
  const body = document.getElementById('all-fields-body');
  const subtitle = document.getElementById('all-fields-subtitle');
  if (!modal || !body) return;
  body.innerHTML = '<div class="glossary-empty">Loading…</div>';
  modal.classList.add('is-open');
  try {
    _py.globals.set('_field_item_in', itemNum);
    const out = await _py.runPythonAsync(`
import json
from app_engine import get_item_all_columns
json.dumps(get_item_all_columns(_field_item_in), default=str)
`);
    const data = JSON.parse(out);
    if (subtitle) subtitle.textContent = `${data.item_num || '—'} · last order ${data.last_order || '—'}`;
    const cols = data.all_columns || {};
    const keys = Object.keys(cols).sort();
    if (!keys.length) {
      body.innerHTML = '<div class="glossary-empty">No source columns retained for this item. (Older imports — re-extract the source workbook to capture all columns.)</div>';
      return;
    }
    let html = `<div style="margin-bottom:10px;color:var(--ink-2);font-family:var(--mono);font-size:11px;">${_escapeHtml(data.description || '')}</div>`;
    html += keys.map(k => `<div class="all-fields-row"><div class="all-fields-key">${_escapeHtml(k)}</div><div class="all-fields-val">${_escapeHtml(cols[k] == null ? '' : String(cols[k]))}</div></div>`).join('');
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div class="glossary-empty">All-fields lookup failed: ${_escapeHtml(err.message || String(err))}</div>`;
  }
}
function _closeAllFieldsPopup() {
  const modal = document.getElementById('all-fields-modal');
  if (modal) modal.classList.remove('is-open');
}

(function _wireItemSearch() {
  const btn = document.getElementById('open-item-search');
  if (btn) btn.addEventListener('click', _openItemSearch);
  const closeBtn = document.getElementById('item-search-close');
  if (closeBtn) closeBtn.addEventListener('click', _closeItemSearch);
  const modal = document.getElementById('item-search-modal');
  if (modal) modal.addEventListener('click', (ev) => {
    if (ev.target === modal) _closeItemSearch();
  });
  const input = document.getElementById('item-search-input');
  if (input) {
    input.addEventListener('input', (ev) => {
      const q = ev.target.value;
      clearTimeout(_itemSearchDebounce);
      _itemSearchDebounce = setTimeout(() => _runItemSearch(q), 150);
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); _closeItemSearch(); }
    });
  }
  const afClose = document.getElementById('all-fields-close');
  if (afClose) afClose.addEventListener('click', _closeAllFieldsPopup);
  const afModal = document.getElementById('all-fields-modal');
  if (afModal) afModal.addEventListener('click', (ev) => {
    if (ev.target === afModal) _closeAllFieldsPopup();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const af = document.getElementById('all-fields-modal');
    if (af && af.classList.contains('is-open')) { _closeAllFieldsPopup(); return; }
    const is = document.getElementById('item-search-modal');
    if (is && is.classList.contains('is-open')) { _closeItemSearch(); }
  });
})();

// ==========================================================================
// Last-uploaded-file persistence — IndexedDB-backed.
//
// Each dropzone (multi-year export, returned bid xlsx, etc.) stores
// {filename, blob, savedAt, dropzoneId} keyed by dropzoneId. On page load,
// each dropzone shows an inline "Last loaded: <filename> (Xm ago) · Re-use"
// affordance. Click → loads from IndexedDB without re-picking from disk.
//
// Storing the file binary (not just metadata) means re-load is one click,
// across browser sessions, with no system file-picker round-trip. Files are
// already chunked / streamed by the browser; ~10-50MB MRO exports fit well.
// ==========================================================================

const _LAST_FILE_DB = 'auto_rfq_last_files';
const _LAST_FILE_STORE = 'files';
let _lastFileDbInstance = null;

function _lastFileDb() {
  if (_lastFileDbInstance) return Promise.resolve(_lastFileDbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_LAST_FILE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(_LAST_FILE_STORE)) {
        db.createObjectStore(_LAST_FILE_STORE, {keyPath: 'dropzoneId'});
      }
    };
    req.onsuccess = () => { _lastFileDbInstance = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

async function _saveLastFile(dropzoneId, file) {
  if (!file || !dropzoneId) return;
  try {
    const db = await _lastFileDb();
    const tx = db.transaction(_LAST_FILE_STORE, 'readwrite');
    tx.objectStore(_LAST_FILE_STORE).put({
      dropzoneId,
      filename: file.name,
      blob: file,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[last-file] save failed', err);
  }
}

async function _loadLastFile(dropzoneId) {
  try {
    const db = await _lastFileDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(_LAST_FILE_STORE, 'readonly');
      const req = tx.objectStore(_LAST_FILE_STORE).get(dropzoneId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

function _formatTimeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function _renderLastFileBadge(dropzoneEl, dropzoneId, onReuse) {
  if (!dropzoneEl || !dropzoneId) return;
  const rec = await _loadLastFile(dropzoneId);
  // Remove any prior badge
  const prior = dropzoneEl.querySelector('.dropzone-last-loaded');
  if (prior) prior.remove();
  if (!rec || !rec.blob) return;
  const badge = document.createElement('div');
  badge.className = 'dropzone-last-loaded';
  badge.innerHTML = `<span title="Last file loaded into this dropzone, persisted across browser sessions. Click Re-use to load again without picking from disk.">↻ Last: <b style="color:var(--ink-0);">${_escapeHtml(rec.filename)}</b> · ${_escapeHtml(_formatTimeAgo(rec.savedAt))}</span>
    <button class="reload-btn" type="button" title="Reload this file from local browser storage. No system file-picker round-trip.">RE-USE</button>`;
  badge.querySelector('.reload-btn').addEventListener('click', async (ev) => {
    ev.stopPropagation();
    if (typeof onReuse === 'function') {
      try { await onReuse(rec.blob, rec.filename); } catch (err) { console.error('[last-file reuse]', err); }
    }
  });
  // Insert AFTER the dropzone-file area (or just append) — visual position
  // below the dropzone's own status text.
  dropzoneEl.appendChild(badge);
}

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
