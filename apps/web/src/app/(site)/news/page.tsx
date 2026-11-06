import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { NewsIndexView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'News', description: 'News, announcements, tournament notices and results from BIGSA.' };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function Page({ searchParams }: Props) {
  const { category, page } = await searchParams;
  const news = await api.news({ category, page: Number(page) || 1 });
  return <NewsIndexView data={{ news, category }} />;
}
