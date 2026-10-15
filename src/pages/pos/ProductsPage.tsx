import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import { formatIDR } from '../../lib/utils'
import { toast } from 'sonner'
import type { ProductItem, ProductFormData, ItemType } from '../../types'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import { useBusinessName } from '../../hooks/useBusinessName'
import {
  fetchProductsByBusiness,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../lib/services/productService'

export const PRODUCT_UNITS = ['pcs', 'pack', 'grup', 'bundling'] as const

const DEFAULT_FORM: ProductFormData = {
  name: '',
  type: 'product',
  sku: '',
  barcode: '',
  brand: '',
  unit: 'pcs',
  cost_price: 0,
  selling_price: 0,
  track_stock: true,
  stock: 0,
  has_commission: false,
  is_active: true,
}

// ─── Modal Form Tambah / Edit Produk ──────────────────────────────────────────
function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isEdit,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => void
  initial: ProductFormData
  isEdit: boolean
  isSaving: boolean
}) {
  const [form, setForm] = useState<ProductFormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({})
  // Mode otomatis aktif jika produk baru dan belum ada SKU yang diisi
  const [isAutoSku, setIsAutoSku] = useState<boolean>(!isEdit && !initial.sku)

  useEffect(() => {
    setForm(initial)
    setErrors({})
    setIsAutoSku(!isEdit && !initial.sku)
  }, [initial, isOpen, isEdit])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ProductFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Nama item wajib diisi'
    if (form.cost_price < 0) errs.cost_price = 'HPP tidak boleh negatif'
    if (form.selling_price < 0) errs.selling_price = 'Harga jual tidak boleh negatif'
    if (form.type === 'product' && form.track_stock && form.stock < 0) {
      errs.stock = 'Stok tidak boleh negatif'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    // Jika sedang edit dan form.sku kosong (misal akibat uncheck lalu check lagi),
    // pertahankan SKU lama (initial.sku) agar tidak tertimpa null di database.
    const finalSku = isEdit && !form.sku.trim() ? (initial.sku || '') : form.sku
    onSave({ ...form, sku: finalSku })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Barang / Jasa' : 'Tambah Barang / Jasa'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving} size="sm">
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSaving} size="sm">
            {isEdit ? 'Simpan Perubahan' : 'Tambah Item'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        {/* Tipe: Barang vs Jasa */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Tipe Item</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  type: 'product',
                  track_stock: true,
                }))
              }
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                form.type === 'product'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Package size={16} />
              <span>Barang Fisik</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  type: 'service',
                  track_stock: false,
                  stock: 0,
                }))
              }
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                form.type === 'service'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Wrench size={16} />
              <span>Jasa / Layanan</span>
            </button>
          </div>
        </div>

        {/* Nama Produk */}
        <Input
          label="Nama Barang / Jasa *"
          placeholder="Contoh: Kopi Susu Aren / Potong Rambut"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
        />

        {/* Harga Jual & HPP */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Harga Jual (Rp) *"
              type="number"
              min={0}
              placeholder="0"
              value={form.selling_price || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, selling_price: Number(e.target.value) || 0 }))
              }
              error={errors.selling_price}
            />
            <Input
              label="HPP / Modal (Rp)"
              type="number"
              min={0}
              placeholder="0"
              value={form.cost_price || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, cost_price: Number(e.target.value) || 0 }))
              }
              error={errors.cost_price}
            />
          </div>

          {/* Label Potensi Keuntungan (Margin Profit) */}
          <div className="mt-1.5 px-1 flex items-center justify-between text-xs">
            {form.selling_price > 0 ? (
              (() => {
                const profit = form.selling_price - form.cost_price
                const percentage =
                  form.cost_price > 0
                    ? Math.round((profit / form.cost_price) * 100)
                    : form.selling_price > 0
                    ? 100
                    : 0
                const isLoss = profit < 0
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      isLoss ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    <span>
                      Estimasi Keuntungan:{' '}
                      <strong className="font-semibold">
                        {isLoss ? '-' : '+'}
                        {formatIDR(Math.abs(profit))}
                      </strong>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                        isLoss
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {percentage > 0 ? `+${percentage}%` : `${percentage}%`}
                    </span>
                  </span>
                )
              })()
            ) : (
              <span className="text-slate-400 text-[11px]">
                Masukkan harga jual untuk melihat estimasi keuntungan
              </span>
            )}
          </div>
        </div>

        {/* SKU & Barcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <Input
              label="Kode SKU"
              placeholder={isAutoSku ? 'Otomatis dibuat oleh sistem (00001)' : 'Ketik SKU manual...'}
              value={isAutoSku ? (initial.sku || '') : form.sku}
              disabled={isAutoSku}
              onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
            />
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAutoSku}
                onChange={(e) => {
                  const checked = e.target.checked
                  setIsAutoSku(checked)
                  if (!checked) {
                    // Ketika uncheck untuk ubah manual, kembalikan SKU yang ada
                    setForm((prev) => ({ ...prev, sku: prev.sku || initial.sku || '' }))
                  } else {
                    // Jika mode edit, tetap pertahankan initial.sku; jika baru, kosongkan untuk trigger db
                    setForm((prev) => ({ ...prev, sku: isEdit ? (initial.sku || '') : '' }))
                  }
                }}
                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px] font-medium text-slate-600">
                Otomatisasi nomor SKU sistem (00001, dst.)
              </span>
            </label>
          </div>
          <div>
            <Input
              label="Barcode (Opsional)"
              placeholder="899..."
              value={form.barcode}
              onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
            />
          </div>
        </div>

        {/* Brand & Satuan (Brand hanya untuk Barang Fisik) */}
        <div
          className={
            form.type === 'product'
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
              : 'grid grid-cols-1 gap-3'
          }
        >
          {form.type === 'product' && (
            <Input
              label="Merek / Brand"
              placeholder="Contoh: Nestle / Local"
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
            />
          )}
          <Select
            label="Satuan Unit"
            options={PRODUCT_UNITS}
            value={form.unit || 'pcs'}
            onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
          />
        </div>

        {/* Pengaturan Stok (Khusus Barang Fisik) */}
        {form.type === 'product' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Lacak Stok Barang</p>
                <p className="text-[11px] text-slate-500">Stok berkurang saat transaksi berhasil</p>
              </div>
              <input
                type="checkbox"
                id="track_stock"
                checked={form.track_stock}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, track_stock: e.target.checked }))
                }
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {form.track_stock && (
              <Input
                label="Jumlah Stok Saat Ini"
                type="number"
                min={0}
                placeholder="0"
                value={form.stock || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))
                }
                error={errors.stock}
              />
            )}
          </div>
        )}

        {/* Pengaturan Komisi (Persiapan Fitur Masa Depan) */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-slate-800">Termasuk Komisi Penjualan</p>
            <p className="text-[11px] text-slate-500">
              Tandai apakah item ini dapat memberikan komisi kepada staf
            </p>
          </div>
          <input
            type="checkbox"
            id="has_commission"
            checked={form.has_commission}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, has_commission: e.target.checked }))
            }
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Status Aktif */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-slate-800">Tampilkan di Menu Kasir (Aktif)</p>
            <p className="text-[11px] text-slate-500">
              {form.is_active ? 'Item aktif dan muncul di POS' : 'Item disembunyikan dari POS'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
              form.is_active ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.is_active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Hapus Produk ───────────────────────────────────────────────────────
function DeleteProductModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isDeleting,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
  isDeleting: boolean
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Produk"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting} size="sm">
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting} size="sm">
            Hapus
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Apakah Anda yakin ingin menghapus{' '}
        <span className="font-semibold text-slate-900">"{productName}"</span>?
        Item akan disembunyikan dari katalog POS, namun riwayat transaksi lampau tetap aman.
      </p>
    </Modal>
  )
}

