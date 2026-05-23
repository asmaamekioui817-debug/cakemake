'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sweet, Order, Workshop, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import {
  Plus, Package, Calendar, TrendingUp, Trash2, Edit2, X,
  Video, Clock, Users, GraduationCap, ExternalLink, Eye, EyeOff,
  Link as LinkIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

const WORKSHOP_CATEGORIES = ['كعك', ' حلوى ', 'شوكولاتة', 'تزيين الكيك', 'أخرى']

const defaultWorkshopForm = {
  title: '',
  description: '',
  zoom_link: '',
  scheduled_at: '',
  duration_minutes: 60,
  price: 0,
  max_participants: 20,
  category: 'كعك',
  thumbnail_url: '',
  is_active: true,
}

export default function MakerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [makerId, setMakerId] = useState('')

  // Sweet form
  const [showSweetForm, setShowSweetForm] = useState(false)
  const [editingSweet, setEditingSweet] = useState<Sweet | null>(null)
  const [sweetForm, setSweetForm] = useState({
    name: '', description: '', price_per_unit: 0, stock_count: 100,
    category: 'حلويات تقليدية', image_url: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // Workshop form
  const [showWorkshopForm, setShowWorkshopForm] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null)
  const [workshopForm, setWorkshopForm] = useState(defaultWorkshopForm)
  const [savingWorkshop, setSavingWorkshop] = useState(false)

  const loadData = async (userId: string) => {
    const [p, sweetsRes, ordersRes, workshopsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('sweets').select('*').eq('maker_id', userId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, order_items(*), customer:profiles!customer_id(full_name, phone)').eq('maker_id', userId).order('created_at', { ascending: false }),
      supabase.from('workshops').select('*, workshop_registrations(count)').eq('maker_id', userId).order('scheduled_at', { ascending: false }),
    ])
    setProfile(p.data)
    setSweets(sweetsRes.data || [])
    setOrders(ordersRes.data || [])
    setWorkshops(workshopsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let user_id = ''
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      user_id = user.id
      setMakerId(user.id)
      await loadData(user.id)
    }
    init()
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (user_id) loadData(user_id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Sweet handlers ────────────────────────────────────────────
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
    if (!sweetForm.name || !sweetForm.price_per_unit) { toast.error('يرجى ملء الاسم والسعر'); return }
    if (editingSweet) {
      const { data, error } = await supabase.from('sweets').update(sweetForm).eq('id', editingSweet.id).select().single()
      if (error) toast.error(`خطأ: ${error.message}`)
      else { setSweets(sweets.map(s => s.id === editingSweet.id ? data : s)); setEditingSweet(null); setShowSweetForm(false); toast.success('تم التعديل') }
    } else {
      const { data, error } = await supabase.from('sweets').insert({ ...sweetForm, maker_id: makerId }).select().single()
      if (error) toast.error('خطأ في الإضافة')
      else { setSweets([data, ...sweets]); setShowSweetForm(false); toast.success('تمت الإضافة') }
    }
    setSweetForm({ name: '', description: '', price_per_unit: 0, stock_count: 100, category: 'حلويات تقليدية', image_url: '' })
  }

  const startEditSweet = (sweet: Sweet) => {
    setEditingSweet(sweet)
    setSweetForm({ name: sweet.name, description: sweet.description || '', price_per_unit: sweet.price_per_unit, stock_count: sweet.stock_count || 0, category: sweet.category || 'حلويات تقليدية', image_url: sweet.image_url || '' })
    setShowSweetForm(true)
  }

  const deleteSweet = async (id: string) => {
    if (!confirm('هل أنت متأكد؟')) return
    const { error } = await supabase.from('sweets').delete().eq('id', id)
    if (error) toast.error('خطأ في الحذف')
    else { setSweets(sweets.filter(s => s.id !== id)); toast.success('تم الحذف') }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) toast.error('خطأ في التحديث')
    else { setOrders(orders.map(o => o.id === orderId ? { ...o, status: status as any } : o)); toast.success('تم التحديث') }
  }

  // ── Workshop handlers ─────────────────────────────────────────
  const openWorkshopForm = (workshop?: Workshop) => {
    if (workshop) {
      setEditingWorkshop(workshop)
      const localDate = new Date(workshop.scheduled_at)
      const tzOffset = localDate.getTimezoneOffset() * 60000
      const localIso = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16)
      setWorkshopForm({
        title: workshop.title,
        description: workshop.description || '',
        zoom_link: workshop.zoom_link,
        scheduled_at: localIso,
        duration_minutes: workshop.duration_minutes,
        price: workshop.price,
        max_participants: workshop.max_participants,
        category: workshop.category,
        thumbnail_url: workshop.thumbnail_url || '',
        is_active: workshop.is_active,
      })
    } else {
      setEditingWorkshop(null)
      setWorkshopForm(defaultWorkshopForm)
    }
    setShowWorkshopForm(true)
  }

  const handleSaveWorkshop = async () => {
    if (!workshopForm.title.trim()) { toast.error('يرجى إدخال عنوان الورشة'); return }
    if (!workshopForm.zoom_link.trim()) { toast.error('يرجى إدخال رابط Zoom'); return }
    if (!workshopForm.scheduled_at) { toast.error('يرجى تحديد تاريخ ووقت الورشة'); return }
    if (!workshopForm.zoom_link.includes('zoom')) { toast.error('يرجى إدخال رابط Zoom صحيح'); return }

    setSavingWorkshop(true)
    const payload = {
      ...workshopForm,
      maker_id: makerId,
      scheduled_at: new Date(workshopForm.scheduled_at).toISOString(),
    }

    if (editingWorkshop) {
      const { data, error } = await supabase.from('workshops').update(payload).eq('id', editingWorkshop.id).select().single()
      if (error) toast.error(`خطأ: ${error.message}`)
      else { setWorkshops(workshops.map(w => w.id === editingWorkshop.id ? data : w)); toast.success('تم تعديل الورشة'); setShowWorkshopForm(false) }
    } else {
      const { data, error } = await supabase.from('workshops').insert(payload).select().single()
      if (error) toast.error(`خطأ: ${error.message}`)
      else { setWorkshops([data, ...workshops]); toast.success('تمت إضافة الورشة! 🎓'); setShowWorkshopForm(false) }
    }
    setSavingWorkshop(false)
  }

  const deleteWorkshop = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الورشة؟')) return
    const { error } = await supabase.from('workshops').delete().eq('id', id)
    if (error) toast.error('خطأ في الحذف')
    else { setWorkshops(workshops.filter(w => w.id !== id)); toast.success('تم حذف الورشة') }
  }

  const toggleWorkshopActive = async (workshop: Workshop) => {
    const { error } = await supabase.from('workshops').update({ is_active: !workshop.is_active }).eq('id', workshop.id)
    if (!error) setWorkshops(workshops.map(w => w.id === workshop.id ? { ...w, is_active: !w.is_active } : w))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50">
      <div className="animate-spin text-4xl text-rose-500">🧁</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Stats */}
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
          <div className="bg-gradient-to-br from-indigo-400 to-indigo-500 p-6 rounded-3xl text-white shadow-lg">
            <GraduationCap size={24} className="mb-4 opacity-80" />
            <p className="text-3xl font-black">{workshops.filter(w => w.is_active).length}</p>
            <p className="text-xs opacity-80">ورشة نشطة</p>
          </div>
          <div className="bg-gradient-to-br from-green-400 to-green-500 p-6 rounded-3xl text-white shadow-lg">
            <Users size={24} className="mb-4 opacity-80" />
            <p className="text-3xl font-black">
              {workshops.reduce((acc, w) => acc + ((w as any).workshop_registrations?.[0]?.count || 0), 0)}
            </p>
            <p className="text-xs opacity-80">مشترك في الورشات</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Orders */}
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
                        <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
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

          {/* Sweets */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0">🍰 منتجاتي</h2>
              <button
                onClick={() => { setEditingSweet(null); setSweetForm({ name: '', description: '', price_per_unit: 0, stock_count: 100, category: 'حلويات تقليدية', image_url: '' }); setShowSweetForm(true) }}
                className="btn-primary p-2 rounded-xl"
              >
                <Plus size={20} />
              </button>
            </div>

            {showSweetForm && (
              <div className="card p-5 animate-slide-up border-2 border-rose-400">
                <div className="flex justify-between mb-4">
                  <h3 className="font-bold text-rose-700">{editingSweet ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                  <button onClick={() => setShowSweetForm(false)} className="text-gray-400"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="الاسم" value={sweetForm.name} onChange={e => setSweetForm({ ...sweetForm, name: e.target.value })} className="input-field" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="السعر" value={sweetForm.price_per_unit || ''} onChange={e => setSweetForm({ ...sweetForm, price_per_unit: Number(e.target.value) })} className="input-field" />
                    <input type="number" placeholder="المخزون" value={sweetForm.stock_count || ''} onChange={e => setSweetForm({ ...sweetForm, stock_count: Number(e.target.value) })} className="input-field" />
                  </div>
                  <textarea placeholder="الوصف" value={sweetForm.description} onChange={e => setSweetForm({ ...sweetForm, description: e.target.value })} className="input-field" rows={2} />
                  <button onClick={handleSaveSweet} className="btn-primary w-full py-3">{editingSweet ? 'تحديث' : 'حفظ'}</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {sweets.map(sweet => (
                <div key={sweet.id} className="card p-3 flex gap-3 group">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 overflow-hidden flex-shrink-0">
                    {sweet.image_url
                      ? <img src={sweet.image_url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center opacity-30 text-2xl">🍰</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate text-sm">{sweet.name}</h4>
                    <p className="text-rose-500 font-bold text-xs">{sweet.price_per_unit} د.ج</p>
                    <p className="text-[10px] text-gray-400">المخزون: {sweet.stock_count} حبة</p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditSweet(sweet)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => deleteSweet(sweet.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Workshops Section ────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title mb-0">🎓 ورشاتي ودوراتي</h2>
              <p className="text-sm text-gray-400 mt-0.5">أضف ورشات تعليمية عبر Zoom للزبائن</p>
            </div>
            <button
              onClick={() => openWorkshopForm()}
              className="btn-primary flex items-center gap-2 py-2.5"
            >
              <Plus size={18} />
              ورشة جديدة
            </button>
          </div>

          {/* Workshop Form */}
          {showWorkshopForm && (
            <div className="card p-6 animate-slide-up border-2 border-indigo-300">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-indigo-700 flex items-center gap-2">
                  <GraduationCap size={20} />
                  {editingWorkshop ? 'تعديل الورشة' : 'إضافة ورشة جديدة'}
                </h3>
                <button onClick={() => setShowWorkshopForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">عنوان الورشة *</label>
                  <input
                    type="text"
                    placeholder="مثال: دورة صنع الكعك الجزائري"
                    value={workshopForm.title}
                    onChange={e => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
                  <textarea
                    placeholder="صف محتوى الدورة..."
                    value={workshopForm.description}
                    onChange={e => setWorkshopForm({ ...workshopForm, description: e.target.value })}
                    className="input-field"
                    rows={3}
                  />
                </div>

                {/* Zoom Link */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">رابط Zoom *</label>
                  <div className="relative">
                    <Video size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                    <input
                      type="url"
                      placeholder="https://zoom.us/j/..."
                      value={workshopForm.zoom_link}
                      onChange={e => setWorkshopForm({ ...workshopForm, zoom_link: e.target.value })}
                      className="input-field pr-11"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">⚠️ الرابط لن يُعرض إلا للمشتركين المسجلين فقط</p>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">التاريخ والوقت *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400" />
                    <input
                      type="datetime-local"
                      value={workshopForm.scheduled_at}
                      onChange={e => setWorkshopForm({ ...workshopForm, scheduled_at: e.target.value })}
                      className="input-field pr-11"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">المدة (دقيقة)</label>
                  <div className="relative">
                    <Clock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400" />
                    <input
                      type="number"
                      placeholder="60"
                      min={15}
                      value={workshopForm.duration_minutes || ''}
                      onChange={e => setWorkshopForm({ ...workshopForm, duration_minutes: Number(e.target.value) })}
                      className="input-field pr-11"
                    />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">السعر (0 = مجاني)</label>
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={workshopForm.price || ''}
                    onChange={e => setWorkshopForm({ ...workshopForm, price: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>

                {/* Max Participants */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">عدد المشاركين</label>
                  <div className="relative">
                    <Users size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />
                    <input
                      type="number"
                      placeholder="20"
                      min={1}
                      value={workshopForm.max_participants || ''}
                      onChange={e => setWorkshopForm({ ...workshopForm, max_participants: Number(e.target.value) })}
                      className="input-field pr-11"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">التصنيف</label>
                  <select
                    value={workshopForm.category}
                    onChange={e => setWorkshopForm({ ...workshopForm, category: e.target.value })}
                    className="input-field"
                  >
                    {WORKSHOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Thumbnail */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">رابط صورة الغلاف (اختياري)</label>
                  <div className="relative">
                    <LinkIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={workshopForm.thumbnail_url}
                      onChange={e => setWorkshopForm({ ...workshopForm, thumbnail_url: e.target.value })}
                      className="input-field pr-11"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Is Active */}
                <div className="md:col-span-2 flex items-center gap-3 bg-indigo-50 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={workshopForm.is_active}
                    onChange={e => setWorkshopForm({ ...workshopForm, is_active: e.target.checked })}
                    className="w-5 h-5 accent-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    نشر الورشة وجعلها مرئية للزبائن
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSaveWorkshop}
                  disabled={savingWorkshop}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {savingWorkshop ? 'جارٍ الحفظ...' : editingWorkshop ? 'تحديث الورشة' : 'نشر الورشة 🎓'}
                </button>
                <button onClick={() => setShowWorkshopForm(false)} className="btn-outline px-6">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Workshops List */}
          {workshops.length === 0 && !showWorkshopForm ? (
            <div className="card p-12 text-center text-gray-400 animate-fade-in">
              <div className="text-5xl mb-3">🎓</div>
              <p className="font-bold text-lg text-gray-500">لا توجد ورشات بعد</p>
              <p className="text-sm mt-1">أضف أول ورشة تعليمية وشارك خبرتك!</p>
              <button onClick={() => openWorkshopForm()} className="btn-primary mt-4 mx-auto">
                إضافة ورشة
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {workshops.map(workshop => {
                const regCount = (workshop as any).workshop_registrations?.[0]?.count || 0
                const isPast = new Date(workshop.scheduled_at) < new Date()
                return (
                  <div
                    key={workshop.id}
                    className={`card p-5 border-r-4 transition-all ${!workshop.is_active ? 'opacity-60 border-gray-300' : isPast ? 'border-amber-400' : 'border-indigo-400'
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-800 truncate">{workshop.title}</h3>
                          <span className={`badge text-[10px] flex-shrink-0 ${!workshop.is_active ? 'bg-gray-100 text-gray-500' :
                              isPast ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                            }`}>
                            {!workshop.is_active ? 'مخفية' : isPast ? 'انتهت' : 'نشطة'}
                          </span>
                          <span className={`badge text-[10px] flex-shrink-0 ${workshop.price === 0 ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                            {workshop.price === 0 ? 'مجاني' : `${workshop.price} د.ج`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{workshop.category}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleWorkshopActive(workshop)}
                          className={`p-1.5 rounded-lg transition-colors ${workshop.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                          title={workshop.is_active ? 'إخفاء الورشة' : 'نشر الورشة'}
                        >
                          {workshop.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button onClick={() => openWorkshopForm(workshop)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteWorkshop(workshop.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {workshop.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{workshop.description}</p>
                    )}

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-rose-400 flex-shrink-0" />
                        {new Date(workshop.scheduled_at).toLocaleDateString('ar-DZ', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={12} className="text-amber-400 flex-shrink-0" />
                        {new Date(workshop.scheduled_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                        &nbsp;• {workshop.duration_minutes} د
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Users size={12} className="text-green-400 flex-shrink-0" />
                        {regCount} / {workshop.max_participants} مشارك
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-l from-indigo-400 to-rose-400 rounded-full transition-all"
                        style={{ width: `${Math.min((regCount / workshop.max_participants) * 100, 100)}%` }}
                      />
                    </div>

                    {/* Zoom Link */}
                    <a
                      href={workshop.zoom_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-indigo-50 rounded-xl px-3 py-2 hover:bg-indigo-100 transition-colors w-fit"
                    >
                      <Video size={13} />
                      فتح رابط Zoom
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
