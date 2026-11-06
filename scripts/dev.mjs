// Starts the API and the website (public site + /admin) together on Windows, macOS and Linux.
// `npm run dev --workspaces` runs them one after another, and the first never exits.
import { spawn } from 'node:child_process';

const apps = [
  { name: 'api', color: '\x1b[33m', ws: '@bigsa/api' },
  { name: 'web', color: '\x1b[36m', ws: '@bigsa/web' },
];

const children = apps.map(({ name, color, ws }) => {
  const child = spawn('npm', ['run', 'dev', '-w', ws], { shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) out.write(prefix + l + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}exited with code ${code}`));
  return child;
});

const stop = () => {
  for (const c of children) if (!c.killed) c.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
