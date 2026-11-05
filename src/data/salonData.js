// =====================================================================
// src/data/salonData.js
// Data layanan diambil & disesuaikan dari pricelist asli Rosita Salon
// (Hair Service, Hair Treatment, Beauty Treatment / Nails / Face / Ear / Eyebrow)
// =====================================================================

export const SALON_INFO = {
  name: "Rosita Salon",
  tagline: "Be natural, be beautiful, be you",
  phone: "0823-2476-7956",
  whatsapp: "6282324767956", // format internasional tanpa "+" untuk wa.me
  instagram: "rosita.beautysalon",
  address: "Jl. Swadaya 1 RT 01/RW 04, Karangjati, Sampang (sebelah barat Pasar Grumung)",
  // Ganti dengan link "Bagikan" dari Google Maps kalau titik lokasi salon sudah ada di Maps
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Jl. Swadaya 1, Karangjati, Sampang, Pasar Grumung"),
  openHours: "Setiap Hari, 09.00 - 20.00 WIB",
};

// Kategori untuk filter tab di Services.jsx
export const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "hair", label: "Hair" },
  { key: "facial", label: "Facial" },
  { key: "spa", label: "Spa" },
  { key: "nail", label: "Nail" },
];

// -------------------------
// SERVICES (sesuai foto pricelist)
// -------------------------
export const services = [
  // ===== HAIR SERVICE =====
  {
    id: "hs-01",
    category: "hair",
    name: "Potong Rambut",
    price: "Rp20.000",
    description: "Potong rambut rapi dan presisi, disesuaikan bentuk wajah oleh stylist berpengalaman.",
  },
  {
    id: "hs-02",
    category: "hair",
    name: "Potong + Cuci",
    price: "Rp30.000",
    description: "Paket potong rambut lengkap dengan cuci rambut menggunakan produk premium.",
  },
  {
    id: "hs-03",
    category: "hair",
    name: "Potong + Cuci + Catok",
    price: "Rp35.000",
    description: "Tampil sempurna dari potongan, cuci, hingga hasil akhir catokan yang halus.",
    popular: true,
  },
  {
    id: "hs-04",
    category: "hair",
    name: "Catok",
    price: "Rp15.000",
    description: "Styling catok cepat untuk rambut lurus, sleek, dan tahan lama seharian.",
  },
  {
    id: "hs-05",
    category: "hair",
    name: "Cuci Catok",
    price: "Rp30.000",
    description: "Cuci rambut segar dilanjutkan catok rapi, siap untuk tampil di berbagai acara.",
  },
  {
    id: "hs-06",
    category: "hair",
    name: "Cuci Curly",
    price: "Rp35.000",
    description: "Cuci rambut dengan hasil akhir curly bervolume, cocok untuk gaya yang lebih playful.",
  },
  {
    id: "hs-07",
    category: "hair",
    name: "Cuci Blow",
    price: "Rp30.000",
    description: "Cuci rambut dengan blow styling untuk hasil bervolume dan bouncy natural.",
  },

  // ===== HAIR TREATMENT =====
  {
    id: "ht-01",
    category: "hair",
    name: "Creambath",
    price: "Rp45.000",
    description: "Pijat relaksasi kulit kepala dengan krim nutrisi untuk rambut lebih sehat & rileks.",
  },
  {
    id: "ht-02",
    category: "hair",
    name: "Creambath Makarizo",
    price: "Rp55.000",
    description: "Creambath dengan produk Makarizo untuk nutrisi ekstra dan aroma terapi menenangkan.",
  },
  {
    id: "ht-03",
    category: "hair",
    name: "Hair Mask",
    price: "Rp40.000",
    description: "Masker rambut intensif untuk melembapkan dan memperbaiki rambut kering & kusam.",
  },
  {
    id: "ht-04",
    category: "hair",
    name: "Hair Mask Keratin",
    price: "Rp50.000",
    description: "Masker keratin untuk memperkuat struktur rambut dan mengurangi kerontokan.",
  },
  {
    id: "ht-05",
    category: "hair",
    name: "Smoothing",
    price: "Rp100.000 - Rp300.000",
    description: "Pelurusan rambut untuk hasil halus, lembut, dan mudah diatur setiap hari.",
    note: "Harga menyesuaikan tebal/tipis dan panjang rambut.",
    popular: true,
  },
  {
    id: "ht-06",
    category: "hair",
    name: "Coloring / Cat Rambut",
    price: "Rp50.000 - Rp250.000",
    description: "Pewarnaan rambut penuh dengan pilihan warna sesuai keinginan dan tren terkini.",
  },
  {
    id: "ht-07",
    category: "hair",
    name: "Highlight / Aplikasi",
    price: "Rp75.000 - Rp200.000",
    description: "Teknik pewarnaan sebagian untuk dimensi warna rambut yang lebih hidup.",
  },
  {
    id: "ht-08",
    category: "hair",
    name: "Smoothing Sutra",
    price: "Rp200.000 - Rp500.000",
    description: "Smoothing premium dengan hasil akhir super halus menyerupai sutra.",
    note: "Harga tergantung tebal/tipis dan panjang rambut.",
  },
  {
    id: "ht-09",
    category: "hair",
    name: "Smoothing Keratin",
    price: "Rp350.000 - Rp700.000",
    description: "Perawatan pelurusan sekaligus nutrisi keratin dalam untuk rambut lebih kuat & berkilau.",
    note: "Harga tergantung tebal/tipis dan panjang rambut.",
  },
  {
    id: "ht-10",
    category: "hair",
    name: "Keratin Treatment",
    price: "Rp250.000 - Rp500.000",
    description: "Perawatan keratin murni untuk memperbaiki rambut rusak dari akar hingga ujung.",
    note: "Harga tergantung tebal/tipis dan panjang rambut.",
  },

  // ===== FACE TREATMENT =====
  {
    id: "fc-01",
    category: "facial",
    name: "Facial Viva",
    price: "Rp40.000",
    description: "Perawatan facial dasar untuk membersihkan wajah dan mengangkat sel kulit mati.",
  },
  {
    id: "fc-02",
    category: "facial",
    name: "Facial Wardah",
    price: "Rp45.000",
    description: "Facial dengan produk Wardah untuk kulit wajah lebih cerah dan segar.",
  },
  {
    id: "fc-03",
    category: "facial",
    name: "Totok Wajah",
    price: "Rp25.000",
    description: "Pijat totok wajah untuk melancarkan peredaran darah dan meredakan ketegangan otot wajah.",
  },

  // ===== EAR & EYEBROW TREATMENT (masuk kategori Spa) =====
  {
    id: "sp-01",
    category: "spa",
    name: "Ear Candle",
    price: "Rp25.000",
    description: "Terapi lilin telinga untuk relaksasi dan membantu membersihkan kotoran telinga secara alami.",
  },
  {
    id: "sp-02",
    category: "spa",
    name: "Cukur Alis",
    price: "Rp5.000",
    description: "Rapikan bentuk alis agar wajah tampil lebih flawless dan terstruktur.",
  },

  // ===== NAILS TREATMENT =====
  {
    id: "nl-01",
    category: "nail",
    name: "Manicure",
    price: "Rp35.000",
    description: "Perawatan kuku tangan lengkap agar tampak rapi, bersih, dan sehat.",
  },
  {
    id: "nl-02",
    category: "nail",
    name: "Pedicure",
    price: "Rp45.000",
    description: "Perawatan kuku kaki menyeluruh untuk kaki yang halus dan segar.",
  },
  {
    id: "nl-03",
    category: "nail",
    name: "Manicure + Pedicure",
    price: "Rp75.000",
    description: "Paket lengkap perawatan kuku tangan dan kaki dalam satu sesi.",
    popular: true,
  },
  {
    id: "nl-04",
    category: "nail",
    name: "Manicure + Pedicure + Facial",
    price: "Rp120.000",
    description: "Paket relaksasi lengkap: kuku tangan, kaki, dan wajah dalam satu kunjungan.",
  },
  {
    id: "nl-05",
    category: "nail",
    name: "Manicure + Pedicure + Totok Wajah",
    price: "Rp100.000",
    description: "Kombinasi perawatan kuku dan totok wajah untuk relaksasi menyeluruh.",
  },
  {
    id: "nl-06",
    category: "nail",
    name: "Manicure + Pedicure + Massage Kaki",
    price: "Rp90.000",
    description: "Perawatan kuku dilengkapi pijat kaki untuk relaksasi maksimal.",
  },
];

