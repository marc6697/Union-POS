// ─── User & Auth Types ───────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'owner' | 'kasir'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  business_id?: string // null for superadmin
  business_name?: string
  avatar_url?: string
}

// ─── Business Types (for Superadmin) ─────────────────────────────────────────

export type BusinessStatus = 'active' | 'inactive'

export const BUSINESS_TYPES = [
  'Toko Ritel & Minimarket',
  'Kafe, Restoran, & Coffee Shop',
  'Usaha Laundry',
  'Salon & Barbershop',
  'Kedai Makanan & Minuman (F&B)',

] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number] | (string & {})

export interface Business {
  id: string
  business_name: string
  business_type: string
  owner_name: string
  owner_phone: string
  owner_email: string
  status: BusinessStatus
  created_at: string
  updated_at: string
  /** Set when soft-deleted; null/undefined while active. */
  deleted_at?: string | null
}

export type BusinessFormData = Omit<Business, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  /** Owner login password. Required on create; empty on edit = unchanged. Never stored in Business. */
  password: string
}

// ─── POS / Transaction Types ──────────────────────────────────────────────────

export type ItemType = 'product' | 'service'

export interface ProductItem {
  id: string
  business_id: string
  category_id?: string | null
  name: string
  type: ItemType
  sku?: string | null
  barcode?: string | null
  brand?: string | null
  unit?: string | null
  cost_price: number
  selling_price: number
  track_stock: boolean
  stock: number
  has_commission: boolean
  is_active: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type ProductFormData = {
  name: string
  type: ItemType
  sku: string
  barcode: string
  brand: string
  unit: string
  cost_price: number
  selling_price: number
  track_stock: boolean
  stock: number
  has_commission: boolean
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  image_url?: string
}

export interface CartItem {
  product: ProductItem
  quantity: number
}

export interface Transaction {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  payment_method: 'cash' | 'qris' | 'card'
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  kasir_id: string
  business_id: string
}
