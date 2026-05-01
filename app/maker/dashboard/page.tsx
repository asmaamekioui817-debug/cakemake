'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Sweet, Order, Workshop } from '@/types'
import Navbar from '@/components/Navbar'
import { Plus, ChefHat, Upload, X, Trash2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'sweets' | 'orders' | 'workshops'

const STATUS_LABELS: Record<string, string> = {
  pending: 'انتظار', confirmed: 'مؤكد', preparing: 'يُحضَّر',
  ready: 'جاهز', delivering: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغى'
}

export default function MakerDashboard() {
  const [tab, setTab] = useState<Tab>('sweets')
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [makerId, setMakerId] = useState('')
  const [showAddSweet, setShowAddSweet] = useState(false)
  const [showAddWorkshop, setShowAddWorkshop] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [sweetForm, setSweetForm] = useState({
    name: '', description: '', price_per_unit: '',
    shop_location: '', category: 'عام', stock_count: '10', image_url: '',
  })
  const [workshopForm, setWorkshopForm] = useState({
    title: '', description: '', zoom_link: '', scheduled_at: '',
    duration_minutes: '60', price: '0', max_participants: '20', category: 'عام',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMakerId(user.id)
      const [sweetsRes, ordersRes, workshopsRes] = await Promise.all([
        supabase.from('sweets').select('*').eq('maker_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*), customer:profiles!customer_id(full_name, phone)').eq('maker_id', user.id).order('created_at', { ascending: false }),
        supabase.from('workshops').select('*, workshop_registrations(count)').eq('maker_id', user.id).order('created_at', { ascending: false }),
      ])
      setSweets(sweetsRes.data || [])
      setOrders(ordersRes.data || [])
      setWorkshops(workshopsRes.data || [])
    }
    init()
  }, [])

  const uploadImage = async (file: File) => {
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(fileName, file)
    if (error) { toast.error('خطأ في رفع الصورة'); setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
    setSweetForm(f => ({ ...f, image_url: publicUrl }))
    setUploadingImage(false)
    toast.success('تم رفع الصورة!')
  }

  const addSweet = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('sweets').insert({
      maker_id: makerId, name: sweetForm.name, description: sweetForm.description,
      price_per_unit: Number(sweetForm.price_per_unit), shop_location: sweetForm.shop_location,
      category: sweetForm.category, stock_count: Number(sweetForm.stock_count),
      image_url: sweetForm.image_url || null, is_available: true,
    })
    if (error) { toast.error('خطأ في الإضافة'); return }
    toast.success('تمت إضافة الحلوى! 🍬')
    setShowAddSweet(false)
    setSweetForm({ name: '', description: '', price_per_unit: '', shop_location: '', category: 'عام', stock_count: '10', image_url: '' })
    const { data } = await supabase.from('sweets').select('*').eq('maker_id', makerId).order('created_at', { ascending: false })
    setSweets(data || [])
  }

  const deleteSweet = async (id: string) => {
    if (!confirm('حذف هذا المنتج؟')) return
    await supabase.from('sweets').delete().eq('id', id)
    setSweets(prev => prev.filter(s => s.id !== id))
    toast.success('تم الحذف')
  }

  const toggleAvail = async (sweet: Sweet) => {
    await supabase.from('sweets').update({ is_available: !sweet.is_available }).eq('id', sweet.id)
    setSweets(prev => prev.map(s => s.id === sweet.id ? { ...s, is_available: !s.is_available } : s))
  }

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o))
    toast.success('تم تحديث الحالة')
  }

  const addWorkshop = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('workshops').insert({
      maker_id: makerId, title: workshopForm.title, description: workshopForm.description,
      zoom_link: workshopForm.zoom_link, scheduled_at: workshopForm.scheduled_at,
      duration_minutes: Number(workshopForm.duration_minutes), price: Number(workshopForm.price),
      max_participants: Number(workshopForm.max_participants), category: workshopForm.category, is_active: true,
    })
    if (error) { toast.error('خطأ في إنشاء الورشة'); return }
    toast.success('تم إنشاء الورشة! 🎉')
    setShowAddWorkshop(false)
    const { data } = await supabase.from('workshops').select('*, workshop_registrations(count)').eq('maker_id', makerId)
    setWorkshops(data || [])
  }

  const tabs = [
    { id: 'sweets' as Tab, label: 'منتجاتي', icon: '🍬', count: sweets.length },
    { id: 'orders' as Tab, label: 'الطلبات', icon: '📦', count: orders.filter(o => o.status === 'pending').length },
    { id: 'workshops' as Tab, label: 'الورشات', icon: '👩‍🍳', count: workshops.length },
  ]

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="bg-gradient-to-l from-amber-500 to-rose-500 rounded-3xl p-6 text-white animate-slide-up shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm">لوحة التحكم</p>
              <h1 className="text-2xl font-bold flex items-center gap-2"><ChefHat size={24} /> صانع الحلوى</h1>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/20 rounded-2xl px-3 py-2 text-center">
                <p className="text-lg font-bold">{sweets.length}</p>
                <p className="text-xs text-amber-100">منتج</p>
              </div>
              <div className="bg-white/20 rounded-2xl px-3 py-2 text-center">
                <p className="text-lg font-bold">{orders.filter(o => o.status === 'pending').length}</p>
                <p className="text-xs text-amber-100">طلب جديد</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 px-2 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                tab === t.id ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-gray-600 border border-rose-100'
              }`}>
              {t.icon} {t.label}
              {t.count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.id ? 'bg-white/30' : 'bg-rose-100 text-rose-600'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── SWEETS TAB ── */}
        {tab === 'sweets' && (
          <div className="space-y-4 animate-slide-up">
            <button onClick={() => setShowAddSweet(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={18} /> إضافة حلوى جديدة
            </button>

            {showAddSweet && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg">إضافة حلوى</h2>
                    <button onClick={() => setShowAddSweet(false)} className="p-2 hover:bg-rose-50 rounded-xl"><X size={20} /></button>
                  </div>
                  <form onSubmit={addSweet} className="space-y-3">
                    <div onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-rose-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-rose-50 transition-colors">
                      {sweetForm.image_url
                        ? <img src={sweetForm.image_url} alt="preview" className="h-32 mx-auto object-contain rounded-xl" />
                        : <div><Upload size={32} className="mx-auto text-rose-300 mb-2" /><p className="text-sm text-gray-500">{uploadingImage ? 'جارٍ الرفع...' : 'انقر لرفع صورة الحلوى'}</p></div>
                      }
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    <input type="text" value={sweetForm.name} onChange={e => setSweetForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الحلوى *" required className="input-field" />
                    <textarea value={sweetForm.description} onChange={e => setSweetForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف الحلوى" rows={2} className="input-field resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" value={sweetForm.price_per_unit} onChange={e => setSweetForm(f => ({ ...f, price_per_unit: e.target.value }))} placeholder="سعر الحبة (د.ج) *" required min="1" className="input-field" />
                      <input type="number" value={sweetForm.stock_count} onChange={e => setSweetForm(f => ({ ...f, stock_count: e.target.value }))} placeholder="الكمية" className="input-field" />
                    </div>
                    <div className="relative">
                      <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
                      <input type="text" value={sweetForm.shop_location} onChange={e => setSweetForm(f => ({ ...f, shop_location: e.target.value }))} placeholder="موقع المحل *" required className="input-field pr-10" />
                    </div>
                    <select value={sweetForm.category} onChange={e => setSweetForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                      {['عام','كعك','بسكويت','شوكولاتة','مقروط','حلوى تقليدية','أخرى'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowAddSweet(false)} className="btn-outline flex-1">إلغاء</button>
                      <button type="submit" className="btn-primary flex-1">إضافة</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {sweets.length === 0
              ? <div className="card p-10 text-center text-gray-400"><div className="text-5xl mb-3">🍬</div><p className="font-semibold">لا توجد منتجات بعد</p></div>
              : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sweets.map(sweet => (
                    <div key={sweet.id} className="card">
                      <div className="h-32 bg-gradient-to-br from-rose-100 to-amber-100 relative overflow-hidden">
                        {sweet.image_url ? <img src={sweet.image_url} alt={sweet.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-3xl">🍰</div>}
                        <button onClick={() => toggleAvail(sweet)}
                          className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-xl font-bold ${sweet.is_available ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                          {sweet.is_available ? 'متوفر' : 'مخفي'}
                        </button>
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-gray-800 truncate">{sweet.name}</h3>
                        <p className="font-bold text-rose-600 text-sm mt-1">{sweet.price_per_unit} د.ج</p>
                        <button onClick={() => deleteSweet(sweet.id)} className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-red-400 hover:bg-red-50 rounded-xl py-1 transition-colors">
                          <Trash2 size={12} /> حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <div className="space-y-3 animate-slide-up">
            {orders.length === 0
              ? <div className="card p-10 text-center text-gray-400"><div className="text-5xl mb-3">📦</div><p className="font-semibold">لا توجد طلبات</p></div>
              : orders.map(order => (
                  <div key={order.id} className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400">#{order.id.slice(0,8).toUpperCase()}</p>
                        <p className="font-bold text-gray-800">{(order as any).customer?.full_name}</p>
                      </div>
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        className="text-sm border border-rose-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300">
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm text-gray-600">
                        <span>{item.sweet_name} × {item.quantity}</span>
                        <span>{(item.subtotal ?? item.quantity * item.unit_price).toFixed(0)} د.ج</span>
                      </div>
                    ))}
                    <div className="border-t border-rose-100 pt-2 mt-2 flex justify-between">
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('ar-DZ')}</p>
                      <p className="font-bold text-rose-600">{order.total_price} د.ج</p>
                    </div>
                    {order.delivery_address && <p className="text-xs text-gray-500 mt-2 bg-rose-50 rounded-xl px-3 py-2">📍 {order.delivery_address}</p>}
                  </div>
                ))
            }
          </div>
        )}

        {/* ── WORKSHOPS TAB ── */}
        {tab === 'workshops' && (
          <div className="space-y-4 animate-slide-up">
            <button onClick={() => setShowAddWorkshop(true)} className="btn-secondary w-full flex items-center justify-center gap-2">
              <Plus size={18} /> إنشاء ورشة جديدة
            </button>

            {showAddWorkshop && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg">إنشاء ورشة تدريبية</h2>
                    <button onClick={() => setShowAddWorkshop(false)} className="p-2 hover:bg-amber-50 rounded-xl"><X size={20} /></button>
                  </div>
                  <form onSubmit={addWorkshop} className="space-y-3">
                    <input type="text" value={workshopForm.title} onChange={e => setWorkshopForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان الورشة *" required className="input-field" />
                    <textarea value={workshopForm.description} onChange={e => setWorkshopForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف الورشة" rows={2} className="input-field resize-none" />
                    <input type="url" value={workshopForm.zoom_link} onChange={e => setWorkshopForm(f => ({ ...f, zoom_link: e.target.value }))} placeholder="رابط Zoom *" required className="input-field" />
                    <input type="datetime-local" value={workshopForm.scheduled_at} onChange={e => setWorkshopForm(f => ({ ...f, scheduled_at: e.target.value }))} required className="input-field" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" value={workshopForm.duration_minutes} onChange={e => setWorkshopForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="المدة (دقيقة)" className="input-field" />
                      <input type="number" value={workshopForm.price} onChange={e => setWorkshopForm(f => ({ ...f, price: e.target.value }))} placeholder="السعر" min="0" className="input-field" />
                      <input type="number" value={workshopForm.max_participants} onChange={e => setWorkshopForm(f => ({ ...f, max_participants: e.target.value }))} placeholder="المشاركون" className="input-field" />
                    </div>
                    <select value={workshopForm.category} onChange={e => setWorkshopForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                      {['عام','كعك','حلوى مغربية','شوكولاتة','تزيين الكيك','أخرى'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowAddWorkshop(false)} className="btn-outline flex-1">إلغاء</button>
                      <button type="submit" className="btn-secondary flex-1">إنشاء</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {workshops.length === 0
              ? <div className="card p-10 text-center text-gray-400"><div className="text-5xl mb-3">👩‍🍳</div><p className="font-semibold">لا توجد ورشات بعد</p></div>
              : <div className="space-y-3">
                  {workshops.map(w => (
                    <div key={w.id} className="card p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">{w.title}</h3>
                        <span className={`badge ${w.price === 0 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700'}`}>
                          {w.price === 0 ? 'مجاني' : `${w.price} د.ج`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(w.scheduled_at).toLocaleDateString('ar-DZ', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {(w as any).workshop_registrations?.[0]?.count || 0} / {w.max_participants} مشارك
                        </p>
                        <a href={w.zoom_link} target="_blank" rel="noopener noreferrer" className="text-indigo-500 text-sm font-semibold hover:underline">
                          رابط Zoom ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  )
}
