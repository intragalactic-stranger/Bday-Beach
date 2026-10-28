export const ONE_SHOT_CLAUDE_CODE_PROMPT = `You are a Principal Creative Technologist and Graphics Engineer. Build a complete, production-grade interactive web application: **"Shoreline Wishes — Authentic Beach Sand Writing & Foaming Ocean Wave Simulation"**.

## 1. Core Experience & Visual Concept
We are looking closely down at a sunlit coastal shoreline right where gentle turquoise ocean waves meet golden-beige beach sand.
The application cycles endlessly through **10 distinct Birthday Wishes & Coastal Blessings** (with full user customization + interactive freehand stick carving):
1. **Stick Entry (\`stick-entering\`)**: A newly randomized natural wooden stick (selected from 5 procedural archetypes: *Sun-Bleached Driftwood*, *Knotted Coastal Oak Twig*, *Golden Sea Bamboo Reed*, *Weathered Maritime Pine*, or *Twisted Mangrove Root*) enters the viewport at a natural hand angle, casting a soft directional sun shadow onto the sand.
2. **Hand-Carved Sand Writing (\`writing\`)**: The tip of the stick physically traces each letter of the current birthday wish stroke-by-stroke into the sand:
   - Carves a 3D-shaded trench with a dark damp inner trough (\`#5A4128\`), a sunlit displaced sand ridge lip (\`#F5E4C3\`), and granular sand particles kicked up dynamically along the velocity vector of the stick tip.
   - Between strokes and letters, the stick subtly lifts off the sand before pressing back down.
3. **Golden Hour Pause (\`admiring\`)**: The stick withdraws smoothly while the freshly carved birthday message rests in the warm sand below the gently lapping top tide line.
4. **Authentic Foaming Wave Wash (\`wave-washing\`)**: A randomized ocean wave surges down from the top shoreline across the beach:
   - Multi-harmonic Gerstner/sine crest geometry with randomized reach, coastal tilt angle, and secondary wavelets so no two waves ever look identical.
   - Multi-layered translucent ocean water shading (deep emerald-teal \`#0B5560\` to shallow turquoise swash \`#2A9D90\`) with animated underwater caustic shimmer.
   - **Rich Cellular Seafoam & Froth**: Thick creamy leading-edge foam lip (\`#F8FCFD\`), trailing lacy webbed foam ribbons, porous Voronoi-like foam cells, and fizzing micro-bubbles.
   - **Progressive Groove Erosion**: As the foaming water edge crosses each carved stroke point, the raised sand ridges dissolve and the dark trench fills in smoothly underneath the swirling water—never a harsh instant cut.
5. **Wet Sand Glisten & Recede (\`wave-receding\`)**: The wave pulls back toward the top shoreline, leaving darkened, glistening wet sand (\`wetness\` map) and popping residual foam bubbles that gradually evaporate back to warm dry golden sand before the next random stick pops up for the next wish.

---

## 2. Technical Architecture & File Structure
Use **React 19 + TypeScript + Tailwind CSS + HTML5 2D Canvas** with decoupled pure simulation math and zero external image/audio dependencies:
- \`src/simulation/shorelineEngine.ts\`:
  - Pure deterministic PRNG (\`createSeededRandom\`), \`DEFAULT_BIRTHDAY_WISHES\` (10 curated multi-line birthday wishes), \`generateRandomStick()\`, \`generateRandomWave()\`, \`evaluateWaveEdgeY()\`, \`buildMessageStrokePaths()\` (Catmull-Rom spline vector handwriting engine for A-Z, a-z, 0-9, punctuation, \`♥\`, \`★\`), \`evaluateWritingState()\`, \`applyWaveErosionToLayout()\`, and \`advancePhaseTimer()\`.
- \`src/simulation/shorelineEngine.test.ts\`:
  - Unit tests using \`node:test\` and \`node:assert/strict\` verifying all 10 wishes, stick archetype diversity, wave surge/recede bounds, stroke path generation, and wave erosion math.
- \`src/components/ShorelineCanvas.tsx\`:
  - High-DPI HTML5 Canvas renderer pre-baking a high-density procedural silica sand grain & micro-seashell offscreen buffer.
  - Renders dynamic wet-sand darkening, 3D bevel-shaded sand grooves, ejected sand grain particles, multi-layered translucent waves with cellular froth & bubbles, and detailed procedural wood grain/knots on the carving stick.
  - Supports **Freehand Stick Carving Mode** via pointer events (\`onPointerDown\`, \`onPointerMove\`, \`onPointerUp\`) so users can grab the stick and write or draw directly in the sand.
- \`src/utils/coastalAudio.ts\`:
  - Pure Web Audio API procedural soundscape generator synthesizing pink/brown noise ocean surf (modulated in real time by wave surge/recede progress) and crisp sand-scratching grit when the stick carves.
- \`src/App.tsx\`:
  - Clean 3-zone header bar, split Two-Zone Sandbox layout (or Fullscreen Immersive toggle), interactive playback deck (Play/Pause, Summon Wave Now, Next Wish, Randomize Stick, Freehand Carve Mode, Writing Speed & Wave Intensity sliders), and editable 10-Wish Birthday Queue.

---

## 3. Visual Polish & Verification Checklist
- Typography: Pair \`Fraunces\` (display serif) with \`Plus Jakarta Sans\` (UI body) and \`JetBrains Mono\` (tabular metrics/timers).
- Expose simulation state on \`<body data-phase="..." data-wish-index="...">\` for automated browser testing.
- Ensure 60fps compositor performance with zero memory leaks by mounting the canvas animation loop once and storing mutable simulation state in \`useRef\`.`;
