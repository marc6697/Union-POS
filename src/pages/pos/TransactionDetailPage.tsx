import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Banknote,
  QrCode,
  CreditCard,
  Ban,
  Package,
  Wrench,
  AlertCircle,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ReceiptModal from './components/ReceiptModal'
import { useAuthStore } from '../../store/authStore'
import { useBusinessName } from '../../hooks/useBusinessName'
import { formatIDR } from '../../lib/utils'
import { formatDateTimeWIB } from '../../lib/datePresets'
import {
  fetchTransactionById,
  voidTransaction,
} from '../../lib/services/transactionService'
import { getBusinessSettings } from '../../lib/services/settingsService'
import type { Transaction, PaymentMethod, BusinessSettings } from '../../types'

const PAYMENT_METHOD_INFO: Record<
  PaymentMethod,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  cash: { label: 'Tunai', icon: Banknote },
  qris: { label: 'QRIS', icon: QrCode },
  card: { label: 'Kartu Debit/Kredit', icon: CreditCard },
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const businessName = useBusinessName()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Void confirmation state
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  const isOwner = user?.role === 'owner'

  const loadDetail = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTransactionById(id)
      setTransaction(data)

      if (data?.business_id) {
        try {
          const bs = await getBusinessSettings(data.business_id)
          setSettings(bs)
        } catch {
          // Abaikan jika settings gagal dimuat
        }
      }
    } catch (err) {
      console.error('Error fetching transaction detail:', err)
      setError(err instanceof Error ? err.message : 'Gagal memuat detail transaksi')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    const trimmedReason = voidReason.trim()
    if (!trimmedReason) {
      setVoidError('Alasan pembatalan (void) wajib diisi.')
      return
    }

    try {
      setIsVoiding(true)
      setVoidError(null)
      await voidTransaction(id, trimmedReason)
      toast.success('Transaksi berhasil dibatalkan (void). Stok produk telah dikembalikan.')
      setIsVoidModalOpen(false)
      setVoidReason('')
      await loadDetail()
    } catch (err) {
      console.error('Error voiding transaction:', err)
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan transaksi'
      setVoidError(msg)
      toast.error(msg)
    } finally {
      setIsVoiding(false)
    }
  }

  const isVoided = transaction?.status === 'voided'
  const PaymentIcon = transaction
    ? PAYMENT_METHOD_INFO[transaction.payment_method]?.icon || Banknote
    : Banknote
  const paymentLabel = transaction
    ? PAYMENT_METHOD_INFO[transaction.payment_method]?.label || transaction.payment_method
    : '-'

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Detail Transaksi"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-4">
        {/* ── Top Bar: Tombol Kembali & Aksi Header ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pos/transactions')}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-slate-600 transition-colors shadow-2xs cursor-pointer"
              title="Kembali ke Riwayat Transaksi"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {transaction ? transaction.invoice_no : 'Detail Transaksi'}
                </h1>
                {transaction && (
                  isVoided ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      Dibatalkan (Void)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Selesai
                    </span>
                  )
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {transaction ? formatDateTimeWIB(transaction.transaction_date) : 'Memuat data...'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Cetak & Void */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {transaction && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReceiptModalOpen(true)}
                leftIcon={<Printer size={15} />}
                className="cursor-pointer"
              >
                Cetak Nota
              </Button>
            )}

            {isOwner && !isVoided && transaction && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsVoidModalOpen(true)}
                leftIcon={<Ban size={15} />}
                className="cursor-pointer"
              >
                Batalkan (Void)
              </Button>
            )}
          </div>
        </div>

        {/* ── Error Banner ───────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadDetail}>
              Coba Lagi
            </Button>
          </div>
        )}

        {/* ── Loading Spinner ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Memuat detail transaksi...</p>
          </div>
        ) : transaction ? (
          <div className="space-y-4">
            {/* ── Banner Status VOID (Jika Transaksi Dibatalkan) ─────────────── */}
            {isVoided && (
              <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                  <span>TRANSAKSI INI TELAH DIBATALKAN (VOID)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-rose-700 pt-1 border-t border-rose-200/80">
                  <div>
                    <span className="font-medium text-rose-500">Waktu Pembatalan:</span>{' '}
                    <strong>{formatDateTimeWIB(transaction.voided_at)}</strong>
                  </div>
                  <div>
                    <span className="font-medium text-rose-500">Alasan:</span>{' '}
                    <strong>{transaction.void_reason || '-'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ── Card 1: Informasi Nota & Pelanggan ──────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informasi Nota & Pelanggan
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Pelanggan
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" />
                    <span>{transaction.customer_name_snapshot || 'Pelanggan Umum (Walk-in)'}</span>
                  </p>
                  {transaction.customer_phone_snapshot && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone size={11} /> {transaction.customer_phone_snapshot}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kasir / Pembuat Nota
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" />
                    <span>{transaction.creator?.full_name || 'Staff Toko'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {transaction.creator?.role || 'User'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Waktu Transaksi (WIB)
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Clock size={14} className="text-indigo-600" />
                    <span>{formatDateTimeWIB(transaction.transaction_date)}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No: {transaction.invoice_no}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Card 2: Daftar Item Produk & Jasa ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daftar Item ({transaction.items?.length || 0})
                </h3>
              </div>

              {/* Desktop Table Items */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-3 py-2.5">Produk / Layanan</th>
                      <th className="px-3 py-2.5">Staf Pelaksana</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                      <th className="px-3 py-2.5 text-right">Diskon Item</th>
                      <th className="px-3 py-2.5 text-right">Total Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.items?.map((item) => {
                      const staffName = item.staff?.[0]?.staff_name_snapshot
                      const isService = item.product_type === 'service'

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                  isService
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {isService ? <Wrench size={13} /> : <Package size={13} />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{item.product_name}</p>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  {isService ? 'Layanan Jasa' : item.unit || 'pcs'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {staffName ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                <User size={11} className="text-indigo-600" />
                                {staffName}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-700">
                            {formatIDR(Number(item.unit_price))}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {Number(item.discount_amount) > 0 ? (
                              <span className="font-semibold text-amber-600">
                                -{formatIDR(Number(item.discount_amount))}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900">
                            {formatIDR(
                              Number(item.unit_price) * Number(item.quantity) -
                                Number(item.discount_amount || 0)
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Items */}
              <div className="block sm:hidden space-y-2 pt-1">
                {transaction.items?.map((item) => {
                  const staffName = item.staff?.[0]?.staff_name_snapshot
                  const isService = item.product_type === 'service'

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              isService
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {isService ? <Wrench size={13} /> : <Package size={13} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{item.product_name}</p>
                            <span className="text-[11px] text-slate-400">
                              {formatIDR(Number(item.unit_price))} × {item.quantity}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatIDR(
                            Number(item.unit_price) * Number(item.quantity) -
                              Number(item.discount_amount || 0)
                          )}
                        </span>
                      </div>

                      {(staffName || Number(item.discount_amount) > 0) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 flex-wrap">
                          {staffName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              <User size={10} className="text-indigo-600" />
                              {staffName}
                            </span>
                          )}
                          {Number(item.discount_amount) > 0 && (
                            <span className="text-[10px] font-semibold text-amber-600">
                              Diskon: -{formatIDR(Number(item.discount_amount))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Card 3: Rincian Tagihan & Pembayaran ────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rincian Pembayaran
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Barang & Jasa</span>
                  <span className="font-semibold text-slate-800">
                    {formatIDR(Number(transaction.subtotal))}
                  </span>
                </div>

                {Number(transaction.item_discount_total) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Total Diskon Item</span>
                    <span className="font-semibold">
                      -{formatIDR(Number(transaction.item_discount_total))}
                    </span>
                  </div>
                )}

                {Number(transaction.discount_amount) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Diskon Nota</span>
                    <span className="font-semibold">
                      -{formatIDR(Number(transaction.discount_amount))}
                    </span>
                  </div>
                )}

                {Number(transaction.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({transaction.tax_rate_snapshot}%)</span>
                    <span className="font-semibold text-slate-800">
                      {formatIDR(Number(transaction.tax_amount))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-100 items-baseline">
                  <span>Total Tagihan</span>
                  <span
                    className={`text-base font-extrabold ${
                      isVoided ? 'line-through text-slate-400' : 'text-indigo-700'
                    }`}
                  >
                    {formatIDR(Number(transaction.total))}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <PaymentIcon size={14} className="text-slate-500" />
                      <span>Metode Pembayaran</span>
                    </span>
                    <span className="font-bold text-slate-800">{paymentLabel}</span>
                  </div>

                  {transaction.payment_method === 'cash' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Uang Diterima</span>
                        <span className="font-semibold text-slate-800">
                          {formatIDR(Number(transaction.amount_paid))}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kembalian</span>
                        <span className="font-bold text-emerald-600">
                          {formatIDR(Number(transaction.change_amount))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Modal Konfirmasi Void (Hanya Owner) ─────────────────────────────── */}
        <Modal
          isOpen={isVoidModalOpen}
          onClose={() => !isVoiding && setIsVoidModalOpen(false)}
          title="Batalkan Transaksi (Void)"
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsVoidModalOpen(false)}
                disabled={isVoiding}
              >
                Tutup
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleVoidSubmit}
                isLoading={isVoiding}
                leftIcon={<Ban size={14} />}
              >
                Konfirmasi Void
              </Button>
            </div>
          }
        >
          <form onSubmit={handleVoidSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={15} className="text-rose-600" />
                <span>Perhatian: Aksi ini tidak dapat dibatalkan!</span>
              </div>
              <p className="text-rose-700 leading-relaxed">
                Pembatalan transaksi ini akan otomatis mengembalikan stok seluruh produk fisik yang
                telah berkurang. Nota akan ditandai permanen sebagai <strong>VOID</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Pembatalan (Wajib diisi) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Pelanggan salah memilih barang / pesanan ganda..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-500 shadow-2xs"
              />
              {voidError && (
                <p className="text-[11px] text-rose-600 font-medium">{voidError}</p>
              )}
            </div>
          </form>
        </Modal>

        {/* ── Modal Cetak Struk 80mm ────────────────────────────────────────── */}
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          transaction={transaction}
          businessName={businessName}
          receiptFooter={settings?.receipt_footer}
        />
      </main>
    </div>
  )
}
