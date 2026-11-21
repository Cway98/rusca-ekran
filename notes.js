// Rusça Ekran – güncelleme notları ve uygulama içi duyuru.
// Yeni sürüm çıkınca en üste bir kayıt ekle; duyuru o tarihten itibaren 3 gün gösterilir.
window.RE_RELEASES = [
  {
    v: "2.2", date: "2026-11-21", title: "Cümle oyununda seviyeler",
    items: [
      ["🎚", "A1–C1 seviyeleri", "Cümle oyunu artık video moduyla aynı seviyeleri kullanıyor. “⭐ Seviyem” seçiliyken önce kendi seviyen, sonra bir alt ve bir üst seviye gelir; istersen tek bir seviye de seçebilirsin."],
      ["🆕", "50 yeni sahne", "Çoğu B1–B2 olmak üzere 50 yeni cümle: şantiye, evrak, toplantı, günlük hayat, sohbet ve deyimler. Toplam 152 cümle."],
      ["⏱", "Uzun cümleye uzun süre", "Süre artık cümlenin uzunluğuna göre 15–24 saniye arasında ayarlanıyor; görmediğin cümleler önce geliyor."],
    ],
  },
  {
    v: "2.1", date: "2026-11-21", title: "Görüş & öneri, zorunlu üyelik",
    items: [
      ["💬", "Görüş & öneri", "Ana ekrandan, Durumum sayfasından veya profil menünden bize yaz: öneri, eksik içerik, hata ya da genel yorum. Her mesajı okuyup sonraki sürümleri buna göre planlıyoruz."],
      ["⚑", "Sahneyi bildir", "Cevaptan sonra çıkan “Bu sahnede sorun var” ile yanlış çeviriyi veya erken/geç duran videoyu tek dokunuşla bildir."],
      ["👤", "Üyelik artık zorunlu", "Uygulamayı kullanmak için üye olman ya da giriş yapman gerekiyor. Böylece puanın, seviyen ve gördüğün sahneler her cihazda seninle gelir."],
    ],
  },
  {
    v: "2.0", date: "2026-11-21", title: "Seviyeler, hedefler ve rozetler",
    items: [
      ["🧭", "Seviye sınavı", "10 sahnelik uyarlamalı sınav seviyeni A1–C1 arasında otomatik belirler. İstersen seviyeni kendin de seçebilirsin."],
      ["📊", "Durumum sayfası", "Ligin, haftalık sıran, bir üst lige kalan puan, hedeflerin ve rozetlerin tek ekranda."],
      ["🎯", "Haftalık hedefler", "50 sahne, 5 farklı gün, %80 doğruluk, üst üste 10 doğru. Her hedef bonus puan ve rozet kazandırır."],
      ["🏅", "Rozetler", "İlk tur, 100 / 500 / 1000 sahne ve seviye sınavı rozetleri."],
      ["🔁", "Tekrar yok", "Cevapladığın sahneler hesabında saklanır; aynı sahne mümkün olduğunca tekrar gelmez."],
      ["🎞", "Yeni sahneler", "Мосфильм klasiklerinden (Кавказская пленница, Бриллиантовая рука, Афоня…) ve Easy Russian'dan yeni sahneler. Toplam 85 sahne."],
    ],
  },
  {
    v: "1.3", date: "2026-11-21", title: "Üyelik ve lig",
    items: [
      ["👤", "Üyelik", "E-posta olmadan, kullanıcı adı ve şifreyle üye ol; puanların hesabına kaydedilir."],
      ["🏆", "Haftalık lig", "Bronz, Gümüş, Altın ve Elmas ligleri; her pazartesi sıfırlanan sıralama."],
    ],
  },
  {
    v: "1.2", date: "2026-11-21", title: "Video modu",
    items: [
      ["🎬", "Voscreen tarzı video modu", "Gerçek dizi sahneleri otomatik başlar, cümle bitince durur, iki şıktan doğru çeviriyi seçersin."],
      ["⚡", "Hız puanı ve seri", "Hızlı cevap ve art arda doğrular ekstra puan getirir."],
      ["🙈", "Altyazı perdesi", "Videoya gömülü altyazılar cevap verene kadar kapalı kalır."],
    ],
  },
  {
    v: "1.0", date: "2026-11-20", title: "İlk sürüm",
    items: [
      ["🗣", "Cümle oyunu", "Animasyonlu sahneler ve seslendirmeyle günlük hayat, iş, komedi ve sohbet cümleleri."],
    ],
  },
];

