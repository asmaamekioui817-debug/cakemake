'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import Navbar from '@/components/Navbar'
import { Calendar, Clock, Users, Video, ChevronLeft } from 'lucide-react'

const CATEGORIES = ['الكل', 'كعك', 'حلوى مغربية', 'شوكولاتة', 'تزيين الكيك', 'أخرى']

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [filtered, setFiltered] = useState<Workshop[]>([])
  const [category, setCategory] = useState('الكل')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkshops = async () => {
      const { data } = await supabase
        .from('workshops')
        .select('*, profiles(full_name, city)')
        .eq('is_active', true)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
      setWorkshops(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchWorkshops()
  }, [])

  useEffect(() => {
    if (category === 'الكل') {
      setFiltered(workshops)
    } else {
      setFiltered(workshops.filter(w => w.category === category))
    }
  }, [category, workshops])

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="animate-slide-up">
          <h1 className="page-header">👩‍🍳 الورشات والدورات</h1>
          <p className="text-gray-500">تعلم صنع الحلويات مع أفضل الصانعين عبر Zoom</p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                category === cat
                  ? 'bg-amber-400 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-rose-100 hover:border-amber-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 bg-amber-100 rounded w-2/3 mb-3" />
                <div className="h-3 bg-amber-50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 animate-slide-up">
            <div className="text-5xl mb-3">👩‍🍳</div>
            <p className="font-bold text-lg">لا توجد ورشات قادمة</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {filtered.map((workshop) => (
              <Link key={workshop.id} href={`/workshops/${workshop.id}`} className="card p-5 flex gap-4 hover:scale-[1.01] transition-transform block">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-rose-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                  {workshop.thumbnail_url ? (
                    <img src={workshop.thumbnail_url} alt={workshop.title} className="w-full h-full object-cover rounded-2xl" />
                  ) : '👩‍🍳'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-800 truncate">{workshop.title}</h3>
                    <span className={`badge flex-shrink-0 ${workshop.price === 0 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700'}`}>
                      {workshop.price === 0 ? 'مجاني' : `${workshop.price} د.ج`}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1 truncate">{workshop.description}</p>

                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={12} className="text-rose-400" />
                      {new Date(workshop.scheduled_at).toLocaleDateString('ar-DZ', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} className="text-amber-400" />
                      {workshop.duration_minutes} دقيقة
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={12} className="text-blue-400" />
                      {workshop.max_participants} مشارك
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-500 font-semibold">
                      <Video size={12} />
                      عبر Zoom
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    بقيادة: {(workshop as any).profiles?.full_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
