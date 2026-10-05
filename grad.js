/* ================= Gradation + Bitumen Extraction (din-wise lab sheet) =================
   Jis din jo mix nikla uske hisaab se sheet banti hai. Tum sirf wazan (g) bharte ho —
   % retained, cumulative, % passing, limit se PASS/FAIL aur bitumen % app nikalta hai. Wazan app khud nahi banata. */
const GR_DEF = {
  BSG: { sv: '53:100-100, 26.5:75-100, 22.4:50-85, 13.2:20-40, 5.6:5-20, 2.8:0-5', pan: 1, ext: 0, mode: 'range', tol: 0.3, mat: '32-40 mm:75, 20 mm:15, 10 mm:10', title: 'SIEVE ANALYSIS / GRADATION TEST OF AGGREGATE FOR BUILT-UP SPRAY GROUT (BSG)' },
  BM: { sv: '26.5:100-100, 19:90-100, 13.2:56-88, 4.75:16-36, 2.36:4-19, 0.3:2-10, 0.075:0-8', pan: 0, ext: 1, mode: 'min', tol: 0.3, mat: '20 mm:35, 10 mm:40, 6 mm:15, Dust:10', title: 'GRADATION FOR BITUMINOUS MACADAM (BM)' },
  SDBC: { sv: '13.2:100-100, 9.5:90-100, 4.75:35-51, 2.36:24-39, 1.18:15-30, 0.3:9-19, 0.075:3-8', pan: 0, ext: 1, mode: 'range', tol: 0.3, mat: '10 mm:30, 6 mm:35, Stone Dust:35', title: 'GRADATION FOR SEMI DENSE BITUMINOUS CONCRETE (SDBC)' },
  X: { sv: '', pan: 0, ext: 1, mode: 'range', tol: 0.3, mat: '', title: '' },
};
function grDB() { if (!DB.grad) DB.grad = { tpl: {}, days: {} }; DB.grad.tpl = DB.grad.tpl || {}; DB.grad.days = DB.grad.days || {}; return DB.grad; }
function grTpl(it) {
  const g = grDB(); if (g.tpl[it.code]) return g.tpl[it.code];
  const n = (it.name || '').toUpperCase(), k = /BSG|BUSG/.test(n) ? 'BSG' : /SDBC/.test(n) ? 'SDBC' : /BM/.test(n) && !/DBM/.test(n) ? 'BM' : 'X';
  return { ...GR_DEF[k], title: GR_DEF[k].title || `GRADATION FOR ${n}` };
}
function grSieves(t) { return String(t.sv || '').split(',').map(x => x.trim().match(/^([\d.]+)\s*:\s*([\d.]+)\s*-\s*([\d.]+)$/)).filter(Boolean).map(m => ({ s: +m[1], lo: +m[2], hi: +m[3] })); }
// din + item ke hisse (register se)
function grParts() {
  const m = {};
  DB.runs.forEach(r => { const k = r.date + '|' + r.item, p = m[k] = m[k] || { key: k, date: r.date, item: r.item, T: 0 }; p.T += regTotal(r); });
  return Object.values(m).filter(p => DB.items.some(i => i.code == p.item)).sort((a, b) => a.key.localeCompare(b.key))
    .map(p => ({ ...p, it: DB.items.find(i => i.code == p.item), need: Math.max(2, Math.ceil(p.T / 400 - 1e-9)) }));
}
function grDay(p) { const g = grDB(), d = g.days[p.key] = g.days[p.key] || { g: [], x: [], loc: '' }; d.g = d.g || []; d.x = d.x || []; return d; }
const grN = (p, d, kind) => Math.max(d[kind === 'g' ? 'ng' : 'nx'] || p.need, 1);
const grNum = v => v === '' || v == null || isNaN(+v) ? null : +v;
// gradation ka hisaab — total = sab sieve + pan ka jod
function grCalc(t, s) {
  const sv = grSieves(t), w = sv.map((_, i) => grNum((s.w || [])[i])), pan = t.pan ? grNum(s.pan) : null;
  const any = w.some(v => v != null) || pan != null, tot = w.reduce((a, v) => a + (v || 0), 0) + (pan || 0);
  let cum = 0; const rows = sv.map((x, i) => { if (!tot) return { ...x, ret: null, cum: null, pass: null, ok: null };
    const ret = (w[i] || 0) / tot * 100; cum += ret; const pass = 100 - cum, r2 = Math.round(pass * 100) / 100;
    return { ...x, ret, cum, pass, ok: r2 >= x.lo && r2 <= x.hi }; });
  return { rows, tot, any, done: any && tot > 0, ok: tot > 0 && rows.every(r => r.ok) };
}
function grExt(t, it, x) {
  const W1 = grNum(x.W1), W2 = grNum(x.W2), W3 = grNum(x.W3), W4 = grNum(x.W4), spec = +it.pct || 0, tol = +t.tol || 0;
  const W5 = W2 != null && W3 != null ? W3 - W2 : null, W6 = W4 != null && W5 != null ? W4 + W5 : null, W7 = W1 != null && W6 != null ? W1 - W6 : null;
  const bc = W7 != null && W1 > 0 ? W7 / W1 * 100 : null, b2 = bc == null ? null : Math.round(bc * 100) / 100;
  const ok = b2 == null ? null : t.mode === 'min' ? b2 >= spec - tol - 1e-9 : (b2 >= spec - tol - 1e-9 && b2 <= spec + tol + 1e-9);
  return { W5, W6, W7, bc, spec, tol, ok };
}
function grStatus(p) {
  const t = grTpl(p.it), d = grDay(p); let done = 0, fail = 0, need = 0;
  for (let i = 0; i < grN(p, d, 'g'); i++) { need++; const c = grCalc(t, d.g[i] || {}); if (c.done) { done++; if (!c.ok) fail++; } }
  if (t.ext) for (let i = 0; i < grN(p, d, 'x'); i++) { need++; const c = grExt(t, p.it, d.x[i] || {}); if (c.ok != null) { done++; if (!c.ok) fail++; } }
  return { done, fail, need };
}
const g2 = v => v == null ? '' : (Math.round(v * 100) / 100).toFixed(2);
const PF = ok => ok == null ? '' : ok ? '<b style="color:var(--ok)">PASS</b>' : '<b style="color:var(--bad)">FAIL</b>';
let GR_SEL = '';
function renderGrad() {
  const box = $('#grBox'); if (!box) return;
  const P = grParts(), dates = [...new Set(P.map(p => p.date))];
  if (!dates.length) { box.innerHTML = '<p class="muted">Pehle Plant Register mein register banao — phir yahan har din ki gradation / extraction sheet aayegi.</p>'; $('#grDates').innerHTML = ''; $('#grTpl').innerHTML = ''; return; }
  if (!dates.includes(GR_SEL)) GR_SEL = dates[dates.length - 1];
  $('#grDates').innerHTML = `<div class="tablewrap"><table class="grid"><thead><tr><th>Tarikh</th><th>Mix</th><th>Mix (MT)</th><th>Test bhare</th><th>Result</th></tr></thead><tbody>` +
    P.map(p => { const s = grStatus(p); return `<tr style="cursor:pointer;${p.date === GR_SEL ? 'background:var(--chip)' : ''}" data-grsel="${p.date}"><td data-grsel="${p.date}">${dmy(p.date)}</td><td data-grsel="${p.date}">${esc(p.it.name)}</td><td>${f2(p.T)}</td>
      <td>${s.done} / ${s.need}</td><td>${s.fail ? `<span class="flag">⚠ ${s.fail} FAIL</span>` : s.done === s.need ? '✅ PASS' : s.done ? 'adhura' : '<span class="muted">khali</span>'}</td></tr>`; }).join('') + '</tbody></table></div>';
  box.innerHTML = `<h3>${dmy(GR_SEL)} ki sheet</h3>` + P.filter(p => p.date === GR_SEL).map(grPartHtml).join('');
  $('#grTpl').innerHTML = `<thead><tr><th>Item</th><th>Sieve (mm) : lower-upper % passing</th><th>Pan</th><th>Extraction</th><th>Bitumen pass</th><th>Tolerance ±</th><th>Material %</th></tr></thead><tbody>` +
    DB.items.map(it => { const t = grTpl(it), a = `data-grt="${esc(it.code)}"`; return `<tr><td>${esc(it.name)}<br><span class="muted">${it.pct}%</span></td>
      <td><textarea ${a} data-f="sv" rows="2" style="width:420px">${esc(t.sv)}</textarea></td>
      <td><input type="checkbox" ${a} data-f="pan" ${t.pan ? 'checked' : ''} style="width:auto"></td><td><input type="checkbox" ${a} data-f="ext" ${t.ext ? 'checked' : ''} style="width:auto"></td>
      <td><select ${a} data-f="mode" style="width:150px"><option value="range" ${t.mode === 'range' ? 'selected' : ''}>spec ± tolerance</option><option value="min" ${t.mode === 'min' ? 'selected' : ''}>kam se kam (spec − tol)</option></select></td>
      <td><input type="number" step="0.1" ${a} data-f="tol" value="${t.tol}" style="width:60px"></td><td><input ${a} data-f="mat" value="${esc(t.mat)}" style="width:240px"></td></tr>`; }).join('') + '</tbody>';
}
function grPartHtml(p) {
  const t = grTpl(p.it), d = grDay(p), sv = grSieves(t), ng = grN(p, d, 'g'), nx = grN(p, d, 'x');
  if (!sv.length) return `<div class="dayblock"><b>${esc(p.it.name)}</b> — <span class="flag">is mix ki sieve / limit neeche "Sieve aur limit" mein bharo</span></div>`;
  let h = `<div class="dayblock"><div class="row"><b style="font-size:15px">${esc(p.it.name)}</b> <span class="pill">${f2(p.T)} MT</span> <span class="muted">kam se kam ${p.need} gradation${t.ext ? ' + ' + p.need + ' extraction' : ''} (1 per 400 T, min 2 roz)</span>
    <label style="flex-direction:row;align-items:center;gap:6px">Chainage / location <input data-grloc="${p.key}" value="${esc(d.loc || '')}" style="width:160px"></label></div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">`;
  for (let n = 0; n < ng; n++) { const s = d.g[n] || {}, c = grCalc(t, s);
    h += `<div data-grb="${p.key}|g|${n}"><div style="font-weight:600;margin:6px 0 2px">Gradation – Sample ${n + 1} <span data-o="ov">${c.done ? PF(c.ok) : ''}</span></div>
      <table class="grid" style="width:auto"><thead><tr><th>IS Sieve (mm)</th><th>Wt. retained (g)</th><th>% Ret.</th><th>Cum. % Ret.</th><th>% Passing</th><th>Limit</th><th>Result</th></tr></thead><tbody>` +
      c.rows.map((r, i) => `<tr><td>${r.s}</td><td><input type="number" step="any" data-grw="${i}" value="${(s.w || [])[i] ?? ''}" style="width:86px"></td><td data-o="r${i}">${g2(r.ret)}</td><td data-o="c${i}">${g2(r.cum)}</td><td data-o="p${i}"><b>${g2(r.pass)}</b></td><td>${r.lo} – ${r.hi}</td><td data-o="k${i}">${c.done ? PF(r.ok) : ''}</td></tr>`).join('') +
      (t.pan ? `<tr><td>Pan</td><td><input type="number" step="any" data-grw="pan" value="${s.pan ?? ''}" style="width:86px"></td><td colspan="5"></td></tr>` : '') +
      `<tr><th>Total</th><th data-o="tot">${c.tot ? g2(c.tot) : ''}</th><th colspan="5"></th></tr></tbody></table></div>`; }
  h += `</div><div class="row no-print"><button class="btn sm" data-gradd="${p.key}|g">+ Gradation sample</button>${ng > 1 ? `<button class="btn sm danger" data-grdel="${p.key}|g">− aakhri hatao</button>` : ''}</div>`;
  if (t.ext) { const X = [...Array(nx)].map((_, n) => d.x[n] || {}), C = X.map(x => grExt(t, p.it, x));
    const inp = f => X.map((x, n) => `<td><input type="number" step="any" data-grx="${f}" data-n="${n}" value="${x[f] ?? ''}" style="width:86px"></td>`).join('');
    const out = (f, fn) => C.map((c, n) => `<td data-o="${f}${n}">${fn(c)}</td>`).join('');
    h += `<div data-grb="${p.key}|x"><div style="font-weight:600;margin:10px 0 2px">Bitumen Extraction (Centrifuge method)</div>
      <table class="grid" style="width:auto"><thead><tr><th>Particulars</th><th>Unit</th>${X.map((_, n) => `<th>Sample ${n + 1}</th>`).join('')}</tr></thead><tbody>
      <tr><td class="l">Wt. of mix sample before extraction (W1)</td><td>g</td>${inp('W1')}</tr>
      <tr><td class="l">Wt. of filter paper before test (W2)</td><td>g</td>${inp('W2')}</tr>
      <tr><td class="l">Wt. of filter paper after test (W3)</td><td>g</td>${inp('W3')}</tr>
      <tr><td class="l">Wt. of aggregate after extraction (W4)</td><td>g</td>${inp('W4')}</tr>
      <tr><td class="l">Wt. of fines in filter paper (W5 = W3 − W2)</td><td>g</td>${out('W5', c => g2(c.W5))}</tr>
      <tr><td class="l">Total wt. of aggregate (W6 = W4 + W5)</td><td>g</td>${out('W6', c => g2(c.W6))}</tr>
      <tr><td class="l">Wt. of bitumen (W7 = W1 − W6)</td><td>g</td>${out('W7', c => g2(c.W7))}</tr>
      <tr><td class="l"><b>Bitumen content (W7 / W1 × 100)</b></td><td>%</td>${out('bc', c => `<b>${g2(c.bc)}</b>`)}</tr>
      <tr><td class="l">Specified bitumen content ${t.mode === 'min' ? '(min.)' : ''}</td><td>%</td>${C.map(c => `<td>${c.spec}</td>`).join('')}</tr>
      <tr><td class="l">Permissible tolerance (±)</td><td>%</td>${C.map(c => `<td>${c.tol}</td>`).join('')}</tr>
      <tr><td class="l"><b>Result</b></td><td>–</td>${out('ok', c => PF(c.ok))}</tr></tbody></table>
      <div class="row no-print"><button class="btn sm" data-gradd="${p.key}|x">+ Extraction sample</button>${nx > 1 ? `<button class="btn sm danger" data-grdel="${p.key}|x">− aakhri hatao</button>` : ''}</div></div>`; }
  return h + '</div>';
}
const grPart = key => grParts().find(p => p.key === key);
// wazan bharte hi usi table ke hisaab wale khane badlo (poora dobara nahi banate, taaki Tab chalta rahe)
document.addEventListener('input', e => {
  const d = e.target.dataset; if (!d || (d.grw == null && d.grx == null)) return;
  const blk = e.target.closest('[data-grb]'); if (!blk) return; const [date, item, kind, n] = blk.dataset.grb.split('|'), p = grPart(date + '|' + item); if (!p) return;
  const t = grTpl(p.it), day = grDay(p), set = (k, html) => { const c = blk.querySelector(`[data-o="${k}"]`); if (c) c.innerHTML = html; };
  if (kind === 'g') { const s = day.g[+n] = day.g[+n] || { w: [] }; s.w = s.w || [];
    if (d.grw === 'pan') s.pan = e.target.value; else s.w[+d.grw] = e.target.value;
    const c = grCalc(t, s); c.rows.forEach((r, i) => { set('r' + i, g2(r.ret)); set('c' + i, g2(r.cum)); set('p' + i, `<b>${g2(r.pass)}</b>`); set('k' + i, c.done ? PF(r.ok) : ''); });
    set('tot', c.tot ? g2(c.tot) : ''); set('ov', c.done ? PF(c.ok) : '');
  } else { const x = day.x[+d.n] = day.x[+d.n] || {}; x[d.grx] = e.target.value; const c = grExt(t, p.it, x);
    ['W5', 'W6', 'W7'].forEach(f => set(f + d.n, g2(c[f]))); set('bc' + d.n, `<b>${g2(c.bc)}</b>`); set('ok' + d.n, PF(c.ok)); }
  clearTimeout(grDB._t); grDB._t = setTimeout(save, 400);
});
document.addEventListener('change', e => {
  const d = e.target.dataset; if (!d) return;
  if (d.grw != null || d.grx != null) { save(); return grListOnly(); }
  if (d.grloc) { const p = grPart(d.grloc); if (p) { grDay(p).loc = e.target.value.trim(); save(); } return; }
  if (d.grt != null) { const it = DB.items.find(i => i.code == d.grt); if (!it) return; const g = grDB(), t = g.tpl[it.code] = { ...grTpl(it) };
    t[d.f] = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : d.f === 'tol' ? +e.target.value || 0 : e.target.value.trim();
    if (d.f === 'sv' && !grSieves(t).length) toast('Aise likho: 26.5:100-100, 19:90-100, …'); save(); renderGrad(); }
});
function grListOnly() {   // upar wali tarikh-list ka status taaza karo (sheet ko chhede bina)
  const P = grParts(); $$('#grDates tbody tr').forEach((tr, i) => { const p = P[i]; if (!p) return; const s = grStatus(p);
    tr.cells[3].textContent = `${s.done} / ${s.need}`; tr.cells[4].innerHTML = s.fail ? `<span class="flag">⚠ ${s.fail} FAIL</span>` : s.done === s.need ? '✅ PASS' : s.done ? 'adhura' : '<span class="muted">khali</span>'; });
}
document.addEventListener('click', e => {
  const d = e.target.dataset || {}, id = e.target.id;
  if (d.grsel) { GR_SEL = d.grsel; return renderGrad(); }
  if (d.gradd || d.grdel) { const [date, item, kind] = (d.gradd || d.grdel).split('|'), p = grPart(date + '|' + item); if (!p) return; const day = grDay(p), k = kind === 'g' ? 'ng' : 'nx', cur = grN(p, day, kind);
    if (d.grdel) { const last = day[kind][cur - 1]; if (last && Object.values(last).some(v => (Array.isArray(v) ? v.some(z => z !== '' && z != null) : v !== '' && v != null)) && !confirm('Aakhri sample mein data bhara hai — hatayein?')) return; day[kind].length = Math.min(day[kind].length, cur - 1); }
    day[k] = Math.max(1, cur + (d.gradd ? 1 : -1)); save(); return renderGrad(); }
  if (id === 'grPrint') return doPrint(grPrintHtml(grParts().filter(p => p.date === GR_SEL)));
  if (id === 'grPrintAll') return doPrint(grPrintHtml(grParts().filter(p => grStatus(p).done)));
  if (id === 'grXls') return grExcel();
  if (id === 'grTplReset') { if (!confirm('Sieve aur limit wapas default par?')) return; grDB().tpl = {}; save(); renderGrad(); }
});
function grHead(p, title) {
  const s = DB.settings;
  return `<h2>${esc(s.division || 'ROADS & BUILDINGS SUB DIVISION, DAHOD')}</h2><h4>${esc(title)}</h4>
    <div class="meta"><span>Name of Work: ${esc(s.workName)}</span><span>Agency: ${esc(s.agency)}</span></div>
    <div class="meta"><span>Date of Sampling / Testing: ${dmy(p.date)}</span><span>Chainage / Location: ${esc(grDay(p).loc || '')}</span><span>Mix produced: ${f2(p.T)} MT</span><span>Material %: ${esc(grTpl(p.it).mat || '')}</span></div>`;
}
const PFt = ok => ok == null ? '' : ok ? 'PASS' : 'FAIL';
const grSign = '<div class="meta" style="margin-top:26px"><span>Tested By</span><span>Checked By (Dy. Ex. Eng.)</span><span>Agency Representative</span></div>';
function grPrintHtml(P) {
  return P.map(p => { const t = grTpl(p.it), d = grDay(p), sv = grSieves(t); if (!sv.length) return '';
    let h = `<div class="reg">${grHead(p, t.title)}<div style="display:flex;flex-wrap:wrap;gap:10px">`;
    for (let n = 0; n < grN(p, d, 'g'); n++) { const c = grCalc(t, d.g[n] || {}), s = d.g[n] || {};
      h += `<div style="flex:1;min-width:44%"><div style="font-weight:700;margin:4px 0">Sample ${n + 1}</div><table><thead><tr><th>IS Sieve (mm)</th><th>Wt. Retained (g)</th><th>% Retained</th><th>Cum. % Retained</th><th>% Passing</th><th>Lower Limit</th><th>Upper Limit</th><th>Result</th></tr></thead><tbody>` +
        c.rows.map((r, i) => `<tr><td>${r.s}</td><td>${(s.w || [])[i] ?? ''}</td><td>${g2(r.ret)}</td><td>${g2(r.cum)}</td><td>${g2(r.pass)}</td><td>${r.lo}</td><td>${r.hi}</td><td>${c.done ? PFt(r.ok) : ''}</td></tr>`).join('') +
        (t.pan ? `<tr><td>Pan</td><td>${s.pan ?? ''}</td><td colspan="6"></td></tr>` : '') +
        `<tr><td class="tot">TOTAL</td><td class="tot">${c.tot ? g2(c.tot) : ''}</td><td colspan="6" class="tot">${c.done ? (c.ok ? 'GRADATION WITHIN SPECIFIED LIMITS — PASS' : 'GRADATION NOT WITHIN SPECIFIED LIMITS — FAIL') : ''}</td></tr></tbody></table></div>`; }
    h += '</div>';
    if (t.ext) { const nx = grN(p, d, 'x'), X = [...Array(nx)].map((_, n) => d.x[n] || {}), C = X.map(x => grExt(t, p.it, x)), row = (l, u, fn) => `<tr><td style="text-align:left">${l}</td><td>${u}</td>${X.map((x, n) => `<td>${fn(x, C[n])}</td>`).join('')}</tr>`;
      h += `<h4 style="margin-top:10px">BITUMEN EXTRACTION TEST (Centrifuge Method) – ${esc(p.it.name)}</h4><table><thead><tr><th style="width:44%">Particulars</th><th>Unit</th>${X.map((_, n) => `<th>Sample ${n + 1}</th>`).join('')}</tr></thead><tbody>` +
        row('Wt. of Mix Sample before Extraction (W1)', 'g', x => x.W1 ?? '') + row('Wt. of Filter Paper before Test (W2)', 'g', x => x.W2 ?? '') + row('Wt. of Filter Paper after Test (W3)', 'g', x => x.W3 ?? '') + row('Wt. of Aggregate after Extraction (W4)', 'g', x => x.W4 ?? '') +
        row('Wt. of Fines in Filter Paper (W5 = W3 − W2)', 'g', (x, c) => g2(c.W5)) + row('Total Wt. of Aggregate (W6 = W4 + W5)', 'g', (x, c) => g2(c.W6)) + row('Wt. of Bitumen (W7 = W1 − W6)', 'g', (x, c) => g2(c.W7)) +
        row('Bitumen Content (W7 / W1 × 100)', '%', (x, c) => `<b>${g2(c.bc)}</b>`) + row(`Specified Bitumen Content${t.mode === 'min' ? ' (Min.)' : ''}`, '%', (x, c) => c.spec) + row('Permissible Tolerance (±)', '%', (x, c) => c.tol) + row('Result', '–', (x, c) => `<b>${PFt(c.ok)}</b>`) + '</tbody></table>'; }
    return h + grSign + '</div>'; }).join('');
}
// Excel — asli formula ke saath (wazan badlo to Excel mein bhi apne aap hisaab)
function grExcel() {
  const P = grParts().filter(p => grSieves(grTpl(p.it)).length); if (!P.length) return toast('Data nahi hai');
  const wb = XLSX.utils.book_new(), A = (c, r) => XLSX.utils.encode_cell({ c, r }), used = {};
  P.forEach(p => { const t = grTpl(p.it), d = grDay(p), sv = grSieves(t), ws = {}, s = DB.settings; let R = 0, maxC = 7;
    const put = (c, r, v) => { if (v === '' || v == null) return; ws[A(c, r)] = typeof v === 'object' ? v : typeof v === 'number' ? { t: 'n', v } : { t: 's', v: String(v) }; maxC = Math.max(maxC, c); };
    const F = f => ({ t: 'n', f }), FS = f => ({ t: 's', f }), num = v => grNum(v) == null ? '' : +v;
    put(0, R++, s.division || 'ROADS & BUILDINGS SUB DIVISION, DAHOD'); put(0, R++, t.title);
    put(0, R, 'Name of Work'); put(1, R++, s.workName || ''); put(0, R, 'Agency'); put(1, R++, s.agency || '');
    put(0, R, 'Date of Sampling / Testing'); put(1, R++, dmy(p.date)); put(0, R, 'Chainage / Location'); put(1, R++, d.loc || '');
    put(0, R, 'Mix produced (MT)'); put(1, R++, +f2(p.T)); put(0, R, 'Material %'); put(1, R++, t.mat || ''); R++;
    for (let n = 0; n < grN(p, d, 'g'); n++) { const g = d.g[n] || {}; put(0, R++, `GRADATION – Sample ${n + 1}`);
      ['IS Sieve (mm)', 'Wt. Retained (g)', '% Retained', 'Cumulative % Retained', '% Passing', 'Lower Limit (%)', 'Upper Limit (%)', 'Result'].forEach((x, c) => put(c, R, x)); R++;
      const r0 = R, rT = R + sv.length + (t.pan ? 1 : 0), T = `$B$${rT + 1}`;
      sv.forEach((x, i) => { const e = R + 1; put(0, R, x.s); put(1, R, num((g.w || [])[i]));
        put(2, R, F(`IF(${T}=0,"",B${e}/${T}*100)`)); put(3, R, F(`IF(${T}=0,"",SUM($C$${r0 + 1}:C${e}))`)); put(4, R, F(`IF(D${e}="","",100-D${e})`)); put(5, R, x.lo); put(6, R, x.hi);
        put(7, R, FS(`IF(E${e}="","",IF(AND(ROUND(E${e},2)>=F${e},ROUND(E${e},2)<=G${e}),"PASS","FAIL"))`)); R++; });
      if (t.pan) { put(0, R, 'Pan'); put(1, R, num(g.pan)); R++; }
      put(0, R, 'TOTAL WEIGHT (g)'); put(1, R, F(`SUM(B${r0 + 1}:B${R})`));
      put(3, R, 'OVERALL'); put(4, R, FS(`IF(${T}=0,"",IF(COUNTIF(H${r0 + 1}:H${r0 + sv.length},"FAIL")>0,"FAIL","PASS"))`)); R += 2; }
    if (t.ext) { const nx = grN(p, d, 'x'); put(0, R++, `BITUMEN EXTRACTION TEST (Centrifuge Method) – ${p.it.name}`);
      put(0, R, 'Particulars'); put(1, R, 'Unit'); for (let n = 0; n < nx; n++) put(2 + n, R, `Sample ${n + 1}`); R++;
      const b = R, L = ['Wt. of Mix Sample before Extraction (W1)', 'Wt. of Filter Paper before Test (W2)', 'Wt. of Filter Paper after Test (W3)', 'Wt. of Aggregate after Extraction (W4)', 'Wt. of Fines in Filter Paper (W5 = W3 - W2)', 'Total Wt. of Aggregate (W6 = W4 + W5)', 'Wt. of Bitumen (W7 = W1 - W6)', 'Bitumen Content (W7 / W1 x 100)', `Specified Bitumen Content${t.mode === 'min' ? ' (Min.)' : ''}`, 'Permissible Tolerance (±)', 'Result'];
      L.forEach((l, i) => { put(0, b + i, l); put(1, b + i, i < 7 ? 'g' : i < 10 ? '%' : '-'); });
      for (let n = 0; n < nx; n++) { const x = d.x[n] || {}, c = 2 + n, col = XLSX.utils.encode_col(c), r = i => `${col}${b + i + 1}`;
        ['W1', 'W2', 'W3', 'W4'].forEach((f, i) => put(c, b + i, num(x[f])));
        put(c, b + 4, F(`IF(COUNT(${r(1)}:${r(2)})<2,"",${r(2)}-${r(1)})`)); put(c, b + 5, F(`IF(OR(${r(3)}="",${r(4)}=""),"",${r(3)}+${r(4)})`));
        put(c, b + 6, F(`IF(OR(${r(0)}="",${r(5)}=""),"",${r(0)}-${r(5)})`)); put(c, b + 7, F(`IF(OR(${r(0)}="",${r(0)}=0,${r(6)}=""),"",${r(6)}/${r(0)}*100)`));
        put(c, b + 8, +p.it.pct || 0); put(c, b + 9, +t.tol || 0);
        put(c, b + 10, FS(t.mode === 'min' ? `IF(${r(7)}="","",IF(ROUND(${r(7)},2)>=${r(8)}-${r(9)},"PASS","FAIL"))` : `IF(${r(7)}="","",IF(AND(ROUND(${r(7)},2)>=${r(8)}-${r(9)},ROUND(${r(7)},2)<=${r(8)}+${r(9)}),"PASS","FAIL"))`)); }
      R = b + L.length + 1; }
    put(0, R + 1, 'Tested By'); put(3, R + 1, 'Checked By (Dy. Ex. Eng.)'); put(6, R + 1, 'Agency Representative');
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: maxC, r: R + 1 } }); ws['!cols'] = [44, 16, 14, 20, 14, 14, 14, 12].map(wch => ({ wch }));
    let name = `${p.date.slice(8)}-${p.date.slice(5, 7)} ${p.it.name}`.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28); while (used[name]) name += '_'; used[name] = 1;
    XLSX.utils.book_append_sheet(wb, ws, name); });
  XLSX.writeFile(wb, 'Gradation_Extraction.xlsx');
}
