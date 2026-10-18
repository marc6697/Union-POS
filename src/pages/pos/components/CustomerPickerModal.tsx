import { useState, useEffect } from 'react'
import { Search, UserPlus, Check, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import type { Customer } from '../../../types'
import { fetchCustomersByBusiness, createCustomer } from '../../../lib/services/customerService'

interface CustomerPickerModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  userId?: string
}

export default function CustomerPickerModal({
  isOpen,
  onClose,
  businessId,
  selectedCustomer,
  onSelectCustomer,
  userId,
}: CustomerPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'quickAdd'>('search')
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Quick Add Form state
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !businessId) return

    let isMounted = true
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true)
        const result = await fetchCustomersByBusiness(businessId, {
          pageSize: 15,
          search: search.trim() || undefined,
        })
        if (isMounted) {
          setCustomers(result.data)
        }
      } catch (err) {
        console.error('Error fetching customers:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isOpen, businessId, search])

  const handleSelect = (customer: Customer | null) => {
    onSelectCustomer(customer)
    onClose()
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newName.trim()
    const trimmedPhone = newPhone.trim()

    if (!trimmedName) {
      setFormError('Nama pelanggan wajib diisi.')
      return
    }
    if (!trimmedPhone) {
      setFormError('Nomor telepon wajib diisi.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)
      const created = await createCustomer(
        businessId,
        {
          name: trimmedName,
          phone_number: trimmedPhone,
          email: '',
          address: '',
          notes: '',
          is_active: true,
        },
        userId,
      )

      toast.success(`Pelanggan "${created.name}" berhasil ditambahkan`)
      setNewName('')
      setNewPhone('')
      setActiveTab('search')
      onSelectCustomer(created)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan pelanggan'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih Pelanggan"
      size="md"
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Cari Pelanggan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quickAdd')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'quickAdd'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus size={14} />
            Tambah Cepat
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="space-y-3">
            <Input
              placeholder="Cari nama atau nomor HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              autoFocus
            />

            {/* Walk-in option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                selectedCustomer === null
                  ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 font-semibold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-sm">Pelanggan Umum (Walk-in)</p>
                  <p className="text-xs text-slate-400">Tanpa data pelanggan / nota umum</p>
                </div>
              </div>
              {selectedCustomer === null && <Check size={18} className="text-indigo-600" />}
            </button>

            {/* Customers list */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Memuat data pelanggan...
                </div>
              ) : customers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {search ? 'Tidak ada pelanggan yang cocok' : 'Belum ada data pelanggan'}
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 font-medium'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={11} /> {c.phone_number}
                        </p>
                      </div>
                      {isSelected && <Check size={16} className="text-indigo-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleQuickAdd} className="space-y-3">
            <Input
              label="Nama Pelanggan"
              placeholder="Contoh: Budi Santoso"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
            />
            <Input
              label="Nomor Telepon / WhatsApp"
              placeholder="Contoh: 08123456789"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
            />
            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('search')}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Simpan & Pilih
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
