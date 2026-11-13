/* PNC Music Club: small same-origin site server with SQLite-backed inbox and team data. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const SITE_DIR = __dirname;
const PRIVATE_DIR = path.join(SITE_DIR, '.private-data');
const DB_PATH = path.join(PRIVATE_DIR, 'pnc-music-club.sqlite');
const PORT = Number(process.env.PORT) || 4173;
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const sessions = new Map();
const rateBuckets = new Map();

fs.mkdirSync(PRIVATE_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('contact','chat')),
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','replied','archived')),
    internal_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function initialTeam() {
  const file = path.join(SITE_DIR, 'assets', 'js', 'team-data.js');
  try {
    const source = fs.readFileSync(file, 'utf8');
    const match = source.match(/window\.PNC_MUSIC_TEAM\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    if (match) return JSON.parse(match[1]);
  } catch (error) {
    console.error('Could not read the initial team profile data:', error.message);
  }
  return { generations: [] };
}

db.prepare('INSERT OR IGNORE INTO app_data (key,value,updated_at) VALUES (?,?,?)')
  .run('team', JSON.stringify(initialTeam()), new Date().toISOString());

// Website content is stored in the same persistent SQLite database as member profiles.
const initialSite = {
  brand: { title: 'PNC MUSIC CLUB', tagline: 'Feel the Beat · Live the Music', logo: '/assets/img/logo.png',
    email: '', facebook: '', telegram: '', instagram: '', announcement: 'A STUDENT-LED MUSIC COMMUNITY AT PNC' },
  appearance: { enabled: true, intensity: 65, style: 'aurora', headlineMotion: 'cinematic', tempo: 'normal' },
  heroMedia: {}, pageMedia: {}, globalMedia: {}, pages: {}, banners: {}, images: {}, gallery: {}, galleryItems: [], copy: {}
};
db.prepare('INSERT OR IGNORE INTO app_data (key,value,updated_at) VALUES (?,?,?)')
  .run('site', JSON.stringify(initialSite), new Date().toISOString());
const UPLOAD_DIR = path.join(SITE_DIR, 'assets', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
function siteValue() {
  const row = db.prepare('SELECT value FROM app_data WHERE key=?').get('site');
  try { return JSON.parse(row?.value || JSON.stringify(initialSite)); }
  catch (_) { return structuredClone(initialSite); }
}
function validImagePath(v) {
  return typeof v === 'string' && /^\/assets\/(?:img|uploads)\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|svg)$/.test(v)
    && !v.includes('..');
}
function safeString(v,n) { return typeof v === 'string' && v.length <= n; }
function validBackgroundPath(v) {
  return typeof v === 'string' && /^\/assets\/(?:img|uploads)\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp|gif|mp4|webm)$/.test(v) && !v.includes('..');
}
const PAGE_KEYS = ['home','about','news','activities','achievements','gallery','contact'];
function validBackgroundGroup(group) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return false;
  if (Object.keys(group).length > PAGE_KEYS.length) return false;
  for (const [key, item] of Object.entries(group)) {
    if (!PAGE_KEYS.includes(key) || !item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (!['image','gif','video'].includes(item.type) || !validBackgroundPath(item.src)) return false;
    if (item.type === 'video' && !/\.(?:mp4|webm)$/.test(item.src)) return false;
    if (item.type === 'gif' && !/\.gif$/.test(item.src)) return false;
    if (item.type === 'image' && !/\.(?:png|jpe?g|webp)$/.test(item.src)) return false;
    if (!Number.isInteger(item.overlay) || item.overlay < 15 || item.overlay > 85) return false;
    if (!['center','top','bottom'].includes(item.position)) return false;
  }
  return true;
}

function validGlobalMedia(group) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return false;
  if (Object.keys(group).length > 2) return false;
  return Object.entries(group).every(([slot, media]) =>
    ['page','hero'].includes(slot) && validBackgroundGroup({home: media})
  );
}

function validSite(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const { brand,appearance,pages,banners,images,gallery,copy }=data;
  if (!validBackgroundGroup(data.heroMedia || {}) || !validBackgroundGroup(data.pageMedia || {})
    || !validGlobalMedia(data.globalMedia || {})) return false;
  if (!brand || !appearance || !pages || !banners || !images || !gallery || !copy) return false;
  if (!['aurora','stars','minimal','nebula'].includes(appearance.style) || typeof appearance.enabled !== 'boolean'
    || !Number.isInteger(appearance.intensity) || appearance.intensity < 0 || appearance.intensity > 100
    || (appearance.headlineMotion !== undefined && !['cinematic','float','glow'].includes(appearance.headlineMotion))
    || (appearance.tempo !== undefined && !['gentle','normal','energetic'].includes(appearance.tempo))) return false;
  for (const [key, max] of Object.entries({title:60,tagline:130,logo:160,email:180,facebook:400,telegram:400,instagram:400,announcement:180})) {
    if (!safeString(brand[key] || '',max)) return false;
  }
  if (brand.logo && !validImagePath(brand.logo)) return false;
  if (brand.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brand.email)) return false;
  for (const field of ['facebook','telegram','instagram']) {
    if (brand[field] && !/^https:\/\/[a-zA-Z0-9.-]+\/.*/.test(brand[field])) return false;
  }
  const keys=['home','about','news','activities','achievements','gallery','contact'];
  for (const group of [pages,banners,images,gallery,copy]) if (typeof group !== 'object' || Array.isArray(group)) return false;
  for (const [key,val] of Object.entries(pages)) {
    if (!keys.includes(key) || !val || typeof val !== 'object') return false;
    for (const prop of ['title','highlight','description']) if (!safeString(val[prop] || '',prop==='description'?900:180)) return false;
  }
  for (const [key,arr] of Object.entries(banners)) {
    if (!keys.includes(key) || !Array.isArray(arr) || arr.length>9 || !arr.every(validImagePath)) return false;
  }
  for (const [key,items] of Object.entries(images)) {
    if (!keys.includes(key) || !items || typeof items !== 'object' || Array.isArray(items) || Object.keys(items).length>100) return false;
    if (!Object.entries(items).every(([i,v])=>/^\d{1,3}$/.test(i) && validImagePath(v))) return false;
  }
  for (const [key,items] of Object.entries(gallery)) {
    if (!keys.includes(key) || !items || typeof items !== 'object' || Array.isArray(items) || Object.keys(items).length>80) return false;
    if (!Object.entries(items).every(([i,v])=>/^\d{1,3}$/.test(i) && validImagePath(v))) return false;
  }
  // Gallery extensions live alongside the nine original tiles. Existing installs
  // do not need a database migration: galleryItems is optional until first save.
  if (data.galleryItems !== undefined) {
    if (!Array.isArray(data.galleryItems) || data.galleryItems.length > 120) return false;
    const ids = new Set();
    for (const entry of data.galleryItems) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
      if (Object.keys(entry).some(k => !['id','src','title','category'].includes(k))) return false;
      if (!safeString(entry.id,40) || !/^[a-zA-Z0-9_-]{6,40}$/.test(entry.id) || ids.has(entry.id)) return false;
      ids.add(entry.id);
      if (!validImagePath(entry.src) || !safeString(entry.title,100) || !entry.title.trim()) return false;
      if (!['community','instruments','rhythm'].includes(entry.category)) return false;
    }
  }
  for (const [key,items] of Object.entries(copy)) {
    if (!keys.includes(key) || !items || typeof items !== 'object' || Array.isArray(items) || Object.keys(items).length>200) return false;
    if (!Object.entries(items).every(([i,v])=>/^\d{1,3}$/.test(i) && safeString(v,1200))) return false;
  }
  return JSON.stringify(data).length < 120000;
}


