import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { useAuthStore } from '../../store/authStore'
import { useBusinessName } from '../../hooks/useBusinessName'
import { toast } from 'sonner'
import type { Customer, CustomerFormData } from '../../types'
import {
  fetchCustomersByBusiness,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../lib/services/customerService'

const DEFAULT_FORM: CustomerFormData = {
  name: '',
  phone_number: '',
  email: '',
  address: '',
  notes: '',
  is_active: true,
}

// ─── Modal Form Tambah / Edit Pelanggan ────────────────────────────────────────
function CustomerFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isEdit,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CustomerFormData) => void
  initial: CustomerFormData
  isEdit: boolean
  isSaving: boolean
}) {
  const [form, setForm] = useState<CustomerFormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({})

  useEffect(() => {
    setForm(initial)
    setErrors({})
  }, [initial, isOpen])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof CustomerFormData, string>> = {}
    if (!form.name.trim()) {
      errs.name = 'Nama pelanggan wajib diisi'
    }

    const cleanPhone = form.phone_number.trim()
    if (!cleanPhone) {
      errs.phone_number = 'Nomor telepon wajib diisi'
    } else if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      errs.phone_number = 'Nomor telepon harus antara 8 - 15 digit angka'
    }

    const cleanEmail = form.email.trim()
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      errs.email = 'Format email tidak valid (contoh: budi@gmail.com)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSave({
      ...form,
      name: form.name.trim(),
      phone_number: form.phone_number.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving} size="sm">
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSaving} size="sm">
            {isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* Nama Pelanggan */}
        <Input
          label="Nama Pelanggan *"
          placeholder="Contoh: Budi Santoso"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
        />

        {/* Nomor Telepon */}
        <Input
          label="Nomor Telepon / WhatsApp *"
          type="tel"
          inputMode="numeric"
          placeholder="Contoh: 081234567890"
          value={form.phone_number}
          onChange={(e) => {
            // Hanya izinkan angka (digit)
            const digitsOnly = e.target.value.replace(/\D/g, '')
            setForm((prev) => ({ ...prev, phone_number: digitsOnly }))
            if (errors.phone_number) {
              setErrors((prev) => ({ ...prev, phone_number: undefined }))
            }
          }}
          error={errors.phone_number}
        />

        {/* Email */}
        <Input
          label="Email (Opsional)"
          type="email"
          placeholder="budi@example.com"
          value={form.email}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, email: e.target.value }))
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }))
            }
          }}
          error={errors.email}
        />

        {/* Alamat */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">
            Alamat (Opsional)
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            placeholder="Alamat lengkap domisili atau pengiriman..."
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            placeholder="Preferensi khusus, catatan alergi, member khusus..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        {/* Status Aktif */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">Status Pelanggan</span>
            <span className="text-xs text-slate-400">
              Pelanggan aktif dapat dipilih saat transaksi kasir
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Hapus Pelanggan ────────────────────────────────────────────────────
function DeleteCustomerModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  isDeleting,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  customerName: string
  isDeleting: boolean
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Pelanggan"
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
        Apakah Anda yakin ingin menghapus pelanggan{' '}
        <span className="font-semibold text-slate-900">"{customerName}"</span>?
        Pelanggan akan disembunyikan dari daftar, namun riwayat transaksi terdahulu tetap terjaga aman.
      </p>
    </Modal>
  )
}

