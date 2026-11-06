import { api } from '@/lib/api';
import { HomeView } from '@/views/HomeView';

export const revalidate = 300;

export default async function HomePage() {
  return <HomeView data={await api.home()} />;
}
