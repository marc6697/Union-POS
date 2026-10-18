import { useState } from 'react'
import {
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  ReceiptText,
  User,
  Tag,
  CheckCircle2,
  X,
  ArrowLeft,
} from 'lucide-react'
import type {
  CartItem,
  Customer,
  UserProfile,
  DiscountType,
  PaymentMethod,
} from '../../../types'
import { formatIDR } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import CartItemRow from './CartItemRow'
import CustomerPickerModal from './CustomerPickerModal'
import EditCartItemModal from './EditCartItemModal'
import OrderDiscountModal from './OrderDiscountModal'
import { calculateTransactionPreview } from '../../../lib/transactionCalculation'

const PAYMENT_METHODS = [
  { id: 'cash' as const, label: 'Tunai', icon: Banknote },
  { id: 'qris' as const, label: 'QRIS', icon: QrCode },
  { id: 'card' as const, label: 'Kartu', icon: CreditCard },
]

interface CartPanelProps {
  cart: CartItem[]
  businessId: string
  userId?: string
  staffList: UserProfile[]
  taxEnabled: boolean
  taxRate: number
  customer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onUpdateQty: (productId: string, delta: number) => void
  onRemoveFromCart: (productId: string) => void
  onUpdateItemDiscount: (productId: string, type: DiscountType | null, value: number) => void
  onUpdateItemStaff: (productId: string, staffId: string | null) => void
  orderDiscountType: DiscountType | null
  orderDiscountValue: number
  onUpdateOrderDiscount: (type: DiscountType | null, value: number) => void
  paymentMethod: PaymentMethod
  setPaymentMethod: (m: PaymentMethod) => void
  cashAmountPaid: number
  setCashAmountPaid: (amount: number) => void
  onCheckout: () => void
  isProcessing: boolean
  onClear: () => void
  onClose?: () => void
}

