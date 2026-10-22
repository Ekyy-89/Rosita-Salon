# Rosita Beauty Salon — Website (Frontend + Backend + Database)

Website Rosita Salon lengkap dengan:
- Landing page (React + Vite + Tailwind + Framer Motion)
- Backend API (Node.js + Express) dengan database MySQL
- Login untuk **admin** dan **customer** (customer bebas pakai email pribadi)
- Reservasi **wajib login**, dan datanya tersimpan ke database

## Struktur proyek

```
rosita-beauty-salon/
├─ src/                     <- Frontend (React)
│  ├─ api/client.js         <- Wrapper fetch ke backend API
│  ├─ context/AuthContext.jsx
│  ├─ components/
│  │  ├─ Auth/AuthModal.jsx        <- Modal Login & Daftar
│  │  ├─ Dashboard/ReservationDashboard.jsx <- Dashboard admin & customer
│  │  ├─ BookingModal.jsx          <- Form reservasi (wajib login)
│  │  └─ ...komponen lain
│  └─ ...
├─ server/                  <- Backend (Express + MySQL)
│  ├─ sql/schema.sql        <- Struktur database (jalankan dulu di phpMyAdmin)
│  ├─ src/
│  │  ├─ index.js           <- Entry point server
│  │  ├─ db.js               <- Koneksi MySQL
│  │  ├─ routes/auth.routes.js
│  │  ├─ routes/reservations.routes.js
│  │  ├─ middleware/auth.js
│  │  └─ utils/seedAdmin.js <- Bikin akun admin pertama
│  └─ .env.example
└─ .env.example             <- Env frontend (VITE_API_URL)
```

## Cara setup dari nol (lewat Laragon)

### 1. Siapkan database

1. Buka Laragon, klik **Database** (akan buka phpMyAdmin/HeidiSQL).
2. Buka file `server/sql/schema.sql`, copy semua isinya.
3. Jalankan (Execute/Run SQL) di phpMyAdmin — ini akan membuat database `rosita_salon` beserta tabel `users`, `reservations`, dan `testimonials`.

### 2. Setup & jalankan backend (API)

```bash
cd server
npm install
copy .env.example .env      (Windows) atau  cp .env.example .env (Mac/Linux)
```

Buka file `.env` yang baru dibuat, cek/sesuaikan (default Laragon biasanya sudah pas):
```
DB_USER=root
DB_PASSWORD=
```

Isi juga `JWT_SECRET` dengan string acak (minimal 32 karakter). Cara bikinnya:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Kalau mau pakai AI Asisten, isi `GEMINI_API_KEY` dengan API key dari https://aistudio.google.com/apikey (pakai tombol **Copy key** supaya tidak salah huruf). Kalau dikosongkan, fitur AI otomatis nonaktif.

Buat akun admin pertama:
```bash
npm run seed:admin
```
Kalau `ADMIN_PASSWORD` di `.env` dikosongkan, script akan membuatkan password acak yang kuat dan menampilkannya **sekali** di terminal. Password lemah seperti `admin123` akan ditolak.

Jalankan server API:
```bash
npm run dev
```
Kalau berhasil akan muncul: `🚀 Rosita Salon API jalan di http://localhost:4000`

### 3. Setup & jalankan frontend

Buka terminal baru (biarkan terminal backend tetap jalan), lalu di folder utama project:
```bash
npm install
copy .env.example .env      (Windows) atau  cp .env.example .env (Mac/Linux)
npm run dev
```
Buka `http://localhost:5173`.

## Cara pakai

- **Customer**: klik "Masuk" atau coba "Book Appointment" langsung → akan diarahkan untuk Daftar dulu pakai email pribadi mereka → setelah daftar/login, form reservasi otomatis muncul. Reservasi tersimpan ke database, dan WhatsApp admin otomatis terbuka juga sebagai notifikasi cepat.
- **Admin**: login pakai akun yang dibuat lewat `npm run seed:admin`. Setelah login, klik "Dashboard Admin" di navbar untuk melihat SEMUA reservasi dan mengubah statusnya (Menunggu / Terkonfirmasi / Selesai / Dibatalkan).
- **Customer** yang sudah login juga bisa klik nama mereka di navbar untuk melihat "Reservasi Saya" dan membatalkan reservasi yang masih berstatus "Menunggu Konfirmasi".

## Deploy ke Laragon (production/build)

1. Build backend tetap jalan sebagai proses Node terpisah (`npm start` di folder `server`) — backend TIDAK di-build, dia jalan terus sebagai server.
2. Build frontend: `npm run build` di folder utama → copy isi folder `dist` ke `www/rosita-salon` seperti biasa.
3. Di `.env` frontend sebelum build, pastikan `VITE_API_URL` mengarah ke alamat backend yang bisa diakses publik (bukan `localhost` kalau nanti online beneran).

## Sistem booking

- Slot jam diatur di `server/src/utils/slots.js` (09.00 - 19.00, durasi 1 jam).
- Kapasitas per slot (jumlah terapis) diatur lewat `SLOT_CAPACITY` di `server/.env`.
- Form booking hanya menampilkan jam yang masih kosong; server juga mengecek ulang
  supaya tidak ada double booking walau 2 orang menekan tombol bersamaan.
- Satu customer maksimal punya 3 reservasi aktif.
- Customer yang membatalkan reservasi tidak menghapus data, hanya mengubah status
  jadi "Dibatalkan" supaya riwayatnya tetap terlihat oleh admin.

## Catatan keamanan sebelum go-live

- Isi `JWT_SECRET` di `server/.env` dengan string acak yang panjang (wajib kalau `NODE_ENV=production`).
- Jangan pernah menulis API key / password langsung di kode atau di file `.env.example`.
- Jangan commit file `.env` ke Git (sudah ada di `.gitignore`).
- Login, registrasi, reservasi, testimoni, dan chat AI sudah diberi rate limit.
- Kalau server dipasang di belakang reverse proxy, set `TRUST_PROXY=1` supaya rate limit membaca IP asli.
