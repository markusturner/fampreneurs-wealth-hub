import { useEffect, useState } from 'react'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'

interface Props {
  getTextarea: () => HTMLTextAreaElement | null
  value: string
  onChange: (v: string) => void
  className?: string
}

/**
 * Lightweight markdown-style formatting toolbar for community post composers.
 * Bold **text**, italic *text*, underline __text__, plus bullet / numbered lists.
 */
export function PostFormatToolbar({ getTextarea, value, onChange, className = '' }: Props) {
  const apply = (before: string, after: string) => {
    const ta = getTextarea()
    const start = ta?.selectionStart ?? value.length
    const end = ta?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || 'text'
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const applyList = (ordered: boolean) => {
    const ta = getTextarea()
    const start = ta?.selectionStart ?? value.length
    const end = ta?.selectionEnd ?? value.length
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end)
    const block = value.slice(lineStart, lineEnd) || 'item'
    const lines = block.split('\n')
    const formatted = lines
      .map((l, i) => {
        const clean = l.replace(/^(\s*)(?:•\s+|\d+\.\s+)/, '$1')
        return ordered ? `${i + 1}. ${clean}` : `• ${clean}`
      })
      .join('\n')
    const next = value.slice(0, lineStart) + formatted + value.slice(lineEnd)
    onChange(next)
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(lineStart + formatted.length, lineStart + formatted.length)
    })
  }

  const btn =
    'h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <button type="button" tabIndex={-1} className={btn} title="Bold" onMouseDown={(e) => { e.preventDefault(); apply('**', '**') }}>
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" tabIndex={-1} className={btn} title="Italic" onMouseDown={(e) => { e.preventDefault(); apply('*', '*') }}>
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" tabIndex={-1} className={btn} title="Underline" onMouseDown={(e) => { e.preventDefault(); apply('__', '__') }}>
        <Underline className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button type="button" tabIndex={-1} className={btn} title="Bullet list" onMouseDown={(e) => { e.preventDefault(); applyList(false) }}>
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" tabIndex={-1} className={btn} title="Numbered list" onMouseDown={(e) => { e.preventDefault(); applyList(true) }}>
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
