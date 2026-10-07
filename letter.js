/* ================= RnB Office — Letter section =================
   Format: R&B Sub Division Dahod ke English / Gujarati patra. Chatbot ko vishay (ya estimate / patra ki file) do,
   wo draft bharta hai; tum form mein sudhaar kar ke Print ya Word (.docx) nikalo. */
const LKEY = 'rnb_letter_v1';
const LT_OFFICE = () => ({
  en: 'GOVERNMENT OF GUJARAT\nROADS & BUILDINGS DEPARTMENT\nOffice of the Deputy Executive Engineer\nR & B Sub Division, Dahod\nGadi Fort, Dahod, Taluka: Dahod, District: Dahod\nPhone: 02673-220227, Email: rnbdahoddee@gmail.com',
  gu: 'નાયબ કાર્યપાલક ઇજનેરશ્રીની કચેરી\nમાર્ગ અને મકાન પેટા વિભાગ,દાહોદ (રાજ્ય)\nગડી ફોર્ટ દાહોદ,તા:દાહોદ , જી:દાહોદ\n(02673) 220227\nrnbdahoddee@gmail.com',
  signEn: 'Deputy Executive Engineer\nR & B Sub Division,\nDahod.', signGu: 'નાયબ કાર્યપાલક ઇજનેર\nમાર્ગ અને મકાન પેટા વિભાગ\nદાહોદ.',
});
const LT_FMT = {
  en_general: { label: 'English — sadharan patra', lang: 'en', d: {} },
  en_perusal: { label: 'English — Perusal letter (kai kaam, table)', lang: 'en', d: {
    to: 'The Executive Engineer,\nDahod (R&B) Division,\nDahod.',
    subject: 'Regarding perusal for pre-monsoon Current Repair (C.R.) works of various ________ Government buildings at Dahod.',
    body: 'With reference to the above subject, it is respectfully submitted that the estimates for the following Current Repair (C.R.) works have been prepared as per the Approved Rates and are submitted herewith for perusal.',
    closing: 'You are requested to kindly peruse the above estimates and accord Technical Sanction / Administrative Approval to the same at the earliest.',
    encl: 'Estimates (____ copies)', works: [{ name: '', amt: '' }] } },
  en_ts: { label: 'English — Technical Sanction (ek kaam)', lang: 'en', d: {
    to: 'The Executive Engineer,\nR&B Division,\nDahod.',
    subject: 'Regarding Technical Sanction of estimate for the work "________".',
    body: 'With reference to the above subject, the estimate for the following work has been prepared and is submitted herewith for perusal.',
    closing: 'You are requested to kindly peruse the above estimate and accord Technical Sanction to the same at the earliest.',
    encl: 'Estimate (____ copies)', works: [{ name: '', amt: '' }] } },
  gu_general: { label: 'ગુજરાતી — સામાન્ય પત્ર', lang: 'gu', d: { to: '__________શ્રી\n__________ની કચેરી,\n__________',
    closing: 'આથી ઉપરોક્ત બાબતે જરૂરી કાર્યવાહી કરવા વિનંતી છે. આ બાબતે આપશ્રીની જાણ તથા આગળની જરૂરી કાર્યવાહી માટે સાદર રજૂ.' } },
  gu_perusal: { label: 'ગુજરાતી — પરૂઝલ પત્ર (ટેબલ)', lang: 'gu', d: {
    to: 'કાર્યપાલક ઇજનેરશ્રી\nમાર્ગ અને મકાન વિભાગ, દાહોદની કચેરી,\nદાહોદ.',
    subject: '________ ના કામોના અંદાજપત્રક પરૂઝલ કરવા બાબત.',
    body: 'નીચે મુજબના કામોના અંદાજપત્રક મંજૂર થયેલ દર (Approved Rate) મુજબ તૈયાર કરી આ સાથે પરૂઝલ અર્થે સામેલ રાખેલ છે.',
    closing: 'ઉપરોક્ત કામોના અંદાજપત્રક પરૂઝલ કરી ટેકનીકલ મંજૂરી, વહીવટી મંજૂરી તથા ગ્રાન્ટ ફાળવવા વિનંતી છે.\n\nઆથી ઉપરોક્ત બાબતે જરૂરી કાર્યવાહી કરવા વિનંતી છે. આ બાબતે આપશ્રીની જાણ તથા આગળની જરૂરી કાર્યવાહી માટે સાદર રજૂ.',
    encl: 'અંદાજપત્રક (____ નકલ)', works: [{ name: '', amt: '' }] } },
};
let LT = (() => { try { return JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch (e) { return {}; } })();
LT.office = { ...LT_OFFICE(), ...(LT.office || {}) }; LT.letters = LT.letters || []; LT.chat = LT.chat || [];
const ltBlank = fmt => ({ id: uid(), fmt, no: '', date: '', to: '', subject: '', ref: '', body: '', closing: '', encl: '', copy: '', works: [], ...JSON.parse(JSON.stringify(LT_FMT[fmt].d)) });
if (!LT.cur) LT.cur = ltBlank('en_general');
function ltSave() { try { localStorage.setItem(LKEY, JSON.stringify(LT)); } catch (e) { toast('Save nahi hua: ' + e.message); } }
const ltLang = L => (LT_FMT[L.fmt] || LT_FMT.en_general).lang;
const guNum = s => String(s).replace(/\d/g, d => '૦૧૨૩૪૫૬૭૮૯'[d]);
const inr = v => { const n = +String(v).replace(/[^\d.]/g, ''); return v === '' || v == null || isNaN(n) ? String(v || '') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); };
const ltParas = t => String(t || '').split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean);
const ltLines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const ltWorks = L => (L.works || []).filter(w => (w.name || '').trim() || (w.amt + '').trim());
const ltTotal = L => ltWorks(L).reduce((a, w) => a + (+String(w.amt).replace(/[^\d.]/g, '') || 0), 0);
function ltDate(L, gu) { const y = new Date().getFullYear();
  if (!L.date) return gu ? `તા. ____ / ____ / ${guNum(y)}` : `Date: ____ / ____ / ${y}`;
  const [Y, M, D] = L.date.split('-'); return gu ? `તા. ${guNum(D)} / ${guNum(M)} / ${guNum(Y)}` : `Date: ${D} / ${M} / ${Y}`; }
