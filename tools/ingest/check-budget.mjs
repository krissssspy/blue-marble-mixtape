import { fileURLToPath } from 'node:url';
import { verifySiteBudget } from './lib/site-budget.mjs';

const directory = fileURLToPath(new URL('../../dist/', import.meta.url));
const { files, totalBytes, largestBytes } = await verifySiteBudget(directory);
console.log(
  `Site budget passed for ${files} files and ${totalBytes} bytes (largest ${largestBytes} bytes).`,
);
