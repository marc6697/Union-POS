import { useRef } from 'react'
import { Printer } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import type { Transaction } from '../../../types'
import { formatIDR } from '../../../lib/utils'
import { formatDateTimeWIB } from '../../../lib/datePresets'

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  businessName: string
  receiptFooter?: string | null
}

export default function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  businessName,
  receiptFooter,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!transaction) return null

  const isVoided = transaction.status === 'voided'
  const finalFooter = receiptFooter?.trim() || 'Terima kasih atas kunjungan Anda'

  const handlePrint = () => {
    const printContent = receiptRef.current
    if (!printContent) return

    // Cetak melalui hidden iframe berukuran standar 80mm (lebar kertas termal POS)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk - ${transaction.invoice_no}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 4mm 4mm 8mm 4mm;
              width: 72mm;
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .double-divider {
              border-top: 2px dashed #000;
              margin: 6px 0;
            }
            .flex-between {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .void-stamp {
              border: 2px dashed #000;
              padding: 4px;
              margin: 6px 0;
              text-align: center;
              font-weight: bold;
              font-size: 12px;
            }
            .title-store {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .item-row {
              margin-bottom: 4px;
            }
            .sub-text {
              font-size: 10px;
              color: #333;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      try {
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Print failed:', err)
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }
    }, 250)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Struk Transaksi (80mm)"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
          >
            Cetak Struk / Simpan PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Preview cetak struk kasir ukuran <strong>80mm</strong> (lebar konten 72mm). Klik tombol
          di bawah untuk mencetak ke printer thermal atau simpan sebagai PDF.
        </p>

        {/* ── Wadah Kertas Struk 80mm Monospace ──────────────────────────────── */}
        <div className="p-4 bg-slate-100 rounded-2xl flex justify-center overflow-x-auto">
          <div
            ref={receiptRef}
            className="w-[72mm] min-w-[72mm] bg-white p-3.5 shadow-md border border-slate-300 font-mono text-[11px] leading-tight text-slate-900 select-text"
          >
            {/* Header Toko */}
            <div className="text-center mb-2">
              <div className="text-sm font-black uppercase tracking-wide">
                {businessName || 'UNION POS'}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Nota Penjualan Kasir</div>
            </div>

            {/* Stamp jika VOID */}
            {isVoided && (
              <div className="border-2 border-dashed border-red-600 text-red-600 text-center py-1 my-1.5 font-bold text-xs uppercase tracking-wider">
                *** VOID / DIBATALKAN ***
              </div>
            )}

            <div className="border-t border-dashed border-slate-900 my-1.5" />

            {/* Meta Nota */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>No. Nota :</span>
                <span className="font-bold">{transaction.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal  :</span>
                <span>{formatDateTimeWIB(transaction.transaction_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir    :</span>
                <span>{transaction.creator?.full_name || 'Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="truncate max-w-[120px]">
                  {transaction.customer_name_snapshot || 'Walk-in'}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-900 my-1.5" />

            {/* Daftar Produk & Jasa */}
            <div className="space-y-1.5 my-1.5">
              {transaction.items?.map((item) => {
                const staffName = item.staff?.[0]?.staff_name_snapshot
                const hasDiscount = Number(item.discount_amount) > 0

                const lineSubtotal =
                  Number(item.unit_price) * Number(item.quantity) - Number(item.discount_amount || 0)

                return (
                  <div key={item.id} className="space-y-0.5">
                    <div className="font-bold">{item.product_name}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {item.quantity} × {formatIDR(Number(item.unit_price))}
                      </span>
                      <span className="font-semibold">{formatIDR(lineSubtotal)}</span>
                    </div>

                    {hasDiscount && (
                      <div className="flex justify-between text-[9px] text-amber-700">
                        <span>  Disc Item:</span>
                        <span>-{formatIDR(Number(item.discount_amount))}</span>
                      </div>
                    )}

                    {staffName && (
                      <div className="text-[9px] text-slate-500">  Staf: {staffName}</div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-dashed border-slate-900 my-1.5" />

            {/* Rincian Subtotal & Pajak */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatIDR(Number(transaction.subtotal))}</span>
              </div>

              {Number(transaction.item_discount_total) > 0 && (
                <div className="flex justify-between">
                  <span>Diskon Item</span>
                  <span>-{formatIDR(Number(transaction.item_discount_total))}</span>
                </div>
              )}

              {Number(transaction.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span>Diskon Nota</span>
                  <span>-{formatIDR(Number(transaction.discount_amount))}</span>
                </div>
              )}

              {Number(transaction.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <span>PPN {transaction.tax_rate_snapshot}%</span>
                  <span>{formatIDR(Number(transaction.tax_amount))}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-900 my-1" />

              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>TOTAL</span>
                <span>{formatIDR(Number(transaction.total))}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-900 my-1.5" />

            {/* Metode Pembayaran */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Bayar ({transaction.payment_method.toUpperCase()})</span>
                <span>
                  {transaction.payment_method === 'cash'
                    ? formatIDR(Number(transaction.amount_paid))
                    : formatIDR(Number(transaction.total))}
                </span>
              </div>

              {transaction.payment_method === 'cash' && (
                <div className="flex justify-between">
                  <span>Kembalian</span>
                  <span>{formatIDR(Number(transaction.change_amount))}</span>
                </div>
              )}
            </div>

            {/* Footer Nota */}
            <div className="border-t border-dashed border-slate-900 my-2" />
            <div className="text-center text-[10px] text-slate-700 whitespace-pre-line">
              {finalFooter}
            </div>

            {/* Detail Void (Jika Dibatalkan) */}
            {isVoided && (
              <div className="mt-2 pt-1 border-t border-dotted border-red-500 text-[9px] text-red-600 text-center">
                Dibatalkan: {formatDateTimeWIB(transaction.voided_at)}
                {transaction.void_reason && <div>Alasan: {transaction.void_reason}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
