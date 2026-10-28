export type SimulationPhase =
  | 'stick-entering'
  | 'writing'
  | 'admiring'
  | 'wave-washing'
  | 'wave-receding';

export interface BirthdayWish {
  id: string;
  index: number;
  text: string;
  subtitle: string;
  /** Longer love note shown under the sand (any characters, never carved) */
  note?: string;
  /** Text depends on the current time (e.g. a since-you-were-born counter) and is refilled each time it is carved */
  live?: boolean;
}

export interface StickKnot {
  offsetNorm: number; // 0.15 to 0.85 along stick shaft
  side: -1 | 1;
  size: number;
}

export type StickArchetypeId =
  | 'driftwood'
  | 'oak-twig'
  | 'bamboo-reed'
  | 'pine-branch'
  | 'mangrove-root';

export interface StickProfile {
  id: StickArchetypeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  barkDarkColor: string;
  tipColor: string;
  lengthPx: number;
  baseThicknessPx: number;
  tipThicknessPx: number;
  /** Base angle in radians (typically pointing up-left from bottom-right or up-right from bottom-left) */
  baseAngleRad: number;
  curveBendPx: number;
  knots: StickKnot[];
  grainRoughness: number;
}

export interface WaveHarmonic {
  frequency: number;
  amplitudePx: number;
  phaseRad: number;
  speedRadPerSec: number;
}

export interface FoamCellSpec {
  u: number; // 0..1 across width
  v: number; // 0..1 depth behind crest
  radiusPx: number;
  elongation: number;
  phaseOffset: number;
}

export interface WaveProfile {
  id: string;
  name: string;
  /** Baseline rest shoreline Y as fraction of canvas height (e.g. 0.16) */
  baseShorelineNormY: number;
  /** Maximum reach Y as fraction of canvas height (e.g. 0.83) */
  maxReachNormY: number;
  /** Skew slope across the beach (-0.07 to +0.07) */
  tiltSlope: number;
  /** Duration of the incoming surge in seconds */
  surgeDurationSec: number;
  /** Duration of the receding backwash in seconds */
  recedeDurationSec: number;
  /** Thickness of the leading cellular foam lip in pixels */
  foamBandPx: number;
  /** Number of trailing lacy foam ribbons */
  ribbonCount: number;
  harmonics: WaveHarmonic[];
  foamCells: FoamCellSpec[];
  waterTintDeep: string;
  waterTintShallow: string;
}

export interface CarvePoint {
  x: number;
  y: number;
  pressure: number; // 0.6 to 1.25
  erosion: number; // 0 (freshly carved) to 1 (washed away by wave)
  cumulativeDist: number;
}

export interface CarveStroke {
  points: CarvePoint[];
  length: number;
}

export interface CarvedMessageLayout {
  strokes: CarveStroke[];
  totalLength: number;
  /** Groove thickness multiplier so smaller lettering keeps crisp, legible trenches */
  carveScale?: number;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface StickTipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCarving: boolean;
  pressure: number;
  liftHeightPx: number;
}

/** Deterministic mulberry32 PRNG for reproducible tests and organic variety */
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STICK_ARCHETYPES: Array<{
  id: StickArchetypeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  barkDarkColor: string;
  tipColor: string;
  baseThicknessPx: number;
  tipThicknessPx: number;
  grainRoughness: number;
}> = [
  {
    id: 'driftwood',
    name: 'Sun-Bleached Driftwood',
    description: 'Salt-cured silver-taupe coastal driftwood smoothed by tumbling surf',
    primaryColor: '#C5B8A1',
    secondaryColor: '#DFD5C3',
    barkDarkColor: '#6E5E4A',
    tipColor: '#8B7358',
    baseThicknessPx: 18,
    tipThicknessPx: 5.5,
    grainRoughness: 0.65,
  },
  {
    id: 'oak-twig',
    name: 'Knotted Coastal Oak Twig',
    description: 'Rough-barked dark umber oak branch with natural twig knots',
    primaryColor: '#6B4C35',
    secondaryColor: '#8B6548',
    barkDarkColor: '#3B2618',
    tipColor: '#B89472',
    baseThicknessPx: 16,
    tipThicknessPx: 4.8,
    grainRoughness: 0.9,
  },
  {
    id: 'bamboo-reed',
    name: 'Golden Sea Bamboo Reed',
    description: 'Warm honey-ochre segmented bamboo stalk washed ashore',
    primaryColor: '#CFA356',
    secondaryColor: '#E5BE76',
    barkDarkColor: '#7D5B24',
    tipColor: '#9E7736',
    baseThicknessPx: 15,
    tipThicknessPx: 5.0,
    grainRoughness: 0.35,
  },
  {
    id: 'pine-branch',
    name: 'Weathered Maritime Pine Stick',
    description: 'Reddish-cedar coastal pine stick with whittled sandy point',
    primaryColor: '#8A5236',
    secondaryColor: '#A86B4C',
    barkDarkColor: '#4A2818',
    tipColor: '#C99B78',
    baseThicknessPx: 17,
    tipThicknessPx: 5.2,
    grainRoughness: 0.78,
  },
  {
    id: 'mangrove-root',
    name: 'Twisted Mangrove Drift Stick',
    description: 'Deep espresso-toned sinuous tropical root wood',
    primaryColor: '#543D2C',
    secondaryColor: '#735640',
    barkDarkColor: '#2B1D13',
    tipColor: '#9C7B60',
    baseThicknessPx: 19,
    tipThicknessPx: 5.8,
    grainRoughness: 0.82,
  },
];

