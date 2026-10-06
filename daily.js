/* ================= Daily actual tonnage =================
   Actual = jo tum haath se bharte ho (din-wise, mix-wise). Saath mein SCADA aur register ka aankda tulna ke liye. */
const DT_SEED = { '2026-09-24': { BSG: 416 }, '2026-09-25': { BSG: 599.57 }, '2026-09-26': { BM: 608.35 }, '2026-09-27': { BM: 313.45 }, '2026-09-28': { BM: 46.73 }, '2026-09-29': { BM: 599 },
  '2026-09-30': { SDBC: 201 }, '2026-10-01': { SDBC: 260 }, '2026-10-02': { BSG: 234 }, '2026-10-03': { BM: 661.64 }, '2026-10-05': { BM: 471.21 } };
function dtDB() {
  if (!DB.actual) DB.actual = {};
  if (!DB.actualSeeded && /tar[vw]ad/i.test(DB.settings.workName || '')) {   // Tarvadiya ka 24-09 se 05-10 tak ka data (ek baar)
    Object.entries(DT_SEED).forEach(([d, o]) => { DB.actual[d] = { ...o, ...(DB.actual[d] || {}) }; }); DB.actualSeeded = 1; save(); }
  return DB.actual;
}
const dtName = r => { const it = DB.items.find(i => i.code == r.item); return String(it ? it.name : r.mix || '').toUpperCase(); };
function dtMixes() { const A = dtDB(), s = new Set(DB.items.map(i => String(i.name).toUpperCase())); Object.values(A).forEach(o => Object.keys(o).forEach(k => s.add(k))); DB.runs.forEach(r => s.add(dtName(r))); s.delete(''); return [...s]; }
function dtRows() {
  const A = dtDB(), from = $('#dtFrom')?.value || '', to = $('#dtTo')?.value || '', m = {}, inR = d => !(from && d < from) && !(to && d > to);
  const row = d => m[d] = m[d] || { date: d, act: {}, sc: {}, rg: {}, trucks: 0 };
  Object.entries(A).forEach(([d, o]) => { if (inR(d)) Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) row(d).act[k] = +v || 0; }); });
  DB.runs.forEach(r => { if (!inR(r.date)) return; const x = row(r.date), k = dtName(r); x.sc[k] = (x.sc[k] || 0) + (+r.totalT || 0); x.rg[k] = (x.rg[k] || 0) + regTotal(r); x.trucks += r.trucks.length; });
  const S = o => Object.values(o).reduce((a, v) => a + v, 0); let cum = 0;
  return Object.values(m).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ ...d, tA: S(d.act), tS: S(d.sc), tR: S(d.rg), hasA: Object.keys(d.act).length > 0 })).map(d => ({ ...d, cum: cum += d.tA }));
}
function renderDaily() {
  const el = $('#dtBox'); if (!el) return; const R = dtRows(), M = dtMixes();
  $('#dtPasteHint').textContent = `Excel se copy karke yahan paste karo — column is kram mein: Tarikh, ${M.join(', ') || 'BSG, BM, SDBC'}`;
  $('#dtNewMix').innerHTML = M.map(k => `<option>${esc(k)}</option>`).join('');
  if (!R.length) { el.innerHTML = '<p class="muted">Abhi koi data nahi. Neeche se tarikh jodo ya Excel se paste karo.</p>'; return; }
  const sum = f => R.reduce((a, d) => a + f(d), 0), tA = sum(d => d.tA), tS = sum(d => d.tS), tR = sum(d => d.tR), nA = R.filter(d => d.hasA).length;
  el.innerHTML = `<div class="sum"><span>Din: <b>${R.length}</b></span><span>Actual: <b>${f2(tA)} MT</b></span><span>SCADA: <b>${f2(tS)} MT</b></span><span>Register: <b>${f2(tR)} MT</b></span><span>Roz ka ausat (actual): <b>${nA ? f2(tA / nA) : '—'} MT</b></span></div>
    <div class="tablewrap"><table class="grid"><thead><tr><th rowspan="2">Tarikh</th>${M.map(k => `<th colspan="3">${esc(k)}</th>`).join('')}<th colspan="3">Kul</th><th rowspan="2">Actual − SCADA</th><th rowspan="2">Actual jod (MT)</th></tr>
    <tr>${[...M, 0].map(() => '<th>Actual</th><th>SCADA</th><th>Register</th>').join('')}</tr></thead><tbody>` +
    R.map(d => `<tr><td>${dmy(d.date)}</td>${M.map(k => `<td><input type="number" step="any" data-dta="${d.date}|${esc(k)}" value="${d.act[k] ?? ''}" style="width:84px;font-weight:600"></td><td>${d.sc[k] != null ? f2(d.sc[k]) : '—'}</td><td>${d.rg[k] != null ? f2(d.rg[k]) : '—'}</td>`).join('')}
      <td><b>${d.hasA ? f2(d.tA) : '—'}</b></td><td>${d.tS ? f2(d.tS) : '—'}</td><td>${d.tR ? f2(d.tR) : '—'}</td><td>${d.hasA && d.tS ? f2(d.tA - d.tS) : ''}</td><td>${f2(d.cum)}</td></tr>`).join('') +
    `<tr>${['Kul', ...M.flatMap(k => [f2(sum(d => d.act[k] || 0)), f2(sum(d => d.sc[k] || 0)), f2(sum(d => d.rg[k] || 0))]), f2(tA), f2(tS), f2(tR), '', ''].map(v => `<th>${v}</th>`).join('')}</tr></tbody></table></div>`;
}
function dtSet(date, mix, v) { const A = dtDB(); A[date] = A[date] || {}; if (v === '' || v == null) delete A[date][mix]; else A[date][mix] = +v || 0; if (!Object.keys(A[date]).length) delete A[date]; }
document.addEventListener('change', e => {
  if (e.target.id === 'dtFrom' || e.target.id === 'dtTo') return renderDaily();
  const k = e.target.dataset?.dta; if (!k) return; const [date, mix] = k.split('|'); dtSet(date, mix, e.target.value.trim()); save(); renderDaily();
});
document.addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'dtClear') { $('#dtFrom').value = $('#dtTo').value = ''; return renderDaily(); }
  if (id === 'dtAdd') { const d = $('#dtNewDate').value, mix = ($('#dtNewMix').value || '').toUpperCase(), v = $('#dtNewVal').value; if (!d || !mix || v === '') return toast('Tarikh, mix aur MT bharo');
    dtSet(d, mix, v); save(); $('#dtNewVal').value = ''; renderDaily(); return toast('Jud gaya'); }
  if (id === 'dtPasteBtn') { const M = dtMixes().length ? dtMixes() : ['BSG', 'BM', 'SDBC']; let n = 0;
    $('#dtPaste').value.split(/\r?\n/).forEach(line => { const c = line.split(/\t|,|;/).map(x => x.trim()); let i = c.findIndex(x => fmtDateAny(x)); if (i < 0) return; const d = fmtDateAny(c[i]);
      M.forEach((k, j) => { const v = c[i + 1 + j]; if (v !== undefined && v !== '' && !isNaN(+v)) { dtSet(d, k, v); n++; } }); });
    if (!n) return toast('Koi aankda nahi mila — Tarikh aur MT wale column paste karo'); save(); $('#dtPaste').value = ''; renderDaily(); return toast(`${n} aankde jud gaye`); }
  if (id === 'dtPrint') { const R = dtRows(), M = dtMixes(), s = DB.settings; if (!R.length) return toast('Data nahi hai'); const sum = f => R.reduce((a, d) => a + f(d), 0);
    return doPrint(`<div class="reg"><h2>દૈનિક વાસ્તવિક ઉત્પાદન (મે.ટન)</h2><div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>
      <table><thead><tr><th rowspan="2">ક્રમ</th><th rowspan="2">તારીખ</th>${M.map(k => `<th colspan="3">${esc(k)}</th>`).join('')}<th colspan="3">કુલ</th><th rowspan="2">સંચિત વાસ્તવિક (મે.ટન)</th></tr>
      <tr>${[...M, 0].map(() => '<th>વાસ્તવિક</th><th>SCADA</th><th>રજીસ્ટર</th>').join('')}</tr></thead><tbody>` +
      R.map((d, i) => `<tr><td>${i + 1}</td><td>${dmy(d.date)}</td>${M.map(k => `<td>${d.act[k] != null ? f2(d.act[k]) : ''}</td><td>${d.sc[k] != null ? f2(d.sc[k]) : ''}</td><td>${d.rg[k] != null ? f2(d.rg[k]) : ''}</td>`).join('')}<td>${d.hasA ? f2(d.tA) : ''}</td><td>${d.tS ? f2(d.tS) : ''}</td><td>${d.tR ? f2(d.tR) : ''}</td><td>${f2(d.cum)}</td></tr>`).join('') +
      `<tr>${['', 'કુલ', ...M.flatMap(k => [f2(sum(d => d.act[k] || 0)), f2(sum(d => d.sc[k] || 0)), f2(sum(d => d.rg[k] || 0))]), f2(sum(d => d.tA)), f2(sum(d => d.tS)), f2(sum(d => d.tR)), ''].map(v => `<td class="tot">${v}</td>`).join('')}</tr></tbody></table></div>`); }
  if (id === 'dtXls') { const R = dtRows(), M = dtMixes(), s = DB.settings; if (!R.length) return toast('Data nahi hai'); const nz = v => v == null ? '' : +f2(v);
    const a = [['દૈનિક વાસ્તવિક ઉત્પાદન (મે.ટન)'], [`કામનું નામ: ${s.workName || ''}`, '', '', `એજન્સી: ${s.agency || ''}`], [],
      ['તારીખ', ...M.flatMap(k => [`${k} વાસ્તવિક`, `${k} SCADA`, `${k} રજીસ્ટર`]), 'કુલ વાસ્તવિક', 'કુલ SCADA', 'કુલ રજીસ્ટર', 'સંચિત વાસ્તવિક']];
    R.forEach(d => a.push([dmy(d.date), ...M.flatMap(k => [nz(d.act[k]), nz(d.sc[k]), nz(d.rg[k])]), d.hasA ? +f2(d.tA) : '', d.tS ? +f2(d.tS) : '', d.tR ? +f2(d.tR) : '', +f2(d.cum)]));
    const n = a[3].length, col = c => XLSX.utils.encode_col(c);
    a.push(['કુલ', ...[...Array(n - 2)].map((_, i) => ({ t: 'n', f: `SUM(${col(i + 1)}5:${col(i + 1)}${4 + R.length})` })), '']);
    const ws = XLSX.utils.aoa_to_sheet(a); ws['!cols'] = a[3].map((_, i) => ({ wch: i ? 16 : 12 })); ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: n - 1 } }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Daily tonnage'); XLSX.writeFile(wb, 'Daily_Actual_Tonnage.xlsx'); }
});
