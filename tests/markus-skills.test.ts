import { test, expect } from 'bun:test';
import { MARKUS_SKILLS, findSkill, skillSlug } from '../src/lib/markus-skills';

test('new skill link names never repeat an existing one', () => {
  expect(skillSlug('Map my assets', ['map-my-assets'])).toBe('map-my-assets-2');
  expect(skillSlug('Protect my rentals!')).toBe('protect-my-rentals');
});
test('skills open from the list the owner manages', () => {
  const custom = [{ id: 'custom', title: 'Custom', body: '', prompt: 'Do it' }];
  expect(findSkill('custom', custom)?.prompt).toBe('Do it');
  expect(findSkill('asset-map', custom)).toBeUndefined();
});
test('Ask Markus anything is the first skill', () => {
  expect(MARKUS_SKILLS[0].id).toBe('ask-markus');
  expect(MARKUS_SKILLS.length).toBe(17);
});
