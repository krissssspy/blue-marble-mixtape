import type { ExhibitId } from '../exhibit-selection.js';
import { shadeBackdrop } from './background.js';
import { clearFramebuffer, fillRect, type Framebuffer } from './framebuffer.js';

type Tone = 0 | 1 | 2 | 3;
type Point = readonly [x: number, y: number];
type Paint = (frame: Framebuffer, offset: number) => void;

interface Motif {
  readonly name: string;
  readonly parts: readonly Paint[];
}

interface Layer {
  readonly parallax: number;
  readonly motifs: readonly Motif[];
}

const box =
  (x: number, y: number, width: number, height: number, tone: Tone): Paint =>
  (frame, offset) =>
    fillRect(frame, x + offset, y, width, height, tone);

function oval(x: number, y: number, width: number, height: number, tone: Tone): Paint {
  return (frame, offset) => {
    for (let row = -height; row <= height; row += 1) {
      const span = Math.floor(width * Math.sqrt(1 - (row / height) ** 2));
      fillRect(frame, x + offset - span, y + row, 2 * span + 1, 1, tone);
    }
  };
}

function ridge(tone: Tone, ...points: readonly Point[]): Paint {
  const rows: [number, number, number][] = [];
  const ys = points.map(([, y]) => y);
  for (let y = Math.min(...ys); y < Math.max(...ys); y += 1) {
    const edges: number[] = [];
    for (const [[x1, y1], [x2, y2]] of points.map(
      (point, index) => [point, points[(index + 1) % points.length]] as const,
    )) {
      if (y1 > y === y2 > y) continue;
      edges.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
    edges.sort((first, second) => first - second);
    for (let index = 0; index < edges.length; index += 2) {
      const left = Math.ceil(edges[index]);
      rows.push([left, y, Math.ceil(edges[index + 1]) - left]);
    }
  }
  return (frame, offset) => {
    for (const [x, y, width] of rows) fillRect(frame, x + offset, y, width, 1, tone);
  };
}

function stroke(tone: Tone, ...points: readonly Point[]): Paint {
  return (frame, offset) => {
    for (let index = 1; index < points.length; index += 1) {
      const [x, y] = points[index - 1];
      const [endX, endY] = points[index];
      const length = Math.max(Math.abs(endX - x), Math.abs(endY - y), 1);
      for (let step = 0; step <= length; step += 1) {
        const column = Math.round(x + ((endX - x) * step) / length);
        const row = Math.round(y + ((endY - y) * step) / length);
        fillRect(frame, column + offset, row, 1, 1, tone);
      }
    }
  };
}

const motif = (name: string, ...parts: readonly Paint[]): Motif => ({ name, parts });

const layer = (parallax: number, ...motifs: readonly Motif[]): Layer => ({ parallax, motifs });

export const EXHIBIT_BACKGROUND_LAYERS = {
  'sea-level': [
    layer(
      0,
      motif('harbour moon', oval(255, 41, 15, 15, 3)),
      motif('harbour horizon', box(0, 78, 320, 70, 1)),
    ),
    layer(
      0.14,
      motif(
        'iceberg backs',
        ridge(2, [0, 91], [27, 77], [47, 59], [74, 81], [90, 89], [71, 100], [0, 103]),
      ),
      motif(
        'moon reflection',
        box(239, 83, 28, 2, 2),
        box(230, 89, 48, 2, 2),
        box(238, 96, 27, 2, 2),
        box(242, 105, 20, 2, 2),
      ),
      motif(
        'ocean swell',
        stroke(2, [28, 110], [65, 107], [90, 112], [148, 111], [167, 114]),
        stroke(2, [205, 120], [239, 117], [281, 120], [319, 116]),
      ),
    ),
    layer(
      0.32,
      motif(
        'lighthouse',
        box(267, 65, 8, 41, 3),
        box(263, 59, 16, 8, 3),
        ridge(3, [262, 60], [271, 53], [280, 60]),
        box(268, 61, 6, 4, 1),
      ),
      motif(
        'single sail',
        ridge(3, [124, 100], [145, 70], [145, 101]),
        stroke(3, [121, 103], [152, 103], [145, 108], [128, 108]),
      ),
      motif(
        'flooded house',
        ridge(3, [13, 115], [37, 98], [62, 115]),
        box(21, 115, 34, 26, 2),
        box(35, 118, 8, 14, 1),
      ),
    ),
    layer(
      0.63,
      motif(
        'pier pilings',
        box(145, 128, 112, 4, 3),
        box(156, 132, 4, 16, 3),
        box(192, 132, 4, 16, 3),
        box(238, 132, 4, 16, 3),
      ),
      motif(
        'high-water gauge',
        box(278, 102, 3, 44, 3),
        box(274, 111, 10, 2, 3),
        box(274, 120, 10, 2, 3),
        box(274, 128, 10, 2, 3),
      ),
      motif('inundated road sign', box(70, 126, 3, 18, 3), box(65, 121, 13, 6, 3)),
      motif('mooring buoy', oval(109, 135, 6, 3, 3), box(107, 128, 3, 5, 3)),
    ),
  ],
  'air-quality': [
    layer(
      0,
      motif('clear air above haze', box(0, 61, 320, 87, 1), box(0, 73, 320, 6, 2)),
      motif('smog inversion layer', box(0, 85, 320, 6, 2), box(0, 99, 320, 9, 2)),
    ),
    layer(
      0.13,
      motif(
        'haze skyline',
        box(16, 62, 23, 64, 2),
        box(43, 51, 14, 81, 2),
        box(63, 72, 36, 59, 2),
        box(111, 55, 19, 81, 2),
        box(230, 57, 46, 79, 2),
        box(279, 71, 25, 66, 2),
      ),
      motif(
        'tethered weather balloon',
        oval(184, 44, 7, 10, 2),
        stroke(2, [182, 53], [184, 61], [187, 53]),
        box(182, 60, 5, 3, 2),
      ),
      motif(
        'atmosphere research plane',
        ridge(2, [60, 40], [84, 43], [95, 37], [101, 38], [91, 44], [108, 45], [101, 48], [70, 47]),
      ),
    ),
    layer(
      0.35,
      motif(
        'industrial stacks',
        box(6, 84, 9, 62, 3),
        box(21, 94, 8, 53, 3),
        oval(16, 76, 12, 6, 2),
        oval(29, 70, 16, 5, 2),
        oval(46, 66, 14, 4, 2),
      ),
      motif(
        'cylindrical roof tanks',
        box(231, 97, 25, 32, 3),
        oval(243, 97, 12, 4, 3),
        box(235, 128, 3, 20, 3),
        box(251, 128, 3, 20, 3),
      ),
      motif(
        'anemometer mast',
        box(160, 81, 2, 66, 3),
        box(149, 86, 24, 2, 3),
        oval(149, 87, 3, 3, 3),
        oval(173, 87, 3, 3, 3),
      ),
    ),
    layer(
      0.64,
      motif(
        'roof garden beds',
        box(52, 133, 46, 7, 3),
        oval(59, 130, 6, 5, 3),
        oval(71, 130, 6, 8, 3),
        oval(89, 130, 6, 4, 3),
      ),
      motif(
        'ventilation louvres',
        box(107, 133, 29, 12, 3),
        box(110, 136, 23, 1, 1),
        box(110, 140, 23, 1, 1),
      ),
      motif(
        'particulate sampling cabinet',
        box(284, 124, 18, 22, 3),
        box(288, 127, 9, 6, 1),
        box(295, 115, 2, 9, 3),
      ),
    ),
  ],
  biodiversity: [
    layer(
      0,
      motif(
        'jungle mist layers',
        box(0, 65, 320, 82, 1),
        box(0, 85, 320, 7, 2),
        box(0, 110, 320, 6, 2),
      ),
      motif('canopy moonlit gaps', oval(153, 56, 32, 14, 1), oval(249, 48, 25, 6, 1)),
    ),
    layer(
      0.12,
      motif(
        'waterfall behind canopy',
        ridge(2, [189, 76], [220, 76], [217, 136], [188, 144]),
        box(198, 79, 2, 58, 3),
        box(207, 78, 2, 60, 3),
      ),
      motif(
        'space-station lidar beams',
        stroke(2, [97, 22], [68, 101]),
        stroke(2, [105, 22], [78, 107]),
        box(90, 19, 24, 3, 2),
      ),
      motif(
        'distant emergent crowns',
        oval(25, 53, 29, 14, 2),
        box(20, 51, 7, 91, 2),
        oval(297, 61, 38, 17, 2),
        box(298, 61, 7, 86, 2),
      ),
    ),
    layer(
      0.32,
      motif(
        'lianas',
        stroke(3, [17, 37], [12, 76], [30, 104], [42, 90], [34, 44]),
        stroke(3, [286, 43], [272, 80], [283, 114], [300, 99], [306, 49]),
      ),
      motif(
        'bromeliad rosettes',
        ridge(3, [40, 121], [27, 102], [43, 111], [48, 96], [52, 114], [65, 105], [56, 123]),
      ),
      motif(
        'perched birds',
        oval(259, 93, 4, 5, 3),
        box(258, 88, 7, 2, 3),
        stroke(3, [233, 101], [267, 99], [283, 94]),
      ),
    ),
    layer(
      0.58,
      motif(
        'research platform',
        box(103, 113, 55, 4, 3),
        box(110, 117, 4, 30, 3),
        box(147, 117, 4, 29, 3),
        box(126, 103, 18, 10, 3),
      ),
      motif(
        'rope footbridge',
        stroke(3, [101, 110], [140, 119], [181, 129], [221, 130], [264, 116]),
        stroke(3, [101, 120], [143, 132], [183, 140], [221, 141], [264, 126]),
      ),
      motif(
        'buttress roots',
        ridge(3, [288, 74], [300, 74], [302, 132], [320, 147], [278, 147], [291, 128]),
      ),
    ),
  ],
  wildfires: [
    layer(
      0,
      motif('burn scar dusk', box(0, 64, 320, 84, 1)),
      motif('smoke-filtered sun', oval(252, 58, 17, 17, 2)),
    ),
    layer(
      0.15,
      motif(
        'ash ridge',
        ridge(
          2,
          [0, 97],
          [39, 75],
          [69, 81],
          [111, 53],
          [164, 88],
          [208, 68],
          [253, 85],
          [320, 77],
          [320, 148],
          [0, 148],
        ),
      ),
      motif(
        'standing smoke',
        oval(62, 73, 18, 11, 1),
        oval(52, 58, 23, 13, 1),
        oval(40, 41, 30, 12, 1),
        oval(192, 81, 17, 10, 1),
        oval(180, 58, 21, 13, 1),
      ),
      motif(
        'water-drop aircraft',
        ridge(
          3,
          [147, 35],
          [172, 37],
          [181, 31],
          [187, 31],
          [180, 39],
          [196, 41],
          [186, 44],
          [156, 42],
        ),
        stroke(2, [173, 45], [167, 63], [157, 78]),
      ),
    ),
    layer(
      0.33,
      motif(
        'blackened snags',
        box(39, 85, 4, 46, 3),
        stroke(3, [21, 91], [41, 105], [57, 98]),
        box(75, 81, 3, 51, 3),
        stroke(3, [61, 82], [76, 95], [92, 86]),
      ),
      motif(
        'lookout tower',
        stroke(3, [228, 148], [234, 96], [245, 96], [252, 148]),
        stroke(3, [230, 135], [249, 119], [232, 112]),
        box(228, 85, 24, 13, 3),
        ridge(3, [225, 86], [240, 76], [255, 86]),
      ),
      motif(
        'fire-line scar',
        stroke(3, [110, 107], [125, 114], [137, 110], [157, 121], [174, 118], [187, 125]),
      ),
    ),
    layer(
      0.62,
      motif(
        'creek firebreak',
        ridge(
          1,
          [0, 139],
          [55, 130],
          [94, 133],
          [129, 125],
          [168, 131],
          [114, 142],
          [78, 148],
          [0, 148],
        ),
      ),
      motif(
        'new shoots',
        stroke(3, [176, 146], [176, 132], [167, 127]),
        stroke(3, [176, 139], [184, 130]),
        stroke(3, [185, 147], [190, 136], [194, 133]),
      ),
      motif(
        'scorched trail sign',
        box(283, 109, 4, 37, 3),
        ridge(3, [274, 109], [299, 109], [307, 114], [299, 120], [274, 120]),
      ),
    ),
  ],
  'greenhouse-gases': [
    layer(
      0,
      motif(
        'cloud sea',
        box(0, 81, 320, 67, 1),
        oval(36, 94, 58, 16, 2),
        oval(181, 90, 59, 17, 2),
        oval(286, 96, 45, 14, 2),
      ),
      motif(
        'slanting satellite pass',
        stroke(2, [185, 55], [246, 22], [286, 16]),
        box(257, 20, 16, 3, 3),
        box(262, 17, 6, 9, 3),
      ),
    ),
    layer(
      0.16,
      motif(
        'rising carbon ridge',
        ridge(
          2,
          [0, 128],
          [34, 121],
          [50, 123],
          [84, 108],
          [107, 112],
          [150, 93],
          [175, 99],
          [210, 77],
          [233, 82],
          [272, 63],
          [320, 69],
          [320, 148],
          [0, 148],
        ),
      ),
      motif(
        'distant power plant',
        box(41, 105, 28, 21, 3),
        box(47, 95, 5, 15, 3),
        box(61, 92, 5, 16, 3),
      ),
      motif(
        'methane wetland',
        oval(99, 124, 25, 5, 1),
        stroke(3, [82, 124], [79, 116]),
        stroke(3, [89, 125], [90, 116]),
        stroke(3, [105, 126], [109, 119]),
      ),
    ),
    layer(
      0.34,
      motif(
        'primary observatory dome',
        oval(200, 112, 21, 19, 3),
        box(179, 111, 43, 24, 3),
        stroke(1, [200, 94], [197, 108], [197, 134]),
        box(182, 113, 36, 2, 2),
      ),
      motif(
        'companion telescope dome',
        oval(244, 123, 11, 12, 3),
        box(233, 122, 23, 15, 3),
        box(244, 111, 2, 21, 2),
      ),
      motif(
        'air sampling tower',
        stroke(3, [271, 146], [274, 70], [282, 70], [285, 146]),
        stroke(3, [273, 116], [284, 104], [274, 95], [283, 85]),
        box(266, 69, 24, 2, 3),
      ),
    ),
    layer(
      0.56,
      motif(
        'sampling inlet array',
        box(151, 121, 33, 7, 3),
        box(155, 114, 2, 9, 3),
        box(164, 113, 2, 10, 3),
        box(173, 117, 2, 6, 3),
      ),
      motif(
        'gas bottle rack',
        box(112, 133, 29, 14, 3),
        box(115, 128, 4, 11, 3),
        box(122, 127, 4, 12, 3),
        box(130, 130, 4, 9, 3),
      ),
      motif(
        'observatory snow shelf',
        ridge(1, [0, 133], [45, 133], [60, 139], [101, 141], [120, 148], [0, 148]),
      ),
    ),
  ],
  energy: [
    layer(
      0,
      motif('night-side Earth horizon', oval(161, 157, 194, 112, 1), oval(163, 162, 185, 106, 2)),
      motif(
        'polar orbital stars',
        box(50, 33, 2, 2, 2),
        box(106, 29, 2, 2, 2),
        box(175, 35, 2, 2, 2),
        box(280, 47, 2, 2, 2),
      ),
    ),
    layer(
      0.14,
      motif(
        'dark power district',
        box(2, 99, 28, 49, 1),
        box(31, 80, 24, 69, 1),
        box(55, 107, 37, 41, 1),
      ),
      motif(
        'illuminated neighbourhood',
        box(100, 89, 20, 59, 3),
        box(123, 72, 35, 77, 3),
        box(162, 88, 25, 62, 3),
        box(131, 80, 4, 3, 1),
        box(146, 86, 4, 3, 1),
        box(130, 98, 17, 2, 1),
      ),
      motif(
        'distant turbine line',
        box(245, 84, 2, 54, 3),
        stroke(3, [245, 85], [245, 70], [245, 85], [232, 92], [245, 85], [258, 94]),
        box(296, 91, 2, 50, 3),
        stroke(3, [296, 90], [286, 81], [296, 90], [307, 82], [296, 90], [296, 103]),
      ),
    ),
    layer(
      0.33,
      motif(
        'transmission pylons',
        stroke(3, [16, 147], [22, 70], [29, 60], [36, 70], [45, 147]),
        stroke(3, [20, 86], [38, 86], [18, 105], [40, 105], [17, 127], [43, 127]),
        stroke(3, [217, 147], [227, 72], [236, 68], [244, 73], [250, 147]),
      ),
      motif(
        'sagging power lines',
        stroke(3, [38, 77], [96, 87], [156, 89], [223, 78]),
        stroke(3, [41, 85], [99, 95], [160, 97], [223, 86]),
      ),
      motif(
        'rooftop solar field',
        ridge(3, [66, 111], [104, 111], [113, 124], [55, 124]),
        stroke(1, [72, 111], [66, 124]),
        stroke(1, [88, 111], [87, 124]),
        stroke(1, [103, 113], [106, 123]),
      ),
    ),
    layer(
      0.61,
      motif(
        'substation transformer bank',
        box(158, 127, 42, 18, 3),
        box(161, 122, 5, 8, 3),
        box(174, 119, 5, 11, 3),
        box(188, 121, 5, 9, 3),
        box(163, 131, 31, 2, 1),
      ),
      motif(
        'buried distribution route',
        stroke(3, [0, 143], [85, 137], [128, 145], [214, 144], [265, 134], [319, 139]),
      ),
      motif(
        'relay switch rack',
        box(264, 119, 29, 4, 3),
        box(267, 117, 3, 30, 3),
        box(283, 117, 3, 30, 3),
        stroke(3, [271, 114], [280, 110], [288, 114]),
      ),
    ),
  ],
  disasters: [
    layer(
      0,
      motif('cyclone wall', oval(213, 65, 106, 52, 1), oval(219, 63, 83, 45, 2)),
      motif('calm storm eye', oval(221, 61, 22, 13, 1), oval(226, 62, 12, 7, 0)),
    ),
    layer(
      0.16,
      motif(
        'coastal rain bands',
        stroke(3, [122, 70], [163, 43], [203, 37], [250, 43], [288, 64]),
        stroke(2, [142, 91], [182, 76], [228, 78], [272, 95]),
      ),
      motif(
        'hurricane hunter',
        ridge(3, [20, 51], [44, 52], [52, 44], [59, 44], [54, 53], [69, 56], [57, 60], [28, 58]),
      ),
      motif(
        'dark storm surge',
        ridge(
          1,
          [0, 94],
          [40, 109],
          [93, 100],
          [127, 112],
          [174, 101],
          [246, 112],
          [320, 94],
          [320, 148],
          [0, 148],
        ),
      ),
    ),
    layer(
      0.36,
      motif(
        'wind-bent palms',
        stroke(3, [72, 142], [76, 114], [87, 88], [111, 84]),
        stroke(3, [86, 91], [68, 89], [57, 94]),
        stroke(3, [88, 90], [109, 96], [123, 104]),
        stroke(3, [86, 91], [90, 77], [104, 71]),
      ),
      motif(
        'storm radar dome',
        oval(265, 107, 16, 13, 3),
        box(254, 106, 22, 29, 3),
        box(251, 122, 28, 2, 2),
      ),
      motif(
        'emergency shelter',
        ridge(3, [119, 121], [143, 103], [166, 121]),
        box(122, 121, 42, 20, 2),
        box(141, 123, 8, 18, 1),
      ),
    ),
    layer(
      0.64,
      motif(
        'stepped seawall',
        box(181, 133, 139, 14, 3),
        box(202, 129, 118, 5, 3),
        box(227, 123, 93, 7, 3),
      ),
      motif(
        'surge foam crests',
        stroke(2, [4, 120], [20, 112], [37, 119], [59, 121]),
        stroke(2, [0, 134], [26, 128], [66, 136], [107, 130]),
      ),
      motif(
        'slanted rain streaks',
        stroke(3, [177, 106], [164, 123]),
        stroke(3, [198, 99], [186, 117]),
        stroke(3, [304, 77], [291, 94]),
      ),
    ),
  ],
  'water-resources': [
    layer(
      0,
      motif('watershed sky', box(0, 70, 320, 78, 1)),
      motif(
        'paired gravity satellites',
        box(94, 37, 15, 4, 2),
        box(99, 33, 5, 13, 3),
        box(123, 40, 14, 4, 2),
        box(128, 37, 5, 11, 3),
        stroke(2, [104, 40], [130, 42]),
      ),
    ),
    layer(
      0.14,
      motif(
        'snowy watershed peaks',
        ridge(2, [0, 115], [46, 43], [72, 77], [111, 54], [160, 111], [171, 130], [0, 130]),
        ridge(3, [34, 62], [46, 43], [68, 72], [54, 66], [47, 70]),
      ),
      motif(
        'rock cutaway strata',
        ridge(
          2,
          [101, 99],
          [142, 79],
          [175, 91],
          [216, 69],
          [249, 83],
          [284, 56],
          [320, 78],
          [320, 148],
          [101, 148],
        ),
        stroke(1, [119, 105], [159, 100], [199, 120], [248, 98], [291, 110], [319, 107]),
        stroke(1, [110, 124], [143, 129], [191, 129], [238, 115], [286, 128], [319, 121]),
      ),
      motif(
        'dry watershed bank',
        ridge(
          1,
          [217, 98],
          [247, 84],
          [277, 78],
          [302, 89],
          [320, 86],
          [320, 103],
          [288, 100],
          [258, 95],
        ),
      ),
    ),
    layer(
      0.34,
      motif(
        'reservoir basin',
        ridge(3, [0, 97], [49, 101], [91, 96], [115, 119], [73, 127], [22, 118], [0, 121]),
      ),
      motif(
        'spillway dam',
        ridge(3, [91, 97], [110, 94], [126, 129], [104, 131]),
        box(106, 102, 3, 21, 2),
      ),
      motif('river outlet', stroke(3, [106, 125], [133, 120], [162, 127], [178, 127], [192, 135])),
    ),
    layer(
      0.61,
      motif(
        'water table contour',
        stroke(
          3,
          [81, 142],
          [115, 137],
          [157, 139],
          [191, 140],
          [232, 131],
          [279, 136],
          [319, 138],
        ),
      ),
      motif(
        'well and pump',
        box(232, 91, 4, 47, 3),
        box(223, 91, 18, 4, 3),
        stroke(3, [228, 90], [240, 82], [253, 89]),
        box(246, 89, 3, 9, 3),
      ),
      motif(
        'exposed roots',
        stroke(3, [282, 87], [283, 111], [268, 127]),
        stroke(3, [283, 110], [297, 124], [300, 131]),
        stroke(3, [280, 117], [284, 133]),
      ),
    ),
  ],
  agriculture: [
    layer(
      0,
      motif('farmland sky bands', box(0, 57, 320, 91, 1), box(0, 71, 320, 6, 2)),
      motif(
        'land imaging satellite',
        box(168, 37, 22, 3, 3),
        box(177, 33, 5, 11, 3),
        stroke(2, [179, 44], [148, 73]),
      ),
    ),
    layer(
      0.13,
      motif(
        'patchwork field parcels',
        ridge(2, [0, 102], [57, 72], [132, 89], [82, 134], [0, 126]),
        ridge(3, [84, 132], [139, 86], [234, 83], [199, 127], [130, 147]),
        ridge(2, [198, 123], [234, 85], [320, 86], [320, 139]),
      ),
      motif(
        'centre-pivot crop circles',
        oval(45, 106, 25, 11, 3),
        oval(45, 106, 17, 7, 2),
        stroke(3, [45, 106], [60, 110]),
      ),
      motif(
        'early crop furrows',
        stroke(2, [138, 96], [173, 97], [198, 91]),
        stroke(2, [122, 104], [159, 107], [192, 101]),
        stroke(2, [112, 115], [152, 118], [189, 112]),
      ),
    ),
    layer(
      0.3,
      motif(
        'barn and gable',
        ridge(3, [215, 108], [242, 89], [268, 108]),
        box(221, 106, 42, 35, 3),
        box(233, 117, 16, 24, 1),
        stroke(2, [233, 118], [247, 133]),
        stroke(2, [247, 118], [233, 133]),
      ),
      motif(
        'grain silo',
        box(274, 100, 15, 41, 3),
        oval(281, 100, 7, 6, 3),
        box(276, 119, 10, 1, 2),
      ),
      motif(
        'farm windmill',
        box(191, 98, 3, 47, 3),
        stroke(
          3,
          [192, 99],
          [185, 83],
          [192, 99],
          [209, 94],
          [192, 99],
          [198, 115],
          [192, 99],
          [177, 105],
        ),
      ),
    ),
    layer(
      0.59,
      motif(
        'tractor and tyres',
        box(92, 125, 22, 9, 3),
        box(100, 119, 11, 8, 3),
        oval(97, 136, 6, 6, 3),
        oval(112, 136, 4, 4, 3),
        box(94, 130, 2, 2, 1),
      ),
      motif(
        'irrigation canal',
        ridge(
          1,
          [0, 137],
          [49, 130],
          [93, 139],
          [128, 137],
          [160, 141],
          [128, 147],
          [85, 145],
          [44, 136],
          [0, 145],
        ),
      ),
      motif(
        'mature crop row',
        stroke(3, [297, 146], [298, 126], [292, 120]),
        stroke(3, [305, 146], [308, 127], [312, 121]),
        stroke(3, [318, 146], [318, 131], [314, 126]),
      ),
    ),
  ],
} satisfies Record<ExhibitId, readonly Layer[]>;

export function drawExhibitBackdrop(
  frame: Framebuffer,
  exhibit: ExhibitId,
  cameraLeft: number,
  parallax: boolean,
): void {
  clearFramebuffer(frame, 0);
  for (const { motifs, parallax: depth } of EXHIBIT_BACKGROUND_LAYERS[exhibit]) {
    const shift = parallax ? Math.floor(cameraLeft * depth) % frame.width : 0;
    for (const { parts } of motifs) {
      for (const paint of parts) {
        paint(frame, -shift);
        paint(frame, frame.width - shift);
      }
    }
  }
  shadeBackdrop(frame);
}
