import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { SportsIndexView } from '@/views/SportsViews';

export const metadata: Metadata = { title: '12 Sports', description: 'The indigenous games and sports of Bhutan: Dha, Khuru, Doegor, Ji-Dum, Sok-Sum and more.' };

export default async function Page() {
  return <SportsIndexView data={{ sports: await api.sports() }} />;
}
