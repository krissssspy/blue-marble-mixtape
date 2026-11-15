import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAltText } from '../../tools/ingest/lib/alt-text.mjs';

const source = {
  id: 100,
  title: 'Ocean observations',
  description: 'Measurements from a range of ocean instruments.',
  mediaGroups: [
    { id: 10, caption: 'An unrelated ocean temperature map.', description: '', items: [] },
    {
      id: 20,
      caption: '<p>Currents &amp; eddies</p><p>off the&nbsp;coast.</p>',
      description: 'A different description of the same view.',
      items: [],
    },
  ],
};

describe('resolveAltText', () => {
  it('prefers the selected image’s NASA alt text over other text for the view', () => {
    const image = { id: 201, alt_text: 'Counterclockwise currents off the coast.' };
    const variant = { id: 202, alt_text: 'Currents visible in the coastal water.' };
    const view = { groupId: 20, image: variant, imageVariants: [variant, image] };

    expect(resolveAltText(source, view, image)).toEqual({
      altText: image.alt_text,
      altSource: 'nasa',
    });
  });

  it('uses NASA alt text from another image variant of the same view', () => {
    const image = { id: 201, alt_text: 'NASA image' };
    const variant = { id: 202, alt_text: 'Curved currents near the continental shelf.' };
    const view = { groupId: 20, image, imageVariants: [image, variant] };

    expect(resolveAltText(source, view, image)).toEqual({
      altText: variant.alt_text,
      altSource: 'nasa',
    });
  });

  it.each([undefined, 'Image', 'NASA image', 'No preview', 'N/A', '  NASA IMAGE!  ', 'image.'])(
    'uses the matching group caption for missing or placeholder alt text %s',
    (alt_text) => {
      const image = { id: 201, alt_text };
      const view = { groupId: 20, image, imageVariants: [image] };

      expect(resolveAltText(source, view, image)).toEqual({
        altText: 'Currents & eddies off the coast.',
        altSource: 'authored',
      });
    },
  );

  it('normalizes HTML in the matching NASA caption without breaking inline notation', () => {
    const caption =
      'Atmospheric<br class="data-break">CO<sub>2</sub>: &quot;high&quot; &amp; &apos;low&apos;, &lt;450 ppm &gt;350 ppm.';
    const group = { ...source.mediaGroups[1], caption };
    const image = { id: 201, alt_text: '' };
    const view = { groupId: 20, image, imageVariants: [image] };

    expect(resolveAltText({ ...source, mediaGroups: [group] }, view, image)).toEqual({
      altText: `Atmospheric CO2: "high" & 'low', <450 ppm >350 ppm.`,
      altSource: 'authored',
    });
  });

  it('preserves useful image descriptions that contain a placeholder word', () => {
    const alt_text = 'Image showing warmer water in the satellite image.';
    const image = { id: 201, alt_text };
    const view = { groupId: 20, image, imageVariants: [image] };

    expect(resolveAltText(source, view, image)).toEqual({ altText: alt_text, altSource: 'nasa' });
  });

  it('uses the NASA group description when the matching group has no caption', () => {
    const matchingGroup = { ...source.mediaGroups[1], caption: '' };
    const image = { id: 201, alt_text: '' };
    const view = { groupId: 20, image, imageVariants: [image] };

    expect(resolveAltText({ ...source, mediaGroups: [matchingGroup] }, view, image)).toEqual({
      altText: matchingGroup.description,
      altSource: 'authored',
    });
  });

  it('uses the NASA source description before the title when the view has no text', () => {
    const image = { id: 201, alt_text: '' };
    const view = { groupId: null, image, imageVariants: [image] };

    expect(resolveAltText(source, view, image)).toEqual({
      altText: source.description,
      altSource: 'authored',
    });
  });

  it('uses the recorded NASA title when a standalone link has no caption or alt text', () => {
    const page = JSON.parse(
      readFileSync(new URL('../fixtures/svs/40509.json', import.meta.url), 'utf8'),
    );
    const card = page.media_groups
      .flatMap(({ items }: { items: unknown[] }) => items)
      .find(({ instance }: { instance: { id: number } }) => instance.id === 860409);
    const image = card.instance;
    const link = { id: image.id, title: card.title, description: card.caption, mediaGroups: [] };
    const view = { groupId: null, image, imageVariants: [image] };

    expect(resolveAltText(link, view, image)).toEqual({
      altText: 'True color imagery from Terra satellite',
      altSource: 'authored',
    });
  });

  it('fails when only an unrelated group has useful text', () => {
    const image = { id: 201, alt_text: 'Image' };
    const view = { groupId: 20, image, imageVariants: [image] };
    const unsupported = {
      ...source,
      title: 'N/A',
      description: '<p>No preview</p>',
      mediaGroups: [source.mediaGroups[0]],
    };

    expect(() => resolveAltText(unsupported, view, image)).toThrow(/alt|description/i);
  });
});
