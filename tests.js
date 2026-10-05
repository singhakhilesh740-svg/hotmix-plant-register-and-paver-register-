/* ================= Test schedule — MoRTH Section 900 (5th rev.) ke minimum frequency par =================
   Sirf GINTI batata hai (kitne test lagte hain / kitne hue). Test ke result app nahi banata — wo lab se aate hain. */
const TS_BASIS = { tonne: 'har N tonne mix (min/din)', cum: 'har N cum aggregate/material', sqm: 'har N sq.m', day: 'N test roz', truck: 'har N-ve truck par', lot: 'har lot / tanker', source: 'har source par ek baar', regular: 'lagataar (ginti nahi)' };
const TS_GRP = { AGG: 'Coarse aggregate (sab item combined)', BINDER: 'Bitumen (binder)', TACK: 'Tack coat', BM: 'Bituminous Macadam / BSG', DBM: 'DBM / SDBC / BC', GSB: 'Granular Sub-base (GSB)', WMM: 'Wet Mix Macadam (WMM)', OTHER: 'Anya (is kaam ke)' };
function TS_AGG_SEED() {
  const T = (name, basis, n, ref) => ({ id: uid(), grp: 'AGG', name, basis, n, minDay: 0, ref });
  return [T('Aggregate Impact Value / Los Angeles Abrasion', 'cum', 350, 'IS:2386 (P-4)'), T('Flakiness + Elongation Index', 'cum', 350, 'IS:2386 (P-1)'),
    T('Stripping value of aggregate', 'source', 1, 'IS:6241'), T('Water absorption of aggregate', 'source', 1, 'IS:2386 (P-3)'), T('Soundness (Na / Mg sulphate)', 'source', 1, 'IS:2386 (P-5)')];
}
// coarse aggregate (6.3 mm se upar) ka hissa — andaza; Tests tab mein badal sakte ho
function tsCoarse(it) { const c = (tsDB().coarse || {})[it.code]; if (c != null && c !== '') return +c; const n = (it.name || '').toUpperCase(); return /SDBC|BC/.test(n) && !/DBM/.test(n) ? 55 : /DBM/.test(n) ? 60 : /BSG/.test(n) ? 60 : 70; }
function TS_SEED() {
  const T = (grp, name, basis, n, minDay, ref) => ({ id: uid(), grp, name, basis, n: n || 0, minDay: minDay || 0, ref: ref || '' });
  return [
    ...TS_AGG_SEED(),
    T('BINDER', 'Quality of binder (penetration, softening pt., viscosity, ductility …)', 'lot', 1, 0, 'IS:73 / IS:8887'),
    T('TACK', 'Quality of binder (emulsion / bitumen)', 'lot', 1, 0, 'IS:8887 / IS:73'),
    T('TACK', 'Binder temperature for application', 'regular', 0, 0, ''),
    T('TACK', 'Rate of spread of binder (tray test)', 'day', 3, 0, ''),
    T('BM', 'Aggregate Impact Value / Los Angeles Abrasion', 'cum', 350, 0, 'IS:2386 (P-4)'),
    T('BM', 'Flakiness + Elongation Index', 'cum', 350, 0, 'IS:2386 (P-1)'),
    T('BM', 'Stripping value of aggregate', 'source', 1, 0, 'IS:6241'),
    T('BM', 'Water absorption of aggregate', 'source', 1, 0, 'IS:2386 (P-3)'),
    T('BM', 'Soundness (Na / Mg sulphate)', 'source', 1, 0, 'IS:2386 (P-5)'),
    T('BM', 'Water sensitivity of mix (retained tensile strength)', 'source', 1, 0, 'AASHTO T283'),
    T('BM', 'Grading of aggregate (mix grading)', 'tonne', 400, 2, 'IS:2386 (P-1)'),
    T('BM', 'Binder content (extraction)', 'tonne', 400, 2, 'ASTM D2172'),
    T('BM', 'Temperature: binder, aggregate, mix (laying / rolling)', 'regular', 0, 0, ''),
    T('BM', 'Rate of spread of mix (layer thickness check)', 'regular', 0, 0, ''),
    T('BM', 'Density of compacted layer (core)', 'sqm', 700, 0, 'ASTM D2726'),
    T('DBM', 'Aggregate Impact Value / Los Angeles Abrasion', 'cum', 350, 0, 'IS:2386 (P-4)'),
    T('DBM', 'Flakiness + Elongation Index', 'cum', 350, 0, 'IS:2386 (P-1)'),
    T('DBM', 'Stripping value of aggregate', 'source', 1, 0, 'IS:6241'),
    T('DBM', 'Water absorption of aggregate', 'source', 1, 0, 'IS:2386 (P-3)'),
    T('DBM', 'Soundness (Na / Mg sulphate)', 'source', 1, 0, 'IS:2386 (P-5)'),
    T('DBM', 'Sand equivalent / Plasticity index of fines', 'source', 1, 0, 'IS:2720 (P-37 / P-5)'),
    T('DBM', 'Polished stone value (sirf wearing course)', 'source', 1, 0, 'BS:812-114'),
    T('DBM', 'Moisture susceptibility of mix (TSR)', 'source', 1, 0, 'AASHTO T283'),
    T('DBM', 'Mix grading (individual + mixed aggregate from dryer)', 'tonne', 400, 2, 'IS:2386 (P-1)'),
    T('DBM', 'Marshall stability, flow, density, voids (set of 3 specimens) + Gmm', 'tonne', 400, 2, 'ASTM D6927 / D2041'),
    T('DBM', 'Binder content (extraction)', 'tonne', 400, 2, 'ASTM D2172'),
    T('DBM', 'Temperature: binder in boiler, aggregate in dryer, mix at laying / compaction', 'regular', 0, 0, ''),
    T('DBM', 'Rate of spread of mix (thickness check)', 'truck', 5, 0, ''),
    T('DBM', 'Density of compacted layer (core)', 'sqm', 700, 0, 'ASTM D2726'),
    T('GSB', 'Gradation', 'cum', 400, 0, 'IS:2720 (P-4)'),
    T('GSB', 'Atterberg limits (LL / PI)', 'cum', 400, 0, 'IS:2720 (P-5)'),
    T('GSB', 'Moisture content prior to compaction', 'cum', 400, 0, 'IS:2720 (P-2)'),
    T('GSB', 'Density of compacted layer', 'sqm', 1000, 0, 'IS:2720 (P-28)'),
    T('GSB', 'CBR / 10% fines value / deleterious constituents', 'source', 1, 0, 'IS:2720 (P-16) / BS:812-111'),
    T('WMM', 'Aggregate Impact Value', 'cum', 1000, 0, 'IS:2386 (P-4)'),
    T('WMM', 'Grading of aggregate', 'cum', 200, 0, 'IS:2386 (P-1)'),
    T('WMM', 'Flakiness + Elongation Index', 'cum', 500, 0, 'IS:2386 (P-1)'),
    T('WMM', 'Atterberg limits of portion passing 425 micron', 'cum', 200, 0, 'IS:2720 (P-5)'),
    T('WMM', 'Density of compacted layer', 'sqm', 1000, 0, 'IS:2720 (P-28)'),
  ];
}
const TS_CAT = { agg: 'Aggregate ke test', bit: 'Bitumen ke test', mix: 'Extraction aur Gradation', oth: 'Anya (Marshall, density, temperature, rate of spread …)' };
const TS_CAT_GU = { agg: 'એગ્રીગેટના ટેસ્ટ', bit: 'ડામર (બિટુમેન) ના ટેસ્ટ', mix: 'એક્સટ્રેક્શન અને ગ્રેડેશન', oth: 'અન્ય ટેસ્ટ' };
function tsCat(d) {
  if (d.cat) return d.cat; const n = d.name.toLowerCase();
  if (/temperature|rate of spread|density|marshall|susceptib|sensitiv/.test(n)) return 'oth';
  if (/extraction|binder content|grading|gradation/.test(n)) return 'mix';
  if (/quality of binder|penetration|softening|viscosity|ductility/.test(n) || d.grp === 'BINDER') return 'bit';
  if (/aggregate|flakiness|elongation|stripping|soundness|water absorption|sand equivalent|polished|impact|abrasion/.test(n)) return 'agg';
  return 'oth';
}
function tsDB() {
  if (!DB.tests) DB.tests = { defs: TS_SEED(), done: {}, manual: {}, aggDen: 1.5 };
  const t = DB.tests; t.done = t.done || {}; t.coarse = t.coarse || {}; if (t.combine == null) t.combine = true;
  if (t.defs && !t.defs.some(d => d.grp === 'AGG')) t.defs.unshift(...TS_AGG_SEED()); t.manual = t.manual || {}; t.aggDen = +t.aggDen || 1.5; t.defs = t.defs || TS_SEED();
  return t;
}
function tsKind(it) { const n = (it.name || '').toUpperCase(); return /DBM|SDBC|BC/.test(n) ? 'DBM' : 'BM'; }
// har "section" = ek material jis par test lagte hain: {key, title, grp, T, cum, sqm, trucks, lots, days:[{date,T,cum,sqm,trucks}]}
function tsSections() {
  const t = tsDB(), out = [], aggM = {};
  const aggNames = new Set(t.defs.filter(d => d.grp === 'AGG').map(d => d.name));
  const lots = (DB.gatepasses || []).length;
  out.push({ key: 'BINDER', grp: 'BINDER', title: 'Bitumen (binder)', lots, info: `${lots} tanker / lot (Bitumen tab ke gatepass)`, days: [] });
  const runs = [...DB.runs].sort((a, b) => runKey(a).localeCompare(runKey(b)));
  DB.items.forEach(it => {
    const p = itemParams(it), perT = p.den && p.th ? 1 / (p.den * p.th / 1000) : 0, m = {};
    runs.filter(r => r.item == it.code).forEach(r => { const d = m[r.date] = m[r.date] || { date: r.date, T: 0, trucks: 0 }; d.T += regTotal(r); d.trucks += r.trucks.length; });
    const days = Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
    days.forEach(d => { d.cum = d.T * (1 - (+it.pct || 0) / 100) * tsCoarse(it) / 100 / t.aggDen; d.sqm = d.T * perT;
      const g = aggM[d.date] = aggM[d.date] || { date: d.date, T: 0, cum: 0, sqm: 0, trucks: 0 }; g.T += d.T; g.cum += d.cum; });
    const sum = k => days.reduce((s, d) => s + d[k], 0);
    const base = { T: sum('T'), cum: sum('cum'), sqm: sum('sqm'), trucks: sum('trucks'), days };
    out.push({ key: 'IT' + it.code, grp: tsKind(it), skip: t.combine ? aggNames : null, title: `Item ${it.code} – ${it.name}`, ...base,
      info: `${f2(base.T)} MT mix · ${days.length} din · ~${Math.round(base.cum)} cum coarse aggregate · ${Math.round(base.sqm)} sq.m · ${base.trucks} truck` });
    if (p.tack) out.push({ key: 'TK' + it.code, grp: 'TACK', title: `Tack coat – ${it.name} ke neeche`, ...base, lots, info: `${Math.round(base.sqm)} sq.m · ${days.length} din` });
  });
  if (t.combine) { const days = Object.values(aggM).sort((a, b) => a.date.localeCompare(b.date)), cum = days.reduce((a, d) => a + d.cum, 0), T = days.reduce((a, d) => a + d.T, 0);
    out.splice(1, 0, { key: 'AGG', grp: 'AGG', title: 'Coarse aggregate — sab item combined (ek source)', T, cum, sqm: 0, trucks: 0, days, info: `~${Math.round(cum)} cum coarse aggregate · ${days.length} din (${DB.items.map(i => i.name + ' ' + tsCoarse(i) + '%').join(', ')})` }); }
  ['GSB', 'WMM', 'OTHER'].forEach(g => { const mq = t.manual[g] || {}; if (!(+mq.cum || +mq.sqm || +mq.days || (g === 'OTHER' && t.defs.some(d => d.grp === 'OTHER')))) return;
    out.push({ key: g, grp: g, title: TS_GRP[g], T: +mq.T || 0, cum: +mq.cum || 0, sqm: +mq.sqm || 0, trucks: 0, lots: 1, nDays: +mq.days || 0, days: [], info: `${+mq.cum || 0} cum · ${+mq.sqm || 0} sq.m · ${+mq.days || 0} din (haath se bhara)` }); });
  return out;
}
const tsCeil = (q, n) => q > 0 && n > 0 ? Math.ceil(q / n - 1e-9) : 0;
function tsReq(d, s) {   // is section mein is test ki zaroori ginti (null = ginti nahi)
  const nDays = s.days.length || s.nDays || 0;
  switch (d.basis) {
    case 'tonne': return s.days.length ? s.days.reduce((a, x) => a + Math.max(+d.minDay || 0, tsCeil(x.T, d.n)), 0) : Math.max((+d.minDay || 0) * nDays, tsCeil(s.T, d.n));
    case 'cum': return tsCeil(s.cum, d.n);
    case 'sqm': return tsCeil(s.sqm, d.n);
    case 'day': return (+d.n || 0) * nDays;
    case 'truck': return d.n > 0 ? Math.floor((s.trucks || 0) / d.n) : 0;
    case 'lot': return (s.lots || 0) * (+d.n || 1);
    case 'source': return (s.T || s.cum || s.sqm || nDays) ? (+d.n || 1) : 0;
    default: return null;
  }
}
function tsFreqText(d) {
  switch (d.basis) {
    case 'tonne': return `1 set / ${d.n} T mix` + (d.minDay ? `, kam se kam ${d.minDay} roz` : '');
    case 'cum': return `1 test / ${d.n} cum`;
    case 'sqm': return `1 test / ${d.n} sq.m`;
    case 'day': return `${d.n} test roz`;
    case 'truck': return `har ${d.n}-ve truck par`;
    case 'lot': return 'har lot / tanker par';
    case 'source': return 'har source par ek baar + source/quality badle to';
    default: return 'lagataar (regular interval)';
  }
}
function tsRows() {
  const t = tsDB(), R = [];
  tsSections().forEach(s => t.defs.filter(d => d.grp === s.grp && !(s.skip && s.skip.has(d.name))).forEach(d => {
    const req = tsReq(d, s), k = s.key + ':' + d.id, done = +t.done[k] || 0;
    R.push({ s, d, k, req, done, cat: tsCat(d), bal: req == null ? null : req - done });
  }));
  const o = Object.keys(TS_CAT); return R.map((r, i) => [r, i]).sort((a, b) => o.indexOf(a[0].cat) - o.indexOf(b[0].cat) || a[1] - b[1]).map(x => x[0]);
}
// din-wise: us din kaun se test kitne lagte hain
function tsDaily() {
  const t = tsDB(), m = {};
  tsSections().forEach(s => { const acc = { cum: 0, sqm: 0, trucks: 0 };
    s.days.forEach(x => {
      const due = [];
      t.defs.filter(d => d.grp === s.grp && !(s.skip && s.skip.has(d.name))).forEach(d => { let n = 0;
        if (d.basis === 'tonne') n = Math.max(+d.minDay || 0, tsCeil(x.T, d.n));
        else if (d.basis === 'day') n = +d.n || 0;
        else if (d.basis === 'cum' || d.basis === 'sqm') n = tsCeil(acc[d.basis] + x[d.basis], d.n) - tsCeil(acc[d.basis], d.n);
        else if (d.basis === 'truck' && d.n > 0) n = Math.floor((acc.trucks + x.trucks) / d.n) - Math.floor(acc.trucks / d.n);
        else if (d.basis === 'source') n = acc.cum === 0 && acc.sqm === 0 && acc.trucks === 0 ? (+d.n || 1) : 0;
        if (n > 0) due.push({ name: d.name, n, cat: tsCat(d) }); });
      acc.cum += x.cum; acc.sqm += x.sqm; acc.trucks += x.trucks;
      (m[x.date] = m[x.date] || []).push({ title: s.title, T: x.T, sqm: x.sqm, due });
    }); });
  return Object.keys(m).sort().map(date => ({ date, parts: m[date] }));
}
function renderTests() {
  const el = $('#tsSummary'); if (!el) return;
  const t = tsDB(), R = tsRows(), short = R.filter(r => r.bal > 0).length;
  const row = r => `<tr class="${r.bal > 0 ? 'warn' : ''}"><td class="l" style="white-space:normal">${esc(r.d.name)}</td><td>${esc(r.d.ref)}</td><td class="l">${tsFreqText(r.d)}</td>
      <td><b>${r.req == null ? '—' : r.req}</b></td><td>${r.req == null ? '—' : `<input type="number" min="0" data-tsdone="${r.k}" value="${r.done || ''}" style="width:70px">`}</td>
      <td>${r.bal == null ? '' : r.bal > 0 ? `<span class="flag">⚠ ${r.bal} baaki</span>` : '✅'}</td></tr>`;
  const tables = Object.keys(TS_CAT).map(c => { const L = R.filter(r => r.cat === c); if (!L.length) return ''; let h = '', last = '';
    L.forEach(r => { if (r.s.key !== last) { last = r.s.key; h += `<tr><th colspan="6" style="text-align:left">${esc(r.s.title)} <span class="muted" style="font-weight:400">— ${esc(r.s.info)}</span></th></tr>`; } h += row(r); });
    const sh = L.filter(r => r.bal > 0).length;
    return `<h3 style="margin:16px 0 4px">${TS_CAT[c]} ${sh ? `<span class="flag">⚠ ${sh} baaki</span>` : ''}</h3><div class="tablewrap"><table class="grid"><thead><tr><th>Test</th><th>IS / code</th><th>Minimum frequency</th><th>Zaroori</th><th>Ho gaye</th><th>Baaki</th></tr></thead><tbody>${h}</tbody></table></div>`; }).join('');
  el.innerHTML = `<div class="sum"><span>Kul test line: <b>${R.length}</b></span><span>Baaki wale: <b style="color:${short ? 'var(--bad)' : 'var(--ok)'}">${short}</b></span></div>` +
    (tables || '<p class="muted">Pehle Settings mein item aur Plant Register mein register banao</p>');
  const D = tsDaily();
  $('#tsDaily').innerHTML = D.length ? `<div class="tablewrap"><table class="grid"><thead><tr><th>Tarikh</th><th>Item</th><th>Mix (MT)</th><th>Aggregate</th><th>Extraction / Gradation</th><th>Anya</th></tr></thead><tbody>` +
    D.map(d => d.parts.map((p, i) => `<tr>${i ? '' : `<td rowspan="${d.parts.length}">${dmy(d.date)}</td>`}<td class="l">${esc(p.title)}</td><td>${f2(p.T)}</td>${['agg', 'mix', 'oth'].map(c => `<td class="l" style="white-space:normal">${p.due.filter(x => (x.cat === 'bit' ? 'oth' : x.cat) === c).map(x => `${esc(x.name)} <b>×${x.n}</b>`).join('<br>') || '—'}</td>`).join('')}</tr>`).join('')).join('') + '</tbody></table></div>' : '<p class="muted">Register banne par yahan har din ke test dikhenge.</p>';
  $('#tsDefs').innerHTML = `<thead><tr><th>Material</th><th>Varg</th><th>Test</th><th>IS / code</th><th>Aadhar</th><th>N</th><th>Min roz</th><th></th></tr></thead><tbody>` +
    t.defs.map(d => `<tr><td>${TS_GRP[d.grp] || d.grp}</td><td><select data-tsf="cat" data-tsid="${d.id}" style="width:130px">${Object.keys(TS_CAT).map(c => `<option value="${c}" ${c === tsCat(d) ? 'selected' : ''}>${TS_CAT[c].split(' (')[0]}</option>`).join('')}</select></td><td class="l" style="white-space:normal"><input data-tsf="name" data-tsid="${d.id}" value="${esc(d.name)}" style="width:300px"></td>
      <td><input data-tsf="ref" data-tsid="${d.id}" value="${esc(d.ref)}" style="width:120px"></td>
      <td><select data-tsf="basis" data-tsid="${d.id}" style="width:190px">${Object.keys(TS_BASIS).map(b => `<option value="${b}" ${b === d.basis ? 'selected' : ''}>${TS_BASIS[b]}</option>`).join('')}</select></td>
      <td><input type="number" data-tsf="n" data-tsid="${d.id}" value="${d.n || ''}" style="width:70px"></td><td><input type="number" data-tsf="minDay" data-tsid="${d.id}" value="${d.minDay || ''}" style="width:60px"></td>
      <td><button class="btn sm danger" data-tsdel="${d.id}">🗑</button></td></tr>`).join('') + '</tbody>';
  $('#tsAggDen').value = t.aggDen;
  $('#tsAggBox').innerHTML = `<label style="flex-direction:row;align-items:center;gap:6px;color:var(--ink)"><input type="checkbox" id="tsCombine" ${t.combine ? 'checked' : ''}> Sab item ka aggregate ek hi source (quarry) ka hai — aggregate ke test combined gino</label>
    <span class="muted">Coarse aggregate %:</span> ${DB.items.map(i => `<label style="flex-direction:row;align-items:center;gap:4px">${esc(i.name)}<input type="number" data-tscoarse="${esc(i.code)}" value="${tsCoarse(i)}" style="width:64px"></label>`).join(' ')}`;
  ['GSB', 'WMM', 'OTHER'].forEach(g => ['cum', 'sqm', 'days'].forEach(f => { const i = $(`[data-tsman="${g}:${f}"]`); if (i) i.value = (t.manual[g] || {})[f] || ''; }));
}
document.addEventListener('change', e => {
  const d = e.target.dataset; if (!d) return; const t = DB.tests;
  if (d.tsdone) { t.done[d.tsdone] = Math.max(0, +e.target.value || 0); save(); return renderTests(); }
  if (d.tsf) { const x = t.defs.find(v => v.id === d.tsid); if (!x) return; x[d.tsf] = ['n', 'minDay'].includes(d.tsf) ? +e.target.value || 0 : e.target.value.trim(); save(); return renderTests(); }
  if (d.tsman) { const [g, f] = d.tsman.split(':'); (t.manual[g] = t.manual[g] || {})[f] = +e.target.value || 0; save(); return renderTests(); }
  if (e.target.id === 'tsCombine') { t.combine = e.target.checked; save(); return renderTests(); }
  if (d.tscoarse != null) { t.coarse[d.tscoarse] = Math.min(100, Math.max(0, +e.target.value || 0)); save(); return renderTests(); }
  if (e.target.id === 'tsAggDen') { t.aggDen = +e.target.value || 1.5; save(); renderTests(); }
});
document.addEventListener('click', e => {
  const id = e.target.id, d = e.target.dataset || {};
  if (d.tsdel) { if (!confirm('Ye test list se hatayein?')) return; DB.tests.defs = DB.tests.defs.filter(v => v.id !== d.tsdel); save(); return renderTests(); }
  if (id === 'tsAdd') { const name = $('#tsNewName').value.trim(); if (!name) return toast('Test ka naam likho');
    tsDB().defs.push({ id: uid(), grp: $('#tsNewGrp').value, name, ref: $('#tsNewRef').value.trim(), cat: $('#tsNewCat').value, basis: $('#tsNewBasis').value, n: +$('#tsNewN').value || 0, minDay: +$('#tsNewMin').value || 0 });
    save(); $('#tsNewName').value = $('#tsNewRef').value = $('#tsNewN').value = $('#tsNewMin').value = ''; renderTests(); return toast('Test add hua'); }
  if (id === 'tsReset') { if (!confirm('Test list wapas MoRTH default par? (Tumhare badlav aur "ho gaye" ginti hat jayegi)')) return; DB.tests.defs = TS_SEED(); DB.tests.done = {}; save(); return renderTests(); }
  if (id === 'tsPrint') return doPrint(tsPrintHtml());
  if (id === 'tsXls') return tsExcel();
});
const TS_TITLE = 'ટેસ્ટ શેડ્યૂલ – MoRTH કલમ 900 મુજબ લઘુત્તમ આવર્તન';
function tsPrintHtml() {
  const R = tsRows(), s = DB.settings; if (!R.length) return '';
  const D = tsDaily();
  const meta = `<div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>`;
  return Object.keys(TS_CAT).map(c => { const L = R.filter(r => r.cat === c); if (!L.length) return ''; let h = '', last = '', n = 0;
    L.forEach(r => { if (r.s.key !== last) { last = r.s.key; h += `<tr><td colspan="7" style="text-align:left;font-weight:700">${esc(r.s.title)} — ${esc(r.s.info)}</td></tr>`; }
      h += `<tr><td>${++n}</td><td style="text-align:left">${esc(r.d.name)}</td><td>${esc(r.d.ref)}</td><td style="text-align:left">${tsFreqText(r.d)}</td><td>${r.req ?? '—'}</td><td>${r.req == null ? '—' : r.done}</td><td>${r.bal == null ? '' : Math.max(0, r.bal)}</td></tr>`; });
    return `<div class="reg"><h2>${TS_TITLE}</h2><h4>${TS_CAT_GU[c]}</h4>${meta}
    <table class="p1"><thead><tr><th style="width:4%">ક્રમ</th><th style="width:34%">ટેસ્ટ</th><th style="width:12%">IS / કોડ</th><th style="width:26%">લઘુત્તમ આવર્તન</th><th>જરૂરી ટેસ્ટ</th><th>થયેલ ટેસ્ટ</th><th>બાકી</th></tr></thead><tbody>${h}</tbody></table></div>`; }).join('') +
    (D.length ? `<div class="reg"><h2>દૈનિક ટેસ્ટ શેડ્યૂલ</h2><div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span></div>
    <table class="p1"><thead><tr><th style="width:9%">તારીખ</th><th style="width:16%">આઈટમ</th><th style="width:9%">મિશ્રણ (મે.ટન)</th><th>તે દિવસના ટેસ્ટ (લઘુત્તમ)</th></tr></thead><tbody>` +
      D.map(d => d.parts.map(p => `<tr><td>${dmy(d.date)}</td><td style="text-align:left">${esc(p.title)}</td><td>${f2(p.T)}</td><td style="text-align:left">${Object.keys(TS_CAT).map(c => { const L = p.due.filter(x => x.cat === c); return L.length ? `<b>${TS_CAT_GU[c]}:</b> ` + L.map(x => `${esc(x.name)} ×${x.n}`).join('; ') : ''; }).filter(Boolean).join('<br>') || '—'}</td></tr>`).join('')).join('') + '</tbody></table></div>' : '');
}
function tsExcel() {
  const R = tsRows(); if (!R.length) return toast('Data nahi hai');
  const s = DB.settings, wb = XLSX.utils.book_new(), SH = { agg: 'Aggregate', bit: 'Bitumen', mix: 'Extraction-Gradation', oth: 'Other' };
  Object.keys(TS_CAT).forEach(c => { const L = R.filter(r => r.cat === c); if (!L.length) return;
    const a = [[TS_TITLE + ' – ' + TS_CAT_GU[c]], [`કામનું નામ: ${s.workName || ''}`, '', '', `એજન્સી: ${s.agency || ''}`], [], ['ક્રમ', 'મટીરીયલ', 'ટેસ્ટ', 'IS / કોડ', 'લઘુત્તમ આવર્તન', 'જરૂરી ટેસ્ટ', 'થયેલ ટેસ્ટ', 'બાકી']];
    L.forEach((r, i) => a.push([i + 1, r.s.title, r.d.name, r.d.ref, tsFreqText(r.d), r.req ?? '', r.req == null ? '' : r.done, r.bal == null ? '' : Math.max(0, r.bal)]));
    const w = XLSX.utils.aoa_to_sheet(a); w['!cols'] = [6, 28, 56, 20, 40, 12, 12, 10].map(wch => ({ wch })); w['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    XLSX.utils.book_append_sheet(wb, w, SH[c]); });
  const b = [['દૈનિક ટેસ્ટ શેડ્યૂલ'], [`કામનું નામ: ${s.workName || ''}`], [], ['તારીખ', 'આઈટમ', 'મિશ્રણ (મે.ટન)', 'વર્ગ', 'ટેસ્ટ', 'સંખ્યા']];
  tsDaily().forEach(d => d.parts.forEach(p => (p.due.length ? p.due : [{ name: '—', n: '' }]).forEach(x => b.push([dmy(d.date), p.title, +f2(p.T), x.cat ? TS_CAT_GU[x.cat] : '', x.name, x.n]))));
  const w2 = XLSX.utils.aoa_to_sheet(b); w2['!cols'] = [12, 28, 14, 26, 60, 8].map(wch => ({ wch })); w2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, w2, 'Daily');
  XLSX.writeFile(wb, 'Test_Schedule.xlsx');
}
