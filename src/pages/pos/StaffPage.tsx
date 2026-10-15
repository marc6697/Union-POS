import { useState } from 'react'
import { UserCheck, UserPlus, Search } from 'lucide-react'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useBusinessName } from '../../hooks/useBusinessName'

export default function StaffPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const businessName = useBusinessName()

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
            <p className="text-sm text-slate-500">Kelola akun kasir, staff layanan, dan hak akses operasional</p>
          </div>
          <Button variant="primary" leftIcon={<UserPlus size={16} />}>
            Tambah Staff
          </Button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Cari nama atau email staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <UserCheck size={28} />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Daftar Karyawan & Kasir</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Tambahkan anggota tim untuk memberikan akses akun kasir dan mencatat pembagian komisi per transaksi.
          </p>
          <Button variant="secondary" leftIcon={<UserPlus size={16} />}>
            Undang / Tambah Staff
          </Button>
        </div>
      </main>
    </div>
  )
}
