'use client';

import { useEffect, useState } from 'react';
import s from './share.module.css';

/** Social sharing without third-party scripts or trackers. */
export function ShareLinks({ title }: { title: string }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => {
    setUrl(window.location.href);
    setCanNative(typeof navigator.share === 'function');
  }, []);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  return (
    <div className={s.share}>
      <p className={s.label}>Share</p>
      <ul>
        {canNative ? (
          <li>
            <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})}>
              Share…
            </button>
          </li>
        ) : null}
        <li>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        </li>
        <li>
          <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </li>
        <li>
          <a href={`https://twitter.com/intent/tweet?text=${t}&url=${u}`} target="_blank" rel="noopener noreferrer">X</a>
        </li>
        <li>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </li>
      </ul>
    </div>
  );
}