// ─── Main CustomersPage Component ─────────────────────────────────────────────
export default function CustomersPage() {
  const { user } = useAuthStore()
  const businessName = useBusinessName()
  const businessId = user?.business_id

  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input agar tidak membebani database
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset ke page 1 saat kata kunci pencarian berubah
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Modals state
  const [formModal, setFormModal] = useState<{
    open: boolean
    isEdit: boolean
    editId?: string
    data: CustomerFormData
  }>({
    open: false,
    isEdit: false,
    data: DEFAULT_FORM,
  })
  const [isSaving, setIsSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    target: Customer | null
  }>({
    open: false,
    target: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Fetch Customers with Pagination ─────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetchCustomersByBusiness(businessId, {
        page,
        pageSize,
        search: debouncedSearch,
      })
      setCustomers(res.data)
      setTotalCount(res.count)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pelanggan'
      setLoadError(msg)
      toast.error(`Gagal memuat data: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }, [businessId, page, pageSize, debouncedSearch])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // ── Modal Handlers ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormModal({
      open: true,
      isEdit: false,
      data: DEFAULT_FORM,
    })
  }

  const handleOpenEdit = (customer: Customer) => {
    setFormModal({
      open: true,
      isEdit: true,
      editId: customer.id,
      data: {
        name: customer.name,
        phone_number: customer.phone_number,
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
        is_active: customer.is_active,
      },
    })
  }

  const handleOpenDelete = (customer: Customer) => {
    setDeleteModal({
      open: true,
      target: customer,
    })
  }

  const handleSaveCustomer = async (formData: CustomerFormData) => {
    if (!businessId) {
      toast.error('Identitas bisnis tidak ditemukan')
      return
    }
    setIsSaving(true)
    try {
      if (formModal.isEdit && formModal.editId) {
        const updated = await updateCustomer(formModal.editId, formData)
        setCustomers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        toast.success(`Data pelanggan "${updated.name}" berhasil diperbarui`)
      } else {
        const created = await createCustomer(businessId, formData, user?.id)
        setCustomers((prev) => [created, ...prev])
        toast.success(`Pelanggan "${created.name}" berhasil ditambahkan`)
      }
      setFormModal({ open: false, isEdit: false, data: DEFAULT_FORM })
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Gagal menyimpan data pelanggan'
      let friendlyMsg = rawMsg
      if (
        rawMsg.includes('customers_business_phone_unique') ||
        (rawMsg.includes('phone_number') && rawMsg.includes('duplicate'))
      ) {
        friendlyMsg = `Nomor telepon "${formData.phone_number}" sudah terdaftar untuk pelanggan lain di toko Anda.`
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
      await deleteCustomer(target.id)
      setCustomers((prev) => prev.filter((item) => item.id !== target.id))
      toast.success(`Pelanggan "${target.name}" berhasil dihapus`)
      setDeleteModal({ open: false, target: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pelanggan'
      toast.error(`Gagal: ${msg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pelanggan"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        {/* Header Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Daftar Pelanggan</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola basis data pelanggan, nomor kontak, dan preferensi layanan bisnis Anda.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<UserPlus size={16} />}
            onClick={handleOpenCreate}
            className="w-full sm:w-auto shrink-0"
          >
            Tambah Pelanggan
          </Button>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Cari nama, no HP, email, atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <div className="text-xs text-slate-500 ml-auto hidden sm:flex items-center gap-3">
            <span>
              Total: <strong className="text-slate-800">{totalCount}</strong> pelanggan
            </span>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadCustomers}>
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
            <p className="text-sm text-slate-500">Memuat data pelanggan...</p>
          </div>
        )}

        {/* Empty State: Belum ada pelanggan sama sekali */}
        {!isLoading && !loadError && totalCount === 0 && !debouncedSearch && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <Users size={28} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Belum Ada Pelanggan</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Daftarkan pelanggan setia untuk mencatat riwayat transaksi, nomor kontak, dan layanan khusus.
            </p>
            <Button variant="secondary" leftIcon={<UserPlus size={16} />} onClick={handleOpenCreate}>
              Daftarkan Pelanggan Pertama
            </Button>
          </div>
        )}

        {/* Empty State: Hasil filter/search kosong */}
        {!isLoading && !loadError && totalCount === 0 && debouncedSearch && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
            <Search size={32} className="text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">Pelanggan Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tidak ada data pelanggan yang cocok dengan kata kunci "{debouncedSearch}".
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearch('')}
              className="mt-4"
            >
              Reset Pencarian
            </Button>
          </div>
        )}

        {/* List Content: Desktop Table & Mobile Cards */}
        {!isLoading && !loadError && customers.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Kontak</th>
                    <th className="py-3 px-4">Alamat & Catatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama Pelanggan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center shrink-0">
                            {customer.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {customer.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              Terdaftar: {new Date(customer.created_at).toLocaleDateString('id-ID')}
                              {customer.creator?.full_name ? ` • oleh ${customer.creator.full_name}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kontak */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-2 text-slate-700 text-xs">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="font-medium">{customer.phone_number}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Alamat & Catatan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {customer.address ? (
                          <div className="flex items-start gap-1.5 text-xs text-slate-600 line-clamp-1 mb-0.5">
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        ) : null}
                        {customer.notes ? (
                          <div className="flex items-start gap-1.5 text-xs text-slate-500 italic line-clamp-1">
                            <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{customer.notes}</span>
                          </div>
                        ) : null}
                        {!customer.address && !customer.notes && (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={customer.is_active ? 'active' : 'inactive'}
                          label={customer.is_active ? 'Aktif' : 'Nonaktif'}
                          dot
                        />
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Pelanggan"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(customer)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Pelanggan"
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

            {/* Mobile / Tablet Cards View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center shrink-0">
                        {customer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{customer.name}</h3>
                        <span className="text-xs text-slate-400">
                          {new Date(customer.created_at).toLocaleDateString('id-ID')}
                          {customer.creator?.full_name ? ` • oleh ${customer.creator.full_name}` : ''}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={customer.is_active ? 'active' : 'inactive'}
                      label={customer.is_active ? 'Aktif' : 'Nonaktif'}
                      dot
                    />
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{customer.phone_number}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-600 line-clamp-2">{customer.address}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                        <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic text-slate-500 line-clamp-2">{customer.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pencil size={14} />}
                      onClick={() => handleOpenEdit(customer)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      onClick={() => handleOpenDelete(customer)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Menampilkan{' '}
                  <strong className="text-slate-800">
                    {Math.min((page - 1) * pageSize + 1, totalCount)} -{' '}
                    {Math.min(page * pageSize, totalCount)}
                  </strong>{' '}
                  dari <strong className="text-slate-800">{totalCount}</strong> pelanggan
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    leftIcon={<ChevronLeft size={15} />}
                  >
                    Sebelumnya
                  </Button>

                  <div className="flex items-center gap-1 px-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Halaman {page} dari {totalPages}
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    rightIcon={<ChevronRight size={15} />}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CustomerFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal((prev) => ({ ...prev, open: false }))}
        onSave={handleSaveCustomer}
        initial={formModal.data}
        isEdit={formModal.isEdit}
        isSaving={isSaving}
      />

      <DeleteCustomerModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, target: null })}
        onConfirm={handleDeleteConfirm}
        customerName={deleteModal.target?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
