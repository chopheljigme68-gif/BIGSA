/**
 * Initial archive of Bhutan's indigenous games and sports.
 *
 * Archery, Khuru and Doegor content is transcribed (lightly copy-edited) from
 * BIGSA's document "From Sangay Duba". The other nine sports listed in the ToR
 * (§4.4) are created as entries for BIGSA to complete in the admin panel —
 * no descriptions have been invented for them.
 */
import type { Fact, ScoringRule, RuleSection } from '@bigsa/shared';

export interface SeedEquipment { name: string; name_dz?: string; description: string; image?: string }
export interface SeedSport {
  slug: string;
  name: string;
  name_dz?: string;
  tagline?: string;
  summary?: string;
  history?: string;
  how_to_play?: string;
  cultural_significance?: string;
  facts?: Fact[];
  scoring?: ScoringRule[];
  equipment?: SeedEquipment[];
  rules?: RuleSection[];
  cover?: string;
  gallery?: string[];
}

const ARCHERY_RULES: RuleSection[] = [
  {
    title: 'Article I — Dimension of the Bacho (archery field)',
    items: [
      'For safety, the Bacho should ideally be 200 metres long, leaving a safe distance of 25 metres behind each target area, and at least 20 metres wide excluding space for spectators on either side.',
      'No public thoroughfare of any kind, including vehicle parking, is allowed within this area.',
      'If 200 metres cannot be obtained, a wall at least 6 metres high, topped by a 2-metre wire mesh with the smallest possible eyes, should be erected behind each target area. The wall should be at least 10 metres wide.',
      'If provision for spectators is required, the width of the area shall be increased to at least 40 metres.',
      'An archer safety barrier at least 2 metres long and 2 metres high should be erected on both sides of the Bacho, preferably of a material that protects archers without breaking arrows.',
      'The outer perimeter should be fenced off if the range is in an urban or highly populated area.',
      'Signboards should warn the public of the range, and precautions taken so that no one walks, drives or parks within the designated area.',
      'Other measures required by the particular location of the range should also be put in place.',
      'The distance between the two targets shall be 140 metres for traditional equipment.',
    ],
  },
  {
    title: 'Article II — The target',
    items: [
      'The target shall be 120 cm (4 feet) high at the longest point, 40.64 cm (1 foot 4 inches) wide and 3.81 cm (1.5 inches) thick for traditional equipment.',
      'The Gorthig (bull’s eye) shall be 6 cm in diameter, its centre marked 30 cm (1 foot) from the crown of the target.',
      'Targets should preferably be blue pine, with hard knots removed and the holes stuffed with soft wood.',
      'Strong white cotton cloth is glued over the entire surface as a base for painting and to stop the target splitting as kareys accumulate.',
      'The painting usually consists of rainbow colours around the bull’s eye, with water and a five-petal lotus pattern at the bottom. Other patterns may be permitted.',
    ],
  },
  {
    title: 'Article III — Composition of teams',
    items: [
      'Each team shall consist of 13 players including two substitutes.',
      'No more than two seeded players are allowed in a team.',
      'An archer who has played for one team in a tournament may not join another team in the same tournament.',
      'Each team is led by a captain, who is the focal person for communication with the Thrimpon (umpire).',
      'Names, CID numbers and copies of the CID of every player shall be submitted with the entry application on the team application form prescribed by BIGSA.',
      'If a team withdraws after paying entry fees and submitting names, its players may not play for any other team in that tournament.',
    ],
  },
  {
    title: 'Article IV — Arrival and entry into the Bacho',
    items: [
      'Every member of the teams playing on a given day shall arrive at the reporting area before the reporting time for roll call, without entering the playfield.',
      'A team arriving after the reporting time is liable to a deduction of 11 points.',
      'The two teams enter the Bacho together when told to by the Thrimpon, led by their captains, step for step, players following in a straight line.',
      'Teams proceed straight to the mid-point of the Bacho for roll call and briefing. Any player violating this rule costs the team 5 points.',
      'A player entering the Bacho before the designated time costs the team 5 points, for each player who does so.',
      'A player leaving the Bacho without the Thrimpon’s permission costs the team 5 points, and a further 11 points on returning.',
      'If any of the 13 players cannot report for roll call, the captain shall inform the Thrimpon in writing before entering the roll-call area.',
    ],
  },
  {
    title: 'Article V — Roll call, substitution and replacement',
    items: [
      'Teams must have the minimum number of players present at roll call or be disqualified; no Lagtheb is allowed.',
      'After roll call players go to their team tents with bows and arrows inside the bow case and quiver; violation costs 5 points.',
      'No Drachen arrow may be shot from inside or outside the team tent; violation costs 5 points.',
      'Substitution during a match requires the permission of the Thrimpon on duty.',
      'If a team is likely to fall below the minimum of 11 players, the captain may request a replacement player in writing on the BIGSA form at least a day before. The Thrimpon decides on the merits and informs the opposing captain. Alternatively, the tournament committee decides on the Thrimpon’s recommendation.',
      'In an emergency, a seeded player may be replaced by another seeded player following the same procedure.',
    ],
  },
  {
    title: 'Article VI — Captains’ meeting and the fixture',
    items: [
      'At a meeting of team captains the player lists of all teams are read out, to make sure no player appears in two teams and no team has more than two seeded players.',
      'Copies of the written rules are made available so captains can brief their players.',
      'The fixture is drawn in the presence of team captains or representatives and the organising committee, and may only be changed by that meeting.',
    ],
  },
  {
    title: 'Article VII — Time of match',
    items: [
      'Teams report by 07:30 in summer and 08:00 in winter (or as specified), and enter the Bacho together at 07:45 and 08:15 respectively.',
      'Matches start at 08:00 in summer and 08:30 in winter, and close at 18:00 in summer and 17:00 in winter, with a lunch break from 12:00 to 13:00.',
      'If a match is undecided at closing time, play continues until all players of both teams have shot. A match still undecided continues the next day; if undecided by 12:00 on the second day, other matches at that venue are postponed.',
      'Play may be suspended for rain or snow at the Thrimpon’s discretion.',
      'No archer or team may practise on the tournament Bacho during the tournament, including rest days.',
      'A coin toss decides which team chooses the shooting end; the ends then remain for the whole match.',
    ],
  },
  {
    title: 'Article VIII — Score keeping',
    items: [
      'Each captain designates two players, appointed by the Thrimpon as scorers, who together determine the points scored each round.',
      'Two organiser score keepers are placed at the two ends — one confirms who hit the target, the other reconfirms at the end of the round — and record kareys and points, using walkie-talkies.',
      'No other player may interfere with the karey record or scoring; violation costs 5 points.',
    ],
  },
  {
    title: 'Article IX — Counting of points',
    items: [
      'Karey: an arrow point properly stuck in the front of the target, clearly above the ground (including when only the Dachag remains) — 2 points.',
      'Gorthigbu-karey: a hit clearly inside the bull’s eye without touching its outline — 3 points.',
      'Gyegdi-phogpai-karey: an arrow that skids along the ground and sticks firmly in the target — 2 points, provided it stays in the target when the Thrimpon lifts it vertically.',
      'Nawpog-karey: an arrow that pierces the side of the target and hangs from it — 2 points if hanging free; if any part touches the ground, 1 point is deducted from the opponent’s karey, as with a Sa-karey.',
      'Sa-karey: a hit on the lower target with the arrow through the ground, or covered by soil or grass, that stays when the target is lifted — 1 point, and supersedes a Droreg-ureg.',
      'Zheychha-gangm: a direct hit where the arrow does not stay in the target — 1 point.',
      'Droreg-ureg: a hit on the side of the target with the fletch, shaft or nock touching the target — 1 point.',
      'Daya: an arrow embedded in the ground close enough to be measured with an arrow (nock to tip) — 1 point, provided no opposing Daya is closer. Near-equal distances are settled by Chhumipai-zam, measuring with a small stick.',
      'A karey or Daya shot with an arrow belonging to the opposing team scores for neither team.',
    ],
  },
  {
    title: 'Article X — The game',
    items: [
      'The team winning the toss chooses the target end and team tent. Where there is more than one Bacho, teams first toss for the Bacho.',
      'Ends chosen hold for the day; matches continuing over several days toss again each morning.',
      'Each game is complete when one side reaches 25 points. The first team to win 2 games wins the match (best of three).',
      'Appointment of Thrimpons is the prerogative of the organiser.',
    ],
  },
  {
    title: 'Article XI — Customary practices',
    items: [
      'Encouraged: Marchhang at the start of the match, Chhang-phued before and after, Dachham as per tradition, folk songs, Bjibi Pawo and the victory ceremony.',
      'Prohibited: Nemsey-phangsum; Chorthap-dripthap; Drachhen-korni and shooting Drachhen arrows anywhere within the Bacho; bringing religious items such as images, Dhar or Tsendar to the Bacho; inviting astrologers; and any disturbance to the Bacho before or during a match.',
      'Lighting any fire within the Bacho for spiritual intervention is strictly prohibited — 10 points are deducted.',
      'Physical contact intended to distract an archer is prohibited.',
      'Stabilisers, sights and mechanical release aids are not allowed, as decided by the 73rd National Assembly. Anyone using them may not practise on public Bachos or play in tournaments.',
    ],
  },
  {
    title: 'Article XII — Code of conduct and discipline',
    items: [
      'All players wear the national dress during play. Caps, hats or head-dress cost 1 point per occasion.',
      'Players stand on either side of the Bacho; only the archer about to shoot steps onto it (1 point per violation).',
      'Only archers in the match may enter the Bacho area.',
      'Violence or quarrelling costs 2 points and may be reported to the police.',
      'One Dachham per karey; more costs 1 point.',
      'Smoking and drinking in the play and public area cost 5 points; mobile phones in the Bacho area cost 5 points per violation.',
      'No player under the influence of intoxicants may play. Every player signs the BIGSA code of conduct form before the tournament.',
      'Points the two scorers cannot decide go to the Thrimpon, whose decision is final.',
    ],
  },
  {
    title: 'Article XIII — Safety',
    items: [
      'Every player gives the highest priority to their own and others’ safety, including spectators.',
      'Arrows are released only when all players are outside the flag poles or in the safe area.',
      'A player who stays inside the Bacho to distract the opposing archer costs the team 1 point.',
      'An archer who draws sideways or skywards above shoulder level is banned from public Bachos.',
      'A player who becomes a serious safety threat is barred from the match; one who hits another player or spectator is banned for life.',
      'An archer who accidentally kills a person can be charged under Section 144 of the Penal Code of Bhutan for negligent homicide.',
    ],
  },
  {
    title: 'Article XIV — Settlement of disputes',
    items: [
      'Disputes beyond the Thrimpon’s powers go to a dispute settlement committee constituted before each tournament.',
      'Disputes of a criminal nature are referred to the Royal Bhutan Police.',
    ],
  },
  {
    title: 'Article XV — Players’ code of conduct',
    items: [
      'Respect archery as part of our rich tradition and unique cultural heritage, and uphold its rules at all times.',
      'Treat officials, players and spectators with respect and dignity, and show true sportsmanship on and off the ground.',
      'Refrain from foul language, unsportsmanlike behaviour, and drinking or smoking in public.',
      'Foster patriotism, team spirit and mutual respect.',
    ],
  },
  {
    title: 'Article XVI — Definitions',
    items: [
      'Substitute player: one of the 13 players of a team who can replace any player during play for tactical reasons, with the Thrimpon’s permission.',
      'Replacement player: a player not in the original 13, inducted in extraordinary circumstances when a team falls below the minimum of 11.',
    ],
  },
];

