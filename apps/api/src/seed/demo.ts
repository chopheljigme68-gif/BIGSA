/**
 * SAMPLE content for design review only (seeded with `--demo`).
 * Every item says it is a sample. Delete these from the admin panel and
 * publish real news and events before launch.
 */
export const DEMO_NEWS = [
  {
    slug: 'sample-new-website',
    title: 'BIGSA launches its new official website',
    excerpt: 'Rules, forms, news and the archive of Bhutan’s indigenous games and sports now live in one place. (Sample article.)',
    body: 'This is a **sample article** created for design review. Replace it with real news from the admin panel before launch.\n\nThe new website brings together the rules and regulations for traditional archery, khuru and doegor, online tournament entry forms, and a growing archive of Bhutan’s indigenous games and sports.\n\n## What you can do on the site\n\n- Read the rules for each sport and download them as PDFs\n- Enter a team in a tournament online and get a reference number straight away\n- Follow news, announcements and results',
    category: 'announcement',
    sport: null as string | null,
    cover: 'archery-target-with-gibsi.jpg',
    featured: true,
    daysAgo: 1,
  },
  {
    slug: 'sample-team-entries-open',
    title: 'Team entries open for the khuru tournament',
    excerpt: 'Captains can now enter teams of eight online. (Sample notice.)',
    body: 'This is a **sample notice** for design review.\n\nTeam captains can enter their team using the online form. Have every player’s name, CID number and a scan of their CID ready.',
    category: 'notice',
    sport: 'khuru',
    cover: 'khuru-throw.jpg',
    featured: false,
    daysAgo: 4,
  },
  {
    slug: 'sample-archery-safety',
    title: 'Archery safety rules: what every Bacho must have',
    excerpt: 'A reminder of the minimum length, walls and barriers for safe archery ranges. (Sample article.)',
    body: 'This is a **sample article** for design review.\n\nA Bacho should ideally be 200 metres long, with 25 metres of safe distance behind each target. Where that is not possible, a 6-metre wall topped with 2 metres of fine wire mesh is required behind each target.',
    category: 'news',
    sport: 'dha-traditional-archery',
    cover: 'archery-range-wide.jpg',
    featured: false,
    daysAgo: 9,
  },
  {
    slug: 'sample-doegor-results',
    title: 'Results from the open doegor tournament',
    excerpt: 'Final standings after three days of play. (Sample results.)',
    body: 'This is a **sample results post** for design review.',
    category: 'result',
    sport: 'doegor',
    cover: 'doegor-match.jpg',
    featured: false,
    daysAgo: 20,
  },
];

export const DEMO_EVENTS = [
  { slug: 'sample-national-archery-tournament', title: 'National Archery Tournament (sample)', summary: 'Sample upcoming event for design review.', body: 'Sample event. Replace with real dates and venue.', venue: 'Changlimithang Archery Ground, Thimphu', sport: 'dha-traditional-archery', startDay: 12, endDay: 18, cover: 'archery-release.jpg', gallery: [] as string[] },
  { slug: 'sample-open-khuru-tournament', title: 'Open Khuru Tournament (sample)', summary: 'Sample upcoming event for design review.', body: 'Sample event. Replace with real dates and venue.', venue: 'Thimphu', sport: 'khuru', startDay: 30, endDay: 33, cover: 'khuru-players.jpg', gallery: [] as string[] },
  { slug: 'sample-doegor-championship', title: 'Doegor Championship (sample)', summary: 'Sample past event for design review.', body: 'Sample event for the archive.', venue: 'Thimphu', sport: 'doegor', startDay: -40, endDay: -38, cover: 'doegor-players.jpg', results: 'Sample results.', gallery: ['doegor-match.jpg', 'doegor-stones.jpg'] },
  { slug: 'sample-archery-league', title: 'Archery League Finals (sample)', summary: 'Sample past event for design review.', body: 'Sample event for the archive.', venue: 'Thimphu', sport: 'dha-traditional-archery', startDay: -120, endDay: -118, cover: 'archery-winning-team.jpg', results: 'Sample results.', gallery: ['archery-victory-celebration.jpg', 'archery-team-dachham.jpg', 'archery-dachham-singers.jpg'] },
  { slug: 'sample-khuru-women', title: 'Women’s Khuru Tournament (sample)', summary: 'Sample past event for design review.', body: 'Sample event for the archive.', venue: 'Paro', sport: 'khuru', startDay: -300, endDay: -298, cover: 'khuru-team.jpg', results: null, gallery: ['khuru-dachham.jpg'] },
] as { slug: string; title: string; summary: string; body: string; venue: string; sport: string; startDay: number; endDay: number; cover: string; gallery?: string[]; results?: string | null }[];
