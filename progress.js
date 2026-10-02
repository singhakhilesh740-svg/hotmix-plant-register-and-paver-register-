/* Road work progress tracker — har work (DB) ka alag.
   DB.progress = { road:{name,start,end,cw,agency,ded:[{from,to,label,short}],facts:[[k,v]]},
                   layers:[{t,name,spec,th,den,color,below,est:{len,mt,rate,amt,ch:[[a,b]]}|null}],
                   stretches:[{id,t,from,to,side,date,note}] } */
'use strict';

const PG_LAYERS = () => [
  { t: 'BSG', name: '37.5 mm BSG', spec: 'Built-up spray grout base', th: 0.0375, den: 2.0, color: '#b98a4a', below: null, est: null },
  { t: 'BM', name: '50 mm BM', spec: 'Bituminous Macadam', th: 0.05, den: 2.2, color: '#7a5c46', below: null, est: null },
  { t: 'SDBC', name: '25 mm SDBC', spec: 'Semi-dense bituminous concrete', th: 0.025, den: 2.3, color: '#2b3136', below: 'BM', est: null }
];
// Tarvadiya to SH Road — tumhari tracker file ka data
const PG_TARVADIYA = () => ({
  road: {
    name: 'Tarvadiya to SH Road', start: 0, end: 8400, cw: 5.5, agency: '',
    ded: [{ from: 380, to: 400, label: 'NH passed road part', short: 'NH' }, { from: 3240, to: 3810, label: 'Railway over bridge', short: 'ROB' }],
    facts: [['Working section', '0+000 to 8+400 of 11+800 (MDR)'], ['Carriageway', '5.5 m, VG-30 bitumen'], ['TCS-1', '25 SDBC + 50 BM + 37.5 BSG'],
      ['TCS-2', '25 SDBC + 50 BM'], ['Left out', 'NH passed road part 0+380–0+400; Railway over bridge 3+240–3+810'],
      ['TS amount', '₹ 4,95,43,000'], ['Bituminous (SE-4)', '₹ 2,55,86,033 + GST'], ['Estimate', 'As per TS estimate, SOR 2024-25']]
  },
  layers: [
    { t: 'BSG', name: '37.5 mm BSG', spec: 'Built-up spray grout base, TCS-1 only', th: 0.0375, den: 2.0, color: '#b98a4a', below: null,
      est: { len: 4050, mt: 1960, rate: 2179.58, amt: 4271976.8, ch: [[0, 380], [400, 3240], [3810, 4400], [5760, 6000]] } },
    { t: 'BM', name: '50 mm BM', spec: 'Bituminous Macadam, grading-2', th: 0.05, den: 2.2, color: '#7a5c46', below: null,
      est: { len: 7810, mt: 4781, rate: 2714.88, amt: 12979841.28, ch: [[0, 380], [400, 3240], [3810, 8400]] } },
    { t: 'SDBC', name: '25 mm SDBC', spec: 'Semi-dense bituminous concrete', th: 0.025, den: 2.3, color: '#2b3136', below: 'BM',
      est: { len: 7810, mt: 2499, rate: 3335.02, amt: 8334214.98, ch: [[0, 380], [400, 3240], [3810, 8400]] } }
  ],
  stretches: [
    { id: 'smunlxbbc5ayj', t: 'BSG', from: 4824, to: 5000, side: 'LHS', date: '2026-09-24', note: '' },
    { id: 'smunlwpu86jpm', t: 'BSG', from: 6460, to: 6490, side: 'RHS', date: '2026-09-24', note: '' },
    { id: 'smunlyay6fqm5', t: 'BSG', from: 6519, to: 7715, side: 'Full', date: '2026-09-24', note: '' },
    { id: 'smunm5dcdblt3', t: 'BM', from: 4901, to: 5015, side: 'LHS', date: '2026-09-24', note: '' },
    { id: 'smunm4ss9i5rz', t: 'BM', from: 5015, to: 7715, side: 'Full', date: '2026-09-24', note: '' }
  ]
});

function pgData() {
  if (!DB.progress) {
    DB.progress = /tarvad/i.test(DB.settings.workName || '') ? PG_TARVADIYA()
      : { road: { name: DB.settings.workName || '', start: 0, end: null, cw: 5.5, agency: '', ded: [], facts: [] }, layers: PG_LAYERS(), stretches: [] };
    save();
  }
  return DB.progress;
}

