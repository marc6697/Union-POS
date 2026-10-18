import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart,
  Plus,
  Search,
  ReceiptText,
  Package,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { formatIDR } from '../../lib/utils'
import type {
  ProductItem,
  CartItem,
  Customer,
  UserProfile,
  DiscountType,
  PaymentMethod,
  CreateTransactionPayload,
} from '../../types'
import { fetchActiveProductsByBusiness } from '../../lib/services/productService'
import { fetchActiveStaff } from '../../lib/services/staffService'
import { getBusinessSettings } from '../../lib/services/settingsService'
import { createTransaction } from '../../lib/services/transactionService'
import { calculateTransactionPreview } from '../../lib/transactionCalculation'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import { useBusinessName } from '../../hooks/useBusinessName'
import CartPanel from './components/CartPanel'

const CATEGORIES = ['Semua', 'Barang', 'Jasa'] as const

export default function POSPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const businessName = useBusinessName()
  const businessId = user?.business_id

  // ── State Produk & Katalog ────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('Semua')

  // ── State Pengaturan Toko & Staf ──────────────────────────────────────────
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState(10)
  const [staffList, setStaffList] = useState<UserProfile[]>([])

  // ── State Keranjang & Transaksi ───────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType | null>('percent')
  const [orderDiscountValue, setOrderDiscountValue] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashAmountPaid, setCashAmountPaid] = useState(0)

  // ── State UI & Loading ────────────────────────────────────────────────────
  const [showCart, setShowCart] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ── Load Data Awal (Produk, Staf, Settings) ───────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchActiveProductsByBusiness(businessId)
      setProducts(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat produk'
      setLoadError(msg)
      toast.error(`Gagal memuat produk: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (!businessId) return

    let isMounted = true

    async function loadMeta() {
      try {
        const [settingsData, staffData] = await Promise.all([
          getBusinessSettings(businessId!),
          fetchActiveStaff(businessId!),
        ])

        if (isMounted) {
          setTaxEnabled(settingsData.tax_enabled)
          setTaxRate(settingsData.tax_rate)
          setStaffList(staffData)
        }
      } catch (err) {
        console.error('Error loading POS metadata:', err)
      }
    }

    loadMeta()

    return () => {
      isMounted = false
    }
  }, [businessId])

  // ── Derived Filtered Products ─────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))

    const matchCat =
      activeCategory === 'Semua' ||
      (activeCategory === 'Barang' && p.type === 'product') ||
      (activeCategory === 'Jasa' && p.type === 'service')

    return matchSearch && matchCat
  })

  // ── Perhitungan Preview Transaksi ─────────────────────────────────────────
  const preview = calculateTransactionPreview({
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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // ── Cart Handlers ─────────────────────────────────────────────────────────
  const addToCart = (product: ProductItem) => {
    const existing = cart.find((c) => c.product.id === product.id)
    const currentQty = existing ? existing.quantity : 0

    if (product.type === 'product' && product.track_stock && currentQty >= product.stock) {
      toast.error(`Stok ${product.name} tidak mencukupi (sisa ${product.stock})`)
      return
    }

    setCart((prev) => {
      const exists = prev.find((c) => c.product.id === product.id)
      if (exists) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        )
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discount_type: 'percent',
          discount_value: 0,
          staff_ids: [],
        },
      ]
    })
    toast.success(`${product.name} ditambahkan`, { duration: 1200 })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id === productId) {
            const newQty = c.quantity + delta
            if (
              delta > 0 &&
              c.product.type === 'product' &&
              c.product.track_stock &&
              newQty > c.product.stock
            ) {
              toast.error(`Stok ${c.product.name} tidak mencukupi (maks. ${c.product.stock})`)
              return c
            }
            return { ...c, quantity: newQty }
          }
          return c
        })
        .filter((c) => c.quantity > 0),
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  const updateItemDiscount = (
    productId: string,
    type: DiscountType | null,
    value: number,
  ) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId
          ? { ...c, discount_type: type, discount_value: value }
          : c,
      ),
    )
  }

  const updateItemStaff = (productId: string, staffId: string | null) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId
          ? { ...c, staff_ids: staffId ? [staffId] : [] }
          : c,
      ),
    )
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setOrderDiscountValue(0)
    setCashAmountPaid(0)
    setShowCart(false)
  }

  // ── Checkout Process ──────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong.')
      return
    }

    if (paymentMethod === 'cash' && cashAmountPaid < preview.total) {
      toast.error('Uang pembayaran tunai kurang dari total tagihan.')
      return
    }

    try {
      setIsProcessing(true)

      const payload: CreateTransactionPayload = {
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'cash' ? cashAmountPaid : undefined,
        discount_type: orderDiscountValue > 0 ? orderDiscountType : null,
        discount_value: orderDiscountValue > 0 ? orderDiscountValue : 0,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          discount_type: (item.discount_value ?? 0) > 0 ? item.discount_type : null,
          discount_value: (item.discount_value ?? 0) > 0 ? item.discount_value : 0,
          staff_ids: item.staff_ids && item.staff_ids.length > 0 ? item.staff_ids : undefined,
        })),
      }

      const tx = await createTransaction(payload)

      toast.success(`Transaksi berhasil! (${tx.invoice_no})`, {
        description: `Total: ${formatIDR(tx.total)} · Metode: ${tx.payment_method.toUpperCase()}`,
        duration: 4000,
      })

      clearCart()
      // Refresh stok produk di katalog secara real-time
      await loadProducts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses transaksi.'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <POSHeader
        subtitle="Transaksi"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      >
        {/* Tombol Keranjang (Mobile View) */}
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="relative sm:hidden flex items-center justify-center w-9 h-9 bg-indigo-600 text-white rounded-xl cursor-pointer"
        >
          <ShoppingCart size={18} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
      </POSHeader>

      {/* ── Main Container: 2 Kolom di Desktop ──────────────────────────────── */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* ── Kolom Kiri: Katalog Produk & Jasa ──────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 p-4 pb-28 sm:pb-4 gap-4">
          {/* Error Banner */}
          {loadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{loadError}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={loadProducts}>
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Kolom Pencarian */}
          <Input
            placeholder="Cari produk berdasarkan nama, SKU, merek, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />

          {/* Tab Kategori */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading Produk */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Memuat katalog produk & jasa...</p>
            </div>
          ) : (
            /* Grid Produk */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id)
                const isOutOfStock =
                  product.type === 'product' && product.track_stock && Number(product.stock) <= 0

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`bg-white rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] shadow-xs flex flex-col justify-between cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
                        : inCart
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-indigo-100'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            product.type === 'service'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {product.type === 'service' ? (
                            <Wrench size={20} />
                          ) : (
                            <Package size={20} />
                          )}
                        </div>

                        {product.type === 'product' && product.track_stock ? (
                          isOutOfStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              Habis
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500">
                              Stok: {product.stock}
                            </span>
                          )
                        ) : product.type === 'service' ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Jasa
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <span>{product.type === 'service' ? 'Layanan' : product.unit || 'pcs'}</span>
                        {product.brand && (
                          <>
                            <span>•</span>
                            <span className="truncate">{product.brand}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-bold text-indigo-600">
                        {formatIDR(Number(product.selling_price))}
                      </p>
                      {inCart && (
                        <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <Plus size={10} /> {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* Empty state: Belum ada produk aktif */}
              {products.length === 0 && (
                <div className="col-span-2 sm:col-span-3 py-16 flex flex-col items-center justify-center gap-3 text-center px-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <Package size={24} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Belum Ada Produk Aktif
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                    Tidak ada produk aktif yang ditemukan untuk bisnis ini. Tambahkan produk atau
                    aktifkan produk di menu Barang & Jasa.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Package size={16} />}
                    onClick={() => navigate('/pos/products')}
                    className="mt-2"
                  >
                    Kelola Barang & Jasa
                  </Button>
                </div>
              )}

              {/* Empty state: Filter tidak menemukan hasil */}
              {products.length > 0 && filteredProducts.length === 0 && (
                <div className="col-span-2 sm:col-span-3 py-16 flex flex-col items-center gap-2 text-slate-400">
                  <Search size={32} className="opacity-30" />
                  <p className="text-sm">Produk tidak ditemukan</p>
                  <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau kategori</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Kolom Kanan: Panel Keranjang Kasir (Desktop View) ─────────────────── */}
        <aside className="hidden sm:flex flex-col w-96 bg-white border-l border-slate-200 sticky top-14 h-[calc(100svh-3.5rem)]">
          <CartPanel
            cart={cart}
            businessId={businessId || ''}
            userId={user?.id}
            staffList={staffList}
            taxEnabled={taxEnabled}
            taxRate={taxRate}
            customer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onUpdateQty={updateQty}
            onRemoveFromCart={removeFromCart}
            onUpdateItemDiscount={updateItemDiscount}
            onUpdateItemStaff={updateItemStaff}
            orderDiscountType={orderDiscountType}
            orderDiscountValue={orderDiscountValue}
            onUpdateOrderDiscount={(type, val) => {
              setOrderDiscountType(type)
              setOrderDiscountValue(val)
            }}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            cashAmountPaid={cashAmountPaid}
            setCashAmountPaid={setCashAmountPaid}
            onCheckout={handleCheckout}
            isProcessing={isProcessing}
            onClear={clearCart}
          />
        </aside>
      </div>

      {/* ── Bottom Sheet Keranjang (Mobile View) ──────────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl h-[92svh] flex flex-col shadow-2xl overflow-hidden">
            <CartPanel
              cart={cart}
              businessId={businessId || ''}
              userId={user?.id}
              staffList={staffList}
              taxEnabled={taxEnabled}
              taxRate={taxRate}
              customer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onUpdateQty={updateQty}
              onRemoveFromCart={removeFromCart}
              onUpdateItemDiscount={updateItemDiscount}
              onUpdateItemStaff={updateItemStaff}
              orderDiscountType={orderDiscountType}
              orderDiscountValue={orderDiscountValue}
              onUpdateOrderDiscount={(type, val) => {
                setOrderDiscountType(type)
                setOrderDiscountValue(val)
              }}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              cashAmountPaid={cashAmountPaid}
              setCashAmountPaid={setCashAmountPaid}
              onCheckout={handleCheckout}
              isProcessing={isProcessing}
              onClear={clearCart}
              onClose={() => setShowCart(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Checkout Button (Mobile View) */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-6 inset-x-4 sm:hidden z-40">
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="w-full bg-indigo-600 text-white rounded-2xl py-3.5 flex items-center justify-between px-5 shadow-lg shadow-indigo-900/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
              <span className="font-semibold text-sm">{totalItems} Item</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{formatIDR(preview.total)}</span>
              <ReceiptText size={16} />
            </div>
          </button>
        </div>
      )}

      {/* ── Navigation Drawer ────────────────────────────────────────────────── */}
      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  )
}
