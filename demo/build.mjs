import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
function run(folder, script, args) {
  const cwd = fileURLToPath(new URL(folder + '/', root));
  const result = spawnSync(process.execPath, [script, ...args], { cwd, stdio: 'inherit', env: { ...process.env, VITE_DEMO: '1' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('apps/astronaut-eva-hud-ZX', 'node_modules/vite/bin/vite.js', ['build', '--base=/hud/']);
run('apps/tablet/frontend', 'node_modules/typescript/bin/tsc', ['-b']);
run('apps/tablet/frontend', 'node_modules/vite/bin/vite.js', ['build', '--base=/tablet/']);
