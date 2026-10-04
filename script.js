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
  for (const [a, b] of Object.entries({ min: MIN_SERIES, ...vars })) s = s.replace(`{${a}}`, b);
  return s;
};
// Çok dilli alanlar: { en, ru, tr } ya da düz metin
const L = (v) => (v && typeof v === "object" ? v[lang] ?? v.en ?? v.tr ?? "" : v ?? "");
const catName = (k) => L(CATEGORY_NAMES[k]) || k;
const colorName = (c) => (lang === "tr" ? c : c.split(" / ").map((x) => COLOR_NAMES[x]?.[lang] ?? x).join(" / "));
const badgeName = (b) => t("badge." + b);
const locale = () => ({ en: "en-US", ru: "ru-RU", tr: "tr-TR" }[lang]);
const tl = (n) => n.toLocaleString(locale()) + " ₺";

// ---------- Toptan: seri / asorti ----------
const MAX_SERIES = 999;
const asortiOf = (p) => p.sizes.map((_, i) => p.asorti?.[i] ?? 1);
const perSeries = (p) => asortiOf(p).reduce((a, b) => a + b, 0);
const pcsOf = (p, series) => perSeries(p) * series;
const seriesLabel = (p) => p.sizes.map((s, i) => (asortiOf(p)[i] > 1 ? `${s}×${asortiOf(p)[i]}` : s)).join("-");

function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("meta.title");
  $('meta[name="description"]').content = t("meta.desc");
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
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
  renderAll();
  if (!modal.hidden) fillModal();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang]");
  if (b) setLang(b.dataset.lang);
});

const pretty = WHATSAPP_NUMBER.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3 $4 $5");
$$(".wa-number").forEach((a) => (a.textContent = pretty));

