import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const maxFileBytes = 2_000_000;
const maxTotalBytes = 150_000_000;

export async function verifySiteBudget(directory) {
  let files = 0;
  let totalBytes = 0;
  let largestBytes = 0;

  for (const entry of await readdir(directory, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;

    const path = join(entry.parentPath, entry.name);
    const { size } = await stat(path);
    if (size > maxFileBytes) {
      throw new Error(
        `${relative(directory, path)} is ${size} bytes, above the ${maxFileBytes}-byte file limit.`,
      );
    }
    files += 1;
    totalBytes += size;
    largestBytes = Math.max(largestBytes, size);
  }

  if (totalBytes > maxTotalBytes) {
    throw new Error(
      `The built site is ${totalBytes} bytes, above the ${maxTotalBytes}-byte site limit.`,
    );
  }
  return { files, totalBytes, largestBytes };
}
