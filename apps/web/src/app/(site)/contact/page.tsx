import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ContactView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'Contact us', description: 'Contact the BIGSA office at Changlimithang, Thimphu.' };

export default async function Page() {
  return <ContactView data={{ settings: await api.settings() }} />;
}
