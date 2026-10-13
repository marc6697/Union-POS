import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    clearError()

    if (!email.trim()) { setFormError('Email wajib diisi.'); return }
    if (!password) { setFormError('Password wajib diisi.'); return }

    const role = await login(email.trim(), password)

    if (role === 'superadmin') {
      navigate('/admin', { replace: true })
    } else if (role === 'owner' || role === 'kasir') {
      navigate('/pos', { replace: true })
    }
  }

  const fillDemo = (type: 'superadmin' | 'owner' | 'kasir') => {
    clearError()
    setFormError('')
    const credentials = {
      superadmin: { email: 'superadmin@unionpos.com', password: 'admin123' },
      owner: { email: 'owner@demo.com', password: 'owner123' },
      kasir: { email: 'kasir@demo.com', password: 'kasir123' },
    }
    setEmail(credentials[type].email)
    setPassword(credentials[type].password)
  }

  const displayError = formError || error

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
            <ShoppingBag size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Union POS</h1>
          <p className="text-slate-400 text-sm mt-1">Point of Sale Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Selamat datang 👋</h2>
          <p className="text-sm text-slate-500 mb-6">Masuk ke akun Anda untuk melanjutkan</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              autoComplete="email"
              autoCapitalize="none"
              disabled={isLoading}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="current-password"
              disabled={isLoading}
            />

            {/* Error message */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <span className="text-base">⚠️</span>
                {displayError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-1"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-3 text-center uppercase tracking-wider">
            Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { type: 'superadmin' as const, label: 'Super Admin', color: 'bg-violet-600 hover:bg-violet-500' },
                { type: 'owner' as const, label: 'Owner', color: 'bg-blue-600 hover:bg-blue-500' },
                { type: 'kasir' as const, label: 'Kasir', color: 'bg-amber-500 hover:bg-amber-400' },
              ]
            ).map(({ type, label, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => fillDemo(type)}
                disabled={isLoading}
                className={`${color} text-white text-xs font-medium rounded-xl py-2.5 px-2 transition-all duration-150 active:scale-95 disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2.5 text-center">
            Klik role di atas untuk mengisi kredensial demo
          </p>
        </div>
      </div>

      <p className="relative mt-8 text-xs text-slate-600">
        © 2025 Union POS. All rights reserved.
      </p>
    </div>
  )
}