export const ARCHERY_SAFETY: RuleSection[] = [
  {
    title: 'A. Construction of a Bacho',
    items: [
      'Ideally 200 m long and 20 m wide, leaving a safe distance of 25 m behind each target area.',
      'No public thoroughfare or vehicle parking within this area.',
      'Where 200 m is not possible, a 6 m wall topped with 2 m of fine wire mesh behind each target area, at least 7 m wide.',
      'If no spectators are expected the width may be reduced to 10 m (shooting area only); where spectators are expected, the shooting area should be at least 15 m wide.',
      'Archer safety barriers at least 8 ft long and 7 ft high on both sides of the Bacho.',
      'Perimeter fencing in urban or populated areas, warning signboards, and any further measures the location requires.',
    ],
  },
  {
    title: 'B. Registration of Bachos',
    items: [
      'Ranges within urban or municipal areas are registered with the city or municipal corporation after inspection against these criteria.',
      'Ranges outside municipal boundaries are registered with the Dzongkhag or Gewog administration.',
      'New ranges are approved only if they meet BIGSA’s criteria.',
    ],
  },
  {
    title: 'C. Other safety measures',
    items: [
      'An archer who draws sideways, threatening spectators, may not take part in games or tournaments.',
      'Drink-shooting is not allowed at any range; officials, caretakers, owners and team captains enforce this.',
      'An archer whose arrow hits someone outside the prescribed area is fully liable and may be banned; an archer involved in a fatal accident is banned for life.',
      'Learners should not shoot at ranges, games or matches where public or player safety is a concern.',
      'No spectators within the 10 m shooting area; every archer stays alert to avoid being hit.',
    ],
  },
];

