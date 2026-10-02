/* Paver register — Parishisht-1: Tack coat / surface dressing / liquid / seal coat ke daamar chhantkav ki nondh
   Tack coat daamar = (plant se us din bana tack-coat wala item) area × estimate rate.
   Wahi daamar Plant Parishisht-1 col 7 (છાંટવા માટે) mein nikalta hai aur yahan opening mein aata hai. */
'use strict';

const pvKg = v => Math.round(v).toLocaleString('en-IN');
function pvChainAuto(date, names) {   // Progress tab ke us din ke stretch (usi layer ke)
  const st = (DB.progress?.stretches || []).filter(s => s.date === date && names.includes(String(s.t).toUpperCase()));
  const fmt = m => Math.floor(m / 1000) + '+' + String(Math.round(m) % 1000).padStart(3, '0');
  return st.sort((a, b) => a.from - b.from).map(s => `${fmt(s.from)}–${fmt(s.to)}${s.side !== 'Full' ? ' ' + s.side : ''}`).join(', ');
}
function paverRows() {
  const a = $('#pvFrom').value, b = $('#pvTo').value;
  const issues = tackIssues();
  const dates = new Set(issues.map(x => x.date));
  DB.runs.forEach(r => { if (tackUse(r.date).kg > 0) dates.add(r.date); });
  let bal = 0; const out = [];
  [...dates].sort().forEach(date => {
    const iss = issues.filter(x => x.date === date);
    const pm = DB.tack[date];   // plant P-1 mein manual likha ho to wahi aavak
    const rcv = (pm !== undefined && pm !== null && pm !== '') ? +pm * 1000 : iss.reduce((s, x) => s + x.kg, 0);
    const u = tackUse(date), open = bal, total = open + rcv, cons = u.kg;
    bal = total - cons;
    const m = DB.pv1[date] || {}, names = u.parts.map(p => String(p.name).toUpperCase()), chainAuto = pvChainAuto(date, names);
    const area = u.parts.reduce((s, p) => s + p.area, 0);
    out.push({
      date, open, rcv, total, cons, close: bal, area, parts: u.parts, iss, m,
      rate: area ? cons / area : 0,
      spec: u.parts.map(p => (u.parts.length > 1 ? p.name + ' ' : '') + p.rate + ' kg/sq.m').join(', '),
      chain: m.chain || chainAuto, chainAuto,
      calc: [...iss.map(x => `આવક: ${x.name} અંદાજ ${f2(x.estQty)} ટન ÷ (${x.den} × ${x.th / 1000}) × ${x.rate} = ${pvKg(x.kg)} કિ.ગ્રા.`),
        ...u.parts.map(p => `${p.name} ${f2(p.qty)} ટન ÷ (${p.den} × ${p.th / 1000}) = ${pvKg(p.area)} ચો.મી.`), `બાકી ${pvKg(bal)} કિ.ગ્રા.`].join('; ')
    });
  });
  return out.filter(r => (!a || r.date >= a) && (!b || r.date <= b));
}

