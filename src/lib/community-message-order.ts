export function chronologicalMessages<T extends { id: string; created_at: string }>(messages: T[]): T[] {
  return messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id.localeCompare(b.id))
}