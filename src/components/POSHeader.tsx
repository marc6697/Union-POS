import type { ReactNode } from 'react'
import { ShoppingBag, Menu } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Badge from './ui/Badge'
import { useBusinessName } from '../hooks/useBusinessName'

export interface POSHeaderProps {
  /** Subtitle displayed below Union POS brand (e.g. 'Transaksi', 'Barang dan Jasa') */
  subtitle?: string
  /** Optional business name override; if omitted, automatically resolved from active session/db */
  businessName?: string
  /** Callback triggered when burger menu is clicked */
  onMenuClick?: () => void
  /** Extra header elements on the right (e.g. mobile cart button) */
  children?: ReactNode
}

/**
 * Reusable POS Header component displaying brand logo, business name label,
 * current page subtitle, active user info & role badge.
 */
export default function POSHeader({
  subtitle,
  businessName: customBusinessName,
  onMenuClick,
  children,
}: POSHeaderProps) {
  const { user } = useAuthStore()
  const fetchedBusinessName = useBusinessName()
  const businessName = customBusinessName ?? fetchedBusinessName

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 h-14 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 text-sm">Union POS</p>
                {businessName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[130px] sm:max-w-[200px] truncate">
                    {businessName}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={user?.role ?? 'staff'} />
            <span className="text-sm text-slate-600 font-medium hidden sm:inline">
              {user?.full_name}
            </span>
          </div>

          {children}
        </div>
      </div>
    </header>
  )
}
