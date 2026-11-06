/**
 * Site settings and online forms seeded on first install.
 *
 * Sources: BIGSA Website ToR (14.09.26) and the "From Sangay Duba" document.
 * Anything BIGSA has not yet supplied is listed in `pending` so the admin
 * dashboard can show a "needs BIGSA content" checklist. Draft wording is
 * clearly marked as such in the admin panel and must be approved before launch.
 */
import type { SiteSettings, FormDefinition, FormField } from '@bigsa/shared';

export const SETTINGS: SiteSettings = {
  motto: { en: 'A nation stays alive, when its culture stays alive.' },
  name_dz: 'འབྲུག་རང་ལུགས་རྩེད་རིགས་ཚོགས་པ།',
  contact: {
    address: 'Changlimithang, Thimphu, Bhutan',
    postal: 'P.O. Box 939, Thimphu',
    phone: '+975 2 332834',
    email: 'bigsabt@gmail.com',
    hours: 'Monday to Friday, 9:00 to 17:00',
    map: { lat: 27.4686, lng: 89.6417 },
  },
  social: [],
  about: {
    intro:
      'The Bhutan Indigenous Games and Sports Association (BIGSA) is mandated to promote, develop and regulate Bhutan’s indigenous games and sports.',
    background:
      'Bhutan is rich in culture, and that culture sets the country apart and supports its sovereignty. Gross National Happiness stands on four pillars, and the preservation and promotion of culture is one of them. Traditional sports are part of that culture: archery, khuru, doegor, soksum, jidum and many others. BIGSA conducts annual tournaments of archery, khuru and doegor, sets the rules they are played by, and keeps the record of how Bhutan’s games are played.',
    mandate: 'To promote, develop and regulate Bhutan’s indigenous games and sports.',
    core_areas: [
      'Setting and publishing the rules and regulations for indigenous games and sports',
      'Organising national and open tournaments in archery, khuru and doegor',
      'Setting safety standards for archery ranges and play areas',
      'Documenting and archiving Bhutan’s indigenous games and sports',
      'Training and accrediting officials such as Thrimpons (umpires)',
    ],
    affiliations: [
      { name: 'Bhutan Olympic Committee', description: 'BIGSA works within the national sports framework coordinated by the Bhutan Olympic Committee.' },
    ],
    organisation: '',
  },
  vision: {
    vision: 'Bhutan’s indigenous games and sports played, understood and passed on in every Dzongkhag, by every generation.',
    mission: [
      'Promote indigenous games and sports as a living part of Bhutanese culture.',
      'Develop players, officials and tournaments through clear rules and fair play.',
      'Regulate play so that it is safe for archers, players and the public.',
      'Document and share the history and practice of every indigenous game.',
    ],
    values: [
      { title: 'Tradition', text: 'Play the way our games have always been played, in national dress and with Driglam Namzhag.' },
      { title: 'Fair play', text: 'Respect the rules, the Thrimpon and the opposing team.' },
      { title: 'Safety', text: 'Protect players, spectators and the public on and around every range.' },
      { title: 'Community', text: 'Keep games open to herders, monks, elders, women and young people alike.' },
    ],
  },
  pending: [
    'vision',
    'about.organisation',
    'about.affiliations',
    'about.core_areas',
    'social',
    'team',
    'sports.content',
    'logo.vector',
  ],
};

// ---------------------------------------------------------------------------
// Forms. The ToR (§4.5) leaves the list of online forms to BIGSA. The forms
// below are the ones BIGSA's own rules already prescribe; their fields come
// straight from those rules. Further forms can be built in the admin panel.
// ---------------------------------------------------------------------------

const contactFields: FormField[] = [
  { key: 'captain_name', type: 'text', label: 'Team captain’s full name', required: true, width: 'half' },
  { key: 'captain_cid', type: 'cid', label: 'Captain’s CID number', required: true, width: 'half', help: '11 digits, as printed on the Citizenship ID card.' },
  { key: 'captain_phone', type: 'tel', label: 'Mobile number', required: true, width: 'half', placeholder: '17123456' },
  { key: 'captain_email', type: 'email', label: 'Email address', required: true, width: 'half', help: 'Your acknowledgement and reference number are sent here.' },
];

const consentField: FormField = {
  key: 'consent',
  type: 'checkbox',
  label: 'I confirm the information given is correct, and I consent to BIGSA collecting and using it to process this application.',
  required: true,
};