export function generateRandomStick(seed: number): StickProfile {
  const rand = createSeededRandom(seed);
  const archetypeIndex = Math.floor(rand() * STICK_ARCHETYPES.length);
  const arch = STICK_ARCHETYPES[archetypeIndex];

  // Vary entry side: 75% right-handed angles, 25% left-handed or steep center-right angles
  const fromLeft = rand() < 0.25;
  const baseAngleRad = fromLeft
    ? Math.PI * (0.64 + rand() * 0.14) // pointing down-right from upper/bottom left
    : Math.PI * (0.22 + rand() * 0.16); // pointing up-left from bottom-right

  const knotCount = 2 + Math.floor(rand() * 3);
  const knots: StickKnot[] = [];
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      offsetNorm: 0.18 + (i / knotCount) * 0.65 + (rand() - 0.5) * 0.08,
      side: rand() > 0.5 ? 1 : -1,
      size: 3 + rand() * 4.5,
    });
  }

  return {
    id: arch.id,
    name: arch.name,
    description: arch.description,
    primaryColor: arch.primaryColor,
    secondaryColor: arch.secondaryColor,
    barkDarkColor: arch.barkDarkColor,
    tipColor: arch.tipColor,
    lengthPx: 230 + Math.round(rand() * 55),
    baseThicknessPx: arch.baseThicknessPx + (rand() - 0.5) * 2.5,
    tipThicknessPx: arch.tipThicknessPx + (rand() - 0.5) * 0.8,
    baseAngleRad,
    curveBendPx: (rand() - 0.5) * 26,
    knots,
    grainRoughness: arch.grainRoughness,
  };
}

const WAVE_NAMES = [
  'Long Foaming Swell',
  'Double-Crest Emerald Surge',
  'Scalloped Lace Tide',
  'Deep Turquoise Roller',
  'Crisp Tradewind Breakers',
];

export function generateRandomWave(
  seed: number,
  intensityMultiplier: number = 1.0
): WaveProfile {
  const rand = createSeededRandom(seed);
  const clampedIntensity = Math.max(0.6, Math.min(1.4, intensityMultiplier));

  const harmonicCount = 5 + Math.floor(rand() * 3);
  const harmonics: WaveHarmonic[] = [];
  for (let i = 0; i < harmonicCount; i++) {
    const freq = (i + 1) * (1.1 + rand() * 0.65);
    const amp = (22 / (i + 0.85)) * (0.75 + rand() * 0.6) * clampedIntensity;
    harmonics.push({
      frequency: freq,
      amplitudePx: amp,
      phaseRad: rand() * Math.PI * 2,
      speedRadPerSec: (0.8 + rand() * 1.9) * (rand() > 0.5 ? 1 : -1),
    });
  }

  const cellCount = 65 + Math.floor(rand() * 30);
  const foamCells: FoamCellSpec[] = [];
  for (let i = 0; i < cellCount; i++) {
    foamCells.push({
      u: rand(),
      v: Math.pow(rand(), 1.35), // Denser near the leading foam lip
      radiusPx: 4 + rand() * 14,
      elongation: 1.1 + rand() * 1.4,
      phaseOffset: rand() * Math.PI * 2,
    });
  }

  const name = WAVE_NAMES[Math.floor(rand() * WAVE_NAMES.length)];

  return {
    id: `wave-${seed}`,
    name,
    baseShorelineNormY: 0.14 + rand() * 0.04,
    maxReachNormY: Math.min(0.92, (0.80 + rand() * 0.09) * Math.pow(clampedIntensity, 0.25)),
    tiltSlope: (rand() - 0.5) * 0.11,
    surgeDurationSec: 2.3 + rand() * 0.7,
    recedeDurationSec: 2.8 + rand() * 0.9,
    foamBandPx: (38 + rand() * 24) * clampedIntensity,
    ribbonCount: 3 + Math.floor(rand() * 2),
    harmonics,
    foamCells,
    waterTintDeep: '#0B5560',
    waterTintShallow: '#2A9D90',
  };
}

/**
 * Evaluates the exact Y pixel coordinate of the leading wave edge at horizontal fraction normX (0..1).
 * Works across idle shoreline, incoming wave-washing surge, and receding backwash.
 */
export function evaluateWaveEdgeY(
  wave: WaveProfile,
  normX: number,
  phaseProgress: number, // 0..1 within current phase
  phase: SimulationPhase,
  elapsedSec: number,
  canvasHeight: number
): number {
  const clampedX = Math.max(0, Math.min(1, normX));

  if (phase !== 'wave-washing' && phase !== 'wave-receding') {
    return 0;
  }

  let surgeFactor = 0;
  if (phase === 'wave-washing') {
    // Fast energetic surge up the beach with smooth deceleration at peak swash
    const t = Math.max(0, Math.min(1, phaseProgress));
    surgeFactor = 1 - Math.pow(1 - t, 2.5);
  } else {
    // Smooth gravity-driven backwash pull back off the top of the screen
    const t = Math.max(0, Math.min(1, phaseProgress));
    surgeFactor = Math.pow(1 - t, 1.85);
  }

  const basePx = -65;
  const maxPx = wave.maxReachNormY * canvasHeight;
  const meanY = basePx + (maxPx - basePx) * surgeFactor;

  // Apply coastal swell tilt across the beach width
  const tiltOffsetPx = (clampedX - 0.5) * wave.tiltSlope * canvasHeight * surgeFactor;

  // Sum multi-harmonic Gerstner/sine lobes for natural scalloped swash edge
  let harmonicSumPx = 0;
  for (let i = 0; i < wave.harmonics.length; i++) {
    const h = wave.harmonics[i];
    const angle = clampedX * Math.PI * 2 * h.frequency + h.phaseRad + elapsedSec * h.speedRadPerSec;
    harmonicSumPx += Math.sin(angle) * h.amplitudePx * (0.25 + 0.75 * surgeFactor);
  }

  return Math.max(0, Math.min(canvasHeight - 12, meanY + tiltOffsetPx + harmonicSumPx));
}

