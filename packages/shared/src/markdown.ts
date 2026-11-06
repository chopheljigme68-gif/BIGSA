/**
 * Minimal, safe markdown for news and event bodies.
 *
 * Supports: ## / ### headings, paragraphs, - / 1. lists, > quotes,
 * **bold**, *italic*, [links](https://…) and line breaks. Produces a small
 * AST that each app renders as React elements — no raw HTML ever reaches
 * the page, so editors cannot inject scripts.
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] }
  | { t: 'br' };

export type Block =
  | { t: 'h2' | 'h3' | 'p' | 'quote'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] };

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\*\*(.+?)\*\*/s))) {
      flush();
      out.push({ t: 'strong', c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = rest.match(/^\*(?!\s)(.+?)\*/s)) || (m = rest.match(/^_(?!\s)(.+?)_/s))) {
      flush();
      out.push({ t: 'em', c: parseInline(m[1]) });
      i += m[0].length;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      flush();
      if (SAFE_HREF.test(m[2])) out.push({ t: 'link', href: m[2], c: parseInline(m[1]) });
      else out.push({ t: 'text', v: m[1] });
      i += m[0].length;
    } else if (rest[0] === '\n') {
      flush();
      out.push({ t: 'br' });
      i += 1;
    } else {
      buf += rest[0];
      i += 1;
    }
  }
  flush();
  return out;
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  const chunks = md.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    const lines = chunk.split('\n');
    if (/^###\s+/.test(chunk)) blocks.push({ t: 'h3', c: parseInline(chunk.replace(/^###\s+/, '')) });
    else if (/^##?\s+/.test(chunk)) blocks.push({ t: 'h2', c: parseInline(chunk.replace(/^##?\s+/, '')) });
    else if (lines.every((l) => /^\s*[-*]\s+/.test(l))) blocks.push({ t: 'ul', items: lines.map((l) => parseInline(l.replace(/^\s*[-*]\s+/, ''))) });
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) blocks.push({ t: 'ol', items: lines.map((l) => parseInline(l.replace(/^\s*\d+[.)]\s+/, ''))) });
    else if (lines.every((l) => /^>\s?/.test(l))) blocks.push({ t: 'quote', c: parseInline(lines.map((l) => l.replace(/^>\s?/, '')).join('\n')) });
    else blocks.push({ t: 'p', c: parseInline(chunk) });
  }
  return blocks;
}
