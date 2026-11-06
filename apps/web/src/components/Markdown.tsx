import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '@bigsa/shared';

function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'strong':
        return <strong key={i}>{inline(n.c)}</strong>;
      case 'em':
        return <em key={i}>{inline(n.c)}</em>;
      case 'br':
        return <br key={i} />;
      case 'link': {
        const external = /^https?:/.test(n.href);
        return (
          <a key={i} href={n.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {inline(n.c)}
          </a>
        );
      }
    }
  });
}

/** Renders the safe markdown subset used in news and event bodies. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source ?? '');
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return <h2 key={i}>{inline(b.c)}</h2>;
          case 'h3':
            return <h3 key={i}>{inline(b.c)}</h3>;
          case 'quote':
            return <blockquote key={i}>{inline(b.c)}</blockquote>;
          case 'ul':
            return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
          case 'ol':
            return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>;
          default:
            return <p key={i}>{inline(b.c)}</p>;
        }
      })}
    </div>
  );
}

/** Plain paragraphs from text with blank-line breaks (sport histories etc.). */
export function Paragraphs({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
