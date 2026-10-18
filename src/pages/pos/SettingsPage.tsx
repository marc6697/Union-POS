import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Printer, Receipt, ChevronRight } from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import { useBusinessName } from '../../hooks/useBusinessName'
import { useAuthStore } from '../../store/authStore'
import { getBusinessSettings } from '../../lib/services/settingsService'
import { getStoredBluetoothPrinter } from '../../lib/services/bluetoothPrinter'
import type { BusinessSettings } from '../../types'

export default function SettingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadSettingsSummary() {
      if (!user?.business_id) {
        setIsLoading(false)
        return
      }

      try {
        const data = await getBusinessSettings(user.business_id)
        if (isMounted) {
          setSettings(data)
        }
      } catch (err) {
        console.error('Gagal memuat ringkasan pengaturan:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSettingsSummary()

    return () => {
      isMounted = false
    }
  }, [user?.business_id])

  const subMenus = [
    {
      id: 'profile',
      title: 'Profil Bisnis',
      description: 'Informasi nama toko, nomor kontak, jenis usaha, dan akun pemilik',
      icon: Store,
      iconColor: 'bg-indigo-50 text-indigo-600',
      path: '/pos/settings/profile',
      badge: businessName || user?.business_name || 'Bisnis Anda',
    },
    {
      id: 'receipt',
      title: 'Struk Printer & Kasir',
      description: 'Konfigurasi format cetak struk thermal, catatan footer, dan printer kasir',
      icon: Printer,
      iconColor: 'bg-emerald-50 text-emerald-600',
      path: '/pos/settings/receipt',
      badge: getStoredBluetoothPrinter()?.name || (settings?.receipt_footer ? 'Footer Kustom' : 'Thermal 80mm'),
    },
    {
      id: 'tax',
      title: 'Pajak (PB1 / PPN)',
      description: 'Aturan pemungutan pajak transaksi kasir dan persentase tarif pajak',
      icon: Receipt,
      iconColor: 'bg-amber-50 text-amber-600',
      path: '/pos/settings/tax',
      badge: isLoading
        ? 'Memuat...'
        : settings?.tax_enabled
          ? `Aktif (${settings.tax_rate}%)`
          : 'Nonaktif',
      badgeColor: settings?.tax_enabled
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-600 border-slate-200',
    },
  ]

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pengaturan"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pengaturan Toko & POS</h1>
          <p className="text-sm text-slate-500">
            Pilih sub menu pengaturan di bawah untuk mengelola profil usaha, printer struk kasir, dan pajak
          </p>
        </div>

        {/* Sub Menu List */}
        <div className="space-y-3">
          {subMenus.map((menu) => {
            const Icon = menu.icon

            return (
              <div
                key={menu.id}
                onClick={() => navigate(menu.path)}
                className="group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${menu.iconColor}`}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {menu.title}
                      </h2>
                      {menu.badge && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border max-w-[160px] truncate ${
                            menu.badgeColor || 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {menu.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-1">
                      {menu.description}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors shrink-0">
                  <ChevronRight size={20} />
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
