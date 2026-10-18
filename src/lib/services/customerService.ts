import { supabase } from '../supabase'
import type { Customer, CustomerFormData } from '../../types'

const TABLE = 'customers'

export interface CustomerPaginationResult {
  data: Customer[]
  count: number
}

export async function fetchCustomersByBusiness(
  businessId: string,
  options?: {
    page?: number
    pageSize?: number
    search?: string
  },
): Promise<CustomerPaginationResult> {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const search = options?.search?.trim()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from(TABLE)
    .select('*, creator:profiles!customers_created_by_fkey(id, full_name, role)', { count: 'exact' })
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%,address.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    // Fallback jika foreign key join alias belum terdeteksi
    let fallbackQuery = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%,email.ilike.%${search}%,address.ilike.%${search}%`)
    }

    const { data: fallbackData, count: fallbackCount, error: fallbackError } = await fallbackQuery
    if (fallbackError) throw new Error(fallbackError.message)

    return {
      data: (fallbackData ?? []) as Customer[],
      count: fallbackCount ?? 0,
    }
  }

  return {
    data: (data ?? []) as Customer[],
    count: count ?? 0,
  }
}

export async function createCustomer(
  businessId: string,
  formData: CustomerFormData,
  createdBy?: string,
): Promise<Customer> {
  const payload = {
    business_id: businessId,
    created_by: createdBy || null,
    name: formData.name.trim(),
    phone_number: formData.phone_number.trim(),
    email: formData.email.trim() || null,
    address: formData.address.trim() || null,
    notes: formData.notes.trim() || null,
    is_active: formData.is_active,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([payload])
    .select('*, creator:profiles!customers_created_by_fkey(id, full_name, role)')
    .single()

  if (error) {
    // Fallback jika foreign key join gagal
    const { data: fallback, error: fallbackErr } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single()
    if (fallbackErr) throw new Error(fallbackErr.message)
    return fallback as Customer
  }

  return data as Customer
}

export async function updateCustomer(
  id: string,
  formData: Partial<CustomerFormData>,
): Promise<Customer> {
  const payload: Record<string, unknown> = {}
  if (formData.name !== undefined) payload.name = formData.name.trim()
  if (formData.phone_number !== undefined) payload.phone_number = formData.phone_number.trim()
  if (formData.email !== undefined) payload.email = formData.email.trim() || null
  if (formData.address !== undefined) payload.address = formData.address.trim() || null
  if (formData.notes !== undefined) payload.notes = formData.notes.trim() || null
  if (formData.is_active !== undefined) payload.is_active = formData.is_active

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Customer
}

export async function deleteCustomer(id: string): Promise<void> {
  // Soft delete to protect past transaction records and set is_active to false
  const { error } = await supabase
    .from(TABLE)
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
