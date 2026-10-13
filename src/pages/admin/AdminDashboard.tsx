import { useState } from 'react'
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
import Modal from '../../components/ui/Modal'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import type { Business, BusinessFormData, BusinessStatus } from '../../types'
import { generateId, formatDate } from '../../lib/utils'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

// ─── Mock data (replace with Supabase queries) ────────────────────────────────
const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz-001',
    business_name: 'Warung Makan Bu Sari',
    owner_name: 'Budi Santoso',
    owner_phone: '081234567890',
    owner_email: 'owner@demo.com',
    status: 'active',
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-15T08:00:00Z',
  },
  {
    id: 'biz-002',
    business_name: 'Toko Kelontong Maju',
    owner_name: 'Dewi Rahayu',
    owner_phone: '087654321098',
    owner_email: 'dewi@demo.com',
    status: 'active',
    created_at: '2025-02-10T09:00:00Z',
    updated_at: '2025-03-01T10:00:00Z',
  },
  {
    id: 'biz-003',
    business_name: 'Kafe Senja',
    owner_name: 'Ahmad Fauzi',
    owner_phone: '089876543210',
    owner_email: 'ahmad@demo.com',
    status: 'inactive',
    created_at: '2025-03-05T07:30:00Z',
    updated_at: '2025-03-05T07:30:00Z',
  },
]

const EMPTY_FORM: BusinessFormData = {
  business_name: '',
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  status: 'active',
}

// ─── Business Form Modal ──────────────────────────────────────────────────────
function BusinessFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isEdit,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BusinessFormData) => void
  initial: BusinessFormData
  isEdit: boolean
}) {
  const [form, setForm] = useState<BusinessFormData>(initial)
  const [errors, setErrors] = useState<Partial<BusinessFormData>>({})

  // Sync form when initial changes (e.g. opening edit modal)
  useState(() => { setForm(initial); setErrors({}) })

  const set = (field: keyof BusinessFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e: Partial<BusinessFormData> = {}
    if (!form.business_name.trim()) e.business_name = 'Nama bisnis wajib diisi'
    if (!form.owner_name.trim()) e.owner_name = 'Nama owner wajib diisi'
    if (!form.owner_phone.trim()) e.owner_phone = 'No. telepon wajib diisi'
    if (!form.owner_email.trim()) e.owner_email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email))
      e.owner_email = 'Format email tidak valid'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (validate()) onSave(form)
  }

  // Reset when modal opens
  const handleOpen = () => { setForm(initial); setErrors({}) }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Bisnis' : 'Tambah Bisnis Baru'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} size="sm">Batal</Button>
          <Button onClick={handleSave} size="sm">
            {isEdit ? 'Simpan Perubahan' : 'Tambah Bisnis'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" onClick={handleOpen as never}>
        <Input
          label="Nama Bisnis"
          placeholder="cth. Warung Makan Bu Sari"
          value={form.business_name}
          onChange={(e) => set('business_name', e.target.value)}
          error={errors.business_name}
        />
        <Input
          label="Nama Owner"
          placeholder="Nama lengkap pemilik"
          value={form.owner_name}
          onChange={(e) => set('owner_name', e.target.value)}
          error={errors.owner_name}
        />
        <Input
          label="No. Telepon Owner"
          type="tel"
          placeholder="cth. 0812xxxxxxxx"
          value={form.owner_phone}
          onChange={(e) => set('owner_phone', e.target.value)}
          leftIcon={<Phone size={14} />}
          error={errors.owner_phone}
        />
        <Input
          label="Email Owner"
          type="email"
          placeholder="email@contoh.com"
          value={form.owner_email}
          onChange={(e) => set('owner_email', e.target.value)}
          leftIcon={<Mail size={14} />}
          error={errors.owner_email}
        />
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
        Tindakan ini tidak dapat dibatalkan.
      </p>
    </Modal>
  )
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES)
  const [search, setSearch] = useState('')

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
      b.owner_email.toLowerCase().includes(search.toLowerCase()),
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

  const handleSave = (data: BusinessFormData) => {
    if (formModal.isEdit && formModal.target) {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === formModal.target!.id
            ? { ...b, ...data, updated_at: new Date().toISOString() }
            : b,
        ),
      )
      toast.success('Bisnis berhasil diperbarui')
    } else {
      const newBiz: Business = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setBusinesses((prev) => [newBiz, ...prev])
      toast.success('Bisnis baru berhasil ditambahkan')
    }
    setFormModal({ open: false, isEdit: false, target: null })
  }

  const toggleStatus = (id: string) => {
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: b.status === 'active' ? 'inactive' : 'active',
              updated_at: new Date().toISOString(),
            }
          : b,
      ),
    )
    const biz = businesses.find((b) => b.id === id)
    const nextStatus = biz?.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'
    toast.success(`Bisnis berhasil ${nextStatus}`)
  }

  const confirmDelete = () => {
    if (deleteModal.target) {
      setBusinesses((prev) => prev.filter((b) => b.id !== deleteModal.target!.id))
      toast.success('Bisnis berhasil dihapus')
      setDeleteModal({ open: false, target: null })
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
          {filtered.length === 0 ? (
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
                    onClick={() => toggleStatus(biz.id)}
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
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, isEdit: false, target: null })}
        onSave={handleSave}
        initial={
          formModal.target
            ? {
                business_name: formModal.target.business_name,
                owner_name: formModal.target.owner_name,
                owner_phone: formModal.target.owner_phone,
                owner_email: formModal.target.owner_email,
                status: formModal.target.status,
              }
            : EMPTY_FORM
        }
        isEdit={formModal.isEdit}
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
