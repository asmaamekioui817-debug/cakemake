'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import Navbar from '@/components/Navbar'
import { User, Phone, MapPin, ChefHat, ShoppingBag, Truck, Save, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  customer: { label: 'عميل', icon: '🛍️', color: 'bg-blue-50 text-blue-600' },
  maker: { label: 'صانع حلوى', icon: '👩‍🍳', color: 'bg-amber-50 text-amber-700' },
  delivery: { label: 'موصّل', icon: '🚗', color: 'bg-green-50 text-green-700' },
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', city: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({ full_name: data.full_name || '', phone: data.phone || '', city: data.city || '', address: data.address || '' })
      }
      setLoading(false)
    }
    init()
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      city: form.city,
      address: form.address,
    }).eq('id', profile!.id)
    if (error) { toast.error('خطأ في الحفظ') } else { toast.success('تم حفظ الملف الشخصي ✓') }
    setSaving(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="w-20 h-20 bg-rose-100 rounded-full mx-auto" />
          <div className="h-5 bg-rose-100 rounded w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  )

  const roleInfo = ROLE_INFO[profile?.role || 'customer']

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Profile Header */}
        <div className="card p-6 text-center animate-slide-up">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-300 to-amber-300 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-md">
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-gray-800">{profile?.full_name}</h1>
          <span className={`badge mt-2 ${roleInfo.color}`}>
            {roleInfo.icon} {roleInfo.label}
          </span>
          {profile?.city && <p className="text-sm text-gray-400 mt-2">📍 {profile.city}</p>}
        </div>

        {/* Edit Form */}
        <div className="card p-6 animate-slide-up">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-rose-400" />
            تعديل البيانات
          </h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="relative">
              <User size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="الاسم الكامل"
                required
                className="input-field pr-10"
              />
            </div>
            <div className="relative">
              <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="رقم الهاتف"
                className="input-field pr-10"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="المدينة"
                className="input-field pr-10"
              />
            </div>
            <textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="العنوان التفصيلي"
              rows={2}
              className="input-field resize-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </form>
        </div>

        {/* Quick Links */}
        {profile?.role === 'maker' && (
          <a href="/maker/dashboard" className="card p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform block">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
              <ChefHat size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800">لوحة الصانع</p>
              <p className="text-xs text-gray-400">إدارة المنتجات والطلبات والورشات</p>
            </div>
          </a>
        )}
        {profile?.role === 'delivery' && (
          <a href="/delivery/dashboard" className="card p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform block">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
              <Truck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800">لوحة التوصيل</p>
              <p className="text-xs text-gray-400">إدارة طلبات التوصيل</p>
            </div>
          </a>
        )}
        <a href="/orders" className="card p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform block">
          <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center">
            <ShoppingBag size={20} className="text-rose-500" />
          </div>
          <div>
            <p className="font-bold text-gray-800">طلباتي</p>
            <p className="text-xs text-gray-400">عرض سجل الطلبات</p>
          </div>
        </a>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full card p-4 flex items-center justify-center gap-3 text-red-500 hover:bg-red-50 transition-colors font-semibold"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
