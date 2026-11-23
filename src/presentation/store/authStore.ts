import { create } from 'zustand';
import { Usuario } from '../../domain/entities';

interface AuthState {
  user: Usuario | null;
  isHydrated: boolean;
  isRecoveryFlow: boolean;
  setUser: (user: Usuario | null) => void;
  setHydrated: (hydrated: boolean) => void;
  setRecoveryFlow: (active: boolean) => void;
  markPasswordChanged: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  isRecoveryFlow: false,
  setUser: (user) => set({ user }),
  setHydrated: (isHydrated) => set({ isHydrated }),
  setRecoveryFlow: (isRecoveryFlow) => set({ isRecoveryFlow }),
  markPasswordChanged: () =>
    set((state) => ({
      user: state.user ? { ...state.user, mustChangePassword: false } : null,
      isRecoveryFlow: false,
    })),
  clearSession: () => set({ user: null, isRecoveryFlow: false }),
}));