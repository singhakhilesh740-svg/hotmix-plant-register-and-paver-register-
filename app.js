/* Hot Mix Plant Register — Parishisht 1 / 3 / 5
   Data: browser localStorage (per device). Backup via JSON export. */
'use strict';

// ---------------- storage ----------------
const KEY = 'hmp_register_v1';
const AIKEY = 'hmp_ai_v1';
const DEF = () => ({
  settings: { workName: '', agency: '', plant: '', division: '', gpStart: 1, tempMin: 140, tempMax: 165 },
  items: [],
  vehicles: [],
  opening: null,            // {date, qty}
  gatepasses: [],           // {id, recvDate, invDate, invNo, supplier, tanker, grade, qty, src}
  runs: [],                 // saved plant runs
  tack: {},                 // {date: MT}
  chat: []
});
let DB;
function load() {
  try { DB = Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { DB = DEF(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(DB)); }
  catch (e) { toast('Save nahi hua: ' + e.message); }
}
function aiCfg() { try { return JSON.parse(localStorage.getItem(AIKEY) || '{}'); } catch (e) { return {}; } }

// ---------------- helpers ----------------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r10 = n => Math.round(n / 10) * 10;
const f3 = n => (Math.round((+n || 0) * 1000) / 1000).toFixed(3);
const f2 = n => (Math.round((+n || 0) * 100) / 100).toFixed(2);
function dmy(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}-${m}-${y.slice(2)}`; }
function hm(t) { return (t || '').slice(0, 5); }
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); }
function normVeh(v) { return String(v || '').toUpperCase().replace(/[\s-]/g, ''); }
function itemLabel(code) { const it = DB.items.find(i => i.code == code); return it ? `I-${it.code} ${it.name}` : (code || ''); }
function fmtDateAny(s) {
  // returns ISO yyyy-mm-dd from '2026/09/27', '27/09/2026', '27-09-26', '24-Feb-26', Date
  if (!s) return '';
  if (s instanceof Date) return s.toISOString().slice(0, 10);
  s = String(s).trim();
  let m;
  if ((m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const mon = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  if ((m = s.match(/^(\d{1,2})[\/\-. ]([A-Za-z]{3})[A-Za-z]*[\/\-. ](\d{2,4})/))) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${String(mon[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

// ---------------- tabs ----------------
function showTab(name) {
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  renderAll();
  if (name === 'chat') setTimeout(() => { const l = $('#chatLog'); l.scrollTop = l.scrollHeight; }, 30);
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); });

// ================= SCADA PARSER =================
// AVN SCADA "DRUM MIX" export: header block, then row with Date | Time | ... | Net Mix Ton
function parseScadaWorkbook(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const meta = { work: '', mix: '', division: '', plantId: '' };
  let hdr = -1;
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const row = aoa[i].map(c => String(c).trim());
    row.forEach(c => {
      let m;
      if ((m = c.match(/Work Name\s*:\s*(.*)/i))) meta.work = m[1].trim();
      if ((m = c.match(/Type Of Material\s*:\s*(.*)/i))) meta.mix = m[1].trim();
      if ((m = c.match(/Division\s*:\s*(.*)/i))) meta.division = m[1].trim();
    });
    if (row.some(c => /^date$/i.test(c)) && row.some(c => /net\s*mix/i.test(c))) { hdr = i; break; }
  }
  if (hdr < 0) throw new Error('SCADA header (Date … Net Mix Ton) nahi mila. Kya ye AVN SCADA ka Drum Mix report hai?');
  const H = aoa[hdr].map(c => String(c).trim().toLowerCase());
  const col = re => H.findIndex(h => re.test(h));
  const C = {
    date: col(/^date$/), time: col(/^time$/), tph: col(/agg\s*tph/), bitPct: col(/bitumen\s*%/),
    mixT: col(/mix\s*temp/), t1: col(/tank\s*temp\s*1/), t2: col(/tank\s*temp\s*2/), trip: col(/tripper/),
    aggTon: col(/aggregate\s*ton/), bitKg: col(/bitumen\s*kg/), net: col(/net\s*mix/), exh: col(/exhaust/)
  };
  const rows = [];
  for (let i = hdr + 1; i < aoa.length; i++) {
    const r = aoa[i];
    const d = fmtDateAny(r[C.date]); const t = String(r[C.time] || '').trim();
    if (!d || !/^\d{1,2}:\d{2}/.test(t)) continue;
    rows.push({
      date: d, time: t.length === 7 ? '0' + t : t,
      tph: +r[C.tph] || 0, bitPct: +r[C.bitPct] || 0, mixT: +r[C.mixT] || 0,
      t1: +r[C.t1] || 0, t2: +r[C.t2] || 0, trip: C.trip >= 0 ? String(r[C.trip] || '').trim() : '',
      bitKg: +r[C.bitKg] || 0, net: +r[C.net] || 0
    });
  }
  rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  // group by date, handle counter resets
  const byDate = {};
  rows.forEach(r => (byDate[r.date] = byDate[r.date] || []).push(r));
  const days = Object.keys(byDate).sort().map(date => {
    const rs = byDate[date];
    let offN = 0, offB = 0, pN = 0, pB = 0;
    rs.forEach(r => {
      if (r.net < pN - 0.5) offN += pN; if (r.bitKg < pB - 5) offB += pB;
      pN = r.net; pB = r.bitKg; r.cum = +(r.net + offN).toFixed(3); r.cumBit = r.bitKg + offB;
    });
    const last = rs[rs.length - 1];
    const bp = rs.filter(r => r.tph > 0).map(r => r.bitPct);
    return {
      date, rows: rs, totalT: last.cum, bitKg: last.cumBit,
      start: rs[0].time, end: last.time,
      bitPctSet: bp.length ? median(bp) : 0,
      hasTripper: rs.some(r => r.trip !== '')
    };
  });
  return { meta, days };
}

// ================= TRUCK GENERATION =================
// Truck dispatch = first SCADA reading where cumulative since previous dispatch >= truck load capacity.
// Net weight = actual cumulative difference from SCADA (no random numbers).
// If SCADA Tripper No column is filled, real tripper breaks are used instead.
function generateTrucks(day, opts) {
  const active = DB.vehicles.filter(v => v.active !== false);
  if (!active.length) throw new Error('Pehle Vehicles tab mein trucks add karo.');
  let vi = Math.max(0, active.findIndex(v => v.no === opts.startVeh));
  const tankOf = r => opts.tank === 't1' ? r.t1 : opts.tank === 't2' ? r.t2 : Math.max(r.t1, r.t2);
  const rs = day.rows;
  const trucks = [];
  const push = (fromIdx, toIdx, net, veh) => {
    const win = rs.slice(fromIdx, toIdx + 1);
    const valid = win.filter(r => r.mixT >= 60 && r.mixT <= 250 && r.tph > 0);
    const mixT = median(valid.map(r => r.mixT));
    const tankT = median(valid.map(tankOf).filter(x => x > 0 && x < 250));
    trucks.push({
      veh: veh.no, time: hm(rs[toIdx].time), net: Math.round(net), tare: veh.tare,
      gross: Math.round(net) + (+veh.tare || 0), cum: rs[toIdx].cum,
      mixT: mixT != null ? Math.round(mixT) : '', tankT: tankT != null ? Math.round(tankT) : '',
      aggT: '', chain: '', remark: ''
    });
  };
  if (day.hasTripper && opts.useTripper) {
    let from = 0, base = 0;
    for (let i = 1; i <= rs.length; i++) {
      if (i === rs.length || rs[i].trip !== rs[i - 1].trip) {
        const net = (rs[i - 1].cum - base) * 1000;
        if (net > 50) { const v = active.find(x => x.no === normVeh(rs[i - 1].trip)) || active[vi % active.length]; push(from, i - 1, net, v); vi++; }
        base = rs[i - 1].cum; from = i;
      }
    }
  } else {
    let base = 0, from = 0;
    const secs = t => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + (s || 0); };
    for (let i = 0; i < rs.length; i++) {
      const v = active[vi % active.length];
      const cap = (+v.cap || 27000) / 1000;
      if (rs[i].cum - base >= cap) {
        push(from, i, (rs[i].cum - base) * 1000, v);
        base = rs[i].cum; from = i + 1; vi++;
      }
    }
    const rem = (rs[rs.length - 1].cum - base) * 1000;
    if (rem >= 100) push(from, rs.length - 1, rem, active[vi % active.length]);   // last truck = partial
    // note plant stoppages (>10 min) inside a truck's loading time
    let ti = 0, fromIdx = 0;
    trucks.forEach(t => {
      const endIdx = rs.findIndex((r, k) => k >= fromIdx && hm(r.time) === t.time && Math.abs(r.cum - t.cum) < 1e-6);
      for (let k = fromIdx; k < endIdx; k++) {
        const g = secs(rs[k + 1].time) - secs(rs[k].time);
        if (g > 600) t.remark = (t.remark ? t.remark + ', ' : '') + `Plant band ${hm(rs[k].time)}–${hm(rs[k + 1].time)}`;
      }
      fromIdx = endIdx + 1;
    });
  }
  // flags
  const s = DB.settings;
  trucks.forEach(t => {
    const f = [];
    if (t.mixT !== '' && (t.mixT < +s.tempMin || t.mixT > +s.tempMax)) f.push(`Mix temp ${t.mixT}°C range se bahar`);
    t.flags = f;
  });
  return trucks;
}
function nextGatePass(excludeRunId) {
  let mx = (+DB.settings.gpStart || 1) - 1;
  DB.runs.forEach(r => { if (r.id !== excludeRunId) r.trucks.forEach(t => { if (+t.gp > mx) mx = +t.gp; }); });
  return mx + 1;
}
function lastVehicleUsed() {
  const runs = [...DB.runs].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const r = runs[runs.length - 1]; if (!r || !r.trucks.length) return null;
  return r.trucks[r.trucks.length - 1].veh;
}

// ================= PLANT TAB =================
let SC = null;      // parsed scada
let DRAFT = null;   // generated run (unsaved)

async function readScadaFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const res = parseScadaWorkbook(wb);
  res.file = file.name;
  return res;
}
function loadScadaIntoPlant(res) {
  SC = res; DRAFT = null;
  $('#scadaInfo').innerHTML = `<b>${esc(res.file)}</b> · ${esc(res.meta.work)} · Mix: <b>${esc(res.meta.mix || '?')}</b> · ${res.days.map(d => `${dmy(d.date)}: ${f2(d.totalT)} MT`).join(', ')}`;
  $('#genPanel').classList.remove('hidden');
  $('#genDate').innerHTML = res.days.map(d => `<option value="${d.date}">${dmy(d.date)} (${d.start.slice(0, 5)}–${d.end.slice(0, 5)})</option>`).join('');
  fillItemSelect($('#genItem'), res.meta.mix);
  const lv = lastVehicleUsed(); const act = DB.vehicles.filter(v => v.active !== false);
  let start = act[0]?.no;
  if (lv) { const i = act.findIndex(v => v.no === lv); if (i >= 0) start = act[(i + 1) % act.length].no; }
  $('#genStartVeh').innerHTML = act.map(v => `<option ${v.no === start ? 'selected' : ''}>${esc(v.no)}</option>`).join('');
  $('#genTable').innerHTML = ''; $('#genSummary').innerHTML = ''; $('#btnSaveRun').classList.add('hidden');
  const d = res.days[0];
  $('#genNote').textContent = d.hasTripper ? 'SCADA mein Tripper No. hai — asli tripper breaks use honge.' : 'Tripper No. SCADA mein khali hai — truck capacity ke hisaab se cumulative split hoga.';
}
function fillItemSelect(sel, mixHint) {
  if (!DB.items.length) { sel.innerHTML = `<option value="">(Settings mein item add karo)</option>`; return; }
  sel.innerHTML = DB.items.map(i => `<option value="${esc(i.code)}" ${mixHint && i.name.toUpperCase() === mixHint.toUpperCase() ? 'selected' : ''}>I-${esc(i.code)} ${esc(i.name)} (${i.pct}%)</option>`).join('');
}
$('#scadaFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { loadScadaIntoPlant(await readScadaFile(f)); } catch (err) { toast(err.message); }
  e.target.value = '';
});
$('#btnGenerate').addEventListener('click', () => {
  if (!SC) return;
  const day = SC.days.find(d => d.date === $('#genDate').value);
  try {
    const trucks = generateTrucks(day, { startVeh: $('#genStartVeh').value, tank: $('#genTank').value, useTripper: true });
    let gp = nextGatePass();
    trucks.forEach(t => t.gp = gp++);
    const item = $('#genItem').value;
    const existing = DB.runs.find(r => r.date === day.date && r.file === SC.file);
    DRAFT = {
      id: existing?.id || uid(), date: day.date, file: SC.file, mix: SC.meta.mix, item,
      start: day.start, end: day.end, totalT: day.totalT, bitKg: day.bitKg, bitPctSet: day.bitPctSet,
      work: SC.meta.work, trucks, src: day.hasTripper ? 'tripper' : 'cumulative'
    };
    if (existing) { let g = nextGatePass(existing.id); DRAFT.trucks.forEach(t => t.gp = g++); }
    renderDraft();
    if (existing) toast('Is date/file ka register pehle se saved hai — Save karne par replace hoga.');
  } catch (err) { toast(err.message); }
});
function renderDraft() {
  const d = DRAFT; if (!d) return;
  const sumNet = d.trucks.reduce((a, t) => a + t.net, 0);
  $('#genSummary').innerHTML = `<div class="sum">
    <span>SCADA kul mix: <b>${f2(d.totalT)} MT</b></span>
    <span>Trucks ka net total: <b>${f2(sumNet / 1000)} MT</b></span>
    <span>Trucks: <b>${d.trucks.length}</b></span>
    <span>Bitumen (SCADA): <b>${f3(d.bitKg / 1000)} MT</b> (${d.totalT ? f2(d.bitKg / 10 / d.totalT) : 0}%)</span>
    <span>Plant chalu: <b>${hm(d.start)}–${hm(d.end)}</b></span></div>`;
  const vehOpts = sel => DB.vehicles.map(v => `<option ${v.no === sel ? 'selected' : ''}>${esc(v.no)}</option>`).join('');
  $('#genTable').innerHTML = `<thead><tr><th>#</th><th>Truck</th><th>Samay</th><th>Gate pass</th><th>Gross (kg)</th><th>Net (kg)</th><th>Tare (kg)</th><th>Cum. (MT)</th><th>Agg. temp</th><th>Tank temp</th><th>Mix temp</th><th>Remark</th></tr></thead><tbody>` +
    d.trucks.map((t, i) => `<tr class="${t.flags?.length ? 'warn' : ''}"><td>${i + 1}</td>
      <td><select data-i="${i}" data-f="veh">${vehOpts(t.veh)}</select></td>
      <td>${t.time}</td><td>${t.gp}</td><td>${t.gross}</td><td><b>${t.net}</b></td><td>${t.tare}</td><td>${f2(t.cum)}</td>
      <td><input data-i="${i}" data-f="aggT" value="${esc(t.aggT)}" placeholder="manual" style="width:70px"></td>
      <td>${t.tankT}</td><td>${t.mixT}</td>
      <td class="l"><input data-i="${i}" data-f="remark" value="${esc(t.remark)}" style="width:130px">${t.flags?.length ? `<div class="flag">⚠ ${esc(t.flags.join(', '))}</div>` : ''}</td></tr>`).join('') + '</tbody>';
  $('#btnSaveRun').classList.remove('hidden');
}
$('#genTable').addEventListener('change', e => {
  const el = e.target; const i = +el.dataset.i; const f = el.dataset.f; if (!DRAFT || isNaN(i)) return;
  const t = DRAFT.trucks[i];
  if (f === 'veh') { const v = DB.vehicles.find(x => x.no === el.value); t.veh = v.no; t.tare = v.tare; t.gross = t.net + (+v.tare || 0); renderDraft(); }
  else t[f] = el.value;
});
$('#btnSaveRun').addEventListener('click', () => {
  if (!DRAFT) return;
  DB.runs = DB.runs.filter(r => r.id !== DRAFT.id);
  DB.runs.push(DRAFT); save();
  toast(`${dmy(DRAFT.date)} ka register save hua (${DRAFT.trucks.length} trucks)`);
  DRAFT = null; $('#genTable').innerHTML = ''; $('#genSummary').innerHTML = ''; $('#btnSaveRun').classList.add('hidden');
  renderAll();
});

