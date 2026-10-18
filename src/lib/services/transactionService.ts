import { supabase } from '../supabase'
import type {
  Transaction,
  TransactionStatus,
  CreateTransactionPayload,
} from '../../types'

export interface TransactionFilterOptions {
  page?: number
  pageSize?: number
  startDate?: string // ISO string atau YYYY-MM-DD
  endDate?: string // ISO string atau YYYY-MM-DD
  status?: TransactionStatus | 'all'
  search?: string
}

export interface TransactionPaginationResult {
  data: Transaction[]
  count: number
}

/**
 * Membuat transaksi baru melalui RPC database create_transaction.
 * Melakukan validasi, lock stok, alokasi diskon, dan kalkulasi PPN di sisi server.
 */
export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const { data, error } = await supabase.rpc('create_transaction', {
    payload,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as Transaction
}

/**
 * Mengambil daftar riwayat transaksi untuk suatu bisnis dengan filter dan paginasi.
 */
export async function fetchTransactions(
  businessId: string,
  options?: TransactionFilterOptions,
): Promise<TransactionPaginationResult> {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const search = options?.search?.trim()
  const status = options?.status ?? 'all'
  const startDate = options?.startDate
  const endDate = options?.endDate

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        staff:transaction_item_staff(*)
      ),
      creator:profiles!transactions_created_by_fkey(id, full_name, role)
    `,
      { count: 'exact' },
    )
    .eq('business_id', businessId)
    .order('transaction_date', { ascending: false })
    .range(from, to)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  if (search) {
    query = query.or(
      `invoice_no.ilike.%${search}%,customer_name_snapshot.ilike.%${search}%,customer_phone_snapshot.ilike.%${search}%`,
    )
  }

  const { data, count, error } = await query

  if (error) {
    // Fallback jika alias join relasi foreign key belum dikenali cache schema client
    let fallbackQuery = supabase
      .from('transactions')
      .select('*, items:transaction_items(*)', { count: 'exact' })
      .eq('business_id', businessId)
      .order('transaction_date', { ascending: false })
      .range(from, to)

    if (status !== 'all') {
      fallbackQuery = fallbackQuery.eq('status', status)
    }
    if (startDate) {
      fallbackQuery = fallbackQuery.gte('transaction_date', startDate)
    }
    if (endDate) {
      fallbackQuery = fallbackQuery.lte('transaction_date', endDate)
    }
    if (search) {
      fallbackQuery = fallbackQuery.or(
        `invoice_no.ilike.%${search}%,customer_name_snapshot.ilike.%${search}%,customer_phone_snapshot.ilike.%${search}%`,
      )
    }

    const { data: fallbackData, count: fallbackCount, error: fallbackError } = await fallbackQuery
    if (fallbackError) {
      throw new Error(`Gagal memuat transaksi: ${fallbackError.message}`)
    }

    return {
      data: (fallbackData ?? []) as Transaction[],
      count: fallbackCount ?? 0,
    }
  }

  return {
    data: (data ?? []) as Transaction[],
    count: count ?? 0,
  }
}

/**
 * Mengambil detail lengkap satu transaksi berdasarkan ID.
 */
export async function fetchTransactionById(transactionId: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        staff:transaction_item_staff(*)
      ),
      creator:profiles!transactions_created_by_fkey(id, full_name, role)
    `,
    )
    .eq('id', transactionId)
    .maybeSingle()

  if (error) {
    // Fallback jika join alias profiles belum dikenali
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('transactions')
      .select('*, items:transaction_items(*, staff:transaction_item_staff(*))')
      .eq('id', transactionId)
      .maybeSingle()

    if (fallbackError) {
      throw new Error(`Gagal memuat detail transaksi: ${fallbackError.message}`)
    }
    if (!fallbackData) {
      throw new Error('Transaksi tidak ditemukan.')
    }
    return fallbackData as Transaction
  }

  if (!data) {
    throw new Error('Transaksi tidak ditemukan.')
  }

  return data as Transaction
}

/**
 * Membatalkan transaksi (void) melalui RPC void_transaction (hanya pemilik bisnis).
 * Mengembalikan stok produk dan menandai status voided.
 */
export async function voidTransaction(transactionId: string, reason: string): Promise<Transaction> {
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    throw new Error('Alasan pembatalan transaksi wajib diisi.')
  }

  const { data, error } = await supabase.rpc('void_transaction', {
    p_transaction_id: transactionId,
    p_reason: trimmedReason,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as Transaction
}
