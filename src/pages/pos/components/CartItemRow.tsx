import { Plus, Minus, Trash2, Tag, User, SlidersHorizontal } from 'lucide-react'
import type { CartItem, UserProfile } from '../../../types'
import { formatIDR } from '../../../lib/utils'

interface CartItemRowProps {
  item: CartItem
  staffList: UserProfile[]
  onUpdateQty: (delta: number) => void
  onRemove: () => void
  onOpenEdit: () => void
  lineCalculation?: {
    discount_amount: number
    after_item?: number
    line_total: number
  }
}

export default function CartItemRow({
  item,
  staffList,
  onUpdateQty,
  onRemove,
  onOpenEdit,
  lineCalculation,
}: CartItemRowProps) {
  const selectedStaffId = item.staff_ids?.[0]
  const staffMember = staffList.find((s) => s.id === selectedStaffId)
  const staffName = staffMember?.full_name

  const hasDiscount = (item.discount_value ?? 0) > 0
  const discountLabel =
    item.discount_type === 'percent'
      ? `${item.discount_value}%`
      : formatIDR(item.discount_value ?? 0)

  const originalSubtotal = Number(item.product.selling_price) * item.quantity
  // Gunakan harga setelah diskon item (after_item), BUKAN line_total yang sudah dipotong porsi diskon nota
  const finalTotal =
    lineCalculation?.after_item ??
    (lineCalculation?.discount_amount
      ? Math.max(0, originalSubtotal - lineCalculation.discount_amount)
      : originalSubtotal)

  return (
    <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-2">
      {/* ── Baris Atas: Info Item & Stepper Kuantitas ───────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
            {item.product.name}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <span>{formatIDR(Number(item.product.selling_price))}</span>
            <span>×</span>
            <span className="font-bold text-slate-700">{item.quantity}</span>
            <span className="text-[11px] text-slate-400">
              ({item.product.type === 'service' ? 'layanan' : item.product.unit || 'pcs'})
            </span>
          </div>
        </div>

        {/* Stepper Kuantitas */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => onUpdateQty(-1)}
            className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
            aria-label="Kurangi kuantitas"
          >
            <Minus size={11} />
          </button>
          <span className="w-5 text-center text-xs font-bold text-slate-800">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(1)}
            className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
            aria-label="Tambah kuantitas"
          >
            <Plus size={11} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="w-6 h-6 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer"
            title="Hapus item dari keranjang"
            aria-label="Hapus item"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Baris Bawah: Badge Atur Staf/Diskon & Subtotal ──────────────────── */}
      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 gap-2">
        {/* Tombol / Badge Pengaturan Staf & Diskon */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {staffName && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2 py-0.5 rounded-md border border-slate-200/70 transition-colors cursor-pointer"
              title="Klik untuk ubah staf"
            >
              <User size={11} className="text-indigo-600" />
              <span className="truncate max-w-[90px]">{staffName}</span>
            </button>
          )}

          {hasDiscount && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200/70 transition-colors cursor-pointer"
              title="Klik untuk ubah diskon"
            >
              <Tag size={11} />
              <span>Disc -{discountLabel}</span>
            </button>
          )}

          {!staffName && !hasDiscount && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={11} />
              <span>+ Staf / Diskon</span>
            </button>
          )}

          {(staffName || hasDiscount) && (
            <button
              type="button"
              onClick={onOpenEdit}
              className="text-[10px] text-slate-400 hover:text-indigo-600 cursor-pointer"
              title="Ubah pengaturan item"
            >
              Ubah
            </button>
          )}
        </div>

        {/* Total Harga Item */}
        <div className="text-right shrink-0">
          {hasDiscount && (
            <span className="text-[10px] text-slate-400 line-through mr-1.5">
              {formatIDR(originalSubtotal)}
            </span>
          )}
          <span className="font-bold text-slate-900 text-xs">
            {formatIDR(finalTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
