'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Message, Profile } from '@/types'
import Navbar from '@/components/Navbar'
import {
  Send, MessageCircle, ChevronRight, Image as ImageIcon,
  Mic, MicOff, X, Play, Pause, Loader2, Trash2, Ban,
  MoreVertical, Pencil, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

const IMG_PREFIX = '__IMG__'
const AUDIO_PREFIX = '__AUDIO__'
const DELETED_MARKER = '__DELETED__'

function parseMessage(content: string): { type: 'text' | 'image' | 'voice' | 'deleted'; value: string } {
  if (content === DELETED_MARKER) return { type: 'deleted', value: '' }
  if (content.startsWith(IMG_PREFIX)) return { type: 'image', value: content.slice(IMG_PREFIX.length) }
  if (content.startsWith(AUDIO_PREFIX)) return { type: 'voice', value: content.slice(AUDIO_PREFIX.length) }
  return { type: 'text', value: content }
}

function AudioPlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause() } else { audioRef.current.play() }
    setPlaying(!playing)
  }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-rose-100 hover:bg-rose-200'}`}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-rose-100'}`}>
          <div className={`h-full rounded-full transition-all ${isMe ? 'bg-white' : 'bg-rose-400'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className={`text-[10px] mt-1 ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>{fmt(duration)}</div>
      </div>
    </div>
  )
}

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
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [menuMsg, setMenuMsg] = useState<string | null>(null)
  const [editingMsg, setEditingMsg] = useState<{ id: string; text: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchUnreadCounts = async (userId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .eq('is_read', false)

    const counts: Record<string, number> = {}
    data?.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
    setUnreadCounts(counts)
  }

  const markAsRead = async (senderId: string) => {
    if (!currentUser) return
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', currentUser.id)
      .eq('sender_id', senderId)
      .eq('is_read', false)

    setUnreadCounts(prev => { const n = { ...prev }; delete n[senderId]; return n })
  }

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
        const { data: users } = await supabase.from('profiles').select('*').in('id', Array.from(otherIds))
        setConversations(users || [])
        if (makerId) {
          const maker = users?.find(u => u.id === makerId)
          if (maker) { setSelectedUser(maker); setShowListOnMobile(false) }
        }
      }

      await fetchUnreadCounts(user.id)
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
    markAsRead(selectedUser.id)

    const channel = supabase
      .channel(`chat-${currentUser.id}-${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if (
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id)
        ) {
          setMessages(prev => [...prev, msg])
          if (msg.sender_id === selectedUser.id) markAsRead(selectedUser.id)
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.content } : m))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedUser, currentUser])

  const sendContent = async (content: string) => {
    if (!currentUser || !selectedUser) return
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content,
    })
    if (error) toast.error('خطأ في إرسال الرسالة')
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    await sendContent(newMessage.trim())
    setNewMessage('')
  }

  const uploadFile = async (blob: Blob, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from('messages').upload(path, blob, { upsert: true })
    if (error) {
      toast.error('فشل رفع الملف — تأكد من إعداد bucket "messages" في Supabase')
      return null
    }
    const { data } = supabase.storage.from('messages').getPublicUrl(path)
    return data.publicUrl
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('الصورة أكبر من 5MB'); return }
    setImagePreview({ file, url: URL.createObjectURL(file) })
    e.target.value = ''
  }

  const sendImage = async () => {
    if (!imagePreview || !currentUser) return
    setUploading(true)
    const ext = imagePreview.file.name.split('.').pop()
    const url = await uploadFile(imagePreview.file, `${currentUser.id}/${Date.now()}.${ext}`)
    if (url) await sendContent(`${IMG_PREFIX}${url}`)
    setImagePreview(null)
    setUploading(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = e => audioChunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setUploading(true)
        const url = await uploadFile(blob, `${currentUser?.id}/voice_${Date.now()}.webm`)
        if (url) await sendContent(`${AUDIO_PREFIX}${url}`)
        setUploading(false)
        setRecordingTime(0)
      }
      mr.start()
      setRecording(true)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      toast.error('لا يمكن الوصول للميكروفون')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setRecording(false)
  }

  const handleDeleteMessage = (msgId: string) => {
    setMenuMsg(null)
    toast((t) => (
      <div className="flex items-center gap-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
        <span className="text-sm font-semibold text-gray-800">حذف هذه الرسالة؟</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              const { error } = await supabase
                .from('messages')
                .update({ content: DELETED_MARKER })
                .eq('id', msgId)
                .eq('sender_id', currentUser!.id)
              if (!error) {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: DELETED_MARKER } : m))
              }
            }}
            className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            حذف
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  const handleSaveEdit = async (msgId: string, newText: string) => {
    if (!newText.trim()) return
    const { error } = await supabase
      .from('messages')
      .update({ content: newText.trim() })
      .eq('id', msgId)
      .eq('sender_id', currentUser!.id)
    if (!error) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newText.trim() } : m))
      setEditingMsg(null)
    } else {
      toast.error('خطأ في تعديل الرسالة')
    }
  }

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user)
    setShowListOnMobile(false)
    await markAsRead(user.id)
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

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
            conversations.map(user => {
              const unread = unreadCounts[user.id] || 0
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition-colors text-right border-b border-rose-50/50 ${
                    selectedUser?.id === user.id ? 'bg-rose-50 border-r-4 border-rose-500' : ''
                  }`}
                >
                  {/* Avatar with unread badge */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-amber-300 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-lg">
                      {user.full_name[0]}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-sm animate-bounce-in">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-bold truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
                        {user.full_name}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                          {unread} جديد
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {user.role === 'maker' ? '👩‍🍳 صانعة حلويات' : user.role === 'delivery' ? '🚗 موصّل' : '👤 عميل'}
                    </p>
                  </div>
                </button>
              )
            })
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
              <button onClick={() => setShowListOnMobile(true)} className="md:hidden p-2 -mr-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <ChevronRight size={28} />
              </button>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-rose-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                {selectedUser.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm md:text-base truncate">{selectedUser.full_name}</p>
                <p className="text-[10px] md:text-xs text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  متصل الآن
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdf8f8]"
              onClick={() => setMenuMsg(null)}
            >
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <div className="bg-white/80 inline-block px-4 py-2 rounded-full text-xs text-gray-400 shadow-sm">
                    ابدأ المحادثة الآن بكلمة طيبة ✨
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id
                const parsed = parseMessage(msg.content)
                const isEditing = editingMsg?.id === msg.id

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Three-dot menu button — own non-deleted messages */}
                    {isMe && parsed.type !== 'deleted' && !isEditing && (
                      <div className="relative self-end mb-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuMsg(menuMsg === msg.id ? null : msg.id) }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            menuMsg === msg.id
                              ? 'bg-rose-100 text-rose-500'
                              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Dropdown */}
                        {menuMsg === msg.id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute bottom-full right-0 mb-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-slide-up"
                            style={{ minWidth: 120 }}
                          >
                            {parsed.type === 'text' && (
                              <button
                                onClick={() => {
                                  setEditingMsg({ id: msg.id, text: parsed.value })
                                  setMenuMsg(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              >
                                <Pencil size={14} />
                                تعديل
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Edit Mode */}
                    {isEditing ? (
                      <div className="max-w-[80%] md:max-w-[65%] bg-white border-2 border-rose-300 rounded-2xl rounded-tr-none shadow-md overflow-hidden">
                        <textarea
                          value={editingMsg!.text}
                          onChange={e => setEditingMsg({ id: msg.id, text: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg.id, editingMsg!.text) }
                            if (e.key === 'Escape') setEditingMsg(null)
                          }}
                          className="w-full px-4 py-3 text-sm text-gray-800 bg-transparent border-none focus:ring-0 resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center gap-2 px-3 pb-3">
                          <button
                            onClick={() => handleSaveEdit(msg.id, editingMsg!.text)}
                            className="flex items-center gap-1.5 bg-rose-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-rose-600 transition-colors"
                          >
                            <Check size={12} />
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingMsg(null)}
                            className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Message Bubble */
                      <div className={`max-w-[80%] md:max-w-[65%] shadow-sm overflow-hidden ${
                        parsed.type === 'deleted'
                          ? isMe
                            ? 'bg-rose-200/60 rounded-2xl rounded-tr-none'
                            : 'bg-gray-100 rounded-2xl rounded-tl-none'
                          : isMe
                          ? 'bg-rose-500 text-white rounded-2xl rounded-tr-none'
                          : 'bg-white border border-rose-100 text-gray-800 rounded-2xl rounded-tl-none'
                      }`}>
                        {parsed.type === 'deleted' && (
                          <div className={`px-4 py-3 flex items-center gap-2 ${isMe ? 'text-rose-400' : 'text-gray-400'}`}>
                            <Ban size={14} />
                            <p className="text-sm italic">تم حذف هذه الرسالة</p>
                          </div>
                        )}
                        {parsed.type === 'text' && (
                          <div className="px-4 py-3">
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{parsed.value}</p>
                          </div>
                        )}
                        {parsed.type === 'image' && (
                          <img
                            src={parsed.value}
                            alt="صورة"
                            className="max-w-full cursor-pointer hover:opacity-95 transition-opacity"
                            style={{ maxHeight: 260 }}
                            onClick={() => window.open(parsed.value, '_blank')}
                          />
                        )}
                        {parsed.type === 'voice' && (
                          <div className="px-4 py-3">
                            <AudioPlayer src={parsed.value} isMe={isMe} />
                          </div>
                        )}
                        {parsed.type !== 'deleted' && (
                          <div className={`text-[10px] px-3 pb-2 ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mx-3 mb-2 p-3 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-3">
                <img src={imagePreview.url} alt="preview" className="w-16 h-16 object-cover rounded-xl" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{imagePreview.file.name}</p>
                  <p className="text-xs text-gray-400">{(imagePreview.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={sendImage} disabled={uploading} className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-60 flex items-center gap-1.5 transition-all">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  إرسال
                </button>
                <button onClick={() => setImagePreview(null)} className="p-1.5 rounded-xl hover:bg-rose-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 md:p-4 border-t border-rose-100 bg-white shadow-lg">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              {recording && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-500 font-semibold">جارٍ التسجيل... {fmtTime(recordingTime)}</span>
                </div>
              )}

              <div className="flex gap-2 items-end max-w-4xl mx-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={recording || uploading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-40 transition-all flex-shrink-0 border border-gray-100"
                  title="إرسال صورة"
                >
                  <ImageIcon size={18} />
                </button>

                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={uploading || !!imagePreview}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border ${
                    recording
                      ? 'bg-red-500 text-white border-red-500 scale-110 shadow-lg shadow-red-200'
                      : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 border-gray-100'
                  } disabled:opacity-40`}
                  title="اضغط مطولاً للتسجيل"
                >
                  {recording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-1 border border-gray-100 focus-within:border-rose-300 focus-within:ring-1 focus-within:ring-rose-200 transition-all">
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    }}
                    placeholder={recording ? 'جارٍ التسجيل...' : 'اكتب رسالة...'}
                    disabled={recording}
                    className="w-full bg-transparent border-none focus:ring-0 py-3 text-sm md:text-base text-gray-800 resize-none max-h-32 disabled:opacity-50"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || uploading}
                  className="w-10 h-10 md:w-12 md:h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 disabled:opacity-40 shadow-lg shadow-rose-200 transition-all active:scale-95 flex-shrink-0"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>

              <p className="text-[10px] text-gray-300 text-center mt-1.5">
                اضغط مطولاً على 🎤 للتسجيل الصوتي
              </p>
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