// ---- chainage helpers
function pgParse(s) {
  s = String(s || '').trim().replace(/\s/g, ''); if (!s) return NaN;
  let m = s.match(/^(\d+)[+\/](\d{1,3})$/); if (m) return +m[1] * 1000 + +m[2];
  if (/^\d+\.\d+$/.test(s)) return Math.round(parseFloat(s) * 1000);
  if (/^\d+$/.test(s)) return +s < 100 ? +s * 1000 : +s;
  return NaN;
}
const pgCh = m => (m == null || isNaN(m)) ? '—' : Math.floor(Math.round(m) / 1000) + '+' + String(Math.round(m) % 1000).padStart(3, '0');
const pgLen = m => m >= 1000 ? (m / 1000).toFixed(3) + ' km' : Math.round(m) + ' m';
const pgMT = v => Math.round(v).toLocaleString('en-IN') + ' MT';
const pgRs = v => '₹ ' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function pgMerge(iv) {
  const a = iv.map(r => [Math.min(r[0], r[1]), Math.max(r[0], r[1])]).sort((x, y) => x[0] - y[0]); const out = [];
  for (const [s, e] of a) { if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); }
  return out;
}
const pgCov = iv => iv.reduce((s, [a, b]) => s + (b - a), 0);
function pgMinus(iv, cover) {
  let miss = 0;
  for (const [s, e] of iv) { let cur = s;
    for (const [cs, ce] of cover) { if (ce <= cur) continue; if (cs >= e) break; if (cs > cur) miss += cs - cur; cur = Math.max(cur, ce); if (cur >= e) break; }
    if (cur < e) miss += e - cur; }
  return miss;
}
const pgRows = t => pgData().stretches.filter(r => r.t === t);
function pgNetDone(t) {   // LHS/RHS aadha; NH/ROB jaise hisse ghata ke
  const P = pgData(), ded = pgMerge((P.road.ded || []).map(d => [d.from, d.to]));
  const side = s => pgMerge(pgRows(t).filter(r => r.side === 'Full' || r.side === s).map(r => [r.from, r.to]));
  return (pgMinus(side('LHS'), ded) + pgMinus(side('RHS'), ded)) / 2;
}
function pgSpan() {
  const P = pgData(), s = P.road.start ?? 0; let e = P.road.end;
  if (e == null || isNaN(e)) e = Math.max(s + 1000, ...P.stretches.map(r => Math.max(r.from, r.to)));
  return [s, e];
}
function pgNice(len) { const raw = len / 8, p = Math.pow(10, Math.floor(Math.log10(raw))); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw) return k * p; return 10 * p; }

// ---- Paver staff ke hisaab se rang (jab ek se zyada paver staff ho)
const PG_STAFF_COL = ['#2166ac', '#e08214', '#1b9e77', '#c51b7d', '#6a51a3', '#8c510a'];
function pgStaffList() { return (DB.staff || []).filter(x => x.role === 'paver').sort((a, b) => (a.from || '').localeCompare(b.from || '')); }
function pgStaffMode() { return pgStaffList().length > 1; }
function pgStaffOf(date) { if (!date) return null; const L = pgStaffList(), i = L.findIndex(x => (!x.from || x.from <= date) && (!x.to || date <= x.to)); return i < 0 ? null : { ...L[i], col: PG_STAFF_COL[i % PG_STAFF_COL.length] }; }
function pgNetDoneOf(t, rows) {   // diye gaye stretches ki full-width barabar lambai (NH/ROB ghata ke)
  const P = pgData(), ded = pgMerge((P.road.ded || []).map(d => [d.from, d.to]));
  const side = s => pgMerge(rows.filter(r => r.t === t && (r.side === 'Full' || r.side === s)).map(r => [r.from, r.to]));
  return (pgMinus(side('LHS'), ded) + pgMinus(side('RHS'), ded)) / 2;
}
let pgEditing = null, pgCurT = null, pgFilterT = 'ALL';

