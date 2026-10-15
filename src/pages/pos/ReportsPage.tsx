import { useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar } from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import { useBusinessName } from '../../hooks/useBusinessName'

export default function ReportsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Laporan"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Header Title & Date Filter placeholder */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Laporan Penjualan & Analitik</h1>
            <p className="text-sm text-slate-500">Ringkasan performa dan transaksi bisnis Anda</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs">
              <Calendar size={16} className="text-slate-500" />
              <span>Hari Ini</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total Omzet</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">Rp 0</p>
            <p className="text-xs text-slate-400 mt-1">Total pendapatan kotor</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total Transaksi</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">0</p>
            <p className="text-xs text-slate-400 mt-1">Transaksi selesai</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Estimasi Laba Bersih</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">Rp 0</p>
            <p className="text-xs text-slate-400 mt-1">Omzet dikurangi HPP modal</p>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <BarChart3 size={28} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Belum Ada Data Laporan</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Data transaksi yang berhasil dicatat di kasir akan otomatis tampil di grafik dan tabel rekapitulasi laporan ini.
          </p>
        </div>
      </main>
    </div>
  )
}
