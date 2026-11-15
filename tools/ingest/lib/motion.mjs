const blockSize = 4;
const searchRadius = 2;

export function estimateMotion({ width, height }, previous, next) {
  const motionX = new Int8Array(width * height);
  const motionY = new Int8Array(width * height);
  const frameDifferenceEnergy = new Uint8Array(width * height);

  function blockDifference(x, y, blockWidth, blockHeight, dx, dy) {
    let difference = 0;
    for (let row = 0; row < blockHeight; row += 1) {
      const start = (y + row) * width + x;
      const match = start + dy * width + dx;
      for (let col = 0; col < blockWidth; col += 1) {
        difference += Math.abs(previous[start + col] - next[match + col]);
      }
    }
    return difference;
  }

  for (let y = 0; y < height; y += blockSize) {
    const blockHeight = Math.min(blockSize, height - y);
    const minY = Math.max(-searchRadius, -y);
    const maxY = Math.min(searchRadius, height - y - blockHeight);

    for (let x = 0; x < width; x += blockSize) {
      const blockWidth = Math.min(blockSize, width - x);
      const minX = Math.max(-searchRadius, -x);
      const maxX = Math.min(searchRadius, width - x - blockWidth);

      let bestX = 0;
      let bestY = 0;
      let bestDifference = blockDifference(x, y, blockWidth, blockHeight, 0, 0);
      for (let dy = minY; dy <= maxY; dy += 1) {
        for (let dx = minX; dx <= maxX; dx += 1) {
          const difference = blockDifference(x, y, blockWidth, blockHeight, dx, dy);
          if (difference < bestDifference) {
            bestDifference = difference;
            bestX = dx;
            bestY = dy;
          }
        }
      }

      for (let row = 0; row < blockHeight; row += 1) {
        const start = (y + row) * width + x;
        motionX.fill(bestX, start, start + blockWidth);
        motionY.fill(bestY, start, start + blockWidth);
      }
    }
  }

  for (let cell = 0; cell < frameDifferenceEnergy.length; cell += 1) {
    const delta = previous[cell] - next[cell];
    frameDifferenceEnergy[cell] = Math.round((delta * delta) / 255);
  }

  return { motionX, motionY, frameDifferenceEnergy };
}
