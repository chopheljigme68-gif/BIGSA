'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { slugify, validateDefinition, type FormDefinition, type FormField, type FieldType } from '@bigsa/shared';
import { api, useApi, ApiError, toLocalInput, fromLocalInput } from '@/admin/lib/api';
import { PageHeader, Field, Loading, useToast, useConfirm } from './ui';
import { FileField } from './MediaPicker';

const TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone number' },
  { value: 'cid', label: 'CID number (11 digits)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Choose one' },
  { value: 'checkboxes', label: 'Choose several' },
  { value: 'checkbox', label: 'Single tick box' },
  { value: 'file', label: 'File upload' },
  { value: 'repeater', label: 'Table of rows (e.g. players)' },
  { value: 'heading', label: 'Heading (text only)' },
  { value: 'paragraph', label: 'Paragraph (text only)' },
];

interface FormState {
  title: string; slug: string; summary: string; category: string; instructions: string; eligibility: string; requirements: string;
  faq: { q: string; a: string }[]; contact_note: string; definition: FormDefinition; opens_at: string | null; closes_at: string | null;
  is_active: boolean; notify_emails: string[]; download_id: string | null; ref_prefix: string; sort_order: number;
}

const BLANK: FormState = {
  title: '', slug: '', summary: '', category: 'General', instructions: '', eligibility: '', requirements: '', faq: [], contact_note: '',
  definition: { steps: [{ title: 'Your details', fields: [{ key: 'full_name', type: 'text', label: 'Full name', required: true }, { key: 'email', type: 'email', label: 'Email address', required: true }] }, { title: 'Review and submit', fields: [{ key: 'consent', type: 'checkbox', label: 'I confirm the information given is correct, and I consent to BIGSA collecting and using it to process this application.', required: true }] }] },
  opens_at: null, closes_at: null, is_active: false, notify_emails: [], download_id: null, ref_prefix: 'APP', sort_order: 100,
};

