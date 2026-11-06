'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  validateSubmission, inputFields, displayValue, formatBytes, fileExtension, DEFAULT_MAX_FILE_MB, FILE_EXTENSIONS_ALLOWED,
  type FormField, type PublicForm, type SubmissionData, type ValidationErrors, type FieldValue,
} from '@bigsa/shared';
import { lungtaBurst } from './motion/lungta';
import u from './ui.module.css';
import w from './wizard.module.css';

type Files = Record<string, File[]>;
type Row = Record<string, unknown>;
interface Receipt { reference: string; submitted_at: string }

const draftKey = (slug: string) => `bigsa:draft:${slug}`;

function initialData(form: PublicForm): SubmissionData {
  const data: SubmissionData = {};
  for (const f of inputFields(form.definition)) {
    if (f.type === 'repeater') data[f.key] = Array.from({ length: Math.max(f.minItems ?? 1, 1) }, () => ({}));
  }
  return data;
}

export function FormWizard({ form }: { form: PublicForm }) {
  const steps = form.definition.steps;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SubmissionData>(() => initialData(form));
  const [files, setFiles] = useState<Files>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [restored, setRestored] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const renderedAt = useRef(Date.now());
  const topRef = useRef<HTMLDivElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const isLast = step === steps.length - 1;

  // Restore a draft saved in this browser (files cannot be saved, only typed answers).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(form.slug));
      if (raw) {
        const saved = JSON.parse(raw) as { data: SubmissionData; step: number };
        setData((d) => ({ ...d, ...saved.data }));
        setRestored(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, [form.slug]);

  useEffect(() => {
    if (status === 'done') return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(form.slug), JSON.stringify({ data, step }));
      } catch {
        /* storage unavailable or full */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, step, form.slug, status]);

  const fileMeta = useMemo(
    () => Object.fromEntries(Object.entries(files).map(([k, list]) => [k, list.map((f) => ({ name: f.name, size: f.size, mime: f.type }))])),
    [files],
  );

  const set = (key: string, value: FieldValue) => {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const focusFirstError = (errs: ValidationErrors) => {
    const first = Object.keys(errs).find((k) => errs[k]);
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`f-${first.replace(/\./g, '-')}`) ?? document.querySelector<HTMLElement>(`[data-field="${first.split('.')[0]}"] input, [data-field="${first.split('.')[0]}"] select, [data-field="${first.split('.')[0]}"] textarea, [data-field="${first.split('.')[0]}"] button`);
      el?.focus();
    });
  };

  const next = () => {
    const errs = validateSubmission(form.definition, data, fileMeta, step);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    setDirection('forward');
    setStep((s) => s + 1);
    scrollTop();
  };

  const back = () => {
    setDirection('back');
    setStep((s) => Math.max(0, s - 1));
    setErrors({});
    scrollTop();
  };

  const submit = () => {
    const errs = validateSubmission(form.definition, data, fileMeta);
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0].split('.')[0];
      const at = steps.findIndex((s) => s.fields.some((f) => f.key === firstKey));
      if (at > -1) setStep(at);
      focusFirstError(errs);
      return;
    }
    const body = new FormData();
    body.set('data', JSON.stringify(data));
    body.set('_t', String(renderedAt.current));
    body.set('website', honeypot.current?.value ?? '');
    for (const [key, list] of Object.entries(files)) for (const f of list) body.append(key, f, f.name);

    setStatus('sending');
    setServerError(null);
    setProgress(0);
    // XHR rather than fetch so we can show upload progress on slow connections.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/forms/${encodeURIComponent(form.slug)}/submit`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let res: { reference?: string; submitted_at?: string; error?: string; details?: ValidationErrors } = {};
      try {
        res = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status === 201 && res.reference) {
        setReceipt({ reference: res.reference, submitted_at: res.submitted_at! });
        // A moment worth celebrating: prayer flags burst from the top of the page.
        setTimeout(() => lungtaBurst({ x: window.innerWidth / 2, y: window.innerHeight * 0.35 }), 250);
        setStatus('done');
        try {
          localStorage.removeItem(draftKey(form.slug));
        } catch {
          /* ignore */
        }
        scrollTop();
        return;
      }
      setStatus('failed');
      setServerError(res.error ?? 'The application could not be sent. Check your connection and try again.');
      if (res.details) {
        setErrors(res.details);
        const firstKey = Object.keys(res.details)[0]?.split('.')[0];
        const at = steps.findIndex((s) => s.fields.some((f) => f.key === firstKey));
        if (at > -1) setStep(at);
      }
    };
    xhr.onerror = () => {
      setStatus('failed');
      setServerError('The connection dropped before the application was sent. Nothing was lost — try submitting again.');
    };
    xhr.send(body);
  };

  if (status === 'done' && receipt) return <Confirmation form={form} data={data} files={files} receipt={receipt} />;

  const current = steps[step];
  const errorList = Object.entries(errors).filter(([, v]) => v);

  return (
    <div className={w.wizard} ref={topRef}>
      <ol className={w.progress} aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.title} className={i === step ? w.current : i < step ? w.done : ''} aria-current={i === step ? 'step' : undefined}>
            <span className={w.stepNum}>{i < step ? '✓' : i + 1}</span>
            <span className={w.stepLabel}>{s.title}</span>
          </li>
        ))}
      </ol>

      {restored && step === 0 ? (
        <p className={w.notice}>
          We restored the answers you started earlier in this browser. Attachments need to be added again.{' '}
          <button
            type="button"
            className={w.linkBtn}
            onClick={() => {
              setData(initialData(form));
              setRestored(false);
              try {
                localStorage.removeItem(draftKey(form.slug));
              } catch {
                /* ignore */
              }
            }}
          >
            Start over
          </button>
        </p>
      ) : null}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (isLast) submit();
          else next();
        }}
      >
        <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" className={u.honeypot} aria-hidden="true" />

        <div key={step} className={direction === 'forward' ? w.slideForward : w.slideBack}>
        <h2 className={w.stepTitle}>
          <span className={w.stepCount}>
            Step {step + 1} of {steps.length}
          </span>
          {current.title}
        </h2>
        {current.description ? <p className={w.stepDesc}>{current.description}</p> : null}

        {errorList.length ? (
          <div className={w.errorSummary} role="alert">
            <p>
              {errorList.length === 1 ? 'One thing needs' : `${errorList.length} things need`} your attention before you continue.
            </p>
          </div>
        ) : null}

        {isLast ? <Review form={form} data={data} files={files} onEdit={(i) => { setStep(i); scrollTop(); }} /> : null}

        <div className={w.fields}>
          {current.fields.map((f) => (
            <Field key={f.key} field={f} value={data[f.key]} files={files[f.key] ?? []} errors={errors} onChange={(v) => set(f.key, v)} onFiles={(list) => {
              setFiles((fs) => ({ ...fs, [f.key]: list }));
              if (errors[f.key]) setErrors((e) => ({ ...e, [f.key]: '' }));
            }} />
          ))}
        </div>
        </div>

        {serverError ? (
          <p className={w.serverError} role="alert">
            {serverError}
          </p>
        ) : null}

        <div className={w.actions}>
          {step > 0 ? (
            <button type="button" className={`${u.btn} ${u.ghost}`} onClick={back} disabled={status === 'sending'}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className={`${u.btn} ${u.primary}`} disabled={status === 'sending'}>
            {isLast ? (status === 'sending' ? `Sending${progress ? ` ${progress}%` : '…'}` : 'Submit application') : 'Continue'}
          </button>
        </div>
        {status === 'sending' ? (
          <div className={w.bar} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <p className={w.saved}>Your answers are saved in this browser as you type.</p>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- fields */

function Field({ field, value, files, errors, onChange, onFiles }: {
  field: FormField;
  value: FieldValue;
  files: File[];
  errors: ValidationErrors;
  onChange: (v: FieldValue) => void;
  onFiles: (f: File[]) => void;
}) {
  const id = `f-${field.key}`;
  const err = errors[field.key];
  const describedBy = [field.help ? `${id}-help` : null, err ? `${id}-err` : null].filter(Boolean).join(' ') || undefined;

  if (field.type === 'heading') return <h3 className={w.subheading}>{field.label}</h3>;
  if (field.type === 'paragraph') return <p className={w.para}>{field.label}</p>;

  const label = (
    <span className={u.label}>
      {field.label}
      {field.required && field.type !== 'checkbox' ? <span className={u.req}> *</span> : null}
      {!field.required && field.type !== 'checkbox' ? <span className={w.optional}> (optional)</span> : null}
    </span>
  );
  const help = field.help ? <span id={`${id}-help`} className={u.help}>{field.help}</span> : null;
  const error = err ? <span id={`${id}-err`} className={u.error}>{err}</span> : null;
  const cls = (base: string) => `${base} ${err ? u.invalid : ''}`;
  const str = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const wrap = (children: React.ReactNode) => (
    <div className={`${u.field} ${field.width === 'half' ? w.half : w.full}`} data-field={field.key}>
      {children}
    </div>
  );

  switch (field.type) {
    case 'textarea':
      return wrap(
        <>
          <label htmlFor={id}>{label}</label>
          {help}
          <textarea id={id} className={cls(u.textarea)} value={str} maxLength={field.max} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} aria-describedby={describedBy} required={field.required} />
          {field.max ? <span className={w.counter}>{str.length} / {field.max}</span> : null}
          {error}
        </>,
      );
    case 'select':
      return wrap(
        <>
          <label htmlFor={id}>{label}</label>
          {help}
          <select id={id} className={cls(u.select)} value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} aria-describedby={describedBy} required={field.required}>
            <option value="">Choose…</option>
            {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {error}
        </>,
      );
    case 'radio':
    case 'checkboxes': {
      const multi = field.type === 'checkboxes';
      const selected = multi ? (Array.isArray(value) ? (value as string[]) : []) : [str];
      return wrap(
        <fieldset className={w.fieldset} aria-describedby={describedBy}>
          <legend>{label}</legend>
          {help}
          <div className={w.choices}>
            {field.options?.map((o, i) => (
              <label key={o} className={`${w.choice} ${selected.includes(o) ? w.choiceOn : ''}`}>
                <input
                  id={i === 0 ? id : undefined}
                  type={multi ? 'checkbox' : 'radio'}
                  name={field.key}
                  value={o}
                  checked={selected.includes(o)}
                  onChange={(e) => onChange(multi ? (e.target.checked ? [...selected, o] : selected.filter((x) => x !== o)) : o)}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {error}
        </fieldset>,
      );
    }
    case 'checkbox':
      return wrap(
        <>
          <label className={`${w.check} ${err ? w.checkErr : ''}`}>
            <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!err} aria-describedby={describedBy} />
            <span>{field.label}{field.required ? <span className={u.req}> *</span> : null}</span>
          </label>
          {help}
          {error}
        </>,
      );
    case 'file':
      return wrap(<FileField field={field} id={id} files={files} onFiles={onFiles} label={label} help={help} error={error} invalid={!!err} />);
    case 'repeater':
      return wrap(<Repeater field={field} rows={(Array.isArray(value) ? value : []) as Row[]} errors={errors} onChange={onChange} label={label} help={help} error={error} />);
    default: {
      const type = field.type === 'cid' || field.type === 'number' ? 'text' : field.type;
      return wrap(
        <>
          <label htmlFor={id}>{label}</label>
          {help}
          <input
            id={id}
            type={type}
            inputMode={field.type === 'cid' || field.type === 'number' ? 'numeric' : field.type === 'tel' ? 'tel' : undefined}
            maxLength={field.type === 'cid' ? undefined : field.max ?? 300}
            autoComplete={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : /name/.test(field.key) && !/team|tournament/.test(field.key) ? 'name' : 'off'}
            placeholder={field.placeholder}
            className={cls(u.input)}
            value={str}
            onChange={(e) => onChange(field.type === 'cid' ? digits(e.target.value) : e.target.value)}
            aria-invalid={!!err}
            aria-describedby={describedBy}
            required={field.required}
          />
          {error}
        </>,
      );
    }
  }
}

function FileField({ field, id, files, onFiles, label, help, error, invalid }: {
  field: FormField; id: string; files: File[]; onFiles: (f: File[]) => void;
  label: React.ReactNode; help: React.ReactNode; error: React.ReactNode; invalid: boolean;
}) {
  const [over, setOver] = useState(false);
  const accept = (field.accept?.length ? field.accept : FILE_EXTENSIONS_ALLOWED).map((e) => e.toLowerCase());
  const max = field.maxFiles ?? 1;
  const add = (list: FileList | null) => {
    if (!list) return;
    onFiles([...files, ...Array.from(list)].slice(-max));
  };
  return (
    <>
      <span className={u.label}>{label}</span>
      {help}
      <label
        htmlFor={id}
        className={`${w.drop} ${over ? w.dropOver : ''} ${invalid ? w.dropErr : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
      >
        <input id={id} type="file" multiple={max > 1} accept={accept.map((a) => `.${a}`).join(',')} className="visually-hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        <span className={w.dropMain}>{files.length ? 'Add or replace a file' : 'Choose a file or drag it here'}</span>
        <span className={w.dropSub}>
          {accept.join(', ').toUpperCase()}, up to {field.maxSizeMB ?? DEFAULT_MAX_FILE_MB} MB{max > 1 ? `, ${max} files at most` : ''}
        </span>
      </label>
      {files.length ? (
        <ul className={w.fileList}>
          {files.map((f, i) => {
            const bad = !accept.includes(fileExtension(f.name)) || f.size > (field.maxSizeMB ?? DEFAULT_MAX_FILE_MB) * 1024 * 1024;
            return (
              <li key={f.name + i} className={bad ? w.fileBad : ''}>
                <span className={w.fileName}>{f.name}</span>
                <span className={w.fileSize}>{formatBytes(f.size)}</span>
                <button type="button" className={w.linkBtn} onClick={() => onFiles(files.filter((_, j) => j !== i))}>
                  Remove<span className="visually-hidden"> {f.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {error}
    </>
  );
}

function Repeater({ field, rows, errors, onChange, label, help, error }: {
  field: FormField; rows: Row[]; errors: ValidationErrors; onChange: (v: FieldValue) => void;
  label: React.ReactNode; help: React.ReactNode; error: React.ReactNode;
}) {
  const subs = field.fields ?? [];
  const max = field.maxItems ?? 100;
  const min = field.minItems ?? 0;
  const item = field.itemLabel ?? 'entry';
  const update = (i: number, key: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <fieldset className={w.fieldset}>
      <legend className={w.repLegend}>
        {label}
        <span className={w.repCount}>
          {rows.length} {item}
          {rows.length === 1 ? '' : 's'}
          {min === max ? `, exactly ${max} needed` : `, ${min}–${max} allowed`}
        </span>
      </legend>
      {help}
      <div className={w.repTable} role="table" aria-label={field.label}>
        <div className={w.repHead} role="row" style={{ gridTemplateColumns: cols(subs) }}>
          <span role="columnheader">#</span>
          {subs.map((s) => (
            <span role="columnheader" key={s.key}>
              {s.label}
              {s.required ? <span className={u.req}> *</span> : null}
            </span>
          ))}
          <span role="columnheader"><span className="visually-hidden">Remove</span></span>
        </div>
        {rows.map((row, i) => (
          <div className={w.repRow} role="row" key={i} style={{ gridTemplateColumns: cols(subs) }}>
            <span className={w.repNum} role="cell">{i + 1}</span>
            {subs.map((s) => {
              const key = `${field.key}.${i}.${s.key}`;
              const err = errors[key];
              const id = `f-${key.replace(/\./g, '-')}`;
              return (
                <span role="cell" key={s.key} className={w.repCell}>
                  {s.type === 'checkbox' ? (
                    <label className={w.repCheck}>
                      <input id={id} type="checkbox" checked={row[s.key] === true} onChange={(e) => update(i, s.key, e.target.checked)} />
                      <span className={w.repCheckLabel}>{s.label}</span>
                    </label>
                  ) : (
                    <>
                      <label htmlFor={id} className="visually-hidden">
                        {s.label} for {item} {i + 1}
                      </label>
                      <input
                        id={id}
                        className={`${u.input} ${w.repInput} ${err ? u.invalid : ''}`}
                        inputMode={s.type === 'cid' ? 'numeric' : undefined}
                        maxLength={s.type === 'cid' ? undefined : 200}
                        placeholder={s.label}
                        value={String(row[s.key] ?? '')}
                        onChange={(e) => update(i, s.key, s.type === 'cid' ? digits(e.target.value) : e.target.value)}
                        aria-invalid={!!err}
                      />
                      {err ? <span className={`${u.error} ${w.repErr}`}>{err}</span> : null}
                    </>
                  )}
                </span>
              );
            })}
            <span role="cell">
              {rows.length > min ? (
                <button type="button" className={w.repRemove} onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove ${item} ${i + 1}`}>
                  ×
                </button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      {rows.length < max ? (
        <button type="button" className={`${u.btn} ${u.ghost} ${w.repAdd}`} onClick={() => onChange([...rows, {}])}>
          Add {item}
        </button>
      ) : null}
      {error}
    </fieldset>
  );
}

/** CID input: keep digits only (so pasted '115 0700 1234' works), at most 11. */
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 11);

const cols = (subs: FormField[]) => `2.2rem ${subs.map((s) => (s.type === 'checkbox' ? 'minmax(90px, auto)' : 'minmax(140px, 1fr)')).join(' ')} 2.4rem`;

/* ---------------------------------------------------------------- review & receipt */

function Summary({ form, data, files, onEdit }: { form: PublicForm; data: SubmissionData; files: Files; onEdit?: (step: number) => void }) {
  const steps = form.definition.steps.slice(0, -1); // the final step holds the consent itself
  return (
    <div className={w.review}>
      {steps.map((s, i) => (
        <section key={s.title} className={w.reviewSection}>
          <header>
            <h3>{s.title}</h3>
            {onEdit ? (
              <button type="button" className={w.linkBtn} onClick={() => onEdit(i)}>
                Change<span className="visually-hidden"> {s.title}</span>
              </button>
            ) : null}
          </header>
          <dl>
            {s.fields
              .filter((f) => f.type !== 'heading' && f.type !== 'paragraph')
              .map((f) => {
                const v = f.type === 'file' ? (files[f.key] ?? []).map((x) => x.name).join(', ') : displayValue(f, data[f.key]);
                if (!v && !f.required) return null;
                return (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd className={f.type === 'repeater' ? w.pre : undefined}>{v || '—'}</dd>
                  </div>
                );
              })}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Review(props: { form: PublicForm; data: SubmissionData; files: Files; onEdit: (step: number) => void }) {
  return (
    <>
      <p className={w.stepDesc}>Check your answers. Use Change to fix anything before you submit.</p>
      <Summary {...props} />
    </>
  );
}

function Confirmation({ form, data, files, receipt }: { form: PublicForm; data: SubmissionData; files: Files; receipt: Receipt }) {
  const email = inputFields(form.definition).find((f) => f.type === 'email');
  const to = email ? (data[email.key] as string) : null;
  return (
    <div className={w.done} role="status">
      <div className={w.doneHead}>
        <p className={w.doneKicker}>Application received</p>
        <p className={`display ${w.ref}`}>{receipt.reference}</p>
        <p>
          Keep this reference number. Quote it if you contact BIGSA about this application.
          {to ? ` We’ve sent an acknowledgement to ${to}.` : ''}
        </p>
        <p className={w.when}>
          Submitted {new Date(receipt.submitted_at).toLocaleString('en-GB', { timeZone: 'Asia/Thimphu', dateStyle: 'long', timeStyle: 'short' })} (Bhutan time)
        </p>
        <div className={w.doneActions}>
          <button type="button" className={`${u.btn} ${u.primary}`} onClick={() => window.print()}>
            Print or save a copy
          </button>
          <a href="/forms" className={`${u.btn} ${u.ghost}`}>
            Back to forms
          </a>
        </div>
      </div>
      <div className={w.printable}>
        <h2>{form.title}</h2>
        <Summary form={form} data={data} files={files} />
      </div>
    </div>
  );
}