// ---------- Header ----------
const header = $("#header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// ---------- Afiş ----------
function renderBanner() {
  const s = HERO_SLIDES[0];
  const p = s && PRODUCTS.find((x) => x.id === s.product);
  if (!s || !p) return;
  $("#bannerEyebrow").textContent = L(s.eyebrow);
  $("#bannerText").textContent = L(s.text);
  const m = $("#bannerMedia");
  m.innerHTML = `<img src="${esc(s.image)}" alt="${esc(L(p.name))}" style="object-position:${s.focus || "50% 50%"}" fetchpriority="high">
    <span class="banner-tag"><small>${esc(catName(p.category))}</small>${esc(L(p.name))}</span>`;
  m.dataset.open = p.id;
  m.setAttribute("aria-label", L(p.name));
}
$("#bannerMedia").addEventListener("click", (e) => openProduct(+e.currentTarget.dataset.open));

// ---------- Kategoriler ----------
const counts = PRODUCTS.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
const usedCats = Object.keys(CATEGORY_NAMES).filter((k) => counts[k]);

function renderCats() {
  $("#cats").innerHTML = usedCats.map((k) => {
    const p = PRODUCTS.find((x) => x.category === k);
    return `<button class="cat" data-cat="${k}">
      <img src="${esc(p.images[0])}" alt="" loading="lazy">
      <span>${esc(catName(k))}<small>${esc(t("coll.count", { n: counts[k] }))}</small></span>
    </button>`;
  }).join("");
  $("#cats").dataset.n = usedCats.length;
}

function renderSide() {
  const item = (k, name, n) =>
    `<button type="button" class="${state.cat === k ? "active" : ""}" data-cat="${k}" aria-pressed="${state.cat === k}"><span>${esc(name)}</span><sup>${n}</sup></button>`;
  $("#sideCats").innerHTML = item("all", t("filter.all"), PRODUCTS.length) +
    usedCats.map((k) => item(k, catName(k), counts[k])).join("");
  $("#crumbCat").textContent = state.cat === "all" ? t("filter.all") : catName(state.cat);
}

// Mobilde yan menü
const side = $("#side"), sideBackdrop = $("#sideBackdrop"), burger = $("#burger");
function toggleSide(open) {
  side.classList.toggle("open", open);
  sideBackdrop.hidden = !open;
  burger.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("lock", open);
}
burger.addEventListener("click", () => toggleSide(!side.classList.contains("open")));
$("#sideClose").addEventListener("click", () => toggleSide(false));
sideBackdrop.addEventListener("click", () => toggleSide(false));
$$(".side-info a").forEach((a) => a.addEventListener("click", () => toggleSide(false)));

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
        <p class="card-series">${esc(t("card.series", { s: seriesLabel(p), n: perSeries(p) }))}</p>
        ${SHOW_PRICES
          ? `<p class="price">${tl(p.price)}${p.oldPrice ? `<del>${tl(p.oldPrice)}</del>` : ""}</p>`
          : `<p class="card-ask">${esc(t("card.ask"))}</p>`}
      </div>
    </article>`;
  }).join("");
  $("#empty").hidden = list.length > 0;
  $("#count").textContent = t("coll.count", { n: list.length });
}

function setCat(cat) {
  state.cat = cat;
  renderSide();
  render();
}

$("#sideCats").addEventListener("click", (e) => {
  const c = e.target.closest("[data-cat]");
  if (!c) return;
  setCat(c.dataset.cat);
  toggleSide(false);
});
$("#cats").addEventListener("click", (e) => {
  const c = e.target.closest(".cat");
  if (!c) return;
  setCat(c.dataset.cat);
  $("#koleksiyon").scrollIntoView({ behavior: "smooth" });
});
$("#search").addEventListener("input", (e) => {
  state.q = e.target.value.trim();
  render();
});
$("#search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#koleksiyon").scrollIntoView({ behavior: "smooth" });
});
$("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openProduct(+card.dataset.id);
});

// ---------- Ürün penceresi ----------
const modal = $("#modal");
const sel = { product: null, color: null, qty: MIN_SERIES, img: 0 };
let lastFocus = null;

function openProduct(id, pushHash = true) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  Object.assign(sel, { product: p, color: p.colors[0] || null, qty: MIN_SERIES, img: 0 });
  lastFocus = document.activeElement;
  fillModal();
  modal.hidden = false;
  document.body.classList.add("lock");
  $(".modal-close", modal).focus();
  if (pushHash) history.replaceState(null, "", "#urun-" + p.id);
}

function fillModal() {
  const p = sel.product;
  $("#mCat").textContent = catName(p.category);
  $("#mName").textContent = L(p.name);
  $("#mCode").textContent = `${t("m.stock")}: ${p.code}`;
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  $("#mPrice").innerHTML = SHOW_PRICES
    ? tl(p.price) + (p.oldPrice ? `<del>${tl(p.oldPrice)}</del><span class="off">-${off}% ${esc(t("m.off"))}</span>` : "")
    : `<span class="ask">${esc(t("m.ask"))}</span>`;
  $("#mAsorti").innerHTML =
    `<tr><th scope="row">${esc(t("m.size"))}</th>${p.sizes.map((s) => `<th scope="col">${esc(s)}</th>`).join("")}<th scope="col" class="sum">Σ</th></tr>` +
    `<tr><th scope="row">${esc(t("m.pcsRow"))}</th>${asortiOf(p).map((n) => `<td>${n}</td>`).join("")}<td class="sum">${perSeries(p)}</td></tr>`;
  $("#mDesc").textContent = L(p.description);
  $("#mThumbs").innerHTML = p.images.length > 1
    ? p.images.map((src, i) => `<button type="button" data-i="${i}" aria-label="${esc(t("m.photo"))} ${i + 1}"><img src="${esc(src)}" alt=""></button>`).join("")
    : "";
  $("#mThumbs").hidden = p.images.length < 2;
  setImg(sel.img);
  renderOpts();
  setQty(sel.qty);
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
  $("#mColors").innerHTML = p.colors.map((v) =>
    `<button type="button" class="${v === sel.color ? "active" : ""}" data-v="${esc(v)}">${esc(colorName(v))}</button>`).join("");
  $("#mColorLabel").textContent = sel.color ? colorName(sel.color) : "-";
}
$("#mColors").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) { sel.color = b.dataset.v; renderOpts(); }
});

function setQty(n) {
  sel.qty = Math.min(MAX_SERIES, Math.max(MIN_SERIES, n));
  $("#qVal").textContent = sel.qty;
  $("#qPcs").textContent = "= " + t("m.pcs", { n: pcsOf(sel.product, sel.qty) });
}
$("#qMinus").addEventListener("click", () => setQty(sel.qty - 1));
$("#qPlus").addEventListener("click", () => setQty(sel.qty + 1));

const pageLink = (p) => location.href.split("#")[0].split("?")[0] + "#urun-" + p.id;
const seriesLine = (p, n) => `${n} ${t("wa.series")} (${seriesLabel(p)}) = ${pcsOf(p, n)} ${t("wa.pcs")}`;

// Tek modeli WhatsApp'tan sor
$("#mOrder").addEventListener("click", () => {
  const p = sel.product;
  const text = [
    t("wa.intro"),
    "",
    `🛍️ ${L(p.name)}`,
    `${t("wa.code")}: ${p.code}`,
    sel.color && `${t("wa.color")}: ${colorName(sel.color)}`,
    `${t("wa.qty")}: ${seriesLine(p, sel.qty)}`,
    `${t("wa.country")}: `,
    "",
    SHOW_PRICES ? `${t("wa.price")}: ${tl(p.price * pcsOf(p, sel.qty))}` : t("wa.priceAsk"),
    "",
    pageLink(p),
  ].filter((x) => x !== null && x !== undefined && x !== false).join("\n");
  window.open(waUrl(text), "_blank", "noopener");
});

// Sipariş listesine ekle
$("#mAdd").addEventListener("click", () => {
  addToCart(sel.product.id, sel.color, sel.qty);
  closeModal();
  showToast();
});

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("lock");
  history.replaceState(null, "", location.pathname + location.search);
  if (lastFocus) lastFocus.focus();
}
modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });

// Açık pencerede klavye: Esc kapatır, Tab dışarı çıkmaz
function trapKeys(e, box, close) {
  if (e.key === "Escape") close();
  if (e.key === "Tab") {
    const f = $$("button, a[href], input, select, summary", box).filter((el) => el.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
document.addEventListener("keydown", (e) => {
  if (!modal.hidden) trapKeys(e, modal, closeModal);
  else if (!drawer.hidden) trapKeys(e, drawer, closeDrawer);
  else if (side.classList.contains("open") && e.key === "Escape") toggleSide(false);
});

// ---------- Sipariş listesi ----------
const drawer = $("#drawer");
let cart = [];
try { cart = JSON.parse(store.get("sm-cart")) || []; } catch {}
cart = cart.filter((it) => PRODUCTS.some((p) => p.id === it.id));
const saveCart = () => store.set("sm-cart", JSON.stringify(cart));
const productOf = (it) => PRODUCTS.find((p) => p.id === it.id);

function addToCart(id, color, qty) {
  const it = cart.find((x) => x.id === id && x.color === color);
  if (it) it.qty = Math.min(MAX_SERIES, it.qty + qty);
  else cart.push({ id, color, qty });
  saveCart();
  renderCart();
}

function cartTotals() {
  return cart.reduce((a, it) => ({ series: a.series + it.qty, pcs: a.pcs + pcsOf(productOf(it), it.qty) }), { series: 0, pcs: 0 });
}

function renderCart() {
  const tot = cartTotals();
  $("#cartCount").textContent = cart.length;
  $("#cartBtn").classList.toggle("has", cart.length > 0);
  $("#dEmpty").hidden = cart.length > 0;
  $("#dFoot").hidden = cart.length === 0;
  $("#dTotal").textContent = `${tot.series} ${t("wa.series")} · ${t("m.pcs", { n: tot.pcs })}`;
  $("#dList").innerHTML = cart.map((it, i) => {
    const p = productOf(it);
    return `<li class="d-item" data-i="${i}">
      <img src="${esc(p.images[0])}" alt="">
      <div class="d-info">
        <strong>${esc(L(p.name))}</strong>
        <small>${esc(p.code)}${it.color ? " · " + esc(colorName(it.color)) : ""} · ${esc(seriesLabel(p))}</small>
        <div class="d-row">
          <div class="qty qty-sm">
            <button type="button" data-d="-1" aria-label="${esc(t("m.minus"))}">−</button>
            <output>${it.qty}</output>
            <button type="button" data-d="1" aria-label="${esc(t("m.plus"))}">+</button>
          </div>
          <span class="d-pcs">${esc(t("wa.series"))} = ${esc(t("m.pcs", { n: pcsOf(p, it.qty) }))}</span>
        </div>
      </div>
      <button type="button" class="d-remove" data-remove aria-label="${esc(t("cart.remove"))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </li>`;
  }).join("");
}

