/**
 * Rusça Ekran – üyelik ve lig sunucusu (Google Apps Script)
 * Bu kod "Rusça Ekran – Üyeler ve Skorlar" tablosuna bağlıdır.
 * Dağıtım: Dağıt › Yeni dağıtım › Web uygulaması · Yürüten: Ben · Erişim: Herkes
 *
 * Şifreler düz metin olarak SAKLANMAZ: her kullanıcıya rastgele tuz + SHA-256 (2000 tur).
 */

const USERS = 'Üyeler';
const SCORES = 'Skorlar';
const TOKEN_DAYS = 60;
const TZ = 'Europe/Moscow';

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: 'Geçersiz istek' }); }
  try {
    switch (req.action) {
      case 'register': return out(register(req));
      case 'login': return out(login(req));
      case 'submit': return out(submit(req));
      case 'board': return out(board(req));
      case 'me': return out(me(req));
      default: return out({ ok: false, error: 'Bilinmeyen işlem' });
    }
  } catch (err) {
    return out({ ok: false, error: 'Sunucu hatası' });
  }
}

function doGet() { return out({ ok: true, app: 'rusca-ekran', time: new Date().toISOString() }); }

/* ---------- yardımcılar ---------- */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}
const usersSheet = () => sheet(USERS, ['anahtar', 'kullanıcı adı', 'tuz', 'şifre özeti', 'kayıt', 'oturum', 'oturum bitiş']);
const scoresSheet = () => sheet(SCORES, ['anahtar', 'kullanıcı adı', 'toplam puan', 'hafta', 'haftalık puan', 'doğru', 'toplam soru', 'en iyi seri', 'son oyun']);

function hash(salt, pw) {
  let h = salt + '|' + pw;
  for (let i = 0; i < 2000; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}
function findRow(sh, key) {
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) if (vals[i][0] === key) return { row: i + 1, v: vals[i] };
  return null;
}
function weekKey(d) {
  // Moskova saatine göre haftanın pazartesisi (yyyy-MM-dd)
  const day = Number(Utilities.formatDate(d || new Date(), TZ, 'u')); // 1=Pzt
  const mon = new Date((d || new Date()).getTime() - (day - 1) * 86400000);
  return Utilities.formatDate(mon, TZ, 'yyyy-MM-dd');
}
function toWk(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, 'yyyy-MM-dd');
  return String(x || '');
}
function validName(u) { return typeof u === 'string' && /^[\p{L}\p{N}_.-]{3,20}$/u.test(u); }
function newToken(sh, row) {
  const t = Utilities.getUuid() + Utilities.getUuid();
  sh.getRange(row, 6, 1, 2).setValues([[t, new Date(Date.now() + TOKEN_DAYS * 86400000)]]);
  return t;
}
function userByToken(token) {
  if (!token) return null;
  const sh = usersSheet(); const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][5] && vals[i][5] === token) {
      if (new Date(vals[i][6]) < new Date()) return null;
      return { key: vals[i][0], name: vals[i][1] };
    }
  }
  return null;
}
function tooMany(kind, id, limit, seconds) {
  const c = CacheService.getScriptCache(); const k = kind + ':' + id;
  const n = Number(c.get(k) || 0);
  if (n >= limit) return true;
  c.put(k, String(n + 1), seconds);
  return false;
}

/* ---------- işlemler ---------- */
function register(r) {
  const u = String(r.username || '').trim(), pw = String(r.password || '');
  if (!validName(u)) return { ok: false, error: 'Kullanıcı adı 3–20 karakter olmalı (harf, rakam, _ . -).' };
  if (pw.length < 6) return { ok: false, error: 'Şifre en az 6 karakter olmalı.' };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = usersSheet(); const key = u.toLowerCase();
    if (findRow(sh, key)) return { ok: false, error: 'Bu kullanıcı adı alınmış.' };
    const salt = Utilities.getUuid();
    sh.appendRow([key, u, salt, hash(salt, pw), new Date(), '', '']);
    const token = newToken(sh, sh.getLastRow());
    scoresSheet().appendRow([key, u, 0, weekKey(), 0, 0, 0, 0, '']);
    return { ok: true, token, username: u };
  } finally { lock.releaseLock(); }
}

function login(r) {
  const u = String(r.username || '').trim(), pw = String(r.password || '');
  const key = u.toLowerCase();
  if (tooMany('login', key, 8, 600)) return { ok: false, error: 'Çok fazla deneme. 10 dakika sonra tekrar dene.' };
  const sh = usersSheet(); const f = findRow(sh, key);
  if (!f || hash(f.v[2], pw) !== f.v[3]) return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { return { ok: true, token: newToken(sh, f.row), username: f.v[1] }; } finally { lock.releaseLock(); }
}

function submit(r) {
  const me = userByToken(r.token); if (!me) return { ok: false, error: 'Oturum süresi doldu, tekrar giriş yap.', auth: false };
  if (tooMany('submit', me.key, 1, 5)) return { ok: false, error: 'Çok sık gönderim.' };
  const total = Math.max(0, Math.min(20, Math.floor(Number(r.total) || 0)));
  const right = Math.max(0, Math.min(total, Math.floor(Number(r.right) || 0)));
  const gained = Math.max(0, Math.min(right * 30, Math.floor(Number(r.points) || 0)));
  const best = Math.max(0, Math.min(1000, Math.floor(Number(r.best) || 0)));
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = scoresSheet(); let f = findRow(sh, me.key);
    if (!f) { sh.appendRow([me.key, me.name, 0, weekKey(), 0, 0, 0, 0, '']); f = findRow(sh, me.key); }
    const v = f.v; const wk = weekKey();
    const weekPts = toWk(v[3]) === wk ? Number(v[4]) + gained : gained;
    sh.getRange(f.row, 3, 1, 7).setValues([[Number(v[2]) + gained, wk, weekPts, Number(v[5]) + right, Number(v[6]) + total, Math.max(Number(v[7]), best), new Date()]]);
    return { ok: true, week: weekPts, totalPts: Number(v[2]) + gained };
  } finally { lock.releaseLock(); }
}

function rows() {
  const wk = weekKey();
  return scoresSheet().getDataRange().getValues().slice(1).filter(v => v[0]).map(v => {
    const vw = toWk(v[3]);
    return { key: v[0], name: v[1], total: Number(v[2]) || 0, week: vw === wk ? (Number(v[4]) || 0) : 0,
      acc: Number(v[6]) ? Math.round(Number(v[5]) / Number(v[6]) * 100) : 0, best: Number(v[7]) || 0, played: Number(v[6]) || 0 };
  });
}

function board(r) {
  const me = userByToken(r.token); const all = rows();
  const strip = x => ({ name: x.name, total: x.total, week: x.week, acc: x.acc, best: x.best, played: x.played, me: !!(me && me.key === x.key) });
  const weekly = all.slice().sort((a, b) => b.week - a.week || b.total - a.total).map(strip);
  const alltime = all.slice().sort((a, b) => b.total - a.total).map(strip);
  return { ok: true, weekStart: weekKey(), weekly: weekly.slice(0, 100), alltime: alltime.slice(0, 100), members: all.length, me: me ? me.name : null };
}

function me(r) {
  const u = userByToken(r.token); if (!u) return { ok: false, auth: false };
  const x = rows().find(v => v.key === u.key) || { total: 0, week: 0, acc: 0, best: 0, played: 0 };
  return { ok: true, username: u.name, total: x.total, week: x.week, acc: x.acc, best: x.best, played: x.played };
}

/** Elle bir kez çalıştırılabilir: sayfaları oluşturur. */
function kurulum() { usersSheet(); scoresSheet(); }
