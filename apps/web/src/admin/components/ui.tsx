'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from '@bigsa/shared';

/* ------------------------------------------------------------------ session */
export interface Me { id: string; name: string; email: string; role: Role }
export const SessionContext = createContext<Me | null>(null);
export const useMe = () => useContext(SessionContext);

/* ------------------------------------------------------------------ toasts */
type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="a-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`a-toast a-toast--${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ primitives */
export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="a-pagehead">
      <div>
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="a-pagehead__actions">{actions}</div> : null}
    </header>
  );
}

export function Field({ label, hint, error, children, required, wide }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; required?: boolean; wide?: boolean }) {
  return (
    <label className={`a-field ${wide ? 'a-field--wide' : ''}`}>
      <span className="a-field__label">
        {label}
        {required ? <span className="a-req"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="a-field__hint">{hint}</span> : null}
      {error ? <span className="a-field__error">{error}</span> : null}
    </label>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'info'; children: ReactNode }) {
  return <span className={`a-pill a-pill--${tone}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="a-empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="a-loading" aria-label="Loading" />;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="a-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`a-modal__panel ${wide ? 'a-modal__panel--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="a-modal__body">{children}</div>
      </div>
    </div>
  );
}

/** Confirm before destructive actions. Returns a promise-based trigger. */
export function useConfirm() {
  const [state, setState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (text: string) => new Promise<boolean>((resolve) => setState({ text, resolve }));
  const dialog = state ? (
    <Modal title="Are you sure?" onClose={() => (state.resolve(false), setState(null))}>
      <p>{state.text}</p>
      <div className="a-row a-row--end">
        <button type="button" className="a-btn a-btn--ghost" onClick={() => (state.resolve(false), setState(null))}>
          Cancel
        </button>
        <button type="button" className="a-btn a-btn--danger" onClick={() => (state.resolve(true), setState(null))} autoFocus>
          Yes, delete
        </button>
      </div>
    </Modal>
  ) : null;
  return { confirm, dialog };
}
