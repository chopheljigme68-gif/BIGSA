import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ArchivesView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'Archives', description: 'Tournaments and events, upcoming and past, with results and photographs.' };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const when = sp.when === 'upcoming' || sp.when === 'past' ? sp.when : 'all';
  const year = Number(sp.year) || undefined;
  const [events, sports] = await Promise.all([api.events({ when, sport: sp.sport, year, page: Number(sp.page) || 1 }), api.sports()]);
  return <ArchivesView data={{ events, when, sport: sp.sport, year, sports: sports.map((s) => ({ slug: s.slug, name: s.name })) }} />;
}