// ─── Main ProductsPage Component ──────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useAuthStore()
  const businessName = useBusinessName()

  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Filter & Search
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all')

  // Modals state
  const [formModal, setFormModal] = useState<{
    open: boolean
    isEdit: boolean
    editId?: string
    data: ProductFormData
  }>({
    open: false,
    isEdit: false,
    data: DEFAULT_FORM,
  })
  const [isSaving, setIsSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    target: ProductItem | null
  }>({
    open: false,
    target: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const businessId = user?.business_id

  // ── Fetch Products ──────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchProductsByBusiness(businessId)
      setProducts(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat produk'
      setLoadError(msg)
      toast.error(`Gagal memuat data: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // ── Filtered Products ───────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchType = typeFilter === 'all' || p.type === typeFilter
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      return matchType && matchSearch
    })
  }, [products, search, typeFilter])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormModal({
      open: true,
      isEdit: false,
      data: DEFAULT_FORM,
    })
  }

  const handleOpenEdit = (p: ProductItem) => {
    setFormModal({
      open: true,
      isEdit: true,
      editId: p.id,
      data: {
        name: p.name,
        type: p.type,
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        brand: p.brand ?? '',
        unit: p.unit ?? 'pcs',
        cost_price: Number(p.cost_price) || 0,
        selling_price: Number(p.selling_price) || 0,
        track_stock: p.track_stock,
        stock: Number(p.stock) || 0,
        has_commission: p.has_commission,
        is_active: p.is_active,
      },
    })
  }

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (!businessId) {
      toast.error('Business ID tidak ditemukan pada akun Anda')
      return
    }
    setIsSaving(true)
    try {
      if (formModal.isEdit && formModal.editId) {
        const updated = await updateProduct(formModal.editId, formData)
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        toast.success(`"${updated.name}" berhasil diperbarui`)
      } else {
        const created = await createProduct(businessId, formData)
        setProducts((prev) => [created, ...prev])
        toast.success(`"${created.name}" berhasil ditambahkan`)
      }
      setFormModal({ open: false, isEdit: false, data: DEFAULT_FORM })
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Gagal menyimpan produk'
      let friendlyMsg = rawMsg

      if (rawMsg.includes('products_business_sku_unique') || (rawMsg.includes('sku') && rawMsg.includes('duplicate'))) {
        friendlyMsg = `Kode SKU "${formData.sku}" sudah digunakan oleh barang lain. Silakan gunakan kode SKU yang berbeda.`
      } else if (rawMsg.includes('products_business_barcode_unique') || (rawMsg.includes('barcode') && rawMsg.includes('duplicate'))) {
        friendlyMsg = `Barcode "${formData.barcode}" sudah terdaftar pada barang lain.`
      }

      toast.error(friendlyMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    const target = deleteModal.target
    if (!target) return
    setIsDeleting(true)
    try {
      await deleteProduct(target.id)
      setProducts((prev) => prev.filter((item) => item.id !== target.id))
      toast.success(`"${target.name}" berhasil dihapus`)
      setDeleteModal({ open: false, target: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus produk'
      toast.error(`Gagal: ${msg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <POSHeader
        subtitle="Barang dan Jasa"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      {/* ── Main Content Container ──────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        {/* Header Section: Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kelola Barang & Jasa</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Daftar katalog produk, tarif layanan, dan kontrol inventori bisnis Anda.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
            className="w-full sm:w-auto shrink-0"
          >
            Tambah Item
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Cari berdasarkan nama, SKU, merek, atau barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setTypeFilter('product')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === 'product'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Barang ({products.filter((p) => p.type === 'product').length})
            </button>
            <button
              onClick={() => setTypeFilter('service')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === 'service'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jasa ({products.filter((p) => p.type === 'service').length})
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {loadError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadProducts}>
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Memuat data produk...</p>
          </div>
        ) : (
          /* Products List Table / Cards */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Package size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {search ? 'Produk tidak ditemukan' : 'Belum ada data barang atau jasa'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  {search
                    ? 'Coba gunakan kata kunci pencarian lain atau ubah filter tipe item.'
                    : 'Mulai dengan menambahkan produk fisik atau layanan jasa pertama untuk bisnis Anda.'}
                </p>
                {!search && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={handleOpenCreate}
                    className="mt-4"
                  >
                    Tambah Item Baru
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold text-xs">
                      <th className="py-3 px-4">Item & Info</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4">Harga Jual</th>
                      <th className="py-3 px-4">HPP (Modal)</th>
                      <th className="py-3 px-4">Stok</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Item & Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                              {p.type === 'service' ? <Wrench size={18} /> : <Package size={18} />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">{p.name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                {p.sku && <span>SKU: {p.sku}</span>}
                                {p.sku && p.barcode && <span>•</span>}
                                {p.barcode && <span>Barcode: {p.barcode}</span>}
                                {p.brand && <span>({p.brand})</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tipe Item */}
                        <td className="py-3.5 px-4">
                          {p.type === 'service' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Wrench size={12} /> Jasa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Package size={12} /> Barang
                            </span>
                          )}
                        </td>

                        {/* Harga Jual */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatIDR(Number(p.selling_price) || 0)}
                        </td>

                        {/* HPP (Modal) */}
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatIDR(Number(p.cost_price) || 0)}
                        </td>

                        {/* Stok */}
                        <td className="py-3.5 px-4">
                          {p.type === 'service' ? (
                            <span className="text-xs text-slate-400 italic">Tidak dilacak</span>
                          ) : !p.track_stock ? (
                            <span className="text-xs text-slate-400 italic">Tanpa stok</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-semibold ${
                                  Number(p.stock) <= 0
                                    ? 'text-red-600'
                                    : Number(p.stock) < 10
                                    ? 'text-amber-600'
                                    : 'text-slate-900'
                                }`}
                              >
                                {p.stock}
                              </span>
                              <span className="text-xs text-slate-400">{p.unit || 'pcs'}</span>
                            </div>
                          )}
                        </td>

                        {/* Status Aktif */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {p.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit item"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, target: p })}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ProductFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal((prev) => ({ ...prev, open: false }))}
        onSave={handleSaveProduct}
        initial={formModal.data}
        isEdit={formModal.isEdit}
        isSaving={isSaving}
      />

      <DeleteProductModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, target: null })}
        onConfirm={handleDeleteConfirm}
        productName={deleteModal.target?.name ?? ''}
        isDeleting={isDeleting}
      />

      {/* ── Burger Menu Drawer ──────────────────────────────────────────────── */}
      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  )
}