export function FormBuilder({ id }: { id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { data } = useApi<FormState & { id: string }>(isNew ? null : `/forms/${id}`);
  const [f, setF] = useState<FormState>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setF({ ...BLANK, ...data, summary: data.summary ?? '', instructions: data.instructions ?? '', eligibility: data.eligibility ?? '', requirements: data.requirements ?? '', contact_note: data.contact_note ?? '' });
  }, [data]);

  if (!isNew && !data) return <Loading />;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const setSteps = (steps: FormDefinition['steps']) => set('definition', { steps });
  const problems = validateDefinition(f.definition);

  const save = async () => {
    if (problems.length) return toast(problems[0], 'error');
    setSaving(true);
    try {
      const res = await api<{ id: string }>(isNew ? '/forms' : `/forms/${id}`, { method: isNew ? 'POST' : 'PUT', json: { ...f, slug: f.slug || slugify(f.title) } });
      toast(isNew ? 'Form created' : 'Form saved');
      if (isNew) router.replace(`/admin/forms/${res.id}`);
    } catch (e) {
      setErrors((e as ApiError).details ?? {});
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm('Delete this form? Forms that already have applications can only be switched off.'))) return;
    try {
      await api(`/forms/${id}`, { method: 'DELETE' });
      router.replace('/admin/forms');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'New form' : f.title}
        sub={<Link href="/admin/forms">← Online forms</Link>}
        actions={<button type="button" className="a-btn a-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save form'}</button>}
      />

      <section className="a-card a-form">
        <h2 className="a-card__title a-field--wide">About this form</h2>
        <Field label="Title" required wide error={errors.title}><input className="a-input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="One-line summary" wide><input className="a-input" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Group" hint="Forms with the same group are listed together, e.g. Tournament entry."><input className="a-input" value={f.category} onChange={(e) => set('category', e.target.value)} /></Field>
        <Field label="Reference prefix" hint="2–5 capital letters. Applications are numbered like ARC-2027-00012." error={errors.ref_prefix}><input className="a-input" value={f.ref_prefix} onChange={(e) => set('ref_prefix', e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))} /></Field>
        <Field label="Who can apply" wide><textarea className="a-input a-textarea" rows={2} value={f.eligibility} onChange={(e) => set('eligibility', e.target.value)} /></Field>
        <Field label="What applicants need (documents etc.)" wide><textarea className="a-input a-textarea" rows={2} value={f.requirements} onChange={(e) => set('requirements', e.target.value)} /></Field>
        <Field label="Instructions" wide><textarea className="a-input a-textarea" rows={3} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field>
        <Field label="Help contact" wide><input className="a-input" value={f.contact_note} onChange={(e) => set('contact_note', e.target.value)} placeholder="For help, call +975 2 332834 or email bigsabt@gmail.com." /></Field>
      </section>

      <section className="a-card a-form">
        <h2 className="a-card__title a-field--wide">Availability and notifications</h2>
        <label className="a-check a-field--wide"><input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} /><span>Switched on (visible on the website)</span></label>
        <Field label="Opens" hint="Bhutan time. Leave empty to open immediately."><input className="a-input" type="datetime-local" value={toLocalInput(f.opens_at)} onChange={(e) => set('opens_at', fromLocalInput(e.target.value))} /></Field>
        <Field label="Closes" hint="Leave empty to keep it open." error={errors.closes_at}><input className="a-input" type="datetime-local" value={toLocalInput(f.closes_at)} onChange={(e) => set('closes_at', fromLocalInput(e.target.value))} /></Field>
        <Field label="Also notify these emails" hint="Comma-separated. The BIGSA office address is always notified." wide><input className="a-input" value={f.notify_emails.join(', ')} onChange={(e) => set('notify_emails', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
        <Field label="Printable version (optional)" hint="A PDF or Word copy for people who prefer paper." wide><FileField value={f.download_id} onChange={(v) => set('download_id', v)} /></Field>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Questions</h2>
        <p className="a-muted a-small">Applicants go through the steps in order. The last step should hold the consent tick box; the review of all answers is shown above it automatically.</p>
        {problems.length ? <ul className="a-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        <StepsEditor steps={f.definition.steps} onChange={setSteps} />
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Frequently asked questions</h2>
        {f.faq.map((item, i) => (
          <div key={i} className="a-faq-row">
            <input className="a-input" placeholder="Question" value={item.q} onChange={(e) => set('faq', f.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <textarea className="a-input a-textarea" rows={2} placeholder="Answer" value={item.a} onChange={(e) => set('faq', f.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <button type="button" className="a-icon-btn" onClick={() => set('faq', f.faq.filter((_, j) => j !== i))} aria-label="Remove question">×</button>
          </div>
        ))}
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => set('faq', [...f.faq, { q: '', a: '' }])}>Add a question</button>
      </section>

      {!isNew ? (
        <div className="a-danger-zone">
          <div><h3>Delete this form</h3><p>Only possible while it has no applications.</p></div>
          <button type="button" className="a-btn a-btn--danger" onClick={remove}>Delete</button>
        </div>
      ) : null}
      {dialog}
    </>
  );
}

function StepsEditor({ steps, onChange }: { steps: FormDefinition['steps']; onChange: (s: FormDefinition['steps']) => void }) {
  const update = (i: number, patch: Partial<FormDefinition['steps'][number]>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const moveStep = (i: number, d: number) => {
    const next = [...steps];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="a-steps">
      {steps.map((step, i) => (
        <div key={i} className="a-step">
          <header className="a-step__head">
            <span className="a-step__num">{i + 1}</span>
            <input className="a-input a-input--title" value={step.title} placeholder="Step title" onChange={(e) => update(i, { title: e.target.value })} />
            <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Move step up">↑</button>
            <button type="button" className="a-icon-btn" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} aria-label="Move step down">↓</button>
            <button type="button" className="a-icon-btn" disabled={steps.length === 1} onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label="Remove step">×</button>
          </header>
          <input className="a-input" value={step.description ?? ''} placeholder="Short description shown under the step title (optional)" onChange={(e) => update(i, { description: e.target.value })} />
          <FieldsEditor fields={step.fields} onChange={(fields) => update(i, { fields })} />
        </div>
      ))}
      <button type="button" className="a-btn a-btn--ghost" onClick={() => onChange([...steps.slice(0, -1), { title: 'New step', fields: [] }, ...steps.slice(-1)])}>Add a step</button>
    </div>
  );
}

function FieldsEditor({ fields, onChange, nested = false }: { fields: FormField[]; onChange: (f: FormField[]) => void; nested?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const update = (i: number, patch: Partial<FormField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: number) => {
    const next = [...fields];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  const types = nested ? TYPES.filter((t) => ['text', 'email', 'tel', 'cid', 'number', 'date', 'checkbox'].includes(t.value)) : TYPES;

  return (
    <ul className="a-fields">
      {fields.map((f, i) => (
        <li key={i} className={`a-fieldrow ${open === i ? 'is-open' : ''}`}>
          <div className="a-fieldrow__main">
            <input className="a-input" value={f.label} placeholder="Question or label" onChange={(e) => update(i, { label: e.target.value, ...(f.key && f.key !== autoKey(f.label) ? {} : { key: autoKey(e.target.value) }) })} />
            <select className="a-input a-input--auto" value={f.type} onChange={(e) => update(i, { type: e.target.value as FieldType })}>
              {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {!['heading', 'paragraph'].includes(f.type) ? (
              <label className="a-inline"><input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} /> Required</label>
            ) : null}
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>Options</button>
            <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="a-icon-btn" disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="a-icon-btn" onClick={() => onChange(fields.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
          {open === i ? (
            <div className="a-fieldrow__more">
              <Field label="Internal key" hint="Used in exports. Lowercase, numbers and _ only."><input className="a-input" value={f.key} onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} /></Field>
              <Field label="Help text"><input className="a-input" value={f.help ?? ''} onChange={(e) => update(i, { help: e.target.value || undefined })} /></Field>
              {!nested ? (
                <Field label="Width"><select className="a-input" value={f.width ?? 'full'} onChange={(e) => update(i, { width: e.target.value as 'full' | 'half' })}><option value="full">Full width</option><option value="half">Half width</option></select></Field>
              ) : null}
              {['select', 'radio', 'checkboxes'].includes(f.type) ? (
                <Field label="Choices" hint="One per line." wide><textarea className="a-input a-textarea" rows={4} value={(f.options ?? []).join('\n')} onChange={(e) => update(i, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} /></Field>
              ) : null}
              {f.type === 'file' ? (
                <>
                  <Field label="Accepted formats" hint="e.g. pdf, jpg, png"><input className="a-input" value={(f.accept ?? ['pdf', 'jpg', 'jpeg', 'png']).join(', ')} onChange={(e) => update(i, { accept: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) })} /></Field>
                  <Field label="Largest file (MB)"><input className="a-input" type="number" min={1} max={10} value={f.maxSizeMB ?? 5} onChange={(e) => update(i, { maxSizeMB: Number(e.target.value) })} /></Field>
                  <Field label="Most files"><input className="a-input" type="number" min={1} max={10} value={f.maxFiles ?? 1} onChange={(e) => update(i, { maxFiles: Number(e.target.value) })} /></Field>
                </>
              ) : null}
              {['text', 'textarea', 'number'].includes(f.type) ? (
                <>
                  <Field label={f.type === 'number' ? 'Lowest value' : 'Fewest characters'}><input className="a-input" type="number" value={f.min ?? ''} onChange={(e) => update(i, { min: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
                  <Field label={f.type === 'number' ? 'Highest value' : 'Most characters'}><input className="a-input" type="number" value={f.max ?? ''} onChange={(e) => update(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
                </>
              ) : null}
              {f.type === 'repeater' ? (
                <>
                  <Field label="Row name" hint="e.g. player"><input className="a-input" value={f.itemLabel ?? ''} onChange={(e) => update(i, { itemLabel: e.target.value })} /></Field>
                  <Field label="Fewest rows"><input className="a-input" type="number" min={0} value={f.minItems ?? 1} onChange={(e) => update(i, { minItems: Number(e.target.value) })} /></Field>
                  <Field label="Most rows"><input className="a-input" type="number" min={1} value={f.maxItems ?? 20} onChange={(e) => update(i, { maxItems: Number(e.target.value) })} /></Field>
                  <div className="a-field--wide">
                    <p className="a-field__label">Columns</p>
                    <FieldsEditor nested fields={f.fields ?? []} onChange={(sub) => update(i, { fields: sub })} />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
      <li>
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => { onChange([...fields, { key: `field_${fields.length + 1}`, type: 'text', label: '' }]); setOpen(fields.length); }}>
          {nested ? 'Add a column' : 'Add a question'}
        </button>
      </li>
    </ul>
  );
}

const autoKey = (label: string) => slugify(label).replace(/-/g, '_').replace(/^(\d)/, 'f_$1').slice(0, 40) || 'field';
