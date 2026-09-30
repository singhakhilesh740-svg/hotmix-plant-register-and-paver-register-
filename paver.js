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
$('#pvTable1').addEventListener('change', e => {
  const d = e.target.dataset.pv; if (!d) return;
  DB.pv1[d] = DB.pv1[d] || {}; DB.pv1[d][e.target.dataset.k] = e.target.value.trim(); save(); renderPaver();
});
['#pvFrom', '#pvTo'].forEach(k => $(k).addEventListener('change', renderPaver));

function printPv1() {
  const R = paverRows(); if (!R.length) return '';
  const s = DB.settings;
  const rows = R.map(r => `<tr><td>${dmy(r.date)}</td><td>${pvKg(r.open)}</td><td>${r.rcv ? pvKg(r.rcv) : ''}</td><td>${pvKg(r.total)}</td><td>${esc(r.m.khatu || '')}</td>
    <td>${r.cons ? pvKg(r.cons) : ''}</td><td>${esc(r.chain || '')}</td><td>${r.area ? pvKg(r.area) : ''}</td><td>${r.rate ? f2(r.rate) + ' કિ.ગ્રા./ચો.મી.' : ''}</td><td>${esc(r.m.kul || '')}</td>
    <td>${esc(r.spec.replace(/kg\/sq\.m/g, 'કિ.ગ્રા./ચો.મી.'))}</td><td></td><td style="font-size:9px">${esc(r.calc)}${r.m.remark ? '; ' + esc(r.m.remark) : ''}</td></tr>`).join('');
  const w = [6, 7, 5, 7, 11, 7, 11, 7, 7, 6, 9, 7, 10];
  return `<div class="reg"><h2>પરિશિષ્ટ - ૧</h2><h4>ટેકકોટ, સરફેઈસ ડ્રેસીંગ, લીક્વીડ, સીલકોટ માટે ડામરના છંટકાવની નોંધ (પેવર સાઈટ)</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>
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
