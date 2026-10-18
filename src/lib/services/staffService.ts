import { supabase } from '../supabase'
import type { UserProfile, StaffFormData } from '../../types'

const FUNCTION_NAME = 'manage-staff'

async function callStaffFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

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
    console.error('manage-staff Edge Function Error:', { error, detailedMessage })
    throw new Error(detailedMessage)
  }

  if (data?.error) throw new Error(data.error)
  return data.data as T
}

export interface StaffPaginationResult {
  data: UserProfile[]
  count: number
}

export async function fetchStaffByBusiness(
  businessId: string,
  options?: {
    page?: number
    pageSize?: number
    search?: string
  },
): Promise<StaffPaginationResult> {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const search = options?.search?.trim()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('role', 'staff')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,position.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return {
    data: (data ?? []) as UserProfile[],
    count: count ?? 0,
  }
}

export async function createStaff(
  businessId: string,
  formData: StaffFormData,
): Promise<UserProfile> {
  return callStaffFunction<UserProfile>({
    action: 'create',
    business_id: businessId,
    ...formData,
  })
}

export async function updateStaff(
  id: string,
  formData: Partial<StaffFormData>,
): Promise<UserProfile> {
  return callStaffFunction<UserProfile>({
    action: 'update',
    id,
    ...formData,
  })
}

export async function deleteStaff(id: string): Promise<void> {
  await callStaffFunction<{ id: string }>({
    action: 'delete',
    id,
  })
}
