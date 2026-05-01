'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import Navbar from '@/components/Navbar'
import { Package, Clock, CheckCircle, Truck, XCircle, MapPin } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-50 text-amber-600', icon: Clock },
  confirmed: { label: 'تم التأكيد', color: 'bg-blue-50 text-blue-600', icon: CheckCircle },
  preparing: { label: 'يتم التحضير', color: 'bg-orange-50 text-orange-600', icon: Clock },
  ready: { label: 'جاهز للتوصيل', color: 'bg-indigo-50 text-indigo-600', icon: Package },
  delivering: { label: 'في الطريق', color: 'bg-purple-50 text-purple-600', icon: Truck },
  delivered: { label: 'تم التسليم', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  cancelled: { label: 'ملغى', color: 'bg-red-50 text-red-600', icon: XCircle },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), maker:profiles!maker_id(full_name, city)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
      
      setOrders(data || [])
      setLoading(false)
    }
    fetchOrders()
  }, [])

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="page-header">📦 سجل طلباتي</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="card h-32 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold text-lg">لا توجد طلبات سابقة</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] || STATUS_MAP.pending
              const StatusIcon = status.icon

              return (
                <div key={order.id} className="card overflow-hidden">
                  <div className="bg-white p-5 border-b border-rose-50 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="font-bold text-gray-800">صانع الحلوى: {(order as any).maker?.full_name}</p>
                    </div>
                    <div className={`badge ${status.color} px-4 py-2`}>
                      <StatusIcon size={14} className="ml-1" />
                      {status.label}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="space-y-2">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.sweet_name} × {item.quantity}</span>
                          <span className="font-semibold text-gray-800">{item.unit_price * item.quantity} د.ج</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-rose-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MapPin size={12} />
                        {order.delivery_address}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">الإجمالي</p>
                        <p className="text-xl font-black text-rose-600">{order.total_price} د.ج</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50/30 p-3 text-center text-[10px] text-gray-400">
                    تم الطلب في {new Date(order.created_at).toLocaleString('ar-DZ')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
