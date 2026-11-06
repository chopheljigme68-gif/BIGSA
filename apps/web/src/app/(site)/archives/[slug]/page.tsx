import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { EventView } from '@/views/ContentViews';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await api.event((await params).slug);
  return { title: e.title, description: e.summary ?? undefined, openGraph: e.cover ? { images: [`/media/${e.cover.id}?w=1600`] } : undefined };
}

export default async function Page({ params }: Props) {
  return <EventView data={await api.event((await params).slug)} />;
}
