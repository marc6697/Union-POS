import { useState, useEffect } from 'react'
import {
  Printer,
  CheckCircle2,
  Sparkles,
  Bluetooth,
  BluetoothConnected,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import POSHeader from '../../../components/POSHeader'
import NavigationDrawer from '../../../components/NavigationDrawer'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import SettingsSubNav from './SettingsSubNav'
import { useAuthStore } from '../../../store/authStore'
import { useBusinessName } from '../../../hooks/useBusinessName'
import { getBusinessSettings, upsertBusinessSettings } from '../../../lib/services/settingsService'
import {
  isBluetoothSupported,
  getStoredBluetoothPrinter,
  saveStoredBluetoothPrinter,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  sendToBluetoothPrinter,
  generateTestReceiptBytes,
  type BluetoothPrinterInfo,
} from '../../../lib/services/bluetoothPrinter'

const AUTO_PRINT_KEY = 'union_pos_auto_print'

export default function ReceiptSettingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()

  const isOwner = user?.role === 'owner'
  const businessId = user?.business_id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Pengaturan Struk
  const [receiptFooter, setReceiptFooter] = useState('')
  const [autoPrint, setAutoPrint] = useState(() => {
    const saved = localStorage.getItem(AUTO_PRINT_KEY)
    return saved !== null ? saved === 'true' : true
  })
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm')

  // Status & Koneksi Bluetooth Printer
  const isBtAvailable = isBluetoothSupported()
  const [btPrinter, setBtPrinter] = useState<BluetoothPrinterInfo | null>(() =>
    getStoredBluetoothPrinter(),
  )
  const [isConnectingBt, setIsConnectingBt] = useState(false)
  const [isPrintingBt, setIsPrintingBt] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadSettings() {
      if (!businessId) {
        setIsLoading(false)
        return
      }

      try {
        const settings = await getBusinessSettings(businessId)
        if (isMounted) {
          setReceiptFooter(settings.receipt_footer || '')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat pengaturan struk'
        toast.error(msg)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      isMounted = false
    }
  }, [businessId])

  const handleToggleAutoPrint = (enabled: boolean) => {
    setAutoPrint(enabled)
    localStorage.setItem(AUTO_PRINT_KEY, String(enabled))
  }

  const handleSaveReceiptSettings = async () => {
    if (!businessId) return
    if (!isOwner) {
      toast.error('Hanya pemilik usaha yang berhak mengubah pengaturan.')
      return
    }

    try {
      setIsSaving(true)
      await upsertBusinessSettings(businessId, {
        receipt_footer: receiptFooter.trim() || null,
      })
      toast.success('Pengaturan struk berhasil disimpan')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan struk'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // Handler: Tambah / Hubungkan Printer Bluetooth
  const handleConnectBluetooth = async () => {
    if (!isBtAvailable) {
      toast.error(
        'Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome di Android atau Desktop.',
      )
      return
    }

    try {
      setIsConnectingBt(true)
      const printer = await connectBluetoothPrinter(() => {
        setBtPrinter((prev) => (prev ? { ...prev, status: 'disconnected' } : null))
        toast.info('Koneksi printer Bluetooth terputus.')
      })
      setBtPrinter(printer)
      toast.success(`Printer "${printer.name}" berhasil terhubung!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Jangan tampilkan pesan error jika user membatalkan jendela scanner Bluetooth
      if (msg.includes('cancelled') || msg.includes('User cancelled')) {
        return
      }
      if (msg.includes('globally disabled')) {
        toast.error(
          'Web Bluetooth dinonaktifkan oleh browser. Pastikan akses menggunakan HTTPS atau localhost, atau aktifkan Web Bluetooth di chrome://flags/#enable-web-bluetooth.',
          { duration: 7000 },
        )
        return
      }
      toast.error(`Gagal menghubungkan printer: ${msg}`)
    } finally {
      setIsConnectingBt(false)
    }
  }

  // Handler: Putuskan & Hapus Printer Bluetooth
  const handleDisconnectBluetooth = async () => {
    try {
      await disconnectBluetoothPrinter()
      saveStoredBluetoothPrinter(null)
      setBtPrinter(null)
      toast.success('Printer Bluetooth berhasil diputuskan.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memutuskan printer'
      toast.error(msg)
    }
  }

  // Handler: Test Print via Bluetooth Thermal Printer (ESC/POS)
  const handleTestPrintBluetooth = async () => {
    if (!btPrinter) {
      toast.error('Belum ada printer Bluetooth yang terhubung.')
      return
    }

    try {
      setIsPrintingBt(true)
      const activeFooter = receiptFooter.trim() || 'Terima kasih atas kunjungan Anda!'
      const data = generateTestReceiptBytes({
        businessName: businessName || 'Union POS Outlet',
        cashierName: user?.full_name || 'Admin',
        footerText: activeFooter,
        paperWidth,
      })

      await sendToBluetoothPrinter(data)
      toast.success('Struk percobaan berhasil dicetak ke printer Bluetooth!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim data ke printer Bluetooth'
      toast.error(msg)
    } finally {
      setIsPrintingBt(false)
    }
  }

  // Handler: Test Print via Sistem / Browser (Thermal layout fallback)
  const handleTestPrintSystem = () => {
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

    const activeFooter = receiptFooter.trim() || 'Terima kasih atas kunjungan Anda!'

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Test Print Struk - Union POS</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${paperWidth === '80mm' ? '72mm' : '52mm'};
              margin: 0 auto;
              padding: 10px 4px;
              color: #000;
              font-size: 11px;
              line-height: 1.35;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .header-title {
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .footer-msg {
              margin-top: 8px;
              font-size: 10px;
              text-align: center;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="header-title">${businessName || 'Union POS Outlet'}</div>
            <div>*** TEST CETAK STRUK SISTEM ***</div>
            <div>${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>No: INV/TEST/001</span>
            <span>Kasir: ${user?.full_name || 'Admin'}</span>
          </div>

          <div class="divider"></div>

          <div class="row font-bold">
            <span>Item Tes A x1</span>
            <span>Rp 25.000</span>
          </div>
          <div class="row font-bold">
            <span>Item Tes B x2</span>
            <span>Rp 30.000</span>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Subtotal</span>
            <span>Rp 55.000</span>
          </div>
          <div class="row font-bold" style="font-size: 13px;">
            <span>TOTAL</span>
            <span>Rp 55.000</span>
          </div>
          <div class="row">
            <span>Bayar (Tunai)</span>
            <span>Rp 100.000</span>
          </div>
          <div class="row">
            <span>Kembali</span>
            <span>Rp 45.000</span>
          </div>

          <div class="divider"></div>

          <div class="footer-msg">
            ${activeFooter}
          </div>
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pengaturan > Struk Printer & Kasir"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <SettingsSubNav activeTab="receipt" />

        {/* Header Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Struk Printer & Kasir</h1>
          <p className="text-sm text-slate-500">
            Hubungkan printer Bluetooth thermal, atur format struk belanja, dan uji cetak transaksi
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Pengaturan Printer & Struk */}
          <div className="lg:col-span-7 space-y-5">
            {/* CARD 1: PRINTER BLUETOOTH */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bluetooth size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Printer Bluetooth</h2>
                    <p className="text-xs text-slate-500">
                      Koneksi nirkabel ke printer kasir thermal mini (ESC/POS)
                    </p>
                  </div>
                </div>

                {btPrinter && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      btPrinter.status === 'connected'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        btPrinter.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    <span>{btPrinter.status === 'connected' ? 'Terhubung' : 'Terputus'}</span>
                  </span>
                )}
              </div>

              {!isBtAvailable ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {typeof window !== 'undefined' && !window.isSecureContext
                        ? 'Koneksi Tidak Aman (Insecure Context)'
                        : 'Web Bluetooth Tidak Didukung'}
                    </p>
                    <p>
                      {typeof window !== 'undefined' && !window.isSecureContext
                        ? 'Web Bluetooth API hanya dapat berjalan pada koneksi aman (HTTPS atau http://localhost). Jika Anda membuka aplikasi kasir melalui IP lokal (misalnya http://192.168.x.x), browser otomatis menonaktifkan fitur Bluetooth demi keamanan.'
                        : 'Browser ini belum mendukung Web Bluetooth API. Untuk menghubungkan printer secara langsung via Bluetooth, silakan gunakan Google Chrome di perangkat Android atau Desktop.'}
                    </p>
                    <p className="text-amber-700">
                      Anda tetap dapat mencetak struk transaksi kapan saja menggunakan tombol{' '}
                      <strong>Test Print Sistem (Browser)</strong> di bawah.
                    </p>
                  </div>
                </div>
              ) : btPrinter ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <BluetoothConnected size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {btPrinter.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          ID: {btPrinter.id.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleConnectBluetooth}
                        isLoading={isConnectingBt}
                        title="Pindai ulang printer"
                      >
                        <RefreshCw size={14} className="mr-1" />
                        Ganti
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnectBluetooth}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Putuskan printer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={handleTestPrintBluetooth}
                      isLoading={isPrintingBt}
                      className="w-full sm:w-auto"
                    >
                      <Printer size={16} className="mr-2" />
                      Test Print Bluetooth (ESC/POS)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <Bluetooth size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Belum Ada Printer Bluetooth Terhubung
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                      Nyalakan printer Bluetooth kasir Anda, pastikan mode pairing aktif, lalu klik
                      tombol di bawah untuk memindai perangkat.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleConnectBluetooth}
                    isLoading={isConnectingBt}
                    className="mx-auto"
                  >
                    <Bluetooth size={16} className="mr-1.5" />
                    + Hubungkan Printer Bluetooth
                  </Button>
                </div>
              )}
            </div>

            {/* CARD 2: KONFIGURASI STRUK */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Format & Catatan Struk</h2>
                  <p className="text-xs text-slate-500">Sesuaikan pesan footer dan ukuran kertas</p>
                </div>
              </div>

              {/* Input Footer */}
              <div className="space-y-1.5">
                <Input
                  label="Catatan Footer Struk"
                  placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  disabled={!isOwner || isSaving || isLoading}
                />
                <p className="text-xs text-slate-400">
                  Teks ini akan dicetak di bagian paling bawah struk transaksi belanja pelanggan.
                </p>
              </div>

              {/* Opsi Ukuran Kertas */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Ukuran Lebar Kertas Printer
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80mm')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">80 mm</span>
                      {paperWidth === '80mm' && (
                        <CheckCircle2 size={16} className="text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Standar Kasir Desktop</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperWidth('58mm')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">58 mm</span>
                      {paperWidth === '58mm' && (
                        <CheckCircle2 size={16} className="text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Printer Bluetooth Mini</p>
                  </button>
                </div>
              </div>

              {/* Checkbox Otomatis Cetak */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">Cetak Otomatis Setelah Transaksi</p>
                  <p className="text-xs text-slate-500">
                    Kirim perintah cetak otomatis begitu pembayaran diselesaikan di kasir
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => handleToggleAutoPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleTestPrintSystem}
                  className="w-full sm:w-auto"
                >
                  <Printer size={16} className="mr-1.5" />
                  Test Print Sistem (Browser)
                </Button>

                {isOwner && (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSaveReceiptSettings}
                    isLoading={isSaving}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Simpan Pengaturan Struk
                  </Button>
                )}
              </div>

              {!isOwner && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
                  Mode baca saja: Hanya pemilik usaha (Owner) yang memiliki izin untuk memperbarui catatan footer struk.
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Pratinjau Live Struk Termal */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Pratinjau Struk Kasir</span>
              </span>
              <span className="text-xs text-slate-400">{paperWidth} Thermal</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-mono text-xs text-slate-800 space-y-3 max-w-sm mx-auto">
              <div className="text-center space-y-0.5">
                <p className="font-bold text-sm tracking-wide text-slate-900 uppercase">
                  {businessName || 'Union POS Outlet'}
                </p>
                <p className="text-[11px] text-slate-500">Jl. Bisnis Sukses No. 88</p>
                <p className="text-[10px] text-slate-400">Telp: 0812-3456-7890</p>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Nota:</span>
                  <span className="font-semibold">INV/20261019/001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir:</span>
                  <span>{user?.full_name || 'Kasir'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu:</span>
                  <span>18 Okt 2026, 14:30 WIB</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5 text-[11px]">
                <div>
                  <p className="font-medium">Kopi Susu Gula Aren</p>
                  <div className="flex justify-between text-slate-500">
                    <span>2 x Rp 18.000</span>
                    <span className="text-slate-800 font-medium">Rp 36.000</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Croissant Butter</p>
                  <div className="flex justify-between text-slate-500">
                    <span>1 x Rp 25.000</span>
                    <span className="text-slate-800 font-medium">Rp 25.000</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>Rp 61.000</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>TOTAL</span>
                  <span>Rp 61.000</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai</span>
                  <span>Rp 70.000</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kembali</span>
                  <span>Rp 9.000</span>
                </div>
              </div>

              {/* Live Footer */}
              <div className="border-t border-dashed border-slate-300 pt-3 text-center">
                <p className="text-[11px] font-medium text-slate-700 italic">
                  {receiptFooter.trim() || 'Terima kasih atas kunjungan Anda!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