(function () {
  const R = window.RE_RELEASES, cur = R[0];
  const DAYS = 3, KEY = "ruscaEkranNotes_v1";
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // sürüm tarihi Moskova gece yarısı kabul edilir
  const start = new Date(cur.date + "T00:00:00+03:00").getTime();
  const active = Date.now() >= start && Date.now() < start + DAYS * 86400000;
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  const css = `
  .rn-ov{position:fixed;inset:0;background:#000b;backdrop-filter:blur(6px);z-index:1100;display:flex;align-items:flex-end;justify-content:center}
  @media(min-width:600px){.rn-ov{align-items:center}}
  .rn-box{width:100%;max-width:480px;max-height:90vh;overflow:auto;background:#13161e;border:1px solid #262b38;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));color:#f2f4f8;font-family:Inter,system-ui,sans-serif;animation:rnUp .25s ease-out}
  @media(min-width:600px){.rn-box{border-radius:22px}}
  @keyframes rnUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
  .rn-tag{display:inline-block;font:800 11px Inter,system-ui;letter-spacing:.8px;color:#fff;background:linear-gradient(90deg,#ff4d3d,#ff7a45);border-radius:999px;padding:4px 10px}
  .rn-box h3{font-size:21px;margin:10px 0 4px}.rn-box .d{color:#8b93a3;font-size:13px;margin-bottom:14px}
  .rn-it{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #262b38}.rn-it:last-of-type{border-bottom:0}
  .rn-it .e{font-size:22px;width:30px;text-align:center;flex:none}.rn-it b{display:block;font-size:14px}.rn-it span{color:#8b93a3;font-size:13px;line-height:1.45}
  .rn-go{width:100%;margin-top:14px;padding:15px;border:0;border-radius:14px;background:linear-gradient(90deg,#ff4d3d,#ff7a45);color:#fff;font:800 16px Inter,system-ui;cursor:pointer}
  .rn-all{display:block;text-align:center;margin-top:10px;color:#8b93a3;font:600 13px Inter,system-ui;text-decoration:none}
  .rn-old{margin-top:16px;border-top:1px solid #262b38;padding-top:12px}.rn-old h4{font-size:14px;margin:12px 0 4px}
  .rn-bar{display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#2a1210,#1a1e28);border:1px solid #5c2a22;border-radius:14px;padding:11px 12px;margin:0 0 12px;font:600 13px Inter,system-ui;color:#f2f4f8;cursor:pointer}
  .rn-bar .x{margin-left:auto;background:none;border:0;color:#8b93a3;font-size:18px;cursor:pointer;padding:0 4px}`;
  const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);

  function list(rel) { return rel.items.map(([e, t, d]) => `<div class="rn-it"><div class="e">${e}</div><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join(""); }
  function fmt(d) { const [y, m, g] = d.split("-"); return `${+g} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][+m - 1]} ${y}`; }
  function open(all) {
    const ov = document.createElement("div"); ov.className = "rn-ov";
    ov.innerHTML = `<div class="rn-box"><span class="rn-tag">YENİ · SÜRÜM ${esc(cur.v)}</span><h3>${esc(cur.title)}</h3><div class="d">${fmt(cur.date)}</div>${list(cur)}
      ${all ? `<div class="rn-old">${R.slice(1).map((r) => `<h4>Sürüm ${esc(r.v)} · ${esc(r.title)} <span style="color:#8b93a3;font-weight:500">· ${fmt(r.date)}</span></h4>${list(r)}`).join("")}</div>` : `<a class="rn-all" href="#">Önceki güncelleme notları ›</a>`}
      <button class="rn-go">Harika, başlayalım</button></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); st.seen = cur.v; save(); };
    ov.querySelector(".rn-go").onclick = close;
    ov.onclick = (e) => { if (e.target === ov) close(); };
    const a = ov.querySelector(".rn-all"); if (a) a.onclick = (e) => { e.preventDefault(); ov.remove(); open(true); };
  }
  function banner() {
    const host = document.querySelector("[data-release-banner]");
    if (!host || st.hidden === cur.v) return;
    host.innerHTML = `<div class="rn-bar"><span>🎉</span><span>Sürüm ${esc(cur.v)}: ${esc(cur.title)} · <u>Neler yeni?</u></span><button class="x" aria-label="Gizle">×</button></div>`;
    host.querySelector(".rn-bar").onclick = (e) => { if (e.target.classList.contains("x")) { st.hidden = cur.v; save(); host.innerHTML = ""; return; } open(false); };
  }
  function init() {
    if (!active) return;
    banner();
    if (st.seen !== cur.v) setTimeout(() => open(false), 700);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.ReleaseNotes = { open: () => open(true), current: cur };
})();