function ltNo(L, gu) { const y = (L.date || '').slice(0, 4) || new Date().getFullYear(); return gu ? `જ.નં.: ${L.no || '__________'} / સને ${guNum(y)}` : `No: ${L.no || '__________'}`; }
// ---------- preview / print HTML ----------
function ltHtml(L) {
  const gu = ltLang(L) === 'gu', O = LT.office, H = ltLines(gu ? O.gu : O.en), W = ltWorks(L), e = esc, br = t => ltLines(t).map(e).join('<br>');
  const head = gu ? H.map((l, i) => `<div style="${i === 0 ? 'font-weight:700;font-size:14pt' : i === 1 ? 'font-size:10.5pt' : 'font-size:10pt'}">${e(l)}</div>`).join('')
    : H.map((l, i) => `<div style="${i < 2 ? 'font-weight:700;font-size:13pt' : i < 4 ? 'font-weight:700' : ''}">${e(l)}</div>`).join('');
  const table = W.length ? `<table class="lt-tbl"><thead><tr><th style="width:9%">${gu ? 'ક્રમ' : 'Sr No'}</th><th>${gu ? 'કામનું નામ' : 'Name of Work'}</th><th style="width:22%">${gu ? 'અંદાજિત રકમ (રૂ.)' : 'Estimated Amount (Rs.)'}</th></tr></thead><tbody>` +
    W.map((w, i) => `<tr><td>${gu ? guNum(i + 1) : i + 1}</td><td style="text-align:left">${e(w.name)}</td><td style="text-align:right">${e(inr(w.amt))}</td></tr>`).join('') +
    (W.length > 1 ? `<tr class="lt-sh"><td colspan="2" style="text-align:right"><b>${gu ? 'કુલ' : 'Total'}</b></td><td style="text-align:right"><b>${inr(ltTotal(L))}</b></td></tr>` : '') + '</tbody></table>' : '';
  const P = t => ltParas(t).map(p => `<p class="lt-p">${e(p)}</p>`).join('');
  const sign = `<div class="lt-sign">${br(gu ? O.signGu : O.signEn)}</div>`;
  const copy = ltLines(L.copy);
  if (gu) return `<div class="letter gu"><div class="lt-head">${head}</div><div class="lt-rule1"></div>
    <div class="lt-row lt-b lt-ub"><span>${e(ltNo(L, 1))}</span><span>${e(ltDate(L, 1))}</span></div>
    <div>પ્રતિ,</div><div class="lt-b">${br(L.to)}</div>
    <div class="lt-b lt-gap">વિષય : ${e(L.subject)}</div>${L.ref ? `<div class="lt-b">સંદર્ભ : ${br(L.ref)}</div>` : ''}
    <p class="lt-p0">${L.ref ? 'ઉપરોક્ત વિષય તથા સંદર્ભ અન્વયે સવિનય જણાવવાનું કે,' : 'ઉપરોક્ત વિષય અન્વયે સવિનય જણાવવાનું કે,'}</p>
    ${P(L.body)}${table}${P(L.closing)}<div class="lt-space"></div>
    <div class="lt-row lt-b"><span style="max-width:55%">${L.encl ? 'બીડાણ : ' + e(L.encl) : ''}</span>${sign}</div>
    ${copy.length ? `<div class="lt-b lt-gap">નકલ સાદર રવાના :</div>${copy.map((c, i) => `<div>${guNum(i + 1)}. ${e(c)}</div>`).join('')}` : ''}</div>`;
  return `<div class="letter en"><div class="lt-head">${head}</div><div class="lt-rule2"></div>
    <div class="lt-row"><span>${e(ltNo(L))}</span><span>${e(ltDate(L))}</span></div>
    <div class="lt-gap">To,</div><div class="lt-b">${br(L.to)}</div>
    <div class="lt-b lt-gap">Subject : ${e(L.subject)}</div>${L.ref ? `<div class="lt-gap"><b>Reference :</b> ${br(L.ref)}</div>` : ''}
    <div class="lt-gap">Sir,</div>${P(L.body)}${table}${P(L.closing)}
    ${L.encl ? `<div class="lt-gap">Encl.: ${e(L.encl)}</div>` : ''}<div class="lt-space"></div><div class="lt-row"><span></span>${sign}</div>
    ${copy.length ? `<div class="lt-gap">Copy to:</div>${copy.map((c, i) => `<div>${i + 1}. ${e(c)}</div>`).join('')}` : ''}</div>`;
}
// ---------- UI ----------
function renderLetter() {
  const L = LT.cur, F = $('#ltForm'); if (!F) return;
  $('#ltFmt').innerHTML = Object.entries(LT_FMT).map(([k, v]) => `<option value="${k}" ${k === L.fmt ? 'selected' : ''}>${v.label}</option>`).join('');
  ['no', 'date', 'to', 'subject', 'ref', 'body', 'closing', 'encl', 'copy'].forEach(k => { const i = F.querySelector(`[data-lt="${k}"]`); if (i && document.activeElement !== i) i.value = L[k] || ''; });
  $('#ltWorks').innerHTML = (L.works || []).map((w, i) => `<tr><td>${i + 1}</td><td><input data-ltw="${i}" data-f="name" value="${esc(w.name)}" style="width:100%"></td><td><input data-ltw="${i}" data-f="amt" value="${esc(w.amt)}" style="width:130px"></td><td><button class="btn sm danger" data-ltwdel="${i}">🗑</button></td></tr>`).join('') ||
    '<tr><td colspan="4" class="muted">Table nahi (perusal / TS patra mein "+ Kaam" se jodo)</td></tr>';
  $('#ltPreview').innerHTML = ltHtml(L);
  $('#ltSaved').innerHTML = LT.letters.length ? LT.letters.map(x => `<tr><td>${x.date ? dmy(x.date) : '—'}</td><td>${esc(x.no || '')}</td><td class="l" style="white-space:normal">${esc(x.subject || '(vishay nahi)')}</td><td>${ltLang(x) === 'gu' ? 'ગુજ.' : 'Eng'}</td>
    <td><button class="btn sm" data-ltopen="${x.id}">Kholo</button> <button class="btn sm danger" data-ltdel="${x.id}">🗑</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">Abhi koi patra saved nahi</td></tr>';
  ['en', 'gu', 'signEn', 'signGu'].forEach(k => { const i = $(`[data-lto="${k}"]`); if (i && document.activeElement !== i) i.value = LT.office[k]; });
  $('#ltChatLog').innerHTML = LT.chat.slice(-30).map(m => `<div class="msg ${m.r}">${esc(m.t)}</div>`).join('') || '<div class="msg bot">Vishay batao ya estimate / purana patra (photo, PDF, Excel) daalo — main is format mein patra bana dunga. Jaise: "Garbada Arts College ke estimate ki TS ke liye EE ko patra, Gujarati mein".</div>';
  const lg = $('#ltChatLog'); lg.scrollTop = lg.scrollHeight;
}
const ltPrev = () => { $('#ltPreview').innerHTML = ltHtml(LT.cur); clearTimeout(ltPrev._t); ltPrev._t = setTimeout(ltSave, 400); };
document.addEventListener('input', e => { const d = e.target.dataset; if (!d) return;
  if (d.lt) { LT.cur[d.lt] = e.target.value; return ltPrev(); }
  if (d.ltw != null) { LT.cur.works[+d.ltw][d.f] = e.target.value; return ltPrev(); }
  if (d.lto) { LT.office[d.lto] = e.target.value; return ltPrev(); } });
document.addEventListener('change', e => {
  if (e.target.id === 'ltFmt') { const f = e.target.value, c = LT.cur, has = ['to', 'subject', 'body', 'closing'].some(k => (c[k] || '').trim());
    if (has && !confirm('Format badalne par is format ka taiyar matter bharega (jo khane tumne bhare hain wo rahenge). Theek hai?')) return renderLetter();
    const n = ltBlank(f); LT.cur = { ...n, id: c.id, no: c.no, date: c.date, ref: c.ref, copy: c.copy, ...Object.fromEntries(['to', 'subject', 'body', 'closing', 'encl'].filter(k => (c[k] || '').trim() && ltLang(c) === LT_FMT[f].lang).map(k => [k, c[k]])), works: ltWorks(c).length ? c.works : n.works };
    ltSave(); renderLetter(); }
  if (e.target.id === 'ltFile') { LT_FILE = e.target.files[0] || null; $('#ltFileName').textContent = LT_FILE ? '📎 ' + LT_FILE.name : ''; }
});
let LT_FILE = null;
document.addEventListener('click', e => {
  const id = e.target.id, d = e.target.dataset || {};
  if (e.target.closest('#secNav button')) return setSection(e.target.closest('button').dataset.sec);
  if (id === 'ltAddWork') { LT.cur.works = LT.cur.works || []; LT.cur.works.push({ name: '', amt: '' }); ltSave(); return renderLetter(); }
  if (d.ltwdel != null) { LT.cur.works.splice(+d.ltwdel, 1); ltSave(); return renderLetter(); }
  if (id === 'ltNew') { LT.cur = ltBlank($('#ltFmt').value); ltSave(); return renderLetter(); }
  if (id === 'ltSaveBtn') { const i = LT.letters.findIndex(x => x.id === LT.cur.id), c = JSON.parse(JSON.stringify(LT.cur)); if (i >= 0) LT.letters[i] = c; else LT.letters.unshift(c); ltSave(); renderLetter(); return toast('Patra save hua'); }
  if (d.ltopen) { const x = LT.letters.find(v => v.id === d.ltopen); if (x) { LT.cur = JSON.parse(JSON.stringify(x)); ltSave(); renderLetter(); window.scrollTo(0, 0); } return; }
  if (d.ltdel) { if (!confirm('Ye saved patra delete karein?')) return; LT.letters = LT.letters.filter(v => v.id !== d.ltdel); ltSave(); return renderLetter(); }
  if (id === 'ltPrint') return doPrint(ltHtml(LT.cur));
  if (id === 'ltDocx') return ltDocx(LT.cur).catch(err => toast('Word file nahi bani: ' + err.message));
  if (id === 'ltSend') return ltChatSend();
  if (id === 'ltChatClear') { LT.chat = []; ltSave(); return renderLetter(); }
  if (id === 'ltOfficeReset') { if (!confirm('Letterhead wapas default par?')) return; LT.office = LT_OFFICE(); ltSave(); return renderLetter(); }
});
document.addEventListener('keydown', e => { if (e.target.id === 'ltMsg' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ltChatSend(); });
function setSection(s) { document.body.dataset.sec = s; try { localStorage.setItem('rnb_sec', s); } catch (e) {}
  $$('#secNav button').forEach(b => b.classList.toggle('active', b.dataset.sec === s)); if (s === 'letter') renderLetter(); else renderAll(); }
// ---------- chatbot ----------
const LT_RULES = `You draft official letters for the Deputy Executive Engineer, R & B Sub Division, Dahod (Government of Gujarat, Roads & Buildings Department).
House rules:
- No "Yours faithfully" or equivalent. English letters start with "Sir," (added by the template; do not include it). Formal government tone, concise.
- Gujarati letters: the template itself adds the opening line "ઉપરોક્ત વિષય (તથા સંદર્ભ) અન્વયે સવિનય જણાવવાનું કે," — do not repeat it; write the body continuing after it. Write "perusal" as "પરૂઝલ". Default closing line: "આથી ઉપરોક્ત બાબતે જરૂરી કાર્યવાહી કરવા વિનંતી છે. આ બાબતે આપશ્રીની જાણ તથા આગળની જરૂરી કાર્યવાહી માટે સાદર રજૂ."
- If a work is C.R. (Current Repair), the estimate is prepared "as per the Approved Rates" (never "as per S.O.R."); Gujarati: "મંજૂર થયેલ દર (Approved Rate) મુજબ".
- "DTP" means Draft Tender Paper; DTP approval letters go to the Executive Engineer.
- Estimates / perusal / Technical Sanction letters are addressed to "The Executive Engineer, R&B Division, Dahod." (Gujarati: "કાર્યપાલક ઇજનેરશ્રી / માર્ગ અને મકાન વિભાગ, દાહોદની કચેરી, / દાહોદ."), list works in "works" (name + estimated amount in Rs, the "Say" amount from the estimate), have no Copy-to. A single-work TS letter subject: Regarding Technical Sanction of estimate for the work "<name>". If the estimate cites an Approved Rate Letter No., put it in "ref" as "Approved Rate Letter No. <ref>." and open the body "With reference to the above, the estimate ... has been prepared as per the Approved Rate (vide reference cited above) ...".
- Never invent letter numbers, dates, amounts, names or references. Leave unknown things as "________". Do not fill "no" or "date".
Return ONLY a JSON object with keys: fmt (one of en_general, en_perusal, en_ts, gu_general, gu_perusal), to (lines separated by \\n), subject, ref (empty if none), body (paragraphs separated by a blank line; text before the works table), works (array of {name, amt}; empty array if no table), closing (paragraphs after the table / final request), encl, copy (one recipient per line, empty if none), reply (one short Hinglish sentence telling the user what you drafted and what is still blank).`;
async function ltFilePart(f) {
  if (/\.(xlsx|xls|csv)$/i.test(f.name)) { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); let t = '';
    wb.SheetNames.slice(0, 4).forEach(n => { t += `\n--- sheet ${n} ---\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { blankrows: false }).split('\n').filter(l => l.replace(/,/g, '').trim()).slice(0, 120).join('\n'); });
    return { text: `\nAttached file "${f.name}" (spreadsheet as CSV):\n` + t.slice(0, 14000) }; }
  if (/^text\/|\.txt$/i.test(f.type + f.name)) return { text: `\nAttached file "${f.name}":\n` + (await f.text()).slice(0, 14000) };
  const isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name), url = isPdf ? await fileToDataUrl(f) : await shrinkImage(f, 1800);
  return { file: { mime: isPdf ? 'application/pdf' : (url.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg', b64: url.split(',')[1] } };
}
async function ltChatSend() {
  const box = $('#ltMsg'), msg = box.value.trim(), f = LT_FILE; if (!msg && !f) return toast('Vishay likho ya file daalo');
  if (!aiCfg().key) return toast('Pehle Road Register → Settings mein AI key daalo');
  LT.chat.push({ r: 'user', t: (f ? `📎 ${f.name}\n` : '') + msg }); box.value = ''; LT_FILE = null; $('#ltFile').value = ''; $('#ltFileName').textContent = ''; renderLetter();
  $('#ltSend').disabled = true; $('#ltSend').textContent = '…';
  try {
    const part = f ? await ltFilePart(f) : {}, c = LT.cur;
    const cur = { fmt: c.fmt, to: c.to, subject: c.subject, ref: c.ref, body: c.body, works: ltWorks(c), closing: c.closing, encl: c.encl, copy: c.copy };
    const txt = await aiAsk(`${LT_RULES}\n\nCurrent draft (keep what is still right, change what the user asks):\n${JSON.stringify(cur)}\n\nUser's instruction (may be Hinglish; write the letter in the language of the chosen format unless the user asks for another):\n${msg || 'Is file se patra banao.'}${part.text || ''}`, part.file, true);
    const m = txt.replace(/```json|```/g, '').match(/\{[\s\S]*\}/); if (!m) throw new Error('AI ka jawab samajh nahi aaya');
    const j = JSON.parse(m[0]), fmt = LT_FMT[j.fmt] ? j.fmt : c.fmt, S = v => v == null ? '' : String(v);
    LT.cur = { ...c, fmt, to: S(j.to), subject: S(j.subject), ref: S(j.ref), body: S(j.body), closing: S(j.closing), encl: S(j.encl), copy: Array.isArray(j.copy) ? j.copy.join('\n') : S(j.copy),
      works: (Array.isArray(j.works) ? j.works : []).map(w => ({ name: S(w.name), amt: S(w.amt ?? w.amount) })) };
    LT.chat.push({ r: 'bot', t: S(j.reply) || 'Draft ban gaya — form aur preview dekh lo.' });
  } catch (err) { LT.chat.push({ r: 'bot', t: 'Nahi ho paya: ' + err.message }); }
  $('#ltSend').disabled = false; $('#ltSend').textContent = 'Bhejo'; ltSave(); renderLetter();
}
// ---------- Word (.docx) ----------
function ltLoadDocx() { return window.docx ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/docx.iife.js'; s.onload = res; s.onerror = () => rej(new Error('docx library load nahi hui')); document.head.appendChild(s); }); }
async function ltDocx(L) {
  await ltLoadDocx();
  const X = window.docx, { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, PageNumber, AlignmentType: AL, WidthType, BorderStyle, ShadingType, TabStopType } = X;
  const gu = ltLang(L) === 'gu', O = LT.office, font = gu ? 'Noto Sans Gujarati' : 'Arial', SZ = gu ? 21 : 22, W = ltWorks(L);
  const M = gu ? { top: 288, right: 1008, bottom: 648, left: 1008, header: 43, footer: 720 } : { top: 1008, right: 1296, bottom: 1008, left: 1296, header: 432, footer: 432 }, TW = 11906 - M.left - M.right;
  const sp = (o = {}) => ({ before: 0, after: 0, line: 240, lineRule: 'auto', ...o });
  const R = (text, o = {}) => new TextRun({ text, font, size: SZ, ...o });
  const para = (text, o = {}, ro = {}) => new Paragraph({ spacing: sp(o.spacing), alignment: o.alignment, indent: o.indent, tabStops: o.tabStops, border: o.border,
    children: String(text).split('\n').flatMap((t, i) => i ? [new TextRun({ break: 1, font, size: SZ, ...ro }), R(t, ro)] : [R(t, ro)]) });
  const just = t => ltParas(t).map(p => para(p, { alignment: AL.JUSTIFIED, spacing: { after: 120, line: 288 }, indent: { firstLine: gu ? 480 : 720 } }));
  const empty = () => para('');
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, noB = { top: none, bottom: none, left: none, right: none }, one = { style: BorderStyle.SINGLE, size: 4, color: '000000' }, allB = { top: one, bottom: one, left: one, right: one };
  const cell = (text, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: o.borders || allB, shading: o.shade ? { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined, columnSpan: o.span,
    margins: { top: 50, bottom: 50, left: 90, right: 90 }, children: [para(text, { alignment: o.align || AL.CENTER }, { bold: !!o.bold })] });
  const cw = [850, TW - 850 - 2000 - 400, 2000], tblW = cw[0] + cw[1] + cw[2];
  const table = () => new Table({ width: { size: tblW, type: WidthType.DXA }, columnWidths: cw, alignment: AL.CENTER, rows: [
    new TableRow({ tableHeader: true, children: [cell(gu ? 'ક્રમ' : 'Sr No', cw[0], { shade: 1, bold: 1 }), cell(gu ? 'કામનું નામ' : 'Name of Work', cw[1], { shade: 1, bold: 1 }), cell(gu ? 'અંદાજિત રકમ (રૂ.)' : 'Estimated Amount (Rs.)', cw[2], { shade: 1, bold: 1 })] }),
    ...W.map((w, i) => new TableRow({ children: [cell(gu ? guNum(i + 1) : String(i + 1), cw[0]), cell(w.name, cw[1], { align: AL.LEFT }), cell(inr(w.amt), cw[2], { align: AL.RIGHT })] })),
    ...(W.length > 1 ? [new TableRow({ children: [cell(gu ? 'કુલ' : 'Total', cw[0] + cw[1], { span: 2, shade: 1, bold: 1, align: AL.RIGHT }), cell(inr(ltTotal(L)), cw[2], { shade: 1, bold: 1, align: AL.RIGHT })] })] : []) ] });
  const copy = ltLines(L.copy), rt = [{ type: TabStopType.RIGHT, position: TW }], kids = [];
  const headLines = ltLines(gu ? O.gu : O.en);
  const head = gu ? headLines.map((l, i) => para(l, { alignment: AL.CENTER }, i === 0 ? { bold: true, size: 28 } : { size: i === 1 ? 21 : 20 }))
    : headLines.map((l, i) => para(l, { alignment: AL.CENTER }, i < 2 ? { bold: true, size: 26 } : i < 4 ? { bold: true } : {}));
  const rule = new Paragraph({ spacing: gu ? { before: 0, after: 0, line: 20, lineRule: 'exact' } : sp({ after: 120 }), border: { bottom: { style: gu ? BorderStyle.SINGLE : BorderStyle.THICK_THIN_SMALL_GAP, size: gu ? 14 : 24, color: '000000', space: 1 } }, children: [new TextRun({ text: '', size: 2 })] });
  const signCell = lines => new TableCell({ width: { size: TW - 5832, type: WidthType.DXA }, borders: noB, children: [para(lines, { alignment: AL.CENTER }, { bold: true })] });
  const signTbl = left => new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [5832, TW - 5832], borders: { ...noB, insideHorizontal: none, insideVertical: none }, rows: [new TableRow({ children: [
    new TableCell({ width: { size: 5832, type: WidthType.DXA }, borders: noB, children: [para(left, {}, { bold: gu })] }), signCell(gu ? O.signGu : O.signEn)] })] });
  if (gu) {
    kids.push(new Paragraph({ spacing: sp({ before: 60, after: 60 }), tabStops: rt, border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: '000000', space: 1 } }, children: [R(ltNo(L, 1), { bold: true }), R('\t' + ltDate(L, 1), { bold: true })] }),
      para('પ્રતિ,', { spacing: { before: 120 } }), para(ltLines(L.to).join('\n'), {}, { bold: true }), para('વિષય : ' + (L.subject || ''), { spacing: { before: 160 } }, { bold: true }));
    if (L.ref) kids.push(para('સંદર્ભ : ' + ltLines(L.ref).join('\n'), {}, { bold: true }));
    kids.push(para(L.ref ? 'ઉપરોક્ત વિષય તથા સંદર્ભ અન્વયે સવિનય જણાવવાનું કે,' : 'ઉપરોક્ત વિષય અન્વયે સવિનય જણાવવાનું કે,', { spacing: { before: 160, after: 120 } }), ...just(L.body));
    if (W.length) kids.push(table(), para('', { spacing: { after: 120 } }));
    kids.push(...just(L.closing), empty(), empty(), empty(), empty(), signTbl(L.encl ? 'બીડાણ : ' + L.encl : ''));
    if (copy.length) kids.push(para('નકલ સાદર રવાના :', { spacing: { before: 200 } }, { bold: true }), ...copy.map((c, i) => para(`${guNum(i + 1)}. ${c}`)));
  } else {
    kids.push(...head, rule, new Paragraph({ spacing: sp({ after: 160 }), tabStops: rt, children: [R(ltNo(L)), R('\t' + ltDate(L))] }),
      para('To,'), para(ltLines(L.to).join('\n'), {}, { bold: true }), para('Subject : ' + (L.subject || ''), { spacing: { before: 200 }, alignment: AL.JUSTIFIED }, { bold: true }));
    if (L.ref) kids.push(new Paragraph({ spacing: sp({ before: 120 }), children: [R('Reference : ', { bold: true }), R(ltLines(L.ref).join('; '))] }));
    kids.push(para('Sir,', { spacing: { before: 200, after: 120 } }), ...just(L.body));
    if (W.length) kids.push(table(), para('', { spacing: { after: 120 } }));
    kids.push(...just(L.closing));
    if (L.encl) kids.push(para('Encl.: ' + L.encl, { spacing: { before: 120 } }));
    kids.push(empty(), empty(), empty(), empty(), signTbl(''));
    if (copy.length) kids.push(para('Copy to:', { spacing: { before: 200 } }), ...copy.map((c, i) => para(`${i + 1}. ${c}`)));
  }
  const doc = new Document({ styles: { default: { document: { run: { font, size: SZ } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: M } },
    headers: gu ? { default: new Header({ children: [...head, rule] }) } : undefined,
    footers: gu ? { default: new Footer({ children: [new Paragraph({ alignment: AL.CENTER, spacing: sp(), children: [new TextRun({ children: ['પૃષ્ઠ ', PageNumber.CURRENT], font, size: 18 })] })] }) } : undefined, children: kids }] });
  const blob = await Packer.toBlob(doc), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = ((L.subject || 'Letter').replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 60) || 'Letter') + '.docx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
setSection((() => { try { return localStorage.getItem('rnb_sec') || 'road'; } catch (e) { return 'road'; } })());
