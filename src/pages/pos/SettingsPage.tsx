import { useState, useEffect } from 'react'
import { Store, Receipt, Printer } from 'lucide-react'
import { toast } from 'sonner'
import POSHeader from '../../components/POSHeader'
import NavigationDrawer from '../../components/NavigationDrawer'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useBusinessName } from '../../hooks/useBusinessName'
import { useAuthStore } from '../../store/authStore'
import { getBusinessSettings, upsertBusinessSettings } from '../../lib/services/settingsService'

export default function SettingsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const businessName = useBusinessName()
  const { user } = useAuthStore()

  const isOwner = user?.role === 'owner'
  const businessId = user?.business_id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Pengaturan Pajak (PPN)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState<number | string>(10)
  const [taxError, setTaxError] = useState<string | null>(null)

  // Pengaturan Struk
  const [receiptFooter, setReceiptFooter] = useState('')

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
          setReceiptFooter(settings.receipt_footer || '')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat pengaturan'
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

  const handleSaveSettings = async () => {
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
        receipt_footer: receiptFooter.trim() || null,
      })

      toast.success('Pengaturan berhasil disimpan')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 flex flex-col">
      <POSHeader
        subtitle="Pengaturan"
        businessName={businessName}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <NavigationDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pengaturan Toko & POS</h1>
          <p className="text-sm text-slate-500">Sesuaikan profil outlet, printer struk, dan preferensi aplikasi</p>
        </div>

        {/* Setting Groups */}
        <div className="space-y-4">
          {/* Outlet Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Store size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Profil Bisnis</h2>
                <p className="text-xs text-slate-500">Informasi nama toko dan kontak usaha</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Usaha / Bisnis"
                defaultValue={businessName || 'Bisnis Anda'}
                disabled
              />
              <Input
                label="Akun Pemilik (Email)"
                defaultValue={user?.email || ''}
                disabled
              />
            </div>
          </div>

          {/* Struk & Printer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Printer size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Struk & Printer Kasir</h2>
                <p className="text-xs text-slate-500">Konfigurasi printer thermal Bluetooth / USB & footer struk</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Catatan Footer Struk"
                placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                disabled={!isOwner || isSaving || isLoading}
              />
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">Cetak Otomatis Setelah Transaksi</p>
                  <p className="text-xs text-slate-500">Langsung kirim perintah print saat transaksi selesai</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Pajak & Service (Hanya tampil untuk Owner) */}
          {isOwner && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Pajak (PB1/PPN)</h2>
                  <p className="text-xs text-slate-500">Aturan pemungutan pajak pada nota transaksi</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Aktifkan PPN</p>
                    <p className="text-xs text-slate-500">Tambahkan pemungutan pajak pada setiap transaksi POS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => {
                      setTaxEnabled(e.target.checked)
                      setTaxError(null)
                    }}
                    disabled={isSaving || isLoading}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                {taxEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Persentase Pajak (%)"
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
                      disabled={isSaving || isLoading}
                      placeholder="Contoh: 11"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action button atau pesan hak akses */}
          {isOwner ? (
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                isLoading={isSaving}
                disabled={isLoading}
              >
                Simpan Pengaturan
              </Button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl">
              Mode baca saja: Hanya pemilik usaha (Owner) yang memiliki izin untuk mengubah pengaturan outlet dan PPN.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
