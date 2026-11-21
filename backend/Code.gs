/**
 * Rusça Ekran – üyelik, lig, seviye ve haftalık hedef sunucusu (Google Apps Script)
 * Dağıtım: Dağıt › Dağıtımları yönet › ✏️ › Yeni sürüm › Dağıt  (URL aynı kalır)
 *
 * Şifreler düz metin olarak SAKLANMAZ: her kullanıcıya rastgele tuz + SHA-256 (2000 tur).
 */

const USERS = 'Üyeler';
const SCORES = 'Skorlar';
const PROFILE = 'Profil';
const TOKEN_DAYS = 60;
const TZ = 'Europe/Moscow';
const SEEN_MAX = 4000;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

// Haftalık hedefler (her pazartesi sıfırlanır). Tamamlanınca bonus puan + rozet.
const GOALS = [
  { id: 'g50', icon: '🎯', title: 'Bu hafta 50 sahne cevapla', type: 'n', target: 50, bonus: 50 },
  { id: 'gdays', icon: '📅', title: '5 farklı gün oyna', type: 'days', target: 5, bonus: 75 },
  { id: 'gacc', icon: '👂', title: 'En az 30 sahnede %80 doğruluk', type: 'acc', target: 80, min: 30, bonus: 75 },
  { id: 'gstreak', icon: '🔥', title: '10 doğruluk seri yakala', type: 'streak', target: 10, bonus: 50 },
];
// Kalıcı rozetler (bir kez kazanılır)
const MILESTONES = [
  { id: 'm1', icon: '🌱', title: 'İlk tur', test: (p) => p.allN >= 1 },
  { id: 'm100', icon: '💯', title: '100 sahne', test: (p) => p.allN >= 100 },
  { id: 'm500', icon: '🏅', title: '500 sahne', test: (p) => p.allN >= 500 },
  { id: 'm1000', icon: '🏆', title: '1000 sahne', test: (p) => p.allN >= 1000 },
  { id: 'mtest', icon: '🧭', title: 'Seviye sınavını bitirdi', test: (p) => !!p.placed },
];

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
      case 'profile': return out(profile(req));
      case 'setLevel': return out(setLevel(req));
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
const profileSheet = () => sheet(PROFILE, ['anahtar', 'seviye', 'sınav', 'görülen sahneler', 'hafta', 'hafta istatistiği', 'rozetler']);

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
  const now = d || new Date();
  const day = Number(Utilities.formatDate(now, TZ, 'u')); // 1=Pzt
  return Utilities.formatDate(new Date(now.getTime() - (day - 1) * 86400000), TZ, 'yyyy-MM-dd');
}
const today = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
function toWk(x) { return x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd') : String(x || ''); }
function validName(u) { return typeof u === 'string' && /^[\p{L}\p{N}_.-]{3,20}$/u.test(u); }
function parse(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }
function newToken(sh, row) {
  const t = Utilities.getUuid() + Utilities.getUuid();
  sh.getRange(row, 6, 1, 2).setValues([[t, new Date(Date.now() + TOKEN_DAYS * 86400000)]]);
  return t;
}
function userByToken(token) {
  if (!token) return null;
  const vals = usersSheet().getDataRange().getValues();
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

/* ---------- profil (seviye, görülen, hafta, rozet) ---------- */
function loadProfile(key) {
  const sh = profileSheet(); let f = findRow(sh, key);
  if (!f) { sh.appendRow([key, '', '', '[]', weekKey(), '{}', '[]']); f = findRow(sh, key); }
  const v = f.v; const wk = weekKey();
  let ws = parse(v[5], {});
  if (toWk(v[4]) !== wk) ws = {};
  ws = Object.assign({ n: 0, right: 0, days: [], streak: 0, done: [] }, ws);
  return { sh, row: f.row, level: String(v[1] || ''), placed: v[2] ? toWk(v[2]) : '', seen: parse(v[3], []), ws, badges: parse(v[6], []) };
}
function saveProfile(p) {
  p.sh.getRange(p.row, 2, 1, 6).setValues([[p.level, p.placed, JSON.stringify(p.seen.slice(-SEEN_MAX)), weekKey(), JSON.stringify(p.ws), JSON.stringify(p.badges)]]);
}
function goalProgress(ws) {
  return GOALS.map((g) => {
    let cur = 0;
    if (g.type === 'n') cur = ws.n;
    if (g.type === 'days') cur = ws.days.length;
    if (g.type === 'streak') cur = ws.streak;
    if (g.type === 'acc') cur = ws.n ? Math.round(ws.right / ws.n * 100) : 0;
    const done = ws.done.indexOf(g.id) >= 0;
    let pct = Math.min(1, cur / g.target);
    if (g.type === 'acc') pct = ws.n < g.min ? 0.8 * ws.n / g.min : Math.min(1, cur / g.target);
    return { id: g.id, icon: g.icon, title: g.title, cur, target: g.target, min: g.min || 0, n: ws.n, bonus: g.bonus, done, pct: done ? 1 : pct };
  });
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
    loadProfile(key);
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
  let gained = Math.max(0, Math.min(right * 30, Math.floor(Number(r.points) || 0)));
  const best = Math.max(0, Math.min(total, Math.floor(Number(r.best) || 0)));
  const seenNew = (Array.isArray(r.seen) ? r.seen : []).slice(0, 20).map(String).filter((s) => s.length < 40);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const p = loadProfile(me.key);
    p.ws.n += total; p.ws.right += right; p.ws.streak = Math.max(p.ws.streak, best);
    if (total && p.ws.days.indexOf(today()) < 0) p.ws.days.push(today());
    const set = {}; p.seen.forEach((s) => { set[s] = 1; });
    seenNew.forEach((s) => { if (!set[s]) { p.seen.push(s); set[s] = 1; } });
    const newGoals = [];
    goalProgress(p.ws).forEach((g) => {
      if (g.done) return;
      const G = GOALS.find((x) => x.id === g.id);
      const ok = G.type === 'acc' ? (p.ws.n >= G.min && g.cur >= G.target) : g.cur >= G.target;
      if (ok) {
        p.ws.done.push(G.id); gained += G.bonus;
        newGoals.push({ id: G.id, icon: G.icon, title: G.title, bonus: G.bonus });
        p.badges.push({ id: G.id, icon: G.icon, title: G.title, week: weekKey() });
      }
    });
    const sh = scoresSheet(); let f = findRow(sh, me.key);
    if (!f) { sh.appendRow([me.key, me.name, 0, weekKey(), 0, 0, 0, 0, '']); f = findRow(sh, me.key); }
    const v = f.v; const wk = weekKey();
    const weekPts = toWk(v[3]) === wk ? Number(v[4]) + gained : gained;
    const allN = Number(v[6]) + total;
    sh.getRange(f.row, 3, 1, 7).setValues([[Number(v[2]) + gained, wk, weekPts, Number(v[5]) + right, allN, Math.max(Number(v[7]), best), new Date()]]);
    const have = {}; p.badges.forEach((b) => { have[b.id] = 1; });
    const newBadges = [];
    MILESTONES.forEach((m) => {
      if (!have[m.id] && m.test({ allN, placed: p.placed })) { const b = { id: m.id, icon: m.icon, title: m.title, week: wk }; p.badges.push(b); newBadges.push(b); }
    });
    saveProfile(p);
    return { ok: true, week: weekPts, totalPts: Number(v[2]) + gained, newGoals, newBadges };
  } finally { lock.releaseLock(); }
}

function rows() {
  const wk = weekKey();
  return scoresSheet().getDataRange().getValues().slice(1).filter((v) => v[0]).map((v) => ({
    key: v[0], name: v[1], total: Number(v[2]) || 0, week: toWk(v[3]) === wk ? (Number(v[4]) || 0) : 0,
    acc: Number(v[6]) ? Math.round(Number(v[5]) / Number(v[6]) * 100) : 0, best: Number(v[7]) || 0, played: Number(v[6]) || 0,
  }));
}
function levelsMap() {
  const m = {};
  profileSheet().getDataRange().getValues().slice(1).forEach((v) => { if (v[0]) m[v[0]] = String(v[1] || ''); });
  return m;
}

function board(r) {
  const me = userByToken(r.token); const all = rows(); const lv = levelsMap();
  const strip = (x) => ({ name: x.name, total: x.total, week: x.week, acc: x.acc, best: x.best, played: x.played, level: lv[x.key] || '', me: !!(me && me.key === x.key) });
  const weekly = all.slice().sort((a, b) => b.week - a.week || b.total - a.total).map(strip);
  const alltime = all.slice().sort((a, b) => b.total - a.total).map(strip);
  return { ok: true, weekStart: weekKey(), weekly: weekly.slice(0, 100), alltime: alltime.slice(0, 100), members: all.length, me: me ? me.name : null };
}

function me(r) {
  const u = userByToken(r.token); if (!u) return { ok: false, auth: false };
  const x = rows().find((v) => v.key === u.key) || { total: 0, week: 0, acc: 0, best: 0, played: 0 };
  return { ok: true, username: u.name, total: x.total, week: x.week, acc: x.acc, best: x.best, played: x.played };
}

function profile(r) {
  const u = userByToken(r.token); if (!u) return { ok: false, auth: false, error: 'Giriş yapmalısın.' };
  const all = rows(); const x = all.find((v) => v.key === u.key) || { total: 0, week: 0, acc: 0, best: 0, played: 0 };
  const sorted = all.slice().sort((a, b) => b.week - a.week || b.total - a.total);
  const rank = sorted.findIndex((v) => v.key === u.key) + 1;
  const above = rank > 1 ? sorted[rank - 2] : null;
  const p = loadProfile(u.key);
  return {
    ok: true, username: u.name, level: p.level, placed: p.placed, seen: p.seen, weekStart: weekKey(),
    week: x.week, total: x.total, acc: x.acc, best: x.best, played: x.played,
    rank, members: all.length, gapToAbove: above ? Math.max(0, above.week - x.week + 1) : 0, aboveName: above ? above.name : '',
    weekStats: { n: p.ws.n, right: p.ws.right, days: p.ws.days.length, streak: p.ws.streak },
    goals: goalProgress(p.ws), badges: p.badges, milestones: MILESTONES.map((m) => ({ id: m.id, icon: m.icon, title: m.title })),
  };
}

function setLevel(r) {
  const u = userByToken(r.token); if (!u) return { ok: false, auth: false };
  const lv = String(r.level || ''); if (LEVELS.indexOf(lv) < 0) return { ok: false, error: 'Geçersiz seviye' };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const p = loadProfile(u.key); p.level = lv;
    let newBadges = [];
    if (r.placement) {
      p.placed = today();
      if (!p.badges.some((b) => b.id === 'mtest')) { const b = { id: 'mtest', icon: '🧭', title: 'Seviye sınavını bitirdi', week: weekKey() }; p.badges.push(b); newBadges = [b]; }
    }
    saveProfile(p);
    return { ok: true, level: lv, newBadges };
  } finally { lock.releaseLock(); }
}

/** Elle bir kez çalıştırılabilir: sayfaları oluşturur. */
function kurulum() { usersSheet(); scoresSheet(); profileSheet(); }
