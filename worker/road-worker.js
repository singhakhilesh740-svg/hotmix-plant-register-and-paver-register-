/* RnB Office (Road) — Chatbot Worker (Cloudflare)
   API key yahan Secret mein rehti hai, app ke code mein nahi.
   Har request par: Google login (Firebase ID token) sahi hai? user Admin hai ya Admin ne "🤖 Chatbot" tick kiya hai?
   Tabhi Anthropic API ko call jati hai.

   Variables (Worker → Settings → Variables and Secrets):
     ANTHROPIC_API_KEY  (Secret)  — Claude API key
     FIREBASE_PROJECT_ID          — road-register
     ADMIN_EMAIL                  — 112ce0489@gmail.com
     ALLOWED_ORIGINS              — https://singhakhilesh740-svg.github.io
*/
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let KEYS = null, KEYS_AT = 0;

function cors(env, origin) {
  const ok = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allow = ok.includes(origin) ? origin : (ok[0] || '');
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
const json = (obj, status, h) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...h } });
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));

async function getKeys() {
  if (KEYS && Date.now() - KEYS_AT < 3600e3) return KEYS;
  const r = await fetch(JWK_URL); const j = await r.json(); KEYS = {}; KEYS_AT = Date.now();
  for (const k of j.keys || []) KEYS[k.kid] = await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return KEYS;
}
async function verify(token, project) {
  const [h, p, s] = token.split('.'); if (!s) throw new Error('Token galat');
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), pay = JSON.parse(new TextDecoder().decode(b64u(p)));
  let keys = await getKeys(); if (!keys[head.kid]) { KEYS = null; keys = await getKeys(); }
  const key = keys[head.kid]; if (!key || head.alg !== 'RS256') throw new Error('Token key nahi mili');
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p));
  const now = Math.floor(Date.now() / 1000);
  if (!ok || pay.aud !== project || pay.iss !== 'https://securetoken.google.com/' + project || !pay.sub || pay.exp < now || pay.iat > now + 300)
    throw new Error('Login sahi nahi — app mein dobara login karo');
  return pay;
}
async function allowed(pay, token, env) {
  if ((pay.email || '').toLowerCase() === (env.ADMIN_EMAIL || '').toLowerCase() && pay.email_verified) return true;
  // user ka apna access doc (Firestore rules: user khud padh sakta hai) — usi ke token se
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/access/${pay.user_id || pay.sub}`;
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + token } });
  if (!r.ok) return false;
  const d = await r.json();
  return d?.fields?.sections?.mapValue?.fields?.ai?.booleanValue === true;
}

export default {
  async fetch(req, env) {
    const h = cors(env, req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ error: { message: 'Sirf POST' } }, 405, h);
    try {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: { message: 'Pehle Google se login karo' } }, 401, h);
      const pay = await verify(token, env.FIREBASE_PROJECT_ID);
      if (!(await allowed(pay, token, env))) return json({ error: { message: 'Admin ne abhi aapko chatbot ki anumati nahi di hai.' } }, 403, h);
      const body = await req.json();
      const out = { model: String(body.model || 'claude-sonnet-5-5'), max_tokens: Math.min(+body.max_tokens || 4000, 8000), messages: body.messages };
      if (body.system) out.system = body.system;
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(out) });
      return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', ...h } });
    } catch (e) { return json({ error: { message: e.message || 'Worker error' } }, 401, h); }
  }
};
