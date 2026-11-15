import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
if (existsSync(new URL('.git', root))) {
  execFileSync('git', ['config', 'core.hooksPath', 'tools/hooks'], { cwd: root, stdio: 'inherit' });
}
