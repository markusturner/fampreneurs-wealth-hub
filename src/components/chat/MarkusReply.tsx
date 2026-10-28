import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { markusThoughts } from '@/lib/markus-message-format'
import { cn } from '@/lib/utils'

export function MarkusReply({ content, components, bubbleClassName }: {
  content: string
  components?: Components
  bubbleClassName?: string
}) {
  const thoughts = useMemo(() => markusThoughts(content), [content])
  return <div className="flex min-w-0 flex-col gap-3" data-markus-reply>
    {thoughts.map((thought, index) => <div key={index} data-markus-thought className={cn('min-w-0 rounded-lg px-4 py-3 text-sm bg-card text-card-foreground', bubbleClassName)}>
      <div className="prose prose-sm max-w-none text-inherit [overflow-wrap:anywhere] [&>*]:my-0 [&>*+*]:mt-6 [&_p]:leading-relaxed [&_p+p]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-2 [&_pre]:overflow-x-auto [&_img]:max-w-full [&_a]:text-secondary [&_a]:underline [&_strong]:text-inherit [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm">
        <ReactMarkdown components={components}>{thought}</ReactMarkdown>
      </div>
    </div>)}
  </div>
}