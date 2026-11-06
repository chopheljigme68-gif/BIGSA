'use client';

import { useRef, useState } from 'react';
import { lungtaBurst } from './motion/lungta';
import u from './ui.module.css';
import w from './wizard.module.css';

type Errors = Partial<Record<'name' | 'email' | 'phone' | 'subject' | 'message', string>>;

/** General enquiry form with honeypot + timing checks against spam (see API assertHuman). */
export function ContactForm() {
  const renderedAt = useRef(Date.now());
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries()) as Record<string, string>;
    const errs: Errors = {};
    if (!body.name?.trim()) errs.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email ?? '')) errs.email = 'Enter an email address like name@example.com.';
    if ((body.subject ?? '').trim().length < 3) errs.subject = 'Enter a subject.';
    if ((body.message ?? '').trim().length < 10) errs.message = 'Write a message of at least 10 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus('sending');
    setMessage(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, _t: renderedAt.current }),
      });
      if (res.ok) {
        setStatus('sent');
        lungtaBurst();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrors(data.details ?? {});
      setMessage(data.error ?? 'Your message could not be sent. Try again.');
      setStatus('failed');
    } catch {
      setMessage('Your message could not be sent. Check your connection and try again.');
      setStatus('failed');
    }
  }

  if (status === 'sent') {
    return (
      <div className={w.doneHead} role="status">
        <p className={w.doneKicker}>Message sent</p>
        <p>Thank you. BIGSA usually replies within two working days.</p>
      </div>
    );
  }

  const field = (name: keyof Errors, label: string, el: React.ReactNode, optional = false) => (
    <div className={u.field}>
      <label htmlFor={`c-${name}`} className={u.label}>
        {label}
        {optional ? <span className={w.optional}> (optional)</span> : null}
      </label>
      {el}
      {errors[name] ? <span id={`c-${name}-err`} className={u.error}>{errors[name]}</span> : null}
    </div>
  );
  const attrs = (name: keyof Errors) => ({
    id: `c-${name}`,
    name,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `c-${name}-err` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className={w.fields} style={{ marginTop: 0 }}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={u.honeypot} aria-hidden="true" />
      <div className={w.half}>{field('name', 'Your name', <input {...attrs('name')} className={`${u.input} ${errors.name ? u.invalid : ''}`} autoComplete="name" />)}</div>
      <div className={w.half}>{field('email', 'Email', <input {...attrs('email')} type="email" className={`${u.input} ${errors.email ? u.invalid : ''}`} autoComplete="email" />)}</div>
      <div className={w.half}>{field('phone', 'Phone', <input {...attrs('phone')} type="tel" className={u.input} autoComplete="tel" />, true)}</div>
      <div className={w.half}>{field('subject', 'Subject', <input {...attrs('subject')} className={`${u.input} ${errors.subject ? u.invalid : ''}`} />)}</div>
      <div className={w.full}>{field('message', 'Message', <textarea {...attrs('message')} className={`${u.textarea} ${errors.message ? u.invalid : ''}`} maxLength={5000} />)}</div>
      {message ? <p className={`${w.serverError} ${w.full}`} role="alert">{message}</p> : null}
      <div className={w.full}>
        <button type="submit" className={`${u.btn} ${u.primary}`} disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