// -------------------------
// PROMO (paket bundling kreatif berbasis layanan di atas)
// -------------------------
export const promos = [
  {
    id: "promo-01",
    title: "Paket Cantik Total",
    description: "Potong + Cuci + Catok, Facial Viva, dan Manicure dalam satu paket hemat.",
    originalPrice: "Rp100.000",
    discountPrice: "Rp79.000",
    badge: "Best Seller",
  },
  {
    id: "promo-02",
    title: "Glow Up Weekend",
    description: "Creambath Makarizo + Totok Wajah + Cukur Alis, sempurna untuk persiapan akhir pekan.",
    originalPrice: "Rp125.000",
    discountPrice: "Rp99.000",
    badge: "Weekend Only",
  },
  {
    id: "promo-03",
    title: "Nail & Relax Package",
    description: "Manicure + Pedicure + Massage Kaki dengan harga spesial member baru.",
    originalPrice: "Rp90.000",
    discountPrice: "Rp75.000",
    badge: "New Member",
  },
];

// -------------------------
// TESTIMONIALS (contoh/dummy, silakan ganti dengan review asli pelanggan)
// -------------------------
export const testimonials = [
  {
    id: "t1",
    name: "Ayu Lestari",
    role: "Pelanggan Setia",
    rating: 5,
    message:
      "Pelayanan di Rosita Salon selalu memuaskan, hasil smoothing-nya halus banget dan tahan lama. Terapisnya juga ramah!",
  },
  {
    id: "t2",
    name: "Dinda Ramadhani",
    role: "Karyawan Swasta",
    rating: 5,
    message:
      "Suka banget sama suasananya, bersih dan nyaman. Nail art di sini rapi dan sesuai request. Recommended!",
  },
  {
    id: "t3",
    name: "Sari Wulandari",
    role: "Ibu Rumah Tangga",
    rating: 5,
    message:
      "Facial dan totok wajahnya bikin rileks, wajah jadi lebih segar. Harganya juga bersahabat di kantong.",
  },
];

