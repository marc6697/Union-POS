// ─── User & Auth Types ───────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'owner' | 'staff'

export interface UserProfile {
  id: string
  email?: string | null
  full_name: string
  role: UserRole
  business_id?: string // null for superadmin
  business_name?: string
  business_code?: string
  avatar_url?: string | null
  phone?: string | null
  position?: string | null
  can_login?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface StaffFormData {
  full_name: string
  phone: string
  position: string
  can_login: boolean
  email: string
  password: string
  is_active: boolean
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
  business_code?: string
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

export type DiscountType = 'percent' | 'amount'
export type PaymentMethod = 'cash' | 'qris' | 'card'
export type TransactionStatus = 'completed' | 'voided'

export interface CartItem {
  product: ProductItem
  quantity: number
  discount_type?: DiscountType | null
  discount_value?: number
  staff_ids?: string[]
}

export interface TransactionItemStaff {
  id: string
  transaction_item_id: string
  business_id: string
  staff_id?: string | null
  staff_name_snapshot: string
  commission_type?: string | null
  commission_rate?: number | null
  commission_amount?: number | null
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  business_id: string
  product_id?: string | null
  product_name: string
  product_type: ItemType
  unit?: string | null
  unit_price: number
  cost_price: number
  quantity: number
  discount_type?: DiscountType | null
  discount_value?: number
  discount_amount: number
  order_discount_share: number
  line_total: number
  has_commission: boolean
  created_at: string
  staff?: TransactionItemStaff[]
}

export interface Transaction {
  id: string
  business_id: string
  invoice_no: string
  customer_id?: string | null
  customer_name_snapshot?: string | null
  customer_phone_snapshot?: string | null
  transaction_date: string
  subtotal: number
  item_discount_total: number
  discount_type?: DiscountType | null
  discount_value?: number
  discount_amount: number
  tax_rate_snapshot: number
  tax_amount: number
  total: number
  payment_method: PaymentMethod
  amount_paid: number
  change_amount: number
  status: TransactionStatus
  voided_at?: string | null
  voided_by?: string | null
  void_reason?: string | null
  created_by: string
  created_at: string
  updated_at: string

  items?: TransactionItem[]
  creator?: {
    id: string
    full_name: string
    role: string
  } | null
  customer?: Customer | null
}

export interface BusinessSettings {
  business_id: string
  tax_enabled: boolean
  tax_rate: number
  receipt_footer?: string | null
  created_at: string
  updated_at: string
}

export interface CreateTransactionItemPayload {
  product_id: string
  quantity: number
  discount_type?: DiscountType | null
  discount_value?: number
  staff_ids?: string[]
}

export interface CreateTransactionPayload {
  customer_id?: string | null
  payment_method: PaymentMethod
  amount_paid?: number
  discount_type?: DiscountType | null
  discount_value?: number
  items: CreateTransactionItemPayload[]
}

// ─── Customer Types ──────────────────────────────────────────────────────────

export interface Customer {
  id: string
  business_id: string
  created_by?: string | null
  creator?: {
    id: string
    full_name: string
    role: string
  } | null
  name: string
  phone_number: string
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type CustomerFormData = {
  name: string
  phone_number: string
  email: string
  address: string
  notes: string
  is_active: boolean
}

