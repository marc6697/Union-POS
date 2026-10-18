import { useState, useEffect, useCallback } from 'react'
import {
  UserCheck,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  KeyRound,
  ShieldAlert,
  Loader2,
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
import type { UserProfile, StaffFormData } from '../../types'
import {
  fetchStaffByBusiness,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../../lib/services/staffService'
import { fetchBusinessById } from '../../lib/services/businessService'

const DEFAULT_FORM: StaffFormData = {
  full_name: '',
  phone: '',
  position: '',
  can_login: false,
  email: '',
  password: '',
  is_active: true,
}

// ─── Modal Form Tambah / Edit Staff ───────────────────────────────────────────
function StaffFormModal({
  isOpen,
  onClose,
  onSave,
  staff,
  businessCode,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StaffFormData) => void
  staff: UserProfile | null
  businessCode: string
  isSaving: boolean
}) {
  const isEdit = Boolean(staff)
  const [form, setForm] = useState<StaffFormData>(DEFAULT_FORM)
  const [username, setUsername] = useState<string>('')
  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData | 'username', string>>>({})

  const cleanBusinessCode = businessCode || 'pos'
  const emailDomainSuffix = `.${cleanBusinessCode}@union-pos.id`

  useEffect(() => {
    if (isOpen) {
      if (staff) {
        setForm({
          full_name: staff.full_name,
          phone: staff.phone ?? '',
          position: staff.position ?? '',
          can_login: Boolean(staff.can_login),
          email: staff.email ?? '',
          password: '',
          is_active: staff.is_active ?? true,
        })
        if (staff.email) {
          const parts = staff.email.split('@')[0]
          const namePart = parts.includes('.') ? parts.split('.')[0] : parts
          setUsername(namePart)
        } else {
          setUsername('')
        }
      } else {
        setForm(DEFAULT_FORM)
        setUsername('')
      }
      setErrors({})
    }
  }, [isOpen, staff])

  const initialUsername = staff?.email
    ? (staff.email.split('@')[0].includes('.') ? staff.email.split('@')[0].split('.')[0] : staff.email.split('@')[0])
    : ''

  const hasChanges = Boolean(
    form.full_name.trim() !== (staff?.full_name ?? '') ||
    form.phone.trim() !== (staff?.phone ?? '') ||
    form.position.trim() !== (staff?.position ?? '') ||
    form.can_login !== Boolean(staff?.can_login) ||
    form.is_active !== (staff?.is_active ?? true) ||
    Boolean(form.password.trim()) ||
    (!staff?.email && username.trim() !== initialUsername)
  )

  const isSubmitDisabled = isSaving || (isEdit && !hasChanges)

  const validate = (): boolean => {
    const errs: Partial<Record<keyof StaffFormData | 'username', string>> = {}
    if (!form.full_name.trim()) {
      errs.full_name = 'Nama staff wajib diisi'
    }

    if (form.can_login) {
      if (!isEdit || !staff?.email) {
        const cleanUser = username.trim()
        if (!cleanUser) {
          errs.username = 'Nama/username email wajib diisi'
        } else if (!/^[a-z0-9._-]+$/.test(cleanUser)) {
          errs.username = 'Hanya boleh huruf kecil, angka, titik, atau strip'
        } else if (cleanUser.length < 2) {
          errs.username = 'Username minimal 2 karakter'
        }
      }

      if (!isEdit && (!form.password || form.password.length < 8)) {
        errs.password = 'Password wajib diisi minimal 8 karakter'
      } else if (isEdit && form.password && form.password.length < 8) {
        errs.password = 'Password baru minimal 8 karakter'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    let finalEmail = ''
    if (form.can_login) {
      if (isEdit && staff?.email) {
        finalEmail = staff.email
      } else {
        finalEmail = `${username.trim().toLowerCase()}${emailDomainSuffix}`
      }
    }

    onSave({
      ...form,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      position: form.position.trim(),
      email: finalEmail,
      password: form.password.trim(),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Data Staff' : 'Tambah Staff Baru'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Lengkap *"
          placeholder="Contoh: Budi Santoso"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          error={errors.full_name}
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Posisi / Jabatan"
            placeholder="Contoh: Kasir, Kapster, Barista"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            leftIcon={<Briefcase size={16} />}
          />

          <Input
            label="No. Telepon / WhatsApp"
            placeholder="0812xxxxxxxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            leftIcon={<Phone size={16} />}
          />
        </div>

        {/* Toggle Hak Akses Login */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={form.can_login}
              onChange={(e) => setForm({ ...form, can_login: e.target.checked })}
            />
            <div>
              <span className="text-sm font-semibold text-slate-900 block">
                Izinkan Login Aplikasi (Kasir / Operator POS)
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">
                {form.can_login
                  ? 'Staff ini dapat masuk ke aplikasi kasir menggunakan email & password di bawah.'
                  : 'Staff hanya dicatat untuk pengerjaan layanan & komisi tanpa akun login.'}
              </span>
            </div>
          </label>

          {form.can_login && (
            <div className="pt-2 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-150">
              {isEdit && staff?.email ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Email Login (Tidak Dapat Diubah)
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium">
                    <Mail size={16} className="text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700 truncate">{staff.email}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Email login bersifat permanen dan tidak dapat diubah setelah dibuat.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Email Login Karyawan *
                  </label>
                  <div
                    className={`flex rounded-xl shadow-xs overflow-hidden border ${
                      errors.username
                        ? 'border-red-300 ring-2 ring-red-100'
                        : 'border-slate-200 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20'
                    } bg-white`}
                  >
                    <input
                      type="text"
                      placeholder="nama"
                      value={username}
                      onChange={(e) => {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
                        setUsername(clean)
                      }}
                      className="flex-1 min-w-0 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none font-mono"
                    />
                    <span className="inline-flex items-center px-3 bg-slate-100 text-slate-600 text-xs font-mono font-medium border-l border-slate-200 select-none">
                      {emailDomainSuffix}
                    </span>
                  </div>
                  {errors.username && (
                    <p className="text-xs text-red-600 mt-1">{errors.username}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1.5">
                    Ketika login gunakan:{' '}
                    <span className="text-indigo-600 font-mono font-semibold">
                      {(username.trim() || 'nama') + emailDomainSuffix}
                    </span>
                  </p>
                </div>
              )}

              <Input
                label={isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login *'}
                type="password"
                placeholder={isEdit ? 'Minimal 8 karakter' : 'Minimal 8 karakter'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                leftIcon={<KeyRound size={16} />}
              />
            </div>
          )}
        </div>

        {/* Status Aktif */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="staff_is_active"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <label htmlFor="staff_is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Status Karyawan Aktif
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            disabled={isSubmitDisabled}
          >
            {isEdit ? 'Simpan Perubahan' : 'Tambah Staff'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Konfirmasi Hapus Staff ─────────────────────────────────────────────
function DeleteStaffModal({
  isOpen,
  onClose,
  onConfirm,
  staffName,
  isDeleting,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  staffName: string
  isDeleting: boolean
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Staff" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl">
          <ShieldAlert size={22} className="shrink-0" />
          <p className="text-xs leading-relaxed">
            Data staff <strong>{staffName}</strong> akan dinonaktifkan dan hak akses login-nya akan dicabut.
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus data staff ini dari daftar?
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            Hapus
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Halaman Utama Staff ──────────────────────────────────────────────────────
export default function StaffPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [staffList, setStaffList] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { user } = useAuthStore()
  const businessName = useBusinessName()
  const businessId = user?.business_id
  const [businessCode, setBusinessCode] = useState<string>(user?.business_code || '')

  useEffect(() => {
    if (!businessId) return
    if (user?.business_code) {
      setBusinessCode(user.business_code)
      return
    }
    fetchBusinessById(businessId)
      .then((b) => {
        if (b?.business_code) {
          setBusinessCode(b.business_code)
        } else if (b?.business_name) {
          setBusinessCode(b.business_name.toLowerCase().replace(/[^a-z0-9]/g, ''))
        }
      })
      .catch(() => {})
  }, [businessId, user?.business_code])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const loadStaff = useCallback(async () => {
    if (!businessId) return
    setIsLoading(true)
    try {
      const res = await fetchStaffByBusiness(businessId, { page, pageSize, search })
      setStaffList(res.data)
      setTotalCount(res.count)
    } catch (err) {
      toast.error('Gagal memuat daftar staff: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [businessId, search, page, pageSize])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadStaff])

  const handleOpenCreate = () => {
    setSelectedStaff(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (staff: UserProfile) => {
    setSelectedStaff(staff)
    setIsModalOpen(true)
  }

  const handleSave = async (formData: StaffFormData) => {
    if (!businessId) {
      toast.error('ID Bisnis tidak ditemukan')
      return
    }

    setIsSaving(true)
    try {
      if (selectedStaff) {
        await updateStaff(selectedStaff.id, formData)
        toast.success(`Data staff ${formData.full_name} berhasil diperbarui`)
      } else {
        await createStaff(businessId, formData)
        toast.success(`Staff ${formData.full_name} berhasil ditambahkan`)
      }
      setIsModalOpen(false)
      loadStaff()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteStaff(deleteTarget.id)
      toast.success(`Staff ${deleteTarget.full_name} berhasil dihapus`)
      setDeleteTarget(null)
      loadStaff()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Staff"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Manajemen Staff & Karyawan</h1>
            <p className="text-sm text-slate-500">
              Kelola akun kasir, staff layanan, dan hak akses operasional toko
            </p>
          </div>
          <Button variant="primary" leftIcon={<UserPlus size={16} />} onClick={handleOpenCreate}>
            Tambah Staff
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Cari nama, posisi, email, atau no HP..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
          <div className="text-xs text-slate-500 ml-auto hidden sm:flex items-center gap-3">
            <span>
              Total: <strong className="text-slate-800">{totalCount}</strong> staff
            </span>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Table / Cards */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat data staff...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <UserCheck size={28} />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {search ? 'Tidak ada staff yang cocok' : 'Belum Ada Staff'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
              {search
                ? `Pencarian "${search}" tidak menemukan data staff yang sesuai.`
                : 'Tambahkan anggota tim untuk memberikan akun kasir atau mencatat komisi jasa pengerjaan.'}
            </p>
            {!search && (
              <Button variant="secondary" leftIcon={<UserPlus size={16} />} onClick={handleOpenCreate}>
                Tambah Staff Pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Nama & Posisi</th>
                    <th className="py-3.5 px-4">Kontak</th>
                    <th className="py-3.5 px-4">Hak Akses Login</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-semibold text-slate-900">{staff.full_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          {staff.position ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                              <Briefcase size={12} className="text-slate-400" />
                              {staff.position}
                            </span>
                          ) : (
                            <span className="text-slate-400">Staff</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {staff.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={13} className="text-slate-400 shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                          {staff.email ? (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail size={13} className="text-slate-400 shrink-0" />
                              <span>{staff.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {staff.can_login ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <KeyRound size={12} />
                            Bisa Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Tanpa Login
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={staff.is_active ? 'active' : 'inactive'} dot />
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Staff"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(staff)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Staff"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Menampilkan{' '}
                <strong className="text-slate-800">
                  {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
                  {Math.min(page * pageSize, totalCount)}
                </strong>{' '}
                dari <strong className="text-slate-800">{totalCount}</strong> staff
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
        </div>
        )}
      </main>

      {/* Modal Form Tambah / Edit */}
      <StaffFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        staff={selectedStaff}
        businessCode={businessCode}
        isSaving={isSaving}
      />

      {/* Modal Konfirmasi Hapus */}
      <DeleteStaffModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        staffName={deleteTarget?.full_name ?? ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}