function teamEntry(sport: string, players: { min: number; max: number }, seededNote: string): FormDefinition {
  return {
    steps: [
      {
        title: 'Team and captain',
        description: 'The captain is BIGSA’s and the Thrimpon’s point of contact for the whole tournament.',
        fields: [
          { key: 'tournament', type: 'text', label: 'Tournament name', required: true, placeholder: `e.g. National ${sport} Tournament 2027` },
          { key: 'team_name', type: 'text', label: 'Team name', required: true, width: 'half' },
          { key: 'dzongkhag', type: 'select', label: 'Dzongkhag', required: true, width: 'half', options: DZONGKHAGS },
          ...contactFields,
        ],
      },
      {
        title: 'Players',
        description: `List every player, including substitutes. ${seededNote} A player may only be listed for one team in a tournament.`,
        fields: [
          {
            key: 'players',
            type: 'repeater',
            label: 'Players',
            itemLabel: 'player',
            minItems: players.min,
            maxItems: players.max,
            required: true,
            fields: [
              { key: 'name', type: 'text', label: 'Full name', required: true },
              { key: 'cid', type: 'cid', label: 'CID number', required: true },
              { key: 'seeded', type: 'checkbox', label: 'Seeded player' },
              { key: 'substitute', type: 'checkbox', label: 'Substitute' },
            ],
          },
        ],
      },
      {
        title: 'Documents',
        fields: [
          { key: 'cid_copies', type: 'file', label: 'Copies of every player’s CID', required: true, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMB: 10, maxFiles: 3, help: 'Scan them into one PDF if you can. PDF, JPG or PNG, up to 10 MB each.' },
          { key: 'fee_receipt', type: 'file', label: 'Entry fee payment receipt', accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMB: 5, help: 'If the organiser has asked for an entry fee.' },
          { key: 'notes', type: 'textarea', label: 'Anything else the organiser should know', max: 1000 },
        ],
      },
      { title: 'Review and submit', fields: [consentField] },
    ],
  };
}

export const DZONGKHAGS = [
  'Bumthang', 'Chhukha', 'Dagana', 'Gasa', 'Haa', 'Lhuentse', 'Mongar', 'Paro', 'Pemagatshel', 'Punakha',
  'Samdrup Jongkhar', 'Samtse', 'Sarpang', 'Thimphu', 'Trashigang', 'Trashiyangtse', 'Trongsa', 'Tsirang', 'Wangdue Phodrang', 'Zhemgang',
];

const teamFaq = [
  { q: 'Can a player be listed for two teams?', a: 'No. A player who has played for one team may not join another team in the same tournament, and players of a team that withdraws after entry may not play for any other team.' },
  { q: 'What if a player cannot attend on the day?', a: 'Use the replacement player request form at least a day before the match. The Thrimpon or tournament committee decides each request on its merits.' },
  { q: 'Will I get a copy of what I submitted?', a: 'Yes. You will see a reference number on screen, receive an acknowledgement by email, and can print or save the submitted application.' },
];

