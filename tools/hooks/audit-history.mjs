import { auditHistory } from './lib/audit-history.mjs';

const findings = auditHistory(process.argv[2] ?? '');
for (const { hash, reasons } of findings) {
  console.error(`${hash}: ${reasons.join(' ')}`);
}
if (findings.length > 0) process.exitCode = 1;