let setupCode = db.prepare('SELECT COUNT(*) AS count FROM admins').get().count === 0
  ? crypto.randomBytes(24).toString('base64url')
  : null;
if (setupCode) {
  console.log('\nPNC Music Club first-time admin setup');
  console.log('Open http://localhost:' + PORT + '/admin.html and enter this one-time setup code:');
  console.log(setupCode + '\n');
  console.log('Keep this terminal private. The code is valid only until the first admin is created.\n');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm'
};

function json(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders
  });
  res.end(body);
}

function fail(res, status, message) { json(res, status, { error: message }); }

function readJson(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (_) { reject(Object.assign(new Error('Please send valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (_) { return false; }
}

function hitRateLimit(req, name, limit, windowMs) {
  const ip = req.socket.remoteAddress || 'unknown';
  const key = name + ':' + ip;
  const now = Date.now();
  const row = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - row.start > windowMs) { row.start = now; row.count = 0; }
  row.count += 1;
  rateBuckets.set(key, row);
  return row.count > limit;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function tokenMatches(candidate, expected) {
  const left = Buffer.from(String(candidate || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)pnc_club_session=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const session = sessions.get(match[1]);
  if (!session || session.expires < Date.now()) { sessions.delete(match[1]); return null; }
  return session;
}

function requireAdmin(req, res) {
  if (!sameOrigin(req)) { fail(res, 403, 'This request did not come from the club website.'); return null; }
  const session = getSession(req);
  if (!session) { fail(res, 401, 'Please sign in to the club management area.'); return null; }
  return session;
}

function teamValue() {
  const row = db.prepare('SELECT value FROM app_data WHERE key=?').get('team');
  try { return JSON.parse(row?.value || '{"generations":[]}'); }
  catch (_) { return { generations: [] }; }
}

function validTeam(team) {
  if (!team || !Array.isArray(team.generations) || team.generations.length > 30) return false;
  let totalPeople = 0;
  for (const generation of team.generations) {
    if (!generation || typeof generation.id !== 'string' || typeof generation.label !== 'string' || !Array.isArray(generation.people)) return false;
    if (generation.label.length > 80 || String(generation.description || '').length > 500) return false;
    totalPeople += generation.people.length;
    for (const person of generation.people) {
      if (!person || typeof person.id !== 'string' || String(person.name || '').length > 100) return false;
      if (String(person.role || '').length > 60 || String(person.focus || '').length > 160 || String(person.bio || '').length > 800) return false;
      if (String(person.photo || '').length > 6_000_000) return false;
      for (const key of ['facebook','telegram']) if (String(person[key] || '').length > 400) return false;
    }
  }
  return totalPeople <= 240 && JSON.stringify(team).length <= 7_500_000;
}

function formatReference(id) {
  return `PNC-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
}

async function handleApi(req, res, url) {
  const route = url.pathname;

  if (route === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'pnc-music-club' });
  if (route === '/api/team' && req.method === 'GET') return json(res, 200, teamValue());
  if (route === '/api/site' && req.method === 'GET') return json(res, 200, siteValue());

  if (route === '/api/messages' && req.method === 'POST') {
    if (!sameOrigin(req)) return fail(res, 403, 'Please send this message from the club website.');
    if (hitRateLimit(req, 'message', 8, 60 * 60 * 1000)) return fail(res, 429, 'Please wait a little before sending another message.');
    let body;
    try { body = await readJson(req, 24_000); } catch (error) { return fail(res, error.status || 400, error.message); }
    if (String(body.website || '').trim()) return json(res, 202, { ok: true });
    const name = String(body.name || '').trim().slice(0, 80);
    const email = String(body.email || '').trim().slice(0, 180);
    const subject = String(body.subject || (body.source === 'chat' ? 'Website chat message' : 'Website message')).trim().slice(0, 120);
    const text = String(body.body || '').trim();
    const source = body.source === 'chat' ? 'chat' : 'contact';
    if (name.length < 2) return fail(res, 400, 'Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Please enter a valid email address so the club can reply.');
    if (text.length < 5 || text.length > 2500) return fail(res, 400, 'Messages must be between 5 and 2,500 characters.');
    const createdAt = new Date().toISOString();
    const result = db.prepare('INSERT INTO messages (name,email,subject,body,source,created_at) VALUES (?,?,?,?,?,?)')
      .run(name, email, subject || 'Website message', text, source, createdAt);
    const id = Number(result.lastInsertRowid);
    return json(res, 201, { ok: true, reference: formatReference(id), message: 'Your message is in the club inbox.' });
  }

  if (route === '/api/admin/state' && req.method === 'GET') {
    const admin = getSession(req);
    return json(res, 200, { setupRequired: !db.prepare('SELECT 1 FROM admins LIMIT 1').get(), authenticated: Boolean(admin), email: admin?.email || '' });
  }

  if (route === '/api/admin/setup' && req.method === 'POST') {
    if (!sameOrigin(req)) return fail(res, 403, 'Please use the club website to finish setup.');
    if (!setupCode || db.prepare('SELECT 1 FROM admins LIMIT 1').get()) return fail(res, 409, 'Admin setup is already complete.');
    if (hitRateLimit(req, 'setup', 8, 15 * 60 * 1000)) return fail(res, 429, 'Too many attempts. Restart the server and use the new setup code.');
    let body;
    try { body = await readJson(req, 10_000); } catch (error) { return fail(res, error.status || 400, error.message); }
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!tokenMatches(body.code, setupCode)) return fail(res, 401, 'The one-time setup code is incorrect.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Enter a valid admin email address.');
    if (password.length < 12) return fail(res, 400, 'Choose a password with at least 12 characters.');
    db.prepare('INSERT INTO admins (email,password_hash,created_at) VALUES (?,?,?)').run(email, hashPassword(password), new Date().toISOString());
    setupCode = null;
    return createSession(req, res, email);
  }

  if (route === '/api/admin/login' && req.method === 'POST') {
    if (!sameOrigin(req)) return fail(res, 403, 'Please sign in from the club website.');
    if (hitRateLimit(req, 'login', 10, 15 * 60 * 1000)) return fail(res, 429, 'Too many sign-in attempts. Wait 15 minutes and try again.');
    let body;
    try { body = await readJson(req, 10_000); } catch (error) { return fail(res, error.status || 400, error.message); }
    const email = String(body.email || '').trim().toLowerCase();
    const admin = db.prepare('SELECT email,password_hash FROM admins WHERE email=?').get(email);
    if (!admin || !verifyPassword(String(body.password || ''), admin.password_hash)) return fail(res, 401, 'Email or password is incorrect.');
    return createSession(req, res, admin.email);
  }

  if (route === '/api/admin/logout' && req.method === 'POST') {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/(?:^|;\s*)pnc_club_session=([A-Za-z0-9_-]+)/);
    if (match) sessions.delete(match[1]);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'pnc_club_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }

  if (route === '/api/admin/messages' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    const status = url.searchParams.get('status') || 'all';
    const rows = status === 'all'
      ? db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500').all()
      : db.prepare('SELECT * FROM messages WHERE status=? ORDER BY created_at DESC LIMIT 500').all(status);
    return json(res, 200, { messages: rows.map(row => ({ ...row, reference: formatReference(row.id) })) });
  }

  const messageMatch = route.match(/^\/api\/admin\/messages\/(\d+)$/);
  if (messageMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJson(req, 10_000); } catch (error) { return fail(res, error.status || 400, error.message); }
    const statuses = ['new','read','replied','archived'];
    const status = statuses.includes(body.status) ? body.status : null;
    if (!status) return fail(res, 400, 'Choose a valid message status.');
    const note = String(body.internal_note || '').slice(0, 1800);
    const result = db.prepare('UPDATE messages SET status=?,internal_note=? WHERE id=?').run(status, note, Number(messageMatch[1]));
    if (!result.changes) return fail(res, 404, 'Message not found.');
    return json(res, 200, { ok: true });
  }

  if (messageMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const result = db.prepare('DELETE FROM messages WHERE id=?').run(Number(messageMatch[1]));
    if (!result.changes) return fail(res, 404, 'Message not found.');
    return json(res, 200, { ok: true });
  }

  // One authenticated editor controls all public pages, uploaded images and backgrounds.
  if (route === '/api/admin/site' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    return json(res, 200, siteValue());
  }
  if (route === '/api/admin/site' && req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body=await readJson(req,150000); } catch (error) { return fail(res,error.status||400,error.message); }
    if (!validSite(body)) return fail(res,400,'Website content is invalid. Check image paths, fields and limits.');
    db.prepare('UPDATE app_data SET value=?,updated_at=? WHERE key=?').run(JSON.stringify(body),new Date().toISOString(),'site');
    return json(res,200,{ok:true,updatedAt:new Date().toISOString()});
  }
  // Stream animated GIF and video backgrounds without loading a large base64 request into RAM.
  if (route === '/api/admin/upload-background' && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    if (hitRateLimit(req, 'background-upload', 35, 60 * 60 * 1000)) return fail(res, 429, 'Too many uploads. Please try again later.');
    const type = String(req.headers['content-type'] || '').toLowerCase().split(';')[0].trim();
    const formats = {
      'image/png': ['png', 8_000_000],
      'image/jpeg': ['jpg', 8_000_000],
      'image/webp': ['webp', 8_000_000],
      'image/gif': ['gif', 15_000_000],
      'video/mp4': ['mp4', 40_000_000],
      'video/webm': ['webm', 40_000_000]
    };
    if (!Object.hasOwn(formats, type)) return fail(res, 415, 'Choose a PNG, JPG, WebP, GIF, MP4 or WebM file.');
    const [ext, limit] = formats[type];
    const announced = Number(req.headers['content-length'] || 0);
    if (announced > limit) return fail(res, 413, `This file exceeds the ${Math.round(limit / 1_000_000)} MB upload limit.`);
    const filename = crypto.randomBytes(16).toString('hex') + '.' + ext;
    const destination = path.join(UPLOAD_DIR, filename);
    const temp = destination + '.part';
    let length = 0;
    let prefix = Buffer.alloc(0);
    let tooLarge = false;
    let complete = false;
    const stream = fs.createWriteStream(temp, { flags: 'wx', mode: 0o644 });
    try {
      await new Promise((resolve, reject) => {
        req.on('data', chunk => {
          length += chunk.length;
          if (prefix.length < 32) prefix = Buffer.concat([prefix, chunk.subarray(0, 32 - prefix.length)]);
          if (length > limit) {
            tooLarge = true;
            req.pause();
            stream.destroy(new Error('File is too large.'));
            return;
          }
          if (!stream.write(chunk)) req.pause();
        });
        stream.on('drain', () => req.resume());
        req.on('end', () => { complete = true; stream.end(); });
        req.on('aborted', () => reject(new Error('Upload was interrupted.')));
        req.on('error', reject);
        stream.on('error', reject);
        stream.on('finish', resolve);
      });
      if (tooLarge || !complete || length === 0) return fail(res, tooLarge ? 413 : 400, 'The upload was incomplete or too large.');
      const hex = prefix.toString('hex');
      const ascii = (start, end) => prefix.toString('ascii', start, end);
      const signatureValid = {
        'image/png': hex.startsWith('89504e470d0a1a0a'),
        'image/jpeg': hex.startsWith('ffd8ff'),
        'image/webp': ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP',
        'image/gif': ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a',
        'video/mp4': ascii(4, 8) === 'ftyp',
        'video/webm': hex.startsWith('1a45dfa3')
      }[type];
      if (!signatureValid) return fail(res, 415, 'The file content does not match the selected format.');
      fs.renameSync(temp, destination);
      return json(res, 201, { ok: true, url: '/assets/uploads/' + filename, bytes: length, type });
    } catch (error) {
      console.error('Background upload failed:', error.message);
      if (!res.headersSent) return fail(res, tooLarge ? 413 : 400, tooLarge ? 'File is too large.' : 'Could not save this media file.');
    } finally {
      try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch (_) {}
    }
  }

  if (route === '/api/admin/upload' && req.method === 'POST') {
    if (!requireAdmin(req,res)) return;
    if (hitRateLimit(req,'upload',100,60*60*1000)) return fail(res,429,'Upload limit reached.');
    let body;
    try { body=await readJson(req,7_200_000); } catch (error) { return fail(res,error.status||400,error.message); }
    const match = typeof body.dataUrl === 'string' && body.dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return fail(res,400,'Upload a PNG, JPEG or WebP image.');
    const content=Buffer.from(match[2],'base64');
    if (!content.length || content.length>5_000_000) return fail(res,413,'Images must be smaller than 5 MB.');
    const fmt=match[1];
    const matches={
      png:content.length>8&&content.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),
      jpeg:content.length>3&&content[0]===255&&content[1]===216&&content[2]===255,
      webp:content.length>12&&content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP'
    };
    if (!matches[fmt]) return fail(res,415,'This file does not match its image format.');
    const filename=crypto.randomBytes(16).toString('hex')+'.'+(fmt==='jpeg'?'jpg':fmt);
    fs.writeFileSync(path.join(UPLOAD_DIR,filename),content,{flag:'wx',mode:0o644});
    return json(res,201,{ok:true,url:'/assets/uploads/'+filename});
  }

  if (route === '/api/admin/team' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    return json(res, 200, teamValue());
  }

  if (route === '/api/admin/team' && req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    let body;
    try { body = await readJson(req); } catch (error) { return fail(res, error.status || 400, error.message); }
    const active = body && Array.isArray(body.generations) && body.generations.find(gen => gen.id === 'current');
    if (active && (!Array.isArray(active.people) || active.people.length !== 6
      || active.people.filter(person => person.role === 'Club Leader').length !== 1)) {
      return fail(res, 400, 'The current generation must have exactly 1 club leader and 5 members. You can manage other generations separately.');
    }
    if (!validTeam(body)) return fail(res, 400, 'The team data has invalid fields or is too large. Review names, links, photos and generation entries.');
    db.prepare('UPDATE app_data SET value=?,updated_at=? WHERE key=?').run(JSON.stringify(body), new Date().toISOString(), 'team');
    return json(res, 200, { ok: true, updatedAt: new Date().toISOString() });
  }

  return fail(res, 404, 'API route not found.');
}

function createSession(req, res, email) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_MAX_AGE;
  sessions.set(token, { email, expires });
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const cookie = `pnc_club_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE / 1000}${secure ? '; Secure' : ''}`;
  return json(res, 200, { ok: true, email }, { 'Set-Cookie': cookie });
}

// SEO: use SITE_URL in production or configure-seo.mjs; otherwise use the request's public host.
const seoPageRoutes = [
  '/', '/pages/about.html', '/pages/news.html', '/pages/activities.html',
  '/pages/achievements.html', '/pages/gallery.html', '/pages/contact.html'
];
function siteOriginForRequest(req) {
  const envOrigin = process.env.SITE_URL;
  let savedOrigin = '';
  try { savedOrigin = JSON.parse(fs.readFileSync(path.join(SITE_DIR,'.seo-config.json'),'utf8')).siteUrl || ''; }
  catch (_) {}
  if (envOrigin || savedOrigin) {
    try {
      const parsed = new URL(envOrigin || savedOrigin);
      if (['http:','https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.origin;
    } catch (_) {}
  }
  const incoming = String(req.headers.host || 'localhost:'+PORT);
  const host = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(incoming) ? incoming : 'localhost:'+PORT;
  const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${proto}://${host}`;
}
function escXmlSeo(value) { return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escHtmlSeo(value) { return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function socialMetaForPage(origin, route, html) {
  const canonical = origin + route;
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'PNC Music Club').replace(/&amp;/g,'&');
  const description = html.match(/<meta\s+content="([^"]+)"\s+name="description"/i)?.[1] || '';
  const image = origin + '/assets/img/team-1.webp';
  const parts = [
    `<link rel="canonical" href="${escHtmlSeo(canonical)}"/>`,
    '<meta property="og:type" content="website"/>',
    '<meta property="og:site_name" content="PNC Music Club"/>',
    `<meta property="og:title" content="${escHtmlSeo(title)}"/>`,
    `<meta property="og:description" content="${escHtmlSeo(description)}"/>`,
    `<meta property="og:url" content="${escHtmlSeo(canonical)}"/>`,
    `<meta property="og:image" content="${escHtmlSeo(image)}"/>`,
    '<meta property="og:image:alt" content="PNC Music Club student team"/>',
    '<meta name="twitter:card" content="summary_large_image"/>'
  ];
  if (route === '/') {
    const website = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite',name:'PNC Music Club',url:origin+'/',description,inLanguage:'en'}).replace(/</g,'\\u003c');
    parts.push(`<script type="application/ld+json">${website}</script>`);
  }
  const marker = /<!-- PNC_SEO_START -->[\s\S]*?<!-- PNC_SEO_END -->/;
  return html.replace(marker,`<!-- PNC_SEO_START -->\n${parts.join('\n')}\n<!-- PNC_SEO_END -->`);
}
function sendSeoResource(req,res,content,type) {
  const body=Buffer.from(content,'utf8');
  res.writeHead(200,{'Content-Type':type,'Content-Length':body.length,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'This method is not available for site files.');
    // Generated for the live domain so users can host on their own domain without placeholder URLs.
    if (url.pathname === '/sitemap.xml') {
      const origin=siteOriginForRequest(req);
      const body=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...seoPageRoutes.map(route=>`  <url><loc>${escXmlSeo(origin+route)}</loc></url>`),'</urlset>',''].join('\n');
      return sendSeoResource(req,res,body,'application/xml; charset=utf-8');
    }
    if (url.pathname === '/robots.txt') {
      const origin=siteOriginForRequest(req);
      const body=`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /.private-data/\n\nSitemap: ${origin}/sitemap.xml\n`;
      return sendSeoResource(req,res,body,'text/plain; charset=utf-8');
    }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch (_) { return fail(res, 400, 'Invalid path.'); }
    if (pathname === '/') pathname = '/index.html';
    if (pathname.split('/').some(part => part.startsWith('.'))) return fail(res, 404, 'Page not found.');
    if (['/server.js','/package.json','/README.md','/.gitignore'].includes(pathname)) return fail(res, 404, 'Page not found.');
    const filePath = path.resolve(SITE_DIR, '.' + pathname);
    if (!filePath.startsWith(SITE_DIR + path.sep)) return fail(res, 404, 'Page not found.');
    let stat;
    try { stat = fs.statSync(filePath); } catch (_) { return fail(res, 404, 'Page not found.'); }
    if (!stat.isFile()) return fail(res, 404, 'Page not found.');
    // Stream videos and honor byte ranges so MP4/WebM backgrounds start quickly and can seek.
    if (pathname.startsWith('/assets/uploads/') && /\.(mp4|webm)$/i.test(pathname)) {
      const type = mimeTypes[path.extname(filePath).toLowerCase()];
      const range = req.headers.range;
      let start = 0, end = stat.size - 1, status = 200;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(range));
        if (!match || (!match[1] && !match[2])) {
          res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });return res.end();
        }
        if (!match[1]) {
          const suffix = Number(match[2]);
          if (!Number.isSafeInteger(suffix) || suffix <= 0) {res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });return res.end();}
          start = Math.max(0, stat.size - suffix);
        } else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(stat.size - 1, Number(match[2]));
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
          res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });return res.end();
        }
        status = 206;
      }
      const headers = {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        ...(status === 206 ? {'Content-Range': `bytes ${start}-${end}/${stat.size}`} : {})
      };
      res.writeHead(status, headers);
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(filePath, {start, end});
      stream.on('error', e => { console.error('Video stream error:',e.message);res.destroy(); });
      return stream.pipe(res);
    }
    let data = fs.readFileSync(filePath);
    // Canonical, Open Graph and website schema are rendered into public HTML, not the admin page.
    const seoRoute = pathname === '/index.html' ? '/' : pathname;
    if (seoPageRoutes.includes(seoRoute) && path.extname(filePath).toLowerCase() === '.html') {
      data=Buffer.from(socialMetaForPage(siteOriginForRequest(req),seoRoute,data.toString('utf8')),'utf8');
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      ...(pathname === '/admin.html' ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } : {}),
      'Content-Length': data.length,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    console.error(error);
    return fail(res, error.status || 500, error.status ? error.message : 'Something went wrong. Please try again.');
  }
}

const server = http.createServer((req, res) => { void handler(req, res); });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PNC Music Club website is running at http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => { try { db.close(); } catch (_) {} process.exit(0); });
  setTimeout(() => process.exit(1), 2500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