/**
 * Flowing, natural human hand-scripted calligraphy strokes in normalized [0..1, 0..1] glyph box.
 * Modeled after authentic beach-sand stick handwriting with graceful lead-in curves, rounded bowls,
 * and natural exit tails.
 */
const GLYPH_PATHS: Record<string, Array<Array<[number, number]>>> = {
  A: [
    [[0.04, 0.96], [0.16, 0.72], [0.34, 0.34], [0.52, 0.05], [0.68, 0.36], [0.82, 0.72], [0.94, 0.96]],
    [[0.18, 0.64], [0.48, 0.58], [0.82, 0.62]],
  ],
  B: [
    [[0.18, 0.08], [0.16, 0.52], [0.14, 0.95]],
    [[0.12, 0.12], [0.48, 0.05], [0.80, 0.14], [0.84, 0.32], [0.62, 0.46], [0.20, 0.50], [0.68, 0.52], [0.90, 0.68], [0.82, 0.88], [0.48, 0.96], [0.12, 0.92]],
  ],
  C: [
    [[0.88, 0.20], [0.68, 0.06], [0.36, 0.10], [0.14, 0.34], [0.10, 0.66], [0.28, 0.90], [0.62, 0.96], [0.90, 0.82]],
  ],
  D: [
    [[0.18, 0.08], [0.16, 0.52], [0.14, 0.95]],
    [[0.12, 0.10], [0.54, 0.06], [0.84, 0.24], [0.90, 0.54], [0.76, 0.84], [0.44, 0.96], [0.10, 0.92]],
  ],
  E: [
    [[0.84, 0.10], [0.46, 0.07], [0.20, 0.18], [0.16, 0.46], [0.48, 0.48], [0.72, 0.48], [0.22, 0.52], [0.14, 0.78], [0.38, 0.95], [0.86, 0.90]],
  ],
  F: [
    [[0.84, 0.10], [0.44, 0.07], [0.20, 0.14], [0.16, 0.54], [0.12, 0.96]],
    [[0.16, 0.50], [0.48, 0.48], [0.76, 0.48]],
  ],
  G: [
    [[0.86, 0.18], [0.62, 0.06], [0.28, 0.14], [0.10, 0.44], [0.14, 0.78], [0.42, 0.96], [0.78, 0.90], [0.86, 0.66], [0.84, 0.52], [0.52, 0.54]],
  ],
  H: [
    [[0.18, 0.06], [0.16, 0.50], [0.12, 0.96]],
    [[0.84, 0.06], [0.80, 0.50], [0.78, 0.96]],
    [[0.14, 0.52], [0.48, 0.48], [0.82, 0.50]],
  ],
  I: [
    [[0.26, 0.10], [0.52, 0.08], [0.76, 0.10]],
    [[0.52, 0.08], [0.48, 0.52], [0.46, 0.94]],
    [[0.22, 0.94], [0.48, 0.95], [0.76, 0.92]],
  ],
  J: [
    [[0.28, 0.10], [0.58, 0.08], [0.86, 0.10]],
    [[0.66, 0.08], [0.64, 0.54], [0.56, 0.86], [0.36, 0.96], [0.14, 0.86], [0.12, 0.68]],
  ],
  K: [
    [[0.18, 0.06], [0.15, 0.52], [0.12, 0.96]],
    [[0.84, 0.10], [0.52, 0.36], [0.20, 0.52], [0.56, 0.72], [0.88, 0.95]],
  ],
  L: [
    [[0.22, 0.08], [0.18, 0.52], [0.14, 0.90], [0.46, 0.95], [0.86, 0.90]],
  ],
  M: [
    [[0.06, 0.95], [0.14, 0.48], [0.22, 0.08], [0.38, 0.42], [0.50, 0.68], [0.66, 0.38], [0.82, 0.08], [0.88, 0.52], [0.94, 0.95]],
  ],
  N: [
    [[0.12, 0.95], [0.16, 0.48], [0.20, 0.08], [0.52, 0.54], [0.80, 0.94], [0.84, 0.48], [0.88, 0.06]],
  ],
  O: [
    [[0.54, 0.06], [0.24, 0.16], [0.10, 0.46], [0.16, 0.80], [0.44, 0.96], [0.76, 0.86], [0.90, 0.54], [0.82, 0.20], [0.54, 0.06]],
  ],
  P: [
    [[0.18, 0.08], [0.15, 0.52], [0.12, 0.96]],
    [[0.12, 0.12], [0.52, 0.06], [0.84, 0.18], [0.86, 0.38], [0.62, 0.52], [0.16, 0.54]],
  ],
  Q: [
    [[0.52, 0.06], [0.22, 0.18], [0.10, 0.48], [0.18, 0.82], [0.48, 0.95], [0.78, 0.82], [0.88, 0.48], [0.78, 0.18], [0.52, 0.06]],
    [[0.54, 0.70], [0.74, 0.86], [0.94, 0.98]],
  ],
  R: [
    [[0.18, 0.08], [0.15, 0.52], [0.12, 0.96]],
    [[0.12, 0.12], [0.52, 0.06], [0.82, 0.18], [0.84, 0.38], [0.58, 0.50], [0.18, 0.52], [0.56, 0.70], [0.88, 0.95]],
  ],
  S: [
    [[0.84, 0.18], [0.62, 0.06], [0.30, 0.10], [0.16, 0.28], [0.32, 0.44], [0.68, 0.56], [0.86, 0.74], [0.72, 0.92], [0.38, 0.96], [0.12, 0.84]],
  ],
  T: [
    [[0.08, 0.12], [0.50, 0.08], [0.92, 0.10]],
    [[0.52, 0.08], [0.48, 0.52], [0.45, 0.96]],
  ],
  U: [
    [[0.16, 0.08], [0.14, 0.56], [0.24, 0.86], [0.50, 0.96], [0.76, 0.84], [0.84, 0.52], [0.86, 0.08]],
  ],
  V: [
    [[0.12, 0.08], [0.32, 0.54], [0.48, 0.95], [0.68, 0.54], [0.88, 0.08]],
  ],
  W: [
    [[0.06, 0.08], [0.18, 0.56], [0.28, 0.95], [0.42, 0.62], [0.52, 0.36], [0.62, 0.64], [0.74, 0.95], [0.86, 0.52], [0.94, 0.08]],
  ],
  X: [
    [[0.14, 0.08], [0.50, 0.52], [0.86, 0.95]],
    [[0.86, 0.08], [0.50, 0.52], [0.14, 0.95]],
  ],
  Y: [
    [[0.14, 0.08], [0.34, 0.32], [0.50, 0.52], [0.70, 0.30], [0.88, 0.08]],
    [[0.50, 0.52], [0.48, 0.76], [0.46, 0.96]],
  ],
  Z: [
    [[0.14, 0.10], [0.52, 0.08], [0.86, 0.10], [0.50, 0.52], [0.14, 0.92], [0.52, 0.95], [0.88, 0.92]],
  ],
  a: [
    [[0.78, 0.50], [0.56, 0.38], [0.28, 0.44], [0.14, 0.66], [0.24, 0.90], [0.50, 0.95], [0.74, 0.78], [0.80, 0.44], [0.78, 0.84], [0.92, 0.94]],
  ],
  b: [
    [[0.22, 0.06], [0.18, 0.52], [0.16, 0.94], [0.22, 0.62], [0.48, 0.42], [0.76, 0.48], [0.84, 0.72], [0.66, 0.92], [0.36, 0.95], [0.16, 0.86]],
  ],
  c: [
    [[0.82, 0.48], [0.60, 0.38], [0.30, 0.44], [0.16, 0.66], [0.26, 0.90], [0.56, 0.95], [0.86, 0.84]],
  ],
  d: [
    [[0.78, 0.52], [0.54, 0.38], [0.26, 0.46], [0.14, 0.70], [0.28, 0.92], [0.56, 0.94], [0.78, 0.74], [0.84, 0.06], [0.78, 0.54], [0.78, 0.88], [0.92, 0.94]],
  ],
  e: [
    [[0.18, 0.66], [0.54, 0.64], [0.82, 0.56], [0.76, 0.40], [0.46, 0.38], [0.20, 0.52], [0.16, 0.78], [0.38, 0.94], [0.72, 0.92], [0.88, 0.82]],
  ],
  f: [
    [[0.78, 0.14], [0.58, 0.06], [0.40, 0.18], [0.36, 0.56], [0.32, 0.98]],
    [[0.14, 0.46], [0.44, 0.44], [0.70, 0.44]],
  ],
  g: [
    [[0.78, 0.48], [0.54, 0.38], [0.26, 0.46], [0.16, 0.68], [0.32, 0.88], [0.60, 0.86], [0.78, 0.68], [0.80, 0.42], [0.76, 0.92], [0.64, 1.18], [0.36, 1.24], [0.16, 1.10]],
  ],
  h: [
    [[0.20, 0.06], [0.18, 0.52], [0.14, 0.95], [0.22, 0.62], [0.48, 0.42], [0.74, 0.46], [0.80, 0.72], [0.78, 0.92], [0.90, 0.95]],
  ],
  i: [
    [[0.48, 0.42], [0.44, 0.76], [0.48, 0.94], [0.66, 0.92]],
    [[0.48, 0.16], [0.52, 0.22]],
  ],
  j: [
    [[0.56, 0.42], [0.54, 0.84], [0.44, 1.16], [0.24, 1.22], [0.12, 1.08]],
    [[0.56, 0.16], [0.60, 0.22]],
  ],
  k: [
    [[0.20, 0.06], [0.18, 0.52], [0.14, 0.95]],
    [[0.78, 0.40], [0.46, 0.58], [0.20, 0.68], [0.54, 0.80], [0.84, 0.95]],
  ],
  l: [
    [[0.48, 0.06], [0.42, 0.52], [0.40, 0.86], [0.54, 0.95], [0.72, 0.88]],
  ],
  m: [
    [[0.08, 0.95], [0.12, 0.62], [0.14, 0.42], [0.28, 0.42], [0.44, 0.52], [0.48, 0.94], [0.52, 0.56], [0.68, 0.42], [0.84, 0.48], [0.86, 0.88], [0.94, 0.95]],
  ],
  n: [
    [[0.16, 0.42], [0.16, 0.72], [0.14, 0.95], [0.22, 0.58], [0.50, 0.40], [0.76, 0.48], [0.80, 0.86], [0.90, 0.95]],
  ],
  o: [
    [[0.52, 0.38], [0.26, 0.46], [0.16, 0.68], [0.28, 0.90], [0.56, 0.95], [0.80, 0.80], [0.82, 0.54], [0.52, 0.38]],
  ],
  p: [
    [[0.20, 0.42], [0.16, 0.84], [0.12, 1.24]],
    [[0.18, 0.52], [0.46, 0.38], [0.76, 0.48], [0.82, 0.72], [0.62, 0.92], [0.34, 0.94], [0.16, 0.84]],
  ],
  q: [
    [[0.78, 0.50], [0.52, 0.38], [0.24, 0.48], [0.18, 0.74], [0.38, 0.92], [0.66, 0.88], [0.80, 0.68], [0.82, 0.42], [0.76, 0.92], [0.72, 1.24]],
  ],
  r: [
    [[0.20, 0.42], [0.20, 0.72], [0.18, 0.95], [0.24, 0.62], [0.48, 0.40], [0.76, 0.42], [0.84, 0.50]],
  ],
  s: [
    [[0.78, 0.46], [0.56, 0.38], [0.28, 0.44], [0.22, 0.58], [0.50, 0.68], [0.78, 0.76], [0.76, 0.90], [0.48, 0.96], [0.16, 0.88]],
  ],
  t: [
    [[0.46, 0.12], [0.42, 0.56], [0.40, 0.86], [0.56, 0.95], [0.74, 0.88]],
    [[0.18, 0.42], [0.46, 0.40], [0.74, 0.40]],
  ],
  u: [
    [[0.18, 0.42], [0.16, 0.74], [0.30, 0.92], [0.56, 0.92], [0.76, 0.72], [0.80, 0.42], [0.78, 0.86], [0.90, 0.95]],
  ],
  v: [
    [[0.14, 0.42], [0.32, 0.72], [0.48, 0.95], [0.68, 0.70], [0.86, 0.42]],
  ],
  w: [
    [[0.08, 0.42], [0.18, 0.74], [0.28, 0.95], [0.42, 0.70], [0.50, 0.52], [0.60, 0.72], [0.72, 0.95], [0.84, 0.70], [0.92, 0.42]],
  ],
  x: [
    [[0.18, 0.42], [0.50, 0.68], [0.82, 0.95]],
    [[0.82, 0.42], [0.50, 0.68], [0.18, 0.95]],
  ],
  y: [
    [[0.18, 0.42], [0.32, 0.76], [0.48, 0.88], [0.72, 0.72], [0.82, 0.42], [0.76, 0.86], [0.60, 1.16], [0.34, 1.24], [0.14, 1.12]],
  ],
  z: [
    [[0.18, 0.42], [0.52, 0.40], [0.82, 0.42], [0.50, 0.68], [0.18, 0.92], [0.52, 0.95], [0.86, 0.92]],
  ],
  '0': [
    [[0.52, 0.08], [0.24, 0.22], [0.14, 0.54], [0.24, 0.88], [0.52, 0.95], [0.80, 0.80], [0.86, 0.46], [0.74, 0.16], [0.52, 0.08]],
  ],
  '1': [
    [[0.24, 0.26], [0.52, 0.08], [0.50, 0.52], [0.48, 0.95]],
    [[0.22, 0.95], [0.50, 0.95], [0.78, 0.94]],
  ],
  '2': [
    [[0.18, 0.26], [0.42, 0.08], [0.74, 0.12], [0.82, 0.34], [0.56, 0.62], [0.16, 0.92], [0.52, 0.95], [0.86, 0.92]],
  ],
  '3': [
    [[0.20, 0.18], [0.52, 0.08], [0.80, 0.20], [0.72, 0.42], [0.42, 0.50], [0.76, 0.58], [0.86, 0.78], [0.60, 0.95], [0.18, 0.88]],
  ],
  '4': [
    [[0.68, 0.95], [0.70, 0.50], [0.72, 0.08], [0.42, 0.38], [0.14, 0.66], [0.52, 0.66], [0.88, 0.66]],
  ],
  '5': [
    [[0.82, 0.10], [0.26, 0.10], [0.20, 0.48], [0.58, 0.44], [0.84, 0.62], [0.76, 0.88], [0.44, 0.95], [0.16, 0.86]],
  ],
  '6': [
    [[0.76, 0.12], [0.42, 0.20], [0.18, 0.52], [0.22, 0.84], [0.52, 0.95], [0.80, 0.80], [0.76, 0.54], [0.46, 0.48], [0.20, 0.60]],
  ],
  '7': [
    [[0.16, 0.10], [0.52, 0.08], [0.86, 0.10], [0.60, 0.52], [0.36, 0.95]],
  ],
  '8': [
    [[0.52, 0.48], [0.24, 0.34], [0.26, 0.12], [0.54, 0.08], [0.78, 0.18], [0.74, 0.36], [0.52, 0.48], [0.20, 0.66], [0.24, 0.90], [0.54, 0.95], [0.82, 0.84], [0.78, 0.62], [0.52, 0.48]],
  ],
  '9': [
    [[0.80, 0.42], [0.52, 0.52], [0.22, 0.42], [0.20, 0.18], [0.50, 0.08], [0.80, 0.20], [0.82, 0.58], [0.64, 0.88], [0.28, 0.95]],
  ],
  '!': [
    [[0.52, 0.08], [0.49, 0.42], [0.47, 0.68]],
    [[0.46, 0.88], [0.52, 0.94]],
  ],
  '?': [
    [[0.22, 0.24], [0.48, 0.08], [0.78, 0.18], [0.80, 0.38], [0.52, 0.56], [0.48, 0.72]],
    [[0.46, 0.88], [0.52, 0.94]],
  ],
  ',': [
    [[0.52, 0.84], [0.46, 0.98], [0.32, 1.10]],
  ],
  '.': [
    [[0.46, 0.88], [0.54, 0.94]],
  ],
  "'": [
    [[0.52, 0.08], [0.46, 0.28]],
  ],
  '-': [
    [[0.22, 0.54], [0.50, 0.52], [0.78, 0.54]],
  ],
  ':': [
    [[0.46, 0.40], [0.54, 0.46]],
    [[0.44, 0.86], [0.52, 0.92]],
  ],
  '&': [
    [[0.86, 0.92], [0.56, 0.68], [0.26, 0.38], [0.32, 0.12], [0.58, 0.08], [0.74, 0.24], [0.52, 0.46], [0.18, 0.68], [0.26, 0.92], [0.58, 0.94], [0.88, 0.64]],
  ],
  '♥': [
    [[0.50, 0.28], [0.34, 0.08], [0.10, 0.18], [0.08, 0.46], [0.26, 0.72], [0.50, 0.94], [0.74, 0.72], [0.92, 0.46], [0.90, 0.18], [0.66, 0.08], [0.50, 0.28]],
  ],
  '★': [
    [[0.50, 0.06], [0.63, 0.38], [0.96, 0.38], [0.69, 0.58], [0.80, 0.92], [0.50, 0.72], [0.20, 0.92], [0.31, 0.58], [0.04, 0.38], [0.37, 0.38], [0.50, 0.06]],
  ],
};

