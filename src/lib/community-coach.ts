export type CommunityCategory = { label: string; value: string; emoji: string }

export function withCoachMarkus(categories: CommunityCategory[]): CommunityCategory[] {
  const posts = categories.filter(category => category.value !== 'coach' && !/^coach markus(?: ai)?$/i.test(category.label.trim()))
  return [...posts, { label: 'Markus AI', value: 'coach', emoji: '' }]
}