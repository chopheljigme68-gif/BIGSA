/**
 * Create an admin account, or reset its password if the email already exists.
 *
 *   npm run admin:create
 *   npm run admin:create -- --email you@bigsa.bt --name "Your Name"
 *
 * Anything not passed is asked for. The password is always typed at a hidden
 * prompt (or read from ADMIN_PASSWORD for automated setups), never passed on
 * the command line, so it doesn't end up in shell history.
 */
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';
import { PASSWORD_RULE } from '../routes/admin/auth';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  const v = i > -1 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v.trim() : undefined;
}

/** Ask a question; with `hidden`, typed characters are not echoed. */
function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        // Show the prompt itself, mask everything typed after it.
        write(s.startsWith(question) ? question : s.replace(/[^\r\n]/g, '*'));
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  let email = arg('email') ?? (await ask('Admin email: '));
  while (!z.string().email().safeParse(email).success) {
    console.log('That is not a valid email address.');
    email = await ask('Admin email: ');
  }
  const name = arg('name') ?? ((await ask('Full name: ')) || 'BIGSA Administrator');

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    for (;;) {
      password = await ask('Password (12+ characters, letters and a number): ', true);
      const check = PASSWORD_RULE.safeParse(password);
      if (!check.success) {
        console.log(check.error.issues[0].message);
        continue;
      }
      if ((await ask('Type the password again: ', true)) !== password) {
        console.log('The two passwords don’t match. Try again.');
        continue;
      }
      break;
    }
  } else {
    const check = PASSWORD_RULE.safeParse(password);
    if (!check.success) throw new Error(`ADMIN_PASSWORD: ${check.error.issues[0].message}`);
  }

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query<{ created: boolean }>(
    `insert into admin_users (email, name, role, password_hash) values ($1, $2, 'super_admin', $3)
     on conflict (lower(email)) do update set name = excluded.name, password_hash = excluded.password_hash, role = 'super_admin',
       is_active = true, failed_logins = 0, locked_until = null, token_version = admin_users.token_version + 1
     returning (xmax = 0) as created`,
    [email, name, hash],
  );
  console.log(
    `${rows[0]?.created ? 'Created admin' : 'Updated admin'} ${email}. Sign in at <your site>/admin (locally: http://localhost:3000/admin).`,
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error(err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