function interpolateStrokePoints(
  controlPts: Array<[number, number]>,
  stepPx: number,
  rand: () => number
): CarvePoint[] {
  if (controlPts.length === 0) return [];
  if (controlPts.length === 1) {
    return [
      {
        x: controlPts[0][0],
        y: controlPts[0][1],
        pressure: 0.95,
        erosion: 0,
        cumulativeDist: 0,
      },
    ];
  }

  const rawPts: Array<{ x: number; y: number; pressure: number }> = [];

  for (let i = 0; i < controlPts.length - 1; i++) {
    const p0 = controlPts[Math.max(0, i - 1)];
    const p1 = controlPts[i];
    const p2 = controlPts[i + 1];
    const p3 = controlPts[Math.min(controlPts.length - 1, i + 2)];

    const segDist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(4, Math.ceil(segDist / stepPx));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      // Smooth Catmull-Rom spline interpolation
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      // Subtle low-amplitude sand grain resistance tremor
      const jitterX = (rand() - 0.5) * 0.45;
      const jitterY = (rand() - 0.5) * 0.45;

      // Downstrokes into the sand press slightly deeper than upstrokes
      const dy = p2[1] - p1[1];
      const downstrokeBoost = dy > 0 ? 0.14 : -0.06;

      rawPts.push({
        x: x + jitterX,
        y: y + jitterY,
        pressure: 0.88 + downstrokeBoost + 0.18 * Math.sin(t * Math.PI) + (rand() - 0.5) * 0.06,
      });
    }
  }

  const lastCtrl = controlPts[controlPts.length - 1];
  rawPts.push({
    x: lastCtrl[0],
    y: lastCtrl[1],
    pressure: 0.85,
  });

  // Compute human handwriting kinematic parameterization (Two-Thirds Power Law):
  // The human hand slows down at sharp turns/curves and at the very beginning/end of each stroke!
  const dense: CarvePoint[] = [];
  let runningKinematicDist = 0;
  const n = rawPts.length;

  for (let i = 0; i < n; i++) {
    const pt = rawPts[i];
    if (i > 0) {
      const prev = rawPts[i - 1];
      const geomDist = Math.hypot(pt.x - prev.x, pt.y - prev.y);

      // Estimate local turning angle / curvature
      let turnWeight = 1.0;
      if (i < n - 1) {
        const next = rawPts[i + 1];
        const a1 = Math.atan2(pt.y - prev.y, pt.x - prev.x);
        const a2 = Math.atan2(next.y - pt.y, next.x - pt.x);
        let dAngle = Math.abs(a2 - a1);
        if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
        // Slow down significantly when turning corners or loops
        turnWeight = 1.0 + dAngle * 1.9;
      }

      // Ease-in at stroke contact and ease-out before lifting stick
      const edgeFrac = Math.min(i, n - 1 - i) / Math.max(1, Math.min(8, n * 0.25));
      const endpointSlowdown = 1.0 + (1 - Math.min(1, edgeFrac)) * 0.85;

      runningKinematicDist += geomDist * turnWeight * endpointSlowdown;
    }

    dense.push({
      x: pt.x,
      y: pt.y,
      pressure: pt.pressure,
      erosion: 0,
      cumulativeDist: runningKinematicDist,
    });
  }

  return dense;
}

