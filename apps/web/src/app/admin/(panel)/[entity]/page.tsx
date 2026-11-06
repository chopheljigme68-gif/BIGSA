'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ENTITIES } from '@/admin/lib/entities';
import { EntityList } from '@/admin/components/Entity';

export default function Page({ params }: { params: Promise<{ entity: string }> }) {
  const cfg = ENTITIES[use(params).entity];
  if (!cfg) notFound();
  return <EntityList cfg={cfg} />;
}
