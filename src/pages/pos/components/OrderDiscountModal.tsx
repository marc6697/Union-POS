import { useState, useEffect } from 'react'
import { Tag, Percent, DollarSign, Trash2 } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import type { DiscountType } from '../../../types'
import { formatIDR } from '../../../lib/utils'

interface OrderDiscountModalProps {
  isOpen: boolean
  onClose: () => void
  subtotal: number
  currentDiscountType: DiscountType | null
  currentDiscountValue: number
  onApply: (type: DiscountType | null, value: number) => void
}

const PERCENT_PRESETS = [5, 10, 15, 20, 50]

export default function OrderDiscountModal({
  isOpen,
  onClose,
  subtotal,
  currentDiscountType,
  currentDiscountValue,
  onApply,
}: OrderDiscountModalProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  // Sinkronisasi state lokal saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setDiscountType(currentDiscountType || 'percent')
      setDiscountValue(currentDiscountValue || 0)
      setError(null)
    }
  }, [isOpen, currentDiscountType, currentDiscountValue])

  // Hitung preview potongan diskon
  let previewDiscountAmount = 0
  if (discountValue > 0) {
    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, discountValue))
      previewDiscountAmount = Math.round((subtotal * pct) / 100)
    } else {
      previewDiscountAmount = Math.min(subtotal, Math.max(0, discountValue))
    }
  }
  const previewTotalAfterDiscount = Math.max(0, subtotal - previewDiscountAmount)

  const handleApply = () => {
    if (discountValue < 0) {
      setError('Nilai diskon tidak boleh negatif')
      return
    }
    if (discountType === 'percent' && discountValue > 100) {
      setError('Diskon persentase maksimal 100%')
      return
    }
    if (discountType === 'amount' && discountValue > subtotal) {
      setError(`Diskon nominal tidak boleh melebihi subtotal (${formatIDR(subtotal)})`)
      return
    }

    if (discountValue === 0) {
      onApply(null, 0)
    } else {
      onApply(discountType, discountValue)
    }
    onClose()
  }

  const handleRemoveDiscount = () => {
    onApply(null, 0)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Diskon Nota (Transaksi)"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {(currentDiscountValue > 0 || discountValue > 0) && (
              <button
                type="button"
                onClick={handleRemoveDiscount}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Hapus Diskon</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleApply}>
              Terapkan Diskon
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info Subtotal Belanja */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Subtotal Belanja
            </span>
            <span className="text-xs text-slate-500">Sebelum diskon nota</span>
          </div>
          <span className="text-sm font-bold text-slate-800">{formatIDR(subtotal)}</span>
        </div>

        {/* Pilihan Tipe Diskon */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Tag size={13} className="text-slate-500" />
            <span>Tipe Diskon</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDiscountType('percent')
                setError(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                discountType === 'percent'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Percent size={14} />
              <span>Persentase (%)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDiscountType('amount')
                setError(null)
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                discountType === 'amount'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <DollarSign size={14} />
              <span>Nominal (Rp)</span>
            </button>
          </div>
        </div>

        {/* Input Nilai Diskon */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            {discountType === 'percent' ? 'Nilai Persentase (%)' : 'Nominal Potongan (Rp)'}
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={discountType === 'percent' ? 100 : subtotal}
              placeholder={discountType === 'percent' ? 'Contoh: 10' : 'Contoh: 15000'}
              value={discountValue === 0 ? '' : discountValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                setDiscountValue(val)
                setError(null)
              }}
              className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {discountType === 'percent' ? '%' : 'IDR'}
            </span>
          </div>

          {error && <p className="text-[11px] text-red-600 font-medium mt-1">{error}</p>}

          {/* Quick Presets untuk Persentase */}
          {discountType === 'percent' && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Preset:</span>
              {PERCENT_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountValue(pct)
                    setError(null)
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    discountValue === pct
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview Hasil Diskon */}
        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Potongan Diskon:</span>
            <span className="font-bold text-amber-600">
              {discountValue > 0 ? `-${formatIDR(previewDiscountAmount)}` : 'Rp 0'}
            </span>
          </div>
          <div className="flex justify-between text-slate-900 pt-1 border-t border-indigo-100 font-semibold">
            <span>Setelah Diskon Nota:</span>
            <span className="font-extrabold text-indigo-700">
              {formatIDR(previewTotalAfterDiscount)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
