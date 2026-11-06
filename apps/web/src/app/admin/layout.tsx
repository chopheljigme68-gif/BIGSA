import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | BIGSA Admin' },
  robots: { index: false, follow: false },
};

/** Admin area. Styles are scoped under .a-root so they never leak into the public site. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="a-root">{children}</div>;
}
