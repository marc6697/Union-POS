export type DatePreset = 'today' | 'month' | 'year' | 'custom'

/**
 * Mengambil komponen tanggal (tahun, bulan 1-12, hari 1-31) dalam zona waktu Asia/Jakarta (WIB).
 */
export function getWIBDateParts(d: Date = new Date()): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.format(d) // "YYYY-MM-DD"
  const [yearStr, monthStr, dayStr] = parts.split('-')
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
  }
}

/**
 * Menghasilkan batas rentang waktu ISO string dengan offset +07:00 untuk query database.
 * Boundaries dihitung dalam zona waktu Asia/Jakarta: start <= transaction_date <= end.
 */
export function getDateRangeFromPreset(
  preset: DatePreset,
  customStart?: string, // YYYY-MM-DD
  customEnd?: string, // YYYY-MM-DD
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const { year, month, day } = getWIBDateParts(now)
  const pad = (n: number) => String(n).padStart(2, '0')

  if (preset === 'today') {
    const todayStr = `${year}-${pad(month)}-${pad(day)}`
    return {
      startDate: `${todayStr}T00:00:00.000+07:00`,
      endDate: `${todayStr}T23:59:59.999+07:00`,
    }
  }

  if (preset === 'month') {
    const monthStartStr = `${year}-${pad(month)}-01`
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const monthEndStr = `${year}-${pad(month)}-${pad(lastDayOfMonth)}`
    return {
      startDate: `${monthStartStr}T00:00:00.000+07:00`,
      endDate: `${monthEndStr}T23:59:59.999+07:00`,
    }
  }

  if (preset === 'year') {
    return {
      startDate: `${year}-01-01T00:00:00.000+07:00`,
      endDate: `${year}-12-31T23:59:59.999+07:00`,
    }
  }

  // preset 'custom'
  const todayStr = `${year}-${pad(month)}-${pad(day)}`
  const s = customStart || todayStr
  const e = customEnd || s
  return {
    startDate: `${s}T00:00:00.000+07:00`,
    endDate: `${e}T23:59:59.999+07:00`,
  }
}

/**
 * Format tanggal dan waktu ke standar WIB (Asia/Jakarta).
 * Contoh: "18 Okt 2026, 14.30 WIB"
 */
export function formatDateTimeWIB(date: string | Date | null | undefined): string {
  if (!date) return '-'
  try {
    return (
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(date)) + ' WIB'
    )
  } catch {
    return String(date)
  }
}