const KHURU_RULES: RuleSection[] = [
  {
    title: 'Materials and construction',
    items: [
      'Hardwood is traditional, but lead and aluminium may be used provided the khuru keeps the traditional shape and size (Zonam).',
      'Any material may be used for the fletch (Dro).',
    ],
  },
  {
    title: 'Dimensions',
    items: [
      'The target (Bha) is 12 cm wide, 8 cm thick and 55 cm high, of which 15 cm is below ground. The bull’s eye is 2 cm in diameter, 17 cm from the crown.',
      'A 5-inch stick is used to measure Dayas.',
      'The range is 35 m for men and 27 m for women. The Bha Tsham is marked 5 m from each target towards the other.',
      'Games are to 25 points; the first team to win 2 games wins the match. A team with more points that has not reached 25 has not won the game.',
      'Each team has 8 players including 1 substitute; no other substitutions are allowed.',
    ],
  },
  {
    title: 'Discipline',
    items: [
      'Players wear the national dress and follow Driglam Namzhag.',
      'Teams may seek blessings and perform Serkyem in the team tent, but astrologers are strictly prohibited.',
      'Apart from the regular dagger, no item that can be used as a weapon is allowed on the range.',
      'The umpire’s (Drangpon’s) decision is accepted without contest.',
    ],
  },
  {
    title: 'Start and end of play',
    items: [
      'Players arrive before 07:30. Lunch is from 12:00 to 13:00 and play ends at 17:00.',
      'The Drangpon decides the choice of target by coin toss.',
    ],
  },
  {
    title: 'The game',
    items: [
      'Everyone except the thrower stands behind the flag.',
      'Verbal taunting is permitted while throwing, but the thrower may not be physically distracted or have anything thrown at him.',
      'A player who crosses the Bha Tsham before release has the throw nullified, even if it hits. The Drangpon’s decision is final.',
      'No player may handle the target while directing team-mates or celebrating; only the celebrating team may be within the flags.',
    ],
  },
  {
    title: 'Dance and songs',
    items: [
      'Only the team with the karey may perform the celebration dance.',
      'Dances may not exceed 5 minutes or go beyond the boundary marked by the Drangpon.',
    ],
  },
  {
    title: 'Measuring (Kugs)',
    items: [
      'Only the two nominated players and the Drangpon may be in the area while measuring.',
      'Measure from the solid body of the target, not broken wood or torn cloth; measure from the body of the khuru, not the fletch or point.',
      'A khuru completely underground and not visible is not a Daya.',
      'If the Bha is disturbed while directing a khuru, that team’s Daya is nullified; an opponent’s karey that falls off in the process still counts.',
    ],
  },
  {
    title: 'Counting kareys',
    items: [
      'A Sa-karey scores only if the khuru stays on the target when it is lifted from the ground.',
      'A karey in the Gorthig scores 3 points; touching the Gorthig outline scores 2.',
      'If a khuru hits another already on the target, the earlier one scores. A broken khuru whose point stays embedded still scores in full.',
      'Any part of the khuru — tip (Chag), wood or fletch — embedded in the target counts as a karey.',
      'If scores are level or zero at the end, each player throws one more khuru until a team leads.',
    ],
  },
  {
    title: 'Note',
    items: [
      'These rules were amended at the meeting of Khuru team captains on 30 January 2015 to follow the age-old practice of two teams playing against each other, not three.',
    ],
  },
];

