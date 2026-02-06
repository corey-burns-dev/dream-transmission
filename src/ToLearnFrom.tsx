import { Cloud, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, List, Maximize2, Minimize2, Waves, Wind } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const dreamWords = ['Relax', 'Breathe', 'Peace', 'Unwind', 'Stillness', 'Drift'];

type Theme = {
  name: string;
  colors: string[]; // [from, via, to]
  cloudTint: string;
};

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
  const [opacity, setOpacity] = useState(0);

  useFrame((state) => {
    if (!cloudRef.current) return;

    // Smooth horizontal drift
    const elapsed = state.clock.elapsedTime;
    const offsetX = (elapsed * speed + phase) % 40;
    cloudRef.current.position.x = startX + offsetX;

    // Gentle vertical float
    const floatY = Math.sin(elapsed * 0.3 + phase) * 0.5;
    cloudRef.current.position.y = startY + floatY;

    // Calculate opacity based on position
    const xPos = cloudRef.current.position.x;
    const fadeInStart = startX;
    const fadeInEnd = startX + 5;
    const fadeOutStart = startX + 25;
    const fadeOutEnd = startX + 35;

    let newOpacity = Math.min(0.58, 0.4 + scale * 0.08);

    // Fade in
    if (xPos < fadeInEnd) {
      newOpacity *= Math.max(0, (xPos - fadeInStart) / (fadeInEnd - fadeInStart));
    }
    // Fade out
    else if (xPos > fadeOutStart) {
      newOpacity *= Math.max(0, 1 - (xPos - fadeOutStart) / (fadeOutEnd - fadeOutStart));
    }

    setOpacity(newOpacity);
  });

  return (
    <group ref={cloudRef} position={[startX, startY, startZ]}>
      <Cloud
        opacity={opacity}
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
        phase: 7.8,
      },
    ],
    [cloudTint]
  );

  return (
    <>
      {cloudField.map((cloud, i) => (
        <DriftingCloud key={i} {...cloud} />
      ))}
    </>
  );
}

