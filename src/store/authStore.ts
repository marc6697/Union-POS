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

          if (!profile) {
            await supabase.auth.signOut()
            throw new Error('Profil akun tidak ditemukan.')
          }

          // Superadmin is always active. Everyone else must belong to an active business.
          if (profile.role !== 'superadmin') {
            const { data: business } = await supabase
              .from('businesses')
              .select('business_name, status, deleted_at')
              .eq('id', profile.business_id)
              .single()
            if (!business || business.deleted_at || business.status !== 'active') {
              await supabase.auth.signOut()
              throw new Error('Akun bisnis tidak aktif. Hubungi administrator.')
            }
            profile.business_name = business.business_name
          }

          set({ user: profile, isLoading: false })
          return profile.role
        } catch (err) {
          const message = (err as Error).message
          set({
            error: /banned/i.test(message)
              ? 'Akun bisnis tidak aktif. Hubungi administrator.'
              : message,
            isLoading: false,
          })
          return null
        }
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
