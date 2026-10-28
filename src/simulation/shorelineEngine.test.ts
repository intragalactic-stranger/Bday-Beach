import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRandomStick,
  generateRandomWave,
  evaluateWaveEdgeY,
  buildMessageStrokePaths,
  evaluateWritingState,
  applyWaveErosionToLayout,
  advancePhaseTimer,
  isCarvableText,
} from './shorelineEngine';
import { buildBirthdayWishes, refreshLiveWish, resolveBirthdayDetails } from '../data/wishes';

test('buildBirthdayWishes personalises 20 distinct, fully carvable wishes', () => {
  const details = resolveBirthdayDetails(
    { name: 'Priya', birthDate: '2006-11-02', birthTime: '05:42' },
    new Date(2026, 10, 2, 9, 0)
  );
  assert.equal(details.age, 20);
  assert.equal(details.ageOrdinal, '20th');
  assert.equal(details.timeLabel, '5:42 AM');
  assert.equal(details.dateShort, '2 Nov');

  const wishes = buildBirthdayWishes(details, new Date(2026, 10, 2, 9, 0));
  assert.equal(wishes.length, 20);
  assert.equal(new Set(wishes.map((w) => w.id)).size, 20);
  for (const wish of wishes) {
    assert.ok(!/[{}]/.test(wish.text + wish.subtitle + (wish.note ?? '')), `Unfilled placeholder in ${wish.id}`);
    assert.ok(isCarvableText(wish.text), `Wish ${wish.id} has characters the stick cannot carve: ${wish.text}`);
    assert.ok((wish.note ?? '').length > 20, `Wish ${wish.id} should carry a love note`);
  }
});

test('the live wish counts hours, minutes and seconds since the birth moment', () => {
  const details = resolveBirthdayDetails(
    { name: 'A', birthDate: '2006-11-02', birthTime: '05:42' },
    new Date(2026, 10, 2)
  );
  // Exactly 2 days, 3 minutes and 7 seconds after birth
  const now = new Date(2006, 10, 4, 5, 45, 7);
  const live = buildBirthdayWishes(details, now).find((w) => w.live);
  assert.ok(live, 'Expected one live wish');
  assert.match(live.text, /^It's been 48 hours,\n3 minutes & 7 seconds\nsince you came ♥$/);

  const later = refreshLiveWish(live, details, new Date(2026, 10, 2, 5, 42, 0));
  assert.match(later.text, /175,3\d\d hours/);
});

test('resolveBirthdayDetails uses the nearest birthday so the age reads right on either side of it', () => {
  const input = { name: 'A', birthDate: '2006-01-02', birthTime: '23:15' };
  assert.equal(resolveBirthdayDetails(input, new Date(2025, 11, 30)).age, 20);
  assert.equal(resolveBirthdayDetails(input, new Date(2026, 0, 5)).age, 20);
  assert.equal(resolveBirthdayDetails(input, new Date(2026, 0, 5)).timeLabel, '11:15 PM');
});

test('buildMessageStrokePaths re-wraps long lines to stay inside a portrait phone canvas', () => {
  const width = 820;
  const height = 1775;
  const layout = buildMessageStrokePaths("I'd write your name\non every shore", width, height, 3);
  assert.ok(layout.boundingBox.minX >= 0, `Text starts off-canvas at ${layout.boundingBox.minX}`);
  assert.ok(layout.boundingBox.maxX <= width, `Text runs off-canvas at ${layout.boundingBox.maxX}`);
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
