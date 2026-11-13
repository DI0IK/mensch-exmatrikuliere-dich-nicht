# Mensch exmatrikuliere dich nicht

A university-themed, slightly modified version of *Mensch ärgere dich nicht* built with **React**, **TypeScript**, and **Vite** — featuring a tactile German tabletop aesthetic, smart bots, and pure frontend browser-to-browser multiplayer over **WebRTC**.

## Rules & Twist

- **Immatrikulation**: Roll a `6` to move a pawn out of your corner *Wohnheim* onto your start tile (grants a bonus roll).
- **1v1 Exmatrikulations-Duell**: Landing on an opponent's pawn does not automatically kick them — instead, both players roll `1d6` in a 1v1 duel! Ties re-roll until someone wins; the loser is **exmatriculated** back to their *Wohnheim*, and the winner keeps the tile.
- **Classic MÄDN Nuances**:
  - Up to **3 attempts** to roll a `6` when all 4 pawns are in the *Wohnheim*.
  - Must clear your own start tile first if pawns remain in the *Wohnheim*.
  - Exact roll required to enter and advance in the 4-tile *Abschluss* goal stretch (first player with all 4 pawns in goal wins).

## Features

- **2–4 Players**: Play solo against bots, local pass-and-play, or mix in remote players.
- **Serverless WebRTC P2P**: Connect browser-to-browser using compressed `#join=` invite links or copy-paste Offer/Answer codes (public STUN, no backend server required), with live Waiting Room sync and automatic Bot takeover if a guest leaves.
- **Bilingual UI**: Switch between German (`DE`) and English (`EN`) anytime.
- **Synthesized Tabletop Audio**: Web Audio API dice clatter, wooden pawn taps, and stamp effects with a mute toggle.

## Local Development

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev` — Start the Vite dev server
- `npm test -- --run` — Run the Vitest unit test suite for the game engine and bot AI
- `npm run build` — Type-check (`tsc -b`) and build production assets into `dist/`

## Deployment (GitHub Pages)

The included workflow at `.github/workflows/deploy.yml` runs tests, builds the app, and deploys `dist/` to GitHub Pages on pushes to `main`. In your repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
