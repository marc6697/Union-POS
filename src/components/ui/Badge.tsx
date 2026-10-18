import { cn } from '../../lib/utils'
import type { BusinessStatus, UserRole } from '../../types'

type BadgeVariant = 'active' | 'inactive' | UserRole | 'default'

const variantMap: Record<BadgeVariant, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  superadmin: 'bg-violet-100 text-violet-700 border-violet-200',
  owner: 'bg-blue-100 text-blue-700 border-blue-200',
  kasir: 'bg-amber-100 text-amber-700 border-amber-200',
  staff: 'bg-amber-100 text-amber-700 border-amber-200',
  default: 'bg-slate-100 text-slate-600 border-slate-200',
}

const labelMap: Record<BadgeVariant, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  superadmin: 'Super Admin',
  owner: 'Owner',
  kasir: 'Kasir',
  staff: 'Staff',
  default: '-',
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
  className?: string
  dot?: boolean
}

export default function Badge({ variant, label, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantMap[variant] ?? variantMap.default,
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'active' ? 'bg-emerald-500' : 'bg-slate-400',
          )}
        />
      )}
      {label ?? labelMap[variant] ?? variant}
    </span>
  )
}

/** Convenience component for BusinessStatus */
export function StatusBadge({ status }: { status: BusinessStatus }) {
  return <Badge variant={status} dot />
}
