import { test, expect } from 'bun:test';
import { availableAt, teachingConfigReady, approvedTeachingMeeting, actorFor, normalizeSocial, DAILY_CHARGE_USD } from '../supabase/functions/_shared/markus-knowledge';

test('knowledge waits one day after publication', () => {
  expect(availableAt('2026-10-21T12:00:00Z', '2026-10-21T15:00:00Z')).toBe('2026-10-22T12:00:00.000Z');
});
test('unknown publication dates wait one day after discovery', () => {
  expect(availableAt(null, '2026-10-21T15:00:00Z')).toBe('2026-10-22T15:00:00.000Z');
});
test('teaching imports require both recorder identity and exact titles', () => {
  expect(teachingConfigReady({ recorder_email: 'markus@example.com' })).toBe(false);
  expect(teachingConfigReady({ recorder_email: 'markus@example.com', titles: ['Teaching'] })).toBe(true);
});
test('only approved names recorded by Markus are teaching imports', () => {
  const config = { recorder_email: 'markusturner94@gmail.com', titles: ['Q&A Accountability Call', 'The Private Estate Accelerator', 'The Trust Vault', 'VIP Weekend', 'The Family Business Accelerator'] };
  for (const title of config.titles) expect(approvedTeachingMeeting({ title, recorded_by: { email: config.recorder_email } }, config)).toBe(true);
  expect(approvedTeachingMeeting({ title: 'VIP Weekend Private Client', recorded_by: { email: config.recorder_email } }, config)).toBe(false);
  expect(approvedTeachingMeeting({ title: 'VIP Weekend', recorded_by: { email: 'someone@example.com' } }, config)).toBe(false);
});
test('social imports are bounded to ten owner posts without comments or reposts', () => {
  const actor = actorFor('linkedin', 'https://www.linkedin.com/in/markusturner/', {});
  expect(actor.input).toMatchObject({ maxPosts: 10, includeReposts: false, scrapeComments: false });
  expect(DAILY_CHARGE_USD).toBe(0.25);
});
test('TikTok captions are not presented as spoken transcripts', () => {
  const post = normalizeSocial('tiktok', { id: '1', webVideoUrl: 'https://www.tiktok.com/@markusturnerofficial/video/1', text: 'Caption only', createTimeISO: '2026-10-20T00:00:00Z' }, '2026-10-21T00:00:00Z');
  expect(post?.title).toBe('TikTok caption');
  expect(post?.content).toBe('Caption only');
});
test('failed or empty transcript results never become knowledge', () => {
  expect(normalizeSocial('youtube', { video_id: '1', url: 'https://youtube.com/watch?v=1', error: 'No captions' }, '2026-10-21T00:00:00Z')).toBeNull();
});
test('invalid source URLs are rejected', () => {
  expect(normalizeSocial('instagram', { id: '1', caption: 'Teaching', url: 'not a URL' }, '2026-10-21T00:00:00Z')).toBeNull();
  expect(normalizeSocial('instagram', { id: '1', caption: 'Teaching', url: 'https://example.com/post' }, '2026-10-21T00:00:00Z')).toBeNull();
});
test('documented YouTube, Instagram and LinkedIn text is retained', () => {
  expect(normalizeSocial('youtube', { video_id: '1', title: 'Trusts', url: 'https://www.youtube.com/watch?v=1', full_text: 'YouTube teaching' }, '2026-10-21T00:00:00Z')?.content).toBe('YouTube teaching');
  expect(normalizeSocial('instagram', { id: '2', url: 'https://www.instagram.com/p/2/', caption: 'Instagram teaching', ownerUsername: 'markusturnerofficial' }, '2026-10-21T00:00:00Z')?.owner).toBe('markusturnerofficial');
  expect(normalizeSocial('linkedin', { id: '3', linkedinUrl: 'https://www.linkedin.com/posts/3', content: 'LinkedIn teaching', author: { publicIdentifier: 'markusturner' } }, '2026-10-21T00:00:00Z')?.content).toBe('LinkedIn teaching');
});
import { fathomCallKind, driveFolderId, cleanList, YOUTUBE_BACKFILL_LIMIT, BACKFILL_CHARGE_USD } from '../supabase/functions/_shared/markus-knowledge';
const callConfig = { recorder_email: 'markusturner94@gmail.com', titles: ['The Trust Vault'], sales_titles: ['Strategy Call'] };
test('coaching calls need an exact owner-listed name', () => {
  expect(fathomCallKind({ title: 'The Trust Vault', recorded_by: { email: 'markusturner94@gmail.com' } }, callConfig)).toBe('teaching');
  expect(fathomCallKind({ title: 'The Trust Vault Private', recorded_by: { email: 'markusturner94@gmail.com' } }, callConfig)).toBeNull();
});
test('sales calls match when the call name includes an owner-listed name', () => {
  expect(fathomCallKind({ meeting_title: 'Strategy Call with Jane Doe', recorded_by: { email: 'markusturner94@gmail.com' } }, callConfig)).toBe('sales');
  expect(fathomCallKind({ meeting_title: 'Weekly team sync', recorded_by: { email: 'markusturner94@gmail.com' } }, callConfig)).toBeNull();
});
test('calls recorded by someone other than Markus are never imported', () => {
  expect(fathomCallKind({ meeting_title: 'Strategy Call with Jane', recorded_by: { email: 'other@example.com' } }, callConfig)).toBeNull();
});
test('sales names shorter than three letters never match everything', () => {
  expect(fathomCallKind({ meeting_title: 'Anything at all', recorded_by: { email: 'markusturner94@gmail.com' } }, { ...callConfig, sales_titles: ['a'] })).toBeNull();
});
test('Drive folder links and IDs are both accepted', () => {
  expect(driveFolderId('https://drive.google.com/drive/folders/1PQKd3-6swwArPpPOuiqqyj9-Q2SXvpkW?usp=sharing')).toBe('1PQKd3-6swwArPpPOuiqqyj9-Q2SXvpkW');
  expect(driveFolderId('1PQKd3-6swwArPpPOuiqqyj9-Q2SXvpkW')).toBe('1PQKd3-6swwArPpPOuiqqyj9-Q2SXvpkW');
  expect(driveFolderId('https://example.com')).toBeNull();
});
test('the first YouTube import reaches back 100 videos with a $3 cap', () => {
  const actor = actorFor('youtube', 'https://www.youtube.com/@markusturner', { handle: '@markusturner' }, true);
  expect(actor.input.videoLimit).toBe(YOUTUBE_BACKFILL_LIMIT);
  expect(YOUTUBE_BACKFILL_LIMIT).toBe(100);
  expect(BACKFILL_CHARGE_USD).toBe(3);
  expect(actorFor('youtube', 'https://www.youtube.com/@markusturner', { handle: '@markusturner' }).input.videoLimit).toBe(10);
});
test('call name lists drop blanks and duplicates', () => {
  expect(cleanList([' The Trust Vault ', 'The Trust Vault', '', 5])).toEqual(['The Trust Vault']);
});
