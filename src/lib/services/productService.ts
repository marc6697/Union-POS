import { supabase } from '../supabase'
import type { ProductItem, ProductFormData } from '../../types'

const TABLE = 'products'

/** Generate SKU otomatis jika kosong: misal PRD-9X2K4L atau SRV-8M1N5K */
export function generateAutoSku(type: 'product' | 'service' = 'product'): string {
  const prefix = type === 'service' ? 'SRV' : 'PRD'
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${randomPart}`
}

export async function fetchProductsByBusiness(businessId: string): Promise<ProductItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductItem[]
}

export async function fetchActiveProductsByBusiness(businessId: string): Promise<ProductItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductItem[]
}

export async function createProduct(
  businessId: string,
  formData: ProductFormData,
): Promise<ProductItem> {
  // Jika sku kosong, kirim null agar database trigger meng-generate nomor urut (misal 00001, 00002)
  const sku = formData.sku.trim() || null
  const payload = {
    business_id: businessId,
    name: formData.name.trim(),
    type: formData.type,
    sku,
    barcode: formData.barcode.trim() || null,
    brand: formData.brand.trim() || null,
    unit: formData.unit.trim() || 'pcs',
    cost_price: Number(formData.cost_price) || 0,
    selling_price: Number(formData.selling_price) || 0,
    track_stock: formData.type === 'service' ? false : formData.track_stock,
    stock: formData.type === 'service' ? 0 : Number(formData.stock) || 0,
    has_commission: formData.has_commission,
    is_active: formData.is_active,
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([payload])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ProductItem
}

export async function updateProduct(
  id: string,
  formData: Partial<ProductFormData>,
): Promise<ProductItem> {
  const payload: Record<string, unknown> = {}
  if (formData.name !== undefined) payload.name = formData.name.trim()
  if (formData.type !== undefined) payload.type = formData.type
  if (formData.sku !== undefined) payload.sku = formData.sku.trim() || null
  if (formData.barcode !== undefined) payload.barcode = formData.barcode.trim() || null
  if (formData.brand !== undefined) payload.brand = formData.brand.trim() || null
  if (formData.unit !== undefined) payload.unit = formData.unit.trim() || 'pcs'
  if (formData.cost_price !== undefined) payload.cost_price = Number(formData.cost_price) || 0
  if (formData.selling_price !== undefined) payload.selling_price = Number(formData.selling_price) || 0
  if (formData.type === 'service') {
    payload.track_stock = false
    payload.stock = 0
  } else {
    if (formData.track_stock !== undefined) payload.track_stock = formData.track_stock
    if (formData.stock !== undefined) payload.stock = Number(formData.stock) || 0
  }
  if (formData.has_commission !== undefined) payload.has_commission = formData.has_commission
  if (formData.is_active !== undefined) payload.is_active = formData.is_active

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ProductItem
}

export async function deleteProduct(id: string): Promise<void> {
  // Soft delete to protect past transaction records
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
