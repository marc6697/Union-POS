import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateTransactionPreview } from './transactionCalculation.ts'

test('calculateTransactionPreview - normal sale with item & order discount (tax off)', () => {
  const result = calculateTransactionPreview({
    items: [
      { selling_price: 20000, quantity: 2, discount_type: 'percent', discount_value: 10 },
      { selling_price: 50000, quantity: 1, discount_type: 'amount', discount_value: 5000 },
    ],
    discount_type: 'amount',
    discount_value: 10000,
    tax_enabled: false,
    tax_rate: 10,
    amount_paid: 100000,
  })

  assert.equal(result.subtotal, 90000)
  assert.equal(result.item_discount_total, 9000)
  assert.equal(result.subtotal_after_item, 81000)
  assert.equal(result.order_discount_amount, 10000)
  assert.equal(result.taxable, 71000)
  assert.equal(result.tax_amount, 0)
  assert.equal(result.total, 71000)
  assert.equal(result.change_amount, 29000)

  // Invariant: sum(line_total) === taxable
  const sumLines = result.lines.reduce((acc, l) => acc + l.line_total, 0)
  assert.equal(sumLines, result.taxable)

  // Invariant: sum(order_discount_share) === order_discount_amount
  const sumShares = result.lines.reduce((acc, l) => acc + l.order_discount_share, 0)
  assert.equal(sumShares, result.order_discount_amount)
})

test('calculateTransactionPreview - tax enabled (PPN 11%)', () => {
  const result = calculateTransactionPreview({
    items: [
      { selling_price: 20000, quantity: 1 },
    ],
    tax_enabled: true,
    tax_rate: 11,
    amount_paid: 25000,
  })

  assert.equal(result.subtotal, 20000)
  assert.equal(result.taxable, 20000)
  assert.equal(result.tax_rate, 11)
  assert.equal(result.tax_amount, 2200)
  assert.equal(result.total, 22200)
  assert.equal(result.change_amount, 2800)
})

test('calculateTransactionPreview - order discount percentage (10%)', () => {
  const result = calculateTransactionPreview({
    items: [
      { selling_price: 10000, quantity: 3 },
      { selling_price: 20000, quantity: 1 },
    ],
    discount_type: 'percent',
    discount_value: 10,
    tax_enabled: true,
    tax_rate: 10,
  })

  // subtotal = 50000
  // discount 10% = 5000
  // taxable = 45000
  // tax 10% = 4500
  // total = 49500
  assert.equal(result.subtotal, 50000)
  assert.equal(result.order_discount_amount, 5000)
  assert.equal(result.taxable, 45000)
  assert.equal(result.tax_amount, 4500)
  assert.equal(result.total, 49500)

  const sumLines = result.lines.reduce((acc, l) => acc + l.line_total, 0)
  assert.equal(sumLines, result.taxable)
})

test('calculateTransactionPreview - clamped discounts (cannot exceed bounds)', () => {
  const result = calculateTransactionPreview({
    items: [
      { selling_price: 20000, quantity: 1, discount_type: 'amount', discount_value: 30000 }, // > price
    ],
    discount_type: 'percent',
    discount_value: 150, // > 100%
    tax_enabled: false,
    tax_rate: 10,
  })

  // Item discount clamped to gross (20000)
  assert.equal(result.lines[0].discount_amount, 20000)
  assert.equal(result.subtotal_after_item, 0)
  assert.equal(result.total, 0)
})
