export function normalizeSecurityPhone(value: string): string {
  const phone = value.replace(/[\s().-]/g, '')
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter your phone number with its country code, such as +1.')
  return phone
}

export function isSecurityCode(value: string): boolean {
  return /^\d{6}$/.test(value)
}