'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Message, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import { Send, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const makerId = searchParams.get('maker')
  
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)

      // Fetch all users who sent/received messages
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
          if (maker) setSelectedUser(maker)
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

    // Real-time subscription
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

  return (
    <div className="min-h-screen bg-rose-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="page-header mb-4">💬 الرسائل</h1>

        <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-rose-100">
              <p className="font-bold text-gray-700">المحادثات</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 bg-rose-100 rounded-full" />
                      <div className="h-4 bg-rose-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد محادثات</p>
                </div>
              ) : (
                conversations.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition-colors text-right ${
                      selectedUser?.id === user.id ? 'bg-rose-50 border-r-2 border-rose-400' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-300 to-amber-300 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.full_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-400">{user.role === 'maker' ? 'صانع حلوى' : user.role === 'delivery' ? 'موصّل' : 'عميل'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 card overflow-hidden flex flex-col">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                <MessageCircle size={48} className="opacity-30" />
                <p className="font-semibold">اختر محادثة للبدء</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-rose-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-rose-300 to-amber-300 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedUser.full_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{selectedUser.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {selectedUser.role === 'maker' ? '👩‍🍳 صانع حلوى' : selectedUser.city || ''}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-rose-500 text-white rounded-tr-sm'
                            : 'bg-white border border-rose-100 text-gray-700 rounded-tl-sm'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-rose-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-rose-100 flex gap-3">
                  <input
                    id="message-input"
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="اكتب رسالة..."
                    className="input-field flex-1"
                  />
                  <button
                    id="send-btn"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="btn-primary px-4 py-3 disabled:opacity-60"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
