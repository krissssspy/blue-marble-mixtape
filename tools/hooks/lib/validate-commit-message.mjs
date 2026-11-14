export function validateCommitMessage(message) {
  const lines = message.split('\n').filter((line) => line.trim() !== '');
  if (lines.length > 1) {
    return { ok: false, reason: 'The commit message must be exactly one line.' };
  }
  return { ok: true };
}