function runsInRange() {
  const a = $('#viewFrom').value, b = $('#viewTo').value;
  return [...DB.runs].filter(r => (!a || r.date >= a) && (!b || r.date <= b))
    .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
}
function renderSavedRuns() {
  const runs = runsInRange();
  if (!runs.length) { $('#savedRuns').innerHTML = '<p class="muted">Abhi koi register save nahi hai.</p>'; return; }
  $('#savedRuns').innerHTML = runs.map(r => `<details class="dayblock"><summary>${dmy(r.date)} · ${esc(itemLabel(r.item) || r.mix)} · ${r.trucks.length} trucks · ${f2(r.totalT)} MT · bitumen ${f3(r.bitKg / 1000)} MT
      <span class="pill">${r.src === 'tripper' ? 'SCADA tripper' : 'SCADA cumulative'}</span></summary>
      <div class="tablewrap"><table class="grid"><thead><tr><th>Truck</th><th>Samay</th><th>GP</th><th>Gross</th><th>Net</th><th>Tare</th><th>Agg</th><th>Tank</th><th>Mix</th><th>Remark</th></tr></thead><tbody>
      ${r.trucks.map(t => `<tr><td>${esc(t.veh)}</td><td>${t.time}</td><td>${t.gp}</td><td>${t.gross}</td><td>${t.net}</td><td>${t.tare}</td><td>${esc(t.aggT)}</td><td>${t.tankT}</td><td>${t.mixT}</td><td class="l">${esc(t.remark)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row"><button class="btn sm danger" data-del="${r.id}">🗑 Delete</button></div></details>`).join('');
}
$('#savedRuns').addEventListener('click', e => {
  const id = e.target.dataset.del; if (!id) return;
  if (!confirm('Ye din ka register delete karna hai?')) return;
  DB.runs = DB.runs.filter(r => r.id !== id); save(); renderAll();
});

// ================= PRINT: Parishisht 5 / 3 =================
function regHead(no, title) {
  const s = DB.settings;
  return `<h2>પરિશિષ્ટ - ${no}</h2><h4>${title}</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>`;
}
function printP5(runs) {
  let rowsHtml = '';
  runs.forEach(r => {
    r.trucks.forEach((t, i) => {
      const last = i === r.trucks.length - 1;
      rowsHtml += `<tr><td>${i + 1}</td><td>${i === 0 ? dmy(r.date) : ''}</td><td>${i === 0 ? esc(itemLabel(r.item) || r.mix) : ''}</td>
      <td>${esc(t.veh)}</td><td>${t.time}</td><td>${t.gp}</td><td>${t.gross}</td><td>${t.net}</td>
      <td class="tot">${last ? f2(r.totalT) + ' MT' : ''}</td><td>${t.tare}</td><td></td><td></td><td>${esc(t.remark)}</td></tr>`;
    });
    rowsHtml += `<tr><td colspan="13" style="height:8px"></td></tr>`;
  });
  return `<div class="reg">${regHead('૫', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર કામ માટેના મીશ્રણના વજન વગેરેની નોંધ')}
  <table><thead>
  <tr><th rowspan="2">ક્રમાંક</th><th rowspan="2">તારીખ</th><th rowspan="2">ટેન્ડરની આઈટમ નંબર તથા તેનું વર્ણન ટૂંકમાં</th>
  <th colspan="6">ટ્રક અથવા ડામર મિશ્રણની હેરફેર</th><th rowspan="2">ખાલી ટ્રકનું વજન</th><th rowspan="2">વજન લેનાર અને નોંધનારની સહી</th><th rowspan="2">ઠેકેદારની સહી</th><th rowspan="2">રીમાર્ક</th></tr>
  <tr><th>ટ્રક નંબર</th><th>સમય</th><th>ગેટ પાસ નંબર</th><th>ગાડી સાથે મિશ્રણનું વજન</th><th>ટ્રકમાં મિશ્રણનું નેટ વજન</th><th>દિવસના અંતે કુલ વજન</th></tr>
  <tr class="num">${[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => `<td>${n}</td>`).join('')}</tr>
  </thead><tbody>${rowsHtml}</tbody></table></div>`;
}
function printP3(runs) {
  let rowsHtml = '';
  runs.forEach(r => {
    r.trucks.forEach((t, i) => {
      rowsHtml += `<tr><td>${i === 0 ? dmy(r.date) : ''}</td><td>${t.time}</td><td>${i === 0 ? esc(r.mix || itemLabel(r.item)) : ''}</td><td>${esc(t.veh)}</td>
      <td>${t.aggT ? esc(t.aggT) + '°C' : ''}</td><td>${t.tankT !== '' ? t.tankT + '°C' : ''}</td><td>${t.mixT !== '' ? t.mixT + '°C' : ''}</td>
      <td>${esc(t.chain)}</td><td></td><td>${esc(t.remark)}</td></tr>`;
    });
    rowsHtml += `<tr><td colspan="10" style="height:8px"></td></tr>`;
  });
  return `<div class="reg">${regHead('૩', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર (એગ્રીગેટ) મીશ્રણના ઉષ્ણતામાનની નોંધ')}
  <table><thead>
  <tr><th rowspan="2">તારીખ</th><th rowspan="2">સમય</th><th rowspan="2">મિશ્રણનો પ્રકાર</th><th rowspan="2">ટ્રક નંબર</th>
  <th colspan="3">ઉષ્ણતામાનના માપ ફેરનહીટ / સેન્ટીગ્રેડ અંશ</th><th rowspan="2">મિશ્રણ જે સ્થળે પાથરવાનું છે તેના કિ.મી. ચેઈનેજ વગેરે</th><th rowspan="2">ઉષ્ણતામાનની નોંધ રાખનારની સહી</th><th rowspan="2">રીમાર્ક</th></tr>
  <tr><th>ગરમ કરેલ એગ્રીગેટનું ઉ.</th><th>ટાંકીમાં ગરમ ડામરનું ઉ.</th><th>હોટમીક્ષ પ્લાન્ટમાંથી બહાર આવતા મિશ્રણનું ઉ.</th></tr>
  <tr class="num">${[1,2,3,4,5,6,7,8,9,10].map(n => `<td>${n}</td>`).join('')}</tr>
  </thead><tbody>${rowsHtml}</tbody></table></div>`;
}
function doPrint(html) {
  if (!html) return toast('Print ke liye data nahi hai');
  $('#printArea').innerHTML = html;
  setTimeout(() => window.print(), 150);
}
$('#btnPrintP5').addEventListener('click', () => { const r = runsInRange(); r.length ? doPrint(printP5(r)) : toast('Koi saved register nahi'); });
$('#btnPrintP3').addEventListener('click', () => { const r = runsInRange(); r.length ? doPrint(printP3(r)) : toast('Koi saved register nahi'); });
$('#btnXlsPlant').addEventListener('click', () => {
  const runs = runsInRange(); if (!runs.length) return toast('Koi saved register nahi');
  const p5 = [['Kramank', 'Tarikh', 'Item', 'Truck no.', 'Samay', 'Gate pass no.', 'Gross (kg)', 'Net (kg)', 'Din ka kul (MT)', 'Tare (kg)', 'Remark']];
  const p3 = [['Tarikh', 'Samay', 'Mix', 'Truck no.', 'Agg temp', 'Tank temp', 'Mix temp', 'Chainage', 'Remark']];
  runs.forEach(r => r.trucks.forEach((t, i) => {
    p5.push([i + 1, dmy(r.date), itemLabel(r.item) || r.mix, t.veh, t.time, t.gp, t.gross, t.net, i === r.trucks.length - 1 ? +f2(r.totalT) : '', t.tare, t.remark]);
    p3.push([dmy(r.date), t.time, r.mix, t.veh, t.aggT, t.tankT, t.mixT, t.chain, t.remark]);
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(p5), 'Parishisht-5');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(p3), 'Parishisht-3');
  XLSX.writeFile(wb, `Plant_Register_${runs[0].date}_to_${runs[runs.length - 1].date}.xlsx`);
});

// ================= BITUMEN =================
function buildLedger() {
  if (!DB.opening) return [];
  const od = DB.opening.date;
  const dates = new Set();
  DB.gatepasses.forEach(g => { if (g.recvDate >= od) dates.add(g.recvDate); });
  DB.runs.forEach(r => { if (r.date >= od) dates.add(r.date); });
  Object.keys(DB.tack).forEach(d => { if (d >= od && +DB.tack[d]) dates.add(d); });
  let bal = +DB.opening.qty || 0;
  const out = [];
  [...dates].sort().forEach(date => {
    const gps = DB.gatepasses.filter(g => g.recvDate === date);
    const runs = DB.runs.filter(r => r.date === date);
    const mixMT = runs.reduce((a, r) => a + r.bitKg / 1000, 0);
    const mixT = runs.reduce((a, r) => a + r.totalT, 0);
    const theo = runs.reduce((a, r) => { const it = DB.items.find(i => i.code == r.item); return a + (it ? r.totalT * it.pct / 100 : 0); }, 0);
    const tack = +DB.tack[date] || 0;
    const open = bal;
    const rcv = gps.reduce((a, g) => a + (+g.qty || 0), 0);
    const total = open + rcv;
    const cons = mixMT + tack;
    bal = total - cons;
    out.push({ date, open, gps, rcv, total, tack, mixMT, cons, close: bal, mixT, theo,
      pct: mixT ? mixMT / mixT * 100 : 0, items: [...new Set(runs.map(r => itemLabel(r.item) || r.mix))].join(', ') });
  });
  return out;
}
function currentBalance() { const l = buildLedger(); return l.length ? l[l.length - 1].close : (DB.opening ? +DB.opening.qty : null); }

function renderBitumen() {
  if (DB.opening) { $('#obDate').value = DB.opening.date; $('#obQty').value = DB.opening.qty; }
  const gps = [...DB.gatepasses].sort((a, b) => b.recvDate.localeCompare(a.recvDate));
  $('#gpTable').innerHTML = `<thead><tr><th>Aavak date</th><th>Invoice date</th><th>Invoice no.</th><th>Supplier</th><th>Tanker</th><th>Grade</th><th>Qty (MT)</th><th></th></tr></thead><tbody>` +
    (gps.map(g => `<tr><td>${dmy(g.recvDate)}</td><td>${dmy(g.invDate)}</td><td>${esc(g.invNo)}</td><td>${esc(g.supplier)}</td><td>${esc(g.tanker)}</td><td>${esc(g.grade)}</td><td><b>${f3(g.qty)}</b></td>
      <td>${g.src === 'ai' ? '<span class="pill ai">AI</span> ' : ''}<button class="btn sm danger" data-delgp="${g.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Koi gatepass nahi</td></tr>') + '</tbody>';
  const L = buildLedger();
  if (!DB.opening) { $('#ledgerTable').innerHTML = '<tr><td class="muted">Pehle opening balance daalo.</td></tr>'; return; }
  $('#ledgerTable').innerHTML = `<thead><tr><th>Date</th><th>Opening</th><th>Invoice</th><th>Tanker</th><th>Aavak</th><th>Kul</th><th>Tack coat</th><th>Mix (SCADA)</th><th>Kul vaparash</th><th>Closing</th><th>Mix MT</th><th>SCADA %</th><th>Design mujab</th></tr></thead><tbody>` +
    L.map(d => `<tr><td>${dmy(d.date)}</td><td>${f3(d.open)}</td><td>${esc(d.gps.map(g => g.invNo).join(', '))}</td><td>${esc(d.gps.map(g => g.tanker).join(', '))}</td>
      <td>${d.rcv ? f3(d.rcv) : ''}</td><td>${f3(d.total)}</td>
      <td><input type="number" step="0.001" data-tack="${d.date}" value="${d.tack || ''}" style="width:80px"></td>
      <td>${d.mixMT ? f3(d.mixMT) : ''}</td><td>${f3(d.cons)}</td><td><b>${f3(d.close)}</b></td>
      <td>${d.mixT ? f2(d.mixT) : ''}</td><td>${d.mixT ? f2(d.pct) : ''}</td><td>${d.theo ? f3(d.theo) : ''}</td></tr>`).join('') + '</tbody>';
}
$('#btnSaveOB').addEventListener('click', () => {
  const date = $('#obDate').value, qty = +$('#obQty').value;
  if (!date) return toast('Date daalo');
  DB.opening = { date, qty }; save(); toast('Opening balance save hua'); renderAll();
});
function addGatepass(g, src) {
  g.id = uid(); g.src = src; g.qty = +g.qty || 0;
  g.recvDate = g.recvDate || g.invDate;
  if (!g.recvDate) { toast('Aavak date zaroori hai'); return false; }
  const dup = DB.gatepasses.find(x => x.invNo && x.invNo === g.invNo);
  if (dup) { toast(`Invoice ${g.invNo} pehle se entered hai`); return false; }
  DB.gatepasses.push(g); save(); renderAll(); return true;
}
$('#btnAddGP').addEventListener('click', () => {
  const g = {}; $$('#gpForm [name]').forEach(i => g[i.name] = i.value.trim());
  if (addGatepass(g, 'manual')) { toast('Gatepass add hua'); $$('#gpForm [name]').forEach(i => { if (i.name !== 'grade') i.value = ''; }); }
});
$('#gpTable').addEventListener('click', e => {
  const id = e.target.dataset.delgp; if (!id || !confirm('Gatepass delete karein?')) return;
  DB.gatepasses = DB.gatepasses.filter(g => g.id !== id); save(); renderAll();
});
$('#ledgerTable').addEventListener('change', e => {
  const d = e.target.dataset.tack; if (!d) return;
  DB.tack[d] = +e.target.value || 0; save(); renderBitumen();
});
function printP1() {
  const L = buildLedger(); if (!L.length) return '';
  let rows = '';
  L.forEach(d => {
    const n = Math.max(1, d.gps.length);
    for (let k = 0; k < n; k++) {
      const g = d.gps[k]; const first = k === 0; const last = k === n - 1;
      rows += `<tr><td>${first ? dmy(d.date) : ''}</td><td>${first ? f3(d.open) : ''}</td><td>${g ? esc(g.invNo) : ''}</td><td>${g ? esc(g.tanker) : ''}</td>
      <td>${g ? f3(g.qty) : ''}</td><td>${last ? f3(d.total) : ''}</td>
      <td>${last && d.tack ? f3(d.tack) : ''}</td><td>${last && d.mixMT ? f3(d.mixMT) : ''}</td><td>${last ? f3(d.cons) : ''}</td><td class="tot">${last ? f3(d.close) : ''}</td>
      <td>${last ? esc(d.items) : ''}</td><td>${last && d.mixT ? f2(d.mixT) : ''}</td><td>${last && d.mixT ? f2(d.pct) + '%' : ''}</td><td>${last && d.theo ? f3(d.theo) : ''}</td><td></td><td></td><td></td><td></td></tr>`;
    }
  });
  return `<div class="reg">${regHead('૧', 'ડામરની આવક તથા વપરાશની નોંધ')}
  <table><thead>
  <tr><th rowspan="2">તારીખ</th><th rowspan="2">ખુલતી સિલક</th><th colspan="4">ડામરની આવક</th><th colspan="3">ડામરનો રોજનો વપરાશ</th>
  <th rowspan="2">દિવસના અંતે બાકી જથ્થો</th><th rowspan="2">કામ / મિશ્રણ</th><th rowspan="2">મિશ્રણનો જથ્થો (MT)</th><th rowspan="2">ડામરના ટકા</th><th rowspan="2">નિર્દિષ્ટ ધોરણ મુજબ વપરાશ</th><th rowspan="2">તફાવતના કારણો</th><th rowspan="2">ઇજનેરની સહી</th><th rowspan="2">ઠેકેદારની સહી</th><th rowspan="2">રીમાર્ક</th></tr>
  <tr><th>ઇન્વોઇસ / ગેટ પાસ નંબર</th><th>ટેન્કર નંબર</th><th>આવેલ જથ્થો</th><th>કુલ જથ્થો</th><th>ટેક કોટ માટે</th><th>મિશ્રણ માટે</th><th>કુલ</th></tr>
  <tr class="num">${Array.from({ length: 18 }, (_, i) => `<td>${i + 1}</td>`).join('')}</tr>
  </thead><tbody>${rows}</tbody></table><p style="font-size:10px">જથ્થો મેટ્રિક ટનમાં. મિશ્રણ માટેનો વપરાશ SCADA રિપોર્ટ મુજબ.</p></div>`;
}
$('#btnPrintP1').addEventListener('click', () => doPrint(printP1()));
$('#btnXlsP1').addEventListener('click', () => {
  const L = buildLedger(); if (!L.length) return toast('Ledger khali hai');
  const a = [['Date', 'Opening (MT)', 'Invoice no.', 'Tanker', 'Aavak (MT)', 'Kul (MT)', 'Tack coat (MT)', 'Mix (MT)', 'Kul vaparash', 'Closing (MT)', 'Mix qty (MT)', 'SCADA bit %', 'Design mujab (MT)']];
  L.forEach(d => a.push([dmy(d.date), +f3(d.open), d.gps.map(g => g.invNo).join(', '), d.gps.map(g => g.tanker).join(', '), +f3(d.rcv), +f3(d.total), +f3(d.tack), +f3(d.mixMT), +f3(d.cons), +f3(d.close), +f2(d.mixT), +f2(d.pct), +f3(d.theo)]));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Parishisht-1');
  XLSX.writeFile(wb, 'Bitumen_Register_P1.xlsx');
});

// ================= VEHICLES =================
function randStep(min, max) { min = +min; max = +max; if (max < min) [min, max] = [max, min]; return r10(min + Math.random() * (max - min)); }
$('#btnAddVeh').addEventListener('click', () => {
  const list = $('#vehList').value.split(/[\n,;]+/).map(normVeh).filter(Boolean);
  if (!list.length) return toast('Truck numbers daalo');
  let added = 0;
  list.forEach(no => {
    if (DB.vehicles.some(v => v.no === no)) return;
    DB.vehicles.push({ no, tare: randStep($('#tareMin').value, $('#tareMax').value), cap: randStep($('#netMin').value, $('#netMax').value), tentative: true, active: true });
    added++;
  });
  DB.settings.netMin = +$('#netMin').value; DB.settings.netMax = +$('#netMax').value;
  save(); $('#vehList').value = ''; toast(`${added} vehicles add hue`); renderAll();
});
function renderVehicles() {
  const V = DB.vehicles;
  $('#vehTable').innerHTML = `<thead><tr><th>Kram</th><th>Truck no.</th><th>Tare (kg)</th><th>Load capacity (kg)</th><th>Status</th><th>Active</th><th></th></tr></thead><tbody>` +
    (V.map((v, i) => `<tr><td>${i + 1}</td><td><b>${esc(v.no)}</b></td>
      <td><input type="number" step="10" data-vi="${i}" data-vf="tare" value="${v.tare}"></td>
      <td><input type="number" step="10" data-vi="${i}" data-vf="cap" value="${v.cap}"></td>
      <td>${v.tentative ? '<span class="pill">tentative</span>' : '<span class="pill" style="background:#e7f6ec;color:#1e7e46">weighed</span>'}
        <button class="btn sm" data-vtog="${i}">${v.tentative ? 'Mark weighed' : 'Mark tentative'}</button></td>
      <td><input type="checkbox" data-vi="${i}" data-vf="active" ${v.active !== false ? 'checked' : ''} style="width:auto"></td>
      <td><button class="btn sm" data-vup="${i}">↑</button><button class="btn sm" data-vdn="${i}">↓</button><button class="btn sm danger" data-vdel="${i}">🗑</button></td></tr>`).join('')
      || '<tr><td colspan="7" class="muted">Koi vehicle nahi</td></tr>') + '</tbody>';
}
$('#vehTable').addEventListener('change', e => {
  const i = e.target.dataset.vi, f = e.target.dataset.vf; if (i == null) return;
  const v = DB.vehicles[+i];
  if (f === 'active') v.active = e.target.checked; else { v[f] = +e.target.value; if (f === 'tare') v.tentative = false; }
  save(); renderVehicles();
});
$('#vehTable').addEventListener('click', e => {
  const d = e.target.dataset; const V = DB.vehicles;
  if (d.vup != null && +d.vup > 0) { const i = +d.vup; [V[i - 1], V[i]] = [V[i], V[i - 1]]; }
  else if (d.vdn != null && +d.vdn < V.length - 1) { const i = +d.vdn; [V[i + 1], V[i]] = [V[i], V[i + 1]]; }
  else if (d.vdel != null) { if (!confirm('Vehicle delete karein?')) return; V.splice(+d.vdel, 1); }
  else if (d.vtog != null) { V[+d.vtog].tentative = !V[+d.vtog].tentative; }
  else return;
  save(); renderVehicles();
});

// ================= SETTINGS =================
function renderSettings() {
  $$('#setForm [name]').forEach(i => { if (DB.settings[i.name] != null) i.value = DB.settings[i.name]; });
  $('#itemTable').innerHTML = `<thead><tr><th>Item no.</th><th>Mix</th><th>Design bitumen %</th><th></th></tr></thead><tbody>` +
    (DB.items.map((it, k) => `<tr><td>${esc(it.code)}</td><td>${esc(it.name)}</td><td>${it.pct}</td><td><button class="btn sm danger" data-delit="${k}">🗑</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Item add karo (jaise 10 – BM – 3.3%)</td></tr>') + '</tbody>';
  const a = aiCfg(); $('#aiKey').value = a.key || ''; $('#aiModel').value = a.model || 'gemini-2.5-flash';
}
$('#btnSaveSet').addEventListener('click', () => {
  $$('#setForm [name]').forEach(i => DB.settings[i.name] = i.type === 'number' ? +i.value : i.value.trim());
  save(); toast('Settings save hui'); renderAll();
});
$('#btnAddItem').addEventListener('click', () => {
  const code = $('#itCode').value.trim(), name = $('#itName').value.trim().toUpperCase(), pct = +$('#itPct').value;
  if (!code || !name) return toast('Item no. aur mix daalo');
  DB.items = DB.items.filter(i => i.code !== code); DB.items.push({ code, name, pct });
  save(); $('#itCode').value = $('#itName').value = $('#itPct').value = ''; renderAll();
});
$('#itemTable').addEventListener('click', e => { const k = e.target.dataset.delit; if (k == null) return; DB.items.splice(+k, 1); save(); renderAll(); });
$('#btnSaveAI').addEventListener('click', () => {
  try { localStorage.setItem(AIKEY, JSON.stringify({ key: $('#aiKey').value.trim(), model: $('#aiModel').value.trim() || 'gemini-2.5-flash' })); toast('AI settings save hui'); }
  catch (e) { toast(e.message); }
});
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `hotmix_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!d.runs || !d.settings) throw new Error('Galat file'); if (!confirm('Abhi ka data replace ho jayega. Continue?')) return; DB = Object.assign(DEF(), d); save(); toast('Backup restore hua'); renderAll(); }
  catch (err) { toast('Restore fail: ' + err.message); }
  e.target.value = '';
});

// ================= HOME =================
function renderHome() {
  const bal = currentBalance();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const mRuns = DB.runs.filter(r => r.date.startsWith(month));
  const last = [...DB.runs].sort((a, b) => b.date.localeCompare(a.date))[0];
  $('#homeCards').innerHTML = [
    ['Bitumen balance', bal == null ? '—' : f3(bal) + ' MT'],
    ['Last production', last ? `${f2(last.totalT)} MT` : '—', last ? dmy(last.date) : ''],
    ['Is mahine mix', f2(mRuns.reduce((a, r) => a + r.totalT, 0)) + ' MT'],
    ['Gatepass (total)', DB.gatepasses.length + ''],
    ['Vehicles', DB.vehicles.filter(v => v.active !== false).length + ' active']
  ].map(([k, v, s]) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="muted">${s}</div>` : ''}</div>`).join('');
  const rec = [...DB.runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  $('#homeRecent').innerHTML = rec.length ? `<table class="grid"><thead><tr><th>Date</th><th>Mix</th><th>Trucks</th><th>Mix MT</th><th>Bitumen MT</th><th>Bit %</th></tr></thead><tbody>${rec.map(r => `<tr><td>${dmy(r.date)}</td><td>${esc(itemLabel(r.item) || r.mix)}</td><td>${r.trucks.length}</td><td>${f2(r.totalT)}</td><td>${f3(r.bitKg / 1000)}</td><td>${f2(r.bitKg / 10 / r.totalT)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Abhi koi data nahi.</p>';
  $('#hdrWork').textContent = DB.settings.workName || 'Settings mein kaam ka naam daalo';
  const s = DB.settings;
  if (!DB.items.length || !DB.vehicles.length || !DB.opening) {
    $('#homeCards').insertAdjacentHTML('afterbegin', `<div class="card" style="grid-column:1/-1;background:#fffaeb;border-color:#fedf89">
      <b>Setup baaki hai:</b> ${[!s.workName && 'Settings → kaam ka naam', !DB.items.length && 'Settings → tender items', !DB.vehicles.length && 'Vehicles → trucks', !DB.opening && 'Bitumen → opening balance'].filter(Boolean).join(' · ')}</div>`);
  }
}

// ================= CHATBOT =================
function chatPush(role, html, extra) {
  DB.chat.push({ role, html, t: Date.now() }); if (DB.chat.length > 80) DB.chat = DB.chat.slice(-80); save();
  appendMsg(role, html, extra);
}
function appendMsg(role, html, extra) {
  const d = document.createElement('div'); d.className = 'msg ' + role; d.innerHTML = html;
  if (extra) d.appendChild(extra);
  $('#chatLog').appendChild(d); $('#chatLog').scrollTop = $('#chatLog').scrollHeight; return d;
}
function renderChatHistory() {
  $('#chatLog').innerHTML = '';
  if (!DB.chat.length) appendMsg('bot', `Namaste! Main ye kar sakta hoon:
• <b>Gatepass / invoice ki photo</b> → qty, invoice no., tanker, date padh kar Bitumen register mein daal dunga (aap confirm karoge)
• <b>SCADA Excel</b> → truck-wise Parishisht-5 aur 3 bana dunga
• Sawaal: "bitumen balance?", "27-09 ko kitna bana?", "is mahine ka total?"`);
  DB.chat.forEach(m => appendMsg(m.role, m.html));
}
$('#chatForm').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#chatInput').value.trim(); if (!q) return;
  $('#chatInput').value = '';
  chatPush('user', esc(q));
  const ans = localAnswer(q);
  if (ans) return chatPush('bot', ans);
  const cfg = aiCfg();
  if (!cfg.key) return chatPush('bot', 'Ye sawaal samajh nahi aaya. AI jawab ke liye Settings mein Gemini API key daalo. Abhi main balance, production aur gatepass ke sawaal samajhta hoon.');
  const wait = appendMsg('bot', '…soch raha hoon');
  try {
    const ctx = JSON.stringify({ settings: DB.settings, opening: DB.opening, balanceMT: currentBalance(), gatepasses: DB.gatepasses.map(({ id, ...g }) => g),
      days: DB.runs.map(r => ({ date: r.date, mix: r.mix, item: r.item, trucks: r.trucks.length, mixMT: r.totalT, bitumenMT: r.bitKg / 1000 })), ledger: buildLedger().map(d => ({ date: d.date, open: d.open, rcv: d.rcv, cons: d.cons, close: d.close })) });
    const txt = await gemini([{ text: `You are an assistant inside a Gujarat R&B hot mix plant register app. Answer briefly in Hinglish using ONLY this app data (JSON). If data is missing, say so.\nDATA: ${ctx}\nQUESTION: ${q}` }], false);
    wait.remove(); chatPush('bot', esc(txt));
  } catch (err) { wait.remove(); chatPush('bot', 'AI error: ' + esc(err.message)); }
});
function localAnswer(q) {
  const s = q.toLowerCase();
  const dm = q.match(/(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
  if (/balance|stock|bacha|baki|baaki|silak/.test(s)) {
    const b = currentBalance(); if (b == null) return 'Opening balance abhi set nahi hai (Bitumen tab).';
    const L = buildLedger(); const l = L[L.length - 1];
    return `Bitumen balance: <b>${f3(b)} MT</b>${l ? ` (${dmy(l.date)} ke ant mein)` : ''}.`;
  }
  if (dm && /(bana|production|mix|kitna|produce|truck)/.test(s)) {
    const y = dm[3] ? (dm[3].length === 2 ? '20' + dm[3] : dm[3]) : new Date().getFullYear();
    const iso = `${y}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
    const rs = DB.runs.filter(r => r.date === iso);
    if (!rs.length) return `${dmy(iso)} ka koi register saved nahi hai.`;
    return rs.map(r => `${dmy(iso)} · ${esc(itemLabel(r.item) || r.mix)}: <b>${f2(r.totalT)} MT</b>, ${r.trucks.length} trucks (${r.trucks[0].time}–${r.trucks[r.trucks.length - 1].time}), bitumen ${f3(r.bitKg / 1000)} MT`).join('\n');
  }
  if (/mahin|month/.test(s)) {
    const m = new Date().toISOString().slice(0, 7); const rs = DB.runs.filter(r => r.date.startsWith(m));
    return `Is mahine: <b>${f2(rs.reduce((a, r) => a + r.totalT, 0))} MT</b> mix, ${rs.reduce((a, r) => a + r.trucks.length, 0)} trucks, bitumen ${f3(rs.reduce((a, r) => a + r.bitKg, 0) / 1000)} MT.`;
  }
  if (/gate ?pass|invoice|tanker|aavak|aawak/.test(s)) {
    const g = [...DB.gatepasses].sort((a, b) => b.recvDate.localeCompare(a.recvDate)).slice(0, 5);
    if (!g.length) return 'Abhi koi gatepass entered nahi hai.';
    return 'Latest gatepass:\n' + g.map(x => `• ${dmy(x.recvDate)} · ${esc(x.invNo)} · ${esc(x.tanker)} · <b>${f3(x.qty)} MT</b>`).join('\n') + `\nKul aavak: <b>${f3(DB.gatepasses.reduce((a, x) => a + (+x.qty || 0), 0))} MT</b>`;
  }
  return null;
}
$('#chatFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (/\.(xlsx|xls|csv)$/i.test(f.name)) {
    chatPush('user', `📄 ${esc(f.name)}`);
    try {
      const res = await readScadaFile(f);
      const d = res.days;
      const btn = document.createElement('div'); btn.className = 'confirm';
      btn.innerHTML = `<b>SCADA report padh liya</b><br>${esc(res.meta.work)} · Mix: <b>${esc(res.meta.mix)}</b><br>` +
        d.map(x => `${dmy(x.date)}: <b>${f2(x.totalT)} MT</b> mix, bitumen <b>${f3(x.bitKg / 1000)} MT</b> (${f2(x.bitKg / 10 / x.totalT)}%), ${hm(x.start)}–${hm(x.end)}`).join('<br>') +
        `<div class="row"><button class="btn primary">🏭 Truck-wise register banao</button></div>`;
      btn.querySelector('button').onclick = () => { loadScadaIntoPlant(res); showTab('plant'); $('#btnGenerate').click(); };
      appendMsg('bot', '', btn);
    } catch (err) { chatPush('bot', esc(err.message)); }
    return;
  }
  // image / pdf -> AI
  const cfg = aiCfg();
  const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
  let dataUrl;
  try { dataUrl = isPdf ? await fileToDataUrl(f) : await shrinkImage(f, 1800); } catch (err) { return chatPush('bot', 'File nahi khuli: ' + esc(err.message)); }
  appendMsg('user', isPdf ? `📄 ${esc(f.name)}` : `<img src="${dataUrl}">`);
  DB.chat.push({ role: 'user', html: `📷 ${esc(f.name)}`, t: Date.now() }); save();
  if (!cfg.key) return chatPush('bot', 'Photo padhne ke liye Settings → Chatbot mein Gemini API key daalo (free milti hai). Tab tak Bitumen tab mein manual entry kar sakte ho.');
  const wait = appendMsg('bot', '…gatepass padh raha hoon');
  try {
    const b64 = dataUrl.split(',')[1]; const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
    const prompt = `This is a photo of a document at an Indian hot mix plant. Classify and extract. Return ONLY JSON:
{"doc_type":"gatepass"|"scada"|"other",
 "supplier":"IOCL/BPCL/HPCL/other name",
 "invoice_no":"tax invoice number (e.g. GJ5534275388 or 4541387410)",
 "invoice_date":"YYYY-MM-DD",
 "received_date":"YYYY-MM-DD from handwritten date or security stamp near the middle of the page, else null",
 "tanker_no":"T.T. No / truck no, e.g. GJ06AX6699, no spaces",
 "grade":"e.g. VG-30",
 "qty_mt": number (Quantity in TO/MT, 3 decimals),
 "confidence":"high|medium|low",
 "notes":"anything unclear"}`;
    const txt = await gemini([{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }], true);
    wait.remove();
    let j; try { j = JSON.parse(txt.replace(/```json|```/g, '').trim()); } catch (e) { throw new Error('AI ka jawab samajh nahi aaya: ' + txt.slice(0, 200)); }
    if (j.doc_type === 'scada') return chatPush('bot', 'Ye SCADA report lag rahi hai. Photo se truck-wise register sahi nahi banta — SCADA ki Excel file (DRUM_MIX_….xlsx) upload karo.');
    showGatepassConfirm(j);
  } catch (err) { wait.remove(); chatPush('bot', 'AI error: ' + esc(err.message)); }
});
function showGatepassConfirm(j) {
  const box = document.createElement('div'); box.className = 'confirm';
  const v = { recvDate: j.received_date || j.invoice_date || '', invDate: j.invoice_date || '', invNo: j.invoice_no || '', supplier: j.supplier || '', tanker: normVeh(j.tanker_no), grade: j.grade || 'VG-30', qty: j.qty_mt ?? '' };
  box.innerHTML = `<b>Gatepass reading</b> <span class="pill ai">AI · ${esc(j.confidence || '?')}</span> — check karke Save dabao
    <div class="grid4" style="margin-top:8px">
    <label>Plant aavak date<input type="date" name="recvDate" value="${esc(v.recvDate)}"></label>
    <label>Invoice date<input type="date" name="invDate" value="${esc(v.invDate)}"></label>
    <label>Invoice no.<input name="invNo" value="${esc(v.invNo)}"></label>
    <label>Supplier<input name="supplier" value="${esc(v.supplier)}"></label>
    <label>Tanker<input name="tanker" value="${esc(v.tanker)}"></label>
    <label>Grade<input name="grade" value="${esc(v.grade)}"></label>
    <label>Qty (MT)<input name="qty" type="number" step="0.001" value="${esc(v.qty)}"></label></div>
    ${j.notes ? `<div class="muted">Note: ${esc(j.notes)}</div>` : ''}
    <div class="row"><button class="btn success">✅ Save to Bitumen register</button></div>`;
  box.querySelector('button').onclick = () => {
    const g = {}; box.querySelectorAll('[name]').forEach(i => g[i.name] = i.value.trim());
    if (addGatepass(g, 'ai')) { box.innerHTML = `✅ Saved: ${esc(g.invNo)} · ${f3(g.qty)} MT · ${dmy(g.recvDate)}`; chatPush('bot', `Gatepass ${esc(g.invNo)} (${f3(g.qty)} MT) save hua. Naya balance: <b>${f3(currentBalance() ?? 0)} MT</b>`); }
  };
  appendMsg('bot', '', box);
}
async function gemini(parts, json) {
  const cfg = aiCfg();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(cfg.key)}`;
  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0 } };
  if (json) body.generationConfig.responseMimeType = 'application/json';
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || r.status);
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}
function fileToDataUrl(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
async function shrinkImage(f, max) {
  const url = await fileToDataUrl(f);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

// ================= init =================
function renderAll() {
  const active = $('.tab.active')?.id;
  renderHome();
  if (active === 'tab-plant') renderSavedRuns();
  if (active === 'tab-bitumen') renderBitumen();
  if (active === 'tab-vehicles') renderVehicles();
  if (active === 'tab-settings') renderSettings();
}
load();
renderChatHistory();
renderAll();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
