// Renders agreement text so wrapped lines keep the indent of their first line.
export function IndentedText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => {
        const m = line.match(/^[ \t]*/)
        const lead = m ? m[0].replace(/\t/g, '    ').length : 0
        const content = line.slice(m ? m[0].length : 0)
        if (!content) return <div key={i} className="h-[1.5em]" />
        // Hanging indent for list markers like "a.", "1)", "-", "•"
        const marker = content.match(/^((?:\(?[a-zA-Z0-9ivx]{1,4}[.)])|[-•●▪◦*])\s+/)
        const hang = marker ? marker[0].length : 0
        return (
          <div
            key={i}
            className="whitespace-pre-wrap"
            style={{ paddingLeft: `${lead + hang}ch`, textIndent: hang ? `-${hang}ch` : undefined }}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
