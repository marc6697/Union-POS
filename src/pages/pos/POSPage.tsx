import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  LogOut,
  Search,
  ReceiptText,
  Banknote,
  QrCode,
  CreditCard,
  X,
  Package,
  Wrench,
  AlertCircle,
  Store,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { formatIDR } from '../../lib/utils'
import { toast } from 'sonner'
import type { ProductItem, CartItem } from '../../types'
import { fetchActiveProductsByBusiness } from '../../lib/services/productService'
import POSHeader from '../../components/POSHeader'
import { useBusinessName } from '../../hooks/useBusinessName'

const CATEGORIES = ['Semua', 'Barang', 'Jasa'] as const

const PAYMENT_METHODS = [
  { id: 'cash' as const, label: 'Tunai', icon: Banknote },
  { id: 'qris' as const, label: 'QRIS', icon: QrCode },
  { id: 'card' as const, label: 'Kartu', icon: CreditCard },
]

// ─── POS Page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const businessName = useBusinessName()

  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('Semua')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card'>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const businessId = user?.business_id

  // ── Load Active Products ──────────────────────────────────────────────────
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

  // ── Derived Products ──────────────────────────────────────────────────────
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

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.selling_price) * item.quantity,
    0,
  )
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // ── Cart Handlers ─────────────────────────────────────────────────────────
  const addToCart = (product: ProductItem) => {
    const existing = cart.find((c) => c.product.id === product.id)
    const currentQty = existing ? existing.quantity : 0

    if (product.type === 'product' && product.track_stock && currentQty >= product.stock) {
      toast.error(`Stok ${product.name} tidak mencukupi (tersisa ${product.stock})`)
      return
    }

    setCart((prev) => {
      const exists = prev.find((c) => c.product.id === product.id)
      if (exists) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        )
      }
      return [...prev, { product, quantity: 1 }]
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

  const clearCart = () => {
    setCart([])
    setShowCart(false)
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong')
      return
    }
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 1000))
    setIsProcessing(false)
    clearCart()
    toast.success(`Transaksi berhasil! Total ${formatIDR(total)}`, {
      description: `Metode: ${paymentMethod.toUpperCase()} · ${totalItems} item`,
      duration: 4000,
    })
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <POSHeader
        subtitle="Transaksi"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      >
        {/* Cart button (mobile) */}
        <button
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

      {/* ── Body: 2-column on desktop ───────────────────────────────────────── */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* ── Left: Product Catalog ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
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

          {/* Search */}
          <Input
            placeholder="Cari produk berdasarkan nama, SKU, merek, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
          />

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Memuat produk...</p>
            </div>
          ) : (
            /* Product grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id)
                const isOutOfStock =
                  product.type === 'product' && product.track_stock && Number(product.stock) <= 0

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`bg-white rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.97] shadow-sm flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
                        : inCart
                        ? 'border-indigo-400 bg-indigo-50/30'
                        : 'border-slate-200 hover:border-indigo-200'
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

              {/* Empty state: No active products for the business */}
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
                    aktifkan produk di menu Barang dan Jasa.
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

              {/* Empty state: Filter / Search found nothing */}
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

        {/* ── Right: Cart Panel (desktop only) ────────────────────────────── */}
        <aside className="hidden sm:flex flex-col w-80 bg-white border-l border-slate-200 sticky top-14 h-[calc(100svh-3.5rem)]">
          <CartPanel
            cart={cart}
            subtotal={subtotal}
            tax={tax}
            total={total}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            updateQty={updateQty}
            removeFromCart={removeFromCart}
            onCheckout={handleCheckout}
            isProcessing={isProcessing}
            onClear={clearCart}
          />
        </aside>
      </div>

      {/* ── Mobile Cart Bottom Sheet ─────────────────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[85svh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Keranjang ({totalItems} item)</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                cart={cart}
                subtotal={subtotal}
                tax={tax}
                total={total}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                updateQty={updateQty}
                removeFromCart={removeFromCart}
                onCheckout={() => {
                  setShowCart(false)
                  handleCheckout()
                }}
                isProcessing={isProcessing}
                onClear={clearCart}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile floating checkout button */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-4 inset-x-4 sm:hidden z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-lg shadow-indigo-900/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
              <span className="font-semibold">{totalItems} Item</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatIDR(total)}</span>
              <ReceiptText size={16} />
            </div>
          </button>
        </div>
      )}

      {/* ── Burger Menu Drawer ──────────────────────────────────────────────── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <ShoppingBag size={16} className="text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Union POS</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Profile summary in drawer */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400 font-medium">Masuk sebagai</p>
              <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                {user?.full_name}
              </p>
              {businessName && (
                <p className="text-xs font-medium text-slate-600 truncate mt-1 flex items-center gap-1.5">
                  <Store size={13} className="text-slate-400 shrink-0" />
                  <span>{businessName}</span>
                </p>
              )}
              <div className="mt-2">
                <Badge variant={user?.role ?? 'kasir'} />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate('/pos')
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 transition-colors"
              >
                <ReceiptText size={18} className="text-indigo-600" />
                <span>Transaksi</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate('/pos/products')
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Package size={18} className="text-slate-500" />
                <span>Barang dan Jasa</span>
              </button>
            </div>

            {/* Bottom Section: Log Out */}
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cart Panel Component ─────────────────────────────────────────────────────
interface CartPanelProps {
  cart: CartItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: 'cash' | 'qris' | 'card'
  setPaymentMethod: (m: 'cash' | 'qris' | 'card') => void
  updateQty: (id: string, delta: number) => void
  removeFromCart: (id: string) => void
  onCheckout: () => void
  isProcessing: boolean
  onClear: () => void
}

function CartPanel({
  cart,
  subtotal,
  tax,
  total,
  paymentMethod,
  setPaymentMethod,
  updateQty,
  removeFromCart,
  onCheckout,
  isProcessing,
  onClear,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Cart header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Keranjang</span>
          {cart.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {cart.reduce((s, c) => s + c.quantity, 0)}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
            <ShoppingCart size={40} className="opacity-40" />
            <p className="text-sm">Keranjang kosong</p>
            <p className="text-xs text-center">Tap produk untuk menambahkan ke keranjang</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.product.name}</p>
                <p className="text-xs text-indigo-600">
                  {formatIDR(Number(item.product.selling_price))}
                </p>
              </div>
              {/* Quantity controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQty(item.product.id, -1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                >
                  <Minus size={11} />
                </button>
                <span className="w-5 text-center text-sm font-semibold text-slate-700">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQty(item.product.id, 1)}
                  className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={11} />
                </button>
              </div>
              <button
                onClick={() => removeFromCart(item.product.id)}
                className="text-slate-300 hover:text-red-400 transition-colors ml-1 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals & Checkout */}
      {cart.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
          {/* Summary */}
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>PPN 10%</span>
              <span>{formatIDR(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-100">
              <span>Total</span>
              <span className="text-indigo-700">{formatIDR(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer ${
                    paymentMethod === id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Checkout button */}
          <Button
            size="lg"
            className="w-full"
            onClick={onCheckout}
            isLoading={isProcessing}
            leftIcon={<ReceiptText size={16} />}
          >
            {isProcessing ? 'Memproses...' : `Bayar ${formatIDR(total)}`}
          </Button>
        </div>
      )}
    </div>
  )
}
