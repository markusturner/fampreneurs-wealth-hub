export const SOURCE_LIMIT = 10;
export const DAILY_CHARGE_USD = 0.25;
export const DAY_MS = 86_400_000;

export function availableAt(published: string | null, observed: string): string {
  const timestamp = published ? Date.parse(published) : NaN;
  return new Date((Number.isFinite(timestamp) ? timestamp : Date.parse(observed)) + DAY_MS).toISOString();
}

export function teachingConfigReady(config: Record<string, unknown>): boolean {
  return typeof config.recorder_email === 'string' && config.recorder_email.includes('@') &&
    typeof config.meeting_type === 'string' && config.meeting_type.trim().length > 0;
}

export function actorFor(platform: string, profile: string, config: Record<string, unknown>) {
  switch (platform) {
    case 'youtube': return { id: 'influship~youtube-channel-transcripts', input: { handle: config.handle, videoLimit: SOURCE_LIMIT, sortBy: 'newest', language: 'en', includeSegments: false } };
    case 'instagram': return { id: 'apify~instagram-scraper', input: { directUrls: [profile], resultsType: 'posts', resultsLimit: SOURCE_LIMIT } };
    case 'tiktok': return { id: 'clockworks~tiktok-scraper', input: { profiles: [config.handle], resultsPerPage: SOURCE_LIMIT, profileScrapeSections: ['videos'], profileSorting: 'latest', shouldDownloadVideos: false } };
    case 'linkedin': return { id: 'harvestapi~linkedin-profile-posts', input: { targetUrls: [profile], maxPosts: SOURCE_LIMIT, includeQuotePosts: false, includeReposts: false, scrapeComments: false, scrapeReactions: false } };
    default: throw new Error('Unsupported social source');
  }
}

export function normalizeSocial(platform: string, item: Record<string, any>, observed: string) {
  if (item.error || item.errorCode) return null;
  const map: Record<string, { id: unknown; title: unknown; url: unknown; date: unknown; text: unknown; owner: unknown }> = {
    youtube: { id: item.video_id, title: item.title, url: item.url, date: null, text: item.full_text, owner: null },
    instagram: { id: item.id ?? item.shortCode, title: 'Instagram post', url: item.url, date: item.timestamp, text: item.caption, owner: item.ownerUsername },
    tiktok: { id: item.id, title: 'TikTok caption', url: item.webVideoUrl, date: item.createTimeISO, text: item.text, owner: item.authorMeta?.name },
    linkedin: { id: item.id, title: 'LinkedIn post', url: item.linkedinUrl, date: item.postedAt?.date, text: item.content, owner: item.author?.publicIdentifier },
  };
  const value = map[platform];
  if (!value?.id || typeof value.text !== 'string' || !value.text.trim() || typeof value.url !== 'string') return null;
  const parsedUrl = new URL(value.url);
  const allowed = { youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'], instagram: ['instagram.com', 'www.instagram.com'], tiktok: ['tiktok.com', 'www.tiktok.com'], linkedin: ['linkedin.com', 'www.linkedin.com'] }[platform];
  if (parsedUrl.protocol !== 'https:' || !allowed?.includes(parsedUrl.hostname)) return null;
  const published = typeof value.date === 'string' && Number.isFinite(Date.parse(value.date)) ? new Date(value.date).toISOString() : null;
  return { external_id: String(value.id), title: String(value.title || platform).slice(0, 255), source_url: value.url, published_at: published, observed_at: observed, available_at: availableAt(published, observed), content: value.text.trim().slice(0, 150000), owner: value.owner };
}