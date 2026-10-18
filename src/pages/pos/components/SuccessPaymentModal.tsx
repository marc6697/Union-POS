import { CheckCircle2, Printer, ArrowRight, Banknote, QrCode, CreditCard } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import type { Transaction, PaymentMethod } from '../../../types'
import { formatIDR } from '../../../lib/utils'

interface SuccessPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onPrintReceipt: () => void
}

const PAYMENT_METHOD_INFO: Record<
  PaymentMethod,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  cash: { label: 'Tunai', icon: Banknote },
  qris: { label: 'QRIS', icon: QrCode },
  card: { label: 'Kartu', icon: CreditCard },
}

export default function SuccessPaymentModal({
  isOpen,
  onClose,
  transaction,
  onPrintReceipt,
}: SuccessPaymentModalProps) {
  if (!transaction) return null

  const PaymentIcon = PAYMENT_METHOD_INFO[transaction.payment_method]?.icon || Banknote
  const paymentLabel = PAYMENT_METHOD_INFO[transaction.payment_method]?.label || transaction.payment_method

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Berhasil"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPrintReceipt}
            leftIcon={<Printer size={15} />}
            className="cursor-pointer"
          >
            Cetak Nota
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            rightIcon={<ArrowRight size={15} />}
            className="cursor-pointer"
          >
            Transaksi Baru
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-center">
        {/* Ikon Sukses */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 size={32} />
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Transaksi Selesai</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Nota: <strong className="text-indigo-600 font-bold">{transaction.invoice_no}</strong>
          </p>
        </div>

        {/* Card Ringkasan Pembayaran */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 text-left space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Pelanggan</span>
            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
              {transaction.customer_name_snapshot || 'Pelanggan Umum (Walk-in)'}
            </span>
          </div>

          <div className="flex justify-between text-slate-500">
            <span>Metode Bayar</span>
            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
              <PaymentIcon size={13} className="text-slate-500" />
              <span>{paymentLabel}</span>
            </span>
          </div>

          {transaction.payment_method === 'cash' && (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Uang Diterima</span>
                <span className="font-semibold text-slate-800">
                  {formatIDR(Number(transaction.amount_paid))}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Kembalian</span>
                <span className="font-bold text-emerald-600">
                  {formatIDR(Number(transaction.change_amount))}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 items-baseline">
            <span>Total Tagihan</span>
            <span className="text-base font-black text-indigo-700">
              {formatIDR(Number(transaction.total))}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
