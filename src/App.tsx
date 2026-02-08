import { Cloud } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudRain, List, Maximize2, Minimize2, Shuffle } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

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

/* ── Twinkling Stars ─────────────────────────────────────────── */

const STAR_COUNT = 2800;

function generateStarGeometry() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const twinkleSeeds = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Distribute on a sphere shell between radius 80-250
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 170;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Vary star sizes — most small, a few bright
    const roll = Math.random();
    sizes[i] = roll < 0.85 ? 0.4 + Math.random() * 0.8 : 1.4 + Math.random() * 1.6;

    // Random phase offset for twinkling
    twinkleSeeds[i] = Math.random() * Math.PI * 2;
  }

  return { positions, sizes, twinkleSeeds };
}

const starVertexShader = `
  attribute float size;
  attribute float twinkleSeed;
  varying float vTwinkleSeed;
  varying float vSize;
  uniform float uTime;
  void main() {
    vTwinkleSeed = twinkleSeed;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Twinkle: modulate size gently
    float twinkle = 0.7 + 0.3 * sin(uTime * (0.4 + twinkleSeed * 0.6) + twinkleSeed * 6.2831);
    gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying float vTwinkleSeed;
  varying float vSize;
  uniform float uTime;
  void main() {
    // Soft circular point with glow falloff
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.08, d);
    // Subtle warm/cool tint variation per star
    float warmth = 0.5 + 0.5 * sin(vTwinkleSeed * 3.14);
    vec3 warm = vec3(1.0, 0.95, 0.85);
    vec3 cool = vec3(0.85, 0.92, 1.0);
    vec3 color = mix(cool, warm, warmth);
    // Brightness twinkle
    float brightness = 0.75 + 0.25 * sin(uTime * (0.3 + vTwinkleSeed * 0.5) + vTwinkleSeed * 6.2831);
    gl_FragColor = vec4(color * brightness, alpha * 0.9);
  }
`;

