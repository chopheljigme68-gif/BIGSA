import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { SearchView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function Page({ searchParams }: Props) {
  const { q = '', type } = await searchParams;
  const hits = q.trim() ? await api.search(q.trim().slice(0, 100)) : [];
  return <SearchView data={{ q, type, hits }} />;
}