/** True when every character can be hand-carved (unknown glyphs would fall back to ★). */
export function isCarvableText(text: string): boolean {
  for (const ch of text) {
    if (ch === ' ' || ch === '\n') continue;
    if (!GLYPH_PATHS[ch] && !GLYPH_PATHS[ch.toUpperCase()]) return false;
  }
  return true;
}

/**
 * Splits one authored line into the fewest lines that fit maxChars, then balances them
 * so narrow phone screens never end with a lonely orphan word.
 */
function wrapLineBalanced(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const words = line.split(/\s+/).filter(Boolean);
  const greedy = (limit: number): string[] => {
    const out: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > limit && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) out.push(cur);
    return out;
  };
  const target = greedy(maxChars);
  let best = target;
  for (let limit = maxChars - 1; limit > 0; limit--) {
    const attempt = greedy(limit);
    if (attempt.length > target.length) break;
    best = attempt;
  }
  return best;
}

export interface MessageLayoutOptions {
  /** Fraction of canvas width the lettering may span */
  widthFraction?: number;
  /** Lines are re-wrapped when letters would shrink below this advance (px) */
  minReadableCharAdv?: number;
  /** Upper bound for the per-character advance (px) */
  maxCharAdv?: number;
  /** Vertical centre of the text block as a fraction of canvas height */
  centerYFraction?: number;
  /** Right-align against this x fraction instead of centring (used for the signature) */
  rightEdgeFraction?: number;
  /** Baseline arc lift in px (negative arcs upward) */
  arcLiftPx?: number;
}

