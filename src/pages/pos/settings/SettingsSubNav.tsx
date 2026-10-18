import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store, Printer, Receipt } from 'lucide-react'

export type SettingsTab = 'profile' | 'receipt' | 'tax'

interface SettingsSubNavProps {
  activeTab: SettingsTab
}

export default function SettingsSubNav({ activeTab }: SettingsSubNavProps) {
  const navigate = useNavigate()

  const tabs = [
    {
      id: 'profile' as const,
      label: 'Profil Bisnis',
      icon: Store,
      path: '/pos/settings/profile',
    },
    {
      id: 'receipt' as const,
      label: 'Struk Printer & Kasir',
      icon: Printer,
      path: '/pos/settings/receipt',
    },
    {
      id: 'tax' as const,
      label: 'Pajak',
      icon: Receipt,
      path: '/pos/settings/tax',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Tombol Kembali ke Menu Pengaturan */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/pos/settings')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-1 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Menu Pengaturan</span>
        </button>
      </div>

      {/* Sub Menu Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
