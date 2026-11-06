import 'server-only';
import { api } from './api';
import type { ShellData } from './site';

/** Header/footer data for public pages. An API outage degrades the chrome instead of failing the page. */
export async function shellData(): Promise<ShellData> {
  try {
    const [settings, sports] = await Promise.all([api.settings(), api.sports()]);
    return {
      sports: sports.map((s) => ({ slug: s.slug, name: s.name, name_dz: s.name_dz, has_content: s.has_content })),
      contact: settings.contact,
      social: settings.social ?? [],
      motto: settings.motto?.en ?? '',
      nameDz: settings.name_dz ?? '',
    };
  } catch (err) {
    console.error('[web] shell data unavailable', err);
    return { sports: [], contact: null, social: [], motto: 'A nation stays alive, when its culture stays alive.', nameDz: '' };
  }
}
