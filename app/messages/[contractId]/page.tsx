'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MessagesPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.contractId as string

  const [messages, setMessages] = useState<any[]>([])
  const [contract, setContract] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profileData?.role || 'client'
      setUserRole(role)

      const dashboardFallback = role === 'professional'
        ? '/dashboard/professional'
        : '/dashboard/client'

      const { data: contractData } = await supabase
        .from('contracts')
        .select(`
          *,
          jobs(title),
          client:profiles!contracts_client_id_fkey(full_name),
          professional:profiles!contracts_professional_id_fkey(full_name)
        `)
        .eq('id', contractId)
        .maybeSingle()

      if (!contractData) {
        router.push(dashboardFallback)
        return
      }

      // Allow active and completed contracts (so chat history is preserved)
      if (!['active', 'completed'].includes(contractData.status)) {
        router.push(dashboardFallback)
        return
      }

      // Make sure user is part of this contract
      if (contractData.client_id !== user.id && contractData.professional_id !== user.id) {
        router.push(dashboardFallback)
        return
      }

      setContract(contractData)

      const { data: messagesData } = await supabase
        .from('messages')
        .select('*, profiles(full_name)')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true })

      setMessages(messagesData || [])
      setLoading(false)

      channel = supabase
        .channel(`messages:${contractId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `contract_id=eq.${contractId}`,
          },
          async (payload) => {
            const { data: newMsg } = await supabase
              .from('messages')
              .select('*, profiles(full_name)')
              .eq('id', payload.new.id)
              .single()

            if (newMsg) {
              setMessages(prev => [...prev, newMsg])
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)
        })
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [contractId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        contract_id: contractId,
        sender_id: user.id,
        content: newMessage.trim(),
      })

    if (!error) setNewMessage('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading chat...</div>
      </div>
    )
  }

  const otherPerson = contract?.client_id === user?.id
    ? contract?.professional?.full_name
    : contract?.client?.full_name

  const dashboardLink = userRole === 'professional'
    ? '/dashboard/professional/contracts'
    : '/dashboard/client/contracts'

  const isCompleted = contract?.status === 'completed'

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={dashboardLink}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            ←
          </Link>
          <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <span className="text-green-700 dark:text-green-300 text-sm font-bold">
              {getInitials(otherPerson || '')}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{otherPerson}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{contract?.jobs?.title}</p>
          </div>
        </div>
        {isCompleted ? (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium px-3 py-1 rounded-full">
            ✅ Completed
          </span>
        ) : (
          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-1 rounded-full">
            🟢 Active Contract
          </span>
        )}
      </nav>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-12">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id
          const showDate = index === 0 ||
            formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-4">
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      {msg.profiles?.full_name}
                    </p>
                  )}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mx-1">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0">
        {isCompleted ? (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-2">
            This contract is completed. Chat is read-only.
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white p-3 rounded-xl transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}