'use client';

import { useMemo, useState } from 'react';
import type { ScoringRule } from '@bigsa/shared';
import s from './target.module.css';

/**
 * Interactive scoring explainer.
 * Tap a part of the target (or a rule in the list) and an arrow lands there,
 * showing what that hit scores. Point values come from each sport's scoring
 * rules in the CMS; the drawing follows BIGSA's target dimensions (not to scale).
 */

type Zone = 'gorthig' | 'face' | 'base' | 'ground' | 'pair' | 'bounce' | 'peg' | 'ring';

export interface ExplainerSport {
  slug: string;
  name: string;
  scoring: ScoringRule[];
}

const ZONE_BY_NAME: [RegExp, Zone][] = [
  [/gorthig|bull/i, 'gorthig'],
  [/dhobji/i, 'pair'],
  [/sa-?karey/i, 'base'],
  [/zhe(y)?cha/i, 'bounce'],
  [/cover/i, 'peg'],
  [/daya/i, 'ground'],
  [/karey/i, 'face'],
];

function zoneFor(rule: ScoringRule, isPeg: boolean): Zone | null {
  for (const [re, z] of ZONE_BY_NAME) {
    if (re.test(rule.name)) return isPeg && z === 'ground' ? 'ring' : z;
  }
  return null;
}

/** Target geometry per sport (front view). Units are SVG px. */
const TARGETS: Record<string, { w: number; h: number; gy: number; r: number; label: string }> = {
  archery: { w: 78, h: 236, gy: 58, r: 11, label: '120 cm high, 40.64 cm wide; Gorthig 6 cm, centred 30 cm from the crown' },
  khuru: { w: 46, h: 150, gy: 56, r: 8, label: '55 cm high (40 cm above ground), 12 cm wide; Gorthig 2 cm, 17 cm from the crown' },
};

const GROUND = 430;
const CX = 200;

