'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('خطأ في البريد أو كلمة المرور')
    } else if (data.user) {
      toast.success('مرحباً بك مجدداً! 👋')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="w-28 h-28 mx-auto mb-4 relative overflow-hidden rounded-3xl shadow-xl border-4 border-white">
            <img src="/logo.png" alt="حلي باش تولي" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-rose-700">حلي باش تولي</h1>
          <p className="text-gray-500 mt-1">أشهى الحلويات الجزائرية بين يديك</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">تسجيل الدخول</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                required
                className="input-field pr-11"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                required
                className="input-field pr-11 pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 hover:text-rose-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              id="login-btn"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ الدخول...' : 'دخول'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              ليس لديك حساب؟{' '}
              <Link href="/auth/register" className="text-rose-500 font-semibold hover:underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
