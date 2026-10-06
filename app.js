/* Hot Mix Plant Register — Parishisht 1 / 3 / 5
   Data: browser localStorage (per device). Backup via JSON export. */
'use strict';

// ---------------- storage ----------------
const KEY = 'hmp_register_v1';
const AIKEY = 'hmp_ai_v1';
const DEF = () => ({
  settings: { workName: '', agency: '', plant: '', division: '', gpStart: 1, gpBook: '', gpLeaf: 1, gpPerBook: 50, tempMin: 140, tempMax: 165, diffMin: 0.7, diffMax: 1.1, mixCorr: 0, tankCorr: 0, travelMin: 30, paverMinT: 130 },
  items: [],
  vehicles: [],
  opening: null,            // {date, qty}
  gatepasses: [],           // {id, recvDate, invDate, invNo, supplier, tanker, grade, qty, src}
  runs: [],                 // saved plant runs
  tack: {},                 // {date: MT}
  dayTare: {},              // {date: {veh: kg}} — one tare per truck per day
  p1: {},                   // Parishisht-1 manual cols per date: {chain, waste, reason, remark}
  pv1: {},                  // Paver Parishisht-1 manual cols per date: {khatu, chain, kul, remark}
  pv2: {},                  // Paver Parishisht-2 per truck: {tb, tm, remark}
  pv2upto: '',              // Progress kis date tak poora hai (user ne confirm kiya)
  pv4: {},                  // Paver Parishisht-4 per truck: {l, c, r, remark}
  staff: [],                // [{id, role:'plant'|'paver', name, desig, from, to, locked}]
  pvLock: null,             // paver lock snapshot {upto, alloc, lens, pieces}
  chat: []
});
// STORE = { works: {id: workData}, current: id }  — har kaam ka alag data
let STORE, DB;
function fixWork(d) { const w = Object.assign(DEF(), d || {}); w.settings = Object.assign(DEF().settings, (d && d.settings) || {}); return w; }
function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  if (d.works) STORE = d;
  else if (d.runs || d.settings) { const id = uid(); STORE = { works: { [id]: d }, current: id }; }   // purana data -> pehla work
  else STORE = { works: {}, current: null };
  Object.keys(STORE.works).forEach(k => STORE.works[k] = fixWork(STORE.works[k]));
  Object.values(STORE.works).forEach(w => {   // BUSG ka naam ab BSG
    w.items.forEach(i => { if (/^BUSG$/i.test(i.name)) i.name = 'BSG'; });
    w.runs.forEach(r => { if (/^BUSG$/i.test(r.mix || '')) r.mix = 'BSG'; });
  });
  if (!STORE.works[STORE.current]) STORE.current = Object.keys(STORE.works)[0] || null;
  if (!STORE.current) { const id = uid(); STORE.works[id] = fixWork({ settings: { workName: 'Work 1' } }); STORE.current = id; }
  DB = STORE.works[STORE.current];
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(STORE)); }
  catch (e) { toast('Save nahi hua: ' + e.message); }
}
function switchWork(id) {
  if (!STORE.works[id]) return;
  STORE.current = id; DB = STORE.works[id]; save(); if (gpNeedsFix()) { renumberAllGP(); save(); }
  SC = null; DRAFT = null;
  $('#genPanel').classList.add('hidden'); $('#genTable').innerHTML = ''; $('#genSummary').innerHTML = '';
  $('#scadaInfo').textContent = 'DRUM_MIX_….xlsx (AVN SCADA format)';
  renderWorkSelect(); renderChatHistory(); renderAll();
}
function renderWorkSelect() {
  const ids = Object.keys(STORE.works).sort((a, b) => (STORE.works[a].settings.workName || '').localeCompare(STORE.works[b].settings.workName || ''));
  $('#workSel').innerHTML = ids.map(id => `<option value="${id}" ${id === STORE.current ? 'selected' : ''}>${esc(STORE.works[id].settings.workName || '(naam nahi)')}</option>`).join('')
    + '<option value="__new">➕ Naya work…</option>';
}
function newWork() {
  const name = (prompt('Naye kaam ka naam:') || '').trim();
  if (!name) { renderWorkSelect(); return; }
  const w = fixWork({ settings: { workName: name } });
  if (DB && (DB.vehicles.length || DB.items.length) && confirm(`"${DB.settings.workName}" ke vehicles aur tender items naye work mein copy karein?\n(Opening balance, gatepass, register copy nahi honge)`)) {
    w.vehicles = JSON.parse(JSON.stringify(DB.vehicles)); w.items = JSON.parse(JSON.stringify(DB.items));
    ['agency', 'plant', 'division', 'tempMin', 'tempMax', 'diffMin', 'diffMax'].forEach(k => w.settings[k] = DB.settings[k]);
  }
  const id = uid(); STORE.works[id] = w; switchWork(id);
  toast(`"${name}" bana. Settings / Vehicles / Bitumen mein details bharo.`);
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

// ---------------- site staff + lock ----------------
const ROLE = { plant: 'Plant site engineer', paver: 'Paver site work assistant' };
function staffFor(role, date) { return (DB.staff || []).find(x => x.role === role && (!x.from || x.from <= date) && (!x.to || date <= x.to)) || null; }
function lockDate(role) { return (DB.staff || []).filter(x => x.role === role && x.locked && x.to).map(x => x.to).sort().pop() || ''; }
const isLocked = (role, date) => { const l = lockDate(role); return !!l && date <= l; };
function lockMsg(role, date) { toast(`🔒 ${dmy(date)} ${ROLE[role]} ke charge mein lock hai (${dmy(lockDate(role))} tak). Settings → Site staff se unlock karo.`); }
// list ko staff ke hisaab se lagataar hisson mein baanto (print mein har staff ka alag panna)
function staffGroups(list, role, dateOf) {
  const out = [];
  list.forEach(x => { const st = staffFor(role, dateOf(x)), id = st ? st.id : '-'; const g = out[out.length - 1];
    if (g && g.id === id) g.items.push(x); else out.push({ id, staff: st, items: [x] }); });
  return out;
}
function staffLine(role, st) {
  if (!st) return '';
  return `<div class="meta" style="font-weight:600"><span>${role === 'plant' ? 'પ્લાન્ટ સાઈટ ઈજનેર' : 'પેવર સાઈટ વર્ક આસિસ્ટન્ટ'}: ${esc(st.name)}${st.desig ? ' (' + esc(st.desig) + ')' : ''}</span>
    <span>ચાર્જ: ${st.from ? dmy(st.from) : '—'} થી ${st.to ? dmy(st.to) : 'ચાલુ'}</span></div>`;
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
  rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.net - b.net);   // same second: chhota cumulative pehle
  // group by date, handle counter resets
  const byDate = {};
  rows.forEach(r => (byDate[r.date] = byDate[r.date] || []).push(r));
  const days = Object.keys(byDate).sort().map(date => {
    const rs = byDate[date];
    // SCADA ki akeli galat reading (jaise 544.8 -> 8545.3 -> 545.8) hatao: jo reading aage-peeche dono se bahut alag ho
    // aur uske baad counter wapas purani line par aa jaye. Asli reset mein counter wapas nahi aata.
    const fixes = [];
    const despike = (key, thr) => {
      for (let k = 1; k < rs.length; k++) {
        const prev = rs[k - 1][key];
        if (Math.abs(rs[k][key] - prev) <= thr) continue;
        let back = -1;
        for (let j = k + 1; j <= Math.min(k + 5, rs.length - 1); j++) if (Math.abs(rs[j][key] - prev) <= thr) { back = j; break; }
        if (back < 0) { if (k === rs.length - 1 && rs[k][key] - prev > thr * 3) back = rs.length; else continue; }   // aakhri reading hi galat
        for (let j = k; j < back; j++) { fixes.push(`${hm(rs[j].time)} ${key === 'net' ? 'Net Mix' : 'Bitumen Kg'} ${rs[j][key]} → ${prev}`); rs[j][key] = prev; }
      }
    };
    despike('net', 20); despike('bitKg', 1000);
    // Din ki shuruat mein counter pichhle din ka total dikha sakta hai (carry-over) -> use baseline maano, jodo nahi
    // carry-over tabhi maano jab din mein aage counter reset hua ho (warna shuru ki reading is din ka hi maal hai)
    // ... aur reset se pehle counter lagbhag ruka ho (jaise 313.1 -> 313.8 -> 0). Agar reset se pehle maal banta raha
    // (jaise 3.0 -> 550.4 -> 0, mix badalne par reset) to shuru ki reading asli maal hai, ghatao nahi.
    const rk = rs.findIndex((r, k) => k && rs[k - 1].net > 5 && r.net < rs[k - 1].net * 0.2);
    const hasReset = rk > 0;
    const carry = hasReset && rs[0].net > 2 && (rs[rk - 1].net - rs[0].net) < Math.max(2, 0.05 * rs[0].net);
    let baseN = carry ? rs[0].net : 0, baseB = carry ? rs[0].bitKg : 0;
    let offN = 0, offB = 0, pN = rs[0].net, pB = rs[0].bitKg, mxN = 0, mxB = 0;
    rs.forEach(r => {
      // asli counter reset tabhi jab cumulative lagbhag 0 par gire (chhota ghatna = SCADA ki gadbad, ignore)
      if (pN > 5 && r.net < pN * 0.2) { offN += Math.max(0, pN - baseN); offB += Math.max(0, pB - baseB); baseN = 0; baseB = 0; }
      pN = r.net; pB = r.bitKg;
      r.cum = Math.max(mxN, +(offN + Math.max(0, r.net - baseN)).toFixed(3));
      r.cumBit = Math.max(mxB, offB + Math.max(0, r.bitKg - baseB));   // kabhi peeche nahi
      mxN = r.cum; mxB = r.cumBit;
    });
    const last = rs[rs.length - 1];
    const bp = rs.filter(r => r.tph > 0).map(r => r.bitPct);
    return {
      date, rows: rs, totalT: last.cum, bitKg: last.cumBit,
      start: rs[0].time, end: last.time,
      bitPctSet: bp.length ? median(bp) : 0,
      hasTripper: rs.some(r => r.trip !== ''), fixes
    };
  });
  return { meta, days };
}

