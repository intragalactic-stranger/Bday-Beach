import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ListMusic,
  Pause,
  PenTool,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import {
  BirthdayWish,
  DEFAULT_BIRTHDAY_WISHES,
  SimulationPhase,
  generateRandomStick,
  generateRandomWave,
} from './simulation/shorelineEngine';
import { ShorelineCanvas, ShorelineTelemetry } from './components/ShorelineCanvas';
import { PromptModal } from './components/PromptModal';
import { CoastalAudioEngine } from './utils/coastalAudio';

type DrawerTab = 'wishes' | 'controls' | 'compose';

const PHASE_CAPTIONS: Record<SimulationPhase, string> = {
  'stick-entering': 'Reaching down to the wet shoreline sand…',
  writing: 'Hand-carving birthday wish into sunlit sand…',
  admiring: 'Resting in the sand before the next ocean swell…',
  'wave-washing': 'A foaming ocean wave washes over the shoreline…',
  'wave-receding': 'The tide recedes, leaving smooth wet sand…',
};

export function App() {
  const [wishes, setWishes] = useState<BirthdayWish[]>(DEFAULT_BIRTHDAY_WISHES);
  const [currentWishIndex, setCurrentWishIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFreehandMode, setIsFreehandMode] = useState<boolean>(false);
  const [writingSpeed, setWritingSpeed] = useState<number>(1.0);
  const [waveIntensity, setWaveIntensity] = useState<number>(1.05);
  const [stickSeedOffset, setStickSeedOffset] = useState<number>(1);
  const [waveTriggerCounter, setWaveTriggerCounter] = useState<number>(0);
  const [clearSandCounter, setClearSandCounter] = useState<number>(0);

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('wishes');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // Custom wish form state
  const [customLine1, setCustomLine1] = useState<string>('');
  const [customLine2, setCustomLine2] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Inline editing state for any wish in the queue
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editError, setEditError] = useState<string>('');

  const audioEngineRef = useRef<CoastalAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new CoastalAudioEngine();
  }

  useEffect(() => {
    return () => {
      audioEngineRef.current?.dispose();
    };
  }, []);

  const currentWish = wishes[currentWishIndex] || wishes[0];

  const [telemetry, setTelemetry] = useState<ShorelineTelemetry>(() => ({
    phase: 'stick-entering',
    phaseProgress: 0,
    erosionFraction: 0,
    stick: generateRandomStick(137),
    wave: generateRandomWave(187, 1.05),
  }));

  useEffect(() => {
    document.body.setAttribute('data-wish-index', String(currentWish.index));
  }, [currentWish.index]);

  const handleCycleComplete = useCallback(() => {
    setCurrentWishIndex((prev) => (prev + 1) % wishes.length);
    setStickSeedOffset((prev) => prev + 1);
  }, [wishes.length]);

  const handleTelemetryUpdate = useCallback((nextTelemetry: ShorelineTelemetry) => {
    setTelemetry(nextTelemetry);
  }, []);

  const handleSelectWish = (idx: number) => {
    setIsFreehandMode(false);
    setCurrentWishIndex(idx);
    setStickSeedOffset((prev) => prev + 1);
    setIsPlaying(true);
  };

  const handleNextWish = () => {
    setIsFreehandMode(false);
    setCurrentWishIndex((prev) => (prev + 1) % wishes.length);
    setStickSeedOffset((prev) => prev + 1);
    setIsPlaying(true);
  };

  const handleSummonWaveNow = () => {
    setIsPlaying(true);
    setWaveTriggerCounter((prev) => prev + 1);
  };

  const handleRandomizeStick = () => {
    setStickSeedOffset((prev) => prev + 1);
  };

  const handleToggleAudio = () => {
    if (!audioEngineRef.current) return;
    const muted = audioEngineRef.current.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleAddCustomWish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed1 = customLine1.trim();
    const trimmed2 = customLine2.trim();
    if (!trimmed1) {
      setFormError('Please enter at least the first line of your sand message.');
      return;
    }
    setFormError('');

    const combinedText = trimmed2 ? `${trimmed1}\n${trimmed2}` : trimmed1;
    const newWish: BirthdayWish = {
      id: `wish-custom-${Date.now()}`,
      index: wishes.length + 1,
      text: combinedText,
      subtitle: customSubtitle.trim() || 'Custom Shoreline Wish',
    };

    const updated = [...wishes, newWish];
    setWishes(updated);
    setCurrentWishIndex(updated.length - 1);
    setIsFreehandMode(false);
    setIsPlaying(true);
    setStickSeedOffset((prev) => prev + 1);
    setCustomLine1('');
    setCustomLine2('');
    setCustomSubtitle('');
    setActiveTab('wishes');
    setIsDrawerOpen(false);
  };

  const handleStartEditWish = (wish: BirthdayWish) => {
    setEditingWishId(wish.id);
    setEditingText(wish.text);
    setEditError('');
  };

  const handleSaveEditWish = (wishId: string) => {
    const cleaned = editingText.trim();
    if (!cleaned) {
      setEditError('Message text cannot be empty.');
      return;
    }
    setWishes((prev) =>
      prev.map((w) => (w.id === wishId ? { ...w, text: cleaned } : w))
    );
    setEditingWishId(null);
    setEditError('');
    setStickSeedOffset((prev) => prev + 1);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#C5AA7E] select-none">
      {/* Full-Viewport Immersive Beach Sand & Foaming Ocean Waves Canvas */}
      <main className="w-full h-full">
        <ShorelineCanvas
          currentWish={currentWish}
          isPlaying={isPlaying}
          isFreehandMode={isFreehandMode}
          writingSpeedMultiplier={writingSpeed}
          waveIntensityMultiplier={waveIntensity}
          stickSeedOffset={stickSeedOffset}
          waveTriggerCounter={waveTriggerCounter}
          clearSandCounter={clearSandCounter}
          audioEngine={audioEngineRef.current}
          onCycleComplete={handleCycleComplete}
          onTelemetryUpdate={handleTelemetryUpdate}
        />
      </main>

      {/* Transparent Top Bar Over Uninterrupted Beach Sand */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-8 px-6 py-4 bg-transparent pointer-events-none">
        {/* Zone 1: Editorial Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setIsFreehandMode(false);
          }}
          className="pointer-events-auto text-lg font-normal tracking-wide text-stone-900 drop-shadow-[0_1px_2px_rgba(255,248,230,0.75)] font-display whitespace-nowrap shrink-0"
        >
          Shoreline Birthday Wishes
        </a>

        {/* Zone 2: Minimal Text Navigation */}
        <nav
          aria-label="Shoreline Controls"
          className="hidden md:flex items-center gap-7 text-xs font-medium tracking-wide text-stone-900/90 drop-shadow-[0_1px_1px_rgba(255,248,230,0.7)] pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('wishes');
              setIsDrawerOpen(true);
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Wish {String(currentWishIndex + 1).padStart(2, '0')} of {String(wishes.length).padStart(2, '0')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFreehandMode((prev) => !prev);
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFreehandMode ? 'Return to Auto-Writing' : 'Carve Freehand'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('compose');
              setIsDrawerOpen(true);
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Write Your Own Wish
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('controls');
              setIsDrawerOpen(true);
            }}
            className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Driftwood &amp; Tide
          </button>
        </nav>

        {/* Zone 3: Understated Glass Action */}
        <div className="pointer-events-auto flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('wishes');
              setIsDrawerOpen((prev) => !prev);
            }}
            className="px-3.5 py-1.5 text-xs font-medium text-amber-50 bg-stone-900/55 hover:bg-stone-900/75 border border-amber-100/20 backdrop-blur-md rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {isDrawerOpen ? 'Close Wishes' : 'Customize 10 Wishes'}
          </button>
        </div>
      </header>

      {/* Refined Warm Driftwood & Frosted Glass Shoreline Dock */}
      <div className="fixed bottom-4 inset-x-0 z-20 flex flex-col items-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-amber-100/15 bg-stone-950/60 backdrop-blur-md px-4 py-2.5 shadow-xl flex flex-col gap-2">
          {/* Top Row: Poetic Caption & Current Stick Name */}
          <div className="flex items-center justify-between gap-4 text-xs text-amber-50/90 px-1">
            <div className="flex items-center gap-2 truncate">
              <span className="font-display italic text-amber-200/95 shrink-0">
                {isFreehandMode
                  ? 'Freehand Stick Carving'
                  : `${currentWish.subtitle} (${currentWishIndex + 1}/${wishes.length})`}
              </span>
              <span aria-hidden="true" className="text-amber-100/35">·</span>
              <span className="text-stone-200/90 truncate">
                {isFreehandMode
                  ? 'Drag across the sand to carve with your stick, then summon a wave'
                  : PHASE_CAPTIONS[telemetry.phase]}
              </span>
            </div>

            <span className="hidden sm:inline text-[11px] text-amber-100/65 shrink-0 font-normal">
              {telemetry.stick.name}
            </span>
          </div>

          {/* Bottom Row: Tactile Coastal Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-100/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-950 bg-amber-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                type="button"
                onClick={handleSummonWaveNow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-50 bg-stone-800/75 hover:bg-stone-800 border border-amber-100/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Waves className="w-3.5 h-3.5 text-sky-200" />
                <span>Summon Wave Wash</span>
              </button>

              <button
                type="button"
                onClick={handleRandomizeStick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-50/90 bg-stone-800/65 hover:bg-stone-800 border border-amber-100/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-200/80" />
                <span>New Random Stick</span>
              </button>

              <button
                type="button"
                onClick={handleNextWish}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-50/90 bg-stone-800/65 hover:bg-stone-800 border border-amber-100/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-100/80" />
                <span>Next Wish</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFreehandMode((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isFreehandMode
                    ? 'bg-amber-300/25 text-amber-100 border border-amber-200/40'
                    : 'bg-stone-800/65 text-amber-50/85 hover:text-white border border-amber-100/10'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isFreehandMode ? 'Exit Freehand' : 'Draw With Stick'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleAudio}
                aria-label={isAudioMuted ? 'Unmute ocean surf audio' : 'Mute ocean surf audio'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-50/90 bg-stone-800/65 hover:bg-stone-800 border border-amber-100/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAudioMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>{isAudioMuted ? 'Surf Sound Off' : 'Surf Sound On'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDrawerOpen((prev) => !prev)}
                aria-label="Open wishes and settings drawer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-100 bg-stone-800/65 hover:bg-stone-800 border border-amber-100/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>All 10 Wishes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Slide-Over Drawer for Customizing the 10 Birthday Wishes & Wave Physics */}
      {isDrawerOpen && (
        <aside
          aria-label="Wishes Queue and Simulation Controls"
          className="fixed top-16 right-4 bottom-24 z-30 w-full max-w-md rounded-2xl border border-amber-100/15 bg-stone-950/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col gap-4 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-amber-100/10 pb-3">
            <div>
              <h2 className="text-base font-normal text-amber-50 font-display">
                Shoreline Wishes &amp; Tide Controls
              </h2>
              <p className="text-xs text-stone-400">
                Customize the 10 sand birthday messages or tune stick &amp; wave behavior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close wishes drawer"
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab Bar */}
          <div className="flex items-center gap-1 p-1 bg-stone-900/90 rounded-lg border border-amber-100/10">
            <button
              type="button"
              onClick={() => setActiveTab('wishes')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'wishes'
                  ? 'bg-stone-800 text-amber-50 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              10 Wishes ({wishes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('controls')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'controls'
                  ? 'bg-stone-800 text-amber-50 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Stick &amp; Waves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-stone-800 text-amber-50 shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Add Wish
            </button>
          </div>

          {/* Tab 1: 10 Sequential Birthday Wishes */}
          {activeTab === 'wishes' && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
              {wishes.map((wish, idx) => {
                const isActive = idx === currentWishIndex && !isFreehandMode;
                const isEditing = editingWishId === wish.id;

                return (
                  <div
                    key={wish.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isActive
                        ? 'bg-stone-800/90 border-amber-300/50'
                        : 'bg-stone-900/60 border-amber-100/10 hover:border-amber-100/25'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <label
                          htmlFor={`edit-wish-${wish.id}`}
                          className="block text-xs font-medium text-stone-300"
                        >
                          Edit Wish {String(idx + 1).padStart(2, '0')}
                        </label>
                        <textarea
                          id={`edit-wish-${wish.id}`}
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full rounded-md border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-300 focus:outline-none"
                        />
                        {editError && (
                          <p className="text-xs text-rose-400">{editError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEditWish(wish.id)}
                            className="px-3 py-1 text-xs font-medium text-stone-950 bg-amber-100 hover:bg-white rounded-md whitespace-nowrap shrink-0"
                          >
                            Save &amp; Carve
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingWishId(null)}
                            className="px-3 py-1 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-md whitespace-nowrap shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectWish(idx)}
                          className="text-left flex-1 min-w-0 group cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono tabular-nums whitespace-nowrap overflow-hidden">
                            <span className={isActive ? 'text-amber-300 font-semibold shrink-0' : 'shrink-0'}>
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <span className="truncate">{wish.subtitle}</span>
                            {isActive && (
                              <>
                                <span aria-hidden="true" className="shrink-0">·</span>
                                <span className="text-amber-200 shrink-0">Carving</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-normal text-amber-50 group-hover:text-amber-200 transition-colors font-display whitespace-pre-line">
                            {wish.text}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditWish(wish)}
                          aria-label={`Edit wish ${idx + 1}`}
                          className="px-2 py-1 text-[11px] font-medium text-stone-400 hover:text-amber-50 bg-stone-900 hover:bg-stone-800 rounded transition-colors whitespace-nowrap shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Stick & Wave Physics */}
          {activeTab === 'controls' && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-4 p-3.5 rounded-lg border border-amber-100/10 bg-stone-900/60">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="writing-speed-slider" className="font-medium text-stone-200">
                      Human Hand-Carving Pace
                    </label>
                    <span className="font-mono tabular-nums text-amber-200">
                      {writingSpeed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    id="writing-speed-slider"
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={writingSpeed}
                    onChange={(e) => setWritingSpeed(parseFloat(e.target.value))}
                    className="w-full accent-amber-200 cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-amber-100/10">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label htmlFor="wave-intensity-slider" className="font-medium text-stone-200">
                      Wave Surge &amp; Seafoam Reach
                    </label>
                    <span className="font-mono tabular-nums text-amber-200">
                      {Math.round(waveIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    id="wave-intensity-slider"
                    type="range"
                    min="0.7"
                    max="1.35"
                    step="0.05"
                    value={waveIntensity}
                    onChange={(e) => setWaveIntensity(parseFloat(e.target.value))}
                    className="w-full accent-amber-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-amber-100/10 bg-stone-900/60 space-y-3">
                <div>
                  <div className="text-xs text-stone-400">Active Driftwood Stick</div>
                  <div className="text-sm font-normal text-amber-200 mt-0.5 font-display">
                    {telemetry.stick.name}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {telemetry.stick.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-100/10">
                  <div className="text-xs text-stone-400">Active Ocean Swell Pattern</div>
                  <div className="text-sm font-normal text-sky-200 mt-0.5 font-display">
                    {telemetry.wave.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClearSandCounter((prev) => prev + 1)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
                >
                  Smooth Sand Surface
                </button>
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-200 bg-stone-900 hover:bg-stone-800 border border-amber-100/15 rounded-lg transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Architecture Prompt</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Add Custom Sand Wish */}
          {activeTab === 'compose' && (
            <form onSubmit={handleAddCustomWish} className="flex-1 overflow-y-auto flex flex-col gap-3.5 pr-1">
              <div>
                <label
                  htmlFor="wish-line-1"
                  className="block text-xs font-medium text-stone-200 mb-1"
                >
                  First Sand Line (Required)
                </label>
                <input
                  id="wish-line-1"
                  type="text"
                  maxLength={28}
                  placeholder="e.g. Happy Birthday Maya! ♥"
                  value={customLine1}
                  onChange={(e) => setCustomLine1(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wish-line-2"
                  className="block text-xs font-medium text-stone-200 mb-1"
                >
                  Second Sand Line (Optional)
                </label>
                <input
                  id="wish-line-2"
                  type="text"
                  maxLength={28}
                  placeholder="e.g. Shine bright always ★"
                  value={customLine2}
                  onChange={(e) => setCustomLine2(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wish-subtitle"
                  className="block text-xs font-medium text-stone-200 mb-1"
                >
                  Occasion Label
                </label>
                <input
                  id="wish-subtitle"
                  type="text"
                  maxLength={32}
                  placeholder="e.g. Personal Birthday Blessing"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-400">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Carve Wish into Sand Now</span>
              </button>

              <div className="p-3 rounded-lg border border-amber-100/10 bg-stone-900/60 text-xs text-stone-400 space-y-1">
                <div className="font-medium text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Hand-Carved Symbols</span>
                </div>
                <p>
                  Use <code className="text-amber-200">♥</code> for hearts or{' '}
                  <code className="text-amber-200">★</code> for stars.
                </p>
              </div>
            </form>
          )}
        </aside>
      )}

      {/* Optional One-Shot Claude Code Prompt Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />
    </div>
  );
}

export default App;
