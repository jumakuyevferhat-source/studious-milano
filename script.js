// WhatsApp numarası (ülke kodu ile, + ve boşluk olmadan)
const WHATSAPP_NUMBER = "905421106647";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const waUrl = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

// ---------- Dil ----------
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
function detectLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS[q]) return q;
  const saved = store.get("sm-lang");
  if (saved && LANGS[saved]) return saved;
  for (const l of navigator.languages || [navigator.language || "en"]) {
    const c = l.slice(0, 2).toLowerCase();
    if (["ru", "uk", "be", "kk"].includes(c)) return "ru";
    if (c === "tr" || c === "az") return "tr";
    if (c === "en") return "en";
  }
  return "en";
}
let lang = detectLang();

const t = (k, vars) => {
  let s = I18N[lang][k] ?? I18N.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};
// Çok dilli alanlar: { en, ru, tr } ya da düz metin
const L = (v) => (v && typeof v === "object" ? v[lang] ?? v.en ?? v.tr ?? "" : v ?? "");
const catName = (k) => L(CATEGORY_NAMES[k]) || k;
const colorName = (c) => (lang === "tr" ? c : c.split(" / ").map((x) => COLOR_NAMES[x]?.[lang] ?? x).join(" / "));
const badgeName = (b) => t("badge." + b);
const locale = () => ({ en: "en-US", ru: "ru-RU", tr: "tr-TR" }[lang]);
const tl = (n) => n.toLocaleString(locale()) + " ₺";

function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("meta.title");
  $('meta[name="description"]').content = t("meta.desc");
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $$("[data-i18n-alt]").forEach((el) => (el.alt = t(el.dataset.i18nAlt)));
  $$(".wa-link").forEach((a) => {
    a.href = waUrl(t(a.dataset.wa));
    a.target = "_blank";
    a.rel = "noopener";
  });
  $$(".lang").forEach((box) => {
    box.innerHTML = Object.entries(LANGS).map(([k, v]) =>
      `<button type="button" data-lang="${k}" aria-pressed="${k === lang}" class="${k === lang ? "active" : ""}">${v}</button>`).join("");
  });
}

function setLang(l) {
  if (!LANGS[l] || l === lang) return;
  lang = l;
  store.set("sm-lang", l);
  applyStatic();
  renderCats();
  renderChips();
  render();
  hero.rebuild();
  if (!modal.hidden) fillModal();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) setLang(b.dataset.lang);
});

const pretty = WHATSAPP_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3 $4 $5");
$$(".wa-number").forEach((a) => (a.textContent = pretty));

