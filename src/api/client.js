// =====================================================================
// src/api/client.js
// Wrapper fetch ke backend API + helper auth token
// =====================================================================

// Ganti/override lewat file .env di root frontend: VITE_API_URL=http://localhost:4000/api
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const TOKEN_KEY = "rosita_token";

// Event yang dipancarkan saat token ditolak server (kedaluwarsa / akun dihapus),
// didengarkan AuthContext supaya user otomatis ter-logout di tampilan.
export const UNAUTHORIZED_EVENT = "rosita:unauthorized";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke server. Cek koneksi internet kamu lalu coba lagi.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response tanpa body (jarang terjadi)
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const message = data?.error || "Terjadi kesalahan, silakan coba lagi.";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

// -------------------------
// AUTH
// -------------------------
export const authApi = {
  register: (payload) => apiFetch("/auth/register", { method: "POST", body: payload }),
  login: (payload) => apiFetch("/auth/login", { method: "POST", body: payload }),
  me: () => apiFetch("/auth/me", { auth: true }),
};

// -------------------------
// RESERVATIONS
// -------------------------
export const reservationApi = {
  create: (payload) => apiFetch("/reservations", { method: "POST", body: payload, auth: true }),
  list: () => apiFetch("/reservations", { auth: true }),
  availability: (date) =>
    apiFetch(`/reservations/availability?date=${encodeURIComponent(date)}`, { auth: true }),
  updateStatus: (id, status) =>
    apiFetch(`/reservations/${id}/status`, { method: "PATCH", body: { status }, auth: true }),
  reschedule: (id, { date, time }) =>
    apiFetch(`/reservations/${id}/schedule`, { method: "PATCH", body: { date, time }, auth: true }),
  cancel: (id) => apiFetch(`/reservations/${id}`, { method: "DELETE", auth: true }),
};

// -------------------------
// TESTIMONIALS
// -------------------------
export const testimonialApi = {
  list: () => apiFetch("/testimonials"),
  create: (payload) => apiFetch("/testimonials", { method: "POST", body: payload, auth: true }),
  remove: (id) => apiFetch(`/testimonials/${id}`, { method: "DELETE", auth: true }),
};

// -------------------------
// AI ASSISTANT
// -------------------------
export const aiApi = {
  chat: (payload) => apiFetch("/ai/chat", { method: "POST", body: payload, auth: true }),
};
