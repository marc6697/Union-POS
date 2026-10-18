import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingBag,
  ReceiptText,
  History,
  Package,
  BarChart3,
  Users,
  UserCheck,
  Percent,
  Settings,
  LogOut,
  X,
  Store,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useBusinessName } from '../hooks/useBusinessName'
import Badge from './ui/Badge'

export interface NavItem {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  path: string
  ownerOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Transaksi',
    icon: ReceiptText,
    path: '/pos',
  },
  {
    label: 'Riwayat Transaksi',
    icon: History,
    path: '/pos/transactions',
  },
  {
    label: 'Barang dan Jasa',
    icon: Package,
    path: '/pos/products',
  },
  {
    label: 'Laporan',
    icon: BarChart3,
    path: '/pos/reports',
  },
  {
    label: 'Pelanggan',
    icon: Users,
    path: '/pos/customers',
  },
  {
    label: 'Staff',
    icon: UserCheck,
    path: '/pos/staff',
    ownerOnly: true,
  },
  {
    label: 'Komisi',
    icon: Percent,
    path: '/pos/commissions',
  },
  {
    label: 'Pengaturan',
    icon: Settings,
    path: '/pos/settings',
  },
]

interface NavigationDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const businessName = useBusinessName()

  if (!isOpen) return null

  const handleLogout = () => {
    onClose()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Union POS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Profile summary */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 font-medium">Masuk sebagai</p>
          <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
            {user?.full_name}
          </p>
          {businessName && (
            <p className="text-xs font-medium text-slate-600 truncate mt-1 flex items-center gap-1.5">
              <Store size={13} className="text-slate-400 shrink-0" />
              <span>{businessName}</span>
            </p>
          )}
          <div className="mt-1.5">
            <Badge variant={user?.role ?? 'staff'} />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(
            (item) => !item.ownerOnly || user?.role === 'owner' || user?.role === 'superadmin',
          ).map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path === '/pos/settings' && location.pathname.startsWith('/pos/settings/'))
            return (
              <button
                key={item.path}
                onClick={() => {
                  onClose()
                  navigate(item.path)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-indigo-600' : 'text-slate-500'}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom Section: Log Out */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
