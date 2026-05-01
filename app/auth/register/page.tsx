'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { User, Mail, Lock, Phone, MapPin, ChefHat, ShoppingBag, Truck } from 'lucide-react'

type Role = 'customer' | 'maker' | 'delivery'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    role: 'customer' as Role,
  })
  const [loading, setLoading] = useState(false)

  const roles = [
    { value: 'customer', label: 'عميل', icon: ShoppingBag, desc: 'اطلب أشهى الحلويات' },
    { value: 'maker', label: 'صانع حلوى', icon: ChefHat, desc: 'بع واعرض منتجاتك' },
    { value: 'delivery', label: 'موصّل', icon: Truck, desc: 'وصّل الطلبات' },
  ]

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { 
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
          city: formData.city,
        },
      },
    })

    if (error) {
      toast.error(error.message)
    } else if (data.user) {
      toast.success('تم إنشاء حسابك بنجاح! 🎉')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen pattern-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 animate-slide-up">
          <div className="w-28 h-28 mx-auto mb-4 relative overflow-hidden rounded-3xl shadow-xl border-4 border-white">
            <img src="/logo.png" alt="حلي باش تولي" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-rose-700">إنشاء حساب</h1>
          <p className="text-gray-500 mt-1">انضم لمجتمع حلي باش تولي</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              {roles.map((role) => {
                const Icon = role.icon
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role.value as Role })}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      formData.role === role.value
                        ? 'border-rose-400 bg-rose-50 text-rose-600'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-rose-200'
                    }`}
                  >
                    <Icon size={24} className="mx-auto mb-1" />
                    <p className="text-xs font-bold">{role.label}</p>
                    <p className="text-xs opacity-70 hidden sm:block">{role.desc}</p>
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                id="full-name"
                type="text"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="الاسم الكامل"
                required
                className="input-field pr-11"
              />
            </div>

            <div className="relative">
              <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                id="reg-email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="البريد الإلكتروني"
                required
                className="input-field pr-11"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                id="reg-password"
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                required
                minLength={6}
                className="input-field pr-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Phone size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                  className="input-field pr-11"
                />
              </div>
              <div className="relative">
                <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="المدينة"
                  className="input-field pr-11"
                />
              </div>
            </div>

            <button
              type="submit"
              id="register-btn"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-gray-500 text-sm">
              لديك حساب بالفعل؟{' '}
              <Link href="/auth/login" className="text-rose-500 font-semibold hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