function renderPaver() {
  const R = paverRows();
  const noRate = DB.items.every(i => !itemParams(i).tack || !itemEstQty(i));
  const inp = (date, k, v, w = 100, ph = '') => `<input data-pv="${date}" data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" style="width:${w}px">`;
  if (!R.length) {
    $('#pvTable1').innerHTML = `<tr><td class="muted">${noRate ? 'Settings → Tender items mein tack coat wale item (jaise BM, SDBC) ka <b>Tack coat (kg/sq.m)</b> aur <b>Estimate qty (MT)</b> bharo.' : 'Is range mein tack coat wale item ka koi register nahi.'}</td></tr>`;
    return;
  }
  $('#pvTable1').innerHTML = `<thead><tr><th>1 Tarikh</th><th>2 Ughdati silak (kg)</th><th>3 Aavak</th><th>4 Kul (kg)</th><th>5 Khata ni nondh</th><th>6 Vaparash (kg)</th>
    <th>7 Sthal / chainage</th><th>8 Vistar (sq.m)</th><th>9 Vaparash dar</th><th>10 Kul khata</th><th>11 Niyat dhoran</th><th>Baaki (kg)</th><th>13 Remark</th></tr></thead><tbody>` +
    R.map(r => `<tr><td>${dmy(r.date)}</td><td>${pvKg(r.open)}</td><td>${r.rcv ? '<b>' + pvKg(r.rcv) + '</b><div class="muted" style="font-size:11px">Plant P-1 se</div>' : ''}</td><td>${pvKg(r.total)}</td>
      <td>${inp(r.date, 'khatu', r.m.khatu, 120, '1 ખાતું = … ચો.મી.')}</td><td><b>${r.cons ? pvKg(r.cons) : ''}</b></td>
      <td>${inp(r.date, 'chain', r.m.chain, 150, r.chainAuto || 'chainage')}${r.chainAuto && !r.m.chain ? '<div class="muted" style="font-size:11px">Progress se</div>' : ''}</td>
      <td>${r.area ? pvKg(r.area) : ''}</td><td>${r.rate ? f2(r.rate) + ' kg/sq.m' : ''}</td><td>${inp(r.date, 'kul', r.m.kul, 70)}</td><td>${esc(r.spec)}</td>
      <td style="${r.close < -0.5 ? 'color:var(--bad);font-weight:700' : ''}">${pvKg(r.close)}${r.close < -0.5 ? '<div class="flag">⚠ issue se zyada vaparash</div>' : ''}</td>
      <td class="l" style="white-space:normal;min-width:220px"><span class="muted" style="font-size:11px">${esc(r.calc)}</span><br>${inp(r.date, 'remark', r.m.remark, 180, 'remark')}</td></tr>`).join('') + '</tbody>';
}
const pvRunDate = key => DB.runs.find(r => r.id === String(key).split(':')[0])?.date || '';
$('#pvTable1').addEventListener('change', e => {
  const d = e.target.dataset.pv; if (!d) return;
  if (isLocked('paver', d)) { lockMsg('paver', d); return renderPaver(); }
  DB.pv1[d] = DB.pv1[d] || {}; DB.pv1[d][e.target.dataset.k] = e.target.value.trim(); save(); renderPaver();
});
['#pvFrom', '#pvTo'].forEach(k => $(k).addEventListener('change', renderPaver));

