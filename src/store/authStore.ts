import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserRole } from '../types'

// ─── Mock credentials for local development (no Supabase needed) ──────────────
// Remove / replace with real Supabase Auth when env vars are configured.
const MOCK_USERS: Record<string, { password: string; profile: UserProfile }> = {
  'superadmin@unionpos.com': {
    password: 'admin123',
    profile: {
      id: 'mock-superadmin-001',
      email: 'superadmin@unionpos.com',
      full_name: 'Super Admin',
      role: 'superadmin',
    },
  },
  'owner@demo.com': {
    password: 'owner123',
    profile: {
      id: 'mock-owner-001',
      email: 'owner@demo.com',
      full_name: 'Budi Santoso',
      role: 'owner',
      business_id: 'biz-001',
    },
  },
  'kasir@demo.com': {
    password: 'kasir123',
    profile: {
      id: 'mock-kasir-001',
      email: 'kasir@demo.com',
      full_name: 'Siti Rahayu',
      role: 'kasir',
      business_id: 'biz-001',
    },
  },
}

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<UserRole | null>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })

        // ── Try mock auth first (works without Supabase env vars) ────────────
        await new Promise((r) => setTimeout(r, 600)) // simulate network delay
        const mockUser = MOCK_USERS[email.toLowerCase()]
        if (mockUser && mockUser.password === password) {
          set({ user: mockUser.profile, isLoading: false })
          return mockUser.profile.role
        }

        // ── Real Supabase Auth (uncomment when env vars are configured) ──────
        // try {
        //   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        //   if (error) throw error
        //   const { data: profile } = await supabase
        //     .from('profiles')
        //     .select('*')
        //     .eq('id', data.user.id)
        //     .single()
        //   set({ user: profile, isLoading: false })
        //   return profile.role
        // } catch (err) {
        //   set({ error: (err as Error).message, isLoading: false })
        //   return null
        // }

        set({ error: 'Email atau password salah.', isLoading: false })
        return null
      },

      logout: () => {
        // supabase.auth.signOut() // uncomment when Supabase is connected
        set({ user: null, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'union-pos-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
