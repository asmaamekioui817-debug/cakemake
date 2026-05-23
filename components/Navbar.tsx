'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!profile) return

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel(`navbar-unread-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    if (mobileOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'الرئيسية', icon: Home },
    { href: '/sweets', label: 'الحلويات', icon: ShoppingBag },
    { href: '/workshops', label: 'الورشات', icon: GraduationCap },
    { href: '/messages', label: 'الرسائل', icon: MessageCircle },
    ...(profile?.role === 'maker' ? [{ href: '/maker/dashboard', label: 'لوحة الصانع', icon: ChefHat }] : []),
    ...(profile?.role === 'delivery' ? [{ href: '/delivery/dashboard', label: 'التوصيل', icon: Truck }] : []),
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const badgeClass = 'absolute -top-2 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5 animate-bounce-in'

  return (
    <header ref={menuRef} className="sticky top-0 z-50">
      <nav className="bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
              <div className="w-10 h-10 md:w-14 md:h-14 relative overflow-hidden rounded-full border-2 border-rose-200 shadow-md transition-transform group-hover:scale-105 bg-white">
                <img src="/logo.jpeg" alt="قطعة سكر" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-base md:text-xl text-rose-700 tracking-tight leading-tight">
                قطعة سكر
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isMessages = link.href === '/messages'
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive(link.href)
                        ? 'bg-rose-50 text-rose-600 shadow-sm'
                        : 'text-gray-600 hover:bg-rose-50 hover:text-rose-500'
                    }`}
                  >
                    <div className="relative">
                      <Icon size={16} />
                      {isMessages && unreadCount > 0 && (
                        <span className={badgeClass}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                    </div>
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Cart */}
              <Link href="/cart" className="relative p-2 rounded-xl hover:bg-rose-50 transition-colors" aria-label="سلة التسوق">
                <ShoppingCart size={20} className="text-gray-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce-in">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Messages icon (mobile only) with badge */}
              <Link href="/messages" className="md:hidden relative p-2 rounded-xl hover:bg-rose-50 transition-colors">
                <MessageCircle size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5 animate-bounce-in">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile - desktop only */}
              <Link href="/profile" className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors">
                <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                  <User size={14} className="text-rose-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700 max-w-[90px] truncate">
                  {profile?.full_name || 'حسابي'}
                </span>
              </Link>

              {/* Logout - desktop only */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1 p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="تسجيل الخروج"
              >
                <LogOut size={18} />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-rose-50 transition-colors text-gray-600"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown */}
      <div className={`md:hidden bg-white border-b border-rose-100 shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isMessages = link.href === '/messages'
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isActive(link.href) ? 'bg-rose-50 text-rose-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <Icon size={18} />
                  {isMessages && unreadCount > 0 && (
                    <span className={badgeClass}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </div>
                {link.label}
                {isMessages && unreadCount > 0 && (
                  <span className="mr-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                    {unreadCount} جديد
                  </span>
                )}
              </Link>
            )
          })}

          <div className="border-t border-rose-100 pt-2 mt-2 space-y-1">
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <User size={14} className="text-rose-500" />
              </div>
              <div>
                <div className="text-xs text-gray-400">الملف الشخصي</div>
                <div className="font-semibold text-gray-700">{profile?.full_name || 'حسابي'}</div>
              </div>
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
