import { Cloud, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, List, Maximize2, Minimize2, Waves, Wind } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type * as THREE from 'three';

const dreamWords = ['Relax', 'Breathe', 'Peace', 'Unwind', 'Stillness', 'Drift'];

const THEME_CATEGORIES = [
  {
    name: 'Sunset/Twilight',
    themes: [
      {
        name: 'Peach Dust',
        colors: ['#fdf2f8', '#fed7aa', '#fdf2f8'],
        cloudTint: '#fecaca',
      },
      {
        name: 'Lilac Blush',
        colors: ['#e0f2fe', '#fbcfe8', '#fff7ed'],
        cloudTint: '#f5d0fe',
      },
      {
        name: 'Mint Apricot',
        colors: ['#fafaf9', '#ffedd5', '#ecfdf5'],
        cloudTint: '#dbeafe',
      },
    ],
  },
  {
    name: 'Dreamy Pastels',
    themes: [
      {
        name: 'Cotton Candy',
        colors: ['#dbeafe', '#fce7f3', '#fef9c3'],
        cloudTint: '#e0f2fe',
      },
      {
        name: 'Seafoam Aqua',
        colors: ['#f0fdf4', '#fce7f3', '#ecfeff'],
        cloudTint: '#ccfbf1',
      },
      {
        name: 'Rose Butter',
        colors: ['#f5f3ff', '#fef3c7', '#fdf2f8'],
        cloudTint: '#fafaf9',
      },
    ],
  },
  {
    name: 'Cool & Calming',
    themes: [
      {
        name: 'Silver Sage',
        colors: ['#f0f9ff', '#f1f5f9', '#fdf2f8'],
        cloudTint: '#cbd5e1',
      },
      {
        name: 'Turquoise Coral',
        colors: ['#f0fdff', '#f5f3ff', '#fff1f2'],
        cloudTint: '#ccfbf1',
      },
      {
        name: 'Soft Taupe',
        colors: ['#eff6ff', '#f5f5f4', '#fff1f2'],
        cloudTint: '#f1f5f9',
      },
    ],
  },
  {
    name: 'Warm & Gentle',
    themes: [
      {
        name: 'Gold Peachy',
        colors: ['#fff7ed', '#fafaf9', '#fdf2f8'],
        cloudTint: '#fef3c7',
      },
      {
        name: 'Terra Coral',
        colors: ['#fff1f2', '#fef2f2', '#fff7ed'],
        cloudTint: '#ffedd5',
      },
      {
        name: 'Champagne Nude',
        colors: ['#fff7ed', '#f5f5f4', '#fdf2f8'],
        cloudTint: '#fafaf9',
      },
    ],
  },
  {
    name: 'Nature-Inspired',
    themes: [
      {
        name: 'Sage White',
        colors: ['#f0fdf4', '#fdf2f8', '#f5f5f4'],
        cloudTint: '#dcfce7',
      },
      {
        name: 'Eucalyptus',
        colors: ['#effdf5', '#fdf2f8', '#f8fafc'],
        cloudTint: '#ecfdf5',
      },
      {
        name: 'Teal Moss',
        colors: ['#f0fdfa', '#fdf2f8', '#fefce8'],
        cloudTint: '#f1f5f9',
      },
    ],
  },
  {
    name: 'Ethereal/Cloudy',
    themes: [
      {
        name: 'Pearl Fog',
        colors: ['#fafafa', '#fdf2f8', '#f0f9ff'],
        cloudTint: '#ffffff',
      },
      {
        name: 'Quartz Fog',
        colors: ['#f8fafc', '#fdf2f8', '#f5f3ff'],
        cloudTint: '#f5f3ff',
      },
      {
        name: 'Milky Lilac',
        colors: ['#ffffff', '#f5f3ff', '#fff7ed'],
        cloudTint: '#ffffff',
      },
    ],
  },
];

const ALL_THEMES = THEME_CATEGORIES.flatMap((c) => c.themes);

