// =====================================================================
// src/context/AuthContext.jsx
// =====================================================================
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, getToken, setToken, clearToken, UNAUTHORIZED_EVENT } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Saat aplikasi pertama kali dibuka, coba restore sesi dari token tersimpan
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Token ditolak server di tengah jalan (kedaluwarsa) -> anggap logout
  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { token, user } = await authApi.login({ email, password });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async ({ name, email, password, phone }) => {
    const { token, user } = await authApi.register({ name, email, password, phone });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  // Ganti password lewat token dari link email, lalu langsung masuk
  const resetPassword = useCallback(async ({ token, password }) => {
    const { token: authToken, user } = await authApi.resetPassword({ token, password });
    setToken(authToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    isLoading,
    login,
    register,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  }
  return ctx;
}
