import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ArticleView } from '@/views/ContentViews';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await api.article((await params).slug);
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    openGraph: { type: 'article', publishedTime: a.published_at ?? undefined, images: a.cover ? [`/media/${a.cover.id}?w=1600`] : undefined },
  };
}

export default async function Page({ params }: Props) {
  return <ArticleView data={await api.article((await params).slug)} />;
}
