import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Heart,
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
  SimulationPhase,
  generateRandomStick,
  generateRandomWave,
  isCarvableText,
} from './simulation/shorelineEngine';
import { ShorelineCanvas, ShorelineTelemetry } from './components/ShorelineCanvas';
import { PromptModal } from './components/PromptModal';
import { CoastalAudioEngine } from './utils/coastalAudio';
import { BIRTHDAY, CREATOR_SIGNATURE } from './config';
import { buildBirthdayWishes, refreshLiveWish } from './data/wishes';

type DrawerTab = 'wishes' | 'controls' | 'compose';
type UiMode = 'gift' | 'studio';

const UI_MODE_STORAGE_KEY = 'shoreline-ui-mode';
const CARVABLE_HINT = "Only letters, numbers and ! ? , . ' - & : ♥ ★ can be carved into sand.";

const PHASE_CAPTIONS: Record<SimulationPhase, string> = {
  'stick-entering': 'Reaching down to the wet shoreline sand…',
  writing: 'Hand-carving birthday wish into sunlit sand…',
  admiring: 'Resting in the sand before the next ocean swell…',
  'wave-washing': 'A foaming ocean wave washes over the shoreline…',
  'wave-receding': 'The tide recedes, leaving smooth wet sand…',
};

function readInitialUiMode(): UiMode {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('studio')) return 'studio';
    if (params.has('gift')) return 'gift';
    return window.localStorage.getItem(UI_MODE_STORAGE_KEY) === 'studio' ? 'studio' : 'gift';
  } catch {
    return 'gift';
  }
}

function DockButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group flex flex-1 sm:flex-none flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 min-h-11 min-w-11 px-2 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-amber-200/25 text-amber-50 border border-amber-200/40'
          : 'text-amber-50/85 hover:text-white hover:bg-stone-800/70 border border-transparent'
      }`}
    >
      {children}
      <span className="leading-none whitespace-nowrap">{label}</span>
    </button>
  );
}

export function App() {
  const [wishes, setWishes] = useState<BirthdayWish[]>(() => buildBirthdayWishes(BIRTHDAY, new Date()));
  const [uiMode, setUiMode] = useState<UiMode>(readInitialUiMode);
  const isGift = uiMode === 'gift';
  const [hasOpenedGift, setHasOpenedGift] = useState<boolean>(() => readInitialUiMode() === 'studio');

  const [currentWishIndex, setCurrentWishIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => readInitialUiMode() === 'studio');
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

  useEffect(() => {
    document.title = `Happy ${BIRTHDAY.ageOrdinal} Birthday, ${BIRTHDAY.name} ♥`;
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, uiMode);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit
    }
  }, [uiMode]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  const queuedWish = wishes[currentWishIndex] || wishes[0];
  // Live wishes (the since-you-came counter) are refilled each time a carving starts
  const currentWish = useMemo(
    () => refreshLiveWish(queuedWish, BIRTHDAY, new Date()),
    [queuedWish, stickSeedOffset]
  );

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

  const handleOpenGift = () => {
    // The tap is the user gesture browsers require before audio may start
    if (audioEngineRef.current?.getMuted()) {
      setIsAudioMuted(audioEngineRef.current.toggleMute());
    }
    setHasOpenedGift(true);
    setIsPlaying(true);
  };

  const handleSelectWish = (idx: number) => {
    setIsFreehandMode(false);
    setCurrentWishIndex(idx);
    setStickSeedOffset((prev) => prev + 1);
    setIsPlaying(true);
    if (isGift) setIsDrawerOpen(false);
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

  const handleToggleUiMode = () => {
    setUiMode((prev) => (prev === 'gift' ? 'studio' : 'gift'));
    setActiveTab('wishes');
    setEditingWishId(null);
  };

  const handleAddCustomWish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed1 = customLine1.trim();
    const trimmed2 = customLine2.trim();
    if (!trimmed1) {
      setFormError('Please enter at least the first line of your sand message.');
      return;
    }
    const combinedText = trimmed2 ? `${trimmed1}\n${trimmed2}` : trimmed1;
    if (!isCarvableText(combinedText)) {
      setFormError(CARVABLE_HINT);
      return;
    }
    setFormError('');

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
    if (!isCarvableText(cleaned)) {
      setEditError(CARVABLE_HINT);
      return;
    }
    setWishes((prev) =>
      prev.map((w) => (w.id === wishId ? { ...w, text: cleaned, live: false } : w))
    );
    setEditingWishId(null);
    setEditError('');
    setStickSeedOffset((prev) => prev + 1);
  };

  const wishCounter = `${String(currentWishIndex + 1).padStart(2, '0')} / ${String(wishes.length).padStart(2, '0')}`;

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#C5AA7E] select-none">
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
          signature={CREATOR_SIGNATURE}
          onCycleComplete={handleCycleComplete}
          onTelemetryUpdate={handleTelemetryUpdate}
        />
      </main>

      {/* Transparent Top Bar Over Uninterrupted Beach Sand */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-transparent pointer-events-none">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setIsFreehandMode(false);
          }}
          className="pointer-events-auto min-w-0 truncate text-base sm:text-lg font-normal tracking-wide text-stone-900 drop-shadow-[0_1px_2px_rgba(255,248,230,0.75)] font-display"
        >
          {isGift ? `Happy ${BIRTHDAY.ageOrdinal}, ${BIRTHDAY.name}` : 'Shoreline Birthday Wishes'}
        </a>

        {!isGift && (
          <nav
            aria-label="Shoreline Controls"
            className="hidden lg:flex items-center gap-7 text-xs font-medium tracking-wide text-stone-900/90 drop-shadow-[0_1px_1px_rgba(255,248,230,0.7)] pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('wishes');
                setIsDrawerOpen(true);
              }}
              className="hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Wish {wishCounter.replace(' / ', ' of ')}
            </button>
            <button
              type="button"
              onClick={() => setIsFreehandMode((prev) => !prev)}
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
        )}

        <button
          type="button"
          onClick={() => {
            setActiveTab('wishes');
            setIsDrawerOpen((prev) => !prev);
          }}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-50 bg-stone-900/55 hover:bg-stone-900/75 border border-amber-100/20 backdrop-blur-md rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          <Heart className="w-3.5 h-3.5 text-rose-200" fill="currentColor" />
          <span>{isDrawerOpen ? 'Close' : isGift ? `${wishes.length} Wishes` : `Customize ${wishes.length} Wishes`}</span>
        </button>
      </header>

      {/* Refined Warm Driftwood & Frosted Glass Shoreline Dock */}
      <div className="fixed bottom-0 inset-x-0 z-20 flex flex-col items-center px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-amber-100/15 bg-stone-950/60 backdrop-blur-md px-3 sm:px-4 pt-3 pb-2 shadow-xl flex flex-col gap-2">
          {/* Caption: wish counter, love note or carving status */}
          <div className="px-1 min-h-[3.75rem] sm:min-h-[3rem]">
            <div className="flex items-center gap-2 text-[11px] text-amber-100/70 font-mono tabular-nums">
              <span className="text-amber-200/95 shrink-0">{isFreehandMode ? 'Freehand' : wishCounter}</span>
              <span aria-hidden="true" className="text-amber-100/35">·</span>
              <span className="truncate font-sans">
                {isFreehandMode
                  ? 'Your turn to write'
                  : isGift
                    ? currentWish.subtitle
                    : PHASE_CAPTIONS[telemetry.phase]}
              </span>
              {!isGift && !isFreehandMode && (
                <span className="hidden sm:inline ml-auto text-amber-100/55 shrink-0 font-sans">
                  {telemetry.stick.name}
                </span>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={isFreehandMode ? 'freehand' : currentWish.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35 }}
                className="mt-1 text-[15px] sm:text-base leading-snug text-amber-50/95 font-display italic line-clamp-3"
              >
                {isFreehandMode
                  ? 'Drag across the sand to carve with the stick, then call a wave to wash it away.'
                  : currentWish.note ?? currentWish.text.replace('\n', ' ')}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Tactile Coastal Controls */}
          <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-1.5 pt-1.5 border-t border-amber-100/10">
            <DockButton label={isPlaying ? 'Pause' : 'Play'} onClick={() => setIsPlaying((prev) => !prev)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </DockButton>
            <DockButton label="Next" onClick={handleNextWish}>
              <SkipForward className="w-4 h-4" />
            </DockButton>
            <DockButton label="Wave" onClick={handleSummonWaveNow}>
              <Waves className="w-4 h-4 text-sky-200" />
            </DockButton>
            <DockButton
              label={isFreehandMode ? 'Stop' : 'Draw'}
              active={isFreehandMode}
              onClick={() => setIsFreehandMode((prev) => !prev)}
            >
              <PenTool className="w-4 h-4" />
            </DockButton>
            {!isGift && (
              <DockButton label="Stick" onClick={handleRandomizeStick}>
                <RefreshCw className="w-4 h-4 text-amber-200/80" />
              </DockButton>
            )}
            <DockButton label={isAudioMuted ? 'Sound' : 'Mute'} active={!isAudioMuted} onClick={handleToggleAudio}>
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-amber-200" />}
            </DockButton>
          </div>
        </div>
      </div>

      {/* Wishes sheet: bottom sheet on phones, floating side panel on larger screens */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-30 bg-stone-950/30 sm:bg-transparent"
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              aria-label="Wishes Queue and Simulation Controls"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed z-40 inset-x-0 bottom-0 max-h-[78dvh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:top-16 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-2xl sm:pb-5 border border-amber-100/15 bg-stone-950/92 backdrop-blur-xl px-4 sm:px-5 pt-3 sm:pt-5 shadow-2xl flex flex-col gap-4 overflow-hidden"
            >
              <div aria-hidden="true" className="sm:hidden mx-auto h-1 w-10 rounded-full bg-amber-100/25" />
              <div className="flex items-start justify-between gap-3 border-b border-amber-100/10 pb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-normal text-amber-50 font-display">
                    {isGift ? `${wishes.length} wishes for ${BIRTHDAY.name}` : 'Shoreline Wishes & Tide Controls'}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {isGift
                      ? 'Tap any wish to carve it into the sand.'
                      : `Customize the ${wishes.length} sand birthday messages or tune stick & wave behavior.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close wishes"
                  className="p-2 -m-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isGift && (
                <div className="flex items-center gap-1 p-1 bg-stone-900/90 rounded-lg border border-amber-100/10">
                  {(
                    [
                      ['wishes', `Wishes (${wishes.length})`],
                      ['controls', 'Stick & Waves'],
                      ['compose', 'Add Wish'],
                    ] as Array<[DrawerTab, string]>
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === tab
                          ? 'bg-stone-800 text-amber-50 shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Wishes list */}
              {(isGift || activeTab === 'wishes') && (
                <div className="flex-1 overflow-y-auto overscroll-contain pr-1 -mr-1 space-y-2 min-h-0">
                  {wishes.map((wish, idx) => {
                    const isActive = idx === currentWishIndex && !isFreehandMode;
                    const isEditing = !isGift && editingWishId === wish.id;

                    return (
                      <div
                        key={wish.id}
                        className={`p-3 rounded-xl border transition-colors ${
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
                              className="w-full rounded-md border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-base sm:text-xs text-white focus:border-amber-300 focus:outline-none"
                            />
                            {editError && (
                              <p className="text-xs text-rose-400">{editError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditWish(wish.id)}
                                className="px-3 py-1.5 text-xs font-medium text-stone-950 bg-amber-100 hover:bg-white rounded-md whitespace-nowrap shrink-0"
                              >
                                Save &amp; Carve
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWishId(null)}
                                className="px-3 py-1.5 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-md whitespace-nowrap shrink-0"
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
                                <span className="truncate font-sans">{wish.subtitle}</span>
                                {isActive && (
                                  <>
                                    <span aria-hidden="true" className="shrink-0">·</span>
                                    <span className="text-amber-200 shrink-0 font-sans">Carving</span>
                                  </>
                                )}
                              </div>
                              <p className="mt-1 text-[15px] sm:text-sm font-normal text-amber-50 group-hover:text-amber-200 transition-colors font-display whitespace-pre-line">
                                {wish.text}
                              </p>
                              {isGift && wish.note && (
                                <p className="mt-1 text-xs leading-relaxed text-stone-400 font-display italic">
                                  {wish.note}
                                </p>
                              )}
                            </button>

                            {!isGift && (
                              <button
                                type="button"
                                onClick={() => handleStartEditWish(wish)}
                                aria-label={`Edit wish ${idx + 1}`}
                                className="px-2.5 py-1.5 text-[11px] font-medium text-stone-400 hover:text-amber-50 bg-stone-900 hover:bg-stone-800 rounded transition-colors whitespace-nowrap shrink-0"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stick & Wave Physics */}
              {!isGift && activeTab === 'controls' && (
                <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1 min-h-0">
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setClearSandCounter((prev) => prev + 1)}
                      className="flex-1 px-3 py-2.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Smooth Sand Surface
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPromptModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-amber-200 bg-stone-900 hover:bg-stone-800 border border-amber-100/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Architecture Prompt</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add Custom Sand Wish */}
              {!isGift && activeTab === 'compose' && (
                <form onSubmit={handleAddCustomWish} className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-3.5 pr-1 min-h-0">
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
                      className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-base sm:text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
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
                      className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-base sm:text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
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
                      className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-base sm:text-sm text-white placeholder:text-stone-500 focus:border-amber-300 focus:outline-none"
                    />
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-rose-400">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-semibold text-stone-950 bg-amber-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

              {/* Gift / studio switch */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-amber-100/10">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-stone-200">All features</div>
                  <div className="text-[11px] text-stone-500 truncate">
                    Editing, stick &amp; wave tuning, custom wishes
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isGift}
                  aria-label="Show all features"
                  onClick={handleToggleUiMode}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors cursor-pointer ${
                    isGift ? 'bg-stone-800 border-stone-700' : 'bg-amber-200/80 border-amber-100/60'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-amber-50 shadow transition-transform ${
                      isGift ? 'translate-x-0' : 'translate-x-5'
                    }`}
                  />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Surprise opener: the tap also unlocks the ocean audio */}
      <AnimatePresence>
        {isGift && !hasOpenedGift && (
          <motion.button
            key="gift-intro"
            type="button"
            onClick={handleOpenGift}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9 } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-8 text-center bg-gradient-to-b from-stone-950/55 via-stone-950/35 to-stone-950/60 backdrop-blur-[3px] cursor-pointer"
          >
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-xs uppercase tracking-[0.35em] text-amber-100/80"
            >
              A little surprise for
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.9 }}
              className="font-display text-5xl sm:text-7xl text-amber-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] break-words max-w-full"
            >
              {BIRTHDAY.name}
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="font-display italic text-base sm:text-lg text-amber-100/90"
            >
              Happy {BIRTHDAY.ageOrdinal} Birthday ♥
            </motion.span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.55, 1] }}
              transition={{ delay: 1.8, duration: 2.4, repeat: Infinity, repeatType: 'reverse' }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-100/30 bg-stone-950/40 px-5 py-2.5 text-sm text-amber-50"
            >
              <Heart className="w-4 h-4 text-rose-300" fill="currentColor" />
              Tap to open
            </motion.span>
            <span className="text-[11px] text-amber-100/60">Best with sound on</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Optional One-Shot Claude Code Prompt Modal */}
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />
    </div>
  );
}

export default App;
