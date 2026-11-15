const EXPECTED_TITLE = 'Overtone';

/**
 * @param {string} url
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function checkPage(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, reason: `Could not reach ${url}.` };
  }
  if (response.status !== 200) {
    return { ok: false, reason: `Expected status 200 but got ${response.status}.` };
  }
  const match = /<title>([^<]*)<\/title>/i.exec(await response.text());
  if (match?.[1] !== EXPECTED_TITLE) {
    return { ok: false, reason: `Page title is not "${EXPECTED_TITLE}".` };
  }
  return { ok: true };
}
