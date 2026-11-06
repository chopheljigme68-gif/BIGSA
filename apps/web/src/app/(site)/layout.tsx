import { SiteShell } from '@/components/SiteShell';
import { shellData } from '@/lib/shell';

/** Public website layout. No authentication anywhere under this group. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell data={await shellData()}>{children}</SiteShell>;
}
