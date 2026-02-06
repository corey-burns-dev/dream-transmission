import { Cloud, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, TiltShift2 } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type * as THREE from 'three';

const dreamWords = ['Relax', 'Breathe', 'Peace', 'Unwind', 'Stillness', 'Drift'];
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

function DriftingCloud({ startX, startY, startZ, scale, tint }: DriftingCloudProps) {
  return (
    <Cloud
      position={[startX, startY, startZ]}
      opacity={Math.min(0.58, 0.4 + scale * 0.08)}
      speed={0}
      bounds={[8.4 * scale, 1.5, 2]}
      segments={28}
      color={tint}
    />
  );
}

function DriftingClouds() {
  const cloudField = useMemo(
    () => [
      {
        startX: -14,
        startY: 4.5,
        startZ: -17,
        speed: 0.68,
        scale: 1.85,
        tint: '#dbeafe',
        phase: 0.1,
      },
      {
        startX: -8,
        startY: -2,
        startZ: -13,
        speed: 0.62,
        scale: 1.55,
        tint: '#f5d0fe',
        phase: 1.3,
      },
      {
        startX: 2,
        startY: 2.2,
        startZ: -19,
        speed: 0.56,
        scale: 2.2,
        tint: '#bfdbfe',
        phase: 2.1,
      },
      {
        startX: 8,
        startY: -4.8,
        startZ: -15,
        speed: 0.66,
        scale: 1.72,
        tint: '#ddd6fe',
        phase: 2.9,
      },
      {
        startX: -2,
        startY: 6.8,
        startZ: -21,
        speed: 0.5,
        scale: 2.45,
        tint: '#e0f2fe',
        phase: 3.6,
      },
      {
        startX: -18,
        startY: -5.5,
        startZ: -16,
        speed: 0.58,
        scale: 1.65,
        tint: '#fae8ff',
        phase: 4.2,
      },
      {
        startX: 12,
        startY: 5.2,
        startZ: -18,
        speed: 0.64,
        scale: 1.95,
        tint: '#dbeafe',
        phase: 5.1,
      },
      {
        startX: -5,
        startY: 0.8,
        startZ: -14,
        speed: 0.52,
        scale: 1.4,
        tint: '#f0abfc',
        phase: 6.3,
      },
      {
        startX: 5,
        startY: -6.5,
        startZ: -20,
        speed: 0.6,
        scale: 2.1,
        tint: '#bae6fd',
        phase: 7.0,
      },
    ],
    []
  );

  return (
    <>
      {cloudField.map((cloud) => (
        <AnimatedCloud key={`${cloud.startX}-${cloud.startY}-${cloud.startZ}`} {...cloud} />
      ))}
    </>
  );
}

function AnimatedCloud(props: DriftingCloudProps) {
  const wrapper = useRef<THREE.Group>(null);
  const laneYRef = useRef(props.startY);
  const laneZRef = useRef(props.startZ);

  useFrame((state, delta) => {
    if (!wrapper.current) return;

    wrapper.current.position.x += props.speed * delta;
    const bob = Math.sin(state.clock.elapsedTime * 0.13 + props.phase) * 0.45;
    wrapper.current.position.y = laneYRef.current + bob;
    wrapper.current.position.z = laneZRef.current;

    if (wrapper.current.position.x > 35) {
      wrapper.current.position.x = -30 - Math.random() * 8;
      laneYRef.current = laneYRef.current + (Math.random() - 0.5) * 2;
      laneZRef.current = laneZRef.current + (Math.random() - 0.5) * 2;
    }
  });

  return (
    <group ref={wrapper}>
      <DriftingCloud {...props} startX={0} startY={0} startZ={0} />
    </group>
  );
}

export default function DreamTransmission() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBoostReadyRef = useRef(false);
  const shouldResumeOnTrackChangeRef = useRef(false);
  const cometIdRef = useRef(0);
  const cometCleanupTimersRef = useRef<number[]>([]);
  const [boostActive, setBoostActive] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [comets, setComets] = useState<
    Array<{
      id: number;
      top: number;
      left: number;
      width: number;
      duration: number;
    }>
  >([]);

  function ensureAudioBoost() {
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
  }

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
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % dreamWords.length);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, []);

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
  }, [trackIndex]);

  return (
    <div className='w-full h-screen bg-linear-to-b from-[#e0f2fe] via-[#fbcfe8] to-[#e0f2fe] relative overflow-hidden'>
      <div className='absolute right-4 bottom-4 z-30 w-[min(92vw,18rem)] rounded-2xl border border-white/45 bg-white/35 p-3 text-slate-700 shadow-2xl backdrop-blur-xl sm:right-6 sm:bottom-6'>
        <div className='flex items-center justify-between mb-1'>
          <p className='text-[10px] uppercase tracking-[0.25em] text-slate-600/80'>Ambient Audio</p>
          <span className='text-[10px] uppercase tracking-[0.16em] text-slate-700/80'>
            {dreamTracks.length > 0 ? `${trackIndex + 1}/${dreamTracks.length}` : '0/0'}
          </span>
        </div>

        {dreamTracks.length > 0 ? (
          <div className='mb-2'>
            <p className='text-sm font-semibold truncate leading-tight'>
              {dreamTracks[trackIndex].label}
            </p>
            <p className='text-[11px] text-slate-700/75 truncate leading-tight'>
              {dreamTracks[trackIndex].artist}
            </p>
          </div>
        ) : (
          <p className='mb-2 text-xs text-slate-700/80'>No songs found</p>
        )}

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={goToPreviousTrack}
            disabled={dreamTracks.length === 0}
            className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65'
          >
            Prev
          </button>
          <button
            type='button'
            onClick={goToNextTrack}
            disabled={dreamTracks.length === 0}
            className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65'
          >
            Next
          </button>
          <audio
            ref={audioRef}
            controls
            preload='metadata'
            onPlay={handleAudioPlay}
            className='h-8 flex-1 min-w-0 opacity-90'
            src={dreamTracks[trackIndex]?.src}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
        <p className='mt-1.5 text-[10px] text-slate-700/60 text-right italic'>
          {boostActive ? 'Boost: ON' : 'Play to boost audio'}
        </p>
      </div>

      {/* Soft overlay UI */}
      <div className='absolute inset-x-0 bottom-28 flex justify-center z-20'>
        <Link
          to='/'
          className='bg-white/30 backdrop-blur-md px-8 py-4 rounded-full text-slate-600 uppercase tracking-widest text-sm hover:bg-white/60 transition-all shadow-xl hover:scale-105 duration-300'
        >
          Wake Up
        </Link>
      </div>

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

      <div className='absolute inset-0 z-[15] overflow-hidden pointer-events-none'>
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

        <DriftingClouds />

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
			`}</style>
    </div>
  );
}
