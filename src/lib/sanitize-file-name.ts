// Storage keys only reliably accept a safe ASCII subset. Phone/desktop file names
// often contain spaces, commas, parentheses, emoji or accents, which cause
// "Invalid key" upload errors. Normalize them before uploading.
export function sanitizeFileName(rawName: string): string {
  const dot = rawName.lastIndexOf('.')
  const rawBase = dot > 0 ? rawName.slice(0, dot) : rawName
  const rawExt = dot > 0 ? rawName.slice(dot + 1) : ''

  const base =
    rawBase
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80) || 'file'

  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)

  return ext ? `${base}.${ext}` : base
}