// -------------------------
// GALLERY (placeholder image, silakan ganti dengan foto asli salon)
// -------------------------
export const gallery = [
  {
    id: "g1",
    alt: "Perawatan rambut di Rosita Salon",
    image:
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g2",
    alt: "Suasana interior Rosita Salon",
    image:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g3",
    alt: "Proses hair coloring",
    image:
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g4",
    alt: "Perawatan nail art",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g5",
    alt: "Perawatan facial dan totok wajah",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "g6",
    alt: "Hasil hairstyling Rosita Salon",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop",
  },
];

// Nama layanan untuk paket promo di form booking
// (dipakai juga oleh backend AI supaya namanya konsisten)
export const promoServiceName = (promo) => `Promo ${promo.title}`;

// Pilihan layanan di form booking, dikelompokkan per kategori
export const BOOKING_GROUPS = [
  {
    label: "Promo Spesial",
    options: promos.map((p) => ({ name: promoServiceName(p), price: p.discountPrice })),
  },
  ...CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
    label: c.label,
    options: services
      .filter((s) => s.category === c.key)
      .map((s) => ({ name: s.name, price: s.price })),
  })),
];

export function findBookingOption(name) {
  for (const group of BOOKING_GROUPS) {
    const option = group.options.find((o) => o.name === name);
    if (option) return option;
  }
  return null;
}

// Ubah nomor lokal "08xx" jadi format wa.me "628xx"
export function toWhatsAppNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}