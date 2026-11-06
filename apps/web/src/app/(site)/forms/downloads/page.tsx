import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { DownloadsView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'Rules and downloads', description: 'Rules and regulations, safety standards, frameworks and forms from BIGSA.' };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function Page({ searchParams }: Props) {
  const { q, category, sport } = await searchParams;
  const [resources, sports] = await Promise.all([api.resources({ q, category, sport }), api.sports()]);
  return <DownloadsView data={{ resources, q, category, sport, sports: sports.map((s) => ({ slug: s.slug, name: s.name })) }} />;
}
