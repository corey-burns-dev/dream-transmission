# Dream Transmission

A meditative ambient music player and living sky experience built with React, Three.js, and Framer Motion. Deployed on Cloudflare Workers.

## ✨ Features

**Living Sky**

- Custom GLSL twinkling star field with 2,800 individually animated stars
- Wispy drifting clouds at multiple depths and sizes — small scattered puffs alongside larger distant formations
- Periodic shooting star comets streaking across the sky
- Slow, imperceptible hue drift that subtly shifts the palette over minutes

**Ambient Audio**

- Curated library of classical and ambient tracks (Chopin, Satie, Liszt, Beethoven, and more)
- Three ambient rain/storm soundscapes that cycle with a single button
- Audio boost via Web Audio API gain node
- Persistent playback across player mode changes (minimized, normal, playlist)

**18 Color Themes**
Organized into six categories — Sunset/Twilight, Dreamy Pastels, Cool & Calming, Warm & Gentle, Nature-Inspired, and Ethereal/Cloudy. Each theme defines a three-color gradient background and a cloud tint.

**Player Widget**

- Minimized, normal, and maximized (playlist) modes
- Draggable in normal mode
- Full browser audio controls in every mode
- Ambient sound cycling with independent volume control

## Tech Stack

| Layer      | Technology                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| UI         | React 19, TypeScript 5.9, Tailwind CSS 4                                     |
| 3D         | Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing |
| Animation  | Framer Motion, custom GLSL shaders                                           |
| Build      | Vite 7                                                                       |
| Deployment | Cloudflare Workers                                                           |
| Quality    | ESLint, Prettier, Husky, lint-staged                                         |

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type-check
bun run typecheck

# Build for production
bun run build

# Deploy to Cloudflare
bun run deploy
```

## Project Structure

```
src/
├── App.tsx            # Main application — scene, player, themes
├── main.tsx           # Entry point and router
├── index.css          # Tailwind config, fonts, custom CSS
└── assets/
    ├── music/         # Classical & ambient MP3 tracks
    └── ambient/       # Rain/storm ambient loops
```

## License

Private project.
