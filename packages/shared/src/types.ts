/** API response shapes shared by the public site and admin panel. */
import type { FormDefinition } from './forms';

export type Role = 'super_admin' | 'editor' | 'applications_officer';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Administrator',
  editor: 'Content editor',
  applications_officer: 'Applications officer',
};

/** What each role can manage. Enforced by the API; the admin UI mirrors it. */
export const PERMISSIONS = {
  content: ['super_admin', 'editor'] as Role[],
  applications: ['super_admin', 'applications_officer'] as Role[],
  messages: ['super_admin', 'editor', 'applications_officer'] as Role[],
  settings: ['super_admin', 'editor'] as Role[],
  users: ['super_admin'] as Role[],
  audit: ['super_admin'] as Role[],
};
export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role | undefined, p: Permission) => !!role && PERMISSIONS[p].includes(role);

export interface MediaRef {
  id: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  caption?: string | null;
  credit?: string | null;
}

export interface Fact { label: string; value: string; note?: string }
export interface ScoringRule { name: string; points: string; description: string }
export interface EquipmentItem { name: string; name_dz?: string; description: string; image_id?: string | null; image?: MediaRef | null }
export interface RuleSection { title: string; items: string[] }

export interface Sport {
  id: string;
  slug: string;
  name: string;
  name_dz: string | null;
  tagline: string | null;
  summary: string | null;
  history: string | null;
  how_to_play: string | null;
  cultural_significance: string | null;
  facts: Fact[];
  scoring: ScoringRule[];
  equipment: EquipmentItem[];
  rules: RuleSection[];
  video_url: string | null;
  cover: MediaRef | null;
  gallery: MediaRef[];
  sort_order: number;
  is_published: boolean;
  has_content: boolean;
}

export type NewsCategory = 'news' | 'announcement' | 'tournament' | 'training' | 'notice' | 'result';
export const NEWS_CATEGORIES: Record<NewsCategory, string> = {
  news: 'News',
  announcement: 'Announcement',
  tournament: 'Tournament',
  training: 'Training & courses',
  notice: 'Application notice',
  result: 'Results',
};

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: NewsCategory;
  cover: MediaRef | null;
  is_featured: boolean;
  status: 'draft' | 'published';
  published_at: string | null;
  sport: { slug: string; name: string } | null;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
  results: string | null;
  cover: MediaRef | null;
  gallery: MediaRef[];
  sport: { slug: string; name: string } | null;
  is_published: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  bio: string | null;
  responsibilities: string | null;
  email: string | null;
  phone: string | null;
  photo: MediaRef | null;
  sort_order: number;
  is_published: boolean;
}

export type ResourceCategory = 'rules' | 'standards' | 'framework' | 'guidelines' | 'forms' | 'policies' | 'reports' | 'publications' | 'notices';
export const RESOURCE_CATEGORIES: Record<ResourceCategory, string> = {
  rules: 'Rules & regulations',
  standards: 'Technical & safety standards',
  framework: 'Frameworks',
  guidelines: 'Guidelines',
  forms: 'Downloadable forms',
  policies: 'Policies',
  reports: 'Reports',
  publications: 'Publications',
  notices: 'Public notices',
};

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  sport: { slug: string; name: string } | null;
  file: { id: string; filename: string; mime: string; size: number } | null;
  download_count: number;
  is_featured: boolean;
  published_at: string;
}

export interface PublicForm {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  instructions: string | null;
  eligibility: string | null;
  requirements: string | null;
  faq: { q: string; a: string }[];
  contact_note: string | null;
  definition: FormDefinition;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  status: import('./forms').FormStatus;
  download: { id: string; filename: string } | null;
}

export interface SiteSettings {
  contact: {
    address: string;
    postal: string;
    phone: string;
    email: string;
    hours: string;
    map: { lat: number; lng: number };
  };
  social: { label: string; url: string }[];
  about: {
    intro: string;
    background: string;
    mandate: string;
    core_areas: string[];
    affiliations: { name: string; description: string }[];
    organisation: string;
  };
  vision: { vision: string; mission: string[]; values: { title: string; text: string }[] };
  motto: { en: string };
  /** Association name in Dzongkha, as on the logo. */
  name_dz: string;
  /** Keys of content that BIGSA still needs to supply or approve. */
  pending: string[];
}

export interface SearchHit {
  type: 'sport' | 'news' | 'event' | 'resource' | 'form';
  title: string;
  snippet: string;
  url: string;
  rank: number;
}

export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }

export interface HomeData {
  settings: SiteSettings;
  sports: Sport[];
  news: NewsItem[];
  upcoming: EventItem[];
  forms: PublicForm[];
  resources: Resource[];
  gallery: MediaRef[];
}

export const APPLICATION_STATUSES = ['received', 'under_review', 'needs_info', 'approved', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: 'Received',
  under_review: 'Under review',
  needs_info: 'More information needed',
  approved: 'Approved',
  rejected: 'Not approved',
  withdrawn: 'Withdrawn',
};

/** Labels for the pending checklist in the admin dashboard. */
export const PENDING_LABELS: Record<string, string> = {
  vision: 'Approve the draft vision, mission and values',
  'about.organisation': 'Add organisational information approved for public access',
  'about.affiliations': 'Confirm affiliations and partnerships',
  'about.core_areas': 'Confirm core areas of work (drafted from the rules documents)',
  social: 'Add links to approved social-media accounts',
  team: 'Add Who’s Who profiles (name, photo, designation, responsibilities)',
  'sports.content': 'Supply descriptions for the nine sports without content yet',
  'logo.vector': 'Supply the BIGSA logo as a vector file (SVG/AI/PDF)',
};