// ================= TARE / LOAD RULES =================
// Load (net) centre guessed from tare -> truck class (GVW)
function netFromTare(tare) {
  tare = +tare || 0;
  const gvw = tare <= 7500 ? 16200 : tare <= 10500 ? 28000 : tare <= 13500 ? 39500 : 47500;
  return r10(Math.max(3000, gvw - tare));
}
const NET_SPREAD = 700;   // har trip ka target = centre ± 700 kg
function rnd(min, max) { return r10(min + Math.random() * (max - min)); }
// Same truck, same day -> same tare (base −100 … +200)
function tareFor(date, vehNo) {
  const v = DB.vehicles.find(x => x.no === vehNo); if (!v) return 0;
  DB.dayTare[date] = DB.dayTare[date] || {};
  if (DB.dayTare[date][vehNo] == null) DB.dayTare[date][vehNo] = rnd(+v.tare - 100, +v.tare + 200);
  return DB.dayTare[date][vehNo];
}
function tripTarget(v) { const c = +v.cap || netFromTare(v.tare); return rnd(c - NET_SPREAD, c + NET_SPREAD) / 1000; }

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
      veh: veh.no, time: hm(rs[toIdx].time), net: r10(net), tare: tareFor(day.date, veh.no),
      gross: r10(net) + tareFor(day.date, veh.no), cum: rs[toIdx].cum,
      // sensor correction (Settings) — saari readings par barabar
      mixT: mixT != null ? Math.round(mixT + (+DB.settings.mixCorr || 0)) : '', tankT: tankT != null ? Math.round(tankT + (+DB.settings.tankCorr || 0)) : '',
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
    // Lead time niyam: truck plant se nikla to 2 × lead time ke baad hi wapas bharega
    const lead = (+DB.settings.travelMin || 0) * 60, busy = opts.busy || {};
    let short = false;
    const pick = startSec => {
      for (let k = 0; k < active.length; k++) {
        const idx = (vi + k) % active.length, v = active[idx];
        if (busy[v.no] == null || busy[v.no] + 2 * lead <= startSec) { vi = idx; return v; }
      }
      // koi truck wapas nahi aaya: jo sabse pehle aayega wahi (remark mein note)
      short = true;
      const v = [...active].sort((a, b) => (busy[a.no] ?? -1e9) - (busy[b.no] ?? -1e9))[0];
      vi = active.indexOf(v); return v;
    };
    let curV = pick(secs(rs[0].time)), curShort = short, cap = tripTarget(curV);
    for (let i = 0; i < rs.length; i++) {
      let guard = 0;
      while (rs[i].cum - base >= cap && guard++ < 20) {
        // SCADA mein readings ka gap ho to ek saath bahut maal dikh jata hai: capacity se 1.5 T se zyada upar ho to
        // truck capacity par hi niklega, baaki agle truck mein
        const got = rs[i].cum - base, over = got - cap > 1.5, take = over ? cap : got;
        push(from, i, take * 1000, curV);
        if (curShort) trucks[trucks.length - 1].remark = 'Truck kam — 2× lead time se pehle wapas';
        busy[curV.no] = secs(rs[i].time);
        base = +(base + take).toFixed(3); from = over ? i : i + 1; vi = (vi + 1) % active.length;
        short = false; curV = pick(secs(rs[i].time)); curShort = short; cap = tripTarget(curV);
      }
    }
    const rem = (rs[rs.length - 1].cum - base) * 1000;
    if (rem >= 100) { push(from, rs.length - 1, rem, curV); busy[curV.no] = secs(rs[rs.length - 1].time); if (curShort) trucks[trucks.length - 1].remark = 'Truck kam — 2× lead time se pehle wapas'; }   // last truck = partial
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
    // Aakhri partial truck apni capacity ke 50% se kam ho to wo maal baaki trucks mein baant do
    const L = trucks[trucks.length - 1];
    if (rem >= 100 && L && trucks.length > 1) {
      const lv = DB.vehicles.find(v => v.no === L.veh);
      const cap = +(lv?.cap) || netFromTare(lv?.tare);
      if (L.net < cap * 0.5) {
        trucks.pop();
        const rest = trucks, n = rest.length;
        const each = Math.floor(L.net / n / 10) * 10;
        rest.forEach(t => { t.net += each; });
        rest[n - 1].net += L.net - each * n;          // bacha hua (10 kg tak) aakhri truck mein
        rest.forEach(t => { t.gross = t.net + t.tare; });
        const last = rest[n - 1]; last.time = L.time; last.cum = L.cum;   // aakhri truck din ke ant mein nikla
        if (L.remark) last.remark = (last.remark ? last.remark + ', ' : '') + L.remark;
      }
    }
  }
  // Trucks ka jod hamesha SCADA ke total ke barabar (100 kg se kam bacha maal ya rounding aakhri truck mein)
  if (trucks.length) {
    const delta = Math.round(rs[rs.length - 1].cum * 1000) - trucks.reduce((x, t) => x + t.net, 0);
    if (delta && Math.abs(delta) <= 1000) { const L = trucks[trucks.length - 1]; L.net += delta; L.gross = L.net + L.tare; }
  }
  // Register total SCADA se thoda kam (practical weighbridge vs SCADA farak) — kabhi zyada nahi
  const dMin = (+DB.settings.diffMin || 0) / 100, dMax = (+DB.settings.diffMax || 0) / 100;
  let run = 0;
  trucks.forEach(t => {
    t.scadaNet = t.net;
    const d = dMin + Math.random() * Math.max(0, dMax - dMin);
    t.net = r10(t.net * (1 - d)); t.gross = t.net + t.tare;
    run += t.net; t.regCum = run / 1000;
  });
  trucks.forEach(setFlags);
  return trucks;
}
function setFlags(t) {
  const s = DB.settings, f = [], m = +t.mixT;
  if (t.mixT !== '' && (m < +s.tempMin || m > +s.tempMax)) f.push(`Mix temp ${t.mixT}°C range se bahar`);
  t.flags = f;
}
const regTotal = r => r.trucks.reduce((a, t) => a + (+t.net || 0), 0) / 1000;
// ---- Gate pass: "book/leaf" (1790/1 … 1790/50 -> 1791/1). Book khatam hone par agla book +1 (edit kar sakte ho)
function parseGP(g) { const m = String(g ?? '').trim().match(/^(\d+)\s*\/\s*(\d+)$/); return m ? { book: +m[1], leaf: +m[2] } : (/^\d+$/.test(String(g ?? '').trim()) ? { num: +g } : null); }
function nextGP(g) {
  const p = parseGP(g); if (!p) return firstGP();
  if (p.num != null) return +DB.settings.gpBook ? firstGP() : String(p.num + 1);
  const per = +DB.settings.gpPerBook || 50;
  if (p.leaf < per) return `${p.book}/${p.leaf + 1}`;
  const nb = nextBook(p.book); return `${nb}/${bookLeaf(bookSeq(400).indexOf(nb))}`;
}
// book index ka pehla leaf (default 1; Settings > Gate pass books se badal sakte ho)
function bookLeaf(i) { const s = DB.settings; return i === 0 ? (+s.gpLeaf || 1) : (i > 0 && +(s.gpLeafs || {})[i]) || 1; }
// Book no. nahi bhara ho to pucho
function ensureGpBook() {
  if (+DB.settings.gpBook) return true;
  const v = prompt('Pehli gate pass book ka no. kya hai?\nGate pass 2105/1, 2105/2 … 2105/50, phir 2106/1 … aise chalenge.', '2105');
  const m = String(v || '').trim().match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
  if (!m) { toast('Gate pass book no. zaroori hai — Settings mein bharo'); return false; }
  DB.settings.gpBook = +m[1]; if (m[2]) DB.settings.gpLeaf = +m[2];
  if (DB.runs.length) renumberAllGP();
  save(); return true;
}
// purane galat no. (sirf 51, 52… ya 2105/51) ho to theek karo
function gpNeedsFix() {
  if (!+DB.settings.gpBook) return false;
  const per = +DB.settings.gpPerBook || 50;
  return DB.runs.some(r => r.trucks.some(t => { const p = parseGP(t.gp); return !p || p.num != null || p.leaf > per; }));
}
// Gate pass books ka kram: pehli book Settings se, aage +1; kisi book ka no. alag ho to gpBooks[index] mein
function bookSeq(n) {
  const ov = DB.settings.gpBooks || {}, out = []; let cur = +DB.settings.gpBook || 0;
  for (let i = 0; i < n; i++) { cur = i === 0 ? (+ov[0] || cur) : (+ov[i] || out[i - 1] + 1); out.push(cur); }
  return out;
}
function nextBook(book) { const seq = bookSeq(400), i = seq.indexOf(book); return i >= 0 && i + 1 < seq.length ? seq[i + 1] : book + 1; }
function renumberAllGP() {   // saare (bina lock wale) register ke gate pass dobara
  let gp = firstGP();
  [...DB.runs].sort((a, b) => runKey(a).localeCompare(runKey(b))).forEach(r => {
    gp = numberFrom(r.trucks, 0, gp);
  });
}
function firstGP() { const s = DB.settings; return s.gpBook ? `${bookSeq(1)[0]}/${+s.gpLeaf || 1}` : String(+s.gpStart || 1); }
const runKey = r => r.date + ' ' + (r.start || '');
function startGPFor(run) {   // is run se pehle wale aakhri truck ka agla no.
  const prev = DB.runs.filter(r => r.id !== run.id && runKey(r) < runKey(run) && r.trucks.length).sort((a, b) => runKey(a).localeCompare(runKey(b))).pop();
  return prev ? nextGP(prev.trucks[prev.trucks.length - 1].gp) : firstGP();
}
function numberFrom(trucks, from, gp) { for (let i = from; i < trucks.length; i++) { trucks[i].gp = gp; gp = nextGP(gp); } return gp; }
// is run ke baad wale saved runs ka numbering aage badhao
function cascadeGP(run) {
  let gp = nextGP(run.trucks[run.trucks.length - 1]?.gp);
  DB.runs.filter(r => r.id !== run.id && runKey(r) > runKey(run)).sort((a, b) => runKey(a).localeCompare(runKey(b)))
    .forEach(r => { gp = numberFrom(r.trucks, 0, gp); });
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
// ---- Item (mix) pehchaan: SCADA ke Bitumen % set-point ko Settings ke item % se milao
// Chhote tweaks (15 min ya 10 T se kam) ignore; asli mix badle to din ke hisse alag register banenge
function splitByItem(day, forced) {
  const items = DB.items.filter(i => +i.pct > 0);
  const mk = (rows, item, pc, pb) => {
    const rs = rows.map(r => Object.assign({}, r, { cum: +(r.cum - pc).toFixed(3), cumBit: r.cumBit - pb }));
    const last = rs[rs.length - 1], bp = rs.filter(r => r.tph > 0).map(r => r.bitPct);
    return { date: day.date, rows: rs, totalT: last.cum, bitKg: last.cumBit, start: rs[0].time, end: last.time,
      bitPctSet: bp.length ? median(bp) : 0, hasTripper: rs.some(r => r.trip !== ''),
      item: item ? item.code : '', mix: item ? item.name : (SC?.meta.mix || '') };
  };
  if (forced && forced !== 'auto') return [mk(day.rows, DB.items.find(i => i.code == forced), 0, 0)];
  if (!items.length) return [mk(day.rows, null, 0, 0)];
  const near = p => items.reduce((b, i) => Math.abs(i.pct - p) < Math.abs(b.pct - p) ? i : b);
  let lab = null;
  const labels = day.rows.map(r => { if (r.tph > 0 && r.bitPct > 0) lab = near(r.bitPct).code; return lab; });
  const firstLab = labels.find(x => x) || items[0].code;
  for (let k = 0; k < labels.length && !labels[k]; k++) labels[k] = firstLab;
  let segs = [];
  labels.forEach((l, k) => { const g = segs[segs.length - 1]; if (g && g.code === l) g.to = k; else segs.push({ code: l, from: k, to: k }); });
  const sec = t => { const [h, m, x] = t.split(':').map(Number); return h * 3600 + m * 60 + (x || 0); };
  const R = day.rows;
  const ton = g => R[g.to].cum - (g.from ? R[g.from - 1].cum : 0), dur = g => sec(R[g.to].time) - sec(R[g.from].time);
  const joinSame = a => a.reduce((o, g) => { const p = o[o.length - 1]; if (p && p.code === g.code) p.to = g.to; else o.push({ ...g }); return o; }, []);
  segs = joinSame(segs);
  for (let guard = 0; segs.length > 1 && guard < 1000; guard++) {
    // sabse chhota kamzor hissa pehle padosi mein milao
    let wi = -1, wt = Infinity;
    segs.forEach((g, k) => { if ((dur(g) < 900 || ton(g) < 10) && ton(g) < wt) { wt = ton(g); wi = k; } });
    if (wi < 0) break;
    const g = segs[wi];
    if (wi > 0) segs[wi - 1].to = g.to; else segs[1].from = g.from;
    segs.splice(wi, 1); segs = joinSame(segs);
  }
  return segs.map(g => mk(R.slice(g.from, g.to + 1), items.find(i => i.code === g.code), g.from ? R[g.from - 1].cum : 0, g.from ? R[g.from - 1].cumBit : 0));
}
function fixNote(d) { return d.fixes && d.fixes.length ? ` <span class="flag" title="${esc(d.fixes.join('\n'))}">⚠ SCADA ki ${d.fixes.length} galat reading hatai (${esc(d.fixes[0])}${d.fixes.length > 1 ? ' …' : ''})</span>` : ''; }
function partsLabel(day) { return splitByItem(day, 'auto').map(p => `${esc(p.mix || '?')} ${f2(p.bitPctSet)}% · ${f2(p.totalT)} MT`).join(' + '); }
function loadScadaIntoPlant(res) {
  SC = res; DRAFT = null;
  $('#scadaInfo').innerHTML = `<b>${esc(res.file)}</b> · ${esc(res.meta.work)}<br>` + res.days.map(d => `${dmy(d.date)}: <b>${partsLabel(d)}</b>${fixNote(d)}`).join('<br>');
  $('#genPanel').classList.remove('hidden');
  $('#genDate').innerHTML = res.days.map(d => `<option value="${d.date}">${dmy(d.date)} (${d.start.slice(0, 5)}–${d.end.slice(0, 5)})</option>`).join('');
  fillItemSelect($('#genItem'), res.meta.mix);
  const lv = lastVehicleUsed(); const act = DB.vehicles.filter(v => v.active !== false);
  let start = act[0]?.no;
  if (lv) { const i = act.findIndex(v => v.no === lv); if (i >= 0) start = act[(i + 1) % act.length].no; }
  $('#genStartVeh').innerHTML = act.map(v => `<option ${v.no === start ? 'selected' : ''}>${esc(v.no)}</option>`).join('');
  $('#genTable').innerHTML = ''; $('#genSummary').innerHTML = ''; $('#btnSaveRun').classList.add('hidden');
  $('#btnGenAll').classList.toggle('hidden', res.days.length < 2);
  $('#btnGenAll').textContent = `📅 Sab ${res.days.length} din ek saath (save bhi)`;
  const d = res.days[0];
  $('#genNote').textContent = d.hasTripper ? 'SCADA mein Tripper No. hai — asli tripper breaks use honge.' : 'Tripper No. SCADA mein khali hai — truck capacity ke hisaab se cumulative split hoga.';
}
function fillItemSelect(sel, mixHint) {
  if (!DB.items.length) { sel.innerHTML = `<option value="">(Settings mein item add karo)</option>`; return; }
  sel.innerHTML = `<option value="auto" selected>Auto — SCADA Bitumen % se</option>` +
    DB.items.map(i => `<option value="${esc(i.code)}">Sirf I-${esc(i.code)} ${esc(i.name)} (${i.pct}%)</option>`).join('');
}
$('#scadaFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try { loadScadaIntoPlant(await readScadaFile(f)); } catch (err) { toast(err.message); }
  e.target.value = '';
});
$('#btnGenerate').addEventListener('click', () => {
  if (!SC) return;
  const day = SC.days.find(d => d.date === $('#genDate').value);
  if (isLocked('plant', day.date)) return lockMsg('plant', day.date);
  const parts = splitByItem(day, $('#genItem').value);
  if (!ensureGpBook()) return;
  if (parts.length > 1) { toast(`Is din ${parts.length} mix mile — sab ka register ban raha hai`); return generateDays([day]); }
  try {
    const p = parts[0];
    const trucks = generateTrucks(p, { startVeh: $('#genStartVeh').value, tank: $('#genTank').value, useTripper: true });
    const existing = DB.runs.find(r => sameRun(r, p, SC.file));
    DRAFT = makeRun(p, trucks, existing?.id);
    numberFrom(DRAFT.trucks, 0, startGPFor(DRAFT));
    renderDraft();
    if (existing) toast('Is samay ka register pehle se saved hai — Save karne par replace hoga.');
  } catch (err) { toast(err.message); }
});
function makeRun(p, trucks, id) {
  return { id: id || uid(), date: p.date, file: SC.file, mix: p.mix, item: p.item,
    start: p.start, end: p.end, totalT: p.totalT, bitKg: p.bitKg, bitPctSet: p.bitPctSet,
    work: SC.meta.work, trucks, src: p.hasTripper ? 'tripper' : 'cumulative',
    mixCorr: +DB.settings.mixCorr || 0, tankCorr: +DB.settings.tankCorr || 0 };
}
// Kai din ki SCADA: har din ka register ek saath banao aur save karo (truck rotation aur gate pass lagataar)
// same din + samay overlap = wahi production (dusri file se pehle save hua ho tab bhi)
function sameRun(r, day, file) {
  if (r.date !== day.date) return false;
  // samay sach mein overlap ho tabhi "wahi production" (second tak; sirf kinara chhoone se nahi)
  const sc = t => { const [h, m, x] = String(t || '0:0:0').split(':').map(Number); return h * 3600 + m * 60 + (x || 0); };
  return sc(r.start) < sc(day.end) && sc(day.start) < sc(r.end);
}
function generateAllDays() { if (SC) generateDays(SC.days); }
function generateDays(days) {
  if (!ensureGpBook()) return;
  if (!SC) return;
  const act = DB.vehicles.filter(v => v.active !== false);
  if (!act.length) return toast('Pehle Vehicles tab mein trucks add karo.');
  const forced = $('#genItem').value, tank = $('#genTank').value;
  let startVeh = $('#genStartVeh').value;
  const parts = days.flatMap(d => splitByItem(d, forced));
  const already = parts.filter(p => DB.runs.some(r => sameRun(r, p, SC.file)));
  let replace = true;
  if (already.length) replace = confirm(`${[...new Set(already.map(p => dmy(p.date)))].join(', ')} ka register pehle se saved hai.\n\nOK = dobara bana kar replace karo\nCancel = unhe chhod do, baaki banao`);
  const done = [], busyByDate = {}, made = new Set();
  try {
    parts.forEach(p => {
      if (isLocked('plant', p.date)) { done.push({ date: p.date, mix: p.mix, n: '—', scada: p.totalT, reg: DB.runs.filter(r => sameRun(r, p, SC.file)).reduce((a, r) => a + regTotal(r), 0), gp: '🔒 lock (chhoda)' }); return; }
      const olds = DB.runs.filter(r => sameRun(r, p, SC.file) && !made.has(r.id));   // isi baar bane hisse kabhi nahi hatenge
      if (olds.length && !replace) { done.push({ date: p.date, mix: p.mix, n: '—', scada: p.totalT, reg: olds.reduce((a, r) => a + regTotal(r), 0), gp: 'pehle se saved (chhoda)' }); return; }
      DB.runs = DB.runs.filter(r => !olds.includes(r));
      busyByDate[p.date] = busyByDate[p.date] || {};
      const trucks = generateTrucks(p, { startVeh, tank, useTripper: true, busy: busyByDate[p.date] });
      const run = makeRun(p, trucks, olds[0]?.id);
      numberFrom(trucks, 0, startGPFor(run)); DB.runs.push(run); made.add(run.id);
      const last = trucks[trucks.length - 1]?.veh; const i = act.findIndex(v => v.no === last);
      if (i >= 0) startVeh = act[(i + 1) % act.length].no;
      done.push({ date: p.date, mix: `${p.mix} (${f2(p.bitPctSet)}%)`, n: trucks.length, scada: p.totalT, reg: trucks.reduce((a, t) => a + t.net, 0) / 1000, gp: trucks.length ? `${trucks[0].gp} – ${trucks[trucks.length - 1].gp}` : '' });
    });
  } catch (err) { save(); renderAll(); return toast(err.message); }
  // aage ke saved din ho to unka gate pass numbering aage badhao
  const mine = DB.runs.filter(r => made.has(r.id)).sort((a, b) => runKey(a).localeCompare(runKey(b)));
  const lastRun = mine[mine.length - 1];
  if (lastRun && DB.runs.some(r => runKey(r) > runKey(lastRun)) && confirm('Aage ke saved din ke gate pass no. bhi is hisaab se aage badha dein?')) cascadeGP(lastRun);
  save(); DRAFT = null; $('#genTable').innerHTML = ''; $('#btnSaveRun').classList.add('hidden');
  $('#genSummary').innerHTML = `<div class="sum"><span><b>${done.length}</b> register save hue. Neeche "Saved register" mein ✏️ Edit se check/badal sakte ho.</span></div>
    <div class="tablewrap"><table class="grid"><thead><tr><th>Date</th><th>Mix (SCADA %)</th><th>Trucks</th><th>Gate pass</th><th>SCADA MT</th><th>Register MT</th><th>Farak</th></tr></thead><tbody>
    ${done.map(d => `<tr><td>${dmy(d.date)}</td><td>${esc(d.mix)}</td><td>${d.n}</td><td>${d.gp}</td><td>${f2(d.scada)}</td><td>${f2(d.reg)}</td><td>${f2(d.scada - d.reg)}</td></tr>`).join('')}</tbody></table></div>`;
  renderAll(); toast(`${done.length} register ban gaye`);
}
$('#btnGenAll').addEventListener('click', generateAllDays);
$('#btnRedetect').addEventListener('click', () => {
  const items = DB.items.filter(i => +i.pct > 0); if (!items.length) return toast('Settings mein item aur % daalo');
  const ch = [];
  DB.runs.forEach(r => {
    if (!r.bitPctSet || isLocked('plant', r.date)) return;
    const it = items.reduce((b, i) => Math.abs(i.pct - r.bitPctSet) < Math.abs(b.pct - r.bitPctSet) ? i : b);
    if (it.code != r.item) ch.push({ r, it });
  });
  if (!ch.length) return toast('Sab register ka item sahi hai');
  if (!confirm(ch.map(c => `${dmy(c.r.date)}: ${c.r.mix || itemLabel(c.r.item)} → ${c.it.name} (SCADA ${f2(c.r.bitPctSet)}%)`).join('\n') + '\n\nYe badlaav karein?')) return;
  ch.forEach(c => { c.r.item = c.it.code; c.r.mix = c.it.name; });
  save(); renderAll(); toast(`${ch.length} register ka item badla`);
});
function renderDraft() {
  const d = DRAFT; if (!d) return;
  const sumNet = d.trucks.reduce((a, t) => a + t.net, 0);
  $('#genSummary').innerHTML = `<div class="sum">
    <span>SCADA kul mix: <b>${f2(d.totalT)} MT</b></span>
    <span>Register (trucks) total: <b>${f2(sumNet / 1000)} MT</b></span>
    <span>Farak: <b>${f2(d.totalT - sumNet / 1000)} MT</b> (${d.totalT ? f2((d.totalT - sumNet / 1000) / d.totalT * 100) : 0}%)</span>
    <span>Trucks: <b>${d.trucks.length}</b></span>
    <span>Bitumen (SCADA): <b>${f3(d.bitKg / 1000)} MT</b> (${d.totalT ? f2(d.bitKg / 10 / d.totalT) : 0}%)</span>
    <span>Plant chalu: <b>${hm(d.start)}–${hm(d.end)}</b></span></div>`;
  const vehOpts = sel => DB.vehicles.map(v => `<option ${v.no === sel ? 'selected' : ''}>${esc(v.no)}</option>`).join('');
  $('#genTable').innerHTML = `<thead><tr><th>#</th><th>Truck</th><th>Samay</th><th>Gate pass</th><th>Gross (kg)</th><th>Net (kg)</th><th>Tare (kg)</th><th>Cum. (MT)</th><th>Agg. temp</th><th>Tank temp</th><th>Mix temp</th><th>Remark</th></tr></thead><tbody>` +
    d.trucks.map((t, i) => `<tr class="${t.flags?.length ? 'warn' : ''}"><td>${i + 1}</td>
      <td><select data-i="${i}" data-f="veh">${vehOpts(t.veh)}</select></td>
      <td>${t.time}</td><td><input data-i="${i}" data-f="gp" value="${esc(t.gp)}" style="width:80px"></td><td>${t.gross}</td><td><b>${t.net}</b></td><td><input data-i="${i}" data-f="tare" type="number" step="10" value="${t.tare}" style="width:80px"></td><td>${f2(t.regCum ?? t.cum)}</td>
      <td><input data-i="${i}" data-f="aggT" value="${esc(t.aggT)}" placeholder="manual" style="width:70px"></td>
      <td><input data-i="${i}" data-f="tankT" type="number" value="${esc(t.tankT)}" style="width:62px"></td>
      <td><input data-i="${i}" data-f="mixT" type="number" value="${esc(t.mixT)}" style="width:62px"></td>
      <td class="l"><input data-i="${i}" data-f="remark" value="${esc(t.remark)}" style="width:130px">${t.flags?.length ? `<div class="flag">⚠ ${esc(t.flags.join(', '))}</div>` : ''}</td></tr>`).join('') + '</tbody>';
  $('#btnSaveRun').classList.remove('hidden');
}
$('#genTable').addEventListener('change', e => {
  const el = e.target; const i = +el.dataset.i; const f = el.dataset.f; if (!DRAFT || isNaN(i)) return;
  const t = DRAFT.trucks[i];
  if (f === 'veh') { t.veh = el.value; t.tare = tareFor(DRAFT.date, el.value); t.gross = t.net + t.tare; renderDraft(); }
  else if (f === 'tare') {   // din ka tare badla -> us din ke saare trips mein
    const v = r10(+el.value || 0); DB.dayTare[DRAFT.date] = DB.dayTare[DRAFT.date] || {}; DB.dayTare[DRAFT.date][t.veh] = v;
    DRAFT.trucks.forEach(x => { if (x.veh === t.veh) { x.tare = v; x.gross = x.net + v; } }); save(); renderDraft();
  }
  else if (f === 'gp') {
    if (!parseGP(el.value)) { toast('Gate pass aise likho: 1790/1'); el.value = t.gp; return; }
    numberFrom(DRAFT.trucks, i, el.value.replace(/\s/g, '')); renderDraft();
  }
  else if (f === 'mixT' || f === 'tankT') { t[f] = el.value === '' ? '' : +el.value; setFlags(t); renderDraft(); }
  else t[f] = el.value;
});
$('#btnSaveRun').addEventListener('click', () => {
  if (!DRAFT) return;
  if (isLocked('plant', DRAFT.date)) return lockMsg('plant', DRAFT.date);
  DB.runs = DB.runs.filter(r => r.id !== DRAFT.id);
  DB.runs.push(DRAFT);
  const later = DB.runs.filter(r => r.id !== DRAFT.id && runKey(r) > runKey(DRAFT)).length;
  if (later && confirm(`Aage ke ${later} saved din ke gate pass no. bhi is hisaab se aage badha dein?`)) cascadeGP(DRAFT);
  save();
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
  $('#savedRuns').innerHTML = runs.map(r => `<details class="dayblock"><summary>${isLocked('plant', r.date) ? '🔒 ' : ''}${dmy(r.date)} · ${esc(itemLabel(r.item) || r.mix)} · ${r.trucks.length} trucks · register ${f2(regTotal(r))} MT (SCADA ${f2(r.totalT)}) · bitumen ${f3(r.bitKg / 1000)} MT
      <span class="pill">${r.src === 'tripper' ? 'SCADA tripper' : 'SCADA cumulative'}</span></summary>
      <div class="tablewrap"><table class="grid"><thead><tr><th>Truck</th><th>Samay</th><th>GP</th><th>Gross</th><th>Net</th><th>Tare</th><th>Agg</th><th>Tank</th><th>Mix</th><th>Remark</th></tr></thead><tbody>
      ${r.trucks.map(t => `<tr><td>${esc(t.veh)}</td><td>${t.time}</td><td>${t.gp}</td><td>${t.gross}</td><td>${t.net}</td><td>${t.tare}</td><td>${esc(t.aggT)}</td><td>${t.tankT}</td><td>${t.mixT}</td><td class="l">${esc(t.remark)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="row"><button class="btn sm" data-edit="${r.id}">✏️ Edit</button><button class="btn sm danger" data-del="${r.id}">🗑 Delete</button></div></details>`).join('');
}
$('#savedRuns').addEventListener('click', e => {
  const eid = e.target.dataset.edit;
  { const rid = eid || e.target.dataset.del, rr = rid && DB.runs.find(r => r.id === rid); if (rr && isLocked('plant', rr.date)) return lockMsg('plant', rr.date); }
  if (eid) {
    DRAFT = JSON.parse(JSON.stringify(DB.runs.find(r => r.id === eid)));
    let c = 0; DRAFT.trucks.forEach(t => { c += +t.net; t.regCum = c / 1000; setFlags(t); });
    $('#genPanel').classList.remove('hidden'); renderDraft(); $('#genPanel').scrollIntoView({ behavior: 'smooth' });
    return toast('Edit karke "Register mein Save" dabao');
  }
  const id = e.target.dataset.del; if (!id) return;
  if (!confirm('Ye din ka register delete karna hai?')) return;
  DB.runs = DB.runs.filter(r => r.id !== id); save(); renderAll();
});

// ================= PRINT: Parishisht 5 / 3 =================
function regHead(no, title, staff, role = 'plant') {
  const s = DB.settings;
  return `<h2>પરિશિષ્ટ - ${no}</h2><h4>${title}</h4>
  <div class="meta"><span>કામનું નામ: ${esc(s.workName)}</span><span>એજન્સી: ${esc(s.agency)}</span><span>પ્લાન્ટ: ${esc(s.plant)}</span></div>${staffLine(role, staff)}`;
}
// Excel ke upar ki line: parishisht, sheershak, kaam
function xlsTop(no, title, cols) {
  const s = DB.settings;
  return [[`પરિશિષ્ટ - ${no}`], [title], [`કામનું નામ: ${s.workName || ''}`, ...Array(Math.max(0, Math.floor(cols / 3) - 1)).fill(''), `એજન્સી: ${s.agency || ''}`, ...Array(Math.max(0, Math.floor(cols / 3) - 1)).fill(''), `પ્લાન્ટ: ${s.plant || ''}`], []];
}
// Register jaisi Excel sheet: upar title (merge), group heading, column heading, column no., chaudi columns
// a = xlsTop(4 line) + heading line + data;  groups = [[pehla col, aakhri col, 'group ka naam'], ...]
function xlsSheet(a, groups) {
  const H = 4, head = a[H], n = head.length, data = a.slice(H + 1);
  const rows = a.slice(0, H), merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: n - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: n - 1 } }];
  let top = H;
  if (groups && groups.length) {
    const g = Array(n).fill(''), h2 = Array(n).fill('');
    for (let c = 0; c < n; c++) {
      const grp = groups.find(x => c >= x[0] && c <= x[1]);
      if (grp) { if (c === grp[0]) { g[c] = grp[2]; merges.push({ s: { r: H, c: grp[0] }, e: { r: H, c: grp[1] } }); } h2[c] = head[c]; }
      else { g[c] = head[c]; merges.push({ s: { r: H, c }, e: { r: H + 1, c } }); }   // bina group wala: do line mein ek hi heading
    }
    rows.push(g, h2); top = H + 1;
  } else rows.push(head);
  rows.push(head.map((_, i) => i + 1));            // column no. 1, 2, 3 …
  const ws = XLSX.utils.aoa_to_sheet([...rows, ...data]);
  ws['!merges'] = merges;
  ws['!cols'] = head.map((h, c) => {
    const longest = Math.max(...data.map(r => String(r[c] ?? '').length), 0);
    return { wch: Math.min(42, Math.max(12, longest + 2, Math.min(26, String(h).length + 2))) };
  });
  ws['!rows'] = []; ws['!rows'][top] = { hpt: 48 };
  return ws;
}
function printP5(runs) { return staffGroups(runs, 'plant', r => r.date).map(g => printP5One(g.items, g.staff)).join(''); }
function printP3(runs) { return staffGroups(runs, 'plant', r => r.date).map(g => printP3One(g.items, g.staff)).join(''); }
function printP5One(runs, staff) {
  let rowsHtml = '';
  runs.forEach(r => {
    r.trucks.forEach((t, i) => {
      const last = i === r.trucks.length - 1;
      rowsHtml += `<tr><td>${i + 1}</td><td>${i === 0 ? dmy(r.date) : ''}</td><td>${i === 0 ? esc(itemLabel(r.item) || r.mix) : ''}</td>
      <td>${esc(t.veh)}</td><td>${t.time}</td><td>${t.gp}</td><td>${t.gross}</td><td>${t.net}</td>
      <td class="tot">${last ? f2(regTotal(r)) + ' MT' : ''}</td><td>${t.tare}</td><td></td><td></td><td>${esc(t.remark)}</td></tr>`;
    });
    rowsHtml += `<tr><td colspan="13" style="height:8px"></td></tr>`;
  });
  return `<div class="reg">${regHead('૫', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર કામ માટેના મીશ્રણના વજન વગેરેની નોંધ', staff)}
  <table><thead>
  <tr><th rowspan="2">ક્રમાંક</th><th rowspan="2">તારીખ</th><th rowspan="2">ટેન્ડરની આઈટમ નંબર તથા તેનું વર્ણન ટૂંકમાં</th>
  <th colspan="6">ટ્રક અથવા ડામર મિશ્રણની હેરફેર</th><th rowspan="2">ખાલી ટ્રકનું વજન</th><th rowspan="2">વજન લેનાર અને નોંધનારની સહી</th><th rowspan="2">ઠેકેદારની સહી</th><th rowspan="2">રીમાર્ક</th></tr>
  <tr><th>ટ્રક નંબર</th><th>સમય</th><th>ગેટ પાસ નંબર</th><th>ગાડી સાથે મિશ્રણનું વજન</th><th>ટ્રકમાં મિશ્રણનું નેટ વજન</th><th>દિવસના અંતે કુલ વજન</th></tr>
  <tr class="num">${[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => `<td>${n}</td>`).join('')}</tr>
  </thead><tbody>${rowsHtml}</tbody></table></div>`;
}
function corrNote(runs) {
  const m = [...new Set(runs.map(r => +r.mixCorr || 0))], t = [...new Set(runs.map(r => +r.tankCorr || 0))];
  const sg = v => (v > 0 ? '+' : '') + v;
  const parts = [];
  if (m.some(v => v)) parts.push(`મિશ્રણનું ઉષ્ણતામાન = SCADA ${m.map(sg).join(' / ')}°C (સેન્સર કરેક્શન)`);
  if (t.some(v => v)) parts.push(`ટાંકીનું ઉષ્ણતામાન = SCADA ${t.map(sg).join(' / ')}°C (સેન્સર કરેક્શન)`);
  return parts.length ? `<p style="font-size:10px;margin:4px 0">નોંધ: ${parts.join('; ')}</p>` : '';
}
function printP3One(runs, staff) {
  let rowsHtml = '';
  runs.forEach(r => {
    r.trucks.forEach((t, i) => {
      rowsHtml += `<tr><td>${i === 0 ? dmy(r.date) : ''}</td><td>${t.time}</td><td>${i === 0 ? esc(r.mix || itemLabel(r.item)) : ''}</td><td>${esc(t.veh)}</td>
      <td>${t.aggT ? esc(t.aggT) + '°C' : ''}</td><td>${t.tankT !== '' ? t.tankT + '°C' : ''}</td><td>${t.mixT !== '' ? t.mixT + '°C' : ''}</td>
      <td>${esc(t.chain)}</td><td></td><td>${esc(t.remark)}</td></tr>`;
    });
    rowsHtml += `<tr><td colspan="10" style="height:8px"></td></tr>`;
  });
  return `<div class="reg">${regHead('૩', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર (એગ્રીગેટ) મીશ્રણના ઉષ્ણતામાનની નોંધ', staff)}
  <table><thead>
  <tr><th rowspan="2">તારીખ</th><th rowspan="2">સમય</th><th rowspan="2">મિશ્રણનો પ્રકાર</th><th rowspan="2">ટ્રક નંબર</th>
  <th colspan="3">ઉષ્ણતામાનના માપ ફેરનહીટ / સેન્ટીગ્રેડ અંશ</th><th rowspan="2">મિશ્રણ જે સ્થળે પાથરવાનું છે તેના કિ.મી. ચેઈનેજ વગેરે</th><th rowspan="2">ઉષ્ણતામાનની નોંધ રાખનારની સહી</th><th rowspan="2">રીમાર્ક</th></tr>
  <tr><th>ગરમ કરેલ એગ્રીગેટનું ઉ.</th><th>ટાંકીમાં ગરમ ડામરનું ઉ.</th><th>હોટમીક્ષ પ્લાન્ટમાંથી બહાર આવતા મિશ્રણનું ઉ.</th></tr>
  <tr class="num">${[1,2,3,4,5,6,7,8,9,10].map(n => `<td>${n}</td>`).join('')}</tr>
  </thead><tbody>${rowsHtml}</tbody></table>${corrNote(runs)}</div>`;
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
  const p5 = [...xlsTop('૫', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર કામ માટેના મીશ્રણના વજન વગેરેની નોંધ', 11),
    ['ક્રમાંક', 'તારીખ', 'ટેન્ડરની આઈટમ નંબર તથા તેનું વર્ણન ટૂંકમાં', 'ટ્રક નંબર', 'સમય', 'ગેટ પાસ નંબર', 'ગાડી સાથે મિશ્રણનું વજન (કિ.ગ્રા.)', 'ટ્રકમાં મિશ્રણનું નેટ વજન (કિ.ગ્રા.)', 'દિવસના અંતે કુલ વજન (મે.ટન)', 'ખાલી ટ્રકનું વજન (કિ.ગ્રા.)', 'રીમાર્ક']];
  const p3 = [...xlsTop('૩', 'હોટમીક્ષ પ્લાન્ટ સાઈટ ઉપર ડામર (એગ્રીગેટ) મીશ્રણના ઉષ્ણતામાનની નોંધ', 9),
    ['તારીખ', 'સમય', 'મિશ્રણનો પ્રકાર', 'ટ્રક નંબર', 'ગરમ કરેલ એગ્રીગેટનું ઉ. (°C)', 'ટાંકીમાં ગરમ ડામરનું ઉ. (°C)', 'હોટમીક્ષ પ્લાન્ટમાંથી બહાર આવતા મિશ્રણનું ઉ. (°C)', 'મિશ્રણ જે સ્થળે પાથરવાનું છે તેના કિ.મી. ચેઈનેજ', 'રીમાર્ક']];
  runs.forEach(r => r.trucks.forEach((t, i) => {
    p5.push([i + 1, dmy(r.date), itemLabel(r.item) || r.mix, t.veh, t.time, t.gp, t.gross, t.net, i === r.trucks.length - 1 ? +f2(regTotal(r)) : '', t.tare, t.remark]);
    p3.push([dmy(r.date), t.time, r.mix, t.veh, t.aggT, t.tankT, t.mixT, t.chain, t.remark]);
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, xlsSheet(p5, [[3, 8, 'ટ્રક અથવા ડામર મિશ્રણની હેરફેર']]), 'પરિશિષ્ટ-૫');
  XLSX.utils.book_append_sheet(wb, xlsSheet(p3, [[4, 6, 'ઉષ્ણતામાનના માપ ફેરનહીટ / સેન્ટીગ્રેડ અંશ']]), 'પરિશિષ્ટ-૩');
  XLSX.writeFile(wb, `Plant_Register_${runs[0].date}_to_${runs[runs.length - 1].date}.xlsx`);
});

// ================= BITUMEN =================
// ---- Tack coat: estimate item ka rate (kg/sq.m) × area; area = mix T ÷ (density × thickness)
function itemParams(it) {
  const n = (it?.name || '').toUpperCase();
  const dDen = /SDBC|BC$|^BC/.test(n) ? 2.3 : /DBM/.test(n) ? 2.3 : /BM/.test(n) ? 2.2 : /BSG|BUSG/.test(n) ? 2.0 : 2.2;
  const dTh = /SDBC/.test(n) ? 25 : /BSG|BUSG/.test(n) ? 37.5 : /BC/.test(n) ? 40 : 50;
  return { den: +it?.den || dDen, th: +it?.th || dTh, tack: +it?.tack || 0 };
}
function itemEstQty(it) {   // Settings ka estimate MT, warna Progress tab ki layer ka estimate MT
  if (+it?.estQty) return +it.estQty;
  const l = (DB.progress?.layers || []).find(x => String(x.t).toUpperCase() === String(it?.name).toUpperCase());
  return +(l?.est?.mt) || 0;
}
// Poore item ka tack coat daamar ek hi baar — item ke pehle din plant se issue
function tackIssues() {
  const out = [];
  DB.items.forEach(it => {
    const p = itemParams(it), q = itemEstQty(it); if (!p.tack || !q) return;
    const days = DB.runs.filter(r => r.item == it.code).map(r => r.date).sort(); if (!days.length) return;
    const area = q / (p.den * p.th / 1000);
    out.push({ code: it.code, name: it.name, date: days[0], estQty: q, area, kg: area * p.tack, rate: p.tack, den: p.den, th: p.th });
  });
  return out;
}
function tackUse(date) {    // us din paver par asli vaparash (us din bane mix ke hisaab se)
  const parts = [];
  DB.runs.filter(r => r.date === date).forEach(r => {
    const it = DB.items.find(i => i.code == r.item); if (!it) return;
    const p = itemParams(it); if (!p.tack) return;
    const qty = regTotal(r), area = qty / (p.den * p.th / 1000), kg = area * p.tack;
    const ex = parts.find(x => x.code == it.code);
    if (ex) { ex.qty += qty; ex.area += area; ex.kg += kg; }
    else parts.push({ code: it.code, name: it.name, qty, area, kg, rate: p.tack, den: p.den, th: p.th });
  });
  return { kg: parts.reduce((a, x) => a + x.kg, 0), parts };
}
function tackFor(date) {    // Plant P-1 col 7: manual likha ho to wahi, warna us din ka bulk issue
  const iss = tackIssues().filter(x => x.date === date), man = DB.tack[date];
  const manual = man !== undefined && man !== null && man !== '';
  return { mt: manual ? +man : iss.reduce((a, x) => a + x.kg, 0) / 1000, auto: !manual, issues: iss };
}
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const SHIFT_DAYS = 3;
// Ledger: agar balance negative ho, to gatepass ki aavak date invoice date se 3 din ke andar aage-peeche adjust
function buildLedger() {
  if (!DB.opening) return [];
  const od = DB.opening.date;
  const gps = DB.gatepasses.map(g => {
    const inv = g.invDate || g.recvDate, base = g.recvDate || g.invDate;
    return { g, lo: inv, hi: addDays(inv, SHIFT_DAYS), eff: base };
  });
  const run = () => {
    const dates = new Set();
    gps.forEach(x => { if (x.eff >= od) dates.add(x.eff); });
    DB.runs.forEach(r => { if (r.date >= od) dates.add(r.date); });
    Object.keys(DB.tack).forEach(d => { if (d >= od && +DB.tack[d]) dates.add(d); });
    let bal = +DB.opening.qty || 0;
    const out = [];
    [...dates].sort().forEach(date => {
      const g = gps.filter(x => x.eff === date);
      const runs = DB.runs.filter(r => r.date === date);
      // Mishran mate vaparash = register ka mix jaththo × Settings mein us item ka bitumen %
      const pctOf = r => +(DB.items.find(i => i.code == r.item)?.pct) || 0;
      const mixT = runs.reduce((a, r) => a + regTotal(r), 0);
      const mixMT = runs.reduce((a, r) => a + regTotal(r) * pctOf(r) / 100, 0);
      const scadaMT = runs.reduce((a, r) => a + r.bitKg / 1000, 0);
      // Col 14: Settings mein item ka bitumen % (ek din mein ek se zyada item ho to naam ke saath)
      const its = [...new Map(runs.map(r => { const it = DB.items.find(i => i.code == r.item); return [r.item, it]; })).values()];
      const pctTxt = its.length === 1 ? (its[0]?.pct ? f2(its[0].pct) + ' %' : '—')
        : its.map(it => it ? `${it.name} ${it.pct ? f2(it.pct) + ' %' : '—'}` : '—').join(', ');
      const noPct = runs.some(r => !pctOf(r));
      const theo = mixMT;
      const tk = tackFor(date), tack = tk.mt, tackAutoFlag = tk.auto && tack > 0;
      const open = bal, rcv = g.reduce((a, x) => a + (+x.g.qty || 0), 0), total = open + rcv, cons = mixMT + tack;
      bal = total - cons;
      out.push({ date, tackAutoFlag, scadaMT, pctTxt, noPct, p1: DB.p1[date] || {}, open, gps: g.map(x => Object.assign({}, x.g, { effDate: x.eff, shifted: x.eff !== (x.g.recvDate || x.g.invDate) })), rcv, total, tack, mixMT, cons, close: bal, mixT, theo,
        pct: mixT ? mixMT / mixT * 100 : 0, items: [...new Set(runs.map(r => itemLabel(r.item) || r.mix))].join(', ') });
    });
    return out;
  };
  let out = run();
  for (let k = 0; k < gps.length + 1; k++) {
    const neg = out.find(d => d.close < -0.0005); if (!neg) break;
    // jo gatepass is din ke baad dikh raha hai par invoice window mein is din tak aa sakta tha
    const c = gps.filter(x => x.eff > neg.date && x.lo <= neg.date && x.hi >= neg.date).sort((a, b) => a.eff.localeCompare(b.eff))[0];
    if (!c) break;
    c.eff = neg.date; out = run();
  }
  out.forEach(d => d.neg = d.close < -0.0005);
  return out;
}
function currentBalance() { const l = buildLedger(); return l.length ? l[l.length - 1].close : (DB.opening ? +DB.opening.qty : null); }

function renderBitumen() {
  $('#obDate').value = DB.opening?.date || ''; $('#obQty').value = DB.opening?.qty ?? '';
  const gps = [...DB.gatepasses].sort((a, b) => b.recvDate.localeCompare(a.recvDate));
  $('#gpTable').innerHTML = `<thead><tr><th>Aavak date</th><th>Invoice date</th><th>Invoice no.</th><th>Supplier</th><th>Tanker</th><th>Gate pass</th><th>Grade</th><th>Qty (MT)</th><th></th></tr></thead><tbody>` +
    (gps.map(g => `<tr><td>${dmy(g.recvDate)}</td><td>${dmy(g.invDate)}</td><td>${esc(g.invNo)}</td><td>${esc(g.supplier)}</td><td>${esc(g.tanker)}</td><td>${esc(g.gpNo || '')}</td><td>${esc(g.grade)}</td><td><b>${f3(g.qty)}</b></td>
      <td>${g.src === 'ai' ? '<span class="pill ai">AI</span> ' : ''}<button class="btn sm danger" data-delgp="${g.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">Koi gatepass nahi</td></tr>') + '</tbody>';
  const L = buildLedger();
  if (!DB.opening) { $('#ledgerTable').innerHTML = '<tr><td class="muted">Pehle opening balance daalo.</td></tr>'; return; }
  const inp = (date, k, v, w = 90) => `<input data-p1="${date}" data-k="${k}" value="${esc(v ?? '')}" style="width:${w}px">`;
  $('#ledgerTable').innerHTML = `<thead><tr><th>1 Date</th><th>2 Khulti silak</th><th>3 Invoice no.</th><th>4 Gate pass no.</th><th>5 Jaththo</th><th>6 Kul</th>
    <th>7 Chhantva (tack)</th><th>8 Mishran mate</th><th>9 Kul vaparash</th><th>10 Vadhel jaththo</th><th>11 Km chainage</th><th>12 Kaam jaththo (T)</th>
    <th>13 Bagad</th><th>14 Dhoran</th><th>15 Tafavat karan</th><th class="muted">SCADA bitumen (ref.)</th></tr></thead><tbody>` +
    L.map(d => `<tr><td>${dmy(d.date)}</td><td>${f3(d.open)}</td>
      <td>${d.gps.map(g => esc(g.invNo) + (g.shifted ? ` <span class="flag" title="Aavak ${dmy(g.recvDate || g.invDate)} thi — balance negative na ho isliye ${dmy(g.effDate)}">↺ ${dmy(g.recvDate || g.invDate)}</span>` : '')).join('<br>')}</td>
      <td>${d.gps.map(g => esc(g.gpNo || g.tanker)).join('<br>')}</td>
      <td>${d.gps.map(g => f3(g.qty)).join('<br>')}</td><td>${f3(d.total)}</td>
      <td><input type="number" step="0.001" data-tack="${d.date}" value="${d.tack ? f3(d.tack) : ''}" style="width:80px" title="Khali karoge to wapas auto (tack coat hisaab)">${d.tackAutoFlag ? '<div class="muted" style="font-size:11px">auto (tack coat)</div>' : ''}</td>
      <td>${d.mixMT ? f3(d.mixMT) : ''}${d.noPct ? '<div class="flag">⚠ Item % Settings mein nahi</div>' : ''}</td><td>${f3(d.cons)}</td>
      <td><b style="${d.neg ? 'color:var(--bad)' : ''}">${f3(d.close)}</b>${d.neg ? '<div class="flag">⚠ Negative — gatepass missing?</div>' : ''}</td>
      <td>${inp(d.date, 'chain', d.p1.chain)}</td><td>${d.mixT ? f2(d.mixT) : ''}</td>
      <td>${inp(d.date, 'waste', d.p1.waste, 60)}</td><td>${d.mixT ? d.pctTxt : ''}</td><td>${inp(d.date, 'reason', d.p1.reason, 120)}</td>
      <td class="muted">${d.scadaMT ? f3(d.scadaMT) : ''}</td></tr>`).join('') + '</tbody>';
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
  const id = e.target.dataset.delgp; if (!id) return;
  { const g = DB.gatepasses.find(x => x.id === id); if (g && isLocked('plant', g.recvDate)) return lockMsg('plant', g.recvDate); }
  if (!confirm('Gatepass delete karein?')) return;
  DB.gatepasses = DB.gatepasses.filter(g => g.id !== id); save(); renderAll();
});
$('#ledgerTable').addEventListener('change', e => {
  { const dd = e.target.dataset.p1 || e.target.dataset.tack; if (dd && isLocked('plant', dd)) { lockMsg('plant', dd); return renderBitumen(); } }
  const pd = e.target.dataset.p1;
  if (pd) { DB.p1[pd] = DB.p1[pd] || {}; DB.p1[pd][e.target.dataset.k] = e.target.value.trim(); save(); return; }
  const d = e.target.dataset.tack; if (!d) return;
  if (e.target.value.trim() === '') delete DB.tack[d]; else DB.tack[d] = +e.target.value || 0;
  save(); renderBitumen();
});
function printP1() { return staffGroups(buildLedger(), 'plant', d => d.date).map(g => printP1One(g.items, g.staff)).join(''); }
function printP1One(L, staff) {
  if (!L.length) return '';
  const kg = q => Math.round((+q || 0) * 1000).toLocaleString('en-IN');
  let rows = '';
  L.forEach(d => {
    const n = Math.max(1, d.gps.length);
    for (let k = 0; k < n; k++) {
      const g = d.gps[k]; const first = k === 0; const last = k === n - 1;
      const rem = [g ? `આવક ${kg(g.qty)} કિ.ગ્રા. (બલ્ક ટેન્કર ${esc(g.tanker || '')})` : '', last && d.cons ? `વપરાશ ${kg(d.cons)} કિ.ગ્રા.` : '', last ? esc(d.p1.remark || '') : ''].filter(Boolean).join('; ');
      rows += `<tr><td>${first ? dmy(d.date) : ''}</td><td>${first ? f3(d.open) : ''}</td>
      <td>${g ? esc(g.invNo) : ''}</td><td>${g ? esc(g.gpNo || g.tanker || '') : ''}</td><td>${g ? f3(g.qty) : ''}</td><td>${last ? f3(d.total) : ''}</td>
      <td>${last && d.tack ? f3(d.tack) : ''}</td><td>${last && d.mixMT ? f3(d.mixMT) : ''}</td><td>${last && d.cons ? f3(d.cons) : ''}</td><td class="tot">${last ? f3(d.close) : ''}</td>
      <td>${last ? esc(d.p1.chain || '') : ''}</td><td>${last && d.mixT ? f2(d.mixT) + ' ટન' : ''}</td><td>${last ? esc(d.p1.waste || '') : ''}</td>
      <td>${last && d.mixT ? esc(d.pctTxt) : ''}</td><td>${last ? esc(d.p1.reason || '') : ''}</td><td></td><td></td><td style="font-size:9px">${rem}</td></tr>`;
    }
  });
  return `<div class="reg">${regHead('૧', 'ડામરની આવક તથા વપરાશની નોંધ', staff)}
  <table class="p1"><colgroup><col style="width:5%"><col style="width:5%"><col style="width:9.5%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:4.5%"><col style="width:5%"><col style="width:5%"><col style="width:5.5%"><col style="width:7%"><col style="width:5.5%"><col style="width:4.5%"><col style="width:6%"><col style="width:6%"><col style="width:4.5%"><col style="width:4.5%"><col style="width:7.5%"></colgroup><thead>
  <tr><th rowspan="2">તારીખ</th><th rowspan="2">ખુલતી સિલક</th><th colspan="4">ડામરની આવક</th><th colspan="3">કામનો રોજીંદો વપરાશ</th>
  <th rowspan="2">દિવસના અંતે વપરાશ પછીનો વધેલ જથ્થો</th><th rowspan="2">કામ થયું હોય તેનું સ્થળ કી.મી. ચેઈનેજ</th><th rowspan="2">થયેલ કામનો જથ્થો ટન ચો.મી.</th>
  <th rowspan="2">ડામરનો બગાડ કંઈ થયો હોય તો</th><th rowspan="2">કામની નિર્દિષ્ટ વિગતો મુજબ ડામરના વપરાશનું ધોરણ</th><th rowspan="2">તફાવતનાં કારણો</th>
  <th rowspan="2">દેખરેખ રાખનારની સહી</th><th rowspan="2">ઠેકેદારની સહી</th><th rowspan="2">રીમાર્ક ડામરનો જથ્થો ડ્રમની સંખ્યા તથા કીલો ગ્રામ એ બંને રીતે દર્શાવવા જરૂરી છે.</th></tr>
  <tr><th>ઇન્ડેન્ટ / ઇન્વોઇસ નંબર</th><th>ગેઈટ પાસ નંબર</th><th>જથ્થો</th><th>કુલ જથ્થો</th><th>છાંટવા માટે</th><th>મિશ્રણ માટે</th><th>કુલ</th></tr>
  <tr class="num">${Array.from({ length: 18 }, (_, i) => `<td>${i + 1}</td>`).join('')}</tr>
  </thead><tbody>${rows}</tbody></table><p style="font-size:10px">જથ્થો મેટ્રિક ટનમાં. મિશ્રણ માટેનો વપરાશ = થયેલ કામનો જથ્થો × નિર્દિષ્ટ ડામર ટકા.</p></div>`;
}
$('#btnPrintP1').addEventListener('click', () => doPrint(printP1()));
$('#btnXlsP1').addEventListener('click', () => {
  const L = buildLedger(); if (!L.length) return toast('Ledger khali hai');
  const a = [...xlsTop('૧', 'ડામરની આવક તથા વપરાશની નોંધ', 18),
    ['તારીખ', 'ખુલતી સિલક', 'ઇન્ડેન્ટ / ઇન્વોઇસ નંબર', 'ગેઈટ પાસ નંબર', 'જથ્થો', 'કુલ જથ્થો', 'છાંટવા માટે', 'મિશ્રણ માટે', 'કુલ', 'દિવસના અંતે વપરાશ પછીનો વધેલ જથ્થો', 'કામ થયું હોય તેનું સ્થળ કી.મી. ચેઈનેજ', 'થયેલ કામનો જથ્થો ટન', 'ડામરનો બગાડ કંઈ થયો હોય તો', 'કામની નિર્દિષ્ટ વિગતો મુજબ ડામરના વપરાશનું ધોરણ', 'તફાવતનાં કારણો', 'દેખરેખ રાખનારની સહી', 'ઠેકેદારની સહી', 'રીમાર્ક']];
  L.forEach(d => a.push([dmy(d.date), +f3(d.open), d.gps.map(g => g.invNo).join(', '), d.gps.map(g => g.gpNo || g.tanker).join(', '), d.rcv ? +f3(d.rcv) : '', +f3(d.total), d.tack ? +f3(d.tack) : '', d.mixMT ? +f3(d.mixMT) : '', +f3(d.cons), +f3(d.close), d.p1.chain || '', d.mixT ? +f2(d.mixT) : '', d.p1.waste || '', d.mixT ? d.pctTxt : '', d.p1.reason || '', '', '', d.p1.remark || '']));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, xlsSheet(a, [[2, 5, 'ડામરની આવક'], [6, 8, 'કામનો રોજીંદો વપરાશ']]), 'પરિશિષ્ટ-૧');
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
    const tare = randStep($('#tareMin').value, $('#tareMax').value);
    DB.vehicles.push({ no, tare, cap: netFromTare(tare), tentative: true, active: true });
    added++;
  });
  save(); $('#vehList').value = ''; toast(`${added} vehicles add hue`); renderAll();
});
function renderVehicles() {
  const V = DB.vehicles;
  $('#vehTable').innerHTML = `<thead><tr><th>Kram</th><th>Truck no.</th><th>Base tare (kg)</th><th>Roz ka tare</th><th>Load (kg) ±${NET_SPREAD}</th><th>Status</th><th>Active</th><th></th></tr></thead><tbody>` +
    (V.map((v, i) => `<tr><td>${i + 1}</td><td><b>${esc(v.no)}</b></td>
      <td><input type="number" step="10" data-vi="${i}" data-vf="tare" value="${v.tare}"></td>
      <td class="muted">${+v.tare - 100}–${+v.tare + 200}</td>
      <td><input type="number" step="10" data-vi="${i}" data-vf="cap" value="${v.cap}"> <button class="btn sm" data-vauto="${i}" title="Tare se load">↺</button></td>
      <td>${v.tentative ? '<span class="pill">tentative</span>' : '<span class="pill" style="background:#e7f6ec;color:#1e7e46">weighed</span>'}
        <button class="btn sm" data-vtog="${i}">${v.tentative ? 'Mark weighed' : 'Mark tentative'}</button></td>
      <td><input type="checkbox" data-vi="${i}" data-vf="active" ${v.active !== false ? 'checked' : ''} style="width:auto"></td>
      <td><button class="btn sm" data-vup="${i}">↑</button><button class="btn sm" data-vdn="${i}">↓</button><button class="btn sm danger" data-vdel="${i}">🗑</button></td></tr>`).join('')
      || '<tr><td colspan="10" class="muted">Koi vehicle nahi</td></tr>') + '</tbody>';
}
$('#vehTable').addEventListener('change', e => {
  const i = e.target.dataset.vi, f = e.target.dataset.vf; if (i == null) return;
  const v = DB.vehicles[+i];
  if (f === 'active') v.active = e.target.checked;
  else { v[f] = +e.target.value; if (f === 'tare') { v.tentative = false; v.cap = netFromTare(v.tare); } }
  save(); renderVehicles();
});
$('#vehTable').addEventListener('click', e => {
  const d = e.target.dataset; const V = DB.vehicles;
  if (d.vup != null && +d.vup > 0) { const i = +d.vup; [V[i - 1], V[i]] = [V[i], V[i - 1]]; }
  else if (d.vdn != null && +d.vdn < V.length - 1) { const i = +d.vdn; [V[i + 1], V[i]] = [V[i], V[i + 1]]; }
  else if (d.vdel != null) { if (!confirm('Vehicle delete karein?')) return; V.splice(+d.vdel, 1); }
  else if (d.vtog != null) { V[+d.vtog].tentative = !V[+d.vtog].tentative; }
  else if (d.vauto != null) { V[+d.vauto].cap = netFromTare(V[+d.vauto].tare); }
  else return;
  save(); renderVehicles();
});

// ================= SETTINGS =================
function renderSettings() {
  $$('#setForm [name]').forEach(i => { if (DB.settings[i.name] != null) i.value = DB.settings[i.name]; });
  $('#itemTable').innerHTML = `<thead><tr><th>Item no.</th><th>Mix</th><th>Design bitumen %</th><th>Thickness (mm)</th><th>Density</th><th>1 T = sq.m</th><th>Tack coat (kg/sq.m)</th><th>Estimate qty (MT)</th><th>Tack coat daamar (poora kaam)</th><th></th></tr></thead><tbody>` +
    (DB.items.map((it, k) => { const p = itemParams(it); return `<tr><td>${esc(it.code)}</td><td>${esc(it.name)}</td><td>${it.pct}</td><td>${p.th}</td><td>${p.den}</td><td>${f2(1 / (p.den * p.th / 1000))}</td><td>${p.tack ? p.tack : '<span class="muted">nahi</span>'}</td>
      <td>${itemEstQty(it) ? f2(itemEstQty(it)) + (it.estQty ? '' : ' <span class="muted">(Progress se)</span>') : '—'}</td>
      <td>${p.tack && itemEstQty(it) ? f3(itemEstQty(it) / (p.den * p.th / 1000) * p.tack / 1000) + ' MT' : '—'}</td><td><button class="btn sm" data-edit_it="${k}">✏️</button> <button class="btn sm danger" data-delit="${k}">🗑</button></td></tr>`; }).join('') || '<tr><td colspan="10" class="muted">Item add karo (jaise 10 – BM – 3.3%)</td></tr>') + '</tbody>';
  renderStaff(); renderGpBooks();
  const a = aiCfg(); $('#aiProvider').value = a.provider || 'claude'; $('#aiKey').value = a.key || ''; $('#aiModel').value = a.model || defModel(a.provider || 'claude');
}
$('#btnSaveSet').addEventListener('click', () => {
  const oldFirst = firstGP(), oldPer = DB.settings.gpPerBook, oldBook = DB.settings.gpBook;
  $$('#setForm [name]').forEach(i => DB.settings[i.name] = i.type === 'number' ? +i.value : i.value.trim());
  if (DB.settings.gpBook !== oldBook && DB.settings.gpBooks) delete DB.settings.gpBooks[0];   // pehli book ka no. upar se badla
  if (DB.runs.length && (gpNeedsFix() || ((firstGP() !== oldFirst || DB.settings.gpPerBook !== oldPer) &&
      confirm(`Gate pass shuru ${firstGP()} se. Saare saved register ke gate pass no. dobara lagayein?`)))) {
    renumberAllGP();
  }
  save(); toast('Settings save hui'); renderAll();
});
$('#btnAddItem').addEventListener('click', () => {
  const code = $('#itCode').value.trim(), name = $('#itName').value.trim().toUpperCase(), pct = +$('#itPct').value;
  if (!code || !name) return toast('Item no. aur mix daalo');
  const th = +$('#itTh').value || 0, den = +$('#itDen').value || 0, tack = +$('#itTack').value || 0, estQty = +$('#itEst').value || 0;
  DB.items = DB.items.filter(i => i.code !== code); DB.items.push({ code, name, pct, th, den, tack, estQty });
  DB.runs.forEach(r => { if (r.item == code) r.mix = name; });   // naam badla to saved register mein bhi
  save(); ['#itCode', '#itName', '#itPct', '#itTh', '#itDen', '#itTack', '#itEst'].forEach(k => $(k).value = ''); renderAll();
});
$('#itemTable').addEventListener('click', e => {
  const ek = e.target.dataset.edit_it;
  if (ek != null) { const it = DB.items[+ek]; $('#itCode').value = it.code; $('#itName').value = it.name; $('#itPct').value = it.pct; { const p = itemParams(it); $('#itTh').value = p.th; $('#itDen').value = p.den; $('#itTack').value = it.tack || ''; $('#itEst').value = it.estQty || ''; } $('#itName').focus(); return toast('Badal kar "+ Add" dabao'); }
  const k = e.target.dataset.delit; if (k == null) return; DB.items.splice(+k, 1); save(); renderAll(); });
function renderGpBooks() {
  const el = $('#gpBooksBox'); if (!el) return;
  if (!+DB.settings.gpBook) { el.innerHTML = '<p class="muted">Upar "Gate pass book no." bharo (jaise 2102) aur Save dabao — phir yahan har book ka no. dikhega.</p>'; return; }
  const per = +DB.settings.gpPerBook || 50, used = {};
  DB.runs.forEach(r => r.trucks.forEach(t => { const p = parseGP(t.gp); if (p && p.book != null) { const u = used[p.book] = used[p.book] || { n: 0, min: 1e9, max: 0, d1: r.date, d2: r.date }; u.n++; u.min = Math.min(u.min, p.leaf); u.max = Math.max(u.max, p.leaf); if (r.date < u.d1) u.d1 = r.date; if (r.date > u.d2) u.d2 = r.date; } }));
  const seq = bookSeq(400); let last = 0; seq.forEach((b, i) => { if (used[b]) last = i; });
  const show = seq.slice(0, last + 4), ov = DB.settings.gpBooks || {};
  el.innerHTML = `<div class="tablewrap"><table class="grid"><thead><tr><th>Book</th><th>Pehla gate pass no.</th><th>Leaf</th><th>Use hue</th><th>Dates</th></tr></thead><tbody>` +
    show.map((b, i) => { const u = used[b];
      return `<tr><td>${i + 1}</td><td><input type="text" data-gpb="${i}" value="${b}/${bookLeaf(i)}" style="width:110px">${ov[i] || (i && (DB.settings.gpLeafs || {})[i]) ? ' <span class="pill">badla hua</span>' : ''}</td>
        <td>${b}/${bookLeaf(i)} – ${b}/${per}</td><td>${u ? `${u.n} (${b}/${u.min} – ${b}/${u.max})` : '<span class="muted">abhi nahi</span>'}</td><td>${u ? dmy(u.d1) + (u.d2 !== u.d1 ? ' – ' + dmy(u.d2) : '') : ''}</td></tr>`; }).join('') + '</tbody></table></div>';
}
$('#gpBooksBox').addEventListener('change', e => {
  const i = e.target.dataset.gpb; if (i == null) return;
  const m = String(e.target.value).trim().match(/^(\d+)(?:\s*\/\s*(\d+))?$/);
  const v = m ? +m[1] : 0, lf = m && m[2] ? +m[2] : 1;
  if (!v || lf < 1 || lf > (+DB.settings.gpPerBook || 50)) { toast('Aise likho: 2106/1'); return renderGpBooks(); }
  DB.settings.gpBooks = DB.settings.gpBooks || {}; DB.settings.gpLeafs = DB.settings.gpLeafs || {};
  if (+i === 0) DB.settings.gpLeaf = lf; else if (lf > 1) DB.settings.gpLeafs[i] = lf; else delete DB.settings.gpLeafs[i];
  const auto = +i === 0 ? +DB.settings.gpBook : bookSeq(+i)[+i - 1] + 1;   // jo apne aap aata
  if (v === auto) delete DB.settings.gpBooks[i]; else DB.settings.gpBooks[i] = v;
  if (+i === 0) { DB.settings.gpBook = v; delete DB.settings.gpBooks[0]; }
  if (DB.runs.length && confirm(`Book ${+i + 1} ab ${v}/${lf} se shuru. Saare saved register ke gate pass no. is hisaab se dobara lagayein?\n(Lock wale din mein bhi)`)) renumberAllGP();
  save(); renderSettings(); toast('Gate pass book update hui');
});
function renderChLock() {
  const el = $('#chLockBox'); if (!el) return; const L = DB.pvLock;
  el.innerHTML = L && L.upto
    ? `<b>🔒 Chainage ${dmy(L.upto)} tak lock hai</b> — us date tak ke trucks ki chainage Progress badalne par bhi nahi badlegi. <button class="btn sm" id="chUnlock">🔓 Unlock</button>`
    : `<label style="flex-direction:row;align-items:center;gap:8px">Chainage lock — kis date tak <input type="date" id="chLockDate" value="${DB.pv2upto || ''}"></label> <button class="btn sm primary" id="chLock">🔒 Chainage lock</button>`;
}
function renderStaff() {
  renderChLock();
  const L = [...(DB.staff || [])].sort((a, b) => (a.role + (a.from || '')).localeCompare(b.role + (b.from || '')));
  $('#staffTable').innerHTML = `<thead><tr><th>Site</th><th>Naam</th><th>Hodda</th><th>Kab se</th><th>Kab tak</th><th>Lock</th><th></th></tr></thead><tbody>` +
    (L.map(x => `<tr><td>${ROLE[x.role]}</td><td class="l"><b>${esc(x.name)}</b></td><td>${esc(x.desig || '')}</td><td>${x.from ? dmy(x.from) : '—'}</td>
      <td><input type="date" data-sto="${x.id}" value="${x.to || ''}" ${x.locked ? 'disabled' : ''}></td>
      <td>${x.locked ? `🔒 ${dmy(x.to)} tak <button class="btn sm" data-sunlock="${x.id}">Unlock</button>` : `<button class="btn sm primary" data-slock="${x.id}">🔒 Lock</button>`}</td>
      <td><button class="btn sm danger" data-sdel="${x.id}">🗑</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Abhi koi staff nahi</td></tr>') + '</tbody>';
}
$('#btnAddStaff').addEventListener('click', () => {
  const role = $('#stRole').value, name = $('#stName').value.trim(), from = $('#stFrom').value;
  if (!name || !from) return toast('Naam aur "kab se" date daalo');
  // pichhle staff ki "kab tak" khali ho to naye ke ek din pehle tak
  const prev = DB.staff.filter(x => x.role === role && !x.to && (x.from || '') < from).sort((a, b) => (a.from || '').localeCompare(b.from || '')).pop();
  if (prev) prev.to = addDays(from, -1);
  DB.staff.push({ id: uid(), role, name, desig: $('#stDesig').value.trim(), from, to: '', locked: false });
  save(); $('#stName').value = $('#stDesig').value = ''; renderStaff();
  toast(prev ? `${prev.name} ka charge ${dmy(prev.to)} tak set hua — chaho to Lock dabao` : 'Staff add hua');
});
$('#staffTable').addEventListener('change', e => { const id = e.target.dataset.sto; if (!id) return; DB.staff.find(x => x.id === id).to = e.target.value; save(); renderStaff(); });
$('#staffTable').addEventListener('click', e => {
  const d = e.target.dataset;
  if (d.slock) {
    const x = DB.staff.find(v => v.id === d.slock);
    if (!x.to) return toast('Pehle "Kab tak" date daalo');
    if (!confirm(`${x.name} (${ROLE[x.role]}) ka ${dmy(x.to)} tak ka register lock karein?\nIske baad us date tak ki entry edit / delete / dobara generate nahi hogi (Unlock se kabhi bhi khol sakte ho).`)) return;
    x.locked = true;
    save(); renderAll(); return toast('🔒 Lock ho gaya');
  }
  if (d.sunlock) {
    const x = DB.staff.find(v => v.id === d.sunlock);
    if (!confirm(`${x.name} (${ROLE[x.role]}) ka lock kholein? Us date tak ki entry phir se edit ho sakegi.`)) return;
    x.locked = false; save(); renderAll(); return toast('🔓 Unlock ho gaya');
  }
  if (d.sdel) { const x = DB.staff.find(v => v.id === d.sdel); if (x.locked) return toast('Pehle unlock karo'); if (!confirm('Staff entry delete karein?')) return; DB.staff = DB.staff.filter(v => v.id !== d.sdel); save(); renderStaff(); }
});
function defModel(p) { return p === 'gemini' ? 'gemini-2.5-flash' : 'claude-sonnet-5-5'; }
$('#aiProvider').addEventListener('change', e => { $('#aiModel').value = defModel(e.target.value); });
$('#btnSaveAI').addEventListener('click', () => {
  const provider = $('#aiProvider').value;
  let model = $('#aiModel').value.trim();
  if (!model || (provider === 'claude') !== model.startsWith('claude')) model = defModel(provider);
  try { localStorage.setItem(AIKEY, JSON.stringify({ provider, key: $('#aiKey').value.trim(), model })); $('#aiModel').value = model; toast('AI settings save hui'); }
  catch (e) { toast(e.message); }
});
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(STORE, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `hotmix_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (!d.works && !d.runs) throw new Error('Galat file');
    if (!confirm('Saare works ka abhi ka data backup se replace ho jayega. Continue?')) return;
    localStorage.setItem(KEY, JSON.stringify(d)); load(); switchWork(STORE.current); toast('Backup restore hua');
  }
  catch (err) { toast('Restore fail: ' + err.message); }
  e.target.value = '';
});

$('#workSel').addEventListener('change', e => { e.target.value === '__new' ? newWork() : switchWork(e.target.value); });
$('#btnDelWork').addEventListener('click', () => {
  const n = DB.settings.workName;
  if (Object.keys(STORE.works).length < 2) return toast('Kam se kam ek work rehna chahiye');
  if (prompt(`"${n}" ka poora data (register, gatepass, vehicles) delete hoga. Confirm ke liye DELETE likho:`) !== 'DELETE') return;
  delete STORE.works[STORE.current]; switchWork(Object.keys(STORE.works)[0]); toast(`"${n}" delete hua`);
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
  renderWorkSelect();
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
  if (!cfg.key) return chatPush('bot', 'Ye sawaal samajh nahi aaya. AI jawab ke liye Settings mein Claude (ya Gemini) API key daalo. Abhi main balance, production aur gatepass ke sawaal samajhta hoon.');
  const wait = appendMsg('bot', '…soch raha hoon');
  try {
    const ctx = JSON.stringify({ settings: DB.settings, opening: DB.opening, balanceMT: currentBalance(), gatepasses: DB.gatepasses.map(({ id, ...g }) => g),
      days: DB.runs.map(r => ({ date: r.date, mix: r.mix, item: r.item, trucks: r.trucks.length, mixMT: r.totalT, bitumenMT: r.bitKg / 1000 })), ledger: buildLedger().map(d => ({ date: d.date, open: d.open, rcv: d.rcv, cons: d.cons, close: d.close })) });
    const txt = await aiAsk(`You are an assistant inside a Gujarat R&B hot mix plant register app. Answer briefly in Hinglish using ONLY this app data (JSON). If data is missing, say so.\nDATA: ${ctx}\nQUESTION: ${q}`, null, false);
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
async function handleChatFile(f) {
  if (!f) return;
  if (/\.(xlsx|xls|csv)$/i.test(f.name)) {
    chatPush('user', `📄 ${esc(f.name)}`);
    try {
      const res = await readScadaFile(f);
      const d = res.days;
      const btn = document.createElement('div'); btn.className = 'confirm';
      btn.innerHTML = `<b>SCADA report padh liya</b><br>${esc(res.meta.work)} · mix Bitumen % se pehchana (Settings ke items)<br>` +
        d.map(x => `${dmy(x.date)}: <b>${partsLabel(x)}</b> · bitumen ${f3(x.bitKg / 1000)} MT · ${hm(x.start)}–${hm(x.end)}${fixNote(x)}`).join('<br>') +
        `<div class="row"><button class="btn primary" data-one>🏭 Truck-wise register banao</button>${d.length > 1 ? `<button class="btn success" data-all>📅 Sab ${d.length} din ek saath</button>` : ''}</div>`;
      btn.querySelector('[data-one]').onclick = () => { loadScadaIntoPlant(res); showTab('plant'); $('#btnGenerate').click(); };
      if (d.length > 1) btn.querySelector('[data-all]').onclick = () => { loadScadaIntoPlant(res); showTab('plant'); generateAllDays(); };
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
  if (!cfg.key) return chatPush('bot', 'Photo padhne ke liye Settings → Chatbot mein Claude (ya Gemini) API key daalo. Tab tak Bitumen tab mein manual entry kar sakte ho.');
  const wait = appendMsg('bot', '…file padh raha hoon (estimate ho to thoda samay lagega)');
  try {
    const b64 = dataUrl.split(',')[1]; const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
    const prompt = `This is a photo of a document at an Indian hot mix plant. Classify and extract. Return ONLY JSON:
{"doc_type":"gatepass"|"vehicle_tare"|"estimate"|"scada"|"other",
 "items":[{"item_no":"","name":"short mix name e.g. BM, SDBC, DBM, BSG, BC","thickness_mm":number,"qty_mt":number,"bitumen_pct":number,"tack_kg_sqm":number,"density":number}]  (only for estimate: road work estimate / abstract / rate analysis. For each bituminous item: compacted thickness, total quantity in MT (convert cum x density if needed), bitumen content % by weight of mix, and tack coat bitumen rate in kg per sqm if the item includes tack coat else 0. Use null when not found),
 "vehicles":[{"vehicle_no":"e.g. GJ20V5115, no spaces","tare_kg":number}]  (only for vehicle_tare: weighbridge slip, RC book unladen weight, or a handwritten/printed list of trucks with tare/empty weight. Convert tonnes to kg),
 "supplier":"IOCL/BPCL/HPCL/other name",
 "invoice_no":"tax invoice number (e.g. GJ5534275388 or 4541387410)",
 "invoice_date":"YYYY-MM-DD",
 "received_date":"YYYY-MM-DD from handwritten date or security stamp near the middle of the page, else null",
 "tanker_no":"T.T. No / truck no, e.g. GJ06AX6699, no spaces",
 "gatepass_no":"gate pass / delivery no. if printed or handwritten, else null",
 "grade":"e.g. VG-30",
 "qty_mt": number (Quantity in TO/MT, 3 decimals),
 "confidence":"high|medium|low",
 "notes":"anything unclear"}`;
    const txt = await aiAsk(prompt, { mime, b64 }, true);
    wait.remove();
    let j; try { j = JSON.parse(txt.replace(/```json|```/g, '').trim()); } catch (e) { throw new Error('AI ka jawab samajh nahi aaya: ' + txt.slice(0, 200)); }
    if (j.doc_type === 'scada') return chatPush('bot', 'Ye SCADA report lag rahi hai. Photo se truck-wise register sahi nahi banta — SCADA ki Excel file (DRUM_MIX_….xlsx) upload karo.');
    if (j.doc_type === 'vehicle_tare') return showVehicleConfirm(j);
    if (j.doc_type === 'estimate') return showEstimateConfirm(j);
    showGatepassConfirm(j);
  } catch (err) { wait.remove(); chatPush('bot', 'AI error: ' + esc(err.message)); }
}
$('#chatFile').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  for (const f of files) await handleChatFile(f);
});
// Drag & drop + Ctrl+V paste
(() => {
  const chat = $('.chat'); let depth = 0;
  const ok = f => /^image\//.test(f.type) || /\.(pdf|xlsx|xls|csv|jpe?g|png|webp|heic)$/i.test(f.name);
  chat.addEventListener('dragenter', e => { if (!e.dataTransfer?.types?.includes('Files')) return; e.preventDefault(); depth++; chat.classList.add('dragging'); });
  chat.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  chat.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; chat.classList.remove('dragging'); } });
  chat.addEventListener('drop', async e => {
    e.preventDefault(); depth = 0; chat.classList.remove('dragging');
    const files = [...(e.dataTransfer?.files || [])];
    const good = files.filter(ok); if (files.length > good.length) toast('Sirf photo, PDF ya Excel chalegi');
    for (const f of good) await handleChatFile(f);
  });
  // chat ke bahar file giri to browser use khol na de
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('.chat')) e.preventDefault(); });
  $('#chatInput').addEventListener('paste', async e => {
    const files = [...(e.clipboardData?.files || [])].filter(ok);
    if (!files.length) return; e.preventDefault();
    for (const f of files) await handleChatFile(f);
  });
})();
function matchVehicle(no) {
  no = normVeh(no); const last4 = (no.match(/(\d{1,4})$/) || [])[1] || no;
  return DB.vehicles.find(v => v.no === no) || DB.vehicles.find(v => v.no === last4 || v.no.endsWith(last4));
}
function showVehicleConfirm(j) {
  const list = (j.vehicles || []).filter(x => x && x.vehicle_no);
  if (!list.length) return chatPush('bot', 'Photo mein truck no. aur tare nahi mila. Saaf photo daalo ya Vehicles tab mein manual daalo.');
  const box = document.createElement('div'); box.className = 'confirm';
  box.innerHTML = `<b>Vehicle tare reading</b> <span class="pill ai">AI · ${esc(j.confidence || '?')}</span> — check karke Save dabao
    <div class="tablewrap"><table class="grid"><thead><tr><th>Register mein truck no.</th><th>Base tare (kg)</th><th>Load (kg)</th><th>Status</th></tr></thead><tbody>
    ${list.map((x, k) => { const ex = matchVehicle(x.vehicle_no); const full = normVeh(x.vehicle_no); const no = ex ? ex.no : full; const tare = r10(+x.tare_kg || 0);
      return `<tr><td><input data-k="${k}" data-n="no" value="${esc(no)}" style="width:120px"></td><td><input data-k="${k}" data-n="tare" type="number" step="10" value="${tare}"></td>
      <td class="muted">${netFromTare(tare)} ±${NET_SPREAD}</td><td>${ex ? 'update' : 'naya'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="muted">Register mein chhota no. (jaise 5115) chahiye to upar edit kar do. Roz ka tare = base −100 se +200 kg.</p>
    ${j.notes ? `<div class="muted">Note: ${esc(j.notes)}</div>` : ''}
    <div class="row"><button class="btn success">✅ Vehicles save karo</button></div>`;
  box.querySelector('button').onclick = () => {
    let add = 0, upd = 0;
    list.forEach((_, k) => {
      const no = normVeh(box.querySelector(`[data-k="${k}"][data-n="no"]`).value);
      const tare = r10(+box.querySelector(`[data-k="${k}"][data-n="tare"]`).value || 0);
      if (!no || !tare) return;
      const ex = DB.vehicles.find(v => v.no === no);
      if (ex) { ex.tare = tare; ex.cap = netFromTare(tare); ex.tentative = false; upd++; }
      else { DB.vehicles.push({ no, tare, cap: netFromTare(tare), tentative: false, active: true }); add++; }
    });
    save(); renderAll();
    box.innerHTML = `✅ ${add} naye, ${upd} update`;
    chatPush('bot', `Vehicles save hue: ${add} naye, ${upd} update. Vehicles tab mein order check kar lo.`);
  };
  appendMsg('bot', '', box);
}
function showEstimateConfirm(j) {
  const list = (j.items || []).filter(x => x && x.name);
  if (!list.length) return chatPush('bot', 'Estimate mein bituminous item nahi mile. Saaf page (abstract / rate analysis) ki photo ya PDF daalo.');
  const box = document.createElement('div'); box.className = 'confirm';
  const cell = (k, n, v, w = 70) => `<input data-k="${k}" data-n="${n}" value="${esc(v ?? '')}" style="width:${w}px">`;
  box.innerHTML = `<b>Estimate se items</b> <span class="pill ai">AI · ${esc(j.confidence || '?')}</span> — check karke Save dabao (Settings → Tender items mein jayega)
    <div class="tablewrap"><table class="grid"><thead><tr><th>Item no.</th><th>Mix</th><th>Thickness mm</th><th>Qty MT</th><th>Bitumen %</th><th>Tack coat kg/sq.m</th><th>Density</th></tr></thead><tbody>
    ${list.map((x, k) => `<tr><td>${cell(k, 'code', x.item_no, 60)}</td><td>${cell(k, 'name', String(x.name).toUpperCase(), 70)}</td><td>${cell(k, 'th', x.thickness_mm, 60)}</td>
      <td>${cell(k, 'qty', x.qty_mt, 80)}</td><td>${cell(k, 'pct', x.bitumen_pct, 60)}</td><td>${cell(k, 'tack', x.tack_kg_sqm, 60)}</td><td>${cell(k, 'den', x.density, 55)}</td></tr>`).join('')}
    </tbody></table></div>${j.notes ? `<div class="muted">Note: ${esc(j.notes)}</div>` : ''}
    <div class="row"><button class="btn success">✅ Settings mein save karo</button></div>`;
  box.querySelector('button').onclick = () => {
    let add = 0, upd = 0;
    list.forEach((_, k) => {
      const g = n => box.querySelector(`[data-k="${k}"][data-n="${n}"]`).value.trim();
      const name = g('name').toUpperCase(); if (!name) return;
      let it = DB.items.find(i => i.name.toUpperCase() === name) || (g('code') && DB.items.find(i => i.code == g('code')));
      if (!it) { it = { code: g('code') || String(DB.items.length + 1), name, pct: 0 }; DB.items.push(it); add++; } else upd++;
      it.name = name;
      if (g('pct')) it.pct = +g('pct'); if (g('th')) it.th = +g('th'); if (g('qty')) it.estQty = +g('qty');
      if (g('tack') !== '') it.tack = +g('tack'); if (g('den')) it.den = +g('den');
    });
    save(); renderAll();
    box.innerHTML = `✅ Settings mein ${add} naye, ${upd} update`;
    chatPush('bot', `Estimate ke items Settings mein save hue (${add} naye, ${upd} update). Settings → Tender items mein ek baar check kar lo.`);
  };
  appendMsg('bot', '', box);
}
function showGatepassConfirm(j) {
  const box = document.createElement('div'); box.className = 'confirm';
  const v = { recvDate: j.received_date || j.invoice_date || '', invDate: j.invoice_date || '', invNo: j.invoice_no || '', supplier: j.supplier || '', tanker: normVeh(j.tanker_no), gpNo: j.gatepass_no || '', grade: j.grade || 'VG-30', qty: j.qty_mt ?? '' };
  box.innerHTML = `<b>Gatepass reading</b> <span class="pill ai">AI · ${esc(j.confidence || '?')}</span> — check karke Save dabao
    <div class="grid4" style="margin-top:8px">
    <label>Plant aavak date<input type="date" name="recvDate" value="${esc(v.recvDate)}"></label>
    <label>Invoice date<input type="date" name="invDate" value="${esc(v.invDate)}"></label>
    <label>Invoice no.<input name="invNo" value="${esc(v.invNo)}"></label>
    <label>Supplier<input name="supplier" value="${esc(v.supplier)}"></label>
    <label>Tanker<input name="tanker" value="${esc(v.tanker)}"></label>
    <label>Gate pass no.<input name="gpNo" value="${esc(v.gpNo)}"></label>
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
async function aiAsk(text, file, json) {
  const cfg = aiCfg();
  if ((cfg.provider || 'claude') === 'gemini') {
    const parts = [{ text }]; if (file) parts.push({ inline_data: { mime_type: file.mime, data: file.b64 } });
    return gemini(parts, json);
  }
  return claude(text, file, json);
}
async function claude(text, file, json) {
  const cfg = aiCfg();
  const content = [];
  if (file) content.push(file.mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.b64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.mime, data: file.b64 } });
  content.push({ type: 'text', text: json ? text + '\nRespond with the JSON object only, no other text.' : text });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: cfg.model || 'claude-sonnet-5-5', max_tokens: 4000, messages: [{ role: 'user', content }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || ('HTTP ' + r.status));
  let out = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  if (json) { const m = out.match(/\{[\s\S]*\}/); if (m) out = m[0]; }
  return out;
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
  if (active === 'tab-progress' && typeof renderProgress === 'function') renderProgress();
  if (active === 'tab-paver' && typeof renderPaver === 'function') renderPaver();
  if (active === 'tab-tests' && typeof renderTests === 'function') renderTests();
  if (active === 'tab-grad' && typeof renderGrad === 'function') renderGrad();
  if (active === 'tab-daily' && typeof renderDaily === 'function') renderDaily();
}
load();
renderWorkSelect();
renderChatHistory();
if (DB.runs.length && !+DB.settings.gpBook) setTimeout(() => { if (ensureGpBook()) renderAll(); }, 600);
if (gpNeedsFix()) { renumberAllGP(); save(); }
renderAll();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
$('#btnGpRenum').addEventListener('click', () => {
  if (!ensureGpBook()) return;
  if (!DB.runs.length) return toast('Abhi koi register saved nahi');
  if (!confirm(`Saare saved register ke gate pass ${firstGP()} se dobara lagenge (lock wale din mein bhi). Theek hai?`)) return;
  renumberAllGP(); save(); renderAll(); toast('Gate pass no. dobara lag gaye');
});

