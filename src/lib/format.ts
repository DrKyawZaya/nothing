const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function formatNumber(n: number): string {
  return number.format(n)
}

export function formatMMK(n: number): string {
  return `${number.format(Math.round(n))} Ks`
}

export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseAmount(s: string): number {
  const ascii = s.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040))
  const n = Number(ascii.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}
