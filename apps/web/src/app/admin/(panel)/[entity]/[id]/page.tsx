'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ENTITIES } from '@/admin/lib/entities';
import { EntityEditor } from '@/admin/components/Entity';

export default function Page({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = use(params);
  const cfg = ENTITIES[entity];
  if (!cfg) notFound();
  return <EntityEditor key={id} cfg={cfg} id={id} />;
}
