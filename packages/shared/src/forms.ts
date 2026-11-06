/**
 * BIGSA form engine.
 *
 * Online application forms are stored as JSON definitions in the database, so
 * BIGSA can add or change forms from the admin panel without a redeploy.
 * The same definition drives rendering (public site), editing (admin form
 * builder) and validation (here — run on both the client and the API).
 *
 * Deliberately dependency-free so it can run anywhere.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'cid'
  | 'file'
  | 'repeater'
  | 'heading'
  | 'paragraph';

export interface FormField {
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  required?: boolean;
  placeholder?: string;
  /** select / radio / checkboxes */
  options?: string[];
  /** number: value range. text/textarea: length range */
  min?: number;
  max?: number;
  /** file: allowed extensions without dot, e.g. ['pdf','jpg'] */
  accept?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  /** repeater: sub-fields and row limits */
  fields?: FormField[];
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
  width?: 'full' | 'half';
}

export interface FormStep {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormDefinition {
  steps: FormStep[];
}

export type FieldValue = string | number | boolean | string[] | Record<string, unknown>[] | null | undefined;
export type SubmissionData = Record<string, FieldValue>;

/** File metadata as seen by the validator (the bytes are handled elsewhere). */
export interface FileMeta {
  name: string;
  size: number;
  mime?: string;
}
export type SubmissionFiles = Record<string, FileMeta[]>;

export type ValidationErrors = Record<string, string>;

export const DISPLAY_ONLY: FieldType[] = ['heading', 'paragraph'];
export const FILE_EXTENSIONS_ALLOWED = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];
export const DEFAULT_MAX_FILE_MB = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Bhutanese Citizenship ID: 11 digits. */
const CID_RE = /^\d{11}$/;
/** Lenient phone: optional +, digits, spaces, dashes; 7–15 digits. */
const TEL_RE = /^\+?[\d\s-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function allFields(def: FormDefinition): FormField[] {
  return def.steps.flatMap((s) => s.fields);
}

export function inputFields(def: FormDefinition): FormField[] {
  return allFields(def).filter((f) => !DISPLAY_ONLY.includes(f.type));
}

function isEmpty(v: FieldValue): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'boolean') return v === false;
  return false;
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

/** Validate one scalar field. Returns an error message or null. */
export function validateField(field: FormField, value: FieldValue, files?: FileMeta[]): string | null {
  if (DISPLAY_ONLY.includes(field.type)) return null;

  if (field.type === 'file') {
    const list = files ?? [];
    if (field.required && list.length === 0) return `Attach ${field.label.toLowerCase()}.`;
    const maxFiles = field.maxFiles ?? 1;
    if (list.length > maxFiles) return `Attach no more than ${maxFiles} file${maxFiles > 1 ? 's' : ''}.`;
    const accept = (field.accept?.length ? field.accept : FILE_EXTENSIONS_ALLOWED).map((a) => a.toLowerCase());
    const maxMB = field.maxSizeMB ?? DEFAULT_MAX_FILE_MB;
    for (const f of list) {
      const ext = fileExtension(f.name);
      if (!accept.includes(ext)) return `${f.name} is not an accepted format. Use ${accept.join(', ').toUpperCase()}.`;
      if (f.size > maxMB * 1024 * 1024) return `${f.name} is larger than ${maxMB} MB.`;
    }
    return null;
  }

  if (field.type === 'repeater') {
    const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const min = field.minItems ?? (field.required ? 1 : 0);
    const label = (field.itemLabel ?? 'entry').toLowerCase();
    if (rows.length < min) return `Add at least ${min} ${label}${min > 1 ? 's' : ''}.`;
    if (field.maxItems && rows.length > field.maxItems) return `Add no more than ${field.maxItems} ${label}s.`;
    return null;
  }

  if (field.type === 'checkbox') {
    if (field.required && value !== true && value !== 'true' && value !== 'on') return 'Tick this box to continue.';
    return null;
  }

  if (isEmpty(value)) return field.required ? `Enter ${field.label.toLowerCase()}.` : null;

  const str = typeof value === 'string' ? value.trim() : String(value);
  switch (field.type) {
    case 'email':
      return EMAIL_RE.test(str) ? null : 'Enter an email address like name@example.com.';
    case 'cid':
      return CID_RE.test(str) ? null : 'A CID number has 11 digits.';
    case 'tel':
      return TEL_RE.test(str) ? null : 'Enter a phone number, e.g. 17123456.';
    case 'date':
      return DATE_RE.test(str) && !Number.isNaN(Date.parse(str)) ? null : 'Enter a valid date.';
    case 'number': {
      const n = Number(str);
      if (!Number.isFinite(n)) return 'Enter a number.';
      if (field.min !== undefined && n < field.min) return `Enter ${field.min} or more.`;
      if (field.max !== undefined && n > field.max) return `Enter ${field.max} or less.`;
      return null;
    }
    case 'select':
    case 'radio':
      return field.options?.includes(str) ? null : 'Choose one of the options.';
    case 'checkboxes': {
      const arr = Array.isArray(value) ? (value as string[]) : [str];
      return arr.every((v) => field.options?.includes(v)) ? null : 'Choose from the options listed.';
    }
    case 'text':
    case 'textarea': {
      if (field.min !== undefined && str.length < field.min) return `Use at least ${field.min} characters.`;
      const max = field.max ?? (field.type === 'textarea' ? 5000 : 300);
      if (str.length > max) return `Use ${max} characters or fewer.`;
      return null;
    }
    default:
      return null;
  }
}

