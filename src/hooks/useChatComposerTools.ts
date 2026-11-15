import { useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export type ChatAttachment = { name: string; mimeType: string; dataUrl?: string; text?: string }
export const CHAT_ATTACH_ACCEPT = 'image/*,application/pdf,.pdf,.docx,.txt,.md,.csv,.json,.rtf'
export const ATTACHMENT_ONLY_PROMPT = 'Read the attached document(s) fully. Summarize what they are, extract the key terms, flag anything missing, risky, or outdated, and tell me exactly what should be revised and how.'

// Photo/document uploads and speak-to-type for Markus chat composers (same behavior as the Welcome chat).
export function useChatComposerTools(onDictated: (text: string) => void) {
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const picked = Array.from(files).slice(0, Math.max(0, 5 - attachments.length))
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large', description: `${file.name} is over 10MB.`, variant: 'destructive' }); continue }
      const mime = file.type || 'application/octet-stream'
      const name = file.name
      const lower = name.toLowerCase()
      const isImage = mime.startsWith('image/')
      const isPdf = mime === 'application/pdf' || lower.endsWith('.pdf')
      const isDocx = lower.endsWith('.docx') || mime.includes('officedocument.wordprocessingml')
      const isPlain = mime.startsWith('text/') || /\.(txt|md|csv|json|rtf)$/.test(lower)
      try {
        if (isImage || isPdf) {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
          setAttachments(prev => [...prev, { name, mimeType: isPdf ? 'application/pdf' : mime, dataUrl }])
        } else if (isDocx) {
          const mammoth = await import('mammoth/mammoth.browser')
          const result = await (mammoth as any).extractRawText({ arrayBuffer: await file.arrayBuffer() })
          const text = String(result?.value || '').trim()
          if (!text) throw new Error('empty')
          setAttachments(prev => [...prev, { name, mimeType: 'text/plain', text }])
        } else if (isPlain) {
          const text = (await file.text()).trim()
          if (!text) throw new Error('empty')
          setAttachments(prev => [...prev, { name, mimeType: 'text/plain', text }])
        } else {
          toast({ title: 'Unsupported file', description: `${name}: please upload a PDF, Word (.docx), image, or text file.`, variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Could not read file', description: `${name} could not be opened.`, variant: 'destructive' })
      }
    }
  }

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index))
  const clearAttachments = () => setAttachments([])

  const transcribe = async (blob: Blob) => {
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'recording')
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: form })
      if (error) throw error
      const text = String(data?.text || '').trim()
      if (!text) throw new Error('empty')
      onDictated(text)
    } catch {
      toast({ title: 'Could not hear that', description: 'Please try recording again.', variant: 'destructive' })
    } finally { setTranscribing(false) }
  }

  const toggleRecording = async () => {
    if (recording) { recorderRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size < 1024) { toast({ title: 'That recording was empty', description: 'Hold the mic a bit longer.', variant: 'destructive' }); return }
        await transcribe(blob)
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      toast({ title: 'Microphone blocked', description: 'Allow mic access to use dictation.', variant: 'destructive' })
    }
  }

  return { attachments, addFiles, removeAttachment, clearAttachments, recording, transcribing, toggleRecording }
}
