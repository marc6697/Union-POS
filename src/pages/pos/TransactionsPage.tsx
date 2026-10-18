import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  History,
  Search,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ReceiptText,
  User,
  Clock,
  Banknote,
  QrCode,
  CreditCard,
  RotateCcw,
} from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuthStore } from '../../store/authStore'
import { useBusinessName } from '../../hooks/useBusinessName'
import { formatIDR } from '../../lib/utils'
import {
  getDateRangeFromPreset,
  formatDateTimeWIB,
  getWIBDateParts,
  type DatePreset,
} from '../../lib/datePresets'
import {
  fetchTransactions,
  type TransactionFilterOptions,
} from '../../lib/services/transactionService'
import type { Transaction, TransactionStatus, PaymentMethod } from '../../types'

const PAGE_SIZE = 10

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  cash: { label: 'Tunai', icon: Banknote },
  qris: { label: 'QRIS', icon: QrCode },
  card: { label: 'Kartu', icon: CreditCard },
}

export default function TransactionsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const businessId = user?.business_id
  const businessName = useBusinessName()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('today')

  // Custom date picker range (YYYY-MM-DD)
  const todayWIB = (() => {
    const { year, month, day } = getWIBDateParts()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${year}-${pad(month)}-${pad(day)}`
  })()
  const [customStart, setCustomStart] = useState<string>(todayWIB)
  const [customEnd, setCustomEnd] = useState<string>(todayWIB)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  const loadTransactions = useCallback(async () => {
    if (!businessId) return

    setIsLoading(true)
    setError(null)

    try {
      const { startDate, endDate } = getDateRangeFromPreset(
        datePreset,
        customStart,
        customEnd,
      )

      const options: TransactionFilterOptions = {
        page: currentPage,
        pageSize: PAGE_SIZE,
        startDate,
        endDate,
        status: statusFilter,
        search: search.trim() || undefined,
      }

      const result = await fetchTransactions(businessId, options)
      setTransactions(result.data)
      setTotalCount(result.count)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat transaksi')
    } finally {
      setIsLoading(false)
    }
  }, [businessId, currentPage, datePreset, customStart, customEnd, statusFilter, search])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Reset pagination on filter change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    setCurrentPage(1)
  }

  const handleStatusChange = (status: TransactionStatus | 'all') => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Quick summary calculations for current page
  const completedCount = transactions.filter((t) => t.status === 'completed').length
  const completedTotal = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.total), 0)
  const voidedCount = transactions.filter((t) => t.status === 'voided').length

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Riwayat Transaksi"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        {/* ── Top Title & Refresh ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="text-indigo-600" size={24} />
              Riwayat Transaksi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh nota penjualan kasir, status pembayaran, dan pembatalan nota (void).
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadTransactions}
            isLoading={isLoading}
            leftIcon={<RotateCcw size={14} />}
            className="self-start sm:self-auto cursor-pointer"
          >
            Muat Ulang
          </Button>
        </div>

        {/* ── Filter Card ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
          {/* Baris 1: Preset Tanggal (Asia/Jakarta WIB) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1">
              <Calendar size={14} className="text-indigo-600" />
              Periode (WIB):
            </span>
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'year', label: 'Tahun Ini' },
                { id: 'custom', label: 'Rentang Kustom' },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handlePresetChange(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  datePreset === id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input Rentang Kustom (Muncul jika Kustom dipilih) */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Dari:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500 font-medium">Sampai:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Baris 2: Pencarian & Filter Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <div className="flex-1">
              <Input
                placeholder="Cari no. faktur atau nama pelanggan..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                leftIcon={<Search size={15} />}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => handleStatusChange('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  Selesai
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('voided')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'voided'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  Dibatalkan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ringkasan Cepat ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Transaksi
            </span>
            <p className="text-xl font-black text-slate-800 mt-1">{totalCount}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">pada periode terpilih</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Omzet Halaman Ini
            </span>
            <p className="text-xl font-black text-emerald-600 mt-1">
              {formatIDR(completedTotal)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {completedCount} transaksi selesai
            </span>
          </div>

          {voidedCount > 0 && (
            <div className="col-span-2 sm:col-span-1 bg-white p-3.5 rounded-xl border border-rose-100 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                Dibatalkan (Void)
              </span>
              <p className="text-xl font-black text-rose-600 mt-1">{voidedCount}</p>
              <span className="text-[11px] text-rose-400 mt-0.5 block">nota dibatalkan</span>
            </div>
          )}
        </div>

        {/* ── Error Banner ───────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadTransactions}>
              Coba Lagi
            </Button>
          </div>
        )}

        {/* ── Loading Spinner ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Memuat data riwayat transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          /* ── Empty State ──────────────────────────────────────────────────── */
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-4 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <ReceiptText size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Transaksi</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {search || statusFilter !== 'all'
                ? 'Tidak ditemukan transaksi yang cocok dengan filter atau kata kunci pencarian.'
                : 'Belum ada transaksi pada periode yang dipilih. Transaksi baru yang berhasil diproses di kasir akan muncul di sini.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ReceiptText size={15} />}
              onClick={() => navigate('/pos')}
              className="mt-2"
            >
              Buka Kasir POS
            </Button>
          </div>
        ) : (
          /* ── Transactions List (Desktop Table + Mobile Cards) ─────────────── */
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">No. Faktur</th>
                    <th className="px-4 py-3">Tanggal & Waktu</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Kasir</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3 text-right">Total Tagihan</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => {
                    const isVoided = t.status === 'voided'
                    const PaymentIcon = PAYMENT_METHOD_LABELS[t.payment_method]?.icon || Banknote
                    const paymentLabel = PAYMENT_METHOD_LABELS[t.payment_method]?.label || t.payment_method

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/pos/transactions/${t.id}`)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isVoided ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-indigo-700">
                          {t.invoice_no}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {formatDateTimeWIB(t.transaction_date)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-800">
                          <p className="font-semibold truncate max-w-[150px]">
                            {t.customer_name_snapshot || 'Pelanggan Umum'}
                          </p>
                          {t.customer_phone_snapshot && (
                            <span className="text-[11px] text-slate-400">
                              {t.customer_phone_snapshot}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {t.creator?.full_name || '-'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <PaymentIcon size={12} className="text-slate-500" />
                            {paymentLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          <span className={isVoided ? 'line-through text-slate-400' : ''}>
                            {formatIDR(Number(t.total))}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isVoided ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Dibatalkan (Void)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Selesai
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/pos/transactions/${t.id}`)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <span>Detail</span>
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-2.5">
              {transactions.map((t) => {
                const isVoided = t.status === 'voided'
                const PaymentIcon = PAYMENT_METHOD_LABELS[t.payment_method]?.icon || Banknote
                const paymentLabel = PAYMENT_METHOD_LABELS[t.payment_method]?.label || t.payment_method

                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/pos/transactions/${t.id}`)}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs active:scale-[0.99] transition-all cursor-pointer ${
                      isVoided ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-indigo-700">
                        {t.invoice_no}
                      </span>
                      {isVoided ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Void
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Selesai
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Clock size={12} />
                        <span>{formatDateTimeWIB(t.transaction_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <User size={12} className="text-slate-400" />
                        <span className="truncate">
                          {t.customer_name_snapshot || 'Pelanggan Umum (Walk-in)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <PaymentIcon size={12} className="text-slate-500" />
                        {paymentLabel}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-extrabold text-sm ${
                            isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {formatIDR(Number(t.total))}
                        </span>
                        <ArrowRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
                <span className="text-slate-500">
                  Halaman <strong className="text-slate-800">{currentPage}</strong> dari{' '}
                  <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total)
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                    leftIcon={<ChevronLeft size={14} />}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                    rightIcon={<ChevronRight size={14} />}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