const DOEGOR_RULES: RuleSection[] = [
  {
    title: 'Article I — Playfield',
    items: [
      'The playfield is 35 m long and 6 m wide, excluding spectator space.',
      'The two Tseys (pegs) are 30 m apart. The Batsham is marked 4 m from each Tsey towards the other.',
      'A Tsey is a wooden peg 2.5 cm in diameter at the top and 15 cm long, embedded in the ground.',
      'Flag poles stand at least 2.5 m from each Tsey.',
    ],
  },
  {
    title: 'Article II — The Doegor',
    items: ['A Doegor must be made of stone; no other material is allowed.', 'Size and weight are left to each player’s choice and capacity to throw.'],
  },
  {
    title: 'Article III — Composition of teams',
    items: [
      'Each team is led by a captain, the focal person for the Thrimpon or Barpon (umpire).',
      'A team has 9 players, one of them a substitute.',
      'Players arrive at the reporting area before roll call without entering the playfield, or 2 points may be deducted.',
      'One seeded player is allowed in teams of 8 or fewer; two in teams of 9 or more.',
      'Substitution only with the permission of the Thrimpon on duty.',
    ],
  },
  {
    title: 'Article IV — Roll call',
    items: [
      'Teams without the minimum number of players at roll call are disqualified; no Lagtheb is allowed.',
      'Absence in an emergency is reported in writing to the tournament director at least a day before; the director decides on substitutions, and a seeded player may only replace a seeded player.',
    ],
  },
  {
    title: 'Article V — Start of the match',
    items: ['Teams enter the field only at the time specified.', 'A coin toss decides which team chooses its Tsey end, which then holds for the whole match.'],
  },
  {
    title: 'Article VI — Score keeping',
    items: ['Each captain nominates a player, appointed by the Thrimpon as scorer.', 'No other player may interfere; a score keeper records team and individual points.'],
  },
  {
    title: 'Article VII — Counting of points',
    items: [
      'A Doegor fully covering the Tsey scores 2 points.',
      'A Doegor within one Thogang of the Tsey scores 1 point if no opposing Doegor is as close; otherwise the closest Doegor scores. A 20 cm stick is used to measure, to avoid disputes over hand spans.',
      'Where two Doegors from opposing teams are stacked over the Tsey, the one touching the Tsey (the bottom one) scores 2.',
      'Where opposing Doegors cover or touch the Tsey equally, the point is nullified.',
      'Byep-khaley: where one Doegor covers the Tsey and an opponent’s partly rests on it, the one covering or touching the Tsey scores 2.',
      'If a Doegor breaks, its owner chooses which piece counts, and must use that piece for the next three rounds.',
      'Points the scorers cannot decide go to the Thrimpon, whose decision is final.',
    ],
  },
  {
    title: 'Article VIII — The game',
    items: ['Matches are best of three games (Kuu).', 'A game is won by the first team to 25 points.', 'Tournaments may be league or knockout.'],
  },
  {
    title: 'Articles IX–XIII — Fixture, conduct, safety and disputes',
    items: [
      'The fixture is drawn in the presence of all captains, who sign an undertaking to follow the players’ code of conduct.',
      'Full national dress during play; no smoking, drinking or intoxication; every player signs the code of conduct form.',
      'A Doegor is thrown only when all players are outside the flag poles. Distracting a thrower from inside the play area costs 1 point. Players who repeatedly hit others can be banned for life.',
      'Disputes beyond the Thrimpon go to the tournament’s dispute settlement committee.',
    ],
  },
];

