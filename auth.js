/* ================= Google login + cloud data + admin panel =================
   firebase-config.js mein config ho to login zaroori; har user ka data alag (Firestore: users/{uid}/...).
   Kaun sa section kise dikhe — admin (ADMIN_EMAIL) tay karta hai; naye user ko default sirf Road Register. */
const ADMIN_EMAIL = 'singhakhilesh740@gmail.com';
const SECTIONS = [
  { id: 'road', label: '🛣️ Road Register', def: true },
  { id: 'letter', label: '✉️ Letter', def: false },
];
const FB_VER = '11.10.0';
let FB = null, ME = null, ACCESS = null;
window.ALLOWED = SECTIONS.map(s => s.id);
const isAdminUser = u => !!u && (u.email || '').toLowerCase() === ADMIN_EMAIL && u.emailVerified !== false;
function buildSecNav() {
  const A = window.ALLOWED, nav = $('#secNav');
  const list = SECTIONS.filter(s => A.includes(s.id)).map(s => [s.id, s.label]);
  if (A.includes('admin')) list.push(['admin', '🛡️ Admin']);
  nav.innerHTML = list.length > 1 ? list.map(([id, l]) => `<button data-sec="${id}">${l}</button>`).join('') : '';
  let s = 'road'; try { s = localStorage.getItem('rnb_sec') || 'road'; } catch (e) {}
  setSection(A.includes(s) ? s : A[0]);
}
// ---------- gzip + base64 (Firestore doc 1 MB tak) ----------
async function zip(obj) {
  const s = JSON.stringify(obj);
  if (!window.CompressionStream) return 'j:' + s;
  const buf = await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return 'g:' + btoa(bin);
}
async function unzip(z) {
  if (!z) return null; if (z.startsWith('j:')) return JSON.parse(z.slice(2));
  const bin = atob(z.slice(2)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}
const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
function syncBadge(t, cls) { const b = $('#syncBadge'); if (b) { b.textContent = t; b.className = 'syncb ' + (cls || ''); } }
// ---------- cloud save (thoda ruk kar, sirf badla hua work) ----------
let PUSHED = {}, PUSH_T = null, LPUSHED = '', LPUSH_T = null;
function cloudSave() { if (!ME || !FB) return; clearTimeout(PUSH_T); syncBadge('⏳ Save ho raha…', 'busy'); PUSH_T = setTimeout(pushWorks, 1500); }
async function pushWorks() {
  if (!ME) return; const col = FB.db.collection('users').doc(ME.uid).collection('works');
  try {
    for (const [id, w] of Object.entries(STORE.works)) {
      const { _upd, ...rest } = w, h = hashStr(JSON.stringify(rest)); if (PUSHED[id] === h) continue;
      w._upd = Date.now(); const z = await zip(w);
      if (z.length > 1000000) { syncBadge('⚠ Work bahut bada', 'bad'); toast(`"${w.settings.workName}" ka data cloud ki 1 MB seema se bada — Admin ko batao`); continue; }
      await col.doc(id).set({ name: w.settings.workName || '', upd: w._upd, z }); PUSHED[id] = h;
    }
    for (const id of Object.keys(PUSHED)) if (!STORE.works[id]) { await col.doc(id).delete(); delete PUSHED[id]; }
    try { localStorage.setItem(KEY, JSON.stringify(STORE)); } catch (e) {}
    syncBadge('☁️ Saved', 'ok');
  } catch (e) { syncBadge('⚠ Offline — baad mein save hoga', 'bad'); console.warn(e); clearTimeout(PUSH_T); PUSH_T = setTimeout(pushWorks, 20000); }
}
function cloudSaveLetters() { if (!ME || !FB) return; clearTimeout(LPUSH_T); LPUSH_T = setTimeout(async () => {
  try { const s = JSON.stringify(LT), h = hashStr(s); if (h === LPUSHED) return; LT._upd = Date.now(); await FB.db.collection('users').doc(ME.uid).collection('meta').doc('letters').set({ upd: LT._upd, z: await zip(LT) }); LPUSHED = hashStr(JSON.stringify(LT)); syncBadge('☁️ Saved', 'ok'); }
  catch (e) { syncBadge('⚠ Offline', 'bad'); } }, 1500); }
// ---------- login ke baad data lao ----------
async function loadUserData(u) {
  const uref = FB.db.collection('users').doc(u.uid), legacyKey = 'hmp_register_v1', legacyL = 'rnb_letter_v1';
  KEY = 'hmp_register_v1__' + u.uid; LKEY = 'rnb_letter_v1__' + u.uid;
  let local = {}; try { local = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const snap = await uref.collection('works').get(), cloud = {};
  for (const d of snap.docs) { try { cloud[d.id] = await unzip(d.data().z); } catch (e) { console.warn('work padh nahi paya', d.id, e); } }
  const works = {}; PUSHED = {};
  Object.entries(cloud).forEach(([id, w]) => { works[id] = w; const { _upd, ...r } = w; PUSHED[id] = hashStr(JSON.stringify(r)); });
  Object.entries(local.works || {}).forEach(([id, w]) => { if (!works[id] || (w._upd || 0) > (works[id]._upd || 0)) { works[id] = w; delete PUSHED[id]; } });
  let migrated = false;
  if (!Object.keys(works).length) {   // pehli baar login: is browser ka purana (bina login) data?
    let old = {}; try { old = JSON.parse(localStorage.getItem(legacyKey) || '{}'); } catch (e) {}
    const n = Object.keys(old.works || {}).length;
    if (n && !localStorage.getItem('rnb_legacy_to') && confirm(`Is browser mein pehle ka data mila (${n} work: ${Object.values(old.works).map(w => w.settings?.workName).join(', ')}).\nIse apne account (${u.email}) mein daalein?`)) {
      Object.assign(works, old.works); local.current = old.current; migrated = true; localStorage.setItem('rnb_legacy_to', u.uid); }
  }
  load({ works, current: local.current }); renderWorkSelect(); switchWork(STORE.current);
  // letters
  let lc = null; try { const d = await uref.collection('meta').doc('letters').get(); if (d.exists) lc = await unzip(d.data().z); } catch (e) {}
  let ll = null; try { ll = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) {}
  if (!lc && !ll && migrated) { try { ll = JSON.parse(localStorage.getItem(legacyL) || 'null'); } catch (e) {} }
  const L = ll && (!lc || (ll._upd || 0) > (lc._upd || 0)) ? ll : lc; ltLoad(L || undefined); LPUSHED = lc && L === lc ? hashStr(JSON.stringify(lc)) : '';
  if (L !== lc) cloudSaveLetters();
  cloudSave();
}
async function loadAccess(u) {
  if (isAdminUser(u)) return SECTIONS.map(s => s.id).concat('admin');
  let sec = {}; try { const d = await FB.db.collection('access').doc(u.uid).get(); if (d.exists) sec = d.data().sections || {}; } catch (e) {}
  return SECTIONS.filter(s => sec[s.id] ?? s.def).map(s => s.id);
}
// ---------- start ----------
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load nahi hua: ' + src)); document.head.appendChild(s); }); }
async function authInit() {
  if (!window.FIREBASE_CONFIG) { window.ALLOWED = SECTIONS.map(s => s.id); $('#userBox').innerHTML = ''; return buildSecNav(); }   // bina login (purana tareeka)
  document.body.dataset.auth = 'wait';
  try { for (const m of ['app', 'auth', 'firestore']) await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${m}-compat.js`); }
  catch (e) { document.body.dataset.auth = 'out'; $('#loginMsg').textContent = 'Internet nahi / Firebase load nahi hua. Page dobara kholo.'; return; }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  FB = { auth: firebase.auth(), db: firebase.firestore() };
  FB.auth.onAuthStateChanged(async u => {
    if (!u) { ME = null; document.body.dataset.auth = 'out'; $('#userBox').innerHTML = ''; return; }
    document.body.dataset.auth = 'wait'; $('#loginMsg').textContent = 'Data aa raha hai…';
    try {
      ME = u;
      await FB.db.collection('users').doc(u.uid).set({ email: u.email, name: u.displayName || '', photo: u.photoURL || '', lastLogin: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      window.ALLOWED = await loadAccess(u);
      await loadUserData(u);
      $('#userBox').innerHTML = `${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<span class="uname">${esc(u.displayName || u.email)}</span><span id="syncBadge" class="syncb ok">☁️</span><button class="btn sm" id="btnLogout">Logout</button>`;
      document.body.dataset.auth = 'in'; buildSecNav();
    } catch (e) { console.error(e); document.body.dataset.auth = 'out'; $('#loginMsg').textContent = 'Login hua par data nahi aaya: ' + e.message + ' (Firestore rules / internet check karo)'; }
  });
}
document.addEventListener('click', async e => {
  if (e.target.id === 'btnLogin') {
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await FB.auth.signInWithPopup(p); }
    catch (err) { if (/popup|operation-not-supported/i.test(err.code || '')) return FB.auth.signInWithRedirect(p); $('#loginMsg').textContent = 'Login nahi hua: ' + (err.message || err.code); }
  }
  if (e.target.id === 'btnLogout') { if (!confirm('Logout karein?')) return; await pushWorks().catch(() => {}); await FB.auth.signOut(); location.reload(); }
  if (e.target.id === 'admRefresh') renderAdmin();
  const sv = e.target.dataset?.admsave; if (sv) {
    const sec = {}; $$(`[data-admu="${sv}"]`).forEach(c => sec[c.dataset.s] = c.checked);
    try { await FB.db.collection('access').doc(sv).set({ sections: sec, by: ME.email, at: firebase.firestore.FieldValue.serverTimestamp() }); toast('Save hua — user dobara app khole to badlav dikhega'); }
    catch (err) { toast('Save nahi hua: ' + err.message); }
  }
});
// ---------- Admin panel ----------
async function renderAdmin() {
  const el = $('#admBox'); if (!el) return;
  if (!FB || !isAdminUser(ME)) { el.innerHTML = '<p class="muted">Admin panel sirf admin login par.</p>'; return; }
  el.innerHTML = '<p class="muted">Load ho raha…</p>';
  try {
    const [us, ac] = await Promise.all([FB.db.collection('users').get(), FB.db.collection('access').get()]);
    const acc = {}; ac.docs.forEach(d => acc[d.id] = d.data().sections || {});
    const rows = us.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => (b.lastLogin?.seconds || 0) - (a.lastLogin?.seconds || 0));
    el.innerHTML = `<div class="tablewrap"><table class="grid"><thead><tr><th></th><th>Naam</th><th>Email</th><th>Aakhri login</th>${SECTIONS.map(s => `<th>${s.label}</th>`).join('')}<th></th></tr></thead><tbody>` +
      rows.map(r => { const adm = (r.email || '').toLowerCase() === ADMIN_EMAIL, a = acc[r.uid] || {};
        return `<tr><td>${r.photo ? `<img src="${esc(r.photo)}" referrerpolicy="no-referrer" style="width:28px;height:28px;border-radius:50%">` : ''}</td><td class="l">${esc(r.name || '')}${adm ? ' <span class="pill">Admin</span>' : ''}</td><td class="l">${esc(r.email || '')}</td>
          <td>${r.lastLogin?.seconds ? new Date(r.lastLogin.seconds * 1000).toLocaleString('en-IN') : ''}</td>
          ${SECTIONS.map(s => `<td><input type="checkbox" style="width:auto" data-admu="${r.uid}" data-s="${s.id}" ${adm || (a[s.id] ?? s.def) ? 'checked' : ''} ${adm ? 'disabled' : ''}></td>`).join('')}
          <td>${adm ? '' : `<button class="btn sm primary" data-admsave="${r.uid}">Save</button>`}</td></tr>`; }).join('') + '</tbody></table></div>' +
      `<p class="muted">Koi naya user tabhi list mein aayega jab wo ek baar Google se login karega. Default: sirf Road Register.</p>`;
  } catch (e) { el.innerHTML = `<p class="flag">Users nahi aaye: ${esc(e.message)} — Firestore rules publish kiye hain?</p>`; }
}
authInit();
