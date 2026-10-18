import { supabase } from '../supabase'
import type { BusinessSettings } from '../../types'

const TABLE = 'business_settings'

/**
 * Nilai default jika entri pengaturan bisnis belum dibuat di database.
 */
export function getDefaultSettings(businessId: string): BusinessSettings {
  const now = new Date().toISOString()
  return {
    business_id: businessId,
    tax_enabled: false,
    tax_rate: 10,
    receipt_footer: null,
    created_at: now,
    updated_at: now,
  }
}

/**
 * Mengambil pengaturan bisnis. Jika row belum ada, mengembalikan nilai default.
 */
export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat pengaturan bisnis: ${error.message}`)
  }

  if (!data) {
    return getDefaultSettings(businessId)
  }

  return {
    business_id: data.business_id,
    tax_enabled: Boolean(data.tax_enabled),
    tax_rate: Number(data.tax_rate ?? 10),
    receipt_footer: data.receipt_footer ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

/**
 * Menyimpan atau memperbarui pengaturan bisnis (hanya pemilik bisnis atau superadmin yang diizinkan).
 */
export async function upsertBusinessSettings(
  businessId: string,
  settings: Partial<Pick<BusinessSettings, 'tax_enabled' | 'tax_rate' | 'receipt_footer'>>,
): Promise<BusinessSettings> {
  const payload = {
    business_id: businessId,
    ...(settings.tax_enabled !== undefined ? { tax_enabled: settings.tax_enabled } : {}),
    ...(settings.tax_rate !== undefined ? { tax_rate: settings.tax_rate } : {}),
    ...(settings.receipt_footer !== undefined ? { receipt_footer: settings.receipt_footer } : {}),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'business_id' })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Gagal menyimpan pengaturan bisnis: ${error.message}`)
  }

  return {
    business_id: data.business_id,
    tax_enabled: Boolean(data.tax_enabled),
    tax_rate: Number(data.tax_rate ?? 10),
    receipt_footer: data.receipt_footer ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}
