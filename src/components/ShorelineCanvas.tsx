import React, { useEffect, useRef } from 'react';
import {
  BirthdayWish,
  CarvedMessageLayout,
  CarvePoint,
  CarveStroke,
  SimulationPhase,
  StickProfile,
  StickTipState,
  WaveProfile,
  advancePhaseTimer,
  applyWaveErosionToLayout,
  buildMessageStrokePaths,
  evaluateWaveEdgeY,
  evaluateWritingState,
  generateRandomStick,
  generateRandomWave,
} from '../simulation/shorelineEngine';
import {
  createCellularSeafoamTexture,
  createPhotorealSandCanvas,
} from '../simulation/coastalShader';
import { CoastalAudioEngine } from '../utils/coastalAudio';

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ResidualBubble {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  popSpeed: number;
}

export interface ShorelineTelemetry {
  phase: SimulationPhase;
  phaseProgress: number;
  erosionFraction: number;
  stick: StickProfile;
  wave: WaveProfile;
}

interface ShorelineCanvasProps {
  currentWish: BirthdayWish;
  isPlaying: boolean;
  isFreehandMode: boolean;
  writingSpeedMultiplier: number;
  waveIntensityMultiplier: number;
  stickSeedOffset: number;
  waveTriggerCounter: number;
  clearSandCounter: number;
  audioEngine: CoastalAudioEngine;
  onCycleComplete: () => void;
  onTelemetryUpdate: (telemetry: ShorelineTelemetry) => void;
}

const LOGICAL_WIDTH = 1440;
const LOGICAL_HEIGHT = 900;