const AMBIENT_LAYERS = [
  { id: 'rain', label: 'Rain', icon: CloudRain, src: '/assets/ambient/rain.mp3' },
  { id: 'ocean', label: 'Ocean', icon: Waves, src: '/assets/ambient/ocean.mp3' },
  { id: 'wind', label: 'Wind', icon: Wind, src: '/assets/ambient/wind.mp3' },
];

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(ALL_THEMES[0]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [playerMode, setPlayerMode] = useState<'hidden' | 'minimized' | 'maximized'>('hidden');
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const ambientRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [ambientLayers, setAmbientLayers] = useState(
    Object.fromEntries(AMBIENT_LAYERS.map((layer) => [layer.id, { active: false, volume: 0.5 }]))
  );

  const [boostActive, setBoostActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex((i) => (i + 1) % dreamWords.length);
    }, 6000);
    return () => clearInterval(wordInterval);
  }, []);

  useEffect(() => {
    const cometInterval = setInterval(() => {
      const id = Date.now();
      const top = Math.random() * 60;
      const left = 80 + Math.random() * 20;
      const width = 60 + Math.random() * 120;
      const duration = 1800 + Math.random() * 1500;
      setComets((prev) => [...prev, { id, top, left, width, duration }]);
      setTimeout(() => setComets((prev) => prev.filter((c) => c.id !== id)), duration);
    }, 3000);
    return () => clearInterval(cometInterval);
  }, []);

  useEffect(() => {
    Object.entries(ambientLayers).forEach(([layerId, { active, volume }]) => {
      const audio = ambientRefs.current[layerId];
      if (audio) {
        audio.volume = volume;
        if (active && audio.paused) {
          audio.play().catch((err) => console.error(`Ambient play error (${layerId}):`, err));
        } else if (!active && !audio.paused) {
          audio.pause();
        }
      }
    });
  }, [ambientLayers]);

  const handleAudioPlay = () => {
    if (audioRef.current && !boostActive) {
      if (!audioContextRef.current) {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 2.5;
        audioContextRef.current = ctx;
        gainNodeRef.current = gain;
        sourceNodeRef.current = source;
      }
      setBoostActive(true);
    }
  };

  const goToNextTrack = () => {
    if (dreamTracks.length === 0) return;
    const nextIndex = (trackIndex + 1) % dreamTracks.length;
    setTrackIndex(nextIndex);
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.play().catch((err) => console.error('Track switch error:', err));
      }
    }, 100);
  };

  const goToPreviousTrack = () => {
    if (dreamTracks.length === 0) return;
    const prevIndex = trackIndex === 0 ? dreamTracks.length - 1 : trackIndex - 1;
    setTrackIndex(prevIndex);
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.play().catch((err) => console.error('Track switch error:', err));
      }
    }, 100);
  };

  const selectTrack = (index: number) => {
    setTrackIndex(index);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.error('Track select error:', err));
      }
    }, 100);
  };

  return (
    <div
      className='relative w-full h-screen overflow-hidden'
      style={{
        background: `linear-gradient(135deg, ${currentTheme.colors[0]} 0%, ${currentTheme.colors[1]} 50%, ${currentTheme.colors[2]} 100%)`,
        transition: 'background 2s ease-in-out',
      }}
    >
      <Link
        to='/app-list'
        className='absolute top-4 left-4 z-50 rounded-full border border-slate-700/35 bg-white/40 backdrop-blur-sm px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65 hover:shadow-md'
      >
        <List className='inline-block w-3 h-3 mr-1.5 -mt-0.5' />
        Wake Up
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className={`absolute bottom-6 right-6 z-50 rounded-2xl border border-white/30 bg-white/25 backdrop-blur-md p-4 shadow-xl transition-all ${
          playerMode === 'minimized'
            ? 'w-52'
            : playerMode === 'maximized'
              ? 'w-80 max-h-[80vh]'
              : 'w-52'
        }`}
      >
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() =>
                setPlayerMode((m) =>
                  m === 'hidden' ? 'minimized' : m === 'minimized' ? 'maximized' : 'minimized'
                )
              }
              className='text-slate-600 hover:text-slate-900 transition'
              title={playerMode === 'minimized' ? 'Expand Player' : 'Minimize Player'}
            >
              {playerMode === 'minimized' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <span className='text-[10px] font-semibold uppercase tracking-widest text-slate-800/80'>
              Dreamscape
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setShowThemePicker(!showThemePicker)}
              className='w-5 h-5 rounded-full border-2 border-white/60 shadow-sm transition-transform hover:scale-110'
              style={{
                background: `linear-gradient(135deg, ${currentTheme.colors[0]}, ${currentTheme.colors[1]})`,
              }}
              title='Change Theme'
            />
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className='absolute top-12 right-0 bg-white/90 backdrop-blur-lg rounded-xl shadow-2xl p-3 w-64 max-h-72 overflow-y-auto z-50'
              >
                {THEME_CATEGORIES.map((category) => (
                  <div key={category.name} className='mb-3'>
                    <p className='text-[9px] uppercase tracking-widest text-slate-600 mb-1.5 font-semibold'>
                      {category.name}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {category.themes.map((theme) => (
                        <button
                          key={theme.name}
                          type='button'
                          onClick={() => {
                            setCurrentTheme(theme);
                            setShowThemePicker(false);
                          }}
                          className='flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all text-left group'
                          title={theme.name}
                        >
                          <span
                            className='w-4 h-4 rounded-full border border-slate-300 shadow-sm shrink-0'
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`,
                            }}
                          />
                          <span className='text-[10px] text-slate-700 group-hover:text-slate-900'>
                            {theme.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
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
              <audio
                ref={audioRef}
                controls
                preload='metadata'
                onPlay={handleAudioPlay}
                onEnded={goToNextTrack}
                className='h-8 flex-1 min-w-0 opacity-90'
                src={dreamTracks[trackIndex]?.src}
                title={dreamTracks[trackIndex]?.label}
              >
                <track kind='captions' />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className='flex items-center gap-1 mt-3 overflow-x-auto pb-1 no-scrollbar'>
              {AMBIENT_LAYERS.map((layer) => {
                const Icon = layer.icon;
                const isActive = ambientLayers[layer.id].active;
                return (
                  <div
                    key={layer.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all shrink-0 ${
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
                          [layer.id]: { ...prev[layer.id], active: !isActive },
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
          </>
        )}

        {playerMode !== 'minimized' && (
          <p className='mt-2 text-[10px] text-slate-700/60 text-right italic'>
            {boostActive ? 'Boost: ON' : 'Play to boost audio'}
          </p>
        )}
      </motion.div>

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
