export type Birthday = { year: number; month: number; day: number }

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function formatBirthday({ year, month, day }: Birthday): string {
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-")
}

export function parseBirthday(value: string, today = new Date()): Birthday | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  const year = Number(y), month = Number(m), day = Number(d)
  if (year < 1900 || year > today.getFullYear() || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  if (year === today.getFullYear() && (month > today.getMonth() + 1 || (month === today.getMonth() + 1 && day > today.getDate()))) return null
  return { year, month, day }
}

export function birthdayAge(value: string, today = new Date()): number | null {
  const date = parseBirthday(value, today)
  if (!date) return null
  const birthdayPassed = today.getMonth() + 1 > date.month ||
    (today.getMonth() + 1 === date.month && today.getDate() >= date.day)
  return today.getFullYear() - date.year - (birthdayPassed ? 0 : 1)
}
