import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { SportView } from '@/views/SportsViews';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sport = await api.sport((await params).slug);
  return {
    title: sport.name,
    description: sport.summary ?? sport.tagline ?? `${sport.name}, an indigenous game of Bhutan.`,
    openGraph: sport.cover ? { images: [`/media/${sport.cover.id}?w=1600`] } : undefined,
  };
}

export default async function Page({ params }: Props) {
  return <SportView data={await api.sport((await params).slug)} />;
}
