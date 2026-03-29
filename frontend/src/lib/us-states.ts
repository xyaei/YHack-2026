export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

const STATE_ORDER = new Map<string, number>(US_STATE_CODES.map((c, i) => [c, i]))

export function sortStateCodes(codes: string[]) {
  return [...codes].sort((a, b) => (STATE_ORDER.get(a) ?? 99) - (STATE_ORDER.get(b) ?? 99))
}

export function allStatesSelected(codes: string[]) {
  return US_STATE_CODES.every((c) => codes.includes(c))
}
