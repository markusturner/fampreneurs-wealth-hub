// Adds a trademark mark after every visible "TruHeirs" and "Markus AI" without changing stored data or program checks.
// Skips names inside emails, domains and links (e.g. support@truheirs.com, truheirs.app/x).
const MARK = /(?<![\w@./-])(TruHeirs|Markus AI)(?![\w™@/-]|\.\w)/gi
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT'])

export function addTrademarks(text: string) { return text.replace(MARK, '$1™') }

function fixNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement
    if (!p || SKIP.has(p.tagName) || p.closest('[contenteditable="true"]')) return
    const v = node.nodeValue ?? ''
    MARK.lastIndex = 0
    if (MARK.test(v)) node.nodeValue = addTrademarks(v)
    return
  }
  if (node.nodeType === Node.ELEMENT_NODE && !SKIP.has((node as Element).tagName)) node.childNodes.forEach(fixNode)
}

export function startTrademarks() {
  if (typeof document === 'undefined') return
  fixNode(document.body)
  if (MARK.test(document.title)) document.title = addTrademarks(document.title)
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixNode(m.target)
      else m.addedNodes.forEach(fixNode)
    }
    MARK.lastIndex = 0
    if (MARK.test(document.title)) document.title = addTrademarks(document.title)
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
}