/**
 * Validate a whole submission. Error keys are field keys; repeater cells use
 * `key.rowIndex.subKey` so the UI can point at the exact cell.
 */
export function validateSubmission(
  def: FormDefinition,
  data: SubmissionData,
  files: SubmissionFiles = {},
  stepIndex?: number,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const steps = stepIndex === undefined ? def.steps : [def.steps[stepIndex]].filter(Boolean);

  for (const step of steps) {
    for (const field of step.fields) {
      const err = validateField(field, data[field.key], files[field.key]);
      if (err) errors[field.key] = err;

      if (field.type === 'repeater' && Array.isArray(data[field.key])) {
        const rows = data[field.key] as Record<string, FieldValue>[];
        rows.forEach((row, i) => {
          for (const sub of field.fields ?? []) {
            const subErr = validateField(sub, row?.[sub.key] as FieldValue);
            if (subErr) errors[`${field.key}.${i}.${sub.key}`] = subErr;
          }
        });
        // Duplicate CIDs inside one repeater are almost always a typing error.
        const cidField = field.fields?.find((f) => f.type === 'cid');
        if (cidField) {
          const seen = new Map<string, number>();
          rows.forEach((row, i) => {
            const v = String(row?.[cidField.key] ?? '').trim();
            if (!v) return;
            if (seen.has(v)) errors[`${field.key}.${i}.${cidField.key}`] = `Same CID as row ${seen.get(v)! + 1}.`;
            else seen.set(v, i);
          });
        }
      }
    }
  }
  return errors;
}

/** Strip unknown keys and coerce values to what the definition expects. */
export function sanitizeSubmission(def: FormDefinition, data: SubmissionData): SubmissionData {
  const out: SubmissionData = {};
  for (const field of inputFields(def)) {
    if (field.type === 'file') continue;
    const v = data[field.key];
    if (v === undefined) continue;
    if (field.type === 'repeater') {
      const rows = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
      out[field.key] = rows.slice(0, field.maxItems ?? 100).map((row) => {
        const clean: Record<string, unknown> = {};
        for (const sub of field.fields ?? []) {
          const sv = row?.[sub.key];
          clean[sub.key] = sub.type === 'checkbox' ? sv === true || sv === 'true' || sv === 'on' : typeof sv === 'string' ? sv.trim() : sv ?? '';
        }
        return clean;
      });
    } else if (field.type === 'checkbox') {
      out[field.key] = v === true || v === 'true' || v === 'on';
    } else if (field.type === 'checkboxes') {
      out[field.key] = (Array.isArray(v) ? v : [v]).map(String);
    } else if (field.type === 'number') {
      out[field.key] = v === '' ? null : Number(v);
    } else {
      out[field.key] = typeof v === 'string' ? v.trim() : String(v);
    }
  }
  return out;
}

/** Check a form definition is well-formed (used by the admin form builder and API). */
export function validateDefinition(def: unknown): string[] {
  const problems: string[] = [];
  const d = def as FormDefinition;
  if (!d || !Array.isArray(d.steps) || d.steps.length === 0) return ['A form needs at least one step.'];
  const keys = new Set<string>();
  const check = (f: FormField, where: string) => {
    if (!f.key || !/^[a-z][a-z0-9_]*$/.test(f.key)) problems.push(`${where}: field key "${f.key}" must be lowercase letters, numbers and underscores.`);
    if (!f.label) problems.push(`${where}: every field needs a label.`);
    if (['select', 'radio', 'checkboxes'].includes(f.type) && !(f.options && f.options.length)) problems.push(`${where}: "${f.label}" needs options.`);
    if (f.type === 'repeater' && !(f.fields && f.fields.length)) problems.push(`${where}: "${f.label}" needs sub-fields.`);
  };
  d.steps.forEach((s, si) => {
    if (!s.title) problems.push(`Step ${si + 1} needs a title.`);
    (s.fields ?? []).forEach((f) => {
      check(f, `Step ${si + 1}`);
      if (keys.has(f.key)) problems.push(`Field key "${f.key}" is used twice.`);
      keys.add(f.key);
      f.fields?.forEach((sub) => check(sub, `Step ${si + 1} › ${f.label}`));
    });
  });
  return problems;
}

/** Human-readable value for exports, emails and the admin detail view. */
export function displayValue(field: FormField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (field.type === 'repeater') {
      return (value as Record<string, unknown>[])
        .map((row, i) => `${i + 1}. ` + (field.fields ?? []).map((s) => displayValue(s, row[s.key])).filter(Boolean).join(', '))
        .join('\n');
    }
    return value.join(', ');
  }
  return String(value);
}

export type FormStatus = 'open' | 'upcoming' | 'closed' | 'inactive';

export function formStatus(f: { is_active: boolean; opens_at: string | null; closes_at: string | null }, now = new Date()): FormStatus {
  if (!f.is_active) return 'inactive';
  if (f.opens_at && new Date(f.opens_at) > now) return 'upcoming';
  if (f.closes_at && new Date(f.closes_at) < now) return 'closed';
  return 'open';
}
