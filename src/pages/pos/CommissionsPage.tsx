import { useState } from 'react'
import { Percent, Plus, Award, DollarSign } from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import { useBusinessName } from '../../hooks/useBusinessName'

export default function CommissionsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Komisi"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Perhitungan Komisi Staff</h1>
            <p className="text-sm text-slate-500">Atur skema komisi dan pantau bonus pengerjaan jasa staff</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" leftIcon={<Plus size={16} />}>
              Atur Skema Komisi
            </Button>
          </div>
        </div>

        {/* Metric summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total Komisi Bulan Ini</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">Rp 0</p>
            <p className="text-xs text-slate-400 mt-1">Estimasi komisi terakumulasi</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Skema Aktif</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Percent size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">0</p>
            <p className="text-xs text-slate-400 mt-1">Aturan komisi per produk/layanan</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Staff Penerima</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">0 Orang</p>
            <p className="text-xs text-slate-400 mt-1">Penerima komisi aktif</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <Percent size={28} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Belum Ada Catatan Komisi</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Komisi untuk barber/terapis/staff akan otomatis terhitung saat kasir memilih staff yang melayani pesanan.
          </p>
          <Button variant="secondary" leftIcon={<Plus size={16} />}>
            Buat Skema Komisi Baru
          </Button>
        </div>
      </main>
    </div>
  )
}