/**
 * Builds the complete hand-carved sand stroke geometry for a multi-line message.
 */
export function buildMessageStrokePaths(
  message: string,
  canvasWidth: number,
  canvasHeight: number,
  seed: number = 101,
  options: MessageLayoutOptions = {}
): CarvedMessageLayout {
  const rand = createSeededRandom(seed);
  const isPortrait = canvasHeight > canvasWidth;
  const {
    widthFraction = isPortrait ? 0.86 : 0.74,
    minReadableCharAdv = 38,
    maxCharAdv: maxCharAdvCap = 54,
    centerYFraction = isPortrait ? 0.5 : 0.57,
    rightEdgeFraction,
    arcLiftPx = -12,
  } = options;

  // Fit boldly in the prime golden damp/dry sand zone (40% to 78% of canvas height)
  const usableWidth = canvasWidth * widthFraction;
  const maxCharsPerLine = Math.max(6, Math.floor(usableWidth / minReadableCharAdv));

  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .flatMap((l) => wrapLineBalanced(l, maxCharsPerLine));

  if (lines.length === 0) {
    lines.push('Happy Birthday!');
  }

  const maxCharsInLine = Math.max(...lines.map((l) => l.length), 1);

  const maxCharAdv = Math.min(
    maxCharAdvCap,
    Math.max(Math.min(20, maxCharAdvCap), usableWidth / Math.max(8, maxCharsInLine))
  );
  const charWidth = maxCharAdv * 0.78;
  const charHeight = maxCharAdv * 1.40;
  const lineGap = charHeight * 1.54;
  const carveScale = Math.max(0.3, Math.min(1, maxCharAdv / 42));

  const totalBlockHeight = (lines.length - 1) * lineGap + charHeight;
  const centerY = canvasHeight * centerYFraction;
  const startBlockY = centerY - totalBlockHeight / 2;

  const strokes: CarveStroke[] = [];
  let totalLength = 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineWidth = line.length * maxCharAdv;
    const startX =
      rightEdgeFraction !== undefined
        ? canvasWidth * rightEdgeFraction - lineWidth
        : (canvasWidth - lineWidth) / 2;
    const baseLineY = startBlockY + lineIdx * lineGap;

    // Gentle natural human baseline arc across the beach slope
    const lineArcLift = arcLiftPx;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const ch = line[charIdx];
      if (ch === ' ') continue;

      const normLinePos = line.length > 1 ? charIdx / (line.length - 1) - 0.5 : 0;
      const arcOffsetY = (1 - 4 * normLinePos * normLinePos) * lineArcLift;
      // Subtle human baseline rhythm
      const charSlantX = (rand() - 0.5) * 2.4;
      const charOffsetY = arcOffsetY + (rand() - 0.5) * 3.0;
      const charScaleVar = 0.96 + rand() * 0.09;

      const originX = startX + charIdx * maxCharAdv + charSlantX;
      const originY = baseLineY + charOffsetY;

      const glyphDef =
        GLYPH_PATHS[ch] ||
        GLYPH_PATHS[ch.toUpperCase()] ||
        GLYPH_PATHS['★'];

      for (const rawStroke of glyphDef) {
        const scaledCtrl: Array<[number, number]> = rawStroke.map(([gx, gy]) => {
          // Natural handwritten forward slant (11 degrees)
          const italicSkew = (1 - gy) * charWidth * 0.19;
          return [
            originX + gx * charWidth * charScaleVar + italicSkew,
            originY + gy * charHeight * charScaleVar,
          ];
        });

        const points = interpolateStrokePoints(scaledCtrl, 2.8, rand);
        if (points.length < 2) continue;

        const strokeLen = Math.max(1, points[points.length - 1].cumulativeDist);
        for (const p of points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }

        strokes.push({
          points,
          length: strokeLen,
        });
        totalLength += strokeLen;
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = canvasWidth * 0.25;
    maxX = canvasWidth * 0.75;
    minY = canvasHeight * 0.4;
    maxY = canvasHeight * 0.65;
  }

  return {
    strokes,
    totalLength: Math.max(1, totalLength),
    carveScale,
    boundingBox: { minX, maxX, minY, maxY },
  };
}

