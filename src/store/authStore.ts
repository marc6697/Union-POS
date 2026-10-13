import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, UserRole } from '../types'
import { supabase } from '../lib/supabase';



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

    

        // ── Real Supabase Auth (uncomment when env vars are configured) ──────
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()
          set({ user: profile, isLoading: false })
          return profile.role
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false })
          return null
        }

        set({ error: 'Email atau password salah.', isLoading: false })
        return null
      },

      logout: () => {
        supabase.auth.signOut() 
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
