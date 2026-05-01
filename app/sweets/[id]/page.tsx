'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sweet, CartItem } from '@/types'
import Navbar from '@/components/Navbar'
import { MapPin, ChefHat, Package, Plus, Minus, ShoppingCart, ArrowRight, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SweetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [sweet, setSweet] = useState<Sweet | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('halwa-cart')
    if (saved) {
      const parsed: CartItem[] = JSON.parse(saved)
      setCart(parsed)
      const existing = parsed.find(c => c.sweet.id === params.id)
      if (existing) setQuantity(existing.quantity)
    }

    const fetchSweet = async () => {
      const { data } = await supabase
        .from('sweets')
        .select('*, profiles(full_name, city, phone)')
        .eq('id', params.id)
        .single()
      setSweet(data)
      setLoading(false)
    }
    fetchSweet()
  }, [params.id])

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('halwa-cart', JSON.stringify(newCart))
  }

  const addToCart = () => {
    if (!sweet) return
    const existing = cart.find(c => c.sweet.id === sweet.id)
    if (existing) {
      saveCart(cart.map(c => c.sweet.id === sweet.id ? { ...c, quantity } : c))
    } else {
      saveCart([...cart, { sweet, quantity }])
    }
    toast.success('تمت الإضافة للسلة! 🛒')
    router.push('/cart')
  }

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0)
  const total = quantity * (sweet?.price_per_unit || 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50">
        <Navbar cartCount={totalItems} />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="card animate-pulse">
            <div className="h-64 bg-rose-100" />
            <div className="p-6 space-y-4">
              <div className="h-6 bg-rose-100 rounded w-2/3" />
              <div className="h-4 bg-rose-50 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!sweet) {
    return (
      <div className="min-h-screen bg-rose-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-gray-400 flex-col gap-3">
          <div className="text-5xl">😕</div>
          <p className="font-semibold">الحلوى غير موجودة</p>
          <Link href="/sweets" className="btn-primary text-sm">العودة للحلويات</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar cartCount={totalItems} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href="/sweets" className="flex items-center gap-2 text-rose-500 font-semibold mb-4 hover:gap-3 transition-all">
          <ArrowRight size={18} />
          العودة
        </Link>

        <div className="card animate-slide-up overflow-hidden">
          {/* Image */}
          <div className="h-64 bg-gradient-to-br from-rose-100 to-amber-100 relative">
            {sweet.image_url ? (
              <img src={sweet.image_url} alt={sweet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl">🍰</div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{sweet.name}</h1>
              {sweet.description && (
                <p className="text-gray-500 mt-2">{sweet.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 rounded-2xl p-3 flex items-center gap-2">
                <MapPin size={16} className="text-rose-400" />
                <div>
                  <p className="text-xs text-gray-400">الموقع</p>
                  <p className="text-sm font-semibold text-gray-700">{sweet.shop_location}</p>
                </div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-3 flex items-center gap-2">
                <ChefHat size={16} className="text-amber-400" />
                <div>
                  <p className="text-xs text-gray-400">الصانع</p>
                  <p className="text-sm font-semibold text-gray-700">{(sweet as any).profiles?.full_name}</p>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 flex items-center gap-2">
                <Package size={16} className="text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">المخزون</p>
                  <p className="text-sm font-semibold text-gray-700">{sweet.stock_count} حبة</p>
                </div>
              </div>
              <div className="bg-rose-50 rounded-2xl p-3">
                <p className="text-xs text-gray-400">سعر الحبة</p>
                <p className="text-lg font-bold text-rose-600">{sweet.price_per_unit} د.ج</p>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-rose-50 rounded-3xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">الكمية</p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-white text-rose-500 border border-rose-200 rounded-2xl flex items-center justify-center hover:bg-rose-50 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <div className="text-center">
                  <span className="text-3xl font-bold text-rose-700">{quantity}</span>
                  <p className="text-sm text-gray-500">حبة</p>
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="text-center mt-3 py-2 bg-white rounded-2xl">
                <p className="text-sm text-gray-500">الإجمالي</p>
                <p className="text-2xl font-bold text-rose-600">{total.toFixed(0)} د.ج</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={addToCart}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                أضف للسلة
              </button>
              <Link
                href={`/messages?maker=${sweet.maker_id}`}
                className="btn-outline flex items-center justify-center gap-2 px-4 py-3"
              >
                <MessageCircle size={18} />
                تواصل
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
