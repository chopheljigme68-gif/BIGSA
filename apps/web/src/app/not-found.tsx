import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { shellData } from '@/lib/shell';
import u from '@/components/ui.module.css';

export default async function NotFound() {
  return (
    <SiteShell data={await shellData()}>
      <section className={u.pageHead}>
        <div className="container">
          <h1 className={`display ${u.pageHeadTitle}`}>That page isn’t here</h1>
          <p className={u.pageHeadLede}>It may have moved or been removed. Try searching, or start from the home page.</p>
          <p style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className={`${u.btn} ${u.primary}`}>Go to the home page</Link>
            <Link href="/search" className={`${u.btn} ${u.ghost}`}>Search the site</Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
