// ─── User & Auth Types ───────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'owner' | 'kasir'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  business_id?: string // null for superadmin
  avatar_url?: string
}

// ─── Business Types (for Superadmin) ─────────────────────────────────────────

export type BusinessStatus = 'active' | 'inactive'

export interface Business {
  id: string
  business_name: string
  owner_name: string
  owner_phone: string
  owner_email: string
  status: BusinessStatus
  created_at: string
  updated_at: string
}

export type BusinessFormData = Omit<Business, 'id' | 'created_at' | 'updated_at'>

// ─── POS / Transaction Types ──────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  image_url?: string
}

export interface CartItem {
  product: Product
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
