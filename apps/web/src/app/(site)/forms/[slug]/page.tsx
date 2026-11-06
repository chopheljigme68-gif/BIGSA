import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { FormPageView } from '@/views/ContentViews';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await api.form((await params).slug);
  return { title: form.title, description: form.summary ?? undefined };
}

export default async function Page({ params }: Props) {
  return <FormPageView data={await api.form((await params).slug)} />;
}
