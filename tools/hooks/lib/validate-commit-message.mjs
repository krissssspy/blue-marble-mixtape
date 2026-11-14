export function validateCommitMessage(message) {
  const lines = message.split('\n').filter((line) => line.trim() !== '');
  if (lines.length > 1) {
    return { ok: false, reason: 'The commit message must be exactly one line.' };
  }
  if (!/^[A-Z][a-z]+ed(\s|$)/.test(lines[0])) {
    return {
      ok: false,
      reason: 'The first word must be a capitalised past-tense verb, such as "Added".',
    };
  }
  return { ok: true };
}