$("#dList").addEventListener("click", (e) => {
  const li = e.target.closest(".d-item");
  if (!li) return;
  const i = +li.dataset.i;
  const d = e.target.closest("[data-d]");
  if (d) cart[i].qty = Math.min(MAX_SERIES, Math.max(MIN_SERIES, cart[i].qty + +d.dataset.d));
  else if (e.target.closest("[data-remove]")) cart.splice(i, 1);
  else return;
  saveCart();
  renderCart();
  if (!cart.length) $(".modal-close", drawer).focus();
});
$("#dClear").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  $(".modal-close", drawer).focus();
});

["dCompany", "dCountry"].forEach((id) => {
  const el = $("#" + id);
  el.value = store.get("sm-" + id) || "";
  el.addEventListener("input", () => store.set("sm-" + id, el.value));
});

$("#dSend").addEventListener("click", () => {
  const tot = cartTotals();
  const lines = cart.map((it, i) => {
    const p = productOf(it);
    return `${i + 1}) ${L(p.name)} — ${p.code}${it.color ? " — " + colorName(it.color) : ""}\n    ${seriesLine(p, it.qty)}`;
  });
  const text = [
    t("wa.list"),
    "",
    ...lines,
    "",
    `${t("wa.total")}: ${tot.series} ${t("wa.series")} = ${tot.pcs} ${t("wa.pcs")}`,
    `${t("wa.company")}: ${$("#dCompany").value.trim()}`,
    `${t("wa.country")}: ${$("#dCountry").value.trim()}`,
    "",
    t("wa.priceAsk"),
  ].join("\n");
  window.open(waUrl(text), "_blank", "noopener");
});

let drawerFocus = null;
function openDrawer() {
  drawerFocus = document.activeElement;
  hideToast();
  drawer.hidden = false;
  document.body.classList.add("lock");
  $(".modal-close", drawer).focus();
}
function closeDrawer() {
  if (drawer.hidden) return;
  drawer.hidden = true;
  document.body.classList.remove("lock");
  if (drawerFocus && drawerFocus.isConnected) drawerFocus.focus();
}
$("#cartBtn").addEventListener("click", openDrawer);
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-dclose]")) closeDrawer(); });

const toast = $("#toast");
let toastTimer = null;
function showToast() {
  toast.hidden = false;
  toast.classList.remove("in"); void toast.offsetWidth; toast.classList.add("in");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}
function hideToast() { toast.hidden = true; clearTimeout(toastTimer); }
$("#toastView").addEventListener("click", openDrawer);

// ---------- İlk çizim ----------
function renderAll() {
  applyStatic();
  renderBanner();
  renderCats();
  renderSide();
  render();
  renderCart();
}
renderAll();

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
$$(".section-head, .cats, .steps li, .contact > *").forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

$("#year").textContent = new Date().getFullYear();
