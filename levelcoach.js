// Rusça Ekran – seviye koçu.
// Kendi seviyendeki son cevaplarına bakar; çok zorlanıyorsan bir alt, çok rahatsan bir üst seviyeyi önerir.
// Video modu ve cümle oyunu aynı geçmişi paylaşır.
(function () {
  const K = "ruscaEkranLvlHist_v1", YT = "ruscaEkranYT_v1", SG = "ruscaEkran_v1";
  const LV = ["A1", "A2", "B1", "B2", "C1"];
  const WIN = 20, MIN_DOWN = 12, MIN_UP = 20, DOWN = 0.55, UP = 0.9, SNOOZE = 20;
  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let st = Object.assign({ h: [], since: 0, skip: {} }, rd(K));
  const save = () => wr(K, st);
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function level() {
    const a = rd(YT).level, b = rd(SG).level;
    return LV.includes(a) ? a : LV.includes(b) ? b : "";
  }
  function record(l, ok) {
    if (!LV.includes(l)) return;
    st.h.push({ l, ok: ok ? 1 : 0, t: Date.now() });
    if (st.h.length > 500) st.h = st.h.slice(-500);
    save();
  }
  const mine = (l) => st.h.filter((x) => x.l === l && x.t > (st.since || 0));

  // öneri: {dir:"down"|"up", from, to, acc, n} ya da null
  function evaluate() {
    const me = level(); if (!me) return null;
    const all = mine(me);
    if (st.skip[me] != null && all.length < st.skip[me] + SNOOZE) return null;
    const a = all.slice(-WIN), i = LV.indexOf(me);
    if (!a.length) return null;
    const acc = a.reduce((s, x) => s + x.ok, 0) / a.length;
    if (i > 0 && a.length >= MIN_DOWN && acc < DOWN) return { dir: "down", from: me, to: LV[i - 1], acc, n: a.length };
    if (i < LV.length - 1 && a.length >= MIN_UP && acc >= UP) {
      // bir üst seviyede de denediyse orada da fena değilse öner
      const up = mine(LV[i + 1]).slice(-WIN);
      const upAcc = up.length >= 6 ? up.reduce((s, x) => s + x.ok, 0) / up.length : 1;
      if (upAcc >= 0.6) return { dir: "up", from: me, to: LV[i + 1], acc, n: a.length };
    }
    return null;
  }

  // sayfa kendi seviye değiştirme işlevini verebilir (video modu bellekteki U.level'i günceller)
  let onChange = null;
  function apply(to) {
    if (onChange) onChange(to);
    else {
      const y = rd(YT); y.level = to; wr(YT, y);
      const s = rd(SG); s.level = to; wr(SG, s);
      if (window.Auth && Auth.token()) Auth.call("setLevel", { token: Auth.token(), level: to });
    }
    st.since = Date.now(); st.skip = {}; save();
    document.dispatchEvent(new CustomEvent("level-change", { detail: to }));
  }

  const css = `
  .lc{border-radius:16px;padding:14px 16px;margin:0 0 14px;font:14px/1.45 Inter,system-ui,sans-serif;color:#f2f4f8;text-align:left}
  .lc.down{background:#2a1f10;border:1px solid #6b4b16}.lc.up{background:#10261a;border:1px solid #1f6b3f}.lc.done{background:#13161e;border:1px solid #262b38}
  .lc b{font-weight:800}.lc p{margin:0 0 10px}
  .lc .r{display:flex;gap:8px}.lc button{flex:1;padding:11px;border-radius:12px;border:1px solid #ffffff22;font:700 14px Inter,system-ui;cursor:pointer}
  .lc .y{background:#f2f4f8;color:#111}.lc .n{background:none;color:#c9cfdb}`;
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);

  // Türkçe yönelme eki: ...1 (bir) → 'e, ...2 (iki) → 'ye
  const ye = (l) => l + (l.endsWith("2") ? "'ye" : "'e");
  function html(sg) {
    const p = Math.round(sg.acc * 100);
    if (sg.dir === "down") return `<div class="lc down"><p>📉 <b>${sg.from}</b> şu an biraz zor geliyor: son ${sg.n} ${sg.from} sahnesinde doğruluğun <b>%${p}</b>. Bir süre <b>${sg.to}</b> seviyesinde çalışmanı öneririm; orada rahatlayınca tekrar ${ye(sg.from)} çıkarsın.</p>
      <div class="r"><button class="y" data-lc="go">${ye(sg.to)} geç</button><button class="n" data-lc="stay">${sg.from}'de kalayım</button></div></div>`;
    return `<div class="lc up"><p>📈 <b>${sg.from}</b> sana kolay geliyor: son ${sg.n} ${sg.from} sahnesinin <b>%${p}</b>'ini doğru bildin. <b>${sg.to}</b> seviyesine çıkmayı dene.</p>
      <div class="r"><button class="y" data-lc="go">${ye(sg.to)} çık</button><button class="n" data-lc="stay">Şimdilik kalayım</button></div></div>`;
  }
  // [data-level-coach] olan her kutuya öneriyi çizer
  function mount() {
    const sg = evaluate();
    document.querySelectorAll("[data-level-coach]").forEach((host) => {
      host.innerHTML = sg ? html(sg) : "";
      if (!sg) return;
      host.querySelector('[data-lc="go"]').onclick = () => {
        apply(sg.to);
        document.querySelectorAll("[data-level-coach]").forEach((h) => (h.innerHTML = ""));
        host.innerHTML = `<div class="lc done">✓ Seviyen <b>${esc(sg.to)}</b> olarak güncellendi. Sonraki turlar ${esc(sg.to)} ağırlıklı gelecek.</div>`;
      };
      host.querySelector('[data-lc="stay"]').onclick = () => {
        st.skip[sg.from] = mine(sg.from).length; save();
        document.querySelectorAll("[data-level-coach]").forEach((h) => (h.innerHTML = ""));
      };
    });
  }
  // başka sayfada seviye değişirse eski değerlendirmeyi sıfırla
  function noteManualChange() { st.since = Date.now(); st.skip = {}; save(); }

  window.LevelCoach = { record, evaluate, mount, level, noteManualChange, set onChange(f) { onChange = f; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
