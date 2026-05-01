'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import Navbar from '@/components/Navbar'
import { Truck, MapPin, CheckCircle, Clock } from 'lucide-react'
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
        .select('*, order_items(*), profiles!customer_id(full_name, phone)')
        .in('status', ['ready', 'delivering'])
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    if (status === 'delivered') {
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o))
    }
    toast.success('تم تحديث حالة التوصيل')
  }

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        <div className="bg-gradient-to-l from-green-500 to-teal-400 rounded-3xl p-6 text-white animate-slide-up shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">لوحة التوصيل</p>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Truck size={24} /> سائق التوصيل</h1>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-green-100">طلب نشط</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="card p-5 animate-pulse"><div className="h-5 bg-green-100 rounded w-1/2 mb-3" /><div className="h-3 bg-green-50 rounded w-2/3" /></div>)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 animate-slide-up">
            <div className="text-5xl mb-3">🚗</div>
            <p className="font-bold text-lg">لا توجد طلبات للتوصيل</p>
            <p className="text-sm mt-1">انتظر وصول طلبات جاهزة للتسليم</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {orders.map(order => (
              <div key={order.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400">طلب #{order.id.slice(0,8).toUpperCase()}</p>
                    <p className="font-bold text-gray-800">{(order as any).profiles?.full_name}</p>
                  </div>
                  <span className={`badge ${order.status === 'delivering' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                    {order.status === 'delivering' ? '🚗 في الطريق' : '✅ جاهز للاستلام'}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.sweet_name} × {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {order.delivery_address && (
                  <div className="flex items-start gap-2 bg-rose-50 rounded-2xl p-3 mb-3">
                    <MapPin size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{order.delivery_address}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivering')}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                    >
                      <Truck size={16} /> استلمت الطلب
                    </button>
                  )}
                  {order.status === 'delivering' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2"
                    >
                      <CheckCircle size={16} /> تم التسليم
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