type DreamTrack = { label: string; artist: string; src: string };
const musicModules = import.meta.glob('./assets/music/*.{mp3,wav,ogg,m4a,aac,flac}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const dreamTracks: DreamTrack[] = Object.entries(musicModules)
  .map(([path, src]) => {
    const filename = path.split('/').pop() ?? 'Unknown Track';
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const [artistPart, ...titleParts] = baseName.split(' - ');
    const hasArtist = titleParts.length > 0;
    return {
      label: hasArtist ? titleParts.join(' - ') : baseName,
      artist: hasArtist ? artistPart : 'Ambient',
      src,
    };
  })
  .sort((a, b) => `${a.artist} ${a.label}`.localeCompare(`${b.artist} ${b.label}`));

type DriftingCloudProps = {
  startX: number;
  startY: number;
  startZ: number;
  speed: number;
  scale: number;
  tint: string;
  phase: number;
};

function DriftingCloud({ startX, startY, startZ, speed, scale, tint, phase }: DriftingCloudProps) {
  const cloudRef = useRef<THREE.Group>(null);
  const baseOpacity = Math.min(0.58, 0.4 + scale * 0.08);

  useFrame((state) => {
    if (!cloudRef.current) return;

    const elapsed = state.clock.elapsedTime;
    // Drift from right to left across a 60-unit range (-30 to 30)
    const range = 60;
    const offset = (elapsed * speed + phase * range) % range;
    const xPos = -30 + offset;
    cloudRef.current.position.x = xPos;

    // Gentle vertical float
    const floatY = Math.sin(elapsed * 0.15 + phase) * 0.4;
    cloudRef.current.position.y = startY + floatY;

    // Fade in/out at edges — apply directly to materials (no React re-render)
    const fadeInEnd = -20;
    const fadeOutStart = 20;
    let targetOpacity = baseOpacity;

    if (xPos < fadeInEnd) {
      targetOpacity *= Math.max(0, (xPos + 30) / (fadeInEnd + 30));
    } else if (xPos > fadeOutStart) {
      targetOpacity *= Math.max(0, 1 - (xPos - fadeOutStart) / (30 - fadeOutStart));
    }

    // Traverse cloud children and set material opacity directly
    cloudRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mat = mesh.material as THREE.Material;
        mat.opacity = targetOpacity;
      }
    });
  });

  return (
    <group ref={cloudRef} position={[startX, startY, startZ]}>
      <Cloud
        opacity={baseOpacity}
        speed={0}
        bounds={[8.4 * scale, 1.5, 2]}
        segments={28}
        color={tint}
      />
    </group>
  );
}

function DriftingClouds({ cloudTint }: { cloudTint: string }) {
  const cloudField = useMemo(
    () => [
      {
        startX: -14,
        startY: 4.5,
        startZ: -17,
        speed: 0.68,
        scale: 1.85,
        tint: cloudTint,
        phase: 0.1,
      },
      {
        startX: -8,
        startY: -2,
        startZ: -13,
        speed: 0.62,
        scale: 1.55,
        tint: cloudTint,
        phase: 1.3,
      },
      {
        startX: 2,
        startY: 2.2,
        startZ: -19,
        speed: 0.56,
        scale: 2.2,
        tint: cloudTint,
        phase: 2.1,
      },
      {
        startX: 8,
        startY: -4.8,
        startZ: -15,
        speed: 0.66,
        scale: 1.72,
        tint: cloudTint,
        phase: 2.9,
      },
      {
        startX: -2,
        startY: 6.8,
        startZ: -21,
        speed: 0.5,
        scale: 2.45,
        tint: cloudTint,
        phase: 3.6,
      },
      {
        startX: -18,
        startY: -5.5,
        startZ: -16,
        speed: 0.58,
        scale: 1.65,
        tint: cloudTint,
        phase: 4.2,
      },
      {
        startX: 12,
        startY: 5.2,
        startZ: -18,
        speed: 0.64,
        scale: 1.95,
        tint: cloudTint,
        phase: 5.1,
      },
      {
        startX: -5,
        startY: 0.8,
        startZ: -14,
        speed: 0.52,
        scale: 1.4,
        tint: cloudTint,
        phase: 6.3,
      },
      {
        startX: 5,
        startY: -6.5,
        startZ: -20,
        speed: 0.6,
        scale: 2.1,
        tint: cloudTint,
        phase: 7.0,
      },
    ],
    [cloudTint]
  );

  return (
    <>
      {cloudField.map((cloud) => (
        <DriftingCloud key={`${cloud.startX}-${cloud.startY}-${cloud.startZ}`} {...cloud} />
      ))}
    </>
  );
}

