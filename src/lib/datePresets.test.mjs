import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getDateRangeFromPreset, getWIBDateParts, formatDateTimeWIB } from './datePresets.ts'

test('getWIBDateParts - accurately computes year, month, day in Asia/Jakarta', () => {
  // 2026-10-18 17:30:00 UTC is 2026-10-19 00:30:00 WIB (next day midnight)
  const midnightWIB = new Date('2026-10-18T17:30:00.000Z')
  const parts = getWIBDateParts(midnightWIB)
  assert.equal(parts.year, 2026)
  assert.equal(parts.month, 10)
  assert.equal(parts.day, 19)
})

test('getDateRangeFromPreset - today preset boundary in Asia/Jakarta', () => {
  const d = new Date('2026-10-18T10:00:00.000Z') // 17:00 WIB on Oct 18
  const range = getDateRangeFromPreset('today', undefined, undefined, d)
  assert.equal(range.startDate, '2026-10-18T00:00:00.000+07:00')
  assert.equal(range.endDate, '2026-10-18T23:59:59.999+07:00')
})

test('getDateRangeFromPreset - month preset boundary in Asia/Jakarta', () => {
  const d = new Date('2026-10-18T10:00:00.000Z')
  const range = getDateRangeFromPreset('month', undefined, undefined, d)
  assert.equal(range.startDate, '2026-10-01T00:00:00.000+07:00')
  assert.equal(range.endDate, '2026-10-31T23:59:59.999+07:00')
})

test('formatDateTimeWIB formats properly with WIB suffix', () => {
  const d = new Date('2026-10-18T08:00:00.000Z') // 15:00 WIB
  const formatted = formatDateTimeWIB(d)
  assert.ok(formatted.includes('WIB'))
  assert.ok(formatted.includes('15'))
})
