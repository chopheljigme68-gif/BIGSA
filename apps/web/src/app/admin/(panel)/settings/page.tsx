'use client';

import { useEffect, useState } from 'react';
import { PENDING_LABELS, type SiteSettings } from '@bigsa/shared';
import { api, useApi } from '@/admin/lib/api';
import { PageHeader, Field, Loading, useToast } from '@/admin/components/ui';

type Tab = 'about' | 'vision' | 'contact' | 'social' | 'checklist';

export default function SettingsPage() {
  const { data } = useApi<SiteSettings>('/settings');
  const [s, setS] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<Tab>('about');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return <Loading />;

  const save = async (...keys: (keyof SiteSettings)[]) => {
    setSaving(true);
    try {
      for (const k of keys) await api(`/settings/${k}`, { method: 'PUT', json: { value: s[k] } });
      toast('Saved. The public site updates within a minute.');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const about = (patch: Partial<SiteSettings['about']>) => setS({ ...s, about: { ...s.about, ...patch } });
  const vision = (patch: Partial<SiteSettings['vision']>) => setS({ ...s, vision: { ...s.vision, ...patch } });
  const contact = (patch: Partial<SiteSettings['contact']>) => setS({ ...s, contact: { ...s.contact, ...patch } });
  const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <>
      <PageHeader title="Site content" sub="Text for Who we are, Vision & mission, Contact us and the footer." />
      <div className="a-tabs" role="tablist">
        {([['about', 'Who we are'], ['vision', 'Vision & mission'], ['contact', 'Contact details'], ['social', 'Social media'], ['checklist', 'Launch checklist']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'about' ? (
        <section className="a-card a-form">
          <Field label="Introduction" wide hint="Shown at the top of Who we are and on the home page."><textarea className="a-input a-textarea" rows={3} value={s.about.intro} onChange={(e) => about({ intro: e.target.value })} /></Field>
          <Field label="Institutional background" wide><textarea className="a-input a-textarea a-textarea--tall" value={s.about.background} onChange={(e) => about({ background: e.target.value })} /></Field>
          <Field label="Mandate" wide><textarea className="a-input a-textarea" rows={2} value={s.about.mandate} onChange={(e) => about({ mandate: e.target.value })} /></Field>
          <Field label="Core areas of work" wide hint="One per line."><textarea className="a-input a-textarea" rows={6} value={s.about.core_areas.join('\n')} onChange={(e) => about({ core_areas: lines(e.target.value) })} /></Field>
          <Field label="Organisational information" wide hint="Structure, board, committees — whatever is approved for public access."><textarea className="a-input a-textarea" rows={5} value={s.about.organisation} onChange={(e) => about({ organisation: e.target.value })} /></Field>
          <Field label="Affiliations and partnerships" wide hint="One per line: Name | short description">
            <textarea className="a-input a-textarea" rows={4} value={s.about.affiliations.map((a) => `${a.name} | ${a.description}`).join('\n')} onChange={(e) => about({ affiliations: lines(e.target.value).map((l) => { const [name, ...d] = l.split('|'); return { name: name.trim(), description: d.join('|').trim() }; }) })} />
          </Field>
          <Field label="Motto" wide><input className="a-input" value={s.motto.en} onChange={(e) => setS({ ...s, motto: { en: e.target.value } })} /></Field>
          <Field label="Association name in Dzongkha" wide><input className="a-input a-dz" value={s.name_dz} onChange={(e) => setS({ ...s, name_dz: e.target.value })} /></Field>
          <div className="a-field--wide"><button type="button" className="a-btn a-btn--primary" disabled={saving} onClick={() => save('about', 'motto', 'name_dz')}>Save</button></div>
        </section>
      ) : null}

      {tab === 'vision' ? (
        <section className="a-card a-form">
          <Field label="Vision" wide><textarea className="a-input a-textarea" rows={3} value={s.vision.vision} onChange={(e) => vision({ vision: e.target.value })} /></Field>
          <Field label="Mission" wide hint="One statement per line."><textarea className="a-input a-textarea" rows={6} value={s.vision.mission.join('\n')} onChange={(e) => vision({ mission: lines(e.target.value) })} /></Field>
          <Field label="Values" wide hint="One per line: Title | explanation">
            <textarea className="a-input a-textarea" rows={6} value={s.vision.values.map((v) => `${v.title} | ${v.text}`).join('\n')} onChange={(e) => vision({ values: lines(e.target.value).map((l) => { const [title, ...t] = l.split('|'); return { title: title.trim(), text: t.join('|').trim() }; }) })} />
          </Field>
          <div className="a-field--wide"><button type="button" className="a-btn a-btn--primary" disabled={saving} onClick={() => save('vision')}>Save</button></div>
        </section>
      ) : null}

      {tab === 'contact' ? (
        <section className="a-card a-form">
          <Field label="Office address"><input className="a-input" value={s.contact.address} onChange={(e) => contact({ address: e.target.value })} /></Field>
          <Field label="Postal address"><input className="a-input" value={s.contact.postal} onChange={(e) => contact({ postal: e.target.value })} /></Field>
          <Field label="Telephone"><input className="a-input" value={s.contact.phone} onChange={(e) => contact({ phone: e.target.value })} /></Field>
          <Field label="Official email"><input className="a-input" type="email" value={s.contact.email} onChange={(e) => contact({ email: e.target.value })} /></Field>
          <Field label="Office hours"><input className="a-input" value={s.contact.hours} onChange={(e) => contact({ hours: e.target.value })} /></Field>
          <Field label="Map location" hint="Latitude, longitude — right-click the office in Google Maps to copy it.">
            <input className="a-input" value={`${s.contact.map.lat}, ${s.contact.map.lng}`} onChange={(e) => { const [lat, lng] = e.target.value.split(',').map((x) => Number(x.trim())); if (Number.isFinite(lat) && Number.isFinite(lng)) contact({ map: { lat, lng } }); }} />
          </Field>
          <div className="a-field--wide"><button type="button" className="a-btn a-btn--primary" disabled={saving} onClick={() => save('contact')}>Save</button></div>
        </section>
      ) : null}

      {tab === 'social' ? (
        <section className="a-card">
          <p className="a-muted">Approved social-media accounts, shown in the footer and on Contact us.</p>
          {s.social.map((so, i) => (
            <div key={i} className="a-faq-row">
              <input className="a-input" placeholder="Facebook" value={so.label} onChange={(e) => setS({ ...s, social: s.social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className="a-input" placeholder="https://facebook.com/…" value={so.url} onChange={(e) => setS({ ...s, social: s.social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <button type="button" className="a-icon-btn" onClick={() => setS({ ...s, social: s.social.filter((_, j) => j !== i) })} aria-label="Remove">×</button>
            </div>
          ))}
          <div className="a-row">
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setS({ ...s, social: [...s.social, { label: '', url: '' }] })}>Add an account</button>
            <button type="button" className="a-btn a-btn--primary" disabled={saving} onClick={() => save('social')}>Save</button>
          </div>
        </section>
      ) : null}

      {tab === 'checklist' ? (
        <section className="a-card">
          <p className="a-muted">Content that was drafted or is still missing at handover. Untick an item when BIGSA has supplied or approved it; it then disappears from the dashboard.</p>
          <ul className="a-checklist a-checklist--edit">
            {Object.entries(PENDING_LABELS).map(([k, label]) => (
              <li key={k}>
                <label className="a-check">
                  <input type="checkbox" checked={s.pending.includes(k)} onChange={(e) => setS({ ...s, pending: e.target.checked ? [...s.pending, k] : s.pending.filter((x) => x !== k) })} />
                  <span>{label}</span>
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="a-btn a-btn--primary" disabled={saving} onClick={() => save('pending')}>Save checklist</button>
        </section>
      ) : null}
    </>
  );
}