// ---------- Header & menü ----------
const header = $("#header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const burger = $("#burger");
const menu = $("#menu");
const toggleMenu = (open) => {
  menu.classList.toggle("open", open);
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
};
burger.addEventListener("click", () => toggleMenu(!menu.classList.contains("open")));
$$("a", menu).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

// ---------- Kategoriler ----------
const counts = PRODUCTS.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
const usedCats = Object.keys(CATEGORY_NAMES).filter((k) => counts[k]);

function renderCats() {
  $("#cats").innerHTML = usedCats.map((k) => {
    const p = PRODUCTS.find((x) => x.category === k);
    return `<button class="cat" data-cat="${k}">
      <img src="${esc(p.images[0])}" alt="" loading="lazy">
      <span>${esc(catName(k))}<small>${esc(t("cats.count", { n: counts[k] }))}</small></span>
    </button>`;
  }).join("");
  $("#cats").dataset.n = usedCats.length;
}

function renderChips() {
  $("#chips").innerHTML =
    `<button class="chip ${state.cat === "all" ? "active" : ""}" data-cat="all" role="tab" aria-selected="${state.cat === "all"}">${esc(t("filter.all"))}<sup>${PRODUCTS.length}</sup></button>` +
    usedCats.map((k) => `<button class="chip ${state.cat === k ? "active" : ""}" data-cat="${k}" role="tab" aria-selected="${state.cat === k}">${esc(catName(k))}<sup>${counts[k]}</sup></button>`).join("");
}

// ---------- Katalog ----------
const state = { cat: "all", q: "", sort: "default" };
if (!SHOW_PRICES) $$('#sort option[value^="price"]').forEach((o) => o.remove());
const grid = $("#grid");
const norm = (s) => s.toLocaleLowerCase(locale());

function render() {
  let list = PRODUCTS.filter((p) =>
    (state.cat === "all" || p.category === state.cat) &&
    (!state.q || norm([L(p.name), p.code, catName(p.category), ...p.colors.map(colorName), ...Object.values(p.name)].join(" ")).includes(norm(state.q)))
  );
  if (state.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (state.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (state.sort === "new") list = [...list].sort((a, b) => (b.badge === "Yeni") - (a.badge === "Yeni") || b.id - a.id);

  grid.innerHTML = list.map((p, i) => {
    const badgeCls = p.badge === "İndirim" ? "sale" : p.badge === "Çok Satan" ? "hot" : "";
    return `<article class="card" data-id="${p.id}" style="animation-delay:${Math.min(i, 8) * 50}ms">
      <div class="card-media">
        ${p.badge ? `<span class="badge ${badgeCls}">${esc(badgeName(p.badge))}</span>` : ""}
        <img src="${esc(p.images[0])}" alt="${esc(L(p.name))}" loading="lazy">
        ${p.images[1] ? `<img class="alt" src="${esc(p.images[1])}" alt="" loading="lazy">` : ""}
        <button class="quick" type="button">${esc(t("card.quick"))}</button>
      </div>
      <div class="card-body">
        <p class="card-cat">${esc(catName(p.category))}</p>
        <h3 class="card-name">${esc(L(p.name))}</h3>
        ${SHOW_PRICES ? `<p class="price">${tl(p.price)}${p.oldPrice ? `<del>${tl(p.oldPrice)}</del>` : ""}</p>` : ""}
      </div>
    </article>`;
  }).join("");
  $("#empty").hidden = list.length > 0;
}

function setCat(cat) {
  state.cat = cat;
  renderChips();
  render();
}

$("#chips").addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (c) setCat(c.dataset.cat);
});
$("#cats").addEventListener("click", (e) => {
  const c = e.target.closest(".cat");
  if (!c) return;
  setCat(c.dataset.cat);
  $("#koleksiyon").scrollIntoView({ behavior: "smooth" });
});
$("#search").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openProduct(+card.dataset.id);
});

// ---------- Ürün penceresi ----------
const modal = $("#modal");
const sel = { product: null, color: null, size: null, qty: 1, img: 0 };
let lastFocus = null;

function openProduct(id, pushHash = true) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  Object.assign(sel, { product: p, color: p.colors[0] || null, size: p.sizes.length === 1 ? p.sizes[0] : null, qty: 1, img: 0 });
  lastFocus = document.activeElement;
  fillModal();
  $("#mWarn").hidden = true;
  modal.hidden = false;
  document.body.classList.add("lock");
  $(".modal-close", modal).focus();
  if (pushHash) history.replaceState(null, "", "#urun-" + p.id);
}

