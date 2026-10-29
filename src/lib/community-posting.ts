// All is a combined feed. Category views are also the posting destination.
export function postingCategory(activeCategory: string, selectedCategory: string): string {
  return activeCategory !== 'all' && activeCategory !== 'coach' ? activeCategory : selectedCategory
}

export function hasEveryoneMention(content: string): boolean {
  return /(^|[^\w@])@everyone\b/i.test(content.replace(/<[^>]*>/g, ' '))
}