-- =====================================================================
-- server/sql/schema.sql
-- Jalankan file ini di phpMyAdmin (Laragon) atau lewat MySQL client
-- untuk membuat database & tabel yang dibutuhkan.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS rosita_salon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rosita_salon;

-- -------------------------------------------------
-- Tabel users: menyimpan akun admin & customer
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------
-- Tabel reservations: menyimpan data booking
-- ('temporary' & expires_at tidak dipakai lagi, dibiarkan untuk kompatibilitas)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  whatsapp VARCHAR(30) NOT NULL,
  service_name VARCHAR(150) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  end_time TIME NULL,
  notes TEXT NULL,
  status ENUM('temporary', 'pending', 'confirmed', 'cancelled', 'done') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reservations_slot (reservation_date, reservation_time, status),
  CONSTRAINT fk_reservations_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------
-- Tabel testimonials: ulasan dari customer yang login
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_testimonials_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT testimonials_chk_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- Catatan:
-- Akun admin TIDAK dibuat manual lewat SQL ini, tapi lewat script
-- "npm run seed:admin" di folder server (supaya password ter-hash dengan aman).
