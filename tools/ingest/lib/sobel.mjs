const magnitudeScale = 4 * Math.SQRT2;
const fullTurn = 2 * Math.PI;

export function extractSobel({ width, height, luminance }) {
  const edgeMagnitude = new Uint8Array(width * height);
  const edgeDirection = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - 1) * width;
    const middle = y * width;
    const bottom = Math.min(height - 1, y + 1) * width;

    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - 1);
      const right = Math.min(width - 1, x + 1);
      const topLeft = luminance[top + left];
      const topRight = luminance[top + right];
      const bottomLeft = luminance[bottom + left];
      const bottomRight = luminance[bottom + right];
      const gx =
        topRight +
        2 * luminance[middle + right] +
        bottomRight -
        (topLeft + 2 * luminance[middle + left] + bottomLeft);
      const gy =
        bottomLeft +
        2 * luminance[bottom + x] +
        bottomRight -
        (topLeft + 2 * luminance[top + x] + topRight);

      const cell = middle + x;
      edgeMagnitude[cell] = Math.round(Math.hypot(gx, gy) / magnitudeScale);
      const angle = Math.atan2(gy, gx);
      const clockwiseAngle = angle < 0 ? angle + fullTurn : angle;
      edgeDirection[cell] = Math.round((clockwiseAngle / fullTurn) * 255);
    }
  }

  return { edgeMagnitude, edgeDirection };
}
