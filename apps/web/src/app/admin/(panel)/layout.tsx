import { Shell } from '@/admin/components/Shell';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
