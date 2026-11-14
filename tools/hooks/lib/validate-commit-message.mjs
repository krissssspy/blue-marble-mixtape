import { readFileSync } from 'node:fs';

const irregularVerbs = readFileSync(new URL('../irregular-verbs.txt', import.meta.url), 'utf8')
  .trim()
  .split(/\r?\n/);

export function validateCommitMessage(message) {
  const lines = message.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length > 1) {
    return { ok: false, reason: 'The commit message must be exactly one line.' };
  }
  const [subject = ''] = lines;
  const [firstWord] = subject.split(/\s/, 1);
  if (!/^[A-Z][a-z]+ed$/.test(firstWord) && !irregularVerbs.includes(firstWord)) {
    return {
      ok: false,
      reason: 'The first word must be a capitalised past-tense verb, such as "Added".',
    };
  }
  if ([...subject].length > 72) {
    return { ok: false, reason: 'The commit subject must be at most 72 characters.' };
  }
  return { ok: true };
}
