'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CartItem } from '@/types'
import Navbar from '@/components/Navbar'
import { Trash2, Plus, Minus, ShoppingBag, MapPin, Truck } from 'lucide-react'
import toast from 'react-hot-toast'

const DELIVERY_FEE = 300

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('halwa-cart')
    if (saved) setCart(JSON.parse(saved))
  }, [])

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('halwa-cart', JSON.stringify(newCart))
  }

  const updateQty = (sweetId: string, delta: number) => {
    const newCart = cart.map(c => {
      if (c.sweet.id === sweetId) {
        const newQty = c.quantity + delta
        return newQty <= 0 ? null : { ...c, quantity: newQty }
      }
      return c
    }).filter(Boolean) as CartItem[]
    saveCart(newCart)
  }

  const removeItem = (sweetId: string) => {
    saveCart(cart.filter(c => c.sweet.id !== sweetId))
    toast('تمت الإزالة', { icon: '🗑️' })
  }

  const subtotal = cart.reduce((s, c) => s + c.sweet.price_per_unit * c.quantity, 0)
  const total = subtotal + DELIVERY_FEE
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0)

  const handleOrder = async () => {
    if (!address.trim()) {
      toast.error('يرجى إدخال عنوان التوصيل')
      return
    }
    if (cart.length === 0) {
      toast.error('السلة فارغة')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get maker_id from first item
    const makerId = cart[0].sweet.maker_id

    const { data: order, error } = await supabase.from('orders').insert({
      customer_id: user.id,
      maker_id: makerId,
      total_price: total,
      delivery_address: address,
      delivery_fee: DELIVERY_FEE,
      notes,
      status: 'pending',
    }).select().single()

    if (error || !order) {
      toast.error('حدث خطأ في الطلب')
      setLoading(false)
      return
    }

    // Insert order items and update stock
    const items = cart.map(c => ({
      order_id: order.id,
      sweet_id: c.sweet.id,
      sweet_name: c.sweet.name,
      quantity: c.quantity,
      unit_price: c.sweet.price_per_unit,
    }))

    await supabase.from('order_items').insert(items)

    // Update stock for each item
    for (const item of cart) {
      const currentStock = item.sweet.stock_count || 0
      const newStock = Math.max(0, currentStock - item.quantity)
      await supabase.from('sweets').update({ stock_count: newStock }).eq('id', item.sweet.id)
    }

    // Clear cart and finish
    saveCart([])
    toast.success('تم إرسال طلبك بنجاح! 🎉')
    router.push('/orders')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar cartCount={totalItems} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <h1 className="page-header">🛒 سلة المشتريات</h1>

        {cart.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 animate-slide-up">
            <div className="text-6xl mb-4">🛒</div>
            <p className="font-bold text-lg">السلة فارغة</p>
            <p className="text-sm mt-1 mb-4">أضف حلويات لتبدأ طلبك</p>
            <Link href="/sweets" className="btn-primary inline-flex items-center gap-2">
              <ShoppingBag size={18} />
              تصفح الحلويات
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 animate-slide-up">
              {cart.map((item) => (
                <div key={item.sweet.id} className="card p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-amber-100 rounded-2xl overflow-hidden flex-shrink-0">
                    {item.sweet.image_url ? (
                      <img src={item.sweet.image_url} alt={item.sweet.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-2xl">🍰</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{item.sweet.name}</h3>
                    <p className="text-rose-500 font-semibold text-sm">{item.sweet.price_per_unit} د.ج / حبة</p>
                    <p className="text-gray-700 font-bold mt-1">
                      {(item.sweet.price_per_unit * item.quantity).toFixed(0)} د.ج
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.sweet.id, -1)}
                      className="w-8 h-8 bg-rose-50 text-rose-500 border border-rose-200 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-800 w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.sweet.id, 1)}
                      className="w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.sweet.id)}
                      className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors mr-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Details */}
            <div className="card p-5 animate-slide-up space-y-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Truck size={18} className="text-rose-400" />
                تفاصيل التوصيل
              </h2>
              <div className="relative">
                <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
                <input
                  id="delivery-address"
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="عنوان التوصيل *"
                  className="input-field pr-11"
                />
              </div>
              <textarea
                id="order-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ملاحظات للصانع (اختياري)"
                rows={2}
                className="input-field resize-none"
              />
            </div>

            {/* Order Summary */}
            <div className="card p-5 animate-slide-up">
              <h2 className="font-bold text-gray-800 mb-3">ملخص الطلب</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي ({totalItems} حبة)</span>
                  <span>{subtotal.toFixed(0)} د.ج</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>رسوم التوصيل</span>
                  <span>{DELIVERY_FEE} د.ج</span>
                </div>
                <div className="border-t border-rose-100 pt-2 flex justify-between font-bold text-lg text-gray-800">
                  <span>الإجمالي</span>
                  <span className="text-rose-600">{total.toFixed(0)} د.ج</span>
                </div>
              </div>

              <button
                id="place-order-btn"
                onClick={handleOrder}
                disabled={loading}
                className="btn-primary w-full mt-4 disabled:opacity-60"
              >
                {loading ? 'جارٍ الإرسال...' : '🛍️ تأكيد الطلب'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
