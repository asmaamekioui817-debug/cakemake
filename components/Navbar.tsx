'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import {
  Home, ShoppingBag, MessageCircle, GraduationCap,
  User, LogOut, Menu, X, ShoppingCart, ChefHat, Truck
} from 'lucide-react'

interface NavbarProps {
  cartCount?: number
}

export default function Navbar({ cartCount = 0 }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'الرئيسية', icon: Home },
    { href: '/sweets', label: 'الحلويات', icon: ShoppingBag },
    { href: '/workshops', label: 'الورشات', icon: GraduationCap },
    { href: '/messages', label: 'الرسائل', icon: MessageCircle },
    ...(profile?.role === 'maker' ? [
      { href: '/maker/dashboard', label: 'لوحة الصانع', icon: ChefHat },
    ] : []),
    ...(profile?.role === 'delivery' ? [
      { href: '/delivery/dashboard', label: 'التوصيل', icon: Truck },
    ] : []),
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="bg-white border-b border-rose-100 sticky top-0 z-50 shadow-sm h-28 flex items-center">
      <div className="max-w-6xl mx-auto px-4 w-full">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="w-24 h-24 relative overflow-hidden rounded-full border-4 border-white shadow-xl transition-transform group-hover:scale-105 bg-white -mt-4">
              <img src="/logo.png" alt="حلي باش تولي" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-2xl text-rose-700 tracking-tighter">حلي باش تولي</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive(link.href)
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-rose-500'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link href="/cart" className="relative p-2 rounded-xl hover:bg-rose-50 transition-colors">
              <ShoppingCart size={22} className="text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce-in">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link href="/profile" className="hidden md:flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 transition-colors">
              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-rose-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                {profile?.full_name || 'حسابي'}
              </span>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1 p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-rose-100 px-4 py-4 space-y-1 animate-slide-up">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isActive(link.href)
                    ? 'bg-rose-50 text-rose-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            )
          })}
          <div className="border-t border-rose-100 pt-3 mt-3">
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              <User size={18} />
              الملف الشخصي
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
