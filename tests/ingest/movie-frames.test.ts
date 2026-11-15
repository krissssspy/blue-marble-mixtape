import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { sampleViewFrames } from '../../tools/ingest/lib/movie-frames.mjs';

const page = JSON.parse(
  readFileSync(new URL('../fixtures/svs/5533.json', import.meta.url), 'utf8'),
);
const mediaGroups = page.media_groups;
const view = { groupId: 378004 };
const movieUrl =
  'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005533/AirQuality_MapWithLabels_5760x3240.mp4';
const frameCount = 48;
const frameSize = 320 * 180 * 3;
const source = { pageType: 'Visualization', mediaGroups };

function movie(url: string, width?: number, height?: number) {
  return { instance: { media_type: 'Movie', url, width, height } };
}

function fakeRunner(duration = '2.0', frames = Buffer.alloc(0)) {
  return vi.fn(async (command: string, args: string[]) => {
    if (command === 'ffprobe') {
      expect(args).toEqual([
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
      return Buffer.from(JSON.stringify({ streams: [{ duration }] }));
    }
    expect(command).toBe('ffmpeg');
    expect(args).toEqual([
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
      [
        'setpts=PTS-STARTPTS',
        'fps=48/2:round=near',
        'scale=320:180:force_original_aspect_ratio=decrease',
        'pad=320:180:(ow-iw)/2:(oh-ih)/2:color=0x0b1026',
        'setsar=1',
      ].join(','),
      '-frames:v',
      '48',
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      'pipe:1',
    ]);
    return frames;
  });
}

describe('sampleViewFrames', () => {
  it.each(['Visualization', 'Animation', 'Hyperwall Visual'])(
    'samples 48 ordered RGB frames from the featured %s view movie',
    async (pageType) => {
      const ordinals = Array.from({ length: frameCount }, (_, index) => index + 1);
      const rgb = Buffer.alloc(frameCount * frameSize);
      for (const ordinal of ordinals) rgb[(ordinal - 1) * frameSize] = ordinal;
      const run = fakeRunner('2.0', rgb);

      const frames = await sampleViewFrames({ pageType, mediaGroups }, view, {
        featured: true,
        run,
      });

      expect(run.mock.calls.map(([command]) => command)).toEqual(['ffprobe', 'ffmpeg']);
      expect(frames).toHaveLength(frameCount);
      expect(
        frames?.every((frame: Buffer) => Buffer.isBuffer(frame) && frame.length === frameSize),
      ).toBe(true);
      expect(frames?.map((frame: Buffer) => frame[0])).toEqual(ordinals);
    },
  );

  it.each([
    ['nonfeatured Visualization', 'Visualization', false, view],
    ['Notebook', 'Notebook', true, view],
    ['B-Roll', 'B-Roll', true, view],
    ['Produced Video', 'Produced Video', true, view],
    ['view without a movie', 'Visualization', true, { groupId: 378006 }],
    ['missing group', 'Visualization', true, { groupId: null }],
  ] as const)(
    'skips a %s without invoking either tool',
    async (_label, pageType, featured, selected) => {
      const run = vi.fn(async () => Buffer.alloc(0));

      expect(
        await sampleViewFrames({ pageType, mediaGroups }, selected, { featured, run }),
      ).toBeNull();
      expect(run).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['a malformed URL', 'not a URL'],
    ['an offsite HTTPS URL', 'https://svs.gsfc.nasa.gov.evil.test/movie.mp4'],
    ['a username on the NASA host', 'https://user@svs.gsfc.nasa.gov/movie.mp4'],
    ['a password without a username', 'https://:secret@svs.gsfc.nasa.gov/movie.mp4'],
    ['a trusted hostname in user info', 'https://svs.gsfc.nasa.gov@outside.test/movie.mp4'],
    ['an unsupported protocol', 'ftp://svs.gsfc.nasa.gov/movie.mp4'],
  ])('skips %s before subprocess execution', async (_label, url) => {
    const run = vi.fn(async () => Buffer.alloc(0));
    const mediaGroups = [{ id: view.groupId, items: [movie(url, 320, 180)] }];

    await expect(
      sampleViewFrames({ ...source, mediaGroups }, view, { featured: true, run }),
    ).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('skips null items, missing instances and non-movie media', async () => {
    const run = vi.fn(async () => Buffer.alloc(0));
    const still = { instance: { media_type: 'Image', url: movieUrl, width: 320, height: 180 } };
    const mediaGroups = [{ id: view.groupId, items: [null, { instance: null }, still] }];

    await expect(
      sampleViewFrames({ ...source, mediaGroups }, view, { featured: true, run }),
    ).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('selects the first smallest movie by pixel area from the matching group', async () => {
    const nasa = 'https://svs.gsfc.nasa.gov';
    const items = [
      movie(`${nasa}/unknown-width.mp4`, undefined, 5),
      movie(`${nasa}/narrower.mp4`, 400, 600),
      movie(`${nasa}/shorter.mp4`, 1200, 150),
      movie(movieUrl, 640, 200),
      movie(`${nasa}/same-area.mp4`, 512, 250),
      movie(`${nasa}/unknown-height.mp4`, 5),
    ];
    const mediaGroups = [
      { id: view.groupId - 1, items: [movie(`${nasa}/different-group.mp4`, 100, 100)] },
      { id: view.groupId, items },
    ];
    const run = fakeRunner('2.0', Buffer.alloc(frameCount * frameSize));

    await expect(
      sampleViewFrames({ ...source, mediaGroups }, view, { featured: true, run }),
    ).resolves.toHaveLength(frameCount);
    expect(run.mock.calls.map(([command]) => command)).toEqual(['ffprobe', 'ffmpeg']);
  });

  it.each([
    [{ streams: [{ duration: '3' }], format: { duration: '8' } }, 3],
    [{ streams: [{ duration: 'N/A' }], format: { duration: '8' } }, 8],
    [{ streams: [], format: { duration: '8' } }, 8],
    [{ format: { duration: '8' } }, 8],
  ])(
    'uses a valid stream duration before falling back to the container duration',
    async (probe, duration) => {
      const run = vi.fn(async (command: string, args: string[]) => {
        if (command === 'ffprobe') return Buffer.from(JSON.stringify(probe));
        expect(args[args.indexOf('-vf') + 1]).toContain(`fps=48/${duration}:round=near`);
        return Buffer.alloc(frameCount * frameSize);
      });

      await expect(sampleViewFrames(source, view, { featured: true, run })).resolves.toHaveLength(
        frameCount,
      );
      expect(run.mock.calls.map(([command]) => command)).toEqual(['ffprobe', 'ffmpeg']);
    },
  );

  it('reads binary frames and propagates a tool failure using the default subprocess runner', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'svs-movie-tools-'));
    const ffmpegPath = join(directory, 'ffmpeg');
    const writeTool = (path: string, script: string) =>
      writeFileSync(path, `#!/usr/bin/env node\n${script}\n`, { mode: 0o755 });
    const ordinals = Array.from({ length: frameCount }, (_, index) => index + 1);
    try {
      writeTool(
        join(directory, 'ffprobe'),
        'process.stdout.write(\'{"format":{"duration":"2"}}\');',
      );
      writeTool(
        ffmpegPath,
        `const frames = Buffer.alloc(${frameCount * frameSize});
for (let index = 0; index < ${frameCount}; index++) frames[index * ${frameSize}] = index + 1;
process.stdout.write(frames);`,
      );
      vi.stubEnv('PATH', `${directory}${delimiter}${process.env.PATH ?? ''}`);

      const frames = await sampleViewFrames(source, view, { featured: true });
      expect(
        frames?.every((frame: Buffer) => Buffer.isBuffer(frame) && frame.length === frameSize),
      ).toBe(true);
      expect(frames?.map((frame: Buffer) => frame[0])).toEqual(ordinals);

      writeTool(ffmpegPath, "console.error('fixture decode failure'); process.exitCode = 7;");
      await expect(sampleViewFrames(source, view, { featured: true })).rejects.toMatchObject({
        code: 7,
        stderr: Buffer.from('fixture decode failure\n'),
      });
    } finally {
      vi.unstubAllEnvs();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each(['0', 'unavailable'])(
    'rejects unusable duration %s before decoding',
    async (duration) => {
      const run = fakeRunner(duration);
      const source = { pageType: 'Visualization', mediaGroups };

      await expect(sampleViewFrames(source, view, { featured: true, run })).rejects.toThrow(
        /duration/i,
      );
      expect(run.mock.calls.map(([command]) => command)).toEqual(['ffprobe']);
    },
  );

  it('rejects a truncated RGB frame buffer', async () => {
    const run = fakeRunner('2.0', Buffer.alloc(frameCount * frameSize - 1));
    const source = { pageType: 'Visualization', mediaGroups };

    await expect(sampleViewFrames(source, view, { featured: true, run })).rejects.toThrow(
      /frame|bytes/i,
    );
  });
});
