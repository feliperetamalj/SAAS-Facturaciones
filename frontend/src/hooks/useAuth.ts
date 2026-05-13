import { create } from "zustand";
import { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem("alr_user") ?? "null"); } catch { return null; }
  })(),
  token: localStorage.getItem("alr_token"),

  login: async (email, password) => {
    const { data } = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("alr_token", data.token);
    localStorage.setItem("alr_user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },

  logout: () => {
    localStorage.removeItem("alr_token");
    localStorage.removeItem("alr_user");
    set({ token: null, user: null });
  },

  isAuthenticated: () => !!get().token && !!get().user,
}));
