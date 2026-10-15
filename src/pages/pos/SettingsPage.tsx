import { useState } from 'react'
import { Store, Receipt, Printer } from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useBusinessName } from '../../hooks/useBusinessName'
import { useAuthStore } from '../../store/authStore'

export default function SettingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()

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
          <p className="text-sm text-slate-500">Sesuaikan profil outlet, printer struk, dan preferensi aplikasi</p>
        </div>

        {/* Setting Groups */}
        <div className="space-y-4">
          {/* Outlet Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Store size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Profil Bisnis</h2>
                <p className="text-xs text-slate-500">Informasi nama toko dan kontak usaha</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Usaha / Bisnis"
                defaultValue={businessName || 'Bisnis Anda'}
                disabled
              />
              <Input
                label="Akun Pemilik (Email)"
                defaultValue={user?.email || ''}
                disabled
              />
            </div>
          </div>

          {/* Struk & Printer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Printer size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Struk & Printer Kasir</h2>
                <p className="text-xs text-slate-500">Konfigurasi printer thermal Bluetooth / USB & footer struk</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Catatan Footer Struk"
                placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                defaultValue="Terima kasih atas kunjungan Anda!"
              />
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">Cetak Otomatis Setelah Transaksi</p>
                  <p className="text-xs text-slate-500">Langsung kirim perintah print saat transaksi selesai</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Pajak & Service */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Pajak (PB1/PPN)</h2>
                <p className="text-xs text-slate-500">Aturan pemungutan pajak pada nota transaksi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Persentase Pajak (%)"
                type="number"
                defaultValue={10}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary">
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
