/** Site-wide constants shared by server and client components. */
export const SITE_NAME = 'Bhutan Indigenous Games and Sports Association';
export const SITE_SHORT = 'BIGSA';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bigsa.bt';

export const NAV = [
  { href: '/who-we-are', label: 'Who we are' },
  { href: '/sports', label: '12 Sports' },
  { href: '/forms', label: 'Forms' },
  { href: '/news', label: 'News' },
  { href: '/archives', label: 'Archives' },
  { href: '/vision-mission', label: 'Vision & mission' },
  { href: '/contact', label: 'Contact us' },
] as const;

export interface ShellData {
  sports: { slug: string; name: string; name_dz: string | null; has_content: boolean }[];
  contact: { address: string; postal: string; phone: string; email: string; hours: string } | null;
  social: { label: string; url: string }[];
  motto: string;
  nameDz: string;
}
