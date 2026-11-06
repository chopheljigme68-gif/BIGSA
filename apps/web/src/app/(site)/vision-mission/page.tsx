import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { VisionMissionView } from '@/views/AboutViews';

export const metadata: Metadata = { title: 'Vision & mission', description: 'What BIGSA is working towards for Bhutan’s indigenous games and sports.' };

export default async function Page() {
  return <VisionMissionView data={{ settings: await api.settings() }} />;
}
