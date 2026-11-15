import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const moviePageTypes = new Set(['Visualization', 'Animation', 'Hyperwall Visual']);
const frameCount = 48;
const frameBytes = 320 * 180 * 3;
const outputBytes = frameCount * frameBytes;

async function runTool(command, args) {
  const { stdout } = await execute(command, args, {
    encoding: 'buffer',
    maxBuffer: outputBytes,
    timeout: 180_000,
    killSignal: 'SIGKILL',
  });
  return stdout;
}

function pickMovieUrl(items) {
  let selected = null;
  let smallestArea = Infinity;
  for (const item of items) {
    const media = item?.instance;
    if (media?.media_type !== 'Movie') continue;

    const url = URL.parse(media.url);
    if (url?.host !== 'svs.gsfc.nasa.gov' || url.username || url.password) continue;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    const { width, height } = media;
    const area = width > 0 && height > 0 ? width * height : Infinity;
    if (selected && area >= smallestArea) continue;

    url.protocol = 'https:';
    selected = url.href;
    smallestArea = area;
  }
  return selected;
}

export async function sampleViewFrames(source, view, { featured, run = runTool }) {
  if (!featured || !moviePageTypes.has(source.pageType)) return null;
  const group = source.mediaGroups.find(({ id }) => id === view.groupId);
  const movieUrl = pickMovieUrl(group?.items ?? []);
  if (!movieUrl) return null;

  const probe = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=duration:format=duration',
    '-of',
    'json',
    '-tls_verify',
    '1',
    movieUrl,
  ]);
  const { streams, format } = JSON.parse(probe.toString('utf8'));
  const duration = [streams?.[0]?.duration, format?.duration]
    .map(Number)
    .find((seconds) => Number.isFinite(seconds) && seconds > 0);
  if (duration === undefined) throw new Error('The SVS movie has no usable duration.');

  const filter = [
    'setpts=PTS-STARTPTS',
    `fps=${frameCount}/${duration}:round=near`,
    'scale=320:180:force_original_aspect_ratio=decrease',
    'pad=320:180:(ow-iw)/2:(oh-ih)/2:color=0x0b1026',
    'setsar=1',
  ].join(',');
  const frames = await run('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-tls_verify',
    '1',
    '-i',
    movieUrl,
    '-map',
    '0:v:0',
    '-an',
    '-sn',
    '-dn',
    '-vf',
    filter,
    '-frames:v',
    String(frameCount),
    '-pix_fmt',
    'rgb24',
    '-f',
    'rawvideo',
    'pipe:1',
  ]);
  if (frames.length !== outputBytes) {
    throw new Error(`Expected ${outputBytes} RGB frame bytes, received ${frames.length}.`);
  }
  return Array.from({ length: frameCount }, (_, index) =>
    frames.subarray(index * frameBytes, (index + 1) * frameBytes),
  );
}