export const FORMS = [
  {
    slug: 'archery-team-entry',
    title: 'Archery tournament team entry',
    summary: 'Register a team of up to 13 archers for a BIGSA archery tournament.',
    category: 'Tournament entry',
    ref_prefix: 'ARC',
    eligibility: 'Teams of 11 to 13 archers (including up to two substitutes), with no more than two seeded players, shooting traditional bamboo equipment.',
    requirements: 'Names and CID numbers of all players, copies of every player’s CID, and the entry fee receipt where an entry fee applies.',
    instructions: 'Read the Rules and Regulations for Traditional Archery before entering. Every player will also need to sign the code of conduct undertaking before the tournament.',
    faq: teamFaq,
    definition: teamEntry('Archery', { min: 11, max: 13 }, 'Teams have 11 to 13 players, with no more than two seeded players.'),
  },
  {
    slug: 'khuru-team-entry',
    title: 'Khuru tournament team entry',
    summary: 'Register a team of 8 players for a BIGSA khuru tournament.',
    category: 'Tournament entry',
    ref_prefix: 'KHR',
    eligibility: 'Teams of 8 players, including one substitute. No other substitutions are allowed during the tournament.',
    requirements: 'Names and CID numbers of all players and copies of every player’s CID.',
    instructions: 'Read the Rules and Regulations for Khuru before entering.',
    faq: teamFaq,
    definition: teamEntry('Khuru', { min: 8, max: 8 }, 'Teams have exactly 8 players, including one substitute.'),
  },
  {
    slug: 'doegor-team-entry',
    title: 'Doegor tournament team entry',
    summary: 'Register a team of up to 9 players for a BIGSA doegor tournament.',
    category: 'Tournament entry',
    ref_prefix: 'DGR',
    eligibility: 'Teams of up to 9 players, including one substitute. One seeded player is allowed in teams of 8 or fewer; two in teams of 9.',
    requirements: 'Names and CID numbers of all players and copies of every player’s CID.',
    instructions: 'Read the Rules and Regulations for Traditional Doegor before entering.',
    faq: teamFaq,
    definition: teamEntry('Doegor', { min: 8, max: 9 }, 'Teams have 8 or 9 players: one seeded player is allowed with 8, two with 9.'),
  },
  {
    slug: 'replacement-player-request',
    title: 'Replacement player request',
    summary: 'Ask to bring in a replacement when your team may fall below the minimum number of players.',
    category: 'During a tournament',
    ref_prefix: 'RPL',
    eligibility: 'Team captains of teams already entered in a current tournament.',
    requirements: 'Submit at least one day before the affected match, with the reason in detail and any supporting document (for example, a medical certificate).',
    instructions: 'The Thrimpon or tournament committee decides each request on its merits and informs the opposing captain. A seeded player can only be replaced by another seeded player.',
    faq: [],
    definition: {
      steps: [
        {
          title: 'Team and match',
          fields: [
            { key: 'tournament', type: 'text', label: 'Tournament name', required: true },
            { key: 'sport', type: 'radio', label: 'Sport', required: true, options: ['Archery', 'Khuru', 'Doegor'] },
            { key: 'team_name', type: 'text', label: 'Team name', required: true, width: 'half' },
            { key: 'match_date', type: 'date', label: 'Date of the affected match', required: true, width: 'half' },
            ...contactFields,
          ],
        },
        {
          title: 'Players',
          fields: [
            { key: 'outgoing_name', type: 'text', label: 'Player being replaced', required: true, width: 'half' },
            { key: 'outgoing_cid', type: 'cid', label: 'Their CID number', required: true, width: 'half' },
            { key: 'outgoing_seeded', type: 'checkbox', label: 'This player is seeded' },
            { key: 'incoming_name', type: 'text', label: 'Replacement player', required: true, width: 'half' },
            { key: 'incoming_cid', type: 'cid', label: 'Their CID number', required: true, width: 'half' },
            { key: 'reason', type: 'textarea', label: 'Reason for the request, in detail', required: true, min: 20, max: 2000 },
            { key: 'evidence', type: 'file', label: 'Supporting document', accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMB: 5 },
          ],
        },
        { title: 'Review and submit', fields: [consentField] },
      ],
    },
  },
  {
    slug: 'player-code-of-conduct',
    title: 'Player code of conduct undertaking',
    summary: 'Every player signs this before taking part in a BIGSA tournament.',
    category: 'During a tournament',
    ref_prefix: 'COC',
    eligibility: 'Every player in a team entered in a BIGSA tournament.',
    requirements: 'Your CID number and the tournament and team you are playing for.',
    instructions: 'Read the players’ code of conduct in the rules for your sport, then confirm each statement below.',
    faq: [],
    definition: {
      steps: [
        {
          title: 'Your details',
          fields: [
            { key: 'full_name', type: 'text', label: 'Full name', required: true, width: 'half' },
            { key: 'cid', type: 'cid', label: 'CID number', required: true, width: 'half' },
            { key: 'phone', type: 'tel', label: 'Mobile number', required: true, width: 'half' },
            { key: 'email', type: 'email', label: 'Email address', width: 'half', help: 'Optional. We send your acknowledgement here.' },
            { key: 'sport', type: 'radio', label: 'Sport', required: true, options: ['Archery', 'Khuru', 'Doegor'] },
            { key: 'tournament', type: 'text', label: 'Tournament name', required: true, width: 'half' },
            { key: 'team_name', type: 'text', label: 'Team name', required: true, width: 'half' },
          ],
        },
        {
          title: 'Undertaking',
          fields: [
            { key: 'p1', type: 'paragraph', label: 'I undertake to:' },
            { key: 'respect_tradition', type: 'checkbox', label: 'Respect the game as part of our rich tradition and unique cultural heritage, and uphold its rules at all times.', required: true },
            { key: 'respect_people', type: 'checkbox', label: 'Treat officials, other players and spectators with respect and dignity, and show true sportsmanship on and off the ground.', required: true },
            { key: 'national_dress', type: 'checkbox', label: 'Wear the national dress during play and follow Driglam Namzhag.', required: true },
            { key: 'no_intoxicants', type: 'checkbox', label: 'Not smoke or drink in the play or public area, and not play under the influence of any intoxicant.', required: true },
            { key: 'safety', type: 'checkbox', label: 'Give the highest priority to my own and others’ safety, including spectators.', required: true },
            { key: 'thrimpon', type: 'checkbox', label: 'Accept the decision of the Thrimpon as final and binding.', required: true },
            { key: 'signature', type: 'text', label: 'Type your full name as your signature', required: true },
          ],
        },
        { title: 'Review and submit', fields: [consentField] },
      ],
    },
  },
];
