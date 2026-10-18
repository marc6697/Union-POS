import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Pencil,
  Trash2,
  LogOut,
  Users,
  ToggleLeft,
  ToggleRight,

} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { BUSINESS_TYPES } from '../../types'
import type { Business, BusinessFormData, BusinessStatus } from '../../types'
import { formatDate } from '../../lib/utils'
import {
  fetchBusinesses,
  createBusiness,
  updateBusiness,
  toggleBusinessStatus,
  deleteBusiness,
} from '../../lib/services/businessService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

const EMPTY_FORM: BusinessFormData = {
  business_name: '',
  business_type: '' as BusinessFormData['business_type'],
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  password: '',
  status: 'active',
}

const PHONE_RE = /^\+?[0-9]{9,15}$/

/** Keep digits only; allow a single leading "+". */
function sanitizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  return value.trimStart().startsWith('+') ? `+${digits}` : digits
}

// ─── Business Form Modal ──────────────────────────────────────────────────────
function BusinessFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isEdit,
  isSaving,
  businessCode,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BusinessFormData) => void
  initial: BusinessFormData
  isEdit: boolean
  isSaving: boolean
  businessCode?: string
}) {
  const [form, setForm] = useState<BusinessFormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessFormData, string>>>({})

  const set = (field: keyof BusinessFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const hasChanges =
    form.business_name.trim() !== initial.business_name.trim() ||
    form.business_type !== initial.business_type ||
    form.owner_name.trim() !== initial.owner_name.trim() ||
    form.owner_phone.trim() !== initial.owner_phone.trim() ||
    form.owner_email.trim() !== initial.owner_email.trim() ||
    Boolean(form.password.trim()) ||
    form.status !== initial.status

  const isSubmitDisabled = isSaving || (isEdit && !hasChanges)

  const validate = () => {
    const e: Partial<Record<keyof BusinessFormData, string>> = {}
    if (!form.business_name.trim()) e.business_name = 'Nama bisnis wajib diisi'
    if (!form.business_type) e.business_type = 'Tipe bisnis wajib dipilih'
    if (!form.owner_name.trim()) e.owner_name = 'Nama owner wajib diisi'
    if (!form.owner_phone.trim()) e.owner_phone = 'No. telepon wajib diisi'
    else if (!PHONE_RE.test(form.owner_phone))
      e.owner_phone = 'No. telepon harus berupa angka (9-15 digit, boleh diawali +)'
    if (!form.owner_email.trim()) e.owner_email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email))
      e.owner_email = 'Format email tidak valid'
    if (!isEdit && !form.password) e.password = 'Password wajib diisi'
    else if (form.password && form.password.length < 8)
      e.password = 'Password minimal 8 karakter'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (validate()) onSave(form)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Bisnis' : 'Tambah Bisnis Baru'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} size="sm" disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} size="sm" disabled={isSubmitDisabled}>
            {isSaving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Bisnis'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isEdit && (
          <Input
            label="Kode Bisnis"
            value={businessCode || '-'}
            disabled
            className="bg-slate-50 cursor-not-allowed text-slate-500 font-mono"
          />
        )}
        <Input
          label="Nama Bisnis"
          placeholder="cth. Warung Makan Bu Sari"
          value={form.business_name}
          onChange={(e) => set('business_name', e.target.value)}
          error={errors.business_name}
        />
        <Select
          label="Tipe Bisnis"
          placeholder="Pilih tipe bisnis"
          options={BUSINESS_TYPES}
          value={form.business_type}
          onChange={(e) => set('business_type', e.target.value)}
          error={errors.business_type}
        />
        <Input
          label="Nama Owner"
          type="text"
          autoComplete="name"
          placeholder="Nama lengkap pemilik"
          value={form.owner_name}
          onChange={(e) => set('owner_name', e.target.value)}
          error={errors.owner_name}
        />
        <Input
          label="No. Telepon Owner"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          pattern="\+?[0-9]*"
          placeholder="cth. 081234567890"
          value={form.owner_phone}
          onChange={(e) => set('owner_phone', sanitizePhone(e.target.value))}
          leftIcon={<Phone size={14} />}
          error={errors.owner_phone}
        />
        <Input
          label="Email Owner"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="email@contoh.com"
          value={form.owner_email}
          onChange={(e) => set('owner_email', e.target.value.trim())}
          leftIcon={<Mail size={14} />}
          error={errors.owner_email}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            label={isEdit ? 'Password Baru (opsional)' : 'Password Owner'}
            type="password"
            autoComplete="new-password"
            placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
          />
          <p className="text-xs text-slate-400">
            Email dan password ini dipakai owner untuk login.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Status Akun</label>
          <div className="flex gap-2">
            {(['active', 'inactive'] as BusinessStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('status', s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.status === s
                    ? s === 'active'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-400 bg-slate-50 text-slate-600'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {s === 'active' ? '✓ Aktif' : '✕ Nonaktif'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  businessName,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  businessName: string
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Bisnis"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} size="sm">Batal</Button>
          <Button variant="danger" onClick={onConfirm} size="sm">Hapus</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Apakah Anda yakin ingin menghapus bisnis{' '}
        <span className="font-semibold text-slate-900">"{businessName}"</span>?
        Bisnis akan disembunyikan dari daftar dan akun owner tidak bisa login lagi.
        Data tetap tersimpan di database.
      </p>
    </Modal>
  )
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')

  const loadBusinesses = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setBusinesses(await fetchBusinesses())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  // Modal state
  const [formModal, setFormModal] = useState<{
    open: boolean
    isEdit: boolean
    target: Business | null
  }>({ open: false, isEdit: false, target: null })

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    target: Business | null
  }>({ open: false, target: null })

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = businesses.filter(
    (b) =>
      b.business_name.toLowerCase().includes(search.toLowerCase()) ||
      b.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      b.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      b.business_type.toLowerCase().includes(search.toLowerCase()),
  )

  const stats = {
    total: businesses.length,
    active: businesses.filter((b) => b.status === 'active').length,
    inactive: businesses.filter((b) => b.status === 'inactive').length,
  }

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const openAdd = () =>
    setFormModal({ open: true, isEdit: false, target: null })

  const openEdit = (biz: Business) =>
    setFormModal({ open: true, isEdit: true, target: biz })

  const closeForm = () => setFormModal({ open: false, isEdit: false, target: null })

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan')

  const handleSave = async (data: BusinessFormData) => {
    setIsSaving(true)
    try {
      if (formModal.isEdit && formModal.target) {
        const updated = await updateBusiness(formModal.target.id, data)
        setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
        toast.success('Bisnis berhasil diperbarui')
      } else {
        const created = await createBusiness(data)
        setBusinesses((prev) => [created, ...prev])
        toast.success('Bisnis baru berhasil ditambahkan')
      }
      closeForm()
    } catch (e) {
      toast.error(`Gagal menyimpan bisnis: ${errMsg(e)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (biz: Business) => {
    try {
      const updated = await toggleBusinessStatus(biz.id, biz.status)
      setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      toast.success(
        `Bisnis berhasil ${updated.status === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`,
      )
    } catch (e) {
      toast.error(`Gagal mengubah status: ${errMsg(e)}`)
    }
  }

  const confirmDelete = async () => {
    const target = deleteModal.target
    if (!target) return
    try {
      await deleteBusiness(target.id)
      setBusinesses((prev) => prev.filter((b) => b.id !== target.id))
      toast.success('Bisnis berhasil dihapus')
      setDeleteModal({ open: false, target: null })
    } catch (e) {
      toast.error(`Gagal menghapus bisnis: ${errMsg(e)}`)
    }
  }


  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-slate-50 flex flex-col">
      {/* ── Top Navigation ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Union POS</span>
              <span className="text-slate-400 text-xs ml-2">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Badge variant="superadmin" />
              <span className="text-slate-600 font-medium">{user?.full_name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut size={14} />}
              className="text-slate-500"
            >
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Bisnis</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola semua bisnis yang terdaftar di platform Union POS
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Bisnis', value: stats.total, icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Aktif', value: stats.active, icon: ToggleRight, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Nonaktif', value: stats.inactive, icon: ToggleLeft, color: 'text-slate-500 bg-slate-100' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Cari nama bisnis, owner, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <Button
            onClick={openAdd}
            leftIcon={<Plus size={16} />}
            className="shrink-0"
          >
            Tambah Bisnis
          </Button>
        </div>

        {/* Business List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 flex items-center justify-center text-sm text-slate-400">
              Memuat data bisnis...
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-2xl border border-red-200 py-16 flex flex-col items-center gap-3 text-red-500">
              <p className="text-sm">Gagal memuat data: {loadError}</p>
              <Button variant="secondary" size="sm" onClick={loadBusinesses}>
                Coba lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
              <Users size={40} className="opacity-30" />
              <p className="text-sm">
                {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada bisnis terdaftar'}
              </p>
              {!search && (
                <Button variant="secondary" size="sm" onClick={openAdd}>
                  Tambah bisnis pertama
                </Button>
              )}
            </div>
          ) : (
            filtered.map((biz) => (
              <div
                key={biz.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Business Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">
                    {biz.business_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {biz.business_name}
                      </span>
                      <StatusBadge status={biz.status} />
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{biz.owner_name}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">{biz.business_type}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Phone size={11} /> {biz.owner_phone}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Mail size={11} /> {biz.owner_email}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Dibuat {formatDate(biz.created_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  {/* Toggle status */}
                  <button
                    onClick={() => toggleStatus(biz)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      biz.status === 'active'
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {biz.status === 'active' ? (
                      <ToggleRight size={14} />
                    ) : (
                      <ToggleLeft size={14} />
                    )}
                    {biz.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </button>

                  <div className="flex items-center gap-1 ml-auto sm:ml-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(biz)}
                      leftIcon={<Pencil size={13} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, target: biz })}
                      leftIcon={<Trash2 size={13} />}
                      className="text-red-500 hover:bg-red-50"
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <BusinessFormModal
        key={`${formModal.open}-${formModal.target?.id ?? 'new'}`}
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, target: null })}
        onSave={handleSave}
        isSaving={isSaving}
        initial={
          formModal.target
            ? {
                business_name: formModal.target.business_name,
                business_type: formModal.target.business_type,
                owner_name: formModal.target.owner_name,
                owner_phone: formModal.target.owner_phone,
                owner_email: formModal.target.owner_email,
                password: '',
                status: formModal.target.status,
              }
            : EMPTY_FORM
        }
        isEdit={formModal.isEdit}
        businessCode={formModal.target?.business_code}
      />

      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, target: null })}
        onConfirm={confirmDelete}
        businessName={deleteModal.target?.business_name ?? ''}
      />

    </div>
  )
}
