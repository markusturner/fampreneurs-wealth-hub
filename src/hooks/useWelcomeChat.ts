import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

export type WelcomeConversation = Database['public']['Tables']['chat_conversations']['Row']
export type WelcomeProject = Database['public']['Tables']['chat_projects']['Row']
export type WelcomeMessage = Pick<Database['public']['Tables']['ai_chat_history']['Row'], 'id' | 'content' | 'role'>

export function useWelcomeChat(userId: string | undefined) {
  const [conversations, setConversations] = useState<WelcomeConversation[]>([])
  const [projects, setProjects] = useState<WelcomeProject[]>([])
  const [messages, setMessages] = useState<WelcomeMessage[]>([])
  const [activeConversation, setActiveConversation] = useState<WelcomeConversation | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState(false)
  const busyRef = useRef(false)
  const identityRef = useRef(userId)
  identityRef.current = userId

  const refresh = useCallback(async () => {
    if (!userId) return
    setLibraryLoading(true)
    setLibraryError(false)
    try {
      const [chats, folders] = await Promise.all([
        supabase.from('chat_conversations').select('*').eq('user_id', userId).eq('persona', 'rachel').order('updated_at', { ascending: false }),
        supabase.from('chat_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      if (identityRef.current !== userId) return
      if (chats.error || folders.error) throw chats.error || folders.error
      setConversations(chats.data ?? [])
      setProjects(folders.data ?? [])
    } catch {
      if (identityRef.current === userId) setLibraryError(true)
    } finally {
      if (identityRef.current === userId) setLibraryLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setMessages([])
    setConversations([])
    setProjects([])
    setActiveConversation(null)
    setProjectId(null)
    void refresh()
  }, [refresh])

  const newChat = (folder: string | null = null) => {
    if (busyRef.current) return
    setActiveConversation(null)
    setMessages([])
    setProjectId(folder)
  }

  const openConversation = async (conversation: WelcomeConversation) => {
    if (!userId || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const { data, error } = await supabase.from('ai_chat_history').select('id,content,role,created_at')
        .eq('user_id', userId).eq('conversation_id', conversation.id).order('created_at', { ascending: true })
      if (error) throw error
      if (identityRef.current !== userId) return
      setMessages(data ?? [])
      setActiveConversation(conversation)
      setProjectId(conversation.project_id)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const createProject = async (name: string) => {
    if (!userId || !name.trim()) return
    const { data, error } = await supabase.from('chat_projects').insert({ user_id: userId, name: name.trim() }).select().single()
    if (error) throw error
    if (identityRef.current !== userId) return
    setProjects(previous => [data, ...previous])
    return data
  }

  const moveToProject = async (folder: string | null) => {
    if (!userId || busyRef.current) return
    if (activeConversation) {
      const { error } = await supabase.from('chat_conversations').update({ project_id: folder })
        .eq('id', activeConversation.id).eq('user_id', userId)
      if (error) throw error
      setActiveConversation({ ...activeConversation, project_id: folder })
      setConversations(previous => previous.map(chat => chat.id === activeConversation.id ? { ...chat, project_id: folder } : chat))
    }
    setProjectId(folder)
  }

  const send = async (message: string, attachments: unknown[]) => {
    if (!userId || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    let conversation = activeConversation
    try {
      if (!conversation) {
        const { data, error } = await supabase.from('chat_conversations').insert({
          user_id: userId, title: message.slice(0, 80), persona: 'rachel', project_id: projectId,
        }).select().single()
        if (error) throw error
        conversation = data
        setActiveConversation(data)
        setConversations(previous => [data, ...previous])
      }
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message, persona: 'rachel', instructions: '', conversation_id: conversation.id, attachments },
      })
      if (error || data?.error || !data?.response) throw error || new Error(data?.error || 'No response')
      if (identityRef.current !== userId) return
      const reply = String(data.response)
      const pair = [
        { user_id: userId, conversation_id: conversation.id, role: 'user', content: message, created_at: new Date().toISOString() },
        { user_id: userId, conversation_id: conversation.id, role: 'assistant', content: reply, created_at: new Date(Date.now() + 1).toISOString() },
      ]
      const saved = await supabase.from('ai_chat_history').insert(pair).select('id,content,role,created_at').order('created_at', { ascending: true })
      setMessages(previous => [...previous, ...(saved.data ?? pair.map((entry, i) => ({ ...entry, id: `${Date.now()}-${i}` })))])
      const updatedAt = new Date().toISOString()
      const updated = await supabase.from('chat_conversations').update({ updated_at: updatedAt }).eq('id', conversation.id).eq('user_id', userId)
      const current = { ...conversation, updated_at: updatedAt }
      setActiveConversation(current)
      setConversations(previous => [current, ...previous.filter(chat => chat.id !== current.id)])
      return { reply, saved: !saved.error && !updated.error }
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return { conversations, projects, messages, activeConversation, projectId, busy, libraryLoading, libraryError, refresh, newChat, openConversation, createProject, moveToProject, send }
}