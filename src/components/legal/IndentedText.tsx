// Renders agreement text so wrapped lines keep the indent of their first line.
export function IndentedText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => {
        const m = line.match(/^[ \t]*/)
        const lead = m ? m[0].replace(/\t/g, '    ').length : 0
        const content = line.slice(m ? m[0].length : 0)
        if (!content) return <div key={i} className="h-[1.5em]" />
        // List markers like "a.", "1)", "-", "•": wrapped text lines up with the text after the marker
        const marker = content.match(/^((?:\(?[a-zA-Z0-9ivx]{1,4}[.)])|[-•●▪◦*])\s+/)
        if (marker) {
          return (
            <div key={i} className="flex" style={{ paddingLeft: `${lead}ch` }}>
              <span className="shrink-0 whitespace-pre">{marker[1]} </span>
              <span className="whitespace-pre-wrap min-w-0">{content.slice(marker[0].length)}</span>
            </div>
          )
        }
        return (
          <div key={i} className="whitespace-pre-wrap" style={{ paddingLeft: `${lead}ch` }}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
