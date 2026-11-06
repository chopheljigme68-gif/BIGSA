import Link from 'next/link';
import type { SiteSettings, TeamMember } from '@bigsa/shared';
import { PageHead } from '@/components/PageHead';
import { Img } from '@/components/Img';
import { Paragraphs } from '@/components/Markdown';
import u from '@/components/ui.module.css';
import p from './pages.module.css';

export function WhoWeAreView({ data }: { data: { settings: SiteSettings; team: TeamMember[] } }) {
  const { about, motto } = data.settings;
  return (
    <>
      <PageHead title="Who we are" lede={about.intro} crumbs={[{ href: '/who-we-are', label: 'Who we are' }]} />

      <section className={u.section}>
        <div className={`container ${p.twoCol}`}>
          <div>
            <h2 className={p.colTitle}>Background</h2>
          </div>
          <Paragraphs text={about.background} className={u.prose} />
        </div>
        <div className={`container ${p.mandate}`} data-reveal="scale">
          <p className={p.mandateLabel}>Our mandate</p>
          <p className={`display ${p.mandateText}`}>{about.mandate}</p>
        </div>
        {about.core_areas?.length ? (
          <div className={`container ${p.twoCol}`}>
            <h2 className={p.colTitle}>What we do</h2>
            <ul className={p.targetList}>
              {about.core_areas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {about.organisation ? (
          <div className={`container ${p.twoCol}`}>
            <h2 className={p.colTitle}>Organisation</h2>
            <Paragraphs text={about.organisation} className={u.prose} />
          </div>
        ) : null}
      </section>

      <section className={`${u.section} ${u.bone}`} aria-labelledby="team-title" id="team">
        <div className="container">
          <div className={u.sectionHead}>
            <div>
              <h2 id="team-title" className={`display ${u.sectionTitle}`}>
                Who’s who
              </h2>
              <p className={u.sectionSub}>The people who run BIGSA and what each of them is responsible for.</p>
            </div>
          </div>
          {data.team.length ? (
            <ul className={p.team}>
              {data.team.map((m) => (
                <li key={m.id} className={p.member} data-reveal>
                  <div className={p.memberPhoto}>{m.photo ? <Img media={m.photo} sizes="(max-width: 700px) 50vw, 280px" alt={m.name} /> : <span className={`display ${p.initials}`} aria-hidden="true">{initials(m.name)}</span>}</div>
                  <h3 className={p.memberName}>{m.name}</h3>
                  <p className={p.memberRole}>{m.designation}</p>
                  {m.bio || m.responsibilities || m.email || m.phone ? (
                    <details className={p.memberMore}>
                      <summary>Profile and responsibilities</summary>
                      {m.bio ? <p>{m.bio}</p> : null}
                      {m.responsibilities ? (
                        <>
                          <h4>Responsibilities</h4>
                          <p>{m.responsibilities}</p>
                        </>
                      ) : null}
                      {m.email ? <p><a href={`mailto:${m.email}`}>{m.email}</a></p> : null}
                      {m.phone ? <p><a href={`tel:${m.phone.replace(/\s/g, '')}`}>{m.phone}</a></p> : null}
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className={u.empty}>
              <h3>Profiles are on their way</h3>
              <p>BIGSA is preparing profiles of its office bearers and staff. Until then, reach the office on the contact page.</p>
              <Link href="/contact" className={u.textLink}>
                Contact BIGSA
              </Link>
            </div>
          )}
        </div>
      </section>

      {about.affiliations?.length ? (
        <section className={u.section} id="affiliations" aria-labelledby="aff-title">
          <div className={`container ${p.twoCol}`}>
            <h2 id="aff-title" className={p.colTitle}>
              Affiliations and partners
            </h2>
            <ul className={p.affList}>
              {about.affiliations.map((a) => (
                <li key={a.name}>
                  <h3>{a.name}</h3>
                  <p>{a.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={u.sectionTight}>
        <div className={`container ${p.ctaBand}`}>
          <p className={`display ${p.ctaMotto}`}>{motto.en}</p>
          <Link href="/vision-mission" className={`${u.btn} ${u.saffron}`}>
            Our vision and mission
          </Link>
        </div>
      </section>
    </>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
}

export function VisionMissionView({ data }: { data: { settings: SiteSettings } }) {
  const { vision } = data.settings;
  return (
    <>
      <PageHead title="Vision & mission" crumbs={[{ href: '/vision-mission', label: 'Vision & mission' }]} />
      <section className={u.section} aria-labelledby="vision-title">
        <div className="container">
          <h2 id="vision-title" className={p.kicker}>
            Vision
          </h2>
          <p className={`display ${p.vision}`} data-reveal="fade">{vision.vision}</p>
        </div>
      </section>
      <section className={`${u.section} ${u.bone}`} aria-labelledby="mission-title">
        <div className={`container ${p.twoCol}`}>
          <h2 id="mission-title" className={p.colTitle}>
            Mission
          </h2>
          <ul className={p.mission}>
            {vision.mission.map((m) => (
              <li key={m} data-reveal="left">{m}</li>
            ))}
          </ul>
        </div>
      </section>
      {vision.values?.length ? (
        <section className={u.section} aria-labelledby="values-title">
          <div className="container">
            <h2 id="values-title" className={`display ${u.sectionTitle}`}>
              What we stand for
            </h2>
            <ul className={p.values}>
              {vision.values.map((v) => (
                <li key={v.title} data-reveal>
                  <h3 className="display">{v.title}</h3>
                  <p>{v.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
