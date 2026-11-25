const AsteroidRender = (() => {
  const TAU = 2 * Math.PI;
  const textureWidth = 360, textureHeight = 180;
  let seed = 216278;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const craters = Array.from({ length: 73 }, (_, index) => {
    const z = 2 * random() - 1, angle = TAU * random(), radial = Math.sqrt(1 - z * z);
    return {
      x: radial * Math.cos(angle), y: radial * Math.sin(angle), z,
      radius: index < 12 ? .16 + .13 * random() : .039 + .093 * random()
    };
  });
  const texture = new Float32Array(textureWidth * textureHeight);
  for (let row = 0; row < textureHeight; row++) {
    const latitude = Math.PI * ((row + .5) / textureHeight - .5);
    const radial = Math.cos(latitude), z = Math.sin(latitude);
    for (let col = 0; col < textureWidth; col++) {
      const lon = TAU * ((col + .5) / textureWidth - .5);
      const x = radial * Math.cos(lon), y = radial * Math.sin(lon);
      let tint = 5 * Math.sin(x * 15 + y * 8) + 4 * Math.cos(z * 19 - y * 6) + 6 * (random() - .5);
      for (const crater of craters) {
        const separation = 2 * (1 - x * crater.x - y * crater.y - z * crater.z);
        if (separation > 1.44 * crater.radius ** 2) continue;
        const distance = Math.sqrt(Math.max(0, separation)) / crater.radius;
        const rim = 16 * Math.exp(-((distance - .87) ** 2) / .015);
        const floor = 25 * Math.max(0, 1 - distance ** 2);
        const edge = (z - crater.z - .5 * (y - crater.y)) / crater.radius;
        tint += rim - floor + 32 * edge * Math.max(0, 1.2 - distance);
      }
      texture[row * textureWidth + col] = tint;
    }
  }

  const buffer = document.createElement('canvas');
  buffer.width = 420;
  buffer.height = 192;
  const context = buffer.getContext('2d');
  const raster = context.createImageData(buffer.width, buffer.height);

  function draw(canvas, phase, shape) {
    const { sight, right, up } = ShapeMath.projectionFrame(phase, shape);
    const [nx, ny, nz] = sight, [rx, ry] = right, [ux, uy, uz] = up;
    const ia = 1 / shape.a ** 2, ic = 1 / shape.c ** 2;
    const coefficient = nx * nx * ia + ny * ny + nz * nz * ic;
    const { width, height } = buffer;
    const scale = height * .42 / Math.max(1, shape.a / 1.4, shape.c);
    const { data } = raster;
    data.fill(0);
    for (let row = 0; row < height; row++) {
      const py = (height / 2 - row - .5) / scale, z = py * uz;
      for (let col = 0; col < width; col++) {
        const px = (col + .5 - width / 2) / scale;
        const x = px * rx + py * ux, y = px * ry + py * uy;
        const cross = x * nx * ia + y * ny + z * nz * ic;
        const constant = x * x * ia + y * y + z * z * ic - 1;
        const discriminant = cross * cross - coefficient * constant;
        if (discriminant < 0) continue;
        const depth = (Math.sqrt(discriminant) - cross) / coefficient;
        const sx = x + depth * nx, sy = y + depth * ny, sz = z + depth * nz;
        const gx = sx * ia, gy = sy, gz = sz * ic;
        const length = Math.hypot(gx, gy, gz);
        const forward = (gx * nx + gy * ny + gz * nz) / length;
        const across = (gx * rx + gy * ry) / length;
        const above = (gx * ux + gy * uy + gz * uz) / length;
        const luminance = Math.max(0, .86 * forward - .24 * across + .41 * above);
        const latitude = Math.asin(Math.max(-1, Math.min(1, sz / shape.c)));
        const longitude = Math.atan2(sy, sx / shape.a);
        const texRow = Math.min(textureHeight - 1, Math.floor(textureHeight * (.5 + latitude / Math.PI)));
        const texCol = Math.floor(textureWidth * (.5 + longitude / TAU)) % textureWidth;
        const tint = texture[texRow * textureWidth + texCol];
        const value = 39 + 149 * luminance + tint * (.37 + .63 * luminance);
        const offset = 4 * (row * width + col);
        data[offset] = value + 2;
        data[offset + 1] = value + 1;
        data[offset + 2] = value;
        data[offset + 3] = 255;
      }
    }
    context.putImageData(raster, 0, 0);
    const target = canvas.getContext('2d');
    target.clearRect(0, 0, canvas.width, canvas.height);
    const zoom = canvas.height / height;
    const renderWidth = width * zoom;
    target.imageSmoothingQuality = 'high';
    target.drawImage(buffer, (canvas.width - renderWidth) / 2, 0, renderWidth, canvas.height);
  }

  return { draw };
})();