import ambientRainSrc from './assets/music/ambient-rain.mp3';
import ambientWavesSrc from './assets/music/ambient-waves.mp3';
import ambientWindSrc from './assets/music/ambient-wind.mp3';

const AMBIENT_LAYERS = [
  {
    id: 'rain',
    label: 'Rain',
    icon: CloudRain,
    src: ambientRainSrc,
  },
  {
    id: 'wind',
    label: 'Wind',
    icon: Wind,
    src: ambientWindSrc,
  },
  {
    id: 'waves',
    label: 'Waves',
    icon: Waves,
    src: ambientWavesSrc,
  },
];

type PlayerMode = 'minimized' | 'normal' | 'maximized';

export default function DreamTransmission() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ambientRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBoostReadyRef = useRef(false);
  const shouldResumeOnTrackChangeRef = useRef(false);
  const cometIdRef = useRef(0);
  const cometCleanupTimersRef = useRef<number[]>([]);
  const [boostActive, setBoostActive] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [themeIndex, setThemeIndex] = useState(1); // Default to Lilac Blush
  const [playerMode, setPlayerMode] = useState<PlayerMode>('normal');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [comets, setComets] = useState<
    Array<{
      id: number;
      top: number;
      left: number;
      width: number;
      duration: number;
    }>
  >([]);
  const [ambientLayers, setAmbientLayers] = useState<
    Record<string, { active: boolean; volume: number }>
  >({
    rain: { active: false, volume: 0.5 },
    wind: { active: false, volume: 0.5 },
    waves: { active: false, volume: 0.5 },
  });

  const ensureAudioBoost = useMemo(() => {
    return () => {
      if (audioBoostReadyRef.current || typeof window === 'undefined') return;
      const audio = audioRef.current;
      if (!audio || !window.AudioContext) return;

      const context = new window.AudioContext();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();

      gain.gain.value = 2.2;
      source.connect(gain);
      gain.connect(context.destination);

      audioContextRef.current = context;
      audioBoostReadyRef.current = true;
    };
  }, []);

  async function handleAudioPlay() {
    ensureAudioBoost();
    setBoostActive(true);
    const context = audioContextRef.current;
    if (context && context.state === 'suspended') {
      await context.resume();
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    audio.muted = false;
  }, []);

  useEffect(() => {
    const timers = cometCleanupTimersRef.current;
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      timers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % dreamWords.length);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    for (const layer of AMBIENT_LAYERS) {
      const audio = ambientRefs.current[layer.id];
      if (audio) {
        audio.volume = ambientLayers[layer.id].volume;
        if (ambientLayers[layer.id].active) {
          void audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
    }
  }, [ambientLayers]);

  useEffect(() => {
    const spawnComet = () => {
      const id = ++cometIdRef.current;
      const comet = {
        id,
        top: 8 + Math.random() * 44,
        left: 72 + Math.random() * 24,
        width: 90 + Math.random() * 120,
        duration: 1200 + Math.random() * 1600,
      };
      setComets((prev) => [...prev, comet]);

      const cleanupId = window.setTimeout(() => {
        setComets((prev) => prev.filter((item) => item.id !== id));
      }, comet.duration + 260);
      cometCleanupTimersRef.current.push(cleanupId);
    };

    const initialSpawnDelay = window.setTimeout(spawnComet, Math.random() * 60000);
    const recurringSpawn = window.setInterval(spawnComet, 60000);

    return () => {
      window.clearTimeout(initialSpawnDelay);
      window.clearInterval(recurringSpawn);
    };
  }, []);

  function selectTrack(nextTrackIndex: number) {
    if (dreamTracks.length === 0) return;
    const audio = audioRef.current;
    shouldResumeOnTrackChangeRef.current = Boolean(audio && !audio.paused);
    setTrackIndex(nextTrackIndex);
  }

  function goToPreviousTrack() {
    if (dreamTracks.length === 0) return;
    selectTrack((trackIndex - 1 + dreamTracks.length) % dreamTracks.length);
  }

  function goToNextTrack() {
    if (dreamTracks.length === 0) return;
    selectTrack((trackIndex + 1) % dreamTracks.length);
  }

  useEffect(() => {
    const audio = audioRef.current;
    const activeTrack = dreamTracks[trackIndex];
    if (!audio || !activeTrack) return;
    audio.load();
    audio.currentTime = 0;

    if (shouldResumeOnTrackChangeRef.current) {
      ensureAudioBoost();
      const context = audioContextRef.current;
      const resumePromise =
        context && context.state === 'suspended' ? context.resume() : Promise.resolve();

      void resumePromise.then(() => {
        void audio.play().catch(() => {
          // Ignore autoplay promise rejections.
        });
      });
    }
    shouldResumeOnTrackChangeRef.current = false;
  }, [trackIndex, ensureAudioBoost]);

  const currentTheme = ALL_THEMES[themeIndex];

  return (
    <div
      className='w-full h-screen relative overflow-hidden transition-all duration-1000'
      style={{
        background: `linear-gradient(to bottom, ${currentTheme.colors[0]}, ${currentTheme.colors[1]}, ${currentTheme.colors[2]})`,
      }}
    >
      {/* Top-Left Wake Up Button */}
      <div className='absolute top-6 left-6 z-30'>
        <Link
          to='/'
          className='bg-white/25 backdrop-blur-xl border border-white/20 px-5 py-2.5 rounded-full text-slate-700/80 uppercase tracking-widest text-[10px] hover:bg-white/45 transition-all shadow-lg hover:scale-105 duration-300'
        >
          Wake Up
        </Link>
      </div>

      {/* Theme Picker Widget (Bottom-Left) */}
      <div className='absolute left-4 bottom-4 z-30 sm:left-6 sm:bottom-6'>
        <AnimatePresence>
          {showThemePicker && (
            <>
              {/* Click-outside overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowThemePicker(false)}
                className='fixed inset-0 z-10'
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className='relative z-20 mb-4 w-[min(90vw,32rem)] max-h-[70vh] overflow-y-auto rounded-3xl border border-white/45 bg-white/35 p-5 shadow-2xl backdrop-blur-2xl custom-scrollbar'
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xs font-bold uppercase tracking-widest text-slate-700/60'>
                    Atmosphere
                  </h3>
                  <button
                    type='button'
                    onClick={() => setShowThemePicker(false)}
                    className='text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-800'
                  >
                    Close
                  </button>
                </div>

                <div className='space-y-6'>
                  {THEME_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <h4 className='text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3 ml-1'>
                        {cat.name}
                      </h4>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                        {cat.themes.map((theme) => {
                          const globalIndex = ALL_THEMES.findIndex((t) => t.name === theme.name);
                          const isSelected = themeIndex === globalIndex;
                          return (
                            <button
                              key={theme.name}
                              type='button'
                              onClick={() => {
                                setThemeIndex(globalIndex);
                                setShowThemePicker(false); // Auto-close on selection
                              }}
                              className={`group relative p-3 rounded-2xl transition-all border ${
                                isSelected
                                  ? 'bg-white/60 border-white/60 shadow-md scale-105'
                                  : 'bg-white/5 border-transparent hover:bg-white/20'
                              }`}
                            >
                              <div className='flex gap-1 mb-2'>
                                {theme.colors.map((c, i) => (
                                  <div
                                    key={`${theme.name}-${c}-${i}`}
                                    className='w-3 h-3 rounded-full shadow-sm'
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <p
                                className={`text-[10px] font-medium truncate ${
                                  isSelected ? 'text-slate-900' : 'text-slate-600'
                                }`}
                              >
                                {theme.name}
                              </p>
                              {isSelected && (
                                <div className='absolute top-2 right-2 w-1.5 h-1.5 bg-slate-400 rounded-full' />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <button
          type='button'
          onClick={() => setShowThemePicker(!showThemePicker)}
          className='flex items-center gap-2 bg-white/30 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-xl hover:bg-white/50 transition-all hover:scale-105 group'
          title='Change Atmosphere'
        >
          <div className='flex -space-x-1.5'>
            {currentTheme.colors.map((c, i) => (
              <div
                key={`trigger-${currentTheme.name}-${c}-${i}`}
                className='w-4 h-4 rounded-full border border-white/40 shadow-sm'
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className='text-[10px] font-bold uppercase tracking-widest text-slate-700/60 ml-1 group-hover:text-slate-800 transition-colors'>
            {currentTheme.name}
          </span>
        </button>
      </div>
      <motion.div
        drag={playerMode === 'normal'}
        dragMomentum={false}
        animate={{
          width:
            playerMode === 'minimized' ? '14rem' : playerMode === 'maximized' ? '28rem' : '24rem',
          height:
            playerMode === 'minimized' ? 'auto' : playerMode === 'maximized' ? '30rem' : 'auto',
        }}
        className='absolute right-4 bottom-4 z-30 overflow-hidden rounded-2xl border border-white/45 bg-white/35 p-3 text-slate-700 shadow-2xl backdrop-blur-xl sm:right-6 sm:bottom-6'
        style={{
          resize: playerMode === 'normal' ? 'both' : 'none',
          minWidth: playerMode === 'minimized' ? 'auto' : '16rem',
          minHeight: playerMode === 'minimized' ? 'auto' : '8rem',
        }}
      >
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <p className='text-[10px] uppercase tracking-[0.25em] text-slate-600/80'>
              {playerMode === 'minimized' ? 'Dream' : 'Ambient Audio'}
            </p>
          </div>
          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              onClick={() => setPlayerMode(playerMode === 'minimized' ? 'normal' : 'minimized')}
              className='p-1 rounded-full hover:bg-white/20 transition-colors'
              title={playerMode === 'minimized' ? 'Restore' : 'Minimize'}
            >
              {playerMode === 'minimized' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button
              type='button'
              onClick={() => setPlayerMode(playerMode === 'maximized' ? 'normal' : 'maximized')}
              className='p-1 rounded-full hover:bg-white/20 transition-colors'
              title={playerMode === 'maximized' ? 'Standard View' : 'Playlist'}
            >
              <List size={12} />
            </button>
            {playerMode !== 'minimized' && (
              <span className='text-[10px] uppercase tracking-[0.16em] text-slate-700/80 ml-1'>
                {dreamTracks.length > 0 ? `${trackIndex + 1}/${dreamTracks.length}` : '0/0'}
              </span>
            )}
          </div>
        </div>

        {playerMode === 'minimized' ? (
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] font-medium truncate flex-1'>
              {dreamTracks[trackIndex]?.label || 'Nothing playing'}
            </p>
            <div className='flex gap-1'>
              <button
                type='button'
                onClick={goToPreviousTrack}
                className='text-slate-600 hover:text-slate-900'
                title='Prev'
              >
                <span className='text-[10px]'>◀</span>
              </button>
              <button
                type='button'
                onClick={goToNextTrack}
                className='text-slate-600 hover:text-slate-900'
                title='Next'
              >
                <span className='text-[10px]'>▶</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {dreamTracks.length > 0 ? (
              <div className='mb-3'>
                <p className='text-sm font-semibold truncate leading-tight'>
                  {dreamTracks[trackIndex].label}
                </p>
                <p className='text-[11px] text-slate-700/75 truncate leading-tight'>
                  {dreamTracks[trackIndex].artist}
                </p>
              </div>
            ) : (
              <p className='mb-3 text-xs text-slate-700/80'>No songs found</p>
            )}

            {playerMode === 'maximized' && (
              <div className='flex-1 overflow-y-auto mb-4 max-h-64 pr-1 custom-scrollbar'>
                <div className='space-y-1'>
                  {dreamTracks.map((track, i) => (
                    <button
                      type='button'
                      key={track.src}
                      onClick={() => selectTrack(i)}
                      className={`w-full text-left p-2 rounded-lg text-[11px] transition-all ${
                        trackIndex === i
                          ? 'bg-white/50 shadow-sm border border-white/40'
                          : 'hover:bg-white/20'
                      }`}
                    >
                      <p className='font-medium truncate'>{track.label}</p>
                      <p className='opacity-60 truncate'>{track.artist}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={goToPreviousTrack}
                disabled={dreamTracks.length === 0}
                className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65'
                title='Previous Track'
              >
                Prev
              </button>
              <button
                type='button'
                onClick={goToNextTrack}
                disabled={dreamTracks.length === 0}
                className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65'
                title='Next Track'
              >
                Next
              </button>

              <div className='flex items-center gap-1 ml-auto'>
                {AMBIENT_LAYERS.map((layer) => {
                  const Icon = layer.icon;
                  const isActive = ambientLayers[layer.id].active;
                  return (
                    <div
                      key={layer.id}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded-full border transition-all shrink-0 ${
                        isActive
                          ? 'bg-white/45 border-white/60 shadow-sm'
                          : 'bg-white/5 border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <button
                        type='button'
                        onClick={() =>
                          setAmbientLayers((prev) => ({
                            ...prev,
                            [layer.id]: {
                              ...prev[layer.id],
                              active: !isActive,
                            },
                          }))
                        }
                        className={`p-1 rounded-full transition-colors ${
                          isActive ? 'text-slate-800' : 'text-slate-600'
                        }`}
                        title={`Toggle ${layer.label}`}
                      >
                        <Icon size={12} />
                      </button>
                      {isActive && (
                        <input
                          type='range'
                          min='0'
                          max='1'
                          step='0.01'
                          value={ambientLayers[layer.id].volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAmbientLayers((prev) => ({
                              ...prev,
                              [layer.id]: { ...prev[layer.id], volume: val },
                            }));
                          }}
                          className='w-10 h-1 accent-slate-600 cursor-pointer'
                          title={`${layer.label} Volume`}
                        />
                      )}
                      <audio
                        ref={(el) => {
                          ambientRefs.current[layer.id] = el;
                        }}
                        src={layer.src}
                        loop
                        preload='auto'
                        title={`${layer.label} Ambient`}
                      >
                        <track kind='captions' />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='mt-2'>
              <audio
                ref={audioRef}
                controls
                preload='metadata'
                onPlay={handleAudioPlay}
                onEnded={goToNextTrack}
                className='h-8 w-full opacity-90'
                src={dreamTracks[trackIndex]?.src}
                title={dreamTracks[trackIndex]?.label}
              >
                <track kind='captions' />
                Your browser does not support the audio element.
              </audio>
            </div>
          </>
        )}

        {playerMode !== 'minimized' && (
          <p className='mt-2 text-[10px] text-slate-700/60 text-right italic'>
            {boostActive ? 'Boost: ON' : 'Play to boost audio'}
          </p>
        )}
      </motion.div>

      {/* Wake Up Button removed from here (now at top-left) */}

      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none'>
        <motion.h1
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 4 }}
          className='text-6xl md:text-8xl font-serif italic text-white mix-blend-overlay drop-shadow-lg'
        >
          <AnimatePresence mode='wait'>
            <motion.span
              key={dreamWords[wordIndex]}
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
              className='inline-block'
            >
              {dreamWords[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.h1>
      </div>

      <div className='absolute inset-0 z-15 overflow-hidden pointer-events-none'>
        {comets.map((comet) => (
          <span
            key={comet.id}
            className='dt-comet absolute'
            style={{
              top: `${comet.top}%`,
              left: `${comet.left}%`,
              width: `${comet.width}px`,
              animationDuration: `${comet.duration}ms`,
            }}
          />
        ))}
      </div>

      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} color='#fff' />

        <DriftingClouds cloudTint={currentTheme.cloudTint} />

        <Stars radius={200} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />

        <EffectComposer>
          <TiltShift2 blur={0.5} />
        </EffectComposer>
      </Canvas>

      <style>{`
				.dt-comet {
					height: 2px;
					border-radius: 999px;
					background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(233, 243, 255, 0.95));
					box-shadow: 0 0 10px rgba(238, 248, 255, 0.75);
					opacity: 0;
					animation-name: dt-comet-shoot;
					animation-timing-function: ease-out;
					animation-fill-mode: forwards;
				}
				@keyframes dt-comet-shoot {
					0% {
						opacity: 0;
						transform: translate3d(0, 0, 0) rotate(-24deg) scaleX(0.45);
					}
					12% {
						opacity: 1;
					}
					100% {
						opacity: 0;
						transform: translate3d(-72vw, 38vh, 0) rotate(-24deg) scaleX(1);
					}
				}
				.custom-scrollbar::-webkit-scrollbar {
					width: 4px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.1);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.3);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.5);
				}
			`}</style>
    </div>
  );
}
