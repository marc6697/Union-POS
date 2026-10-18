import { useState, useEffect } from 'react'
import { Receipt, Info, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import POSHeader from '../../../components/POSHeader'
import NavigationDrawer from '../../../components/NavigationDrawer'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import SettingsSubNav from './SettingsSubNav'
import { useAuthStore } from '../../../store/authStore'
import { useBusinessName } from '../../../hooks/useBusinessName'
import { getBusinessSettings, upsertBusinessSettings } from '../../../lib/services/settingsService'
import { formatIDR } from '../../../lib/utils'

export default function TaxSettingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()

  const isOwner = user?.role === 'owner'
  const businessId = user?.business_id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Pengaturan Pajak (PPN/PB1)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState<number | string>(10)
  const [taxError, setTaxError] = useState<string | null>(null)

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
          setTaxEnabled(settings.tax_enabled)
          setTaxRate(settings.tax_rate)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat pengaturan pajak'
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

  const handleSaveTaxSettings = async () => {
    if (!businessId) return
    if (!isOwner) {
      toast.error('Hanya pemilik usaha yang berhak mengubah pengaturan.')
      return
    }

    if (taxEnabled) {
      const parsedRate = Number(taxRate)
      if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        setTaxError('Persentase pajak harus berupa angka antara 0 dan 100.')
        return
      }
    }

    try {
      setIsSaving(true)
      setTaxError(null)

      const finalRate = taxEnabled ? Number(taxRate) : (Number(taxRate) || 0)
      await upsertBusinessSettings(businessId, {
        tax_enabled: taxEnabled,
        tax_rate: finalRate,
      })

      toast.success('Pengaturan pajak berhasil disimpan')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan pajak'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // Perhitungan simulasi
  const sampleSubtotal = 100000
  const currentRate = Number(taxRate) || 0
  const simulatedTax = taxEnabled ? Math.round((sampleSubtotal * currentRate) / 100) : 0
  const simulatedTotal = sampleSubtotal + simulatedTax

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pengaturan > Pajak"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <SettingsSubNav activeTab="tax" />

        {/* Header Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pajak (PB1 / PPN)</h1>
          <p className="text-sm text-slate-500">
            Aturan pemungutan tarif pajak pada nota transaksi kasir POS
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Utama Pengaturan Pajak */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Kebijakan Pemungutan Pajak</h2>
                  <p className="text-xs text-slate-500">PPN atau Pajak Restoran / Pembangunan (PB1)</p>
                </div>
              </div>

              {/* Toggle Aktifkan Pajak */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Aktifkan Pemungutan Pajak</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambahkan pemungutan pajak otomatis pada setiap transaksi POS
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => {
                    setTaxEnabled(e.target.checked)
                    setTaxError(null)
                  }}
                  disabled={!isOwner || isSaving || isLoading}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {/* Input Rate Pajak */}
              {taxEnabled && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <Input
                    label="Persentase Tarif Pajak (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => {
                      setTaxRate(e.target.value)
                      setTaxError(null)
                    }}
                    error={taxError || undefined}
                    disabled={!isOwner || isSaving || isLoading}
                    placeholder="Contoh: 11"
                  />
                  <p className="text-xs text-slate-400">
                    Tarif umum di Indonesia: PPN (11%) atau PB1 Restoran / Kafe (10%).
                  </p>
                </div>
              )}

              {/* Panduan Informasi */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Bagaimana Pajak Dihitung?</p>
                  <p>
                    Pajak dihitung secara proporsional dari subtotal pesanan setelah dipotong diskon item dan diskon pesanan.
                    Nominal pajak akan tercetak secara terpisah pada struk fisik kasir dan rincian transaksi.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {isOwner ? (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleSaveTaxSettings}
                    isLoading={isSaving}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Simpan Pengaturan Pajak
                  </Button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
                  Mode baca saja: Hanya pemilik usaha (Owner) yang memiliki izin untuk mengubah konfigurasi pajak.
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Simulasi Perhitungan Transaksi */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Calculator size={16} className="text-indigo-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Simulasi Nota Kasir
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-500">Status Pajak</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    taxEnabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {taxEnabled ? `Aktif (${currentRate}%)` : 'Nonaktif (0%)'}
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Contoh Subtotal Belanja</span>
                  <span className="font-medium text-slate-800">{formatIDR(sampleSubtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>Pajak Transaksi</span>
                    {taxEnabled && (
                      <span className="text-xs text-indigo-600 font-semibold">({currentRate}%)</span>
                    )}
                  </span>
                  <span className={taxEnabled ? 'font-medium text-indigo-600' : 'text-slate-400'}>
                    {taxEnabled ? `+ ${formatIDR(simulatedTax)}` : 'Rp 0'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">Total Tagihan</span>
                  <span className="text-lg font-bold text-slate-900">{formatIDR(simulatedTotal)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
                {taxEnabled ? (
                  <p>
                    Pelanggan akan dikenakan biaya tambahan pajak sebesar{' '}
                    <strong className="text-slate-800">{formatIDR(simulatedTax)}</strong> dari transaksi senilai{' '}
                    {formatIDR(sampleSubtotal)}.
                  </p>
                ) : (
                  <p>
                    Pajak dinonaktifkan. Nilai total tagihan kasir sama persis dengan subtotal belanja pesanan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
