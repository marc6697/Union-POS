import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { fetchBusinessById } from '../lib/services/businessService'

/**
 * Hook to retrieve the current user's business name.
 * Uses cached name in UserProfile if present, or fetches from Supabase.
 */
export function useBusinessName(): string {
  const user = useAuthStore((s) => s.user)
  const [businessName, setBusinessName] = useState<string>(user?.business_name || '')

  useEffect(() => {
    if (businessName || !user?.business_id) return

    fetchBusinessById(user.business_id)
      .then((biz) => {
        if (biz?.business_name) {
          setBusinessName(biz.business_name)
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil nama bisnis:', err)
      })
  }, [user?.business_id, businessName])

  return businessName
}
