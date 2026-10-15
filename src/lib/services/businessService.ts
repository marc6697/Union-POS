import { supabase } from '../supabase'
import type { Business, BusinessFormData, BusinessStatus } from '../../types'

const TABLE = 'businesses'
const FUNCTION_NAME = 'manage-business'

/**
 * Writes go through the `manage-business` Edge Function (trusted server layer):
 * it creates the owner's auth account, enforces superadmin-only access and bans
 * the owner when the business is inactive. Reads use RLS directly.
 */
async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    console.warn('Peringatan: Tidak ada session token aktif di supabase.auth.getSession()')
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (error) {
    let detailedMessage = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      const status = ctx.status
      let raw = ''
      try {
        raw = await ctx.clone().text()
      } catch {
        // body unreadable
      }
      let serverMessage = raw
      try {
        const payload = JSON.parse(raw)
        serverMessage = payload?.error ?? payload?.message ?? payload?.msg ?? raw
      } catch {
        // not JSON, keep raw text
      }
      detailedMessage = `${serverMessage || error.message} (HTTP ${status})`
    }
    console.error('Edge Function Error:', { error, detailedMessage })
    throw new Error(detailedMessage)
  }
  if (data?.error) throw new Error(data.error)
  return data.data as T
}

export async function fetchBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Business[]
}

export function createBusiness(payload: BusinessFormData): Promise<Business> {
  return callFunction<Business>({ action: 'create', ...payload })
}

export function updateBusiness(id: string, payload: BusinessFormData): Promise<Business> {
  return callFunction<Business>({ action: 'update', id, ...payload })
}

export function toggleBusinessStatus(
  id: string,
  current: BusinessStatus,
): Promise<Business> {
  const status: BusinessStatus = current === 'active' ? 'inactive' : 'active'
  return callFunction<Business>({ action: 'set_status', id, status })
}

export async function deleteBusiness(id: string): Promise<void> {
  await callFunction<{ id: string }>({ action: 'delete', id })
}
