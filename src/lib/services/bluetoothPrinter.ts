import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'

export interface BluetoothPrinterInfo {
  id: string
  name: string
  status: 'connected' | 'disconnected'
  lastConnectedAt?: string
}

const STORAGE_KEY = 'union_pos_bt_printer'

// Daftar service UUID umum yang digunakan oleh printer thermal mini Bluetooth (ESC/POS)
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Vendor Serial
  '0000ae00-0000-1000-8000-00805f9b34fb', // POS-58 / RPP02N
  '0000ae30-0000-1000-8000-00805f9b34fb', // MPT-II / Iware
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom ESC/POS
  '0000fff0-0000-1000-8000-00805f9b34fb', // Mini Thermal
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / POS
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic Semiconductor UART
]

// Singletons untuk sesi aktif
let activeDevice: BluetoothDevice | null = null
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

/**
 * Memeriksa apakah browser mendukung Web Bluetooth API dan berjalan di Secure Context (HTTPS/localhost).
 */
export function isBluetoothSupported(): boolean {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    return false
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return false
  }
  return true
}

/**
 * Mengambil data printer yang tersimpan di localStorage.
 */
export function getStoredBluetoothPrinter(): BluetoothPrinterInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BluetoothPrinterInfo
  } catch {
    return null
  }
}

/**
 * Menyimpan data printer ke localStorage.
 */
export function saveStoredBluetoothPrinter(printer: BluetoothPrinterInfo | null): void {
  if (!printer) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(printer))
  }
}

/**
 * Menghubungkan ke GATT server dan mencari characteristic yang bisa ditulis.
 */
async function findWriteCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices()

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics()
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          return char
        }
      }
    } catch {
      // lanjut ke service berikutnya jika gagal membaca characteristics
    }
  }

  throw new Error(
    'Tidak dapat menemukan characteristic data tulis pada printer Bluetooth ini.',
  )
}

/**
 * Membuka dialog pemindaian Bluetooth, memasangkan printer, dan mengaktifkan koneksi.
 */
export async function connectBluetoothPrinter(
  onDisconnect?: () => void,
): Promise<BluetoothPrinterInfo> {
  if (!isBluetoothSupported()) {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error(
        'Web Bluetooth memerlukan koneksi aman (HTTPS atau localhost). Fitur ini otomatis dinonaktifkan oleh browser pada protokol HTTP biasa.',
      )
    }
    throw new Error('Web Bluetooth tidak didukung pada browser ini.')
  }

  // Buka dialog browser untuk memilih perangkat bluetooth printer
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  })

  if (!device.gatt) {
    throw new Error('Perangkat Bluetooth tidak memiliki antarmuka GATT.')
  }

  const server = await device.gatt.connect()
  const characteristic = await findWriteCharacteristic(server)

  activeDevice = device
  activeCharacteristic = characteristic

  device.addEventListener('gattserverdisconnected', () => {
    activeCharacteristic = null
    const stored = getStoredBluetoothPrinter()
    if (stored) {
      saveStoredBluetoothPrinter({ ...stored, status: 'disconnected' })
    }
    if (onDisconnect) {
      onDisconnect()
    }
  })

  const printerInfo: BluetoothPrinterInfo = {
    id: device.id,
    name: device.name || 'Printer Bluetooth',
    status: 'connected',
    lastConnectedAt: new Date().toISOString(),
  }

  saveStoredBluetoothPrinter(printerInfo)
  return printerInfo
}

/**
 * Memutuskan koneksi printer bluetooth aktif.
 */
export async function disconnectBluetoothPrinter(): Promise<void> {
  if (activeDevice && activeDevice.gatt?.connected) {
    activeDevice.gatt.disconnect()
  }
  activeDevice = null
  activeCharacteristic = null

  const stored = getStoredBluetoothPrinter()
  if (stored) {
    saveStoredBluetoothPrinter({ ...stored, status: 'disconnected' })
  }
}

/**
 * Menghubungkan ulang jika sebelumnya sudah dipasangkan tapi koneksi terputus.
 */
async function ensureConnected(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (activeCharacteristic && activeDevice?.gatt?.connected) {
    return activeCharacteristic
  }

  if (!activeDevice || !activeDevice.gatt) {
    throw new Error(
      'Printer Bluetooth belum terhubung. Silakan klik "Hubungkan Printer" terlebih dahulu.',
    )
  }

  const server = await activeDevice.gatt.connect()
  const char = await findWriteCharacteristic(server)
  activeCharacteristic = char
  return char
}

/**
 * Mengirimkan buffer byte ESC/POS ke printer dalam potongan aman (chunk).
 */
export async function sendToBluetoothPrinter(data: Uint8Array): Promise<void> {
  const characteristic = await ensureConnected()
  const CHUNK_SIZE = 100

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE)
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
    // Delay kecil agar buffer memori printer thermal tidak meluap
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/**
 * Menyusun byte data ESC/POS untuk struk percobaan (test print).
 */
export function generateTestReceiptBytes(options: {
  businessName: string
  cashierName: string
  footerText: string
  paperWidth: '80mm' | '58mm'
}): Uint8Array {
  const encoder = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    columns: options.paperWidth === '80mm' ? 42 : 32,
  })

  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(options.businessName || 'Union POS')
    .bold(false)
    .line('*** TEST PRINT BLUETOOTH ***')
    .line(`${dateStr}, ${timeStr} WIB`)
    .newline()
    .align('left')
    .line('No: INV/TEST/001')
    .line(`Kasir: ${options.cashierName || 'Kasir'}`)
    .rule()
    .line(options.paperWidth === '80mm' ? 'Item Percobaan A x1         Rp 25.000' : 'Item Percobaan A x1    Rp 25.000')
    .line(options.paperWidth === '80mm' ? 'Item Percobaan B x2         Rp 30.000' : 'Item Percobaan B x2    Rp 30.000')
    .rule()
    .bold(true)
    .line(options.paperWidth === '80mm' ? 'TOTAL                       Rp 55.000' : 'TOTAL                  Rp 55.000')
    .bold(false)
    .rule()
    .align('center')
    .line(options.footerText || 'Terima kasih atas kunjungan Anda!')
    .newline()
    .newline()
    .newline()
    .cut('partial')
    .encode()
}
