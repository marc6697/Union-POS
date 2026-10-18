import { useState, useEffect } from 'react'
import { Store, User, ShieldCheck } from 'lucide-react'
import POSHeader from '../../../components/POSHeader'
import NavigationDrawer from '../../../components/NavigationDrawer'
import Input from '../../../components/ui/Input'
import SettingsSubNav from './SettingsSubNav'
import { useAuthStore } from '../../../store/authStore'
import { useBusinessName } from '../../../hooks/useBusinessName'
import { fetchBusinessById } from '../../../lib/services/businessService'
import type { Business } from '../../../types'

export default function BusinessProfilePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()

  const [business, setBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadBusinessData() {
      if (!user?.business_id) {
        setIsLoading(false)
        return
      }

      try {
        const data = await fetchBusinessById(user.business_id)
        if (isMounted) {
          setBusiness(data)
        }
      } catch (err) {
        console.error('Gagal memuat profil bisnis:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadBusinessData()

    return () => {
      isMounted = false
    }
  }, [user?.business_id])

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pengaturan > Profil Bisnis"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <SettingsSubNav activeTab="profile" />

        {/* Header Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Profil Bisnis</h1>
          <p className="text-sm text-slate-500">
            Informasi identitas usaha, kontak pemilik, dan kategori bisnis Anda
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Informasi Usaha</h2>
              <p className="text-xs text-slate-500">Detail data outlet dan bisnis yang terdaftar</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Memuat data profil bisnis...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Usaha / Toko"
                  defaultValue={business?.business_name || businessName || 'Bisnis Anda'}
                  disabled
                />
                <Input
                  label="Kode Usaha"
                  defaultValue={business?.business_code || '-'}
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Jenis / Kategori Bisnis"
                  defaultValue={business?.business_type || 'Toko Ritel & Minimarket'}
                  disabled
                />
                <Input
                  label="Status Usaha"
                  defaultValue={business?.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  disabled
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <User size={16} className="text-slate-500" />
                  <span>Kontak & Akun Pemilik (Owner)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nama Pemilik"
                    defaultValue={business?.owner_name || user?.full_name || '-'}
                    disabled
                  />
                  <Input
                    label="Email Pemilik"
                    defaultValue={business?.owner_email || user?.email || '-'}
                    disabled
                  />
                  <Input
                    label="Nomor Telepon"
                    defaultValue={business?.owner_phone || '-'}
                    disabled
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  <span>Perubahan Data Usaha</span>
                </p>
                <p>
                  Nama usaha, jenis bisnis, dan data kontak pemilik saat ini dikelola secara terpusat oleh administrator.
                  Jika Anda ingin memperbarui nama toko atau nomor kontak utama, silakan hubungi tim dukungan Union POS.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
