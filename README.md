# 🎓 Campus Games Hub

**Two university-themed German tabletop classics in one browser-first multiplayer web app** — built with **React 19**, **TypeScript**, and **Vite**, featuring smart bots, a shared **WebRTC (PeerJS)** lobby, bilingual (`DE` / `EN`) UI, and synthesized Web Audio tabletop sound effects.

---

## 🕹️ Included Games

Switch between games directly in the lobby (or jump straight in via game-aware invite links like `#game=monopoly&room=ABC123`).

### 1. 🎲 Mensch exmatrikuliere dich nicht
A student-life twist on *Mensch ärgere dich nicht* with a tactile German tabletop aesthetic:
- **Immatrikulation**: Roll a `6` to leave your corner *Wohnheim* (with a bonus roll and up to 3 attempts when all 4 pawns are at home).
- **1v1 Exmatrikulations-Duell**: Landing on an opponent triggers a `1d6` duel instead of an instant kick — ties re-roll until someone wins; the loser is exmatriculated back to their *Wohnheim*.
- **Game Modes & Superpowers**:
  - **Hardcore Mode**: Campus event tiles (*Mensa*, *Bib*, *Prüfungsamt*, *Party*) and `6-6-6` streaks (50/50 instant win or full reset).
  - **Ultra-Hardcore / Duel Variants**: Configurable duel rules and optional student superpowers in the lobby.
- **Classic Nuances**: Clear your own start tile first when pawns remain at home, and hit exact rolls to enter and advance in the 4-tile *Abschluss* goal stretch.

### 2. 🏛️ DHBW Karlsruhe Monopoly (Student Edition)
A 40-tile campus board themed around **DHBW Karlsruhe** (*Erzbergerstraße*, *A-Bau*, *E-Bau*, *Audimax*, *Mensa Moltkestraße*, *KVV* lines, *Rechenzentrum*, *Prüfungsamt*, and more):
- **Tactile Tabletop Board**: Classic square layout with inward-facing property color bars, 3D-styled pawns, stacked *Ereignis* / *Semester-Kasse* card decks, and a split **Prüfungsamt** corner (*Prüfungsamt* detention box + *Nur zur Einsicht* visiting strip).
- **Contextual Property Modals**: Click any tile on the board to inspect rent tables, build *Tutorien* / *Vorlesungssäle* (houses/hotels), mortgage, or unmortgage depending on what you can currently do.
- **Full Economy**: Property auctions, P2P & bot trading, *Prüfungsamt* bail/doubles/free-pass escape, bankruptcy handling, and configurable lobby rules (**Turbo-Start**, **Free Parking Pot**, **Auctions**, **Double on Start**).

---

## ✨ Shared Platform Features

- **2–4 Players (Local, Bots, or Online)**: Toggle seats 2–4 between **Local**, **Bot**, or **Open Online Slot**. Unfilled online slots run as bots, and disconnected remote players can be taken over by a bot mid-game.
- **Shared P2P WebRTC Lobby**: 6-character room codes and game-aware invite links (`#game=medn&room=...` / `#game=monopoly&room=...`) powered by PeerJS — no backend game server required.
- **Custom Student Profiles**: Choose your name, study major (*Studiengang*), and pawn emoji (persisted in `localStorage`).
- **Live Connection Inspector (`ⓘ`)**: Inspect your role, room code, and ICE connection type (**Local LAN**, **STUN**, or **TURN**) for every connected seat.
- **Bilingual UI & Audio**: Toggle `DE` / `EN` anytime, mute/unmute synthesized Web Audio dice & stamp effects, and use `Space` to roll in MÄDN.

---

## 📁 Project Structure

```text
src/
├── App.tsx                     # Lobby game switcher & hash routing (#game=...&room=...)
├── main.tsx                    # App entry point
├── index.css                   # Shared tabletop theme & board styles
├── shared/                     # Code shared across all games
│   ├── audio/sound.ts          # Web Audio API tabletop sound effects
│   ├── components/Lobby.tsx    # Unified P2P multiplayer lobby & profile UI
│   └── net/                    # PeerJS lobby room, ICE/TURN config, join-link helpers
└── games/
    ├── medn/                   # Mensch exmatrikuliere dich nicht (engine, AI, UI, net)
    └── monopoly/               # DHBW Karlsruhe Monopoly (engine, AI, UI, net)
```

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

### Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite development server |
| `npm test -- --run` | Run all Vitest unit tests (`medn` + `monopoly` engines) |
| `npm run build` | Type-check (`tsc -b`) and build production assets into `dist/` |
| `npm run lint` | Run `oxlint` across the codebase |
| `npm run preview` | Preview the production `dist/` bundle locally |

---

## 🌐 Optional TURN Relay Configuration

Public Google STUN servers are enabled by default. For restrictive university or corporate networks (e.g., eduroam or symmetric NAT), configure a TURN relay via environment variables at build time (or GitHub Actions secrets):

- `VITE_TURN_URL` (e.g. `turn:your-turn-server:3478`)
- `VITE_TURN_USER`
- `VITE_TURN_PASS`

---

## 📦 Deployment (GitHub Pages)

The workflow at `.github/workflows/deploy.yml` runs tests, builds `dist/`, and deploys to GitHub Pages on pushes to `main`. In your repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
