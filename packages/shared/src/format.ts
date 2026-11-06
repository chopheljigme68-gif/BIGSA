/** Formatting helpers. Dates render in Bhutan Time (UTC+6) regardless of server zone. */
export const TIME_ZONE = 'Asia/Thimphu';

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, ...opts }).format(new Date(iso));
}

export function formatDateRange(start: string, end?: string | null): string {
  if (!end) return formatDate(start);
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const sameMonth = sameYear && formatDate(start, { month: 'short' }) === formatDate(end, { month: 'short' });
  if (formatDate(start) === formatDate(end)) return formatDate(start);
  if (sameMonth) return `${formatDate(start, { day: 'numeric' })}–${formatDate(end)}`;
  if (sameYear) return `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Plain-text excerpt from the lightweight markdown used in news/event bodies. */
export function excerpt(md: string, length = 180): string {
  const plain = md.replace(/[#>*_`\[\]]/g, '').replace(/\(([^)]+)\)/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > length ? plain.slice(0, plain.lastIndexOf(' ', length)) + '…' : plain;
}
