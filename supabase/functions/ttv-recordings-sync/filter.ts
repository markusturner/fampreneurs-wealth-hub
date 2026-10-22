export function isTrustVaultRecording(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.includes('family business accelerator') || normalized.includes('private estate accelerator')) return false;
  return /\bq\s*&\s*a accountability calls?\b/.test(normalized);
}