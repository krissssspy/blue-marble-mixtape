import { execFileSync } from 'node:child_process';
import { validateCommitMessage } from './validate-commit-message.mjs';

export function auditHistory(range, cwd) {
  const [base, head, ...extra] = range.split('..');
  if (!base || !head || extra.length > 0) {
    throw new Error('Expected a two-dot commit range (BASE..HEAD).');
  }

  const git = (...args) =>
    execFileSync('git', ['--no-replace-objects', ...args], { cwd, encoding: 'utf8' });
  const baseHash = git('rev-parse', '--verify', '--end-of-options', `${base}^{commit}`).trim();
  const headHash = git('rev-parse', '--verify', '--end-of-options', `${head}^{commit}`).trim();
  const log = (...args) => git('log', '--no-show-signature', '--no-notes', '--no-decorate', ...args);

  const [ownerEmail, ...otherRoots] = log('--max-parents=0', '--format=%ae', baseHash, '--')
    .trimEnd()
    .split('\n');
  if (!ownerEmail || otherRoots.length > 0) {
    throw new Error('Expected the base history to have one root commit with an author email.');
  }

  const fields = log('-z', '--format=%H%x00%P%x00%ae%x00%ce%x00%B', `${baseHash}..${headHash}`, '--')
    .split('\0');
  const findings = [];
  for (let index = 0; index < fields.length - 1; index += 5) {
    const [hash, parents, author, committer, message] = fields.slice(index, index + 5);
    const reasons = [];

    const result = validateCommitMessage(message);
    if (!result.ok) reasons.push(result.reason);
    if (author !== ownerEmail) reasons.push('The author email must match the repository owner.');
    if (committer !== ownerEmail) reasons.push('The committer email must match the repository owner.');
    if (parents.includes(' ')) reasons.push('Merge commits are not allowed.');

    if (reasons.length > 0) findings.push({ hash, reasons });
  }
  return findings;
}
