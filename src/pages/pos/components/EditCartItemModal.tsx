import { useState, useEffect } from 'react'
import { User, Tag, Percent, DollarSign, Trash2 } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import type { CartItem, UserProfile, DiscountType } from '../../../types'
import { formatIDR } from '../../../lib/utils'

interface EditCartItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: CartItem | null
  staffList: UserProfile[]
  onSave: (staffId: string | null, discountType: DiscountType | null, discountValue: number) => void
}

export default function EditCartItemModal({
  isOpen,
  onClose,
  item,
  staffList,
  onSave,
}: EditCartItemModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountValue, setDiscountValue] = useState<number>(0)

  // Sinkronisasi state lokal saat modal dibuka untuk item tertentu
  useEffect(() => {
    if (isOpen && item) {
      setSelectedStaffId(item.staff_ids?.[0] || '')
      setDiscountType(item.discount_type || 'percent')
      setDiscountValue(item.discount_value ?? 0)
    }
  }, [isOpen, item])

  if (!item) return null

  const unitPrice = Number(item.product.selling_price)
  const lineSubtotal = unitPrice * item.quantity

  // Hitung preview potongan diskon berdasarkan draft value
  let previewDiscountAmount = 0
  if (discountValue > 0) {
    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, discountValue))
      previewDiscountAmount = Math.round((lineSubtotal * pct) / 100)
    } else {
      previewDiscountAmount = Math.min(lineSubtotal, Math.max(0, discountValue))
    }
  }
  const previewLineTotal = Math.max(0, lineSubtotal - previewDiscountAmount)

  const handleApply = () => {
    const finalStaffId = selectedStaffId.trim() ? selectedStaffId : null
    const finalDiscountType = discountValue > 0 ? discountType : null
    const finalDiscountValue = discountValue > 0 ? discountValue : 0

    onSave(finalStaffId, finalDiscountType, finalDiscountValue)
    onClose()
  }

  const handleResetDiscount = () => {
    setDiscountValue(0)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Staf & Diskon Item"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleApply}>
            Terapkan Perubahan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info Ringkas Produk */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h4 className="text-sm font-bold text-slate-900 truncate">{item.product.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatIDR(unitPrice)} × {item.quantity} {item.product.type === 'service' ? 'layanan' : item.product.unit || 'pcs'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Subtotal
            </span>
            <span className="text-sm font-bold text-slate-800">
              {formatIDR(lineSubtotal)}
            </span>
          </div>
        </div>

        {/* ── BAGIAN 1: STAF PELAKSANA ────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User size={14} className="text-indigo-600" />
            <span>Staf Pelaksana</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Tugaskan staf yang mengerjakan layanan atau melayani item ini (opsional untuk perhitungan komisi).
          </p>

          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
          >
            <option value="">-- Tanpa Staf Pelaksana --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.position ? `(${s.position})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── BAGIAN 2: DISKON ITEM ───────────────────────────────────────── */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag size={14} className="text-amber-600" />
              <span>Diskon Item Ini</span>
            </label>
            {discountValue > 0 && (
              <button
                type="button"
                onClick={handleResetDiscount}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Hapus Diskon</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Tipe: % atau Rp */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  discountType === 'percent'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent size={12} />
                <span>%</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('amount')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  discountType === 'amount'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign size={12} />
                <span>Rp</span>
              </button>
            </div>

            {/* Input Nilai Diskon */}
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={discountType === 'percent' ? 100 : lineSubtotal}
                placeholder={discountType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                value={discountValue === 0 ? '' : discountValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setDiscountValue(val)
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                {discountType === 'percent' ? '%' : 'Rp'}
              </span>
            </div>
          </div>

          {/* Kalkulasi & Preview Diskon */}
          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Potongan Diskon:</span>
              <span className="font-semibold text-amber-700">
                {previewDiscountAmount > 0 ? `-${formatIDR(previewDiscountAmount)}` : 'Rp 0'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-amber-200/50">
              <span>Total Item Setelah Diskon:</span>
              <span className="text-indigo-700">{formatIDR(previewLineTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
