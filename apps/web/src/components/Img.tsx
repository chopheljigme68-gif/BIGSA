import type { MediaRef } from '@bigsa/shared';

/**
 * Responsive image from the media store. Serves pre-sized WebP variants
 * (480/960/1600) with a JPEG fallback, lazy by default — tuned for slow links.
 */
export function Img({
  media,
  sizes = '100vw',
  priority = false,
  className,
  alt,
}: {
  media: MediaRef | null | undefined;
  sizes?: string;
  priority?: boolean;
  className?: string;
  alt?: string;
}) {
  if (!media) return null;
  const src = `/media/${media.id}`;
  const widths = [480, 960, 1600].filter((w) => !media.width || w < media.width + 200);
  return (
    <img
      className={className}
      src={`${src}?w=960`}
      srcSet={widths.map((w) => `${src}?w=${w} ${w}w`).join(', ')}
      sizes={sizes}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      alt={alt ?? media.alt ?? ''}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
