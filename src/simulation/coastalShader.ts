import { createSeededRandom } from './shorelineEngine';

/**
 * Fast, deterministic 2D Gradient Noise + Fractional Brownian Motion (FBM)
 * and Periodic Cellular Worley Noise for photorealistic sand micro-topography
 * and seamlessly tileable lacy ocean seafoam webs.
 */
export class ProceduralNoise2D {
  private perm: Uint8Array;
  private gradX: Float32Array;
  private gradY: Float32Array;

  constructor(seed: number = 1337) {
    const rand = createSeededRandom(seed);
    this.perm = new Uint8Array(512);
    this.gradX = new Float32Array(256);
    this.gradY = new Float32Array(256);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
      const angle = rand() * Math.PI * 2;
      this.gradX[i] = Math.cos(angle);
      this.gradY[i] = Math.sin(angle);
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  public noise(x: number, y: number): number {
    const flX = Math.floor(x);
    const flY = Math.floor(y);
    const X = flX & 255;
    const Y = flY & 255;
    const xf = x - flX;
    const yf = y - flY;

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const dotAA = this.gradX[aa] * xf + this.gradY[aa] * yf;
    const dotBA = this.gradX[ba] * (xf - 1) + this.gradY[ba] * yf;
    const dotAB = this.gradX[ab] * xf + this.gradY[ab] * (yf - 1);
    const dotBB = this.gradX[bb] * (xf - 1) + this.gradY[bb] * (yf - 1);

    const lerpX1 = dotAA + u * (dotBA - dotAA);
    const lerpX2 = dotAB + u * (dotBB - dotAB);
    return lerpX1 + v * (lerpX2 - lerpX1);
  }

  public fbm(x: number, y: number, octaves: number = 3): number {
    let value = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      value += amp * this.noise(x * freq, y * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return value;
  }

  /**
   * Evaluates 2D Periodic Cellular Worley noise on a torus [0..periodX, 0..periodY],
   * returning [F1, F2] distances so the resulting Voronoi foam web tiles with zero seams.
   */
  public cellularPeriodic(
    x: number,
    y: number,
    periodX: number,
    periodY: number
  ): [number, number] {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let d1 = 999;
    let d2 = 999;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;
        const wx = ((cx % periodX) + periodX) % periodX;
        const wy = ((cy % periodY) + periodY) % periodY;
        const h = this.perm[((wx & 255) + this.perm[wy & 255]) & 255];
        const px = cx + 0.5 + this.gradX[h] * 0.44;
        const py = cy + 0.5 + this.gradY[h] * 0.44;
        const distSq = (x - px) * (x - px) + (y - py) * (y - py);
        if (distSq < d1) {
          d2 = d1;
          d1 = distSq;
        } else if (distSq < d2) {
          d2 = distSq;
        }
      }
    }
    return [Math.sqrt(d1), Math.sqrt(d2)];
  }
}

/**
 * Generates a photorealistic, normal-mapped sunlit beach sand canvas using pixel-level FBM heightmaps,
 * quartz micro-facet specular glints, tidal moisture gradients, and partially buried coastal shells.
 */
