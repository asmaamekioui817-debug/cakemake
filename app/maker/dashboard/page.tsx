'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sweet, Order, Workshop, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import { Plus, Package, Calendar, TrendingUp, ChefHat, Trash2, Edit2, MessageSquare, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function MakerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [makerId, setMakerId] = useState('')

  const [showSweetForm, setShowSweetForm] = useState(false)
  const [editingSweet, setEditingSweet] = useState<Sweet | null>(null)
  const [sweetForm, setSweetForm] = useState({
    name: '',
    description: '',
    price_per_unit: 0,
    stock_count: 100,
    category: 'حلويات تقليدية',
    image_url: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  const loadData = async (userId: string) => {
    const [p, sweetsRes, ordersRes, workshopsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('sweets').select('*').eq('maker_id', userId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*), customer:profiles!customer_id(full_name, phone)').eq('maker_id', userId).order('created_at', { ascending: false }),
      supabase.from('workshops').select('*, workshop_registrations(count)').eq('maker_id', userId).order('created_at', { ascending: false }),
    ])

    setProfile(p.data)
    setSweets(sweetsRes.data || [])
    setOrders(ordersRes.data || [])
    setWorkshops(workshopsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let user_id = '';
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      user_id = user.id
      setMakerId(user.id)
      await loadData(user.id)
    }
    init()

    // Simple Realtime Subscription
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (user_id) loadData(user_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const uploadImage = async (file: File) => {
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(fileName, file)
    if (error) { toast.error('خطأ في الرفع'); setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
    setSweetForm(f => ({ ...f, image_url: publicUrl }))
    setUploadingImage(false)
    toast.success('تم الرفع!')
  }

  const handleSaveSweet = async () => {
    if (!sweetForm.name || !sweetForm.price_per_unit) {
      toast.error('يرجى ملء الاسم والسعر')
      return
    }
    
    if (editingSweet) {
      const { data, error } = await supabase.from('sweets').update(sweetForm).eq('id', editingSweet.id).select().single()
      if (error) {
        toast.error(`خطأ: ${error.message}`)
      } else {
        setSweets(sweets.map(s => s.id === editingSweet.id ? data : s))
        setEditingSweet(null)
        setShowSweetForm(false)
        toast.success('تم التعديل بنجاح')
      }
    } else {
      const { data, error } = await supabase.from('sweets').insert({ ...sweetForm, maker_id: makerId }).select().single()
      if (error) toast.error('خطأ في الإضافة')
      else {
        setSweets([data, ...sweets])
        setShowSweetForm(false)
        toast.success('تمت الإضافة بنجاح')
      }
    }
    setSweetForm({ name: '', description: '', price_per_unit: 0, stock_count: 100, category: 'حلويات تقليدية', image_url: '' })
  }

  const startEdit = (sweet: Sweet) => {
    setEditingSweet(sweet)
    setSweetForm({
      name: sweet.name,
      description: sweet.description || '',
      price_per_unit: sweet.price_per_unit,
      stock_count: sweet.stock_count || 0,
      category: sweet.category || 'حلويات تقليدية',
      image_url: sweet.image_url || ''
    })
    setShowSweetForm(true)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) toast.error('خطأ في التحديث')
    else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: status as any } : o))
      toast.success('تم تحديث الحالة')
    }
  }

  const deleteSweet = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return
    const { error } = await supabase.from('sweets').delete().eq('id', id)
    if (error) toast.error('خطأ في الحذف')
    else {
      setSweets(sweets.filter(s => s.id !== id))
      toast.success('تم الحذف')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-rose-50"><div className="animate-spin text-4xl text-rose-500">🧁</div></div>

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-3xl text-white shadow-lg">
            <Package size={24} className="mb-4 opacity-80" />
            <p className="text-3xl font-black">{sweets.length}</p>
            <p className="text-xs opacity-80">منتج معروض</p>
          </div>
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-3xl text-white shadow-lg">
            <TrendingUp size={24} className="mb-4 opacity-80" />
            <p className="text-3xl font-black">{orders.filter(o => o.status === 'pending').length}</p>
            <p className="text-xs opacity-80">طلب جديد</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="section-title">🛒 طلبات الزبائن</h2>
            {orders.length === 0 ? (
              <div className="card p-12 text-center text-gray-400">لا توجد طلبات حالياً</div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="card p-5 border-r-4 border-amber-400">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0,8).toUpperCase()}</p>
                        <p className="font-bold text-gray-800">{(order as any).customer?.full_name}</p>
                      </div>
                      <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)} className="input-field py-1 text-sm w-32">
                        <option value="pending">قيد الانتظار</option>
                        <option value="confirmed">تم التأكيد</option>
                        <option value="preparing">يتم التحضير</option>
                        <option value="ready">جاهز للتوصيل</option>
                        <option value="delivered">تم التسليم</option>
                      </select>
                    </div>
                    <div className="bg-rose-50/50 rounded-2xl p-4">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm mb-1">
                          <span>{item.sweet_name} × {item.quantity}</span>
                          <span className="font-bold">{item.unit_price * item.quantity} د.ج</span>
                        </div>
                      ))}
                      <div className="border-t border-rose-100 pt-2 mt-2 flex justify-between font-black text-rose-600">
                        <span>الإجمالي</span>
                        <span>{order.total_price} د.ج</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0">🍰 منتجاتي</h2>
              <button onClick={() => { setEditingSweet(null); setSweetForm({name:'',description:'',price_per_unit:0,stock_count:100,category:'حلويات تقليدية',image_url:''}); setShowSweetForm(true); }} className="btn-primary p-2 rounded-xl">
                <Plus size={20} />
              </button>
            </div>

            {showSweetForm && (
              <div className="card p-5 animate-slide-up border-2 border-rose-400">
                <div className="flex justify-between mb-4">
                  <h3 className="font-bold text-rose-700">{editingSweet ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                  <button onClick={() => setShowSweetForm(false)} className="text-gray-400"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" placeholder="الاسم" value={sweetForm.name} onChange={e => setSweetForm({...sweetForm, name:e.target.value})} className="input-field" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="السعر" value={sweetForm.price_per_unit || ''} onChange={e => setSweetForm({...sweetForm, price_per_unit:Number(e.target.value)})} className="input-field" />
                    <input type="number" placeholder="المخزون" value={sweetForm.stock_count || ''} onChange={e => setSweetForm({...sweetForm, stock_count:Number(e.target.value)})} className="input-field" />
                  </div>
                  <textarea placeholder="الوصف" value={sweetForm.description} onChange={e => setSweetForm({...sweetForm, description:e.target.value})} className="input-field" rows={2} />
                  <button onClick={handleSaveSweet} className="btn-primary w-full py-3">{editingSweet ? 'تحديث' : 'حفظ'}</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {sweets.map(sweet => (
                <div key={sweet.id} className="card p-3 flex gap-3 group">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 overflow-hidden flex-shrink-0">
                    {sweet.image_url ? <img src={sweet.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-30 text-2xl">🍰</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate text-sm">{sweet.name}</h4>
                    <p className="text-rose-500 font-bold text-xs">{sweet.price_per_unit} د.ج</p>
                    <p className="text-[10px] text-gray-400">المخزون: {sweet.stock_count} حبة</p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(sweet)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => deleteSweet(sweet.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