export const SPORTS: SeedSport[] = [
  {
    slug: 'dha-traditional-archery',
    name: 'Dha',
    name_dz: 'མདའ།',
    tagline: 'Traditional archery — the national sport of Bhutan.',
    summary:
      'Bamboo bows, two arrows a round and targets 140 metres apart. Declared the national sport in 1971, Dha is played with song, dance and fierce banter between rival teams.',
    history:
      'There is no written record of when archery arrived in Bhutan, but it is believed to have been practised since the time of Zhabdrung Ngawang Namgyal. Bows and arrows were first tools for hunting and weapons of war, and slowly became a sport of the community. Archery has been played as a sport since the reign of the First King, and in 1971 — the year Bhutan joined the United Nations — His Majesty the Third King, Jigme Dorji Wangchuck, declared it the national sport.',
    how_to_play:
      'Two targets stand at opposite ends of the Bacho, 140 metres apart for traditional equipment (145 metres for compound bows). Each player shoots a pair of arrows per round, and a round is complete once every player has shot both arrows. A game is won at 25 points, and a match is the best of three games.\n\nAn archer moves through six steps: stance — balanced and comfortable, at a right angle to the target; nocking the arrow; aiming, with the arrow between the index and middle finger and the bow straight to the target; drawing with three fingers, pushing and pulling at once; release, since a bamboo bow cannot be held at full draw; and follow-through, the body still pointing the arrow home.',
    cultural_significance:
      'A karey is never only a point. When a team-mate hits the target, the team performs Dachham — a dance of gratitude that begins with a shout of “wa ha ha ha” and continues with Boedra, Zhungdra and songs of praise. Two groups of singers stand by each team’s Bacho, cheering their own archers and teasing the opposition to break their concentration. After a game is won, the archer who scored the winning point is carried on the shoulders of two team-mates with the chibdrel ceremony, and both teams finish with Bjipai Paw before the chief guest.',
    facts: [
      { label: 'Range', value: '140 m', note: 'between targets, traditional bow' },
      { label: 'Team', value: '13', note: 'players, including 2 substitutes' },
      { label: 'Arrows', value: '2', note: 'per player each round' },
      { label: 'Game', value: '25', note: 'points; best of three games' },
    ],
    scoring: [
      { name: 'Karey', points: '2', description: 'A direct hit on the target.' },
      { name: 'Gorthig', points: '3', description: 'A hit in the bull’s eye.' },
      { name: 'Dhobji', points: '2–6', description: 'Both arrows hit in the same round: 6 for two bull’s eyes down to 2 when both are below ground level.' },
      { name: 'Sa-karey', points: '1', description: 'A hit at the very bottom of the target, through the ground.' },
      { name: 'Zhecha-gam', points: '1', description: 'A direct hit where the point does not stay in the target.' },
      { name: 'Daya', points: '1', description: 'An arrow landing short, within an arrow’s length of the target.' },
    ],
    equipment: [
      { name: 'Bow', name_dz: 'གཞུ།', description: 'Made of bamboo. The changzhu, a single bamboo stave, was common in the past; today the tabzhu — two staves bound with glue, wire, cloth, leather and wood — is preferred.', image: 'archery-bow-tabzhu.jpg' },
      { name: 'Bow string', name_dz: 'གཞུ་ཐག', description: 'Once spun from nettle fibre; the raw material is now imported. The bow is strung with a knee braced on the grip, turning it from straight to an arch.', image: 'archery-bow-strung.jpg' },
      { name: 'Arrow', name_dz: 'མདའ།', description: 'Nock, pang, fletches, shaft and point make an arrow. A pair must be equal in length, size and weight. Fletches were once pheasant or hen feathers; today tape works in every season.', image: 'archery-arrows.jpg' },
      { name: 'Point', name_dz: 'མདེའུ།', description: 'The arrowhead, made of copper.', image: 'archery-arrow-point.jpg' },
      { name: 'Finger tabs', description: 'Leather tabs that spare the archer’s fingers. Some use bandages today, but leather is the traditional choice.', image: 'archery-finger-tabs.jpg' },
      { name: 'Arm guard', description: 'Protects the bow-hand wrist from the string. Once leather and cloth tied with string, now usually fastened with buttons.', image: 'archery-arm-guard.jpg' },
      { name: 'Target', description: '120 cm high, 40.64 cm wide and 3.81 cm thick, with a 6 cm Gorthig centred 30 cm from the crown. Dressed with Gibsi and Kachu flags on bamboo frames.', image: 'archery-target-with-gibsi.jpg' },
    ],
    rules: ARCHERY_RULES,
    cover: 'archery-follow-through.jpg',
    gallery: [
      'archery-release.jpg', 'archery-range-wide.jpg', 'archery-archer-aiming.jpg', 'archery-at-the-target-end.jpg', 'archery-match-in-play.jpg',
      'archery-range-shot.jpg', 'archery-target.jpg', 'archery-team-dachham.jpg', 'archery-dha-kha-lok.jpg', 'archery-dachham-singers.jpg',
      'archery-victory-celebration.jpg', 'archery-winning-team.jpg', 'archery-arrow-fletches.jpg', 'archery-arrow-nocks.jpg', 'archery-bamboo-shafts.jpg', 'archery-bow-string.jpg',
    ],
  },
  {
    slug: 'khuru',
    name: 'Khuru',
    name_dz: 'ཁུ་རུ།',
    tagline: 'The dart game of cow herders, now Bhutan’s second most popular indigenous sport.',
    summary:
      'Heavy wooden darts thrown at a small target 35 metres away — 27 for women. Quick to set up and played everywhere from village fields to Losar celebrations.',
    history:
      'Khuru began as a game of cow herders, played with darts made from tree branches and bird feathers. It is now the second most popular indigenous sport in Bhutan after archery. In some parts of the country playing khuru carries a sense of mystery and is avoided, but many people take a keen interest in it. Because it needs a shorter range and less equipment than archery, khuru is enjoyed at weekends, during Losar and on national holidays.',
    how_to_play:
      'The two targets stand at opposite ends of a field — 35 metres apart for men and 27 metres for women. Each player throws a pair of khurus per round, and a round is complete once every player on both teams has thrown. Games are to 25 points and the first team to win two games takes the match.',
    cultural_significance:
      'As in archery, a karey is celebrated with Dachham — the team dances and sings in gratitude for the hit, while verbal taunting of the thrower is part of the game.',
    facts: [
      { label: 'Range', value: '35 m', note: 'for men; 27 m for women' },
      { label: 'Team', value: '8', note: 'players, including 1 substitute' },
      { label: 'Khurus', value: '2', note: 'per player each round' },
      { label: 'Game', value: '25', note: 'points; best of three games' },
    ],
    scoring: [
      { name: 'Karey', points: '2', description: 'A direct hit on the target.' },
      { name: 'Gorthig', points: '3', description: 'A hit in the bull’s eye.' },
      { name: 'Dhobji', points: '4–6', description: 'Both khurus hit in the same round: 6 for two bull’s eyes, 5 for one, 4 for two hits elsewhere on the target.' },
      { name: 'Daya', points: '1', description: 'A khuru landing within a 5-inch stick of the target, measured from the barrel.' },
    ],
    equipment: [
      { name: 'Khuru', name_dz: 'ཁུ་རུ།', description: 'Flight, stem, barrel and point. The barrel is wood, pipe, aluminium, or metal pipe with wood inside; flights are plastic, stems bamboo, and points converted from nails.', image: 'khuru-darts.jpg' },
      { name: 'Target', description: '55 cm high (15 cm below ground), 12 cm wide and 8 cm thick, with a 2 cm Gorthig 17 cm from the crown. Dressed with Kachu.', image: 'khuru-target.jpg' },
    ],
    rules: KHURU_RULES,
    cover: 'khuru-throw.jpg',
    gallery: ['khuru-players.jpg', 'khuru-team.jpg', 'khuru-dachham.jpg', 'khuru-target-with-kachu.jpg'],
  },
  {
    slug: 'doegor',
    name: 'Doegor',
    name_dz: 'རྡོ་སྒོར།',
    tagline: 'Disc-shaped stones pitched at a wooden peg 30 metres away.',
    summary:
      'Two stones, two pegs and an open field. Doegor is the simplest and cheapest of the three tournament sports, long played by cow herders, monks and elders.',
    history:
      'Doegor joins two words: doe, stone, and gor, the round shape it is shaped into. A Doegor must be a disc-shaped stone — no other material may be used — and its size and weight are left to the strength of each player. Needing only two stones and two wooden pegs, it can be played on almost any ground without the preparation that archery and khuru require, and has been played mostly by cow herders, monks and older people.',
    how_to_play:
      'Two wooden pegs (Tsey) are driven into the ground 30 metres apart. Each player throws two Doegors per round, and a round is complete once every player has thrown a pair. Players may knock an opponent’s Doegor away from the Tsey with their own and take its place. Unlike archery and khuru there is no karey, so points come from landing closest to — or on top of — the peg.',
    facts: [
      { label: 'Range', value: '30 m', note: 'between the two pegs' },
      { label: 'Team', value: '9', note: 'players, including 1 substitute' },
      { label: 'Stones', value: '2', note: 'per player each round' },
      { label: 'Game', value: '25', note: 'points; best of three games' },
    ],
    scoring: [
      { name: 'Covering the Tsey', points: '2', description: 'A Doegor that fully covers the peg.' },
      { name: 'Daya', points: '1', description: 'The Doegor closest to the peg, within one Thogang (a 20 cm stick).' },
    ],
    equipment: [
      { name: 'Doegor', name_dz: 'རྡོ་སྒོར།', description: 'A disc-shaped stone. Size and weight are the player’s choice.', image: 'doegor-stones.jpg' },
      { name: 'Tsey', description: 'A wooden peg 2.5 cm across at the top, 15 cm embedded in the ground.' },
    ],
    rules: DOEGOR_RULES,
    cover: 'doegor-match.jpg',
    gallery: ['doegor-players.jpg'],
  },
  { slug: 'ji-dum', name: 'Ji-Dum' },
  { slug: 'sok-sum', name: 'Sok-Sum' },
  { slug: 'tag-dha-nor', name: 'Tag-Dha-Nor' },
  { slug: 'dochusum-thrangni', name: 'Dochusum Thrangni' },
  { slug: 'yam-tse', name: 'Yam-Tse' },
  { slug: 'kolagpa', name: 'Kolagpa' },
  { slug: 'chhab-chha', name: 'Chhab-Chha' },
  { slug: 'phyinang-gyerpi', name: 'Phyinang Gyerpi' },
  { slug: 'thab-thenni', name: 'Thab-Thenni' },
];

export const RULE_DOCUMENTS = [
  { file: 'rules-traditional-archery.pdf', title: 'Rules and Regulations for Traditional Archery', sport: 'dha-traditional-archery', category: 'rules', description: 'Annexure I. Applies to every archery tournament on traditional bamboo equipment, by any organiser, anywhere in the Kingdom.', sections: ARCHERY_RULES },
  { file: 'archery-safety-rules.pdf', title: 'Archery Safety Rules and Regulations', sport: 'dha-traditional-archery', category: 'standards', description: 'Annexure IV. Construction and registration of Bachos and safety measures to protect archers and the public from stray arrows.', sections: ARCHERY_SAFETY },
  { file: 'rules-khuru.pdf', title: 'Rules and Regulations for Khuru', sport: 'khuru', category: 'rules', description: 'Annexure II, as amended at the meeting of Khuru team captains on 30 January 2015.', sections: KHURU_RULES },
  { file: 'rules-traditional-doegor.pdf', title: 'Rules and Regulations for Traditional Doegor', sport: 'doegor', category: 'rules', description: 'Annexure III. Applies to every Doegor tournament organised in any part of the Kingdom.', sections: DOEGOR_RULES },
] as const;