export function createPhotorealSandCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const noiseGen = new ProceduralNoise2D(20261028);
  const rand = createSeededRandom(90210);

  // Compute heightmap at 1/4 resolution for fast normal-map lighting, then combine with full-res grain
  const hmW = Math.ceil(width / 4);
  const hmH = Math.ceil(height / 4);
  const heightMap = new Float32Array(hmW * hmH);

  for (let hy = 0; hy < hmH; hy++) {
    const ny = hy / hmH;
    for (let hx = 0; hx < hmW; hx++) {
      const nx = hx / hmW;
      const macroDune = noiseGen.fbm(nx * 4.5, ny * 6.0, 3) * 0.58;
      const swashRipple =
        Math.sin(ny * 54 + noiseGen.noise(nx * 6, ny * 6) * 2.8) *
        0.22 *
        Math.max(0.2, 1 - ny * 0.45);
      const microRelief = noiseGen.fbm(nx * 26, ny * 30, 2) * 0.28;
      heightMap[hy * hmW + hx] = macroDune + swashRipple + microRelief;
    }
  }

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Golden-hour directional sunlight vector (coming from upper-left-front)
  const sunX = -0.48;
  const sunY = -0.58;
  const sunZ = 0.66;

  for (let y = 0; y < height; y++) {
    const normY = y / height;
    const hy = Math.min(hmH - 2, y >> 2);

    // Uniform sunlit beach sand all the way to the top edge (dynamic wetness is applied only when a wave washes over)
    const smoothMoisture = 0;

    const rowBaseR = 224 + normY * 10;
    const rowBaseG = 196 + normY * 9;
    const rowBaseB = 152 + normY * 8;

    const grainContrast = 1.0;

    for (let x = 0; x < width; x++) {
      const hx = Math.min(hmW - 2, x >> 2);
      const idx = hy * hmW + hx;

      const dzdx = (heightMap[idx + 1] - heightMap[idx]) * 2.6;
      const dzdy = (heightMap[idx + hmW] - heightMap[idx]) * 2.6;
      const invLen = 1 / Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
      const nx = -dzdx * invLen;
      const ny = -dzdy * invLen;
      const nz = invLen;

      const lambert = Math.max(0, nx * sunX + ny * sunY + nz * sunZ);
      const shade = 0.72 + lambert * 0.42;

      const grainRnd = rand();
      let grainDelta = 0;
      let rTint = 0;
      let bTint = 0;

      if (grainRnd < 0.15) {
        grainDelta = -24 - grainRnd * 95;
      } else if (grainRnd > 0.83) {
        grainDelta = 18 + (grainRnd - 0.83) * 95;
        if (grainRnd > 0.988) {
          grainDelta += 44;
        }
      } else if (grainRnd > 0.72) {
        rTint = 9;
        bTint = -6;
      } else {
        grainDelta = (grainRnd - 0.48) * 19;
      }

      const wetSkyGlint = smoothMoisture * lambert * lambert * lambert * 20;

      const r = Math.max(
        0,
        Math.min(255, (rowBaseR + grainDelta * grainContrast + rTint) * shade + wetSkyGlint * 0.85)
      );
      const g = Math.max(
        0,
        Math.min(255, (rowBaseG + grainDelta * grainContrast) * shade + wetSkyGlint * 0.95)
      );
      const b = Math.max(
        0,
        Math.min(255, (rowBaseB + grainDelta * grainContrast + bTint) * shade + wetSkyGlint * 1.15)
      );

      const pIdx = (y * width + x) * 4;
      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Subtle, realistic partially-buried tiny coquina shells & wet pebble accents near the tide line
  const accents = [
    { x: width * 0.08, y: height * 0.33, r: 5.5, rot: 0.35, shell: true },
    { x: width * 0.91, y: height * 0.36, r: 4.8, rot: -0.45, shell: true },
    { x: width * 0.14, y: height * 0.29, r: 3.5, rot: 0.8, shell: false },
    { x: width * 0.86, y: height * 0.31, r: 4.0, rot: -0.2, shell: false },
    { x: width * 0.06, y: height * 0.74, r: 4.2, rot: 1.1, shell: false },
    { x: width * 0.93, y: height * 0.71, r: 5.2, rot: -0.6, shell: true },
  ];

  for (const acc of accents) {
    ctx.save();
    ctx.translate(acc.x, acc.y);
    ctx.rotate(acc.rot);

    ctx.fillStyle = 'rgba(78, 56, 32, 0.28)';
    ctx.beginPath();
    ctx.ellipse(1.5, 2.0, acc.r * 1.35, acc.r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    if (acc.shell) {
      const shGrad = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, acc.r * 1.2);
      shGrad.addColorStop(0, '#FAF3E8');
      shGrad.addColorStop(0.55, '#E4C6A4');
      shGrad.addColorStop(1, '#A67E58');
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.moveTo(0, acc.r * 0.75);
      ctx.arc(0, 0, acc.r, Math.PI * 0.9, Math.PI * 2.1);
      ctx.closePath();
      ctx.fill();
    } else {
      const pbGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, acc.r);
      pbGrad.addColorStop(0, '#C8BAA4');
      pbGrad.addColorStop(1, '#7A6B56');
      ctx.fillStyle = pbGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, acc.r * 1.1, acc.r * 0.8, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return canvas;
}

/**
 * Pre-computes a 100% seamlessly tileable 2D Cellular Voronoi + Domain-Warped Seafoam Texture.
 * Designed for use with `ctx.createPattern(canvas, 'repeat')` inside smooth wave contour polygons
 * so there are zero vertical seams and authentic webbed ocean foam cells with transparent water holes.
 */
export function createCellularSeafoamTexture(
  width: number = 720,
  height: number = 200
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const noiseGen = new ProceduralNoise2D(77742);
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const periodLargeX = 14;
  const periodLargeY = 6;
  const periodSmallX = 32;
  const periodSmallY = 14;

  for (let y = 0; y < height; y++) {
    // normY = 0 at top (deep water side -> must fade smoothly to alpha=0)
    // normY = 1 at bottom (leading wave lip side -> dense creamy seafoam)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const angleX = u * Math.PI * 2;

      // Perturb top fade boundary with low-frequency wave so the trailing foam edge is organic, not a straight line
      const edgeWave =
        noiseGen.noise(Math.cos(angleX) * 2.5 + 1.2, normY * 3.0) * 0.18 +
        noiseGen.noise(Math.sin(angleX) * 5.0 + 4.1, normY * 5.0) * 0.10;
      const effectiveY = Math.max(0, Math.min(1, normY + edgeWave - 0.12));

      // Smooth fade to 0 at top of texture so there is never a visible horizontal seam in the water
      const tFade = Math.min(1, effectiveY / 0.42);
      const topFadeEnvelope = tFade * tFade * (3 - 2 * tFade);

      if (topFadeEnvelope <= 0.005) {
        continue;
      }

      const warpX =
        noiseGen.noise(Math.cos(angleX) * 2.2 + 3, normY * 5.0 + 5) * 0.85;
      const warpY =
        noiseGen.noise(Math.sin(angleX) * 2.2 + 8, normY * 5.0 + 2) * 0.85;

      const [d1Large, d2Large] = noiseGen.cellularPeriodic(
        u * periodLargeX + warpX,
        normY * periodLargeY + warpY,
        periodLargeX,
        periodLargeY
      );
      const [d1Small, d2Small] = noiseGen.cellularPeriodic(
        u * periodSmallX - warpY * 1.3,
        normY * periodSmallY + warpX * 1.3,
        periodSmallX,
        periodSmallY
      );

      // Cell wall filament ridges (where d2 - d1 is small, white foam webs surround dark water holes)
      const ridgeLarge = Math.max(0, 1 - (d2Large - d1Large) * 4.2);
      const ridgeSmall = Math.max(0, 1 - (d2Small - d1Small) * 5.0);

      // Boost creamy foam density near the bottom (leading wave front, normY > 0.72)
      const frontCreamBoost = Math.pow(Math.max(0, (normY - 0.55) / 0.45), 1.8) * 0.75;

      let foamDensity =
        (ridgeLarge * 0.76 + ridgeSmall * 0.48 + frontCreamBoost) * topFadeEnvelope;

      // Carve clean transparent water holes in the center of large Voronoi cells
      if (d1Large < 0.28 * (1.15 - normY * 0.5)) {
        foamDensity *= 0.14;
      }

      const alpha = Math.max(0, Math.min(1, (foamDensity - 0.14) * 1.85));

      const pIdx = (y * width + x) * 4;
      const brightness = 242 + Math.min(13, alpha * 15);
      data[pIdx] = brightness;
      data[pIdx + 1] = Math.min(255, brightness + 3);
      data[pIdx + 2] = Math.min(255, brightness + 5);
      data[pIdx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
