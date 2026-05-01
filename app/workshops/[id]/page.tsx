'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import Navbar from '@/components/Navbar'
import { Calendar, Clock, Users, Video, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WorkshopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [participantCount, setParticipantCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data } = await supabase
        .from('workshops')
        .select('*, profiles(full_name, city), workshop_registrations(id, user_id)')
        .eq('id', params.id)
        .single()

      if (data) {
        setWorkshop(data)
        setParticipantCount(data.workshop_registrations?.length || 0)
        if (user) {
          setRegistered(data.workshop_registrations?.some((r: any) => r.user_id === user.id))
        }
      }
      setLoading(false)
    }
    init()
  }, [params.id])

  const handleRegister = async () => {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    setRegistering(true)
    const { error } = await supabase.from('workshop_registrations').insert({
      workshop_id: params.id,
      user_id: currentUserId,
    })
    if (error) {
      toast.error('خطأ في التسجيل')
    } else {
      setRegistered(true)
      setParticipantCount(p => p + 1)
      toast.success('تم التسجيل في الورشة! 🎉')
    }
    setRegistering(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="card animate-pulse">
            <div className="h-48 bg-amber-100" />
            <div className="p-6 space-y-4">
              <div className="h-6 bg-amber-100 rounded w-2/3" />
              <div className="h-4 bg-amber-50 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!workshop) return null

  const isMaker = workshop.maker_id === currentUserId
  const isFull = participantCount >= workshop.max_participants

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/workshops" className="flex items-center gap-2 text-rose-500 font-semibold mb-4 hover:gap-3 transition-all">
          <ArrowRight size={18} />
          العودة
        </Link>

        <div className="card overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-l from-amber-400 to-rose-400 p-8 text-white">
            <div className="text-5xl mb-4">👩‍🍳</div>
            <h1 className="text-2xl font-bold">{workshop.title}</h1>
            <p className="text-amber-100 mt-1">بقيادة: {(workshop as any).profiles?.full_name}</p>
          </div>

          <div className="p-6 space-y-4">
            {workshop.description && (
              <p className="text-gray-600">{workshop.description}</p>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-2xl p-3 flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" />
                <div>
                  <p className="text-xs text-gray-400">التاريخ</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(workshop.scheduled_at).toLocaleDateString('ar-DZ', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">الوقت</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {new Date(workshop.scheduled_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 flex items-center gap-2">
                <Users size={16} className="text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">المشاركون</p>
                  <p className="text-sm font-semibold text-gray-700">{participantCount} / {workshop.max_participants}</p>
                </div>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-3 flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                <div>
                  <p className="text-xs text-gray-400">المدة</p>
                  <p className="text-sm font-semibold text-gray-700">{workshop.duration_minutes} دقيقة</p>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-l from-rose-50 to-amber-50 rounded-2xl p-4 flex items-center justify-between">
              <p className="font-bold text-gray-700">رسوم الورشة</p>
              <span className="text-2xl font-bold text-amber-600">
                {workshop.price === 0 ? 'مجاني 🎁' : `${workshop.price} د.ج`}
              </span>
            </div>

            {/* Actions */}
            {isMaker ? (
              <div className="space-y-3">
                <a
                  href={workshop.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Video size={18} />
                  بدء جلسة Zoom
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : registered ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle size={22} className="text-green-500" />
                  <div>
                    <p className="font-bold text-green-700">أنت مسجل في هذه الورشة!</p>
                    <p className="text-sm text-green-600">انضم عبر الرابط في وقت الورشة</p>
                  </div>
                </div>
                <a
                  href={workshop.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Video size={18} />
                  انضم لـ Zoom
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering || isFull}
                className="btn-primary w-full disabled:opacity-60"
              >
                {registering ? 'جارٍ التسجيل...' : isFull ? 'الورشة مكتملة' : `سجّل الآن ${workshop.price > 0 ? `- ${workshop.price} د.ج` : '(مجاني)'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
