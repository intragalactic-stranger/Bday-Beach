import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BIRTHDAY_WISHES,
  generateRandomStick,
  generateRandomWave,
  evaluateWaveEdgeY,
  buildMessageStrokePaths,
  evaluateWritingState,
  applyWaveErosionToLayout,
  advancePhaseTimer,
} from './shorelineEngine';

test('DEFAULT_BIRTHDAY_WISHES contains exactly 10 distinct birthday messages', () => {
  assert.equal(DEFAULT_BIRTHDAY_WISHES.length, 10);
  const uniqueIds = new Set(DEFAULT_BIRTHDAY_WISHES.map((w) => w.id));
  assert.equal(uniqueIds.size, 10);
  for (const wish of DEFAULT_BIRTHDAY_WISHES) {
    assert.ok(wish.text.trim().length > 10, `Wish ${wish.id} should have meaningful text`);
    assert.ok(wish.subtitle.trim().length > 3);
  }
});

test('generateRandomStick produces valid driftwood/twig profiles and varies across seeds', () => {
  const archetypesSeen = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) {
    const stick = generateRandomStick(seed * 97);
    archetypesSeen.add(stick.id);
    assert.ok(stick.lengthPx >= 230 && stick.lengthPx <= 285);
    assert.ok(stick.baseThicknessPx > stick.tipThicknessPx);
    assert.ok(stick.knots.length >= 2);
  }
  assert.ok(archetypesSeen.size >= 4, 'Should sample multiple distinct stick archetypes');
});

test('generateRandomWave and evaluateWaveEdgeY simulate surge and backwash accurately', () => {
  const wave = generateRandomWave(42, 1.0);
  const canvasHeight = 800;

  const idleY = evaluateWaveEdgeY(wave, 0.5, 0, 'writing', 1.0, canvasHeight);
  const peakSurgeY = evaluateWaveEdgeY(wave, 0.5, 1.0, 'wave-washing', 2.5, canvasHeight);
  const endRecedeY = evaluateWaveEdgeY(wave, 0.5, 1.0, 'wave-receding', 5.0, canvasHeight);

  assert.ok(idleY < canvasHeight * 0.35, 'Idle wave stays near top shoreline');
  assert.ok(peakSurgeY > canvasHeight * 0.72, 'Peak wave surge covers the carved sand area');
  assert.ok(endRecedeY < canvasHeight * 0.35, 'Receded wave returns to top shoreline');
});

test('buildMessageStrokePaths and evaluateWritingState trace letters across the sand', () => {
  const layout = buildMessageStrokePaths('Happy Birthday!\nMay your year shine ♥', 1000, 700, 7);
  assert.ok(layout.strokes.length > 20, 'Should generate strokes for each character');
  assert.ok(layout.totalLength > 500, 'Total stroke length should be substantial');

  const startTip = evaluateWritingState(layout, 0, 1000, 700);
  const midTip = evaluateWritingState(layout, 0.5, 1000, 700);
  const endTip = evaluateWritingState(layout, 1.0, 1000, 700);

  assert.equal(startTip.isCarving, true);
  assert.equal(midTip.isCarving, true);
  assert.equal(endTip.isCarving, false);
  assert.notEqual(Math.round(startTip.x), Math.round(midTip.x));
});

test('applyWaveErosionToLayout progressively washes away carved sand grooves', () => {
  const layout = buildMessageStrokePaths('Happy Birthday!', 1000, 700, 19);
  const wave = generateRandomWave(99, 1.15);

  let erosionFraction = 0;
  for (let step = 0; step <= 20; step++) {
    const progress = step / 20;
    erosionFraction = applyWaveErosionToLayout(
      layout,
      wave,
      progress,
      'wave-washing',
      step * 0.12,
      1000,
      700,
      0.12
    );
  }

  assert.ok(
    erosionFraction > 0.9,
    `Expected wave surge to erode >90% of carved sand, got ${erosionFraction}`
  );
});

test('advancePhaseTimer transitions through all 5 shoreline phases and flags cycle completion', () => {
  const durations = {
    stickEnterSec: 0.8,
    writeSec: 4.5,
    admireSec: 2.0,
    waveSurgeSec: 2.5,
    waveRecedeSec: 2.8,
  };

  const t1 = advancePhaseTimer('stick-entering', 0.4, durations);
  assert.equal(t1.nextPhase, 'stick-entering');
  assert.equal(t1.completedFullCycle, false);

  const t2 = advancePhaseTimer('stick-entering', 0.85, durations);
  assert.equal(t2.nextPhase, 'writing');

  const t3 = advancePhaseTimer('wave-receding', 2.9, durations);
  assert.equal(t3.nextPhase, 'stick-entering');
  assert.equal(t3.completedFullCycle, true);
});
