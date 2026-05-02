'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import Navbar from '@/components/Navbar'
import { Truck, MapPin, CheckCircle, Clock, MessageCircle, Phone, ChefHat, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [driverId, setDriverId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setDriverId(user.id)

      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), customer:profiles!customer_id(id, full_name, phone), maker:profiles!maker_id(id, full_name, phone)')
        .in('status', ['ready', 'delivering'])
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) {
      toast.error('خطأ في التحديث')
      return
    }
    
    if (status === 'delivered') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o))
    }
    toast.success('تم تحديث حالة التوصيل بنجاح')
  }

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-l from-green-600 to-teal-400 rounded-3xl p-6 text-white animate-slide-up shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">لوحة تحكم الموصّل</p>
              <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
                <Truck size={28} /> طلبات التوصيل النشطة
              </h1>
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-col shadow-inner">
              <span className="text-2xl font-black">{orders.length}</span>
              <span className="text-[10px] font-bold">طلب</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="card h-40 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 animate-slide-up">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck size={40} className="text-rose-200" />
            </div>
            <p className="font-bold text-lg text-gray-800">لا توجد طلبات حالياً</p>
            <p className="text-sm mt-1">انتظر حتى يجهز الصناع طلبياتهم</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {orders.map(order => (
              <div key={order.id} className="card overflow-hidden border-r-4 border-green-500 shadow-md">
                <div className="p-5 space-y-4">
                  {/* Status & ID */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'delivering' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {order.status === 'delivering' ? '🚚 قيد التوصيل' : '🏠 جاهز للاستلام'}
                    </span>
                    <p className="text-xs text-gray-300 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  {/* Parties & Contact */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Maker Side */}
                    <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <ChefHat size={14} className="text-amber-500" />
                        <span className="text-xs font-bold text-gray-500">صانع الحلوى</span>
                      </div>
                      <p className="font-bold text-gray-800 text-sm truncate">{(order as any).maker?.full_name}</p>
                      <Link 
                        href={`/messages?maker=${(order as any).maker?.id}`}
                        className="flex items-center gap-1 text-[10px] text-rose-500 font-bold mt-2 hover:underline"
                      >
                        <MessageCircle size={12} /> مراسلة الصانع
                      </Link>
                    </div>

                    {/* Customer Side */}
                    <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-gray-500">الزبون</span>
                      </div>
                      <p className="font-bold text-gray-800 text-sm truncate">{(order as any).customer?.full_name}</p>
                      <Link 
                        href={`/messages?maker=${(order as any).customer?.id}`}
                        className="flex items-center gap-1 text-[10px] text-blue-500 font-bold mt-2 hover:underline"
                      >
                        <MessageCircle size={12} /> مراسلة الزبون
                      </Link>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <MapPin size={20} className="text-rose-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-bold mb-1">عنوان التوصيل:</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{order.delivery_address}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'delivering')}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                      >
                        <Truck size={20} /> استلام الطلب من الصانع
                      </button>
                    )}
                    {order.status === 'delivering' && (
                      <button
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="w-full bg-green-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-600 shadow-lg shadow-green-100 transition-all active:scale-95"
                      >
                        <CheckCircle size={20} /> تم تسليم الطلب للزبون
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