export default function CartPanel({
  cart,
  businessId,
  userId,
  staffList,
  taxEnabled,
  taxRate,
  customer,
  onSelectCustomer,
  onUpdateQty,
  onRemoveFromCart,
  onUpdateItemDiscount,
  onUpdateItemStaff,
  orderDiscountType,
  orderDiscountValue,
  onUpdateOrderDiscount,
  paymentMethod,
  setPaymentMethod,
  cashAmountPaid,
  setCashAmountPaid,
  onCheckout,
  isProcessing,
  onClear,
  onClose,
}: CartPanelProps) {
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isOrderDiscountModalOpen, setIsOrderDiscountModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  // 1. Preview calculation mirroring Section 2.6
  const calcResult = calculateTransactionPreview({
    items: cart.map((c) => ({
      selling_price: Number(c.product.selling_price),
      quantity: c.quantity,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
    })),
    discount_type: orderDiscountType,
    discount_value: orderDiscountValue,
    tax_enabled: taxEnabled,
    tax_rate: taxRate,
    amount_paid: cashAmountPaid,
  })

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  const isCash = paymentMethod === 'cash'
  const isCashShort = isCash && cashAmountPaid < calcResult.total

  return (
    <div className="flex flex-col h-full bg-slate-50/60 select-none overflow-hidden">
      {/* ── Cart Top Header (Fixed at top) ──────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              aria-label="Kembali ke katalog"
            >
              <ArrowLeft size={16} />
              <span>Kembali</span>
            </button>
          )}

          <div className="hidden sm:flex w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 items-center justify-center">
            <ShoppingCart size={16} />
          </div>

          <div className="flex items-center">
            <span className="text-sm font-bold text-slate-800">Keranjang</span>
            {cart.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {totalQuantity} pcs
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Kosongkan
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer"
              aria-label="Tutup keranjang"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE BODY (All Sections Scroll Smoothly Together) ─────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-4">
        {/* ── SECTION 1: PELANGGAN ──────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pelanggan
            </span>
            {customer && (
              <button
                type="button"
                onClick={() => onSelectCustomer(null)}
                className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                Reset ke Walk-in
              </button>
            )}
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 transition-all shadow-2xs flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex-1 flex items-center gap-2.5 text-left truncate cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                <User size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {customer ? customer.name : 'Pelanggan Umum (Walk-in)'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {customer ? customer.phone_number : 'Nota tanpa data pelanggan'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              {customer ? 'Ganti' : 'Pilih'}
            </button>
          </div>
        </div>

        {/* ── SECTION 2: DAFTAR ITEM BELANJA ────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Daftar Produk ({cart.length})
            </span>
            {totalQuantity > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                {totalQuantity} pcs
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2.5 text-slate-300 py-8 bg-white/70 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                <ShoppingCart size={22} />
              </div>
              <p className="text-xs font-semibold text-slate-600">Keranjang Masih Kosong</p>
              <p className="text-[11px] text-center text-slate-400 max-w-[200px]">
                Ketuk produk atau layanan pada katalog untuk menambahkan item
              </p>
              {onClose && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="mt-2 text-xs font-bold sm:hidden"
                  leftIcon={<ArrowLeft size={14} />}
                >
                  Pilih Produk
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  staffList={staffList}
                  onUpdateQty={(delta) => onUpdateQty(item.product.id, delta)}
                  onRemove={() => onRemoveFromCart(item.product.id)}
                  onOpenEdit={() => setEditingItem(item)}
                  lineCalculation={calcResult.lines[idx]}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION 3: RINCIAN BIAYA & DISKON (Hanya jika keranjang ada isi) ─ */}
        {cart.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rincian Tagihan
              </span>
              <button
                type="button"
                onClick={() => setIsOrderDiscountModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <Tag size={11} />
                <span>
                  {orderDiscountValue > 0 ? 'Atur Diskon Nota' : '+ Diskon Nota'}
                </span>
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2 text-xs">
              {/* Rincian per Pos */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Barang & Jasa</span>
                  <span className="font-semibold text-slate-800">{formatIDR(calcResult.subtotal)}</span>
                </div>

                {calcResult.item_discount_total > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Diskon Item</span>
                    <span className="font-semibold">-{formatIDR(calcResult.item_discount_total)}</span>
                  </div>
                )}

                {calcResult.order_discount_amount > 0 && (
                  <div className="flex justify-between items-center text-amber-600">
                    <div className="flex items-center gap-1.5">
                      <span>Diskon Nota</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        {orderDiscountType === 'percent' ? `${orderDiscountValue}%` : 'Nominal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">-{formatIDR(calcResult.order_discount_amount)}</span>
                      <button
                        type="button"
                        onClick={() => setIsOrderDiscountModalOpen(true)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                      >
                        Ubah
                      </button>
                    </div>
                  </div>
                )}

                {taxEnabled && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({calcResult.tax_rate}%)</span>
                    <span className="font-semibold text-slate-800">{formatIDR(calcResult.tax_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-100 items-baseline">
                  <span>Total Tagihan</span>
                  <span className="text-indigo-700 text-base font-extrabold">{formatIDR(calcResult.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 4: METODE PEMBAYARAN & TUNAI ──────────────────────────── */}
        {cart.length > 0 && (
          <div className="space-y-1.5 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Metode Pembayaran
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(id)
                    if (id === 'cash' && cashAmountPaid === 0) {
                      setCashAmountPaid(calcResult.total)
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Input Tunai (Uang Diterima & Kembalian) */}
            {isCash && (
              <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Uang Diterima
                  </span>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs text-slate-400 font-medium">Rp</span>
                    <input
                      type="number"
                      min={0}
                      value={cashAmountPaid === 0 ? '' : cashAmountPaid}
                      onChange={(e) => setCashAmountPaid(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-36 text-right bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setCashAmountPaid(calcResult.total)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg text-[10px] font-bold text-slate-700 shrink-0 transition-colors cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000, 500000].map((amt) => {
                    if (amt >= calcResult.total) {
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashAmountPaid(amt)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg text-[10px] font-bold text-slate-700 shrink-0 transition-colors cursor-pointer"
                        >
                          {formatIDR(amt)}
                        </button>
                      )
                    }
                    return null
                  })}
                </div>

                {/* Kembalian & Validasi */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-semibold">
                  <span className={isCashShort ? 'text-red-500' : 'text-slate-600 flex items-center gap-1'}>
                    {!isCashShort && <CheckCircle2 size={13} className="text-emerald-500" />}
                    {isCashShort ? 'Uang Masih Kurang' : 'Kembalian'}
                  </span>
                  <span className={`font-bold ${isCashShort ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isCashShort
                      ? `-${formatIDR(calcResult.total - cashAmountPaid)}`
                      : formatIDR(calcResult.change_amount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FIXED STICKY BOTTOM BAR (Tombol Bayar Sekarang Selalu Tampil) ────── */}
      {cart.length > 0 && (
        <div className="shrink-0 bg-white border-t border-slate-200/90 px-4 pt-3 pb-6 sm:pb-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Total Pembayaran ({totalQuantity} item)</span>
            <span className="text-base font-extrabold text-indigo-700">{formatIDR(calcResult.total)}</span>
          </div>
          <Button
            size="lg"
            className="w-full shadow-md font-bold h-12 text-sm"
            onClick={onCheckout}
            disabled={isProcessing || isCashShort}
            isLoading={isProcessing}
            leftIcon={<ReceiptText size={18} />}
          >
            {isProcessing
              ? 'Memproses Transaksi...'
              : isCashShort
              ? `Uang Kurang ${formatIDR(calcResult.total - cashAmountPaid)}`
              : `Bayar Sekarang · ${formatIDR(calcResult.total)}`}
          </Button>
        </div>
      )}

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        businessId={businessId}
        userId={userId}
        selectedCustomer={customer}
        onSelectCustomer={onSelectCustomer}
      />

      {/* Modal Atur Staf & Diskon Item */}
      <EditCartItemModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={cart.find((c) => c.product.id === editingItem?.product.id) || null}
        staffList={staffList}
        onSave={(staffId, discType, discVal) => {
          if (!editingItem) return
          onUpdateItemStaff(editingItem.product.id, staffId)
          onUpdateItemDiscount(editingItem.product.id, discType, discVal)
        }}
      />

      {/* Modal Atur Diskon Nota */}
      <OrderDiscountModal
        isOpen={isOrderDiscountModalOpen}
        onClose={() => setIsOrderDiscountModalOpen(false)}
        subtotal={calcResult.subtotal - calcResult.item_discount_total}
        currentDiscountType={orderDiscountType}
        currentDiscountValue={orderDiscountValue}
        onApply={(type, val) => onUpdateOrderDiscount(type, val)}
      />
    </div>
  )
}
