import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, sanitizeSubmission, validateDefinition, formStatus, displayValue, type FormDefinition } from './forms';

const def: FormDefinition = {
  steps: [
    {
      title: 'Team',
      fields: [
        { key: 'team_name', type: 'text', label: 'Team name', required: true },
        { key: 'captain_cid', type: 'cid', label: 'Captain CID', required: true },
        { key: 'email', type: 'email', label: 'Email', required: true },
        { key: 'sport', type: 'select', label: 'Sport', options: ['Archery', 'Khuru'], required: true },
      ],
    },
    {
      title: 'Players',
      fields: [
        {
          key: 'players', type: 'repeater', label: 'Players', minItems: 2, maxItems: 3, itemLabel: 'player',
          fields: [
            { key: 'name', type: 'text', label: 'Name', required: true },
            { key: 'cid', type: 'cid', label: 'CID', required: true },
          ],
        },
        { key: 'cid_copies', type: 'file', label: 'CID copies', required: true, accept: ['pdf'], maxSizeMB: 1 },
        { key: 'consent', type: 'checkbox', label: 'Consent', required: true },
      ],
    },
  ],
};

test('valid submission passes', () => {
  const errors = validateSubmission(
    def,
    {
      team_name: 'Changjiji Archers', captain_cid: '11507001234', email: 'a@b.bt', sport: 'Archery',
      players: [{ name: 'Karma', cid: '11507001235' }, { name: 'Dorji', cid: '11507001236' }],
      consent: true,
    },
    { cid_copies: [{ name: 'cids.pdf', size: 1000 }] },
  );
  assert.deepEqual(errors, {});
});

test('reports missing, malformed and duplicate values', () => {
  const errors = validateSubmission(
    def,
    { team_name: ' ', captain_cid: '123', email: 'nope', sport: 'Football', players: [{ name: 'A', cid: '11111111111' }, { name: '', cid: '11111111111' }] },
    { cid_copies: [{ name: 'virus.exe', size: 10 }] },
  );
  assert.equal(errors.team_name, 'Enter team name.');
  assert.equal(errors.captain_cid, 'A CID number has 11 digits.');
  assert.ok(errors.email);
  assert.ok(errors.sport);
  assert.ok(errors['players.1.name']);
  assert.equal(errors['players.1.cid'], 'Same CID as row 1.');
  assert.match(errors.cid_copies, /not an accepted format/);
  assert.equal(errors.consent, 'Tick this box to continue.');
});

test('repeater limits and per-step validation', () => {
  const errors = validateSubmission(def, { players: [{ name: 'a', cid: '11111111111' }] }, {}, 1);
  assert.match(errors.players, /at least 2 players/);
  assert.equal(errors.team_name, undefined, 'step 0 fields are not checked when validating step 1');
});

test('oversized file rejected', () => {
  const errors = validateSubmission(def, {}, { cid_copies: [{ name: 'a.pdf', size: 2 * 1024 * 1024 }] }, 1);
  assert.match(errors.cid_copies, /larger than 1 MB/);
});

test('sanitize drops unknown keys and coerces values', () => {
  const clean = sanitizeSubmission(def, { team_name: '  X ', hacker: 'drop me', consent: 'on', players: [{ name: ' A ', cid: '1', evil: 1 }] } as never);
  assert.deepEqual(clean, { team_name: 'X', consent: true, players: [{ name: 'A', cid: '1' }] });
});

test('definition checks', () => {
  assert.deepEqual(validateDefinition(def), []);
  const bad = validateDefinition({ steps: [{ title: '', fields: [{ key: 'Bad Key', type: 'select', label: '' }] }] });
  assert.ok(bad.length >= 3);
});

test('form status windows', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  assert.equal(formStatus({ is_active: false, opens_at: null, closes_at: null }, now), 'inactive');
  assert.equal(formStatus({ is_active: true, opens_at: '2026-07-01', closes_at: null }, now), 'upcoming');
  assert.equal(formStatus({ is_active: true, opens_at: null, closes_at: '2026-05-01' }, now), 'closed');
  assert.equal(formStatus({ is_active: true, opens_at: '2026-05-01', closes_at: '2026-07-01' }, now), 'open');
});

test('display value for repeaters', () => {
  const f = def.steps[1].fields[0];
  assert.equal(displayValue(f, [{ name: 'A', cid: '1' }, { name: 'B', cid: '2' }]), '1. A, 1\n2. B, 2');
});

import { parseMarkdown } from './markdown';
test('markdown is parsed safely', () => {
  const b = parseMarkdown('## Title\n\nHello **bold** and [x](javascript:alert(1)) and [ok](https://bigsa.bt)\n\n- a\n- b\n\n<script>alert(1)</script>');
  assert.equal(b[0].t, 'h2');
  const p = b[1] as { c: { t: string; v?: string; href?: string }[] };
  assert.ok(p.c.some((i) => i.t === 'strong'));
  assert.ok(!JSON.stringify(b).includes('javascript:'));
  assert.ok(p.c.some((i) => i.t === 'link' && i.href === 'https://bigsa.bt'));
  assert.equal(b[2].t, 'ul');
  assert.equal((b[3] as { c: { v: string }[] }).c[0].v, '<script>alert(1)</script>'); // stays text, rendered escaped
});
