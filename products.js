/* =========================================================
   STUDIOUS MILANO — ÜRÜN LİSTESİ
   ---------------------------------------------------------
   Yeni ürün eklemek için aşağıdaki listeye bir blok kopyalayıp
   bilgileri değiştirmeniz yeterli.

   Kendi fotoğraflarınızı "assets/urunler/" klasörüne koyup
   images kısmına şöyle yazın:  "assets/urunler/gomlek-1.jpg"

   id          : Her ürün için farklı bir sayı
   code        : Ürün kodu (WhatsApp mesajında görünür)
   category    : takim | gomlek | tisort | sweat | ceket | pantolon | ayakkabi
   name        : Ürün adı — { en: İngilizce, ru: Rusça, tr: Türkçe }
   description : Açıklama — aynı şekilde üç dilde
   price       : Toptan birim fiyat (TL) — SHOW_PRICES false iken görünmez
   oldPrice    : İndirim varsa eski fiyat, yoksa null
   badge       : "Yeni", "Çok Satan", "İndirim" veya null
   colors      : Türkçe renk adları (i18n.js içinde çevrilir)
   sizes       : Serideki bedenler, ör. ["S", "M", "L", "XL"]
   asorti      : (isteğe bağlı) Bir seride her bedenden kaç adet olduğu,
                 sizes ile aynı sırada. Ör. [1, 2, 2, 1] = 1 seri 6 adet.
                 Yazılmazsa her bedenden 1 adet sayılır.
   images      : İlk fotoğraf kartta görünür, ikincisi üzerine gelince
   ========================================================= */

// Fiyatlar sitede görünsün mü? (true = görünür, false = gizli)
const SHOW_PRICES = false;

// TOPTAN: Bir modelden alınabilecek en az seri sayısı
const MIN_SERIES = 1;

const U = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${Math.round(w * 1.25)}&fit=crop&q=80&auto=format`;

const PRODUCTS = [
  {
    id: 17, code: "SM-SW-503", category: "sweat", price: 1490, oldPrice: null, badge: "Yeni",
    name: { en: "Street Edit Oversized Sweatshirt", ru: "Оверсайз-свитшот Street Edit", tr: "Street Edit Oversize Sweatshirt" },
    description: {
      en: "Heavyweight cotton, a relaxed oversized fit and pink embroidery on the chest. Pair it with black cargo trousers for the season's strongest street look.",
      ru: "Плотный хлопок, свободный оверсайз-крой и розовая вышивка на груди. В паре с чёрными брюками-карго — самый сильный уличный образ сезона.",
      tr: "Kalın dokulu pamuk, rahat oversize kalıp ve göğüste pembe nakış detayı. Siyah kargo pantolonla sezonun en güçlü sokak kombini.",
    },
    colors: ["Ekru / Pembe"], sizes: ["S", "M", "L", "XL", "XXL"],
    images: ["assets/urunler/beyaz-sweat-model.jpg"],
  },
  {
    id: 6, code: "SM-TS-301", category: "tisort", price: 590, oldPrice: null, badge: "Çok Satan",
    name: { en: "Essential White T-Shirt", ru: "Базовая белая футболка", tr: "Essential Beyaz T-Shirt" },
    description: {
      en: "Heavyweight cotton with a collar that keeps its shape. A true wardrobe essential.",
      ru: "Плотный хлопок и ворот, сохраняющий форму. Настоящая база гардероба.",
      tr: "Kalın gramajlı pamuk, formunu kaybetmeyen yaka. Gardırobun olmazsa olmazı.",
    },
    colors: ["Beyaz", "Siyah"], sizes: ["S", "M", "L", "XL", "XXL"],
    images: [U("1521572163474-6864f9cf17ab")],
  },
  {
    id: 7, code: "SM-TS-302", category: "tisort", price: 690, oldPrice: null, badge: "Yeni",
    name: { en: "Oversized Graphic T-Shirt", ru: "Оверсайз-футболка с принтом", tr: "Oversize Baskılı T-Shirt" },
    description: {
      en: "A dropped-shoulder oversized fit with a front print. A streetwear favourite.",
      ru: "Оверсайз-крой со спущенным плечом и принтом спереди. Фаворит стритвира.",
      tr: "Düşük omuz oversize kalıp, ön baskı detayı. Sokak stilinin favorisi.",
    },
    colors: ["Siyah"], sizes: ["S", "M", "L", "XL"],
    images: [U("1503341504253-dff4815485f1")],
  },
  {
    id: 8, code: "SM-TS-303", category: "tisort", price: 650, oldPrice: null, badge: null,
    name: { en: "Studious Logo T-Shirt", ru: "Футболка с логотипом Studious", tr: "Studious Logo T-Shirt" },
    description: {
      en: "Embroidered chest logo, regular fit. Minimal and signature.",
      ru: "Вышитый логотип на груди, классический крой. Минимализм и узнаваемость.",
      tr: "Göğüste işlemeli logo, regular kalıp. Minimal ve imza niteliğinde.",
    },
    colors: ["Siyah", "Beyaz"], sizes: ["S", "M", "L", "XL", "XXL"],
    images: [U("1618354691373-d851c5c3a990")],
  },
];

/* =========================================================
   ANA SAYFA AFİŞİ (en üstteki bölüm)
   ---------------------------------------------------------
   Başlıkta her zaman marka adı görünür. Listedeki ilk kayıt kullanılır.
   product : Yukarıdaki listeden ürün id'si (fotoğrafa tıklayınca açılır)
   image   : Afişte görünecek büyük fotoğraf
   focus   : Fotoğraf kırpılırken ortada kalacak nokta
   ========================================================= */
const HERO_SLIDES = [
  {
    product: 17,
    image: "assets/urunler/beyaz-sweat-model.jpg",
    focus: "50% 30%",
    hotspot: { x: 40, y: 70 },
    eyebrow: { en: "Wholesale · New Season", ru: "Оптом · Новый сезон", tr: "Toptan · Yeni Sezon" },
    text: {
      en: "Wholesale menswear from Istanbul for boutiques and retailers. Sold by series, shipped worldwide.",
      ru: "Мужская одежда оптом из Стамбула для бутиков и магазинов. Продажа сериями, доставка по всему миру.",
      tr: "Butik ve mağazalar için İstanbul'dan toptan erkek giyim. Seri halinde satış, dünyanın her yerine gönderim.",
    },
    label: "Street Edit",
  },
];
