import type { DiscountType } from '../types'

export interface CalculationLineInput {
  selling_price: number
  quantity: number
  discount_type?: DiscountType | null
  discount_value?: number
}

export interface CalculationOrderInput {
  items: CalculationLineInput[]
  discount_type?: DiscountType | null
  discount_value?: number
  tax_enabled: boolean
  tax_rate: number
  amount_paid?: number
}

export interface CalculatedLine {
  gross: number
  discount_amount: number
  after_item: number
  order_discount_share: number
  line_total: number
}

export interface CalculationResult {
  subtotal: number
  item_discount_total: number
  subtotal_after_item: number
  order_discount_amount: number
  taxable: number
  tax_rate: number
  tax_amount: number
  total: number
  change_amount: number
  lines: CalculatedLine[]
}

/**
 * Pure helper untuk preview kalkulasi diskon, pajak, dan total di frontend.
 * Logika ini mencerminkan aturan kalkulasi server-side (Section 2.6):
 * - Pembulatan seluruh nilai moneter menggunakan Math.round (ke bilangan bulat Rupiah)
 * - Sisa selisih pembulatan alokasi diskon transaksi dimasukkan ke baris item terakhir
 *   sehingga invarian sum(line_total) === taxable terjamin secara eksak.
 */
export function calculateTransactionPreview(input: CalculationOrderInput): CalculationResult {
  const {
    items,
    discount_type,
    discount_value = 0,
    tax_enabled,
    tax_rate = 10,
    amount_paid = 0,
  } = input

  let subtotal = 0
  let item_discount_total = 0
  let subtotal_after_item = 0

  const linesPreliminary: {
    gross: number
    discount_amount: number
    after_item: number
  }[] = []

  // 1. Hitung gross dan diskon per baris
  for (const item of items) {
    const qty = Math.max(0, item.quantity)
    const price = Math.max(0, item.selling_price)
    const gross = Math.round(price * qty)

    let discount_amount = 0
    const dVal = Number(item.discount_value ?? 0)

    if (item.discount_type === 'percent') {
      const clampedPercent = Math.min(100, Math.max(0, dVal))
      discount_amount = Math.round(gross * (clampedPercent / 100))
    } else if (item.discount_type === 'amount') {
      const positiveAmt = Math.max(0, dVal)
      discount_amount = Math.min(gross, Math.round(positiveAmt))
    }

    const after_item = gross - discount_amount

    subtotal += gross
    item_discount_total += discount_amount
    subtotal_after_item += after_item

    linesPreliminary.push({
      gross,
      discount_amount,
      after_item,
    })
  }

  // 2. Hitung diskon tingkat transaksi (order-level)
  let order_discount_amount = 0
  const orderDVal = Number(discount_value ?? 0)

  if (discount_type === 'percent') {
    const clampedPercent = Math.min(100, Math.max(0, orderDVal))
    order_discount_amount = Math.round(subtotal_after_item * (clampedPercent / 100))
  } else if (discount_type === 'amount') {
    const positiveAmt = Math.max(0, orderDVal)
    order_discount_amount = Math.min(subtotal_after_item, Math.round(positiveAmt))
  }

  // 3. Alokasi proporsional diskon order ke tiap baris (sisa pembulatan ke baris terakhir)
  const lines: CalculatedLine[] = []
  let allocatedShareSum = 0

  for (let i = 0; i < linesPreliminary.length; i++) {
    const prelim = linesPreliminary[i]
    let share = 0

    if (i < linesPreliminary.length - 1) {
      if (subtotal_after_item > 0 && order_discount_amount > 0) {
        share = Math.round(order_discount_amount * (prelim.after_item / subtotal_after_item))
      }
      allocatedShareSum += share
    } else {
      share = order_discount_amount - allocatedShareSum
    }

    const line_total = Math.max(0, prelim.after_item - share)

    lines.push({
      gross: prelim.gross,
      discount_amount: prelim.discount_amount,
      after_item: prelim.after_item,
      order_discount_share: share,
      line_total,
    })
  }

  // 4. Hitung DPP (Taxable) & PPN
  const taxable = Math.max(0, subtotal_after_item - order_discount_amount)
  const effectiveTaxRate = tax_enabled ? Math.max(0, tax_rate) : 0
  const tax_amount = tax_enabled ? Math.round(taxable * (effectiveTaxRate / 100)) : 0
  const total = taxable + tax_amount
  const change_amount = Math.max(0, amount_paid - total)

  return {
    subtotal,
    item_discount_total,
    subtotal_after_item,
    order_discount_amount,
    taxable,
    tax_rate: effectiveTaxRate,
    tax_amount,
    total,
    change_amount,
    lines,
  }
}
