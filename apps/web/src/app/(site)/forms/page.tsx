import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { FormsView } from '@/views/ContentViews';

export const metadata: Metadata = { title: 'Forms', description: 'Apply online for BIGSA tournaments and services.' };

export default async function Page() {
  return <FormsView data={{ forms: await api.forms() }} />;
}