export function TargetExplainer({ sports, heading = true }: { sports: ExplainerSport[]; heading?: boolean }) {
  const playable = sports.filter((sp) => sp.scoring?.length);
  const [slug, setSlug] = useState(playable[0]?.slug);
  const sport = playable.find((sp) => sp.slug === slug) ?? playable[0];
  const isPeg = /doegor/i.test(sport?.slug ?? '');
  const kind = /khuru/i.test(sport?.slug ?? '') ? 'khuru' : 'archery';

  const rules = useMemo(
    () => (sport?.scoring ?? []).map((r) => ({ ...r, zone: zoneFor(r, isPeg) })).filter((r) => r.zone),
    [sport, isPeg],
  );
  const [idx, setIdx] = useState(0);
  const [shot, setShot] = useState(0); // bumps to replay the landing animation
  const current = rules[Math.min(idx, rules.length - 1)];

  if (!sport || !current) return null;

  const select = (i: number) => {
    setIdx(i);
    setShot((n) => n + 1);
  };
  const selectZone = (z: Zone) => {
    const i = rules.findIndex((r) => r.zone === z);
    if (i > -1) select(i);
  };
  const has = (z: Zone) => rules.some((r) => r.zone === z);

  return (
    <div className={s.wrap}>
      {heading ? (
        <div className={s.head}>
          <h2 className={`display ${s.title}`}>How a point is scored</h2>
          <p className={s.lede}>Tap the target. Every hit has a name, and every name has its points.</p>
        </div>
      ) : null}

      {playable.length > 1 ? (
        <div className={s.tabs} role="tablist" aria-label="Sport">
          {playable.map((sp) => (
            <button
              key={sp.slug}
              role="tab"
              type="button"
              aria-selected={sp.slug === sport.slug}
              className={s.tab}
              onClick={() => {
                setSlug(sp.slug);
                setIdx(0);
                setShot((n) => n + 1);
              }}
            >
              {sp.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className={s.stage}>
        <figure className={s.figure}>
          <svg viewBox="0 0 400 520" className={s.svg} role="img" aria-label={isPeg ? 'Doegor peg seen from above' : `${sport.name} target`}>
            <defs>
              <pattern id="soil" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#e9dfcd" />
                <circle cx="2" cy="3" r="0.9" fill="#cdbb9c" />
                <circle cx="6" cy="7" r="0.7" fill="#cdbb9c" />
              </pattern>
            </defs>
            {isPeg ? (
              <PegView active={current.zone!} onZone={selectZone} has={has} shot={shot} />
            ) : (
              <TargetView kind={kind} active={current.zone!} onZone={selectZone} has={has} shot={shot} />
            )}
          </svg>
          <figcaption className={s.caption}>{isPeg ? 'The Tsey from above, with the Thogang measured by a 20 cm stick.' : `Drawing not to scale. ${TARGETS[kind].label}.`}</figcaption>
        </figure>

        <div className={s.panel}>
          <div className={s.readout} aria-live="polite" key={`${sport.slug}-${idx}`}>
            <span className={`display ${s.points}`}>{current.points}</span>
            <span className={s.pointsLabel}>{current.points === '1' ? 'point' : 'points'}</span>
            <h3 className={s.ruleName}>{current.name}</h3>
            <p className={s.ruleText}>{current.description}</p>
          </div>
          <ul className={s.ruleList}>
            {rules.map((r, i) => (
              <li key={r.name}>
                <button type="button" className={s.ruleBtn} aria-pressed={i === idx} onClick={() => select(i)}>
                  <span>{r.name}</span>
                  <span className={s.ruleBtnPts}>{r.points}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Arrow({ x, y, shot, delay = 0, faded = false }: { x: number; y: number; shot: number; delay?: number; faded?: boolean }) {
  // A bamboo arrow seen from the shooting line: shaft sticking out towards us, fletch at the tail.
  return (
    <g key={`${shot}-${x}-${y}`} className={s.arrow} style={{ animationDelay: `${delay}ms`, opacity: faded ? 0.55 : undefined }} transform={`translate(${x} ${y})`}>
      <line x1="0" y1="0" x2="34" y2="-30" stroke="#5a3a1a" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 -23 l14 -4 l-4 14 z M30 -27 l10 -12 M36 -21 l12 -6" stroke="#f5f0e6" strokeWidth="3" fill="#f5f0e6" strokeLinejoin="round" />
      <circle cx="0" cy="0" r="2.6" fill="#24100d" />
      {/* impact ripple */}
      <circle cx="0" cy="0" r="6" className={s.ripple} style={{ animationDelay: `${delay + 330}ms` }} />
    </g>
  );
}

function TargetView({ kind, active, onZone, has, shot }: { kind: 'archery' | 'khuru'; active: Zone; onZone: (z: Zone) => void; has: (z: Zone) => boolean; shot: number }) {
  const t = TARGETS[kind];
  const top = GROUND - t.h;
  const left = CX - t.w / 2;
  const gy = top + t.gy;
  const zoneProps = (z: Zone, label: string) =>
    has(z)
      ? {
          className: `${s.zone} ${active === z || (active === 'pair' && (z === 'gorthig' || z === 'face')) ? s.zoneActive : ''}`,
          role: 'button',
          tabIndex: 0,
          'aria-label': label,
          onClick: () => onZone(z),
          onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZone(z)),
        }
      : { className: s.zoneOff };

  const landing: Record<Zone, { x: number; y: number }[]> = {
    gorthig: [{ x: CX, y: gy }],
    face: [{ x: CX + t.w * 0.18, y: gy + t.h * 0.33 }],
    base: [{ x: CX - t.w * 0.15, y: GROUND - 8 }],
    ground: [{ x: CX + 62, y: GROUND + 34 }],
    pair: [{ x: CX, y: gy }, { x: CX - t.w * 0.2, y: gy + t.h * 0.28 }],
    bounce: [{ x: CX + t.w * 0.9, y: GROUND + 16 }],
    peg: [],
    ring: [],
  };

  return (
    <>
      {/* sky and ground */}
      <rect x="0" y={GROUND} width="400" height={520 - GROUND} fill="url(#soil)" />
      <line x1="0" x2="400" y1={GROUND} y2={GROUND} stroke="#8a7458" strokeWidth="1.5" />

      {/* Kachu: bamboo sticks with coloured flags either side, as dressed on the range */}
      {[-1, 1].map((side) => {
        const x = CX + side * (t.w / 2 + 52);
        return (
          <g key={side} aria-hidden="true">
            <line x1={x} x2={x} y1={GROUND} y2={top - 50} stroke="#b59a6a" strokeWidth="3" />
            {['#f2b230', '#13877f', '#9c2a22', '#f5f0e6'].map((c, i) => (
              <rect key={c} x={side < 0 ? x : x - 22} y={top - 48 + i * 24} width="22" height="20" fill={c} stroke="rgba(0,0,0,.08)" />
            ))}
          </g>
        );
      })}

      {/* Daya zone: within an arrow's length in front of the target */}
      <ellipse cx={CX} cy={GROUND + 34} rx={t.w / 2 + 92} ry="30" {...zoneProps('ground', 'Ground in front of the target: Daya')} />
      <ellipse cx={CX} cy={GROUND + 34} rx={t.w / 2 + 92} ry="30" fill="none" stroke="#8a7458" strokeDasharray="4 5" pointerEvents="none" />

      {/* the board, with a rounded crown */}
      <path
        d={`M${left} ${GROUND} V${top + t.w / 2} A${t.w / 2} ${t.w / 2} 0 0 1 ${left + t.w} ${top + t.w / 2} V${GROUND} Z`}
        fill="#fbf8f2"
        stroke="#3a2a20"
        strokeWidth="1.5"
        {...zoneProps('face', 'Target face: Karey')}
      />
      {/* rainbow rings painted around the Gorthig */}
      {[
        { r: t.r * 2.7, c: '#9c2a22' },
        { r: t.r * 2.2, c: '#13877f' },
        { r: t.r * 1.7, c: '#f2b230' },
      ].map((ring) => (
        <circle key={ring.r} cx={CX} cy={gy} r={Math.min(ring.r, t.w / 2 - 3)} fill={ring.c} pointerEvents="none" />
      ))}
      {/* lotus and water at the foot of the board */}
      <g pointerEvents="none" aria-hidden="true">
        <path d={`M${left + 4} ${GROUND - 18} q${t.w / 8} -8 ${t.w / 4} 0 t${t.w / 4} 0 t${t.w / 4} 0 t${t.w / 4 - 8} 0`} stroke="#13877f" strokeWidth="2.5" fill="none" />
        <path d={`M${CX} ${GROUND - 26} c-6 -14 -4 -22 0 -30 c4 8 6 16 0 30 M${CX} ${GROUND - 26} c-14 -6 -20 -16 -20 -24 c10 2 16 10 20 24 M${CX} ${GROUND - 26} c14 -6 20 -16 20 -24 c-10 2 -16 10 -20 24`} fill="#9c2a22" opacity="0.85" />
      </g>

      {/* Sa-karey: the very bottom of the board */}
      <rect x={left} y={GROUND - 14} width={t.w} height="20" {...zoneProps('base', 'Bottom of the target: Sa-karey')} />

      {/* Gorthig */}
      <circle cx={CX} cy={gy} r={t.r * 1.2} {...zoneProps('gorthig', 'Bull’s eye: Gorthig')} />
      <circle cx={CX} cy={gy} r={t.r * 0.95} fill="#fbf8f2" stroke="#24100d" strokeWidth="1" pointerEvents="none" />
      <circle cx={CX} cy={gy} r={t.r * 0.35} fill="#24100d" pointerEvents="none" />

      {/* Zhecha-gam: the arrow hits but does not stay */}
      {active === 'bounce' ? (
        <path d={`M${CX + 8} ${gy + 60} q ${t.w} -40 ${t.w * 0.9 - 8} ${GROUND + 16 - gy - 60}`} stroke="#24100d" strokeDasharray="3 5" fill="none" className={s.trail} key={`trail-${shot}`} />
      ) : null}

      {landing[active].map((p, i) => (
        <Arrow key={`${shot}-${i}`} x={p.x} y={p.y} shot={shot} delay={i * 180} faded={active === 'bounce'} />
      ))}
    </>
  );
}

function PegView({ active, onZone, has, shot }: { active: Zone; onZone: (z: Zone) => void; has: (z: Zone) => boolean; shot: number }) {
  const cy = 250;
  const zp = (z: Zone, label: string) =>
    has(z)
      ? {
          className: `${s.zone} ${active === z ? s.zoneActive : ''}`,
          role: 'button',
          tabIndex: 0,
          'aria-label': label,
          onClick: () => onZone(z),
          onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onZone(z)),
        }
      : { className: s.zoneOff };
  return (
    <>
      <rect x="0" y="0" width="400" height="520" fill="url(#soil)" />
      <circle cx={CX} cy={cy} r="120" {...zp('ring', 'Within one Thogang of the Tsey: Daya')} />
      <circle cx={CX} cy={cy} r="120" fill="none" stroke="#8a7458" strokeDasharray="5 6" pointerEvents="none" />
      <text x={CX + 126} y={cy - 4} fontSize="12" fill="#6f6251">20 cm</text>
      <line x1={CX} x2={CX + 120} y1={cy} y2={cy} stroke="#8a7458" strokeWidth="1" pointerEvents="none" />
      <circle cx={CX} cy={cy} r="34" {...zp('peg', 'On the Tsey: covering the peg')} />
      <circle cx={CX} cy={cy} r="9" fill="#b59a6a" stroke="#5a3a1a" strokeWidth="2" pointerEvents="none" />
      {/* a stone outside the Thogang scores nothing */}
      <ellipse cx="330" cy="420" rx="34" ry="26" fill="#a39a8c" stroke="#6f6251" pointerEvents="none" />
      <text x="290" y="470" fontSize="12" fill="#6f6251">No point</text>
      <g key={`stone-${shot}`} className={s.stone}>
        {active === 'peg' ? (
          <ellipse cx={CX + 4} cy={cy + 2} rx="40" ry="31" fill="#9c2a22" stroke="#24100d" strokeWidth="1.5" />
        ) : (
          <ellipse cx={CX + 70} cy={cy + 62} rx="36" ry="27" fill="#f2b230" stroke="#24100d" strokeWidth="1.5" />
        )}
      </g>
    </>
  );
}
