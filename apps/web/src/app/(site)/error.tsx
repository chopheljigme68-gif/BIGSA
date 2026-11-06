'use client';

import u from '@/components/ui.module.css';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className={u.pageHead}>
      <div className="container">
        <h1 className={`display ${u.pageHeadTitle}`}>This page didn’t load</h1>
        <p className={u.pageHeadLede}>The site couldn’t reach its data just now. Try again in a moment.</p>
        <p style={{ marginTop: 32 }}>
          <button type="button" onClick={reset} className={`${u.btn} ${u.primary}`}>Try again</button>
        </p>
      </div>
    </section>
  );
}
