# Rosita Beauty Salon — Website (Frontend + Backend + Database)

Website Rosita Salon lengkap dengan:
- Landing page (React + Vite + Tailwind + Framer Motion)
- Backend API (Node.js + Express) dengan database **PostgreSQL di Supabase**
- Login untuk **admin** dan **customer** (customer bebas pakai email pribadi)
- Reservasi **wajib login**, slot jam real-time, anti double booking
- Dashboard admin: ringkasan, jadwal harian, ubah jadwal, input walk-in, moderasi testimoni
- AI Booking Assistant (Google Gemini)
- Siap di-deploy ke **Vercel** (frontend + backend dalam satu project)

## Struktur proyek

```
rosita-fullstack-app/
├─ src/                     <- Frontend (React)
│  ├─ api/client.js         <- Wrapper fetch ke backend API
│  ├─ components/           <- Komponen UI (BookingModal, Dashboard/, Auth/, ...)
│  └─ data/salonData.js     <- Daftar layanan, harga, promo (dipakai juga oleh AI)
├─ server/                  <- Backend (Express + Postgres)
│  ├─ sql/schema.sql        <- Struktur database (jalankan di Supabase SQL Editor)
│  ├─ src/
│  │  ├─ app.js             <- Aplikasi Express (dipakai lokal & Vercel)
│  │  ├─ index.js           <- Menjalankan server di laptop (npm run dev)
│  │  ├─ db.js              <- Koneksi Postgres (DATABASE_URL)
│  │  ├─ routes/            <- auth, reservations, testimonials, ai
│  │  └─ utils/slots.js     <- Jam operasional & kapasitas slot
│  └─ .env.example
├─ api/index.js             <- Entry point Vercel (memakai server/src/app.js)
├─ vercel.json              <- Konfigurasi deploy Vercel
└─ .vercelignore            <- File yang tidak ikut di-upload ke Vercel
```

## Cara setup dari nol

### 1. Siapkan database di Supabase

1. Buat project baru di https://supabase.com/dashboard (simpan **password database**-nya).
2. Buka **SQL Editor** → **New query**, tempel isi `server/sql/schema.sql`, klik **Run**.
   Ini membuat tabel `users`, `reservations`, dan `testimonials` (dengan RLS aktif).
3. Ambil connection string: tombol **Connect** → **Direct** → **Transaction pooler**
   (port `6543`), lalu ganti `[YOUR-PASSWORD]` dengan password database.

### 2. Setup & jalankan backend (API)

```bash
cd server
npm install
copy .env.example .env      (Windows) atau  cp .env.example .env (Mac/Linux)
```

Isi file `server/.env`:
- `DATABASE_URL` — connection string dari langkah 1
- `JWT_SECRET` — string acak minimal 32 karakter. Cara bikinnya:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `GEMINI_API_KEY` (opsional) — dari https://aistudio.google.com/apikey (pakai tombol **Copy key**).
  Kalau dikosongkan, fitur AI otomatis nonaktif.

Buat akun admin pertama:
```bash
npm run seed:admin
```
Kalau `ADMIN_PASSWORD` di `.env` dikosongkan, script akan membuatkan password acak yang kuat dan menampilkannya **sekali** di terminal. Password lemah seperti `admin123` akan ditolak.

Jalankan server API:
```bash
npm run dev
```
Kalau berhasil akan muncul:
```
🚀 Rosita Salon API jalan di http://localhost:4000
✅ Koneksi database Postgres (Supabase) berhasil.
```
> Kalau `server/.env` diubah, **restart** server (Ctrl+C lalu `npm run dev` lagi) — perubahan `.env` tidak terbaca otomatis.

### 3. Setup & jalankan frontend

Buka terminal baru (biarkan terminal backend tetap jalan), lalu di folder utama project:
```bash
npm install
npm run dev
```
Buka `http://localhost:5173`.

## Deploy ke Vercel

Frontend dan backend di-deploy sebagai **satu project** Vercel: frontend jadi web statis,
backend Express jadi Serverless Function di `/api` (lihat `api/index.js` & `vercel.json`).

1. Login Vercel CLI (sekali saja):
   ```bash
   npx vercel login
   ```
2. Deploy dari folder utama project:
   ```bash
   npx vercel --prod
   ```
3. Di dashboard Vercel → project → **Settings → Environment Variables**, isi:
   `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, `SLOT_CAPACITY`.
   Lalu **Redeploy** supaya variabelnya terbaca.

Region function diset ke `icn1` (Seoul) di `vercel.json` supaya dekat dengan database Supabase.
Kalau project Supabase kamu di region lain, sesuaikan region-nya.

## Cara pakai

- **Customer**: klik "Masuk" atau coba "Book Appointment" langsung → akan diarahkan untuk Daftar dulu → setelah daftar/login, form reservasi otomatis muncul. Setelah tersimpan, ada tombol untuk mengirim detailnya ke WhatsApp salon.
- **Admin**: login pakai akun yang dibuat lewat `npm run seed:admin`, lalu klik "Dashboard Admin" di navbar. Ada tab **Reservasi** (konfirmasi, selesai, batal, ubah jadwal, chat WA), **Jadwal Harian**, dan **Testimoni** (hapus spam). Tombol **Tambah Reservasi** untuk mencatat pelanggan walk-in / lewat telepon.
- **Customer** yang sudah login bisa klik nama mereka di navbar untuk melihat "Reservasi Saya" dan membatalkan reservasi yang masih "Menunggu Konfirmasi".

## Sistem booking

- Slot jam diatur di `server/src/utils/slots.js` (09.00 - 19.00, durasi 1 jam).
- Kapasitas per slot (jumlah terapis) diatur lewat `SLOT_CAPACITY` di `server/.env` / Vercel.
- Booking **Menunggu Konfirmasi** dan **Terkonfirmasi** sama-sama memakai kuota slot;
  yang **Dibatalkan** langsung membebaskan kuota.
- Form booking hanya menampilkan jam yang masih kosong; server juga mengecek ulang
  (dengan advisory lock Postgres) supaya tidak ada double booking walau 2 orang menekan tombol bersamaan.
- Satu customer maksimal punya 3 reservasi aktif.
- Customer yang membatalkan reservasi tidak menghapus data, hanya mengubah status
  jadi "Dibatalkan" supaya riwayatnya tetap terlihat oleh admin.

## Catatan keamanan sebelum go-live

- Isi `JWT_SECRET` dengan string acak yang panjang (wajib di Vercel / `NODE_ENV=production`).
- Gunakan password database Supabase yang acak dan panjang.
- Jangan pernah menulis API key / password langsung di kode atau di file `.env.example`.
- Jangan commit file `.env` ke Git (sudah ada di `.gitignore` dan `.vercelignore`).
- RLS aktif di semua tabel, jadi data tidak bisa dibaca lewat API publik Supabase.
- Login, registrasi, reservasi, testimoni, dan chat AI sudah diberi rate limit
  (in-memory: di Vercel batasnya per instance, cukup untuk skala kecil).