/**
 * Computes the active stick tip position, velocity, and carved stroke segments for a given writing progress (0..1).
 */
export function evaluateWritingState(
  layout: CarvedMessageLayout,
  writingProgress: number,
  canvasWidth: number,
  canvasHeight: number
): StickTipState {
  const clamped = Math.max(0, Math.min(1, writingProgress));
  if (layout.strokes.length === 0) {
    return {
      x: canvasWidth * 0.5,
      y: canvasHeight * 0.5,
      vx: 0,
      vy: 0,
      isCarving: false,
      pressure: 0,
      liftHeightPx: 20,
    };
  }

  // Deliberate human air-lift pause between strokes (lifting stick out of sand and moving to next stroke)
  const liftGapDist = 34;
  const totalWithGaps =
    layout.totalLength + Math.max(0, layout.strokes.length - 1) * liftGapDist;
  const targetDist = clamped * totalWithGaps;

  let acc = 0;
  for (let i = 0; i < layout.strokes.length; i++) {
    const stroke = layout.strokes[i];
    const strokeEnd = acc + stroke.length;

    if (targetDist <= strokeEnd || i === layout.strokes.length - 1) {
      const localDist = Math.max(0, Math.min(stroke.length, targetDist - acc));
      const pts = stroke.points;

      let segIdx = 0;
      for (let j = 0; j < pts.length - 1; j++) {
        if (pts[j + 1].cumulativeDist >= localDist) {
          segIdx = j;
          break;
        }
        segIdx = j;
      }

      const pA = pts[segIdx];
      const pB = pts[Math.min(pts.length - 1, segIdx + 1)];
      const segSpan = Math.max(0.0001, pB.cumulativeDist - pA.cumulativeDist);
      const frac = Math.max(0, Math.min(1, (localDist - pA.cumulativeDist) / segSpan));

      return {
        x: pA.x + (pB.x - pA.x) * frac,
        y: pA.y + (pB.y - pA.y) * frac,
        vx: pB.x - pA.x,
        vy: pB.y - pA.y,
        isCarving: clamped < 1.0,
        pressure: pA.pressure + (pB.pressure - pA.pressure) * frac,
        liftHeightPx: 0,
      };
    }

    acc = strokeEnd;

    // Smooth minimum-jerk arc in the air when lifting the stick between strokes/letters
    if (i < layout.strokes.length - 1 && targetDist < acc + liftGapDist) {
      const rawFrac = (targetDist - acc) / liftGapDist;
      const smoothFrac = rawFrac * rawFrac * (3 - 2 * rawFrac);
      const endPt = stroke.points[stroke.points.length - 1];
      const nextStartPt = layout.strokes[i + 1].points[0];
      return {
        x: endPt.x + (nextStartPt.x - endPt.x) * smoothFrac,
        y: endPt.y + (nextStartPt.y - endPt.y) * smoothFrac,
        vx: (nextStartPt.x - endPt.x) * 0.15,
        vy: (nextStartPt.y - endPt.y) * 0.15,
        isCarving: false,
        pressure: 0,
        liftHeightPx: Math.sin(rawFrac * Math.PI) * 22,
      };
    }

    acc += liftGapDist;
  }

  const lastStroke = layout.strokes[layout.strokes.length - 1];
  const lastPt = lastStroke.points[lastStroke.points.length - 1];
  return {
    x: lastPt.x,
    y: lastPt.y,
    vx: 0,
    vy: 0,
    isCarving: false,
    pressure: 0,
    liftHeightPx: 26,
  };
}