function renderProgress() {
  const P = pgData(), L = P.layers, [s, e] = pgSpan(), total = Math.max(e - s, 1);
  if (!pgCurT || !L.some(l => l.t === pgCurT)) pgCurT = L[0]?.t || null;
  const last = P.stretches.map(r => r.date).filter(Boolean).sort().pop();
  $('#pgHead').innerHTML = `<div class="muted" style="text-transform:uppercase;letter-spacing:.06em;font-size:11px">${esc(DB.settings.division || 'R&B')} · Work in progress</div>
    <h2 style="margin:2px 0 6px">${esc(P.road.name || DB.settings.workName || 'Road')}</h2>
    <div class="sum"><span>Chainage <b>${P.road.end != null ? pgCh(s) + ' to ' + pgCh(P.road.end) : 'set nahi'}</b></span>
    <span>Length <b>${P.road.end != null ? pgLen(total) : '—'}</b></span><span>Last entry <b>${last ? dmy(last) : '—'}</b></span>
    ${P.road.agency ? `<span>Agency <b>${esc(P.road.agency)}</b></span>` : ''}</div>`;

  // tiles
  $('#pgTiles').innerHTML = L.map(l => {
    const base = l.est ? l.est.len : total, d = pgNetDone(l.t), p = Math.min(100, d / base * 100);
    let warn = '';
    if (l.below) {
      const miss = pgMinus(pgMerge(pgRows(l.t).map(r => [r.from, r.to])), pgMerge(pgRows(l.below).map(r => [r.from, r.to])));
      if (miss > 0) warn += `<span class="pg-warn">${pgLen(miss)} bina ${esc(l.below)} record ke</span>`;
    }
    if (d > base + 0.5) warn += `<span class="pg-warn">${pgLen(d - base)} estimate se zyada</span>`;
    const mt = d * (P.road.cw || 5.5) * l.th * l.den;
    return `<div class="pg-tile" style="--c:${l.color}"><div class="pg-tname">${esc(l.name)}</div><div class="muted">${esc(l.spec || '')}</div>
      <div class="pg-tval">${pgLen(d)} <small>of ${pgLen(base)} · ${p.toFixed(1)}%</small></div>
      <div class="pg-meter"><i style="width:${p}%"></i></div>
      <div class="muted">${l.est ? `≈ ${pgMT(mt)} of ${pgMT(l.est.mt)} estimated` : '≈ ' + pgMT(mt) + ' (laid length × width × thickness × density)'}</div>${warn}</div>`;
  }).join('');

  // estimate
  const hasEst = L.some(l => l.est) || (P.road.facts || []).length;
  $('#pgEst').classList.toggle('hidden', !hasEst);
  if (hasEst) {
    const chs = a => (a || []).map(([x, y]) => pgCh(x) + '–' + pgCh(y)).join(', ');
    $('#pgEst').innerHTML = `<h3>Estimate scope</h3>
      <div class="pg-facts">${(P.road.facts || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</div>
      <div class="tablewrap"><table class="grid"><thead><tr><th>Treatment</th><th>Estimated chainage</th><th>Length</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
      ${L.filter(l => l.est).map(l => `<tr><td class="l"><span class="pg-tag" style="--c:${l.color}">${esc(l.name)}</span></td><td class="l" style="white-space:normal">${chs(l.est.ch)}</td>
        <td>${pgLen(l.est.len)}</td><td>${l.est.mt ? pgMT(l.est.mt) : '—'}</td><td>${l.est.rate ? pgRs(l.est.rate) + '/MT' : '—'}</td><td>${l.est.amt || (l.est.mt && l.est.rate) ? pgRs(l.est.amt || l.est.mt * l.est.rate) : '—'}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  const sm = pgStaffMode();
  $('#pgLegend').innerHTML = (sm
    ? pgStaffList().map((x, i) => `<span style="--c:${PG_STAFF_COL[i % PG_STAFF_COL.length]}" title="${x.from ? dmy(x.from) : ''} – ${x.to ? dmy(x.to) : 'chalu'}"><b>${esc(x.name)}</b> (${x.from ? dmy(x.from) : '—'} – ${x.to ? dmy(x.to) : 'chalu'})</span>`).join('') + '<span style="--c:#9aa0a6">Date / staff nahi</span>'
    : L.map(l => `<span style="--c:${l.color}">${esc(l.t)}</span>`).join(''))
    + '<span class="pg-lg-est">Estimate chainage</span><span class="pg-lg-ded">Estimate mein nahi</span>';
  pgDrawStrip(s, e); pgDrawBars(total); pgDrawForm(); pgDrawTable(); pgDrawSetup();
}

function pgDrawStrip(s, e) {
  const P = pgData(), L = P.layers, svg = $('#pgStrip'), W = 1000, X0 = 70, R = 20, laneH = 34, gap = 14;
  const pts = (P.road.points || []).filter(p => p.at >= s && p.at <= e), sm = pgStaffMode();
  const top = pts.length ? 56 : 30, lanesEnd = top + L.length * (laneH + gap) - gap, H = lanesEnd + 92;
  const x = m => X0 + (m - s) / (e - s) * (W - X0 - R);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let o = `<defs><pattern id="pgHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ebe9e4"/><line x1="0" y1="0" x2="0" y2="6" stroke="#62686d" stroke-width="1.5" opacity=".5"/></pattern></defs>`;
  (P.road.ded || []).forEach(d => { const a = x(Math.max(d.from, s)), b = x(Math.min(d.to, e)); if (b > a) o += `<text x="${(a + b) / 2}" y="${top - 8}" text-anchor="middle" style="font-weight:600">${esc(d.short || '')}</text>`; });
  L.forEach((l, i) => {
    const y = top + i * (laneH + gap);
    o += `<text class="lbl" x="0" y="${y + laneH / 2 + 5}">${esc(l.t)}</text><rect x="${X0}" y="${y}" width="${W - X0 - R}" height="${laneH}" fill="#ebe9e4" rx="3"/>`;
    (P.road.ded || []).forEach(d => { const a = x(Math.max(d.from, s)), b = x(Math.min(d.to, e)); if (b > a) o += `<rect x="${a}" y="${y}" width="${b - a}" height="${laneH}" fill="url(#pgHatch)"><title>${esc(d.label)}: ${pgCh(d.from)} to ${pgCh(d.to)} (estimate mein nahi)</title></rect>`; });
    if (l.est) (l.est.ch || []).forEach(([a0, b0]) => { const a = x(Math.max(a0, s)), b = x(Math.min(b0, e)); if (b > a) o += `<rect x="${a + .75}" y="${y + .75}" width="${b - a - 1.5}" height="${laneH - 1.5}" fill="none" stroke="#1f2326" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="4 3"><title>Estimate ${esc(l.t)}: ${pgCh(a0)} to ${pgCh(b0)}</title></rect>`; });
    pgRows(l.t).forEach(r => {
      const a0 = Math.min(r.from, r.to), b0 = Math.max(r.from, r.to), a = x(Math.max(a0, s)), b = x(Math.min(b0, e)); if (b <= a) return;
      const yy = r.side === 'RHS' ? y + laneH / 2 : y, hh = r.side === 'Full' ? laneH : laneH / 2;
      o += `<rect class="pg-seg" data-id="${esc(r.id)}" x="${a}" y="${yy}" width="${Math.max(b - a, 1.5)}" height="${hh}" fill="${sm ? (pgStaffOf(r.date)?.col || '#9aa0a6') : l.color}" stroke="#fff" stroke-width="${sm ? .6 : 0}"><title>${esc(l.t)} ${r.side}: ${pgCh(a0)} to ${pgCh(b0)} (${pgLen(b0 - a0)})${r.date ? ' · ' + dmy(r.date) : ''}${sm ? ' · ' + (pgStaffOf(r.date)?.name || 'staff nahi') : ''}</title></rect>`;
    });
  });
  // ---- critical points: jahan kuch shuru / khatam hota hai
  const crit = new Map();   // m -> priority (3 user point, 2 road/ded/estimate, 1 stretch)
  const add = (m, pr) => { if (m == null || isNaN(m) || m < s - 0.5 || m > e + 0.5) return; m = Math.round(m);
    for (const k of crit.keys()) if (Math.abs(k - m) <= 3) { crit.set(k, Math.max(crit.get(k), pr)); return; } crit.set(m, pr); };
  add(s, 2); add(e, 2);
  pts.forEach(p => add(p.at, 3));
  (P.road.ded || []).forEach(d => { add(d.from, 2); add(d.to, 2); });
  L.forEach(l => (l.est?.ch || []).forEach(([a, b]) => { add(a, 2); add(b, 2); }));
  P.stretches.forEach(r => { add(r.from, 1); add(r.to, 1); });
  const list = [...crit.entries()].sort((a, b) => a[0] - b[0]);
  // lines har point par; label: paas-paas (11 px se kam) points ek group mein "0+380–0+400"
  list.forEach(([m, pr]) => {
    const xx = x(m);
    o += `<line x1="${xx}" x2="${xx}" y1="${top - 4}" y2="${lanesEnd + 4}" stroke="${pr === 3 ? '#b42318' : '#1f2326'}" stroke-opacity="${pr === 3 ? .8 : pr === 2 ? .35 : .22}" stroke-width="${pr === 3 ? 1.4 : 1}" stroke-dasharray="${pr === 1 ? '2 3' : pr === 2 ? '4 3' : ''}"><title>${pgCh(m)}</title></line>`;
  });
  const groups = [];
  list.forEach(([m, pr]) => { const g = groups[groups.length - 1]; if (g && x(m) - x(g.ms[g.ms.length - 1]) < 11) { g.ms.push(m); g.pr = Math.max(g.pr, pr); } else groups.push({ ms: [m], pr }); });
  // group ke label bhi aapas mein 11 px door hone chahiye; zaroori wale pehle
  const place = []; 
  [3, 2, 1].forEach(pr => groups.filter(g => g.pr === pr).forEach(g => {
    const cx = (x(g.ms[0]) + x(g.ms[g.ms.length - 1])) / 2;
    if (place.every(q => Math.abs(q.cx - cx) >= 11)) place.push({ ...g, cx });
  }));
  place.forEach(g => {
    const txt = g.ms.length === 1 ? pgCh(g.ms[0]) : `${pgCh(g.ms[0])}–${pgCh(g.ms[g.ms.length - 1])}`, y0 = lanesEnd + 12;
    o += `<text x="${g.cx}" y="${y0}" transform="rotate(-55 ${g.cx} ${y0})" text-anchor="end" style="font-size:10px;${g.pr === 1 ? '' : 'font-weight:600;fill:#1f2326'}"><title>${g.ms.map(pgCh).join(', ')}</title>${txt}</text>`;
  });
  // naam wale points upar (2 line mein, taaki takraye nahi)
  pts.sort((a, b) => a.at - b.at).forEach((p, i) => {
    const xx = x(p.at), y = i % 2 ? 14 : 28, anc = xx > W - 90 ? 'end' : xx < X0 + 60 ? 'start' : 'middle';
    o += `<text x="${xx}" y="${y}" text-anchor="${anc}" style="font-size:10.5px;font-weight:600;fill:#b42318">${esc(p.label)}</text>`;
  });
  if (!P.stretches.length) o += `<text x="${W / 2}" y="${top + L.length / 2 * (laneH + gap)}" text-anchor="middle" style="font-size:13px">Abhi koi stretch nahi. Neeche se pehla add karo.</text>`;
  svg.innerHTML = o;
  svg.querySelectorAll('.pg-seg').forEach(el => el.addEventListener('click', () => pgStartEdit(el.dataset.id)));
}

function pgDrawBars(total) {
  const P = pgData(), L = P.layers, svg = $('#pgBars'), W = 1000, X0 = 70, R = 240, barH = 30, gap = 18, top = 10, H = top + L.length * (barH + gap);
  svg.setAttribute('viewBox', `0 0 ${W} ${Math.max(H, 40)}`);
  const bw = W - X0 - R; let o = '';
  [0, 25, 50, 75, 100].forEach(p => { const xx = X0 + bw * p / 100; o += `<line x1="${xx}" x2="${xx}" y1="${top - 4}" y2="${H - gap + 4}" stroke="#dcdad4"/><text x="${xx}" y="${H + 8}" text-anchor="middle" style="font-size:10px">${p}%</text>`; });
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 14}`);
  L.forEach((l, i) => {
    const base = l.est ? l.est.len : total, y = top + i * (barH + gap), d = pgNetDone(l.t), p = Math.min(100, d / base * 100);
    o += `<text class="lbl" x="0" y="${y + barH / 2 + 5}">${esc(l.t)}</text><rect x="${X0}" y="${y}" width="${bw}" height="${barH}" fill="#ebe9e4" rx="3"/>`;
    if (pgStaffMode() && d > 0) {
      // har staff ka hissa alag rang mein (kul lambai wahi rahe, isliye anupaat mein)
      const groups = [...pgStaffList().map((x, k) => ({ name: x.name, col: PG_STAFF_COL[k % PG_STAFF_COL.length], rows: P.stretches.filter(r => r.t === l.t && pgStaffOf(r.date)?.id === x.id) })),
        { name: 'Date / staff nahi', col: '#9aa0a6', rows: P.stretches.filter(r => r.t === l.t && !pgStaffOf(r.date)) }]
        .map(g => ({ ...g, len: pgNetDoneOf(l.t, g.rows) })).filter(g => g.len > 0);
      const sum = groups.reduce((a, g) => a + g.len, 0) || 1; let xx = X0;
      groups.forEach(g => { const w = bw * p / 100 * g.len / sum, share = d * g.len / sum;
        o += `<rect x="${xx}" y="${y}" width="${w}" height="${barH}" fill="${g.col}" stroke="#fff" stroke-width="1"><title>${esc(g.name)}: ${pgLen(share)} (${(share / base * 100).toFixed(1)}%)</title></rect>`;
        if (w > 46) o += `<text x="${xx + w / 2}" y="${y + barH / 2 + 4}" text-anchor="middle" style="fill:#fff;font-size:10.5px;font-weight:600">${pgLen(share)}</text>`;
        xx += w; });
    } else o += `<rect x="${X0}" y="${y}" width="${bw * p / 100}" height="${barH}" fill="${l.color}" rx="3"/>`;
    o += `<text class="pct" x="${X0 + bw + 10}" y="${y + barH / 2 + 4}">${p.toFixed(1)}% · ${pgLen(d)} / ${pgLen(base)}</text>`;
  });
  svg.innerHTML = o;
  $('#pgBarHint').textContent = L.some(l => l.est) ? 'Har treatment ki estimate length ke saamne' : (P.road.end != null ? 'Poori road length ke saamne' : 'Road length set nahi — sabse door wali entry tak');
}

function pgDrawForm() {
  const L = pgData().layers;
  $('#pgPick').innerHTML = L.map(l => `<button type="button" data-t="${esc(l.t)}" style="--c:${l.color}" aria-pressed="${l.t === pgCurT}">${esc(l.t)}</button>`).join('');
  $('#pgFilter').innerHTML = ['ALL', ...L.map(l => l.t)].map(t => `<button type="button" data-f="${esc(t)}" aria-pressed="${t === pgFilterT}">${t === 'ALL' ? 'All' : esc(t)}</button>`).join('');
  if (!$('#pgDate').value) $('#pgDate').value = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}
function pgDrawTable() {
  const P = pgData(), ord = t => P.layers.findIndex(l => l.t === t), col = t => P.layers.find(l => l.t === t)?.color || '#999';
  const list = P.stretches.filter(r => pgFilterT === 'ALL' || r.t === pgFilterT).sort((a, b) => ord(a.t) - ord(b.t) || Math.min(a.from, a.to) - Math.min(b.from, b.to));
  if (!list.length) { $('#pgTable').innerHTML = `<p class="muted">${P.stretches.length ? 'Is treatment ka koi stretch nahi.' : 'Abhi koi stretch nahi.'}</p>`; return; }
  $('#pgTable').innerHTML = `<table class="grid"><thead><tr><th>Treatment</th><th>From</th><th>To</th><th>Length</th><th>Side</th><th>Date</th><th>Remark</th><th></th></tr></thead><tbody>${
    list.map(r => { const a = Math.min(r.from, r.to), b = Math.max(r.from, r.to);
      return `<tr><td class="l"><span class="pg-tag" style="--c:${col(r.t)}">${esc(r.t)}</span></td><td>${pgCh(a)}</td><td>${pgCh(b)}</td><td>${pgLen(b - a)}</td><td>${esc(r.side)}</td><td>${r.date ? dmy(r.date) : '—'}${pgStaffMode() ? `<div style="font-size:11px;color:${pgStaffOf(r.date)?.col || '#9aa0a6'};font-weight:600">${esc(pgStaffOf(r.date)?.name || 'staff nahi')}</div>` : ''}</td><td class="l">${esc(r.note || '')}</td>
        <td><button class="btn sm" data-pe="${esc(r.id)}">✏️</button> <button class="btn sm danger" data-pd="${esc(r.id)}">🗑</button></td></tr>`; }).join('')}</tbody></table>`;
}
function pgStartEdit(id) {
  const r = pgData().stretches.find(x => x.id === id); if (!r) return;
  pgEditing = id; pgCurT = r.t; pgDrawForm();
  $('#pgFrom').value = pgCh(Math.min(r.from, r.to)); $('#pgTo').value = pgCh(Math.max(r.from, r.to));
  $('#pgSide').value = r.side || 'Full'; $('#pgDate').value = r.date || ''; $('#pgNote').value = r.note || '';
  $('#pgFormTitle').textContent = 'Stretch edit karo'; $('#pgSave').textContent = '💾 Save changes'; $('#pgCancel').classList.remove('hidden');
  $('#pgFrom').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#pgFrom').focus();
}
function pgReset() {
  pgEditing = null; $('#pgFrom').value = $('#pgTo').value = $('#pgNote').value = ''; $('#pgSide').value = 'Full';
  $('#pgFormTitle').textContent = 'Stretch add karo'; $('#pgSave').textContent = '+ Stretch add karo'; $('#pgCancel').classList.add('hidden');
}

// ---- setup: road details, deductions, layers + estimate, facts
function pgDrawSetup() {
  const P = pgData(), r = P.road;
  const chs = a => (a || []).map(([x, y]) => pgCh(x) + '-' + pgCh(y)).join(', ');
  $('#pgSetup').innerHTML = `
    <div class="grid4" style="grid-template-columns:1fr 1fr">
      <label>Road name<input id="pgRName" value="${esc(r.name || '')}"></label>
      <label>Agency<input id="pgRAgency" value="${esc(r.agency || '')}"></label>
      <label>Start chainage<input id="pgRStart" value="${pgCh(r.start ?? 0)}"></label>
      <label>End chainage<input id="pgREnd" value="${r.end != null ? pgCh(r.end) : ''}" placeholder="8+400"></label>
      <label>Carriageway width (m)<input id="pgRCw" type="number" step="0.1" value="${r.cw || 5.5}"></label>
    </div>
    <label>Estimate mein nahi (har line: from-to naam chhota-naam)<textarea id="pgRDed" rows="2" placeholder="0+380-0+400 NH passed road part | NH">${esc((r.ded || []).map(d => `${pgCh(d.from)}-${pgCh(d.to)} ${d.label} | ${d.short || ''}`).join('\n'))}</textarea></label>
    <label>Junction / important points (har line: chainage naam)<textarea id="pgRPts" rows="2" placeholder="2+100 Rampura junction">${esc((r.points || []).map(p => `${pgCh(p.at)} ${p.label}`).join('\n'))}</textarea></label>
    <label>Estimate details (har line: heading: value)<textarea id="pgRFacts" rows="3" placeholder="TS amount: ₹ 4,95,43,000">${esc((r.facts || []).map(([k, v]) => `${k}: ${v}`).join('\n'))}</textarea></label>
    <h4 style="margin:10px 0 4px">Layers / treatments</h4>
    <div class="tablewrap"><table class="grid" id="pgLayerTbl"><thead><tr><th>Code</th><th>Naam</th><th>Thick (mm)</th><th>Density</th><th>Rang</th><th>Neeche layer</th><th>Est. length (m)</th><th>Est. MT</th><th>Rate/MT</th><th>Est. chainage</th><th></th></tr></thead><tbody>
    ${P.layers.map((l, i) => `<tr data-li="${i}"><td><input data-lf="t" value="${esc(l.t)}" style="width:60px"></td><td><input data-lf="name" value="${esc(l.name)}" style="width:110px"></td>
      <td><input data-lf="th" type="number" step="0.5" value="${+(l.th * 1000).toFixed(1)}" style="width:60px"></td><td><input data-lf="den" type="number" step="0.05" value="${l.den}" style="width:55px"></td>
      <td><input data-lf="color" type="color" value="${esc(l.color)}" style="width:44px;padding:1px"></td><td><input data-lf="below" value="${esc(l.below || '')}" style="width:60px"></td>
      <td><input data-lf="len" type="number" value="${l.est?.len ?? ''}" style="width:70px"></td><td><input data-lf="mt" type="number" value="${l.est?.mt ?? ''}" style="width:70px"></td>
      <td><input data-lf="rate" type="number" step="0.01" value="${l.est?.rate ?? ''}" style="width:80px"></td><td><input data-lf="ch" value="${esc(chs(l.est?.ch))}" placeholder="0+000-0+380, 0+400-3+240" style="width:210px"></td>
      <td><button class="btn sm danger" data-ldel="${i}">🗑</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="row"><button class="btn" id="pgAddLayer">+ Layer</button><button class="btn primary" id="pgSaveSetup">💾 Setup save karo</button></div>
    <p class="muted">Est. length khali ho to % poori road length ke saamne dikhega. "Neeche layer" (jaise SDBC ke liye BM) bharoge to bina neeche layer ke bichhaye hisse ki chetavani aayegi.</p>`;
}
function pgSaveSetup() {
  const P = pgData(), r = P.road;
  const st = $('#pgRStart').value.trim() ? pgParse($('#pgRStart').value) : 0, en = $('#pgREnd').value.trim() ? pgParse($('#pgREnd').value) : null;
  if (isNaN(st) || (en != null && isNaN(en))) return toast('Chainage format galat — jaise 8+400');
  if (en != null && en <= st) return toast('End chainage start se aage hona chahiye');
  const ded = [];
  for (const line of $('#pgRDed').value.split('\n').map(x => x.trim()).filter(Boolean)) {
    const m = line.match(/^(\S+)\s*-\s*(\S+)\s+([^|]*)\|?\s*(.*)$/);
    const a = m && pgParse(m[1]), b = m && pgParse(m[2]);
    if (!m || isNaN(a) || isNaN(b)) return toast('Is line ka format galat: ' + line);
    ded.push({ from: Math.min(a, b), to: Math.max(a, b), label: m[3].trim(), short: m[4].trim() });
  }
  const points = [];
  for (const line of $('#pgRPts').value.split('\n').map(x => x.trim()).filter(Boolean)) {
    const m = line.match(/^(\S+)\s+(.+)$/), a = m && pgParse(m[1]);
    if (!m || isNaN(a)) return toast('Point ka format galat: ' + line + ' (jaise 2+100 Rampura junction)');
    points.push({ at: a, label: m[2].trim() });
  }
  const facts = $('#pgRFacts').value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return i > 0 ? [x.slice(0, i).trim(), x.slice(i + 1).trim()] : [x, '']; });
  const layers = [];
  for (const tr of $$('#pgLayerTbl tbody tr')) {
    const g = k => tr.querySelector(`[data-lf="${k}"]`).value.trim();
    const t = g('t').toUpperCase(); if (!t) continue;
    const ch = [];
    for (const part of g('ch').split(',').map(x => x.trim()).filter(Boolean)) {
      const m = part.match(/^(\S+?)\s*-\s*(\S+)$/); const a = m && pgParse(m[1]), b = m && pgParse(m[2]);
      if (!m || isNaN(a) || isNaN(b)) return toast(`${t}: estimate chainage galat — ${part}`);
      ch.push([Math.min(a, b), Math.max(a, b)]);
    }
    const len = +g('len') || (ch.length ? ch.reduce((s, [a, b]) => s + b - a, 0) : 0), mt = +g('mt') || 0, rate = +g('rate') || 0;
    const old = P.layers.find(l => l.t === t);
    layers.push({ t, name: g('name') || t, spec: old?.spec || '', th: (+g('th') || 0) / 1000, den: +g('den') || 2.2, color: g('color') || '#888888',
      below: g('below').toUpperCase() || null, est: len ? { len, mt, rate, amt: mt && rate ? +(mt * rate).toFixed(2) : (old?.est?.amt || 0), ch } : null });
  }
  if (!layers.length) return toast('Kam se kam ek layer chahiye');
  Object.assign(r, { name: $('#pgRName').value.trim(), agency: $('#pgRAgency').value.trim(), start: st, end: en, cw: +$('#pgRCw').value || 5.5, ded, facts, points });
  // layer code badla to stretches mein bhi
  P.layers.forEach((l, i) => { const n = layers[i]; if (n && n.t !== l.t) P.stretches.forEach(s => { if (s.t === l.t) s.t = n.t; }); });
  P.layers = layers; save(); renderProgress(); toast('Setup save hua');
}

