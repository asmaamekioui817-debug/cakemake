'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sweet, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import { MapPin, ChefHat, MessageCircle, ShoppingBag, Plus, Minus, ArrowRight, Star, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SweetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [sweet, setSweet] = useState<Sweet | null>(null)
  const [maker, setMaker] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    const fetchSweet = async () => {
      const { data, error } = await supabase
        .from('sweets')
        .select('*, profiles(*)')
        .eq('id', id)
        .single()

      if (data) {
        setSweet(data)
        setMaker(data.profiles)
      }
      setLoading(false)
    }
    fetchSweet()
  }, [id])

  const addToCart = () => {
    if (!sweet) return
    const cart = JSON.parse(localStorage.getItem('halwa-cart') || '[]')
    const existing = cart.findIndex((item: any) => item.sweet.id === sweet.id)
    
    if (existing > -1) {
      cart[existing].quantity += quantity
    } else {
      cart.push({ sweet, quantity })
    }
    
    localStorage.setItem('halwa-cart', JSON.stringify(cart))
    toast.success('تمت إضافة الحلوى للسلة! 🛒')
    router.push('/cart')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-rose-50"><div className="animate-spin text-4xl">🧁</div></div>
  if (!sweet) return <div className="min-h-screen flex items-center justify-center">المنتج غير موجود</div>

  return (
    <div className="min-h-screen bg-rose-50/30">
      <Navbar />
      
      {/* Mobile Sticky Top Bar */}
      <div className="md:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-lg px-4 py-3 flex items-center gap-3 border-b border-rose-100">
        <button onClick={() => router.back()} className="p-2 hover:bg-rose-50 rounded-full">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 truncate">{sweet.name}</h1>
      </div>

      <div className="max-w-5xl mx-auto md:py-8 md:px-4">
        <div className="bg-white md:rounded-[40px] shadow-xl shadow-rose-100/50 overflow-hidden border border-rose-100/50">
          <div className="grid md:grid-cols-2">
            {/* Image Section */}
            <div className="relative aspect-square md:aspect-auto h-[400px] md:h-[600px]">
              {sweet.image_url ? (
                <img src={sweet.image_url} alt={sweet.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-100 flex items-center justify-center text-6xl">🍰</div>
              )}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-gray-700">4.9 (42 تقييم)</span>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 md:p-12 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2">{sweet.name}</h1>
                  <p className="text-gray-500 text-lg leading-relaxed">{sweet.description || 'بنة وهمة وسومة، حلوياتنا مصنوعة بكل حب لإسعادكم في مناسباتكم.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <ChefHat size={16} className="text-amber-500" />
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">الصانع</span>
                    </div>
                    <p className="font-bold text-gray-800">{maker?.full_name}</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={16} className="text-rose-500" />
                      <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">الموقع</span>
                    </div>
                    <p className="font-bold text-gray-800">{maker?.city || 'شلف'}</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">سعر الحبة</span>
                    </div>
                    <p className="text-2xl font-black text-rose-600">{sweet.price_per_unit} <span className="text-sm font-bold">د.ج</span></p>
                  </div>
                  <div className="bg-green-50/50 p-4 rounded-3xl border border-green-100/50">
                    <div className="flex items-center gap-2 mb-1 text-green-600">
                      <Package size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">المخزون</span>
                    </div>
                    <p className="font-bold text-gray-800">{sweet.stock_count || 200} حبة</p>
                  </div>
                </div>

                {/* Quantity & Order */}
                <div className="space-y-4 pt-4">
                  <p className="text-sm font-bold text-gray-400">الكمية</p>
                  <div className="flex items-center gap-6 bg-gray-50 w-fit p-2 rounded-[24px]">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-50 transition-colors shadow-sm"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(sweet.stock_count || 1000, Number(e.target.value))))}
                        className="w-20 text-center font-black text-3xl text-gray-800 bg-transparent border-none focus:ring-0"
                      />
                      <p className="text-[10px] text-gray-400 absolute -bottom-3 left-1/2 -translate-x-1/2">حبة</p>
                    </div>
                    <button
                      onClick={() => setQuantity(Math.min(sweet.stock_count || 1000, quantity + 1))}
                      className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  <div className="bg-rose-100/30 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-gray-500 font-bold">الإجمالي</span>
                    <span className="text-2xl font-black text-gray-800">{sweet.price_per_unit * quantity} د.ج</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <Link href={`/messages?maker=${maker?.id}`} className="p-4 bg-white border-2 border-rose-100 text-rose-500 rounded-3xl hover:bg-rose-50 transition-all flex items-center gap-2">
                  <MessageCircle size={24} />
                  <span className="font-bold hidden md:inline">تواصل</span>
                </Link>
                <button
                  onClick={addToCart}
                  className="flex-1 btn-primary py-4 rounded-[28px] text-lg flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
                >
                  <ShoppingBag size={24} />
                  أضف للسلة
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
