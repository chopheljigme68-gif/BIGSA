'use client';

import { use } from 'react';
import { FormBuilder } from '@/admin/components/FormBuilder';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FormBuilder key={id} id={id} />;
}