function printPv1() { return staffGroups(paverRows(), 'paver', r => r.date).map(g => printPv1One(g.items, g.staff)).join(''); }
function printPv1One(R, staff) {
  if (!R.length) return '';
  const s = DB.settings;
  const rows = R.map(r => `<tr><td>${dmy(r.date)}</td><td>${pvKg(r.open)}</td><td>${r.rcv ? pvKg(r.rcv) : ''}</td><td>${pvKg(r.total)}</td><td>${esc(r.m.khatu || '')}</td>
    <td>${r.cons ? pvKg(r.cons) : ''}</td><td>${esc(r.chain || '')}</td><td>${r.area ? pvKg(r.area) : ''}</td><td>${r.rate ? f2(r.rate) + ' કિ.ગ્રા./ચો.મી.' : ''}</td><td>${esc(r.m.kul || '')}</td>
    <td>${esc(r.spec.replace(/kg\/sq\.m/g, 'કિ.ગ્રા./ચો.મી.'))}</td><td></td><td style="font-size:9px">${esc(r.calc)}${r.m.remark ? '; ' + esc(r.m.remark) : ''}</td></tr>`).join('');
  const w = [6, 7, 5, 7, 11, 7, 11, 7, 7, 6, 9, 7, 10];
  return `<div class="reg"><h2>પરિશિષ્ટ - ૧</h2><h4>ટેકકોટ, સરફેઈસ ડ્રેસીંગ, લીક્વીડ, સીલકોટ માટે ડામરના છંટકાવની નોંધ (પેવર સાઈટ)</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>${staffLine('paver', staff)}
  <table class="p1"><colgroup>${w.map(x => `<col style="width:${x}%">`).join('')}</colgroup><thead>
  <tr><th>તારીખ</th><th>ડામરની ઉઘડતી સિલક</th><th>ડામરની આવક</th><th>કુલ ડામરનો જથ્થો</th><th>ડામરના છંટકાવ માટે ખાતાની નોંધ<br>૧. ખાતું ....ચો. મીટર<br>૧. ડોલ ....કી.ગ્રામ</th>
  <th>ડામરનો વપરાશ કિ.ગ્રામ</th><th>ડામરનો વપરાશ થયો હોય તે સ્થળ કિ.મી. (ચેઈનેજ)</th><th>ડામર છંટકાવવાનો વિસ્તાર ચો.મીટર</th><th>ડામર છંટકાવવાનો વપરાશ દર</th>
  <th>કુલ ખાતા</th><th>નિયત ધોરણે અથવા નિર્દિષ્ટ વિગતો મુજબ ડામર છંટકાવનો વપરાશ દર</th><th>જથ્થો અને માપ નોંધનારની સહી</th><th>રીમાર્કસ</th></tr>
  <tr class="num">${Array.from({ length: 13 }, (_, i) => `<td>${i + 1}</td>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
  <p style="font-size:10px">જથ્થો કિલોગ્રામમાં. છંટકાવનો વિસ્તાર = મિશ્રણનો જથ્થો ÷ (ઘનતા × જાડાઈ). આવક: ટેકકોટ વાળી આઈટમનો પૂરો ડામર (અંદાજ મુજબ) પ્લાન્ટ રજીસ્ટર પરિશિષ્ટ-૧ (છાંટવા માટે) માંથી એક જ વખત.</p></div>`;
}
$('#pvPrint1').addEventListener('click', () => { const h = printPv1(); h ? doPrint(h) : toast('Print ke liye data nahi'); });
$('#pvXls1').addEventListener('click', () => {
  const R = paverRows(); if (!R.length) return toast('Data nahi');
  const a = [['1 Tarikh', '2 Ughdati silak (kg)', '3 Aavak', '4 Kul (kg)', '5 Khata ni nondh', '6 Vaparash (kg)', '7 Chainage', '8 Vistar (sq.m)', '9 Vaparash dar (kg/sq.m)', '10 Kul khata', '11 Niyat dhoran', '12 Sahi', '13 Remark']];
  R.forEach(r => a.push([dmy(r.date), Math.round(r.open), r.rcv ? Math.round(r.rcv) : '', Math.round(r.total), r.m.khatu || '', Math.round(r.cons), r.chain || '', Math.round(r.area), +f2(r.rate), r.m.kul || '', r.spec, '', r.calc + (r.m.remark ? '; ' + r.m.remark : '')]));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Paver-P1');
  XLSX.writeFile(wb, 'Paver_Parishisht1.xlsx');
});

/* ================= Paver Parishisht-2: truck-wise temperature + chainage =================
   Chainage: Progress (site par hua area) ÷ plant tonnage = sq.m/T; truck length = net × sq.m/T ÷ (width/2).
   LHS lane shuru se aakhir tak, phir RHS shuru se. Temperature: site par naapa hua (manual). */
function pvAddMin(t, m) { const [h, mi] = String(t || '0:0').split(':').map(Number); const x = h * 60 + mi + (+m || 0); return `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; }
const pvFmtCh = m => Math.floor(Math.round(m) / 1000) + '+' + String(Math.round(m) % 1000).padStart(3, '0');
function pv2Build(upto) {
  const P = DB.progress || { road: { cw: 5.5 }, layers: [], stretches: [] };
  const half = (+P.road?.cw || 5.5) / 2;
  const runs = DB.runs.filter(r => r.date <= upto).sort((a, b) => runKey(a).localeCompare(runKey(b)));
  const alloc = {}, summary = [], lens = {}, pieces = {};
  [...new Set(runs.map(r => r.item))].forEach(code => {
    const it = DB.items.find(i => i.code == code), name = String(it?.name || runs.find(r => r.item == code)?.mix || '').toUpperCase();
    const st = (P.stretches || []).filter(s => String(s.t).toUpperCase() === name && (!s.date || s.date <= upto));
    const lane = side => pgMerge(st.filter(s => s.side === 'Full' || s.side === side).map(s => [s.from, s.to]));
    const segs = [...lane('LHS').map(([a, b]) => ({ a, b, side: 'LHS' })), ...lane('RHS').map(([a, b]) => ({ a, b, side: 'RHS' }))];
    const laneLen = segs.reduce((s, g) => s + g.b - g.a, 0);
    const itemRuns = runs.filter(r => r.item == code), tons = itemRuns.reduce((s, r) => s + regTotal(r), 0);
    const p = it ? itemParams(it) : null;
    summary.push({ code, name, tons, laneLen, area: laneLen * half, perT: tons ? laneLen * half / tons : 0, theo: p ? 1 / (p.den * p.th / 1000) : 0, half });
    if (!laneLen || !tons) return;
    // 🔒 lock: us date tak ke trucks ki chainage fix; baaki trucks bachi hui lane par
    const LK = DB.pvLock, isLk = (r, i) => LK && r.date <= LK.upto && LK.pieces && LK.pieces[r.id + ':' + i];
    let free = segs, freeTons = tons;
    if (LK) {
      const used = { LHS: [], RHS: [] }; let lkTons = 0;
      itemRuns.forEach(r => r.trucks.forEach((t, i) => { if (!isLk(r, i)) return; const k = r.id + ':' + i;
        alloc[k] = LK.alloc[k] || ''; lens[k] = LK.lens[k]; pieces[k] = LK.pieces[k]; lkTons += +t.net / 1000;
        LK.pieces[k].forEach(pc => used[pc.side].push([pc.a, pc.b])); }));
      free = [];
      segs.forEach(g => { let cur = g.a;
        pgMerge(used[g.side]).forEach(([ua, ub]) => { if (ub <= cur || ua >= g.b) return; if (ua > cur + 0.01) free.push({ a: cur, b: Math.min(ua, g.b), side: g.side }); cur = Math.max(cur, ub); });
        if (cur < g.b - 0.01) free.push({ a: cur, b: g.b, side: g.side }); });
      freeTons = tons - lkTons;
    }
    const freeLen = free.reduce((x, g) => x + g.b - g.a, 0);
    if (!freeLen || freeTons <= 0) return;
    let si = 0, pos = free[0].a;
    itemRuns.forEach(r => r.trucks.forEach((t, i) => {
      if (isLk(r, i)) return;
      let need = (+t.net / 1000) * freeLen / freeTons; const pcs = [];
      lens[r.id + ':' + i] = { len: need, perT: freeLen * half / freeTons };
      while (need > 0.01 && si < free.length) {
        const g = free[si], take = Math.min(need, g.b - pos);
        pcs.push({ a: pos, b: pos + take, side: g.side });
        pos += take; need -= take;
        if (g.b - pos < 0.01) { si++; if (si < free.length) pos = free[si].a; }
      }
      pieces[r.id + ':' + i] = pcs;
      const bySide = {};
      pcs.forEach(pc => { (bySide[pc.side] = bySide[pc.side] || []).push(`${pvFmtCh(pc.a)}–${pvFmtCh(pc.b)}`); });
      alloc[r.id + ':' + i] = Object.entries(bySide).map(([sd, arr]) => `${arr.join(', ')} ${sd}`).join('; ');
    }));
  });
  return { alloc, summary, half, lens, pieces };
}
function pv2Rows() {
  const upto = DB.pv2upto; if (!upto) return { rows: [], summary: [] };
  const { alloc, summary } = pv2Build(upto);
  const a = $('#pv2From').value, b = $('#pv2To').value, tr = +DB.settings.travelMin || 0;
  const rows = [];
  DB.runs.filter(r => r.date <= upto && (!a || r.date >= a) && (!b || r.date <= b)).sort((x, y) => runKey(x).localeCompare(runKey(y)))
    .forEach(r => r.trucks.forEach((t, i) => {
      const key = r.id + ':' + i, m = DB.pv2[key] || {};
      rows.push({ key, date: r.date, time: pvAddMin(t.time, tr), item: itemLabel(r.item) || r.mix, veh: t.veh, m, chain: alloc[key] || '', first: i === 0 });
    }));
  return { rows, summary };
}
function renderPaver2() {
  const upto = DB.pv2upto, lastRun = DB.runs.map(r => r.date).sort().pop() || '';
  $('#pv2Travel').value = DB.settings.travelMin ?? 30;
  $('#pv2Gate').innerHTML = upto
    ? `<div class="sum"><span>✅ Progress <b>${dmy(upto)}</b> tak poora confirm kiya</span>${lastRun > upto ? `<span class="flag">⚠ ${dmy(lastRun)} tak ke trucks hain — Progress update karke date aage badhao</span>` : ''}
       <button class="btn sm" id="pv2Reset">Date badlo</button></div>`
    : `<div class="card" style="background:#fffaeb;border-color:#fedf89">
        <b>Pehle Progress section poora karo.</b><br>Paver register ki chainage Progress tab ke stretches (site par hua kaam) se nikalti hai. Jis date tak ka register bharna hai, us date tak ke saare stretches Progress mein daal do.
        <div class="row"><button class="btn" id="pv2GoPg">📊 Progress tab kholo</button>
        <label>Progress kis date tak poora hai?<input type="date" id="pv2UptoIn" value="${lastRun}"></label>
        <button class="btn primary" id="pv2Ok">✅ Haan, is date tak Progress poora hai</button></div></div>`;
  $('#pv2Body').classList.toggle('hidden', !upto);
  if (!upto) return;
  const { rows, summary } = pv2Rows(), minT = +DB.settings.paverMinT || 130;
  $('#pv2Sum').innerHTML = `<div class="tablewrap"><table class="grid"><thead><tr><th>Item</th><th>Plant se (T)</th><th>Site par lane lambai</th><th>Area (sq.m, ${summary[0] ? f2(summary[0].half) : ''} m lane)</th><th>Asli sq.m/T</th><th>Design sq.m/T</th><th></th></tr></thead><tbody>
    ${summary.map(s => { const d = s.theo && s.perT ? (s.perT - s.theo) / s.theo * 100 : 0;
      return `<tr><td>${esc(s.name)}</td><td>${f2(s.tons)}</td><td>${s.laneLen ? pvKg(s.laneLen) + ' m' : '<span class="flag">Progress mein stretch nahi</span>'}</td><td>${s.area ? pvKg(s.area) : '—'}</td>
        <td><b>${s.perT ? f2(s.perT) : '—'}</b></td><td>${s.theo ? f2(s.theo) : '—'}</td><td>${Math.abs(d) > 15 ? `<span class="flag">⚠ ${f2(d)}% farak — Progress check karo</span>` : s.perT ? 'OK' : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const inp = (key, k, v, w = 60, type = 'number') => `<input data-pv2="${key}" data-k="${k}" type="${type}" value="${esc(v ?? '')}" style="width:${w}px">`;
  $('#pv2Table').innerHTML = `<thead><tr><th>1 Tarikh</th><th>2 Samay</th><th>3 Item / mishran</th><th>4 Truck</th><th>5 Garam daamar °C</th><th>6 Mishran °C</th><th>7 Chainage</th><th>9 Remark</th></tr></thead><tbody>` +
    (rows.map(r => { const low = (r.m.tm !== undefined && r.m.tm !== '' && +r.m.tm < minT);
      return `<tr class="${low ? 'warn' : ''}"><td>${r.first ? (isLocked('paver', r.date) ? '🔒 ' : '') + dmy(r.date) : ''}</td><td>${r.time}</td><td>${r.first ? esc(r.item) : ''}</td><td>${esc(r.veh)}</td>
      <td>${inp(r.key, 'tb', r.m.tb)}</td><td>${inp(r.key, 'tm', r.m.tm)}${low ? `<div class="flag">⚠ ${minT}°C se kam</div>` : ''}</td>
      <td class="l">${r.chain ? esc(r.chain) : '<span class="flag">Progress mein is item ka stretch nahi</span>'}</td><td>${inp(r.key, 'remark', r.m.remark, 120, 'text')}</td></tr>`; }).join('')
      || '<tr><td colspan="8" class="muted">Is range mein koi truck nahi</td></tr>') + '</tbody>';
}
$('#pv2Gate').addEventListener('click', e => {
  if (e.target.id === 'pv2GoPg') return showTab('progress');
  if (e.target.id === 'pv2Ok') { const v = $('#pv2UptoIn').value; if (!v) return toast('Date chuno'); if (lockDate('paver') && v < lockDate('paver')) return toast(`🔒 ${dmy(lockDate('paver'))} tak lock hai — isse pehle ki date nahi`); DB.pv2upto = v; save(); return renderPaver(); }
  if (e.target.id === 'pv2Reset') { DB.pv2upto = ''; save(); renderPaver(); }
});
$('#pv2Table').addEventListener('change', e => {
  const k = e.target.dataset.pv2; if (!k) return;
  if (isLocked('paver', pvRunDate(k))) { lockMsg('paver', pvRunDate(k)); return renderPaver(); }
  DB.pv2[k] = DB.pv2[k] || {}; DB.pv2[k][e.target.dataset.k] = e.target.value.trim(); save(); renderPaver2();
});
$('#pv2Travel').addEventListener('change', e => { DB.settings.travelMin = +e.target.value || 0; save(); renderPaver(); });
['#pv2From', '#pv2To'].forEach(k => $(k).addEventListener('change', renderPaver2));
function printPv2() { return staffGroups(pv2Rows().rows, 'paver', r => r.date).map(g => printPv2One(g.items, g.staff)).join(''); }
function printPv2One(rows, staff) {
  if (!rows.length) return '';
  const s = DB.settings;
  const body = rows.map((r, n) => `<tr><td>${r.first || !n ? dmy(r.date) : ''}</td><td>${r.time}</td><td>${r.first || !n ? esc(r.item) : ''}</td><td>${esc(r.veh)}</td>
    <td>${r.m.tb ? esc(r.m.tb) + '°C' : ''}</td><td>${r.m.tm ? esc(r.m.tm) + '°C' : ''}</td><td style="font-size:9.5px">${esc(r.chain)}</td><td></td><td>${esc(r.m.remark || '')}</td></tr>`).join('');
  const w = [8, 7, 12, 8, 8, 8, 27, 10, 12];
  return `<div class="reg"><h2>પરિશિષ્ટ - ૨</h2><h4>પેવર સાઈટ ઉપર ટેકકોટ માટેના ડામર તથા મિશ્રણ (મીક્સ) ના ઉષ્ણતામાનની નોંધ</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>${staffLine('paver', staff)}
  <table class="p1"><colgroup>${w.map(x => `<col style="width:${x}%">`).join('')}</colgroup><thead>
  <tr><th rowspan="2">તારીખ</th><th rowspan="2">સમય</th><th rowspan="2">ટેન્ડર આઈટમ નંબર તથા મીશ્રણનો પ્રકાર</th><th rowspan="2">ટ્રક અથવા ડમ્પર નંબર</th>
  <th colspan="2">ઉષ્ણતામાનની નોંધ ફેરનહાઈટ/સેન્ટીગ્રેડ અંશ</th><th rowspan="2">મીશ્રણ જે સ્થળે પાથરવાનું છે તેના કિ.મી. ચેઈનેજ વગેરે</th><th rowspan="2">ઉષ્ણતામાન નોંધનારની સહી</th><th rowspan="2">રીમાર્કસ</th></tr>
  <tr><th>ગરમ ડામરનું</th><th>મીશ્રણનું</th></tr>
  <tr class="num">${Array.from({ length: 9 }, (_, i) => `<td>${i + 1}</td>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
$('#pv2Print').addEventListener('click', () => { const h = printPv2(); h ? doPrint(h) : toast('Print ke liye data nahi'); });
$('#pv2Xls').addEventListener('click', () => {
  const { rows } = pv2Rows(); if (!rows.length) return toast('Data nahi');
  const a = [['1 Tarikh', '2 Samay', '3 Item', '4 Truck', '5 Garam daamar °C', '6 Mishran °C', '7 Chainage', '8 Sahi', '9 Remark']];
  rows.forEach(r => a.push([dmy(r.date), r.time, r.item, r.veh, r.m.tb || '', r.m.tm || '', r.chain, '', r.m.remark || '']));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Paver-P2');
  XLSX.writeFile(wb, 'Paver_Parishisht2.xlsx');
});
const _renderPaver1 = renderPaver;
renderPaver = function () { _renderPaver1(); renderPaver2(); };


/* ================= Paver Parishisht-4: daamar, kapchi, mishran vaparash ================= */
function pv4Rows() {
  const upto = DB.pv2upto; if (!upto) return [];
  const { alloc, lens, half } = pv2Build(upto);
  const a = $('#pv4From').value, b = $('#pv4To').value, tr = +DB.settings.travelMin || 0;
  const rows = []; let sr = 0;
  DB.runs.filter(r => r.date <= upto && (!a || r.date >= a) && (!b || r.date <= b)).sort((x, y) => runKey(x).localeCompare(runKey(y)))
    .forEach(r => {
      const it = DB.items.find(i => i.code == r.item), p = it ? itemParams(it) : null;
      r.trucks.forEach((t, i) => {
        const key = r.id + ':' + i, m = DB.pv4[key] || {}, L = lens[key];
        const area = L ? L.len * half : 0;
        const calcT = area && p ? (+t.net / 1000) / (area * p.den) * 1000 : 0;   // mm
        const lcr = ['l', 'c', 'r'].map(k => m[k] === undefined || m[k] === '' ? null : +m[k]);
        const filled = lcr.filter(x => x != null);
        const avg = filled.length === 3 ? filled.reduce((s, x) => s + x, 0) / 3 : null;
        rows.push({ key, sr: ++sr, date: r.date, first: i === 0, last: i === r.trucks.length - 1, item: itemLabel(r.item) || r.mix,
          time: pvAddMin(t.time, tr), veh: t.veh, gp: t.gp, net: +t.net, dayTot: regTotal(r), spec: p ? p.th : '', m, lcr, avg, calcT,
          len: L ? L.len : 0, half, area, chain: alloc[key] || '' });
      });
    });
  return rows;
}
function renderPaver4() {
  const upto = DB.pv2upto;
  $('#pv4Gate').classList.toggle('hidden', !!upto); $('#pv4Body').classList.toggle('hidden', !upto);
  if (!upto) return;
  const R = pv4Rows();
  const inp = (key, k, v) => `<input data-pv4="${key}" data-k="${k}" type="number" step="0.5" value="${esc(v ?? '')}" style="width:52px">`;
  $('#pv4Table').innerHTML = `<thead><tr><th>1</th><th>2 Tarikh</th><th>3 Item</th><th>4 Samay</th><th>5 Truck</th><th>6 Gate pass</th><th>7 Net (kg)</th><th>8 Din ka kul (T)</th>
    <th>9 Daabi dhaar (mm)</th><th>10 Beech (mm)</th><th>11 Jamni dhaar (mm)</th><th>12 Sarasari (mm)</th><th>13 Niyat (mm)</th><th>14 L × W</th><th>15 Chainage</th><th>18 Remark</th></tr></thead><tbody>` +
    (R.map(r => {
      const low = r.lcr.some(x => x != null && x < r.spec) || (r.avg != null && r.avg < r.spec);
      return `<tr class="${low ? 'warn' : ''}"><td>${r.sr}</td><td>${r.first ? (isLocked('paver', r.date) ? '🔒 ' : '') + dmy(r.date) : ''}</td><td>${r.first ? esc(r.item) : ''}</td><td>${r.time}</td><td>${esc(r.veh)}</td><td>${esc(r.gp)}</td><td>${r.net}</td>
      <td>${r.last ? f2(r.dayTot) : ''}</td><td>${inp(r.key, 'l', r.m.l)}</td><td>${inp(r.key, 'c', r.m.c)}</td><td>${inp(r.key, 'r', r.m.r)}</td>
      <td><b>${r.avg != null ? f2(r.avg) : ''}</b>${low ? '<div class="flag">⚠ niyat se kam</div>' : ''}${r.calcT ? `<div class="muted" style="font-size:10px" title="Sirf app mein milan ke liye, print mein nahi">ref ${f2(r.calcT)}</div>` : ''}</td>
      <td>${r.spec}</td><td>${r.len ? `${f2(r.len)} × ${f2(r.half)}` : ''}</td><td class="l" style="font-size:12px">${esc(r.chain)}</td>
      <td><input data-pv4="${r.key}" data-k="remark" value="${esc(r.m.remark || '')}" style="width:110px"></td></tr>`; }).join('')
      || '<tr><td colspan="16" class="muted">Is range mein koi truck nahi</td></tr>') + '</tbody>';
}
$('#pv4Table').addEventListener('change', e => {
  const k = e.target.dataset.pv4; if (!k) return;
  if (isLocked('paver', pvRunDate(k))) { lockMsg('paver', pvRunDate(k)); return renderPaver(); }
  DB.pv4[k] = DB.pv4[k] || {}; DB.pv4[k][e.target.dataset.k] = e.target.value.trim(); save(); renderPaver4();
});
['#pv4From', '#pv4To'].forEach(k => $(k).addEventListener('change', renderPaver4));
function printPv4() { return staffGroups(pv4Rows(), 'paver', r => r.date).map(g => printPv4One(g.items, g.staff)).join(''); }
function printPv4One(R, staff) {
  if (!R.length) return '';
  const s = DB.settings, v = x => x == null ? '' : f2(x);
  const body = R.map(r => `<tr><td>${r.sr}</td><td>${r.first ? dmy(r.date) : ''}</td><td>${r.first ? esc(r.item) : ''}</td><td>${r.time}</td><td>${esc(r.veh)}</td><td>${esc(r.gp)}</td>
    <td>${r.net}</td><td>${r.last ? f2(r.dayTot) + ' ટન' : ''}</td><td>${v(r.lcr[0])}</td><td>${v(r.lcr[1])}</td><td>${v(r.lcr[2])}</td>
    <td>${r.avg != null ? f2(r.avg) : ''}</td><td>${r.spec} મી.મી.</td><td>${r.len ? `${f2(r.len)} × ${f2(r.half)}` : ''}</td>
    <td style="font-size:9px">${esc(r.chain)}</td><td></td><td></td><td>${esc(r.m.remark || '')}</td></tr>`).join('');
  const w = [3, 5.5, 6, 4.5, 4.5, 5, 5, 5.5, 5, 5, 5, 5, 5, 7.5, 12, 5.5, 5.5, 6];
  return `<div class="reg"><h2>પરિશિષ્ટ - ૪</h2><h4>પેવર સાઈટ ઉપર કામ ઉપરના ડામર, કપચી, મીશ્રણ મીક્સના વપરાશની નોંધ</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>${staffLine('paver', staff)}
  <table class="p1"><colgroup>${w.map(x => `<col style="width:${x}%">`).join('')}</colgroup><thead>
  <tr><th rowspan="2">ક્રમાંક</th><th rowspan="2">તારીખ</th><th rowspan="2">ટેન્ડર આઈટમ નંબર તથા આઈટમનું વર્ણન ટૂંકમાં</th><th colspan="3">ટ્રક અથવા ડામરની વિગત</th>
  <th rowspan="2">મીશ્રણનું નેટ વજન</th><th rowspan="2">દિવસને અંતે પાથરેલ મિશ્રણનો જથ્થો</th><th colspan="4">મીશ્રણ પાથર્યા અને રોલીંગ થયા પછી જાડાઈ</th>
  <th rowspan="2">નિયત ધોરણ પ્રમાણેની જાડાઈ</th><th rowspan="2">કેટલા ક્ષેત્રફળમાં પથરામણ થયું લંબાઈ X પહોળાઈ</th><th rowspan="2">મીશ્રણ જે સ્થળે પાથરવામાં આવે છે તેના કી.મી. ચેઈનેજ વગેરે</th>
  <th rowspan="2">પેવર સાઈટ ઉપર દેખરેખ રાખનારની સહી</th><th rowspan="2">ઠેકેદારની સહી</th><th rowspan="2">રીમાર્કસ</th></tr>
  <tr><th>સમય</th><th>ટ્રક નંબર</th><th>ગેઈટ પાસ</th><th>ડાબી બાજુ ધાર પાસે</th><th>મધ્ય ભાગમાં</th><th>જમણી બાજુ ધાર પાસે</th><th>સરેરાશ જાડાઈ</th></tr>
  <tr class="num">${Array.from({ length: 18 }, (_, i) => `<td>${i + 1}</td>`).join('')}</tr></thead><tbody>${body}</tbody></table>
  <p style="font-size:10px">જાડાઈ મી.મી.માં (સ્થળ પર માપેલ), નેટ વજન કિ.ગ્રા.માં.</p></div>`;
}
$('#pv4Print').addEventListener('click', () => { const h = printPv4(); h ? doPrint(h) : toast('Print ke liye data nahi'); });
$('#pv4Xls').addEventListener('click', () => {
  const R = pv4Rows(); if (!R.length) return toast('Data nahi');
  const a = [['1 Kramank', '2 Tarikh', '3 Item', '4 Samay', '5 Truck', '6 Gate pass', '7 Net (kg)', '8 Din ka kul (T)', '9 Daabi (mm)', '10 Beech (mm)', '11 Jamni (mm)', '12 Sarasari (mm)', '13 Niyat (mm)', '14 L x W', '15 Chainage', '16', '17', '18 Remark']];
  R.forEach(r => a.push([r.sr, dmy(r.date), r.item, r.time, r.veh, r.gp, r.net, r.last ? +f2(r.dayTot) : '', r.lcr[0] ?? '', r.lcr[1] ?? '', r.lcr[2] ?? '', r.avg != null ? +f2(r.avg) : '', r.spec, r.len ? `${f2(r.len)} x ${f2(r.half)}` : '', r.chain, '', '', r.m.remark || '']));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Paver-P4');
  XLSX.writeFile(wb, 'Paver_Parishisht4.xlsx');
});
const _renderPaver12 = renderPaver;
renderPaver = function () { _renderPaver12(); renderPaver4(); };
