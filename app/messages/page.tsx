'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Message, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import { Send, MessageCircle, ChevronRight, User } from 'lucide-react'
import toast from 'react-hot-toast'

function MessagesContent() {
  const searchParams = useSearchParams()
  const makerId = searchParams.get('maker')
  
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showListOnMobile, setShowListOnMobile] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)

      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

      const otherIds = new Set<string>()
      msgs?.forEach(m => {
        if (m.sender_id !== user.id) otherIds.add(m.sender_id)
        if (m.receiver_id !== user.id) otherIds.add(m.receiver_id)
      })

      if (makerId && !otherIds.has(makerId)) otherIds.add(makerId)

      if (otherIds.size > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(otherIds))
        setConversations(users || [])

        if (makerId) {
          const maker = users?.find(u => u.id === makerId)
          if (maker) {
            setSelectedUser(maker)
            setShowListOnMobile(false)
          }
        }
      }

      setLoading(false)
    }
    init()
  }, [makerId])

  useEffect(() => {
    if (!selectedUser || !currentUser) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }

    fetchMessages()

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if (
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id)
        ) {
          setMessages(prev => [...prev, msg])
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedUser, currentUser])

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !selectedUser) return

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    })

    if (error) {
      toast.error('خطأ في إرسال الرسالة')
    } else {
      setNewMessage('')
    }
  }

  const handleSelectUser = (user: Profile) => {
    setSelectedUser(user)
    setShowListOnMobile(false)
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-140px)] md:h-[calc(100vh-250px)]">
      {/* Conversations List */}
      <div className={`card overflow-hidden flex flex-col ${!showListOnMobile ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-rose-100 bg-white">
          <p className="font-bold text-gray-700">المحادثات</p>
        </div>
        <div className="overflow-y-auto flex-1 bg-white/50">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-rose-100 rounded-full" />
                  <div className="h-4 bg-rose-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد محادثات بعد</p>
            </div>
          ) : (
            conversations.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition-colors text-right border-b border-rose-50/50 ${
                  selectedUser?.id === user.id ? 'bg-rose-50 border-r-4 border-rose-500' : ''
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-amber-300 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm text-lg">
                  {user.full_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 font-medium">
                    {user.role === 'maker' ? '👩‍🍳 صانعة حلويات' : user.role === 'delivery' ? '🚗 موصّل' : '👤 عميل'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`md:col-span-2 card overflow-hidden flex flex-col h-full ${showListOnMobile ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4 bg-white/50">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
              <MessageCircle size={40} className="text-rose-200" />
            </div>
            <p className="font-bold text-lg">اختر محادثة للبدء</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-4 border-b border-rose-100 flex items-center gap-3 bg-white sticky top-0 z-10">
              <button 
                onClick={() => setShowListOnMobile(true)}
                className="md:hidden p-2 -mr-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
              >
                <ChevronRight size={28} />
              </button>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-rose-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                {selectedUser.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm md:text-base truncate">{selectedUser.full_name}</p>
                <p className="text-[10px] md:text-xs text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  متصل الآن
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fdf8f8] pattern-bg-light">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <div className="bg-white/80 inline-block px-4 py-2 rounded-full text-xs text-gray-400 shadow-sm">
                    ابدأ المحادثة الآن بكلمة طيبة ✨
                  </div>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end animate-slide-up'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 shadow-sm ${
                      isMe
                        ? 'bg-rose-500 text-white rounded-2xl rounded-tr-none'
                        : 'bg-white border border-rose-100 text-gray-800 rounded-2xl rounded-tl-none'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`text-[10px] mt-1.5 flex items-center ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 border-t border-rose-100 bg-white shadow-lg">
              <div className="flex gap-2 items-end max-w-4xl mx-auto">
                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-1 border border-gray-100 focus-within:border-rose-300 focus-within:ring-1 focus-within:ring-rose-200 transition-all">
                  <textarea
                    id="message-textarea"
                    rows={1}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="اكتب رسالة..."
                    className="w-full bg-transparent border-none focus:ring-0 py-3 text-sm md:text-base text-gray-800 resize-none max-h-32"
                    style={{ height: 'auto' }}
                  />
                </div>
                <button
                  id="send-message-btn"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 md:w-14 md:h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 disabled:opacity-40 shadow-lg shadow-rose-200 transition-all active:scale-95 flex-shrink-0"
                >
                  <Send size={20} className="md:size-24" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-rose-50 overflow-hidden">
      <Navbar />
      <div className="max-w-5xl mx-auto px-0 md:px-4 py-0 md:py-6">
        <div className="hidden md:block">
          <h1 className="page-header mb-4">💬 الرسائل</h1>
        </div>
        <Suspense fallback={<div className="text-center py-20 text-gray-400 animate-pulse">جارٍ تحميل المحادثات...</div>}>
          <MessagesContent />
        </Suspense>
      </div>
    </div>
  )
}