/**
 * Updates the erosion state of carved sand points when a wave washes over them.
 * Returns the fraction of points that have been eroded (0..1).
 */
export function applyWaveErosionToLayout(
  layout: CarvedMessageLayout,
  wave: WaveProfile,
  phaseProgress: number,
  phase: SimulationPhase,
  elapsedSec: number,
  canvasWidth: number,
  canvasHeight: number,
  dtSec: number
): number {
  if (layout.strokes.length === 0) return 1;

  let totalPts = 0;
  let erodedSum = 0;

  for (const stroke of layout.strokes) {
    for (const pt of stroke.points) {
      totalPts++;
      const normX = pt.x / Math.max(1, canvasWidth);
      const waveY = evaluateWaveEdgeY(
        wave,
        normX,
        phaseProgress,
        phase,
        elapsedSec,
        canvasHeight
      );

      // If the foaming wave crest reaches or passes south of this carved sand point, erode the sand groove
      const submersionDepth = waveY - pt.y;
      if (submersionDepth > -14) {
        const submersionIntensity = Math.min(1, (submersionDepth + 14) / 45);
        // Fast erosion under turbulent leading foam + complete smoothing under main wave body
        const erosionRate = phase === 'wave-washing' ? 3.2 : 2.4;
        pt.erosion = Math.min(
          1,
          pt.erosion + dtSec * erosionRate * (0.4 + 0.6 * submersionIntensity)
        );
      }

      erodedSum += pt.erosion;
    }
  }

  return totalPts > 0 ? erodedSum / totalPts : 1;
}

/**
 * Pure state machine transition helper for the 5-stage shoreline cycle.
 */
export function advancePhaseTimer(
  currentPhase: SimulationPhase,
  phaseElapsedSec: number,
  durations: {
    stickEnterSec: number;
    writeSec: number;
    admireSec: number;
    waveSurgeSec: number;
    waveRecedeSec: number;
  }
): { nextPhase: SimulationPhase; phaseProgress: number; completedFullCycle: boolean } {
  const durationMap: Record<SimulationPhase, number> = {
    'stick-entering': durations.stickEnterSec,
    writing: durations.writeSec,
    admiring: durations.admireSec,
    'wave-washing': durations.waveSurgeSec,
    'wave-receding': durations.waveRecedeSec,
  };

  const activeDuration = Math.max(0.1, durationMap[currentPhase]);
  const progress = Math.max(0, Math.min(1, phaseElapsedSec / activeDuration));

  if (phaseElapsedSec < activeDuration) {
    return {
      nextPhase: currentPhase,
      phaseProgress: progress,
      completedFullCycle: false,
    };
  }

  const order: SimulationPhase[] = [
    'stick-entering',
    'writing',
    'admiring',
    'wave-washing',
    'wave-receding',
  ];
  const idx = order.indexOf(currentPhase);
  const isLast = idx === order.length - 1;
  const nextPhase = order[(idx + 1) % order.length];

  return {
    nextPhase,
    phaseProgress: 0,
    completedFullCycle: isLast,
  };
}
