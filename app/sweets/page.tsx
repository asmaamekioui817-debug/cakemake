'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sweet, CartItem } from '@/types'
import Navbar from '@/components/Navbar'
import { Search, Filter, ShoppingCart, Plus, Minus, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['الكل', 'كعك', 'بسكويت', 'شوكولاتة', 'مقروط', 'حلوى تقليدية', 'أخرى']

export default function SweetsPage() {
  const [sweets, setSweets] = useState<Sweet[]>([])
  const [filtered, setFiltered] = useState<Sweet[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('الكل')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load cart from localStorage
    const saved = localStorage.getItem('halwa-cart')
    if (saved) setCart(JSON.parse(saved))

    const fetchSweets = async () => {
      const { data } = await supabase
        .from('sweets')
        .select('*, profiles(full_name, city)')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
      setSweets(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchSweets()
  }, [])

  useEffect(() => {
    let results = sweets
    if (search) {
      results = results.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.shop_location.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (category !== 'الكل') {
      results = results.filter(s => s.category === category)
    }
    setFiltered(results)
  }, [search, category, sweets])

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('halwa-cart', JSON.stringify(newCart))
  }

  const getQty = (sweetId: string) => {
    return cart.find(c => c.sweet.id === sweetId)?.quantity || 0
  }

  const addToCart = (sweet: Sweet) => {
    const existing = cart.find(c => c.sweet.id === sweet.id)
    if (existing) {
      saveCart(cart.map(c => c.sweet.id === sweet.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      saveCart([...cart, { sweet, quantity: 1 }])
    }
    toast.success(`تمت إضافة ${sweet.name} للسلة`)
  }

  const removeFromCart = (sweetId: string) => {
    const existing = cart.find(c => c.sweet.id === sweetId)
    if (!existing) return
    if (existing.quantity === 1) {
      saveCart(cart.filter(c => c.sweet.id !== sweetId))
    } else {
      saveCart(cart.map(c => c.sweet.id === sweetId ? { ...c, quantity: c.quantity - 1 } : c))
    }
  }

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0)

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar cartCount={totalItems} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="page-header">🍬 الحلويات</h1>
          <p className="text-gray-500">اختر من أشهى الحلويات</p>
        </div>

        {/* Search */}
        <div className="relative animate-slide-up">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-300" />
          <input
            type="text"
            id="search-sweets"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن حلوى أو محل..."
            className="input-field pr-11"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-slide-up">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
                category === cat
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-rose-100 hover:border-rose-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cart Summary */}
        {totalItems > 0 && (
          <Link href="/cart" className="block animate-bounce-in">
            <div className="bg-gradient-to-l from-rose-500 to-amber-400 rounded-3xl p-4 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <ShoppingCart size={22} />
                <div>
                  <p className="font-bold">{totalItems} حبة في السلة</p>
                  <p className="text-rose-100 text-xs">
                    المجموع: {cart.reduce((s, c) => s + c.sweet.price_per_unit * c.quantity, 0).toFixed(0)} د.ج
                  </p>
                </div>
              </div>
              <span className="bg-white text-rose-600 font-bold text-sm px-4 py-2 rounded-xl">
                اطلب الآن
              </span>
            </div>
          </Link>
        )}

        {/* Sweets Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-40 bg-rose-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-rose-100 rounded-xl w-3/4" />
                  <div className="h-3 bg-rose-50 rounded-xl w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🍬</div>
            <p className="font-semibold text-lg">لا توجد نتائج</p>
            <p className="text-sm mt-1">جرب كلمة بحث أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((sweet) => {
              const qty = getQty(sweet.id)
              return (
                <div key={sweet.id} className="card animate-fade-in">
                  <Link href={`/sweets/${sweet.id}`} className="block">
                    <div className="h-40 bg-gradient-to-br from-rose-100 to-amber-100 relative overflow-hidden">
                      {sweet.image_url ? (
                        <img src={sweet.image_url} alt={sweet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-4xl">🍰</div>
                      )}
                      {!sweet.is_available && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">غير متوفر</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-800 truncate">{sweet.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={10} />
                        <span className="truncate">{sweet.shop_location}</span>
                      </div>
                      <p className="font-bold text-rose-600 mt-2">{sweet.price_per_unit} د.ج / حبة</p>
                    </div>
                  </Link>
                  {/* Quantity Controls */}
                  <div className="px-3 pb-3">
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(sweet)}
                        className="btn-primary w-full py-2 text-sm"
                      >
                        أضف للسلة
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-rose-50 rounded-2xl px-3 py-2">
                        <button onClick={() => addToCart(sweet)} className="w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center font-bold hover:bg-rose-600 transition-colors">
                          <Plus size={16} />
                        </button>
                        <div className="text-center">
                          <span className="font-bold text-rose-700 text-lg">{qty}</span>
                          <p className="text-xs text-gray-400">{(qty * sweet.price_per_unit).toFixed(0)} د.ج</p>
                        </div>
                        <button onClick={() => removeFromCart(sweet.id)} className="w-8 h-8 bg-white text-rose-500 border border-rose-200 rounded-xl flex items-center justify-center font-bold hover:bg-rose-50 transition-colors">
                          <Minus size={16} />
                        </button>
                      </div>
                    )}
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