function TwinklingStars() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, twinkleSeeds } = useMemo(() => generateStarGeometry(), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    // Very gentle rotation for parallax
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.00004;
      pointsRef.current.rotation.x += 0.00002;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach='attributes-position' args={[positions, 3]} />
        <bufferAttribute attach='attributes-size' args={[sizes, 1]} />
        <bufferAttribute attach='attributes-twinkleSeed' args={[twinkleSeeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Cloud Types ─────────────────────────────────────────────── */

type DriftingCloudProps = {
  startX: number;
  startY: number;
  startZ: number;
  speed: number;
  scale: number;
  tint: string;
  phase: number;
};

function DriftingCloud({ startY, startZ, speed, scale, tint, phase }: DriftingCloudProps) {
  const cloudRef = useRef<THREE.Group>(null);
  const baseOpacity = Math.min(0.58, 0.4 + scale * 0.08);
  // Spread clouds across the visible range using phase for initial stagger
  const initialX = -35 + (phase / 14) * 70;
  const positionRef = useRef(initialX);

  useFrame((_, delta) => {
    if (!cloudRef.current) return;

    // Drift continuously to the right
    positionRef.current += speed * delta;

    // When cloud is fully past the right edge and invisible, wrap to left
    if (positionRef.current > 45) {
      positionRef.current = -45;
    }

    const xPos = positionRef.current;
    cloudRef.current.position.x = xPos;

    // Gentle vertical float
    const time = performance.now() * 0.001;
    const floatY = Math.sin(time * 0.15 + phase) * 0.4;
    cloudRef.current.position.y = startY + floatY;

    // Fade in/out at edges — apply directly to materials (no React re-render)
    const fadeInStart = -35;
    const fadeInEnd = -25;
    const fadeOutStart = 25;
    const fadeOutEnd = 35;
    let targetOpacity = baseOpacity;

    if (xPos < fadeInEnd) {
      targetOpacity *= Math.max(0, (xPos - fadeInStart) / (fadeInEnd - fadeInStart));
    } else if (xPos > fadeOutStart) {
      targetOpacity *= Math.max(0, 1 - (xPos - fadeOutStart) / (fadeOutEnd - fadeOutStart));
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
    <group ref={cloudRef} position={[initialX, startY, startZ]}>
      <Cloud
        opacity={baseOpacity}
        speed={0}
        bounds={[3.5 * scale, 1.2 * scale, 1.5]}
        segments={12}
        color={tint}
      />
    </group>
  );
}

const DriftingClouds = memo(function DriftingClouds({ cloudTint }: { cloudTint: string }) {
  const cloudField = useMemo(
    () => [
      {
        startX: -14,
        startY: 5,
        startZ: -18,
        speed: 0.55,
        scale: 1.3,
        tint: cloudTint,
        phase: 0.0,
      },
      {
        startX: 6,
        startY: 8,
        startZ: -22,
        speed: 0.42,
        scale: 1.6,
        tint: cloudTint,
        phase: 0.9,
      },
      {
        startX: -20,
        startY: -3,
        startZ: -15,
        speed: 0.65,
        scale: 1.0,
        tint: cloudTint,
        phase: 1.6,
      },
      {
        startX: 14,
        startY: 2,
        startZ: -20,
        speed: 0.48,
        scale: 1.4,
        tint: cloudTint,
        phase: 2.3,
      },
      {
        startX: -6,
        startY: -7,
        startZ: -17,
        speed: 0.58,
        scale: 1.1,
        tint: cloudTint,
        phase: 3.1,
      },
      {
        startX: 0,
        startY: 11,
        startZ: -24,
        speed: 0.38,
        scale: 1.7,
        tint: cloudTint,
        phase: 3.8,
      },
      {
        startX: 10,
        startY: -5,
        startZ: -16,
        speed: 0.62,
        scale: 0.9,
        tint: cloudTint,
        phase: 4.5,
      },
      {
        startX: -16,
        startY: 3,
        startZ: -19,
        speed: 0.52,
        scale: 1.2,
        tint: cloudTint,
        phase: 5.2,
      },
      {
        startX: 18,
        startY: 7,
        startZ: -21,
        speed: 0.45,
        scale: 1.5,
        tint: cloudTint,
        phase: 5.9,
      },
      {
        startX: -10,
        startY: -9,
        startZ: -14,
        speed: 0.68,
        scale: 0.85,
        tint: cloudTint,
        phase: 6.6,
      },
      {
        startX: 4,
        startY: -1,
        startZ: -23,
        speed: 0.4,
        scale: 1.55,
        tint: cloudTint,
        phase: 7.3,
      },
      {
        startX: -4,
        startY: 6,
        startZ: -16,
        speed: 0.6,
        scale: 1.05,
        tint: cloudTint,
        phase: 8.0,
      },
      {
        startX: 12,
        startY: -8,
        startZ: -19,
        speed: 0.5,
        scale: 1.25,
        tint: cloudTint,
        phase: 8.7,
      },
      {
        startX: -18,
        startY: 9,
        startZ: -25,
        speed: 0.35,
        scale: 1.8,
        tint: cloudTint,
        phase: 9.4,
      },
      {
        startX: 8,
        startY: 0,
        startZ: -13,
        speed: 0.7,
        scale: 0.8,
        tint: cloudTint,
        phase: 10.1,
      },
      // Larger majestic clouds
      {
        startX: -8,
        startY: 4,
        startZ: -26,
        speed: 0.3,
        scale: 2.8,
        tint: cloudTint,
        phase: 10.8,
      },
      {
        startX: 10,
        startY: -3,
        startZ: -28,
        speed: 0.25,
        scale: 3.2,
        tint: cloudTint,
        phase: 12.0,
      },
      {
        startX: -14,
        startY: -6,
        startZ: -30,
        speed: 0.22,
        scale: 3.5,
        tint: cloudTint,
        phase: 13.5,
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
});

const SceneCanvas = memo(function SceneCanvas({ cloudTint }: { cloudTint: string }) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 75 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color='#fff' />
      <TwinklingStars />
      <DriftingClouds cloudTint={cloudTint} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={0.4} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
});

const DreamTitle = memo(function DreamTitle({ wordIndex }: { wordIndex: number }) {
  return (
    <div className='absolute z-10 text-center -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2'>
      <h1 className='sr-only'>Dream Transmission - Meditative Ambient Music Experience</h1>
      <motion.h2
        initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 4 }}
        className='font-serif text-6xl italic text-white md:text-8xl mix-blend-overlay drop-shadow-lg'
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
      </motion.h2>
    </div>
  );
});

import ambientRainStorm from './assets/ambient/rain-storm.mp3';
import ambientRainThunder from './assets/ambient/rain-storm2.mp3';
import ambientRainLittleStorm from './assets/ambient/rain-storm3.mp3';

const AMBIENT_SOUNDS = [
  { label: 'Rain Storm', src: ambientRainStorm, icon: CloudRain },
  { label: 'Rain & Thunder', src: ambientRainThunder, icon: CloudRain },
  { label: 'Light Rain', src: ambientRainLittleStorm, icon: CloudRain },
];

type PlayerMode = 'minimized' | 'normal' | 'maximized';

type DreamTrack = { label: string; artist: string; src: string };

export default function DreamTransmission() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ambientRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBoostReadyRef = useRef(false);
  const shouldResumeOnTrackChangeRef = useRef(false);
  const cometIdRef = useRef(0);
  const cometCleanupTimersRef = useRef<number[]>([]);
  const bgRef = useRef<HTMLDivElement>(null);
  const [boostActive, setBoostActive] = useState(false);
  const [dreamTracks, setDreamTracks] = useState<DreamTrack[]>([]);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_MUSIC_BASE_URL || '/music';
    fetch('/music-manifest.json')
      .then((res) => res.json())
      .then((manifest: Record<string, string>) => {
        const tracks = Object.entries(manifest)
          .map(([filename, _]) => {
            const baseName = filename.replace(/\.[^/.]+$/, '');
            const [artistPart, ...titleParts] = baseName.split(' - ');
            const hasArtist = titleParts.length > 0;
            return {
              label: hasArtist ? titleParts.join(' - ') : baseName,
              artist: hasArtist ? artistPart : 'Ambient',
              src: `${baseUrl}/${filename}`,
            };
          })
          .sort((a, b) => `${a.artist} ${a.label}`.localeCompare(`${b.artist} ${b.label}`));
        setDreamTracks(tracks);
      })
      .catch((err) => console.error('Failed to load music manifest:', err));
  }, []);
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
  // -1 = off, 0/1/2 = index into AMBIENT_SOUNDS
  const [ambientIndex, setAmbientIndex] = useState(-1);
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [isShuffle, setIsShuffle] = useState(false);

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
    const audio = ambientRef.current;
    if (!audio) return;
    if (ambientIndex >= 0) {
      audio.src = AMBIENT_SOUNDS[ambientIndex].src;
      audio.loop = true;
      void audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [ambientIndex]);

  useEffect(() => {
    const audio = ambientRef.current;
    if (!audio) return;
    audio.volume = ambientVolume;
  }, [ambientVolume]);

  useEffect(() => {
    const spawnComet = () => {
      const id = ++cometIdRef.current;
      const comet = {
        id,
        top: 5 + Math.random() * 50,
        left: 60 + Math.random() * 35,
        width: 80 + Math.random() * 160,
        duration: 1000 + Math.random() * 1800,
      };
      setComets((prev) => [...prev, comet]);

      const cleanupId = window.setTimeout(() => {
        setComets((prev) => prev.filter((item) => item.id !== id));
      }, comet.duration + 260);
      cometCleanupTimersRef.current.push(cleanupId);
    };

    const initialSpawnDelay = window.setTimeout(spawnComet, Math.random() * 8000);
    const recurringSpawn = window.setInterval(
      () => {
        spawnComet();
        // Chance of a second comet shortly after for clusters
        if (Math.random() < 0.35) {
          window.setTimeout(spawnComet, 300 + Math.random() * 700);
        }
      },
      12000 + Math.random() * 10000
    );

    return () => {
      window.clearTimeout(initialSpawnDelay);
      window.clearInterval(recurringSpawn);
    };
  }, []);

  const selectTrack = useMemo(() => {
    return (nextTrackIndex: number, forcePlay = false) => {
      if (dreamTracks.length === 0) return;
      const audio = audioRef.current;
      shouldResumeOnTrackChangeRef.current = forcePlay || Boolean(audio && !audio.paused);
      setTrackIndex(nextTrackIndex);
    };
  }, [dreamTracks.length]);

  const goToPreviousTrack = useMemo(() => {
    return () => {
      if (dreamTracks.length === 0) return;
      selectTrack((trackIndex - 1 + dreamTracks.length) % dreamTracks.length);
    };
  }, [dreamTracks.length, selectTrack, trackIndex]);

  const goToRandomTrack = useMemo(() => {
    return () => {
      if (dreamTracks.length === 0) return;
      // Pick a random track that's different from current
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * dreamTracks.length);
      } while (randomIndex === trackIndex && dreamTracks.length > 1);
      selectTrack(randomIndex, true);
    };
  }, [dreamTracks.length, selectTrack, trackIndex]);

  const goToNextTrack = useMemo(() => {
    return () => {
      if (dreamTracks.length === 0) return;
      if (isShuffle) {
        goToRandomTrack();
      } else {
        selectTrack((trackIndex + 1) % dreamTracks.length, true);
      }
    };
  }, [dreamTracks.length, isShuffle, goToRandomTrack, selectTrack, trackIndex]);

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
  }, [trackIndex, ensureAudioBoost, dreamTracks]);

  // Slow hue drift — oscillates ±7deg (~2% of 360°) over ~3.5 min
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      // Full cycle every ~210s (3.5 min), max ±7 degrees
      const hue = Math.sin(elapsed * ((2 * Math.PI) / 210)) * 7;
      if (bgRef.current) {
        bgRef.current.style.filter = `hue-rotate(${hue.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const currentTheme = ALL_THEMES[themeIndex];
  const playerWidth =
    playerMode === 'minimized'
      ? 'min(16rem, calc(100vw - 2rem))'
      : playerMode === 'maximized'
        ? 'min(28rem, calc(100vw - 2rem))'
        : 'min(24rem, calc(100vw - 2rem))';

  return (
    <div
      ref={bgRef}
      className='relative w-full h-screen overflow-hidden transition-all duration-1000'
      style={{
        background: `linear-gradient(to bottom, ${currentTheme.colors[0]}, ${currentTheme.colors[1]}, ${currentTheme.colors[2]})`,
      }}
    >
      {/* Top-Left Wake Up Button */}
      <div className='absolute z-30 top-6 left-6'>
        <a
          href='https://waking.coreyburns.ca'
          className='bg-white/25 backdrop-blur-xl border border-white/20 px-5 py-2.5 rounded-full text-slate-700/80 uppercase tracking-widest text-[10px] hover:bg-white/45 transition-all shadow-lg hover:scale-105 duration-300'
        >
          Wake Up
        </a>
      </div>

      {/* Theme Picker Widget (Bottom-Left) */}
      <div className='absolute z-30 left-4 bottom-4 sm:left-6 sm:bottom-6 max-[380px]:left-auto max-[380px]:right-4 max-[380px]:bottom-auto max-[380px]:top-20'>
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
                className='relative z-20 mb-4 w-[min(92vw,40rem)] max-h-[70vh] overflow-y-auto rounded-3xl border border-white/45 bg-white/35 p-5 shadow-2xl backdrop-blur-2xl custom-scrollbar'
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xs font-bold tracking-widest uppercase text-slate-700/60'>
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
                      <div className='grid grid-cols-3 gap-2'>
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
          className='flex items-center gap-2 p-3 transition-all border shadow-xl bg-white/30 backdrop-blur-xl border-white/20 rounded-2xl hover:bg-white/50 hover:scale-105 group'
          title='Change Atmosphere'
        >
          <div className='flex -space-x-1.5'>
            {currentTheme.colors.map((c, i) => (
              <div
                key={`trigger-${currentTheme.name}-${c}-${i}`}
                className='w-4 h-4 border rounded-full shadow-sm border-white/40'
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
          width: playerWidth,
          height:
            playerMode === 'minimized' ? 'auto' : playerMode === 'maximized' ? '30rem' : 'auto',
        }}
        className='absolute z-30 p-3 overflow-hidden border shadow-2xl right-4 bottom-4 rounded-2xl border-white/45 bg-white/35 text-slate-700 backdrop-blur-xl sm:right-6 sm:bottom-6'
        style={{
          resize: playerMode === 'normal' ? 'both' : 'none',
          minWidth: 'min(16rem, calc(100vw - 2rem))',
          maxWidth: 'calc(100vw - 1rem)',
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
              className='p-1 transition-colors rounded-full hover:bg-white/20'
              title={playerMode === 'minimized' ? 'Restore' : 'Minimize'}
            >
              {playerMode === 'minimized' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button
              type='button'
              onClick={() => setPlayerMode(playerMode === 'maximized' ? 'normal' : 'maximized')}
              className='p-1 transition-colors rounded-full hover:bg-white/20'
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
          <div>
            <div className='flex items-center justify-between gap-2 mb-1.5'>
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
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`transition-all duration-300 ${
                    isShuffle
                      ? 'text-slate-900 scale-110 drop-shadow-sm'
                      : 'text-slate-600/60 hover:text-slate-900'
                  }`}
                  title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
                >
                  <Shuffle size={10} strokeWidth={isShuffle ? 3 : 2} />
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
          </div>
        ) : (
          <>
            {dreamTracks.length > 0 ? (
              <div className='mb-3'>
                <p className='text-sm font-semibold leading-tight truncate'>
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
              <div className='flex-1 pr-1 mb-4 overflow-y-auto max-h-64 custom-scrollbar'>
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
                      <p className='truncate opacity-60'>{track.artist}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                onClick={goToPreviousTrack}
                disabled={dreamTracks.length === 0}
                className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65 disabled:opacity-50'
                title='Previous Track'
              >
                Prev
              </button>
              <button
                type='button'
                onClick={() => setIsShuffle(!isShuffle)}
                disabled={dreamTracks.length === 0}
                className={`rounded-full border px-3 py-1.5 transition-all duration-300 disabled:opacity-50 ${
                  isShuffle
                    ? 'bg-white/60 border-white/80 text-slate-900 shadow-md scale-105'
                    : 'border-slate-700/25 bg-white/20 text-slate-600 hover:bg-white/40'
                }`}
                title={isShuffle ? 'Shuffle: Playing at Random' : 'Shuffle: Off'}
              >
                <Shuffle size={12} strokeWidth={isShuffle ? 3 : 2} />
              </button>
              <button
                type='button'
                onClick={goToNextTrack}
                disabled={dreamTracks.length === 0}
                className='rounded-full border border-slate-700/35 bg-white/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-slate-800 transition hover:bg-white/65 disabled:opacity-50'
                title='Next Track'
              >
                Next
              </button>

              <div className='flex items-center gap-1.5 ml-auto'>
                <button
                  type='button'
                  onClick={() =>
                    setAmbientIndex((prev) => (prev >= AMBIENT_SOUNDS.length - 1 ? -1 : prev + 1))
                  }
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${
                    ambientIndex >= 0
                      ? 'bg-white/45 border-white/60 shadow-sm text-slate-800'
                      : 'bg-white/5 border-transparent opacity-60 hover:opacity-100 text-slate-600'
                  }`}
                  title={
                    ambientIndex >= 0
                      ? `Playing: ${AMBIENT_SOUNDS[ambientIndex].label} — click to cycle`
                      : 'Enable ambient sounds'
                  }
                >
                  <CloudRain size={12} />
                  {ambientIndex >= 0 && (
                    <span className='hidden text-[9px] uppercase tracking-wider sm:inline'>
                      {AMBIENT_SOUNDS[ambientIndex].label}
                    </span>
                  )}
                </button>
                {ambientIndex >= 0 && (
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.01'
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className='w-12 h-1 cursor-pointer accent-slate-600'
                    title='Ambient Volume'
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Persistent audio elements — always mounted so playback survives mode changes */}
        <div className={playerMode === 'minimized' ? 'mt-1' : 'mt-2'}>
          <audio
            ref={audioRef}
            controls
            crossOrigin='anonymous'
            preload='metadata'
            onPlay={handleAudioPlay}
            onEnded={goToNextTrack}
            className={
              playerMode === 'minimized' ? 'w-full h-6 opacity-80' : 'w-full h-8 opacity-90'
            }
            src={dreamTracks[trackIndex]?.src}
            title={dreamTracks[trackIndex]?.label}
          >
            <track kind='captions' />
            Your browser does not support the audio element.
          </audio>
        </div>
        <audio ref={ambientRef} preload='auto' crossOrigin='anonymous' title='Ambient Sound'>
          <track kind='captions' />
        </audio>

        {playerMode !== 'minimized' && (
          <p className='mt-2 text-[10px] text-slate-700/60 text-right italic'>
            {boostActive ? 'Boost: ON' : 'Play to boost audio'}
          </p>
        )}
      </motion.div>

      {/* Wake Up Button removed from here (now at top-left) */}

      <DreamTitle wordIndex={wordIndex} />

      <div className='absolute inset-0 overflow-hidden pointer-events-none z-15'>
        {comets.map((comet) => (
          <span
            key={comet.id}
            className='absolute dt-comet'
            style={{
              top: `${comet.top}%`,
              left: `${comet.left}%`,
              width: `${comet.width}px`,
              animationDuration: `${comet.duration}ms`,
            }}
          />
        ))}
      </div>

      <SceneCanvas cloudTint={currentTheme.cloudTint} />

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
