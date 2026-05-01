'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Profile, Sweet } from '@/types'
import Navbar from '@/components/Navbar'
import { ChevronLeft, Star } from 'lucide-react'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, sweetsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sweets').select('*, profiles(full_name, city)').eq('is_available', true).limit(6),
      ])

      setProfile(profileRes.data)
      setSweets(sweetsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const quickActions = [
    { href: '/sweets', label: 'تصفح الحلويات', icon: '🍬', color: 'from-rose-400 to-pink-400', desc: 'اطلب الآن' },
    { href: '/workshops', label: 'الورشات', icon: '👩‍🍳', color: 'from-amber-400 to-orange-400', desc: 'تعلم الصنع' },
    { href: '/messages', label: 'الرسائل', icon: '💬', color: 'from-blue-400 to-indigo-400', desc: 'تواصل معنا' },
    { href: '/orders', label: 'طلباتي', icon: '📦', color: 'from-green-400 to-emerald-400', desc: 'تتبع الطلبات' },
  ]

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-l from-rose-500 to-amber-400 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white animate-slide-up shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-rose-100 text-xs md:text-sm mb-1">مرحباً بك 👋</p>
              <h1 className="text-xl md:text-3xl font-bold">{profile?.full_name || 'صديقنا العزيز'}</h1>
              <p className="text-rose-100 mt-2 text-xs md:text-sm">اكتشف أشهى الحلويات اليوم</p>
            </div>
            <div className="text-5xl md:text-7xl opacity-80 md:opacity-100">🍯</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="section-title text-lg md:text-xl">استكشف</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="card p-5 text-center hover:scale-105 transition-transform"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-md`}>
                  {action.icon}
                </div>
                <p className="font-bold text-gray-800 text-sm">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Maker Banner */}
        {profile?.role === 'maker' && (
          <Link href="/maker/dashboard" className="block">
            <div className="bg-gradient-to-l from-amber-500 to-rose-400 rounded-3xl p-5 text-white flex items-center justify-between hover:opacity-90 transition-opacity shadow-md">
              <div>
                <p className="text-sm text-amber-100">أنت صانع حلوى ⭐</p>
                <h3 className="font-bold text-lg">إدارة منتجاتك وطلباتك</h3>
                <p className="text-amber-100 text-sm mt-1">انتقل للوحة الصانع</p>
              </div>
              <ChevronLeft size={28} />
            </div>
          </Link>
        )}

        {/* Delivery Banner */}
        {profile?.role === 'delivery' && (
          <Link href="/delivery/dashboard" className="block">
            <div className="bg-gradient-to-l from-green-500 to-teal-400 rounded-3xl p-5 text-white flex items-center justify-between hover:opacity-90 transition-opacity shadow-md">
              <div>
                <p className="text-sm text-green-100">سائق توصيل 🚗</p>
                <h3 className="font-bold text-lg">إدارة طلبات التوصيل</h3>
                <p className="text-green-100 text-sm mt-1">عرض الطلبات المتاحة</p>
              </div>
              <ChevronLeft size={28} />
            </div>
          </Link>
        )}

        {/* Featured Sweets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">✨ أحدث الحلويات</h2>
            <Link href="/sweets" className="text-rose-500 text-sm font-semibold hover:underline flex items-center gap-1">
              عرض الكل <ChevronLeft size={16} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="card h-40 animate-pulse" />)}
            </div>
          ) : sweets.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">لا توجد حلويات معروضة حالياً</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sweets.map(sweet => (
                <Link key={sweet.id} href={`/sweets/${sweet.id}`} className="card group block overflow-hidden">
                  <div className="h-32 relative overflow-hidden bg-rose-100">
                    {sweet.image_url ? (
                      <img src={sweet.image_url} alt={sweet.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🍰</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{sweet.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-rose-500 font-bold text-sm">{sweet.price_per_unit} د.ج</p>
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {(sweet as any).profiles?.city || 'الجزائر'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* CTA Workshops */}
        <Link href="/workshops" className="card p-6 bg-gradient-to-r from-amber-400 to-orange-400 text-white flex items-center justify-between group shadow-lg">
          <div className="flex items-center gap-4">
            <div className="text-4xl">👩‍🍳</div>
            <div>
              <p className="font-bold text-lg">تعلمي صنع الحلويات</p>
              <p className="text-amber-100 text-sm">استكشفي ورشاتنا المباشرة عبر Zoom</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-[-5px] transition-transform">
            <ChevronLeft size={24} />
          </div>
        </Link>

      </div>
    </div>
  )
}
