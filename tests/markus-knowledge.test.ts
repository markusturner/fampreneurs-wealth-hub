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