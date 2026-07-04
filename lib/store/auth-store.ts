import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status?: 'active' | 'suspended'
  emailVerified: boolean
  planId?: string | null
  bonusTokens?: number
  createdAt: string
}

export interface Allowance {
  plan: { id: string; name: string; dailyTokenLimit: number } | null
  dailyLimit: number
  usedToday: number
  bonusTokens: number
  remaining: number
}

interface AuthState {
  user: User | null
  allowance: Allowance | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setAllowance: (allowance: Allowance | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      allowance: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setAllowance: (allowance) => set({ allowance }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, allowance: null }),
    }),
    {
      name: 'flowai-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
