const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

// A fixed time zone keeps server-rendered and hydrated text identical.
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
const shortDateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const shortDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' })

export function formatIDR(amount: number) {
  return idr.format(amount)
}

export function formatDateTime(value: string | null | undefined) {
  return value ? `${dateTime.format(new Date(value))} WIB` : '—'
}

export function formatShortDateTime(value: string | null | undefined) {
  return value ? shortDateTime.format(new Date(value)) : '—'
}

export function formatDay(isoDate: string) {
  return shortDay.format(new Date(`${isoDate}T12:00:00+07:00`))
}

export function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`
}

/** Groups digits so a VA number is easy to read aloud and type: 8808 1234 5678 9012. */
export function groupDigits(value: string) {
  return /^\d+$/.test(value) ? value.replace(/(\d{4})(?=\d)/g, '$1 ') : value
}

export function problemMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const data = (error as { data?: { detail?: string, message?: string, statusMessage?: string } })?.data
  return data?.detail ?? data?.statusMessage ?? data?.message ?? fallback
}