function fillModal() {
  const p = sel.product;
  $("#mCat").textContent = catName(p.category);
  $("#mName").textContent = L(p.name);
  $("#mCode").textContent = `${t("m.code")}: ${p.code}`;
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  $("#mPrice").innerHTML = SHOW_PRICES
    ? tl(p.price) + (p.oldPrice ? `<del>${tl(p.oldPrice)}</del><span class="off">-${off}% ${esc(t("m.off"))}</span>` : "")
    : `<span class="ask">${esc(t("m.ask"))}</span>`;
  $("#mDesc").textContent = L(p.description);
  $("#mThumbs").innerHTML = p.images.length > 1
    ? p.images.map((src, i) => `<button type="button" data-i="${i}" aria-label="${esc(t("m.photo"))} ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join("")
    : "";
  setImg(sel.img);
  renderOpts();
  $("#qVal").textContent = sel.qty;
}

function setImg(i) {
  const p = sel.product;
  sel.img = i;
  $("#mImg").src = p.images[i];
  $("#mImg").alt = L(p.name);
  $$("#mThumbs button").forEach((b, j) => b.classList.toggle("active", i === j));
}
$("#mThumbs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setImg(+b.dataset.i);
});

function renderOpts() {
  const p = sel.product;
  const btns = (arr, cur, fmt) => arr.map((v) => `<button type="button" class="${v === cur ? "active" : ""}" data-v="${esc(v)}">${esc(fmt(v))}</button>`).join("");
  $("#mColors").innerHTML = btns(p.colors, sel.color, colorName);
  $("#mSizes").innerHTML = btns(p.sizes, sel.size, (v) => v);
  $("#mColorLabel").textContent = sel.color ? colorName(sel.color) : "-";
  $("#mSizeLabel").textContent = sel.size || t("m.choose");
}

$("#mColors").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) { sel.color = b.dataset.v; renderOpts(); }
});
$("#mSizes").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) { sel.size = b.dataset.v; $("#mWarn").hidden = true; renderOpts(); }
});
$("#qMinus").addEventListener("click", () => { sel.qty = Math.max(1, sel.qty - 1); $("#qVal").textContent = sel.qty; });
$("#qPlus").addEventListener("click", () => { sel.qty = Math.min(20, sel.qty + 1); $("#qVal").textContent = sel.qty; });

$("#mOrder").addEventListener("click", () => {
  const p = sel.product;
  if (!sel.size) {
    $("#mWarn").hidden = false;
    const sizes = $("#mSizes");
    sizes.classList.remove("shake");
    void sizes.offsetWidth;
    sizes.classList.add("shake");
    return;
  }
  const link = location.href.split("#")[0].split("?")[0] + "#urun-" + p.id;
  const text = [
    t("wa.intro"),
    "",
    `🛍️ ${L(p.name)}`,
    `${t("wa.code")}: ${p.code}`,
    sel.color && `${t("wa.color")}: ${colorName(sel.color)}`,
    `${t("wa.size")}: ${sel.size}`,
    `${t("wa.qty")}: ${sel.qty}`,
    `${t("wa.country")}: `,
    "",
    SHOW_PRICES ? `${t("wa.price")}: ${tl(p.price * sel.qty)}` : t("wa.priceAsk"),
    "",
    link,
  ].filter((x) => x !== null && x !== undefined && x !== false).join("\n");
  window.open(waUrl(text), "_blank", "noopener");
});

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("lock");
  history.replaceState(null, "", location.pathname + location.search);
  if (lastFocus) lastFocus.focus();
}
modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (modal.hidden) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab") {
    const f = $$("button, a[href], input, select", modal).filter((el) => el.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------- Ana sayfa vitrini ----------
const hero = (() => {
  const root = $("#hero");
  const slides = HERO_SLIDES.map((s) => ({ ...s, p: PRODUCTS.find((x) => x.id === s.product) })).filter((s) => s.p);
  if (!slides.length) return { rebuild() {} };
  const DUR = 7000;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.style.setProperty("--dur", DUR + "ms");
  root.classList.toggle("single", slides.length < 2);

  let cur = -1, timer = null, paused = false, started = 0, left = DUR;
  let texts = [], imgs = [], dots = [];
  const card = $("#heroCard");

  function build() {
    // Başlık her zaman marka adı
    $("#heroText").innerHTML = slides.map((s, i) => {
      const tag = i === 0 ? "h1" : "p";
      return `<div class="hs${i === cur ? " active" : ""}" aria-hidden="${i !== cur}">
        <p class="eyebrow fade">${esc(L(s.eyebrow))}</p>
        <${tag} class="brand-title"><span class="line"><span>Studious</span></span><span class="line"><span><em>Milano</em></span></span></${tag}>
        <p class="lead fade">${esc(L(s.text))}</p>
        <div class="hero-actions fade d2">
          <button type="button" class="btn btn-light" data-open="${s.p.id}">${esc(t("hero.cta1"))}</button>
          <a href="#koleksiyon" class="btn btn-outline-light">${esc(t("hero.cta2"))}</a>
        </div>
      </div>`;
    }).join("");
    $("#heroParallax").innerHTML = slides.map((s, i) => `
      <div class="slide${i === cur ? " active" : ""}">
        <img src="${esc(s.image)}" alt="${esc(L(s.p.name))}" style="object-position:${s.focus || "50% 50%"}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
        <button type="button" class="hotspot" data-open="${s.p.id}" style="left:${s.hotspot.x}%;top:${s.hotspot.y}%" aria-label="${esc(L(s.p.name))} — ${esc(t("aria.view"))}">
          <span>${esc(L(s.p.name))}${SHOW_PRICES ? " · " + tl(s.p.price) : ""}</span>
        </button>
      </div>`).join("");
    $("#heroDots").innerHTML = slides.map((s, i) =>
      `<button type="button" class="${i === cur ? "active" : ""}" aria-label="${esc(t("aria.slide"))} ${i + 1}: ${esc(L(s.label))}">${esc(L(s.label))}</button>`).join("");
    texts = $$(".hs", root); imgs = $$(".slide", root); dots = $$("#heroDots button");
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
  }

  function fillCard() {
    const p = slides[cur].p;
    card.innerHTML = `<img src="${esc(p.images[0])}" alt=""><span><small>${esc(p.badge ? badgeName(p.badge) : catName(p.category))}</small><strong>${esc(L(p.name))}</strong>${SHOW_PRICES ? `<b>${tl(p.price)}</b>` : ""}<i>${esc(t("hero.view"))}</i></span>`;
    card.dataset.open = p.id;
    card.setAttribute("aria-label", `${L(p.name)} — ${t("aria.view")}`);
  }

  function go(n) {
    n = (n + slides.length) % slides.length;
    if (n === cur) return;
    cur = n;
    [texts, imgs, dots].forEach((set) => set.forEach((el, i) => el.classList.toggle("active", i === n)));
    texts.forEach((el, i) => {
      el.setAttribute("aria-hidden", String(i !== n));
      $$("a, button", el).forEach((b) => (b.tabIndex = i === n ? 0 : -1));
    });
    fillCard();
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    left = DUR;
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || reduce || slides.length < 2) return;
    started = Date.now();
    timer = setTimeout(() => go(cur + 1), left);
  }
  const holds = new Set();
  function pause(on, why) {
    on ? holds.add(why) : holds.delete(why);
    on = holds.size > 0;
    if (on === paused) return;
    paused = on;
    root.classList.toggle("paused", on);
    if (on) { clearTimeout(timer); left = Math.max(400, left - (Date.now() - started)); }
    else schedule();
  }

  root.setAttribute("tabindex", "-1");
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  root.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) { e.preventDefault(); openProduct(+o.dataset.open); }
  });
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProduct(+card.dataset.open); } });
  $("#heroPrev").addEventListener("click", () => go(cur - 1));
  $("#heroNext").addEventListener("click", () => go(cur + 1));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(cur - 1);
    if (e.key === "ArrowRight") go(cur + 1);
  });

  // Üzerine gelince dur, fareyle hafif derinlik efekti
  const media = $("#heroMedia"), par = $("#heroParallax");
  media.addEventListener("mouseenter", () => pause(true, "hover"));
  media.addEventListener("mouseleave", () => { pause(false, "hover"); par.style.setProperty("--px", 0); par.style.setProperty("--py", 0); });
  if (!reduce) media.addEventListener("mousemove", (e) => {
    const r = media.getBoundingClientRect();
    par.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5) * -2.4 + "%");
    par.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5) * -2.4 + "%");
  });

  // Mobilde kaydırarak geçiş
  let sx = null;
  media.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  media.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });

  // Sekme görünmezken ya da ürün penceresi açıkken dur
  document.addEventListener("visibilitychange", () => pause(document.hidden, "tab"));
  new MutationObserver(() => pause(!modal.hidden, "modal")).observe(modal, { attributes: true, attributeFilter: ["hidden"] });

  build();
  go(0);

  return {
    rebuild() {
      build();
      texts.forEach((el, i) => $$("a, button", el).forEach((b) => (b.tabIndex = i === cur ? 0 : -1)));
      fillCard();
    },
  };
})();

// ---------- İlk çizim ----------
applyStatic();
renderCats();
renderChips();
render();

// Paylaşılan ürün linki (#urun-5) açılınca ürünü göster
const fromHash = () => {
  const m = location.hash.match(/^#urun-(\d+)$/);
  if (m) openProduct(+m[1], false);
};
fromHash();
window.addEventListener("hashchange", fromHash);

// ---------- Scroll animasyonu ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }),
  { threshold: 0.1 }
);
$$(".section-head, .cats, .steps li, .look > *, .contact > *, .brand-text").forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

$("#year").textContent = new Date().getFullYear();
