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
              .select('business_name, business_code, status, deleted_at')
              .eq('id', profile.business_id)
              .single()
            if (!business || business.deleted_at || business.status !== 'active') {
              await supabase.auth.signOut()
              throw new Error('Akun bisnis tidak aktif. Hubungi administrator.')
            }
            profile.business_name = business.business_name
            profile.business_code = business.business_code

            // Staff login validation
            if (profile.role === 'staff' && profile.can_login === false) {
              await supabase.auth.signOut()
              throw new Error('Akun ini tidak memiliki hak akses login.')
            }

            if (profile.is_active === false || profile.deleted_at) {
              await supabase.auth.signOut()
              throw new Error('Akun staff telah dinonaktifkan atau dihapus. Hubungi pemilik bisnis.')
            }
          }

          set({ user: profile, isLoading: false })
          return profile.role
        } catch (err) {
          const message = (err as Error).message
          let userFriendlyMessage = message
          if (/invalid login credentials/i.test(message)) {
            userFriendlyMessage = 'Email atau password salah.'
          } else if (/banned/i.test(message)) {
            userFriendlyMessage = email.toLowerCase().includes('@union-pos.id')
              ? 'Akun staff telah dinonaktifkan atau dihapus. Hubungi pemilik bisnis.'
              : 'Akun bisnis tidak aktif. Hubungi administrator.'
          }
          set({
            error: userFriendlyMessage,
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
