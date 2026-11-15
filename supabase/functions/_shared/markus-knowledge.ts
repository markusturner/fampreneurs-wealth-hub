export const SOURCE_LIMIT = 10;
export const DAILY_CHARGE_USD = 0.25;
export const DAY_MS = 86_400_000;
// First YouTube import reaches back through the channel once; later runs only add new videos.
export const YOUTUBE_BACKFILL_LIMIT = 100;
export const BACKFILL_CHARGE_USD = 3;
export const FATHOM_RUN_LIMIT = 4;
export const DRIVE_RUN_LIMIT = 25;
export const FATHOM_HISTORY_DAYS = 3 * 365;

export function availableAt(published: string | null, observed: string): string {
  const timestamp = published ? Date.parse(published) : NaN;
  return new Date((Number.isFinite(timestamp) ? timestamp : Date.parse(observed)) + DAY_MS).toISOString();
}

export function teachingConfigReady(config: Record<string, unknown>): boolean {
  return typeof config.recorder_email === 'string' && config.recorder_email.includes('@') &&
    Array.isArray(config.titles) && config.titles.length > 0 && config.titles.every(t => typeof t === 'string' && t.trim());
}

export function approvedTeachingMeeting(meeting: Record<string, any>, config: Record<string, any>): boolean {
  if (!teachingConfigReady(config)) return false;
  const recorder = String(meeting.recorded_by?.email || '').toLowerCase();
  const title = String(meeting.meeting_title || meeting.title || '').trim().toLowerCase();
  return recorder === String(config.recorder_email).toLowerCase() && config.titles.some((t: string) => t.trim().toLowerCase() === title);
}

// Coaching calls match an owner-listed name exactly; sales calls match when the call name contains an owner-listed name.
export function fathomCallKind(meeting: Record<string, any>, config: Record<string, any>): 'teaching' | 'sales' | null {
  if (typeof config.recorder_email !== 'string' || !config.recorder_email.includes('@')) return null;
  const recorder = String(meeting.recorded_by?.email || '').toLowerCase();
  if (recorder !== config.recorder_email.toLowerCase()) return null;
  if (approvedTeachingMeeting(meeting, config)) return 'teaching';
  const title = String(meeting.meeting_title || meeting.title || '').trim().toLowerCase();
  const sales = Array.isArray(config.sales_titles) ? config.sales_titles : [];
  return title && sales.some((t: unknown) => typeof t === 'string' && t.trim().length >= 3 && title.includes(t.trim().toLowerCase())) ? 'sales' : null;
}

// Accepts a Drive folder link or a bare folder ID.
export function driveFolderId(value: string): string | null {
  const text = value.trim();
  const match = text.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || text.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || text.match(/^([A-Za-z0-9_-]{10,})$/);
  return match ? match[1] : null;
}

export const DRIVE_EXPORTS: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.presentation': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
};
export const DRIVE_TEXT_TYPES = ['text/plain', 'text/markdown', 'text/csv'];

export function cleanList(values: unknown, max = 50): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((v): v is string => typeof v === 'string').map(v => v.trim().slice(0, 200)).filter(Boolean))].slice(0, max);
}

export function actorFor(platform: string, profile: string, config: Record<string, unknown>, backfill = false) {
  switch (platform) {
    case 'youtube': return { id: 'influship~youtube-channel-transcripts', input: { handle: config.handle, videoLimit: backfill ? YOUTUBE_BACKFILL_LIMIT : SOURCE_LIMIT, sortBy: 'newest', language: 'en', includeSegments: false } };
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
  let parsedUrl: URL;
  try { parsedUrl = new URL(value.url); } catch { return null; }
  const allowed = { youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'], instagram: ['instagram.com', 'www.instagram.com'], tiktok: ['tiktok.com', 'www.tiktok.com'], linkedin: ['linkedin.com', 'www.linkedin.com'] }[platform];
  if (parsedUrl.protocol !== 'https:' || !allowed?.includes(parsedUrl.hostname)) return null;
  const published = typeof value.date === 'string' && Number.isFinite(Date.parse(value.date)) ? new Date(value.date).toISOString() : null;
  return { external_id: String(value.id), title: String(value.title || platform).slice(0, 255), source_url: value.url, published_at: published, observed_at: observed, available_at: availableAt(published, observed), content: value.text.trim().slice(0, 150000), owner: value.owner };
}