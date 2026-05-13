import { create } from "zustand";

interface MesState {
  mes: string;
  setMes: (mes: string) => void;
}

export const useMes = create<MesState>((set) => ({
  mes: new Date().toISOString().slice(0, 7),
  setMes: (mes) => set({ mes }),
}));