$('#chLockBox').addEventListener('click', e => {
  if (e.target.id === 'chUnlock') {
    if (!confirm('Chainage ka lock kholein? Phir chainage Progress ke hisaab se dobara ban jayegi.')) return;
    DB.pvLock = null; save(); renderAll(); return toast('🔓 Chainage unlock');
  }
  if (e.target.id !== 'chLock') return;
  const to = $('#chLockDate').value; if (!to) return toast('Date chuno');
  if (typeof pv2Build !== 'function') return toast('Paver module load nahi hua');
  if (!DB.pv2upto || DB.pv2upto < to) { if (!confirm(`Progress ${DB.pv2upto ? dmy(DB.pv2upto) : '—'} tak hi confirm hai. Kya Progress ${dmy(to)} tak poora bhara hai? OK = haan, lock karo`)) return; DB.pv2upto = to; }
  // jo chainage abhi register mein dikh rahi hai wahi fix (sirf lock date tak ke trucks)
  const b = pv2Build(DB.pv2upto), keep = k => (DB.runs.find(r => r.id === k.split(':')[0])?.date || '9') <= to;
  const pickK = o => Object.fromEntries(Object.entries(o).filter(([k]) => keep(k)));
  DB.pvLock = { upto: to, alloc: pickK(b.alloc), lens: pickK(b.lens), pieces: pickK(b.pieces) };
  save(); renderAll(); toast('🔒 Chainage lock ho gayi');
});