// ---- events
$('#pgPick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pgCurT = b.dataset.t; pgDrawForm(); });
$('#pgFilter').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pgFilterT = b.dataset.f; pgDrawForm(); pgDrawTable(); });
$('#pgCancel').addEventListener('click', pgReset);
$('#pgSave').addEventListener('click', () => {
  const a = pgParse($('#pgFrom').value), b = pgParse($('#pgTo').value);
  if (isNaN(a) || isNaN(b)) return toast('Dono chainage km+m mein daalo, jaise 2+350');
  if (a === b) return toast('From aur To chainage same hain');
  if (!pgCurT) return toast('Pehle layer chuno');
  const P = pgData(), data = { t: pgCurT, from: Math.min(a, b), to: Math.max(a, b), side: $('#pgSide').value, date: $('#pgDate').value || '', note: $('#pgNote').value.trim() };
  if (pgEditing) Object.assign(P.stretches.find(x => x.id === pgEditing), data);
  else P.stretches.push({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data });
  toast(`${pgEditing ? 'Update' : 'Add'}: ${data.t} ${pgCh(data.from)} to ${pgCh(data.to)}`);
  save(); pgReset(); renderProgress();
});
$('#pgTable').addEventListener('click', e => {
  const P = pgData();
  if (e.target.dataset.pe) return pgStartEdit(e.target.dataset.pe);
  const d = e.target.dataset.pd; if (!d) return;
  const r = P.stretches.find(x => x.id === d);
  if (!confirm(`${r.t} ${pgCh(r.from)} to ${pgCh(r.to)} delete karein?`)) return;
  P.stretches = P.stretches.filter(x => x.id !== d); if (pgEditing === d) pgReset(); save(); renderProgress();
});
$('#pgSetup').addEventListener('click', e => {
  if (e.target.id === 'pgSaveSetup') return pgSaveSetup();
  if (e.target.id === 'pgAddLayer') {
    const tb = $('#pgLayerTbl tbody'), i = tb.children.length;
    tb.insertAdjacentHTML('beforeend', `<tr data-li="${i}"><td><input data-lf="t" style="width:60px" placeholder="DBM"></td><td><input data-lf="name" style="width:110px" placeholder="50 mm DBM"></td>
      <td><input data-lf="th" type="number" step="0.5" style="width:60px" value="50"></td><td><input data-lf="den" type="number" step="0.05" style="width:55px" value="2.3"></td>
      <td><input data-lf="color" type="color" value="#4a6fa5" style="width:44px;padding:1px"></td><td><input data-lf="below" style="width:60px"></td>
      <td><input data-lf="len" type="number" style="width:70px"></td><td><input data-lf="mt" type="number" style="width:70px"></td><td><input data-lf="rate" type="number" style="width:80px"></td>
      <td><input data-lf="ch" style="width:210px"></td><td><button class="btn sm danger" data-ldel="${i}">🗑</button></td></tr>`);
    return;
  }
  const li = e.target.dataset.ldel;
  if (li != null) {
    const t = e.target.closest('tr').querySelector('[data-lf="t"]').value.trim().toUpperCase();
    const n = pgData().stretches.filter(s => s.t === t).length;
    if (n && !confirm(`${t} ke ${n} stretch bhi hat jayenge (Setup save karne par). Continue?`)) return;
    e.target.closest('tr').remove();
    if (n) pgData().stretches = pgData().stretches.filter(s => s.t !== t);
  }
});
$('#pgImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const p = JSON.parse(await f.text());
    if (!p || !p.stretches) throw new Error('Ye tracker backup nahi hai');
    const P = pgData();
    const list = Array.isArray(p.stretches) ? p.stretches : Object.entries(p.stretches).map(([id, v]) => ({ id, ...v }));
    let add = 0;
    list.forEach(s => {
      if (isNaN(s.from) || isNaN(s.to) || !s.t) return;
      const t = String(s.t).toUpperCase();
      if (!P.layers.some(l => l.t === t)) P.layers.push({ t, name: t, spec: '', th: 0.05, den: 2.2, color: '#888888', below: null, est: null });
      const ex = P.stretches.find(x => x.id === s.id);
      const row = { id: s.id || ('s' + Math.random().toString(36).slice(2, 10)), t, from: +s.from, to: +s.to, side: s.side || 'Full', date: s.date || '', note: s.note || '' };
      if (ex) Object.assign(ex, row); else { P.stretches.push(row); add++; }
    });
    if (p.road && confirm('Backup ki road details (chainage, NH/ROB, estimate) bhi lein?')) {
      const d = p.road; Object.assign(P.road, { name: d.name ?? P.road.name, start: d.start ?? P.road.start, end: d.end ?? P.road.end, cw: d.cw || P.road.cw, agency: d.agency ?? P.road.agency, ded: d.ded || P.road.ded });
      if (d.est) P.layers.forEach(l => { if (d.est[l.t]) l.est = d.est[l.t]; });
    }
    save(); renderProgress(); toast(`${add} naye stretch aaye (${list.length} file mein)`);
  } catch (err) { toast('Import fail: ' + err.message); }
});
