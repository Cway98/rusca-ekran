// Rusça Ekran – üyelik (kullanıcı adı + şifre), skor gönderme ve lig yardımcıları.
// Sunucu: Google Apps Script web uygulaması (backend/Code.gs).
(function () {
  const API = window.RE_API_URL || "";
  const KEY = "ruscaEkranAuth_v1";
  let S = {};
  try { S = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const LEAGUES = [
    { min: 1000, name: "Elmas", icon: "💎", col: "#7dd3fc" },
    { min: 500, name: "Altın", icon: "🥇", col: "#fbbf24" },
    { min: 200, name: "Gümüş", icon: "🥈", col: "#cbd5e1" },
    { min: 0, name: "Bronz", icon: "🥉", col: "#d97706" },
  ];
  const league = (pts) => LEAGUES.find((l) => pts >= l.min);

  async function call(action, data) {
    if (!API) return { ok: false, error: "Sunucu henüz bağlanmadı." };
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, data || {})) });
      const j = await r.json();
      if (j && j.auth === false) { S = {}; save(); render(); }
      return j;
    } catch (e) { return { ok: false, error: "Bağlantı kurulamadı. İnterneti kontrol et." }; }
  }

  /* ---------- stil + modal ---------- */
  const css = `
  .au-ov{position:fixed;inset:0;background:#000b;backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
  @media(min-width:600px){.au-ov{align-items:center}}
  .au-box{width:100%;max-width:440px;background:#13161e;border:1px solid #262b38;border-radius:22px 22px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));color:#f2f4f8;font-family:Inter,system-ui,sans-serif;animation:auUp .25s ease-out}
  @media(min-width:600px){.au-box{border-radius:22px}}
  @keyframes auUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
  .au-box h3{font-size:20px;margin:0 0 4px}.au-box p{color:#8b93a3;font-size:14px;margin:0 0 16px;line-height:1.45}
  .au-tabs{display:flex;background:#0b0d12;border-radius:12px;padding:4px;margin-bottom:14px}
  .au-tabs button{flex:1;padding:10px;border:0;border-radius:9px;background:none;color:#8b93a3;font:600 14px Inter,system-ui;cursor:pointer}
  .au-tabs button.on{background:#1a1e28;color:#fff}
  .au-box label{display:block;font-size:12px;color:#8b93a3;margin:10px 0 6px;font-weight:600}
  .au-box input{width:100%;box-sizing:border-box;background:#0b0d12;border:1px solid #262b38;border-radius:12px;padding:14px;color:#fff;font-size:16px;font-family:inherit;outline:none}
  .au-box input:focus{border-color:#ff4d3d}
  .au-warn{display:flex;gap:10px;background:#2a2010;border:1px solid #5c4413;color:#fcd38a;border-radius:12px;padding:12px;font-size:13px;line-height:1.45;margin-top:14px}
  .au-err{color:#f87171;font-size:13px;min-height:18px;margin-top:10px}
  .au-go{width:100%;margin-top:8px;padding:16px;border:0;border-radius:14px;background:linear-gradient(90deg,#ff4d3d,#ff7a45);color:#fff;font:800 16px Inter,system-ui;cursor:pointer}
  .au-go:disabled{opacity:.6}
  .au-x{float:right;background:none;border:0;color:#8b93a3;font-size:22px;cursor:pointer;margin:-6px -4px 0 0}
  .au-chip{display:inline-flex;align-items:center;gap:6px;background:#13161e;border:1px solid #262b38;border-radius:999px;padding:6px 11px;font:700 13px Inter,system-ui;color:#f2f4f8;cursor:pointer;text-decoration:none;white-space:nowrap}
  .au-me{display:flex;flex-direction:column;gap:8px}
  .au-row{display:flex;justify-content:space-between;background:#0b0d12;border:1px solid #262b38;border-radius:12px;padding:12px 14px;font-size:14px}
  .au-row b{font-weight:800}
  .au-link{display:block;text-align:center;margin-top:10px;padding:14px;border-radius:14px;background:#1a1e28;border:1px solid #262b38;color:#fff;text-decoration:none;font:700 15px Inter,system-ui}
  .au-out{width:100%;margin-top:8px;padding:12px;border:0;background:none;color:#8b93a3;font:600 14px Inter,system-ui;cursor:pointer}
  .au-ov.lock{z-index:1200;background:#07080cf2}
  .au-box textarea{width:100%;box-sizing:border-box;min-height:120px;resize:vertical;background:#0b0d12;border:1px solid #262b38;border-radius:12px;padding:12px 14px;color:#fff;font:15px/1.45 Inter,system-ui,sans-serif;outline:none}
  .au-box textarea:focus{border-color:#ff4d3d}
  .fb-types{display:flex;flex-wrap:wrap;gap:6px}
  .fb-types button{border:1px solid #262b38;background:#0b0d12;color:#c9cfdb;border-radius:999px;padding:8px 12px;font:600 13px Inter,system-ui;cursor:pointer}
  .fb-types button.on{border-color:#ff4d3d;background:#2a1210;color:#fff}
  .fb-stars{display:flex;gap:4px}.fb-stars button{background:none;border:0;font-size:28px;line-height:1;cursor:pointer;color:#3a4152;padding:2px}
  .fb-stars button.on{color:#fbbf24}
  .fb-ctx{background:#0b0d12;border:1px dashed #262b38;border-radius:10px;padding:8px 10px;font-size:12px;color:#8b93a3;margin-top:10px}
  .fb-cnt{text-align:right;font-size:11px;color:#5d6577;margin-top:4px}
  .fb-ok{text-align:center;padding:18px 0 6px}.fb-ok div{font-size:46px}
  .au-fb{display:block;width:100%;margin-top:8px;padding:13px;border-radius:14px;background:#0b0d12;border:1px solid #262b38;color:#f2f4f8;font:700 14px Inter,system-ui;cursor:pointer}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let ov = null;
  function close() { if (ov) { ov.remove(); ov = null; } }

  const LKEY = "ruscaEkranLastUser";
  const lastUser = () => { try { return localStorage.getItem(LKEY) || ""; } catch (e) { return ""; } };
  function openLogin(tab, locked) {
    if (!locked && REQUIRED && !S.token) locked = true;
    close(); tab = tab || (lastUser() ? "login" : "register");
    ov = document.createElement("div"); ov.className = "au-ov" + (locked ? " lock" : "");
    ov.innerHTML = `<div class="au-box">${locked ? "" : '<button class="au-x" aria-label="Kapat">×</button>'}
      ${locked ? `<h3>Rusça Ekran'a hoş geldin 👋</h3><p>Uygulamayı kullanmak için üye ol ya da giriş yap. Puanların, seviyen ve hangi sahneleri gördüğün hesabında saklanır.</p>`
        : `<h3>Rusça Ekran'a katıl</h3><p>Puanların kaydedilsin, haftalık ligde arkadaşlarınla yarış.</p>`}
      <div class="au-tabs"><button data-t="login">Giriş yap</button><button data-t="register">Üye ol</button></div>
      <form autocomplete="on">
        <label>Kullanıcı adı</label><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="ör. can_m">
        <label>Şifre</label><input name="password" type="password" autocomplete="current-password" placeholder="En az 6 karakter">
        <div class="au-reg"><label>Şifre (tekrar)</label><input name="password2" type="password" autocomplete="new-password">
          <div class="au-warn"><span>⚠️</span><span><b>Yeni bir şifre seç.</b> E-posta, banka, sosyal medya gibi başka hesaplarında kullandığın bir şifreyi burada <b>kullanma</b>. Bu küçük bir hobi uygulaması ve şifre sıfırlama özelliği yok, şifreni bir yere not et.</span></div></div>
        <div class="au-err"></div>
        <button class="au-go" type="submit">Giriş yap</button>
      </form></div>`;
    document.body.appendChild(ov);
    const f = ov.querySelector("form"), err = ov.querySelector(".au-err"), go = ov.querySelector(".au-go");
    const setTab = (t) => {
      tab = t; ov.querySelectorAll(".au-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
      ov.querySelector(".au-reg").style.display = t === "register" ? "" : "none";
      f.password.autocomplete = t === "register" ? "new-password" : "current-password";
      go.textContent = t === "register" ? "Üye ol" : "Giriş yap"; err.textContent = "";
    };
    ov.querySelectorAll(".au-tabs button").forEach((b) => (b.onclick = () => setTab(b.dataset.t)));
    setTab(tab);
    if (!locked) { ov.querySelector(".au-x").onclick = close; ov.onclick = (e) => { if (e.target === ov) close(); }; }
    if (lastUser()) f.username.value = lastUser();
    f.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = "";
      const username = f.username.value.trim(), password = f.password.value;
      if (!/^[\p{L}\p{N}_.-]{3,20}$/u.test(username)) { err.textContent = "Kullanıcı adı 3–20 karakter olmalı (harf, rakam, _ . -)."; return; }
      if (password.length < 6) { err.textContent = "Şifre en az 6 karakter olmalı."; return; }
      if (tab === "register" && password !== f.password2.value) { err.textContent = "Şifreler aynı değil."; return; }
      go.disabled = true; go.textContent = "Bekle…";
      const r = await call(tab, { username, password });
      go.disabled = false; setTab(tab);
      if (!r.ok) { err.textContent = r.error || "Bir sorun oluştu."; return; }
      S = { token: r.token, username: r.username }; save(); try { localStorage.setItem(LKEY, r.username); } catch (e) {} close(); render();
      document.dispatchEvent(new CustomEvent("auth-change"));
      flushPending();
    };
    setTimeout(() => (f.username.value ? f.password : f.username).focus(), 50);
  }
  // Üyelik zorunlu: oturum yoksa kapatılamayan giriş ekranı
  const REQUIRED = !!API;
  function gate() { if (REQUIRED && !S.token && !(ov && ov.classList.contains("lock"))) openLogin(null, true); }

  async function openMe() {
    close();
    ov = document.createElement("div"); ov.className = "au-ov";
    ov.innerHTML = `<div class="au-box"><button class="au-x">×</button><h3>👤 ${esc(S.username)}</h3><p>Yükleniyor…</p><div class="au-me"></div>
      <a class="au-link" href="lig.html">🏆 Lig tablosu</a><button class="au-fb">💬 Görüş & öneri gönder</button><button class="au-out">Çıkış yap</button></div>`;
    document.body.appendChild(ov);
    ov.querySelector(".au-x").onclick = close; ov.onclick = (e) => { if (e.target === ov) close(); };
    ov.querySelector(".au-fb").onclick = () => { close(); openFeedback(); };
    ov.querySelector(".au-out").onclick = () => { S = {}; save(); close(); render(); document.dispatchEvent(new CustomEvent("auth-change")); gate(); };
    const r = await call("me", { token: S.token });
    if (!ov) return;
    if (!r.ok) { ov.querySelector("p").textContent = r.error || "Bilgiler alınamadı."; return; }
    const lg = league(r.week);
    ov.querySelector("p").innerHTML = `Bu haftaki ligin: <b style="color:${lg.col}">${lg.icon} ${lg.name}</b>`;
    ov.querySelector(".au-me").innerHTML = [["Bu hafta", r.week + " puan"], ["Toplam", r.total + " puan"], ["Doğruluk", r.played ? r.acc + "%" : "–"], ["En iyi seri", "🔥 " + r.best], ["Cevaplanan", r.played + " sahne"]]
      .map(([a, b]) => `<div class="au-row"><span>${a}</span><b>${b}</b></div>`).join("");
  }

  /* ---------- görüş & öneri ---------- */
  const FB_TYPES = [["oneri", "💡 Öneri"], ["eksik", "➕ Eksik içerik"], ["hata", "🐞 Hata"], ["sahne", "🎬 Sahne sorunu"], ["diger", "💬 Diğer"]];
  let fov = null;
  function openFeedback(o) {
    o = o || {};
    if (!S.token) { gate(); return; }
    if (fov) fov.remove();
    let type = FB_TYPES.some((t) => t[0] === o.type) ? o.type : "oneri", rating = 0;
    fov = document.createElement("div"); fov.className = "au-ov";
    fov.innerHTML = `<div class="au-box"><button class="au-x" aria-label="Kapat">×</button>
      <h3>💬 Görüş & öneri</h3><p>Neyi eksik buldun, ne çalışmadı, ne eklensin? Her mesajı okuyup uygulamayı buna göre geliştiriyoruz.</p>
      <label>Konu</label><div class="fb-types">${FB_TYPES.map(([k, t]) => `<button type="button" data-k="${k}">${t}</button>`).join("")}</div>
      ${o.ctx ? `<div class="fb-ctx">Sahne: ${esc(o.ctx)}</div>` : ""}
      <label>Mesajın</label><textarea maxlength="1000" placeholder=""></textarea><div class="fb-cnt">0 / 1000</div>
      <label>Uygulamayı genel olarak nasıl buluyorsun? <span style="font-weight:500">(isteğe bağlı)</span></label>
      <div class="fb-stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} yıldız">★</button>`).join("")}</div>
      <div class="au-err"></div><button class="au-go">Gönder</button></div>`;
    document.body.appendChild(fov);
    const box = fov.querySelector(".au-box"), ta = fov.querySelector("textarea"), err = fov.querySelector(".au-err"), go = fov.querySelector(".au-go");
    const PH = { oneri: "ör. Sahnelerde kelime kelime çeviri de görmek isterim.", eksik: "ör. Daha çok iş hayatı / şantiye diyalogları olsun.", hata: "ör. Lig sayfası açılmıyor, iPhone Safari.", sahne: "ör. Çeviri yanlış ya da video cümleden önce duruyor.", diger: "Aklındaki her şeyi yazabilirsin." };
    const setType = (k) => { type = k; fov.querySelectorAll(".fb-types button").forEach((b) => b.classList.toggle("on", b.dataset.k === k)); ta.placeholder = PH[k]; };
    const setRating = (n) => { rating = rating === n ? 0 : n; fov.querySelectorAll(".fb-stars button").forEach((b) => b.classList.toggle("on", +b.dataset.n <= rating)); };
    fov.querySelectorAll(".fb-types button").forEach((b) => (b.onclick = () => setType(b.dataset.k)));
    fov.querySelectorAll(".fb-stars button").forEach((b) => (b.onclick = () => setRating(+b.dataset.n)));
    ta.oninput = () => { fov.querySelector(".fb-cnt").textContent = ta.value.length + " / 1000"; };
    const shut = () => { if (fov) { fov.remove(); fov = null; } };
    fov.querySelector(".au-x").onclick = shut; fov.onclick = (e) => { if (e.target === fov) shut(); };
    setType(type);
    go.onclick = async () => {
      const text = ta.value.trim(); err.textContent = "";
      if (text.length < 5) { err.textContent = "Biraz daha ayrıntı yazar mısın? (en az 5 karakter)"; return; }
      go.disabled = true; go.textContent = "Gönderiliyor…";
      const r = await call("feedback", { token: S.token, type, rating, text, ctx: o.ctx || "", page: location.pathname.split("/").pop() || "index.html", ua: navigator.userAgent.slice(0, 150) });
      if (!fov) return;
      go.disabled = false; go.textContent = "Gönder";
      if (!r.ok) { err.textContent = r.error || "Gönderilemedi, biraz sonra tekrar dene."; return; }
      box.innerHTML = `<div class="fb-ok"><div>🙏</div><h3>Teşekkürler!</h3><p>Mesajın ulaştı. Gelen görüşlere göre bir sonraki sürümü planlıyoruz; değişiklikleri "Yenilikler" duyurusunda görebilirsin.</p></div><button class="au-go">Tamam</button>`;
      box.querySelector(".au-go").onclick = shut;
    };
    setTimeout(() => ta.focus(), 50);
  }

  /* ---------- skor gönderme (çevrimdışıysa sonra dener) ---------- */
  const PKEY = "ruscaEkranPending_v1";
  function pending() { try { return JSON.parse(localStorage.getItem(PKEY) || "[]"); } catch (e) { return []; } }
  function setPending(a) { try { localStorage.setItem(PKEY, JSON.stringify(a.slice(-20))); } catch (e) {} }
  async function submit(stats) {
    if (!S.token || !stats || !stats.total) return null;
    // 20'den uzun turları parçala
    const parts = []; let { points = 0, right = 0, total = 0, best = 0 } = stats;
    while (total > 0) { const t = Math.min(20, total), rr = Math.min(right, t), p = Math.min(points, rr * 30); parts.push({ points: p, right: rr, total: t, best }); total -= t; right -= rr; points -= p; }
    setPending(pending().concat(parts));
    return flushPending();
  }
  let flushing = false;
  async function flushPending() {
    if (flushing || !S.token) return null; flushing = true; let last = null;
    try {
      let q = pending();
      while (q.length) {
        const r = await call("submit", Object.assign({ token: S.token }, q[0]));
        if (r.ok) { q.shift(); setPending(q); last = r; if (q.length) await new Promise((res) => setTimeout(res, 5200)); }
        else if (/sık/.test(r.error || "")) await new Promise((res) => setTimeout(res, 5200));
        else break;
      }
    } finally { flushing = false; }
    return last;
  }

  /* ---------- üst bardaki hesap düğmesi ---------- */
  function render() {
    document.querySelectorAll("[data-auth-chip]").forEach((el) => {
      el.className = "au-chip";
      el.innerHTML = S.token ? `👤 ${esc(S.username)}` : "Giriş yap";
      el.onclick = (e) => { e.preventDefault(); S.token ? openMe() : openLogin("login"); };
    });
    gate();
  }
  document.addEventListener("DOMContentLoaded", () => { render(); flushPending(); });
  // [data-feedback] olan her bağlantı görüş formunu açar (sonradan eklenenler dahil)
  document.addEventListener("click", (e) => { const el = e.target.closest && e.target.closest("[data-feedback]"); if (el) { e.preventDefault(); openFeedback({ type: el.dataset.feedback || "" }); } });
  if (document.readyState !== "loading") render();

  window.Auth = { user: () => (S.token ? S.username : null), token: () => S.token, open: openLogin, openMe, feedback: openFeedback, submit, call, league, LEAGUES, configured: !!API };
})();
