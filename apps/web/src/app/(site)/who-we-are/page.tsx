import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { WhoWeAreView } from '@/views/AboutViews';

export const metadata: Metadata = { title: 'Who we are', description: 'BIGSA’s background, mandate, work and the people behind it.' };

export default async function Page() {
  const [settings, team] = await Promise.all([api.settings(), api.team()]);
  return <WhoWeAreView data={{ settings, team }} />;
}
