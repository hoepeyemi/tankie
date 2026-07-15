# Tankies

**Tankies** is a multiplayer tank battle game built on Reddit with [Devvit](https://developers.reddit.com/docs). Battle friends and AI bots, earn XP, climb the leaderboard, wager XP in 1v1 matches, and unlock premium tank skins — all inside a Reddit post.

Submitted to the **2026 Reddit Daily Games Hackathon**.

---

## Gameplay Modes

### Quick Play
Drop instantly into an offline arena against 4 AI bot opponents (Shadow, Reaper, Maverick, Ghost, Titan). No setup, no wait — earn XP the moment you tap Play.

### Free Multiplayer
Host a lobby, share the 6-character room code with an opponent (via comments or DM), and battle live. Supports up to 6 players.

### XP Wager
Attach an XP wager to your multiplayer lobby. XP is held in server-side escrow on match creation/join and paid to the winner (2× the wager). If a match can't be settled (e.g. host disconnects), both players are refunded automatically.

### Daily Challenge
A daily challenge variant (7 deterministic types, seeded by date) gives bonus XP for completing specific objectives — kills, survival time, wager wins, match count, and more. No scheduler required; the challenge is derived server-side from the current UTC date.

---

## Progression System

| Rank | XP Required |
|------|-------------|
| Recruit | 0 |
| Private | 500 |
| Corporal | 1,500 |
| Sergeant | 3,500 |
| Lieutenant | 7,500 |
| Captain | 15,000 |
| Colonel | 22,500 |
| General | 30,000 |

Ranking up triggers a Reddit flair update (`reddit.setUserFlair`) and a community announcement comment (`reddit.submitComment`).

### Day Streak
Playing on consecutive days builds a streak (tracked via Redis TTL keys). Streak XP bonuses reward daily retention.

### XP Sources
- **Kill**: +25 XP
- **Win**: +100 XP
- **Daily challenge bonus**: varies by challenge type
- **Wager win**: 2× the wagered XP

---

## Tank Skins (Reddit Gold Purchases)

Paid skins are unlocked via Reddit's native payments system (`@devvit/payments`). SKUs are defined in `devvit.json`.

| SKU | Display Name | Price |
|-----|-------------|-------|
| `skin_military` | Soldier Boy Tank | 5 Gold |
| `skin_studystorm` | StudyStorm Tank | 25 Gold |
| `skin_weeb` | Weeb Kawaii Tank | 50 Gold |
| `skin_thomas` | Thomas The Tank | 100 Gold |

Each tank type has a `url` (flat UV texture map used by the renderer) and an `avatar` (pre-rendered cropped preview image used in the UI).

---

## Architecture

### Platform
- **Devvit 0.13.8** web-first architecture
- Two HTML entrypoints: `splash.html` (inline post preview) + `game.html` (expanded fullscreen)
- Server runs on `@devvit/web/server` with Hono routing

### Frontend
- **React** + **React Router** (`MemoryRouter`) for SPA navigation inside the Devvit iframe
- **Zustand** stores: `useNetwork`, `usePlayerSettings`, `useAudio`, `useMatchStore`
- **Three.js** + **Enable3d** (Ammo.js physics) for the 3D game engine
- **Framer Motion** for UI animations
- **TailwindCSS** for styling

### Networking
- `OfflineNetwork` — Quick Play local mode; spawns 4 `TankBot` AI opponents
- `DevvitNetwork` — real multiplayer via `/api/game/*` server endpoints + Devvit Realtime pub/sub channel

### Server
- **Redis** for all persistent state: player XP, streaks, leaderboard sorted set (`lb:xp`), wager escrow, rate-limit counters
- **Rate limiting** on score submit (1 per 3 min), wager actions (5 per min), challenge progress (20 per min)
- All XP mutations sync both `player:${username}` hash and `lb:xp` sorted set to keep leaderboard consistent

### AI Bots (`TankBot`)
- Finds closest enemy every 500 ms, aims turret, fires when angle diff < 0.2 rad and distance < 50 units
- Drives toward target, reverses if stuck, auto-rights when flipped, teleports if it falls out of bounds

### Mobile Controls (`VirtualGamepad`)
- Left joystick: WASD synthetic keyboard events
- Right swipe: `MouseEvent` movementX/Y for turret rotation
- Fire button (Space), Honk (K)
- Multi-touch tracked by `identifier`

---

## Project Structure

```
tankies/
├── src/
│   ├── client/
│   │   ├── splash.html        # Inline post preview (animated 3D splash + Play button)
│   │   ├── splash.ts          # Three.js splash scene + last-match comeback hook
│   │   └── game.html          # Expanded fullscreen game entrypoint
│   ├── server/
│   │   ├── index.ts           # Hono app, route registration
│   │   ├── core/post.ts       # reddit.submitCustomPost helper
│   │   └── routes/
│   │       ├── api.ts         # /api/score, /api/leaderboard, /api/xp, /api/rank
│   │       ├── challenges.ts  # /api/challenges/today, /api/challenges/progress
│   │       └── wager.ts       # /api/wager/create, /api/wager/join, /api/wager/cancel, /api/wager/settle
│   ├── routes/root/
│   │   ├── Root.tsx           # Main menu shell (tabs: Quick Play, Multiplayer, Leaderboard, Wager)
│   │   ├── Register.tsx       # First-run name + tank selection
│   │   ├── Connected.tsx      # Lobby waiting screen (room code copy, peer avatars, back button)
│   │   └── tab/
│   │       ├── QuickPlayTab.tsx    # Rank card + daily challenge + Play Now button
│   │       ├── MultiplayerTab.tsx  # Host/join lobby UI
│   │       ├── LeaderboardTab.tsx  # Global XP leaderboard (scrollable on mobile)
│   │       └── WagerTab.tsx        # XP wager lobby creation
│   ├── shared/
│   │   └── ranks.ts           # Single source of truth for 8-tier rank definitions
│   ├── store/store.ts         # Zustand stores
│   ├── lib/devvit-bridge.ts   # Client → server fetch helpers
│   ├── ui/
│   │   ├── GameOver.tsx       # Match scoreboard, XP summary, wager outcome
│   │   ├── LoadingScreen.tsx  # Progress bar + platform control hints
│   │   ├── VirtualGamepad.tsx # Mobile dual-stick controls
│   │   ├── TankModel.tsx      # Tank preview renderer
│   │   └── ...
│   └── contexts/RedditContext.tsx
├── game/
│   ├── scenes/Game.ts         # Main game scene (3-min timer, bot spawning, match state)
│   ├── models/
│   │   ├── TankType.ts        # Tank definitions (url, avatar, backdrop per skin)
│   │   ├── TankBot.ts         # AI bot logic
│   │   ├── TankNetwork.ts     # Networked tank model
│   │   └── ...
│   └── network/
│       ├── OfflineNetwork.ts
│       └── DevvitNetwork.ts
├── server/index.ts            # Legacy server entry (menu item handler)
├── devvit.json                # Devvit app config, payments products, menu items
└── vite.config.ts
```

---

## Deploy

```bash
yarn build && yarn devvit upload && yarn devvit install tankie3d_dev
```

Test subreddit: `r/tankie3d_dev`  
Test user: `u/Coxydoalpha`

---

## Key Devvit APIs Used

| API | Usage |
|-----|-------|
| `redis.hSet` / `redis.hGet` | Player XP, streak, unlocked skins |
| `redis.zAdd` / `redis.zRange` | Leaderboard sorted set |
| `redis.incrBy` / `redis.expire` | Rate limiting |
| `reddit.setUserFlair` | Rank-up badge |
| `reddit.submitComment` | Rank-up community announcement |
| `realtime.send` / `connectRealtime` | Live multiplayer game events |
| `payments.acknowledgeOrderDelivery` | Skin purchase fulfillment |
| `requestExpandedMode` | Splash → fullscreen game transition |
