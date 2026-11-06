import type { Metadata, Viewport } from 'next';
import { Archivo, Lora, Noto_Serif_Tibetan } from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
// Dzongkha names (Tibetan script). Loaded only when a page uses .dz text.
const tibetan = Noto_Serif_Tibetan({ subsets: ['tibetan'], weight: ['400'], variable: '--font-tibetan', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} (BIGSA)`, template: `%s | BIGSA` },
  description: 'The Bhutan Indigenous Games and Sports Association promotes, develops and regulates Bhutan’s indigenous games and sports: Dha, Khuru, Doegor and more.',
  openGraph: { type: 'website', siteName: 'BIGSA', locale: 'en_BT' },
  icons: { icon: '/brand/icon-192.png', apple: '/brand/icon-192.png' },
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

/**
 * Root layout: fonts and base styles only.
 *   app/(site)/  public website — open to every visitor, no sign-in
 *   app/admin/   admin panel — the only place that asks for a sign-in
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${lora.variable} ${tibetan.variable}`}>
      <body>{children}</body>
    </html>
  );
}
