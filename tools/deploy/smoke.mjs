import { checkPage } from './lib/smoke.mjs';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node tools/deploy/smoke.mjs <url>');
  process.exitCode = 1;
} else {
  const result = await checkPage(url);
  if (!result.ok) {
    console.error(result.reason);
    process.exitCode = 1;
  }
}