export const ShorelineCanvas: React.FC<ShorelineCanvasProps> = ({
  currentWish,
  isPlaying,
  isFreehandMode,
  writingSpeedMultiplier,
  waveIntensityMultiplier,
  stickSeedOffset,
  waveTriggerCounter,
  clearSandCounter,
  audioEngine,
  onCycleComplete,
  onTelemetryUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef({
    currentWish,
    isPlaying,
    isFreehandMode,
    writingSpeedMultiplier,
    waveIntensityMultiplier,
    stickSeedOffset,
    audioEngine,
    onCycleComplete,
    onTelemetryUpdate,
  });

  useEffect(() => {
    propsRef.current = {
      currentWish,
      isPlaying,
      isFreehandMode,
      writingSpeedMultiplier,
      waveIntensityMultiplier,
      stickSeedOffset,
      audioEngine,
      onCycleComplete,
      onTelemetryUpdate,
    };
  });

  const simRef = useRef<{
    phase: SimulationPhase;
    phaseElapsedSec: number;
    totalElapsedSec: number;
    cycleSeed: number;
    stick: StickProfile;
    wave: WaveProfile;
    layout: CarvedMessageLayout;
    freehandStrokes: CarveStroke[];
    isPointerDown: boolean;
    pointerX: number;
    pointerY: number;
    lastPointerX: number;
    lastPointerY: number;
    sandParticles: SandParticle[];
    residualBubbles: ResidualBubble[];
    wetReachY: number;
    wetnessAlpha: number;
    erosionFraction: number;
    lastWishId: string;
    lastStickSeedOffset: number;
    lastWaveTrigger: number;
    lastClearSand: number;
    lastStateSignature: string;
  } | null>(null);

  if (!simRef.current) {
    const initialSeed = currentWish.index * 137 + stickSeedOffset * 31;
    simRef.current = {
      phase: 'stick-entering',
      phaseElapsedSec: 0,
      totalElapsedSec: 0,
      cycleSeed: initialSeed,
      stick: generateRandomStick(initialSeed),
      wave: generateRandomWave(initialSeed + 50, waveIntensityMultiplier),
      layout: buildMessageStrokePaths(
        currentWish.text,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        initialSeed
      ),
      freehandStrokes: [],
      isPointerDown: false,
      pointerX: LOGICAL_WIDTH * 0.5,
      pointerY: LOGICAL_HEIGHT * 0.57,
      lastPointerX: LOGICAL_WIDTH * 0.5,
      lastPointerY: LOGICAL_HEIGHT * 0.57,
      sandParticles: [],
      residualBubbles: [],
      wetReachY: 0,
      wetnessAlpha: 0,
      erosionFraction: 0,
      lastWishId: `${currentWish.id}:${currentWish.text}`,
      lastStickSeedOffset: stickSeedOffset,
      lastWaveTrigger: waveTriggerCounter,
      lastClearSand: clearSandCounter,
      lastStateSignature: '',
    };
  }

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    const wishKey = `${currentWish.id}:${currentWish.text}`;
    if (sim.lastWishId !== wishKey) {
      sim.lastWishId = wishKey;
      const newSeed =
        currentWish.index * 173 +
        stickSeedOffset * 43 +
        Math.floor(sim.totalElapsedSec * 10);
      sim.cycleSeed = newSeed;
      sim.stick = generateRandomStick(newSeed);
      sim.wave = generateRandomWave(newSeed + 71, waveIntensityMultiplier);
      sim.layout = buildMessageStrokePaths(
        currentWish.text,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        newSeed
      );
      sim.freehandStrokes = [];
      sim.phase = 'stick-entering';
      sim.phaseElapsedSec = 0;
      sim.erosionFraction = 0;
    }

    if (sim.lastStickSeedOffset !== stickSeedOffset) {
      sim.lastStickSeedOffset = stickSeedOffset;
      const newStickSeed = sim.cycleSeed + stickSeedOffset * 89 + 17;
      sim.stick = generateRandomStick(newStickSeed);
    }

    if (sim.lastWaveTrigger !== waveTriggerCounter) {
      sim.lastWaveTrigger = waveTriggerCounter;
      const waveSeed = sim.cycleSeed + waveTriggerCounter * 113;
      sim.wave = generateRandomWave(waveSeed, waveIntensityMultiplier);
      sim.phase = 'wave-washing';
      sim.phaseElapsedSec = 0;
    }

    if (sim.lastClearSand !== clearSandCounter) {
      sim.lastClearSand = clearSandCounter;
      sim.freehandStrokes = [];
      if (isFreehandMode) {
        for (const s of sim.layout.strokes) {
          for (const p of s.points) {
            p.erosion = 1;
          }
        }
      } else {
        sim.layout = buildMessageStrokePaths(
          currentWish.text,
          LOGICAL_WIDTH,
          LOGICAL_HEIGHT,
          sim.cycleSeed
        );
        sim.phase = 'stick-entering';
        sim.phaseElapsedSec = 0;
      }
    }
  }, [
    currentWish,
    stickSeedOffset,
    waveTriggerCounter,
    clearSandCounter,
    waveIntensityMultiplier,
    isFreehandMode,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-compute photorealistic normal-mapped sand & full-width cellular Worley seafoam sheet once
    const sandBgCanvas = createPhotorealSandCanvas(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    const foamSheetCanvas = createCellularSeafoamTexture(720, 200);

    let animId = 0;
    let lastTimeMs = performance.now();
    let lastRenderedWhenPaused = false;

    const spawnSandGrains = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      count: number
    ) => {
      const sim = simRef.current;
      if (!sim) return;
      const palette = ['#F5E1B8', '#D4B27C', '#7D5B34', '#5A3E1E'];
      for (let i = 0; i < count; i++) {
        if (sim.sandParticles.length > 240) {
          sim.sandParticles.shift();
        }
        const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * 2.1;
        const speed = 16 + Math.random() * 48;
        sim.sandParticles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 14 - Math.random() * 22,
          size: 1.5 + Math.random() * 2.2,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 0.88,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.35,
        });
      }
    };

    /**
     * Renders realistic 3D displaced sand trenches with crumbly sand berms,
     * directional sunlight bevels, and deep damp subsurface sand troughs.
     */
    const drawCarvedStrokeSegment = (
      c: CanvasRenderingContext2D,
      pts: CarvePoint[],
      maxIndex: number
    ) => {
      if (pts.length < 2 || maxIndex < 1) return;
      const limit = Math.min(pts.length - 1, maxIndex);

      const chunkSize = 10;
      for (let start = 0; start < limit; start += chunkSize) {
        const end = Math.min(limit, start + chunkSize);
        const midPt = pts[Math.floor((start + end) * 0.5)];
        const intact = 1 - midPt.erosion;
        if (intact <= 0.02) continue;

        // As water washes over, the groove widens and softens before vanishing
        const widthScale = midPt.pressure * (1 + midPt.erosion * 0.85);

        // 1. Wide soft ambient occlusion around the displaced sand berm
        c.beginPath();
        c.moveTo(pts[start].x, pts[start].y);
        for (let i = start + 1; i <= end; i++) {
          c.lineTo(pts[i].x, pts[i].y);
        }
        c.strokeStyle = `rgba(112, 84, 50, ${0.34 * intact})`;
        c.lineWidth = 14.5 * widthScale;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // 2. Sunlit upper-left displaced sand berm mound (pushed up by the stick)
        c.beginPath();
        c.moveTo(pts[start].x - 3.2, pts[start].y - 3.6);
        for (let i = start + 1; i <= end; i++) {
          c.lineTo(pts[i].x - 3.2, pts[i].y - 3.6);
        }
        c.strokeStyle = `rgba(248, 232, 198, ${0.82 * intact * intact})`;
        c.lineWidth = 7.2 * widthScale;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // 3. Shaded lower-right displaced sand berm slope
        c.beginPath();
        c.moveTo(pts[start].x + 3.2, pts[start].y + 3.4);
        for (let i = start + 1; i <= end; i++) {
          c.lineTo(pts[i].x + 3.2, pts[i].y + 3.4);
        }
        c.strokeStyle = `rgba(148, 114, 72, ${0.72 * intact})`;
        c.lineWidth = 6.8 * widthScale;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // 4. Deep damp subsurface sand trench (V-groove interior)
        c.beginPath();
        c.moveTo(pts[start].x, pts[start].y);
        for (let i = start + 1; i <= end; i++) {
          c.lineTo(pts[i].x, pts[i].y);
        }
        c.strokeStyle = `rgba(92, 66, 38, ${0.95 * intact})`;
        c.lineWidth = 6.2 * widthScale;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // 5. Darkest damp bottom V-channel scratch line
        c.beginPath();
        c.moveTo(pts[start].x + 0.5, pts[start].y + 0.7);
        for (let i = start + 1; i <= end; i++) {
          c.lineTo(pts[i].x + 0.5, pts[i].y + 0.7);
        }
        c.strokeStyle = `rgba(54, 36, 18, ${0.90 * intact * intact})`;
        c.lineWidth = 2.6 * widthScale;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();

        // 6. Crumbly displaced sand grain clusters along the berm edges
        if (intact > 0.3) {
          for (let i = start; i <= end; i += 2) {
            const p = pts[i];
            const hash = Math.sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453;
            const frac = hash - Math.floor(hash);
            const spread = 4.2 + frac * 3.8;
            c.fillStyle =
              frac > 0.45
                ? `rgba(250, 235, 202, ${0.78 * intact})`
                : `rgba(116, 86, 48, ${0.68 * intact})`;
            c.fillRect(p.x - spread, p.y - spread * 0.9, 1.9, 1.9);
            c.fillRect(p.x + spread * 0.85, p.y + spread, 1.7, 1.7);
          }
        }
      }
    };

    const drawNaturalStick = (
      c: CanvasRenderingContext2D,
      stick: StickProfile,
      tip: StickTipState,
      entryFactor: number
    ) => {
      if (entryFactor <= 0.01) return;

      c.save();
      const slideOffset = (1 - entryFactor) * 250;
      // Subtle human wrist articulation following stroke direction
      const wristSway =
        tip.isCarving
          ? Math.atan2(tip.vy, tip.vx) * 0.045
          : Math.sin(performance.now() * 0.0025) * 0.015;

      const angle = stick.baseAngleRad + wristSway;
      const tipX = tip.x + Math.cos(angle) * slideOffset;
      const tipY = tip.y + Math.sin(angle) * slideOffset - tip.liftHeightPx;

      const stickLen = stick.lengthPx * 1.22;
      const endX = tipX + Math.cos(angle) * stickLen;
      const endY = tipY + Math.sin(angle) * stickLen;

      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const midX = (tipX + endX) * 0.5 + perpX * stick.curveBendPx;
      const midY = (tipY + endY) * 0.5 + perpY * stick.curveBendPx;

      const sampleShaft = (t: number) => {
        const omt = 1 - t;
        const x = omt * omt * tipX + 2 * omt * t * midX + t * t * endX;
        const y = omt * omt * tipY + 2 * omt * t * midY + t * t * endY;
        const radius =
          (stick.tipThicknessPx +
            (stick.baseThicknessPx - stick.tipThicknessPx) * Math.pow(t, 0.82)) *
          0.56;
        return { x, y, radius };
      };

      // 1. Soft, realistic diffused penumbra sun shadow cast onto the sand
      const shadowOffsetX = 16 + tip.liftHeightPx * 0.75;
      const shadowOffsetY = 22 + tip.liftHeightPx * 0.95;
      const shadowAlpha =
        0.28 * entryFactor * Math.max(0.32, 1 - tip.liftHeightPx / 52);

      c.save();
      // Outer soft penumbra
      c.beginPath();
      c.moveTo(tip.x + 3, tip.y + 4);
      c.quadraticCurveTo(
        midX + shadowOffsetX,
        midY + shadowOffsetY,
        endX + shadowOffsetX * 1.35,
        endY + shadowOffsetY * 1.35
      );
      c.strokeStyle = `rgba(42, 28, 14, ${shadowAlpha * 0.55})`;
      c.lineWidth = stick.baseThicknessPx * 1.45;
      c.lineCap = 'round';
      c.stroke();

      // Core shadow umbra
      c.beginPath();
      c.moveTo(tip.x + 2, tip.y + 3);
      c.quadraticCurveTo(
        midX + shadowOffsetX * 0.92,
        midY + shadowOffsetY * 0.92,
        endX + shadowOffsetX * 1.28,
        endY + shadowOffsetY * 1.28
      );
      c.strokeStyle = `rgba(32, 20, 9, ${shadowAlpha * 0.85})`;
      c.lineWidth = stick.baseThicknessPx * 0.85;
      c.lineCap = 'round';
      c.stroke();
      c.restore();

      // 2. Build continuous tapered polygon for the wooden stick body
      const steps = 22;
      const upperEdge: Array<{ x: number; y: number }> = [];
      const lowerEdge: Array<{ x: number; y: number }> = [];
      const centerLine: Array<{ x: number; y: number; radius: number }> = [];

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = sampleShaft(t);
        const barkWave = Math.sin(t * 26) * 0.52 * stick.grainRoughness;
        const r = pt.radius + barkWave;
        centerLine.push({ x: pt.x, y: pt.y, radius: r });
        upperEdge.push({ x: pt.x - perpX * r, y: pt.y - perpY * r });
        lowerEdge.push({ x: pt.x + perpX * r, y: pt.y + perpY * r });
      }

      // Whittled conical wooden point at the carving tip
      const neck = centerLine[0];
      c.beginPath();
      c.moveTo(tipX, tipY);
      c.lineTo(upperEdge[0].x, upperEdge[0].y);
      c.lineTo(lowerEdge[0].x, lowerEdge[0].y);
      c.closePath();
      c.fillStyle = stick.tipColor;
      c.fill();

      // Main continuous wooden shaft silhouette
      c.beginPath();
      c.moveTo(upperEdge[0].x, upperEdge[0].y);
      for (let i = 1; i < upperEdge.length; i++) {
        c.lineTo(upperEdge[i].x, upperEdge[i].y);
      }
      const basePt = centerLine[centerLine.length - 1];
      c.arc(
        basePt.x,
        basePt.y,
        basePt.radius,
        Math.atan2(-perpY, -perpX),
        Math.atan2(perpY, perpX)
      );
      for (let i = lowerEdge.length - 1; i >= 0; i--) {
        c.lineTo(lowerEdge[i].x, lowerEdge[i].y);
      }
      c.closePath();
      c.fillStyle = stick.primaryColor;
      c.fill();
      c.strokeStyle = stick.barkDarkColor;
      c.lineWidth = 1.4;
      c.stroke();

      // Continuous sunlit upper-edge wood highlight strip
      c.beginPath();
      for (let i = 0; i < centerLine.length; i++) {
        const pt = centerLine[i];
        const hx = pt.x - perpX * (pt.radius * 0.42);
        const hy = pt.y - perpY * (pt.radius * 0.42);
        if (i === 0) c.moveTo(hx, hy);
        else c.lineTo(hx, hy);
      }
      c.strokeStyle = stick.secondaryColor;
      c.lineWidth = 3.4;
      c.lineCap = 'round';
      c.stroke();

      // Continuous shaded lower-edge bark underside
      c.beginPath();
      for (let i = 0; i < centerLine.length; i++) {
        const pt = centerLine[i];
        const sx = pt.x + perpX * (pt.radius * 0.55);
        const sy = pt.y + perpY * (pt.radius * 0.55);
        if (i === 0) c.moveTo(sx, sy);
        else c.lineTo(sx, sy);
      }
      c.strokeStyle = stick.barkDarkColor;
      c.lineWidth = 3.0;
      c.lineCap = 'round';
      c.stroke();

      // Fine longitudinal wood-grain bark striations
      if (stick.id === 'bamboo-reed') {
        for (const nodeT of [0.28, 0.58, 0.86]) {
          const nPt = sampleShaft(nodeT);
          c.beginPath();
          c.moveTo(
            nPt.x - perpX * (nPt.radius * 1.08),
            nPt.y - perpY * (nPt.radius * 1.08)
          );
          c.lineTo(
            nPt.x + perpX * (nPt.radius * 1.08),
            nPt.y + perpY * (nPt.radius * 1.08)
          );
          c.strokeStyle = stick.barkDarkColor;
          c.lineWidth = 2.5;
          c.stroke();
        }
      } else {
        c.beginPath();
        for (const lane of [-0.16, 0.22]) {
          for (let i = 0; i < centerLine.length; i++) {
            const pt = centerLine[i];
            const gx = pt.x + perpX * (pt.radius * lane);
            const gy = pt.y + perpY * (pt.radius * lane);
            if (i === 0) c.moveTo(gx, gy);
            else c.lineTo(gx, gy);
          }
        }
        c.strokeStyle = stick.barkDarkColor;
        c.globalAlpha = 0.45;
        c.lineWidth = 1.1;
        c.stroke();
        c.globalAlpha = 1.0;
      }

      // 3. Protruding natural twig knots along the stick shaft
      for (const knot of stick.knots) {
        const kt = knot.offsetNorm;
        const kBase = sampleShaft(kt);
        const kOutX =
          kBase.x + perpX * knot.side * (kBase.radius + knot.size * 0.78);
        const kOutY =
          kBase.y + perpY * knot.side * (kBase.radius + knot.size * 0.78);

        c.beginPath();
        c.moveTo(kBase.x, kBase.y);
        c.lineTo(kOutX, kOutY);
        c.strokeStyle = stick.barkDarkColor;
        c.lineWidth = knot.size * 1.05;
        c.lineCap = 'round';
        c.stroke();

        c.beginPath();
        c.arc(kOutX, kOutY, knot.size * 0.36, 0, Math.PI * 2);
        c.fillStyle = stick.secondaryColor;
        c.fill();
      }

      // 4. Damp sand clump clinging to the carving stick tip
      if (tip.isCarving && tip.liftHeightPx < 2) {
        c.beginPath();
        c.arc(tip.x, tip.y, 4.8, 0, Math.PI * 2);
        c.fillStyle = 'rgba(232, 204, 156, 0.85)';
        c.fill();
      }
      c.beginPath();
      c.arc(neck.x, neck.y, neck.radius * 0.72, 0, Math.PI * 2);
      c.fillStyle = stick.tipColor;
      c.fill();

      c.restore();
    };

    /**
     * Renders photorealistic shallow ocean swash, refractive water glazing,
     * and cellular Worley/Voronoi seafoam mapped dynamically along the wave edge.
     */
    const drawOceanWaveAndFoam = (
      c: CanvasRenderingContext2D,
      wave: WaveProfile,
      phase: SimulationPhase,
      phaseProgress: number,
      elapsedSec: number
    ) => {
      const cols = 96;
      const edgePoints: Array<{ x: number; y: number; normX: number }> = [];
      let maxWaveY = 0;
      let minWaveY = LOGICAL_HEIGHT;

      for (let i = 0; i <= cols; i++) {
        const normX = i / cols;
        const x = normX * LOGICAL_WIDTH;
        const y = evaluateWaveEdgeY(
          wave,
          normX,
          phaseProgress,
          phase,
          elapsedSec,
          LOGICAL_HEIGHT
        );
        if (y > maxWaveY) maxWaveY = y;
        if (y < minWaveY) minWaveY = y;
        edgePoints.push({ x, y, normX });
      }

      const sim = simRef.current;
      if (sim) {
        if (maxWaveY > sim.wetReachY) {
          sim.wetReachY = maxWaveY;
        }
        if (phase === 'wave-washing') {
          sim.wetnessAlpha = Math.min(1, sim.wetnessAlpha + 0.045);
        } else if (phase === 'wave-receding') {
          sim.wetnessAlpha = Math.max(0.55, sim.wetnessAlpha - 0.006);
        } else {
          sim.wetnessAlpha = Math.max(0, sim.wetnessAlpha - 0.014);
          if (sim.wetnessAlpha <= 0.01) {
            sim.wetReachY = 0;
          }
        }
      }

      // Do not render any stagnant wave or froth at the top when the wave is not washing/receding
      if ((phase !== 'wave-washing' && phase !== 'wave-receding') || maxWaveY <= 2) {
        return;
      }

      // 1. Dark wet capillary water-line rim right in front of the leading swash edge
      c.save();
      c.beginPath();
      c.moveTo(0, 0);
      for (const pt of edgePoints) {
        c.lineTo(pt.x, pt.y + 4.5);
      }
      c.lineTo(LOGICAL_WIDTH, 0);
      c.closePath();
      c.fillStyle = 'rgba(44, 36, 22, 0.28)';
      c.fill();
      c.restore();

      // 2. Refractive Translucent Ocean Water Body (Deep Teal-Emerald -> Glassy Shallow Swash over Sand)
      c.save();
      c.beginPath();
      c.moveTo(0, 0);
      for (const pt of edgePoints) {
        c.lineTo(pt.x, pt.y);
      }
      c.lineTo(LOGICAL_WIDTH, 0);
      c.closePath();

      const waterGrad = c.createLinearGradient(0, 0, 0, Math.max(200, maxWaveY));
      waterGrad.addColorStop(0.0, 'rgba(9, 54, 62, 0.96)');
      waterGrad.addColorStop(0.22, 'rgba(16, 88, 96, 0.88)');
      waterGrad.addColorStop(0.50, 'rgba(36, 128, 126, 0.68)');
      waterGrad.addColorStop(0.78, 'rgba(78, 158, 148, 0.42)');
      waterGrad.addColorStop(0.94, 'rgba(156, 198, 186, 0.24)');
      waterGrad.addColorStop(1.0, 'rgba(225, 242, 238, 0.16)');
      c.fillStyle = waterGrad;
      c.fill();

      c.clip();

      // 2a. Subsurface Rolling Swell Trough Shadows & Sunlit Water Caustics
      for (let r = 1; r <= 3; r++) {
        const ratio = r * 0.23;
        c.beginPath();
        for (let i = 0; i <= cols; i++) {
          const pt = edgePoints[i];
          const swellWave =
            Math.sin(pt.normX * Math.PI * (3 + r) + elapsedSec * (1.2 + r * 0.25)) * 10 +
            Math.cos(pt.normX * Math.PI * (6 + r) - elapsedSec * 1.1) * 5;
          const ry = pt.y * (1 - ratio) + swellWave;
          if (i === 0) c.moveTo(pt.x, ry);
          else c.lineTo(pt.x, ry);
        }
        c.strokeStyle = `rgba(6, 40, 48, ${0.22 - r * 0.04})`;
        c.lineWidth = 16 - r * 3;
        c.lineCap = 'round';
        c.stroke();
      }

      // 2b. Full-Width Seamless Cellular Voronoi Seafoam Sheet inside the clipped wave polygon!
      // Only 2 drawImage calls per frame -> zero vertical strip seams and < 0.3ms render time!
      const foamDepthPx =
        wave.foamBandPx *
        (phase === 'wave-washing' ? 3.2 : phase === 'wave-receding' ? 3.8 : 2.3);
      const foamTopY = Math.max(0, minWaveY - foamDepthPx);
      const foamSpanH = Math.max(80, maxWaveY - foamTopY + 12);

      c.globalAlpha = phase === 'wave-receding' ? 0.85 : 0.94;
      c.drawImage(
        foamSheetCanvas,
        0,
        0,
        foamSheetCanvas.width,
        foamSheetCanvas.height,
        0,
        foamTopY,
        LOGICAL_WIDTH,
        foamSpanH
      );
      c.globalAlpha = 1.0;

      // 2c. Contour-following lacy foam web ribbons right behind the wave lip
      for (let band = 1; band <= 3; band++) {
        c.beginPath();
        for (let i = 0; i <= cols; i++) {
          const pt = edgePoints[i];
          const laceOffset =
            band * 12 +
            Math.sin(pt.normX * (28 + band * 14) + elapsedSec * (1.8 + band * 0.4)) *
              (7 + band * 2.5) +
            Math.cos(pt.normX * (46 - band * 8) - elapsedSec * 1.5) * 5;
          const ly = pt.y - laceOffset;
          if (i === 0) c.moveTo(pt.x, ly);
          else c.lineTo(pt.x, ly);
        }
        c.strokeStyle = `rgba(244, 252, 251, ${0.46 - band * 0.09})`;
        c.lineWidth = 10 - band * 2;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.stroke();
      }

      c.restore();

      // 3. Multi-Layered Aerated Creamy Leading Swash Lip hugging every curve of `edgePoints`
      c.save();
      // Wide translucent aqua-white foam cushion
      c.beginPath();
      for (let i = 0; i <= cols; i++) {
        const pt = edgePoints[i];
        const cushionWave = Math.sin(pt.normX * 36 + elapsedSec * 2.5) * 3;
        if (i === 0) c.moveTo(pt.x, pt.y - 6 + cushionWave);
        else c.lineTo(pt.x, pt.y - 6 + cushionWave);
      }
      c.strokeStyle = 'rgba(218, 244, 242, 0.52)';
      c.lineWidth = 22;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke();

      // Medium frothy foam collar
      c.beginPath();
      for (let i = 0; i <= cols; i++) {
        const pt = edgePoints[i];
        if (i === 0) c.moveTo(pt.x, pt.y - 2.5);
        else c.lineTo(pt.x, pt.y - 2.5);
      }
      c.strokeStyle = 'rgba(240, 251, 250, 0.78)';
      c.lineWidth = 12;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke();

      // Crisp irregular frothy foam edge with organic micro-beads
      c.beginPath();
      for (let i = 0; i <= cols; i++) {
        const pt = edgePoints[i];
        const microBead =
          Math.sin(pt.normX * 78 + elapsedSec * 4.2) * 1.8 +
          Math.cos(pt.normX * 130 - elapsedSec * 3.1) * 1.1;
        if (i === 0) c.moveTo(pt.x, pt.y + microBead);
        else c.lineTo(pt.x, pt.y + microBead);
      }
      c.strokeStyle = 'rgba(252, 254, 254, 0.96)';
      c.lineWidth = 6.5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke();
      c.restore();
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const renderFrame = (nowMs: number) => {
      if (isDisposed) return;
      const dtSec = Math.min(0.06, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
      lastTimeMs = nowMs;

      const sim = simRef.current;
      const {
        isPlaying: playing,
        isFreehandMode: freehand,
        writingSpeedMultiplier: speedMult,
        audioEngine: audio,
        onCycleComplete: handleCycleComplete,
        onTelemetryUpdate: handleTelemetry,
      } = propsRef.current;

      if (!sim) return;

      // When paused and not actively drawing freehand, skip redundant 1440x900 canvas repaints
      if (!playing && !sim.isPointerDown && lastRenderedWhenPaused) {
        if (!isDisposed) {
          timerId = setTimeout(() => {
            renderFrame(performance.now());
          }, 120);
        }
        return;
      }
      lastRenderedWhenPaused = !playing && !sim.isPointerDown;

      sim.totalElapsedSec += dtSec;

      // Authentic, unhurried human carving duration (~11.5s at 1.0x speed)
      const phaseDurations = {
        stickEnterSec: 1.05,
        writeSec: Math.max(4.5, 11.5 / Math.max(0.4, speedMult)),
        admireSec: 2.8,
        waveSurgeSec: sim.wave.surgeDurationSec + 0.6,
        waveRecedeSec: sim.wave.recedeDurationSec + 0.8,
      };

      if (playing && (!freehand || sim.phase === 'wave-washing' || sim.phase === 'wave-receding')) {
        sim.phaseElapsedSec += dtSec;
        const transition = advancePhaseTimer(
          sim.phase,
          sim.phaseElapsedSec,
          phaseDurations
        );

        if (transition.nextPhase !== sim.phase) {
          const prevPhase = sim.phase;
          sim.phase = transition.nextPhase;
          sim.phaseElapsedSec = 0;

          if (prevPhase === 'wave-washing' && sim.phase === 'wave-receding') {
            sim.residualBubbles = [];
            for (let b = 0; b < 75; b++) {
              const bx = Math.random() * LOGICAL_WIDTH;
              const by =
                LOGICAL_HEIGHT * 0.24 +
                Math.random() * (sim.wetReachY - LOGICAL_HEIGHT * 0.26);
              sim.residualBubbles.push({
                x: bx,
                y: by,
                radius: 0.9 + Math.random() * 2.4,
                alpha: 0.45 + Math.random() * 0.35,
                popSpeed: 0.18 + Math.random() * 0.35,
              });
            }
          }

          if (transition.completedFullCycle) {
            if (freehand) {
              sim.freehandStrokes = [];
              sim.phase = 'writing';
            } else {
              handleCycleComplete();
            }
          }
        }
      }

      const activeDuration =
        sim.phase === 'stick-entering'
          ? phaseDurations.stickEnterSec
          : sim.phase === 'writing'
            ? phaseDurations.writeSec
            : sim.phase === 'admiring'
              ? phaseDurations.admireSec
              : sim.phase === 'wave-washing'
                ? phaseDurations.waveSurgeSec
                : phaseDurations.waveRecedeSec;

      const phaseProgress = Math.max(0, Math.min(1, sim.phaseElapsedSec / activeDuration));

      if (document.body.getAttribute('data-phase') !== sim.phase) {
        document.body.setAttribute('data-phase', sim.phase);
      }

      // 1. Draw Pre-computed Photorealistic Normal-Mapped Beach Sand
      ctx.drawImage(sandBgCanvas, 0, 0);

      // 2. Draw Wet Sand Darkening Glaze & Mirror Sky Reflection where recent wave reached
      if (sim.wetnessAlpha > 0.02) {
        ctx.save();
        const wetGrad = ctx.createLinearGradient(0, 0, 0, sim.wetReachY + 36);
        wetGrad.addColorStop(0.0, `rgba(62, 44, 22, ${0.46 * sim.wetnessAlpha})`);
        wetGrad.addColorStop(0.72, `rgba(78, 56, 30, ${0.36 * sim.wetnessAlpha})`);
        wetGrad.addColorStop(0.93, `rgba(98, 72, 40, ${0.18 * sim.wetnessAlpha})`);
        wetGrad.addColorStop(1.0, 'rgba(98, 72, 40, 0)');
        ctx.fillStyle = wetGrad;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, sim.wetReachY + 36);

        // Specular sky/horizon reflection glaze on freshly wet sand
        const sheenGrad = ctx.createLinearGradient(0, 0, 0, sim.wetReachY);
        sheenGrad.addColorStop(0.0, `rgba(195, 232, 242, ${0.22 * sim.wetnessAlpha})`);
        sheenGrad.addColorStop(0.55, `rgba(222, 242, 248, ${0.11 * sim.wetnessAlpha})`);
        sheenGrad.addColorStop(1.0, 'rgba(222, 242, 248, 0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, sim.wetReachY);
        ctx.restore();
      }

      // 3. Apply Progressive Wave Erosion during wave-washing and wave-receding
      if (sim.phase === 'wave-washing' || sim.phase === 'wave-receding') {
        sim.erosionFraction = applyWaveErosionToLayout(
          sim.layout,
          sim.wave,
          phaseProgress,
          sim.phase,
          sim.totalElapsedSec,
          LOGICAL_WIDTH,
          LOGICAL_HEIGHT,
          dtSec
        );
        if (sim.freehandStrokes.length > 0) {
          applyWaveErosionToLayout(
            {
              strokes: sim.freehandStrokes,
              totalLength: 100,
              boundingBox: { minX: 0, maxX: LOGICAL_WIDTH, minY: 0, maxY: LOGICAL_HEIGHT },
            },
            sim.wave,
            phaseProgress,
            sim.phase,
            sim.totalElapsedSec,
            LOGICAL_WIDTH,
            LOGICAL_HEIGHT,
            dtSec
          );
        }
      }

      // 4. Determine Active Stick Tip & Render Carved Sand Grooves
      let tipState: StickTipState = {
        x: LOGICAL_WIDTH * 0.5,
        y: LOGICAL_HEIGHT * 0.57,
        vx: 0,
        vy: 0,
        isCarving: false,
        pressure: 0,
        liftHeightPx: 26,
      };
      let stickEntryFactor = 0;

      if (freehand) {
        stickEntryFactor = sim.phase === 'wave-washing' ? 0.25 : 1.0;
        const vx = sim.pointerX - sim.lastPointerX;
        const vy = sim.pointerY - sim.lastPointerY;
        sim.lastPointerX = sim.pointerX;
        sim.lastPointerY = sim.pointerY;

        tipState = {
          x: sim.pointerX,
          y: sim.pointerY,
          vx,
          vy,
          isCarving: sim.isPointerDown,
          pressure: sim.isPointerDown ? 1.05 : 0,
          liftHeightPx: sim.isPointerDown ? 0 : 18,
        };

        if (sim.isPointerDown && Math.hypot(vx, vy) > 1.2) {
          spawnSandGrains(sim.pointerX, sim.pointerY, vx, vy, 2);
        }

        for (const stroke of sim.freehandStrokes) {
          drawCarvedStrokeSegment(ctx, stroke.points, stroke.points.length - 1);
        }
      } else {
        const writeProg =
          sim.phase === 'stick-entering'
            ? 0
            : sim.phase === 'writing'
              ? phaseProgress
              : 1.0;

        tipState = evaluateWritingState(
          sim.layout,
          writeProg,
          LOGICAL_WIDTH,
          LOGICAL_HEIGHT
        );

        if (sim.phase === 'stick-entering') {
          stickEntryFactor = Math.sin(phaseProgress * (Math.PI / 2));
          tipState.isCarving = false;
          tipState.liftHeightPx = (1 - stickEntryFactor) * 35;
        } else if (sim.phase === 'writing') {
          stickEntryFactor = 1.0;
          if (tipState.isCarving && playing) {
            spawnSandGrains(tipState.x, tipState.y, tipState.vx, tipState.vy, 1);
          }
        } else if (sim.phase === 'admiring') {
          stickEntryFactor = Math.max(0, 1 - phaseProgress * 1.8);
          tipState.isCarving = false;
          tipState.liftHeightPx = phaseProgress * 40;
        } else {
          stickEntryFactor = 0;
        }

        // Match liftGapDist = 34 in shorelineEngine.ts
        const liftGapDist = 34;
        const totalWithGaps =
          sim.layout.totalLength +
          Math.max(0, sim.layout.strokes.length - 1) * liftGapDist;
        const carvedDistBudget = writeProg * totalWithGaps;

        let acc = 0;
        for (const stroke of sim.layout.strokes) {
          if (carvedDistBudget <= acc) break;
          const localDist = carvedDistBudget - acc;
          if (localDist >= stroke.length) {
            drawCarvedStrokeSegment(ctx, stroke.points, stroke.points.length - 1);
          } else {
            let maxPtIdx = 0;
            for (let j = 0; j < stroke.points.length; j++) {
              if (stroke.points[j].cumulativeDist <= localDist) {
                maxPtIdx = j;
              } else {
                break;
              }
            }
            drawCarvedStrokeSegment(ctx, stroke.points, maxPtIdx);
          }
          acc += stroke.length + liftGapDist;
        }
      }

      // 5. Update & Draw Ejected Sand Grain Particles
      for (let i = sim.sandParticles.length - 1; i >= 0; i--) {
        const p = sim.sandParticles[i];
        p.life += dtSec;
        if (p.life >= p.maxLife) {
          sim.sandParticles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy += 110 * dtSec;
        p.vx *= 0.94;

        const lifeRatio = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * lifeRatio;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;

      // 6. Update & Draw Residual Fizzing Micro-Bubbles on Wet Sand
      ctx.fillStyle = 'rgba(248, 252, 252, 0.52)';
      ctx.beginPath();
      for (let i = sim.residualBubbles.length - 1; i >= 0; i--) {
        const b = sim.residualBubbles[i];
        b.alpha -= b.popSpeed * dtSec;
        if (b.alpha <= 0.02) {
          sim.residualBubbles.splice(i, 1);
          continue;
        }
        ctx.moveTo(b.x + b.radius, b.y);
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      }
      ctx.fill();

      // 7. Draw Photorealistic Ocean Swash & Cellular Voronoi Seafoam
      drawOceanWaveAndFoam(
        ctx,
        sim.wave,
        sim.phase,
        phaseProgress,
        sim.totalElapsedSec
      );

      // 8. Draw Natural Wooden Stick & Cast Shadow on Top
      drawNaturalStick(ctx, sim.stick, tipState, stickEntryFactor);

      // 9. Update Procedural Coastal Audio Engine
      const carveSpeed = Math.hypot(tipState.vx, tipState.vy);
      audio.updateFrame(sim.phase, phaseProgress, tipState.isCarving && playing, carveSpeed);

      const stateSignature = `${sim.phase}:${sim.stick.id}:${sim.wave.id}`;
      if (sim.lastStateSignature !== stateSignature) {
        sim.lastStateSignature = stateSignature;
        handleTelemetry({
          phase: sim.phase,
          phaseProgress,
          erosionFraction: sim.erosionFraction,
          stick: sim.stick,
          wave: sim.wave,
        });
      }

      if (!isDisposed) {
        timerId = setTimeout(() => {
          renderFrame(performance.now());
        }, 60);
      }
    };

    renderFrame(performance.now());

    return () => {
      isDisposed = true;
      if (timerId) clearTimeout(timerId);
      cancelAnimationFrame(animId);
    };
  }, []);

  const getLogicalCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: LOGICAL_WIDTH * 0.5, y: LOGICAL_HEIGHT * 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / Math.max(1, rect.width);
    const scaleY = LOGICAL_HEIGHT / Math.max(1, rect.height);
    return {
      x: Math.max(24, Math.min(LOGICAL_WIDTH - 24, (e.clientX - rect.left) * scaleX)),
      y: Math.max(
        LOGICAL_HEIGHT * 0.18,
        Math.min(LOGICAL_HEIGHT - 24, (e.clientY - rect.top) * scaleY)
      ),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    const pt = getLogicalCoords(e);
    sim.pointerX = pt.x;
    sim.pointerY = pt.y;
    sim.lastPointerX = pt.x;
    sim.lastPointerY = pt.y;

    if (isFreehandMode) {
      e.currentTarget.setPointerCapture(e.pointerId);
      sim.isPointerDown = true;
      sim.freehandStrokes.push({
        points: [
          {
            x: pt.x,
            y: pt.y,
            pressure: 1.0,
            erosion: 0,
            cumulativeDist: 0,
          },
        ],
        length: 1,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    const pt = getLogicalCoords(e);
    sim.pointerX = pt.x;
    sim.pointerY = pt.y;

    if (isFreehandMode && sim.isPointerDown && sim.freehandStrokes.length > 0) {
      const currentStroke = sim.freehandStrokes[sim.freehandStrokes.length - 1];
      const lastPt = currentStroke.points[currentStroke.points.length - 1];
      const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      if (dist >= 3.0) {
        const nextCumDist = lastPt.cumulativeDist + dist;
        currentStroke.points.push({
          x: pt.x,
          y: pt.y,
          pressure: 0.95 + Math.min(0.25, dist / 45),
          erosion: 0,
          cumulativeDist: nextCumDist,
        });
        currentStroke.length = nextCumDist;
      }
    }
  };

  const handlePointerUp = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.isPointerDown = false;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#C8AC7E]">
      <canvas
        ref={canvasRef}
        data-testid="shoreline-canvas"
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full object-cover select-none ${
          isFreehandMode ? 'cursor-crosshair touch-none' : 'cursor-default'
        }`}
        aria-label={`Interactive shoreline sand canvas currently carving wish ${currentWish.index}: ${currentWish.text.replace('\n', ' ')}`}
      />
    </div>
  );
};
