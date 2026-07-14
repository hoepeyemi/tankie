# Blast Tanks 🚀💥

**Blast Tanks** is a fully decentralized, fast-paced 3D multiplayer Web3 game where you battle against friends and AI bots. Earn rewards, wager tokens, climb the on-chain leaderboard, and unlock premium skins—all powered by the **Somnia Testnet** and its groundbreaking **Reactivity** capabilities.

Play instantly in your browser without any installation.

---

## 🕹️ Gameplay & Modes

Blast Tanks features highly destructible environments, physics-driven tank mechanics, and an integrated Web3 interface entirely embedded into the game.

*   **Quick Play (Training Grounds)**: Drop instantly into a massive, procedurally generated arena against intelligent AI bots. Great for practicing aim and testing physics without staking tokens.
*   **Free-to-Play Multiplayer**: Host and join casual unranked lobbies with friends or randoms purely for mechanics, fun, and climbing the global leaderboard.
*   **High-Stakes Wager Multiplayer**: Elevate the stakes by attaching a `$BLAST` token wager to your lobby. The smart contract natively locks combatants' tokens in escrow and automatically pays the winner the entire pool.
*   **The Garage (Skins & Loadouts)**: A dedicated 3D UI tab where players can view their connected wallet balances, inspect premium NFT skins, purchase them dynamically, and instantly equip them to their active tank.
*   **Global Leaderboard Tab**: Always accessible from the main menu, directly querying the Somnia blockchain to track the most lethal commanders globally.

---

## ⚡ Somnia Reactivity: A Serverless Web3 Architecture

Blast Tanks completely eliminates the need for centralized Web2 backends, polling nodes, or external indexers by aggressively leveraging the **Somnia Reactivity SDK** and **Somnia Event Handlers**. We utilize Reactivity in two distinct, powerful ways:

### 1. On-Chain Reactivity (Smart Contract Automation)
Our reward and escrow distributions are 100% automated on-chain. The `BlastRewarder.sol` contract operates as a native `SomniaEventHandler`. 
* **The Flow**: When a multiplayer match ends, the game submits the outcome to the `BlastLeaderboard.sol` contract, which emits a `ScoreSubmitted` event. 
* **The Reactivity (Rewards)**: The Somnia Network's Reactivity Precompile detects this event and *automatically* triggers the `onEvent()` function inside our `BlastRewarder`. It instantly mints and transfers the exact `$BLAST` token reward into the player's wallet. **Zero backend servers required.**
* **The Reactivity (Wagers)**: High-Stakes `$BLAST` wagers are securely locked in the `BlastWager.sol` escrow contract using on-chain validation to strictly guarantee that the victor receives the massive `$BLAST` payouts instantaneously without lag.

### 2. Off-Chain Reactivity (Zero-Latency UI Synchronization)
Our frontend React application utilizes the `@somnia-chain/reactivity` JavaScript SDK to create a buttery-smooth, natively real-time Web3 UX.
*   **Instant Leaderboards**: Rather than using inefficient REST polling, the `LeaderboardTab.tsx` opens a direct WebSocket subscription to the Somnia RPC. The exact millisecond a player's `ScoreSubmitted` event hits the blockchain, the Reactivity SDK pushes the update, natively refreshing the global leaderboard for all connected players worldwide.
*   **Dynamic Wager State**: Our frontend Reactivity architecture tracks `WagerCreated` and `MatchResolved` events seamlessly, instantly updating lobby availability and match states on the screen the moment the blockchain processes the transaction.
*   **Dynamic Skin Ownership**: The UI leverages Reactivity to track minting and token transfers in the `BlastSkins.sol` contract instantly. Players see their newly purchased NFT skins unlock in the Garage without ever hitting refresh.

---

## 🪙 Tokenomics & The `$BLAST` Token Ecosystem

The core of the Blast Tanks economy is the **`$BLAST`** ERC20 utility token. Instead of arbitrary faucets, `$BLAST` is injected directly into the ecosystem through hyper-competitive gameplay mechanisms.

1. **Kill-to-Earn Rewards**: Players are financially incentivized to perform well. Every time a player destroys an enemy tank in a multiplayer arena, they are rewarded with 1 `$BLAST` token.
2. **Deflationary High-Stakes Wagers**: Players can stake their earned `$BLAST` in 1v1 Escrow Wagers. The winner of the wager match claims the entire prize pool securely via our `BlastWager.sol` escrow contract.
3. **Premium NFT Sink & Dynamic Pricing**: To combat token inflation, players must spend `$BLAST` tokens to unlock exclusive, high-tier NFT tank skins. The `BlastSkins.sol` contract acts as a permanent economic sink. Furthermore, skin prices utilize a **Dynamic Pricing Model**—the smart contract owner can dynamically update the `$BLAST` cost of geometric or neon skins based on rarity, demand, or circulating token supply. 

---

## 🎮 Engine & Technology Stack

*   **Logic & Rendering**: React, Three.js, Enable3d (Ammo.js Physics Engine)
*   **Multiplayer Networking**: WebRTC (PeerJS) & Advanced Offline AI Bots
*   **Smart Contracts**: Solidity (Somnia Testnet EVM)
*   **Web3 Integration**: Thirdweb React SDK & Viem
*   **Real-time Event Architecture**: Somnia Reactivity Framework
*   **Styling & UI**: TailwindCSS & Framer Motion

---

## 🌐 Blockchain Network Details
The Blast Tanks Web3 economy is deployed natively on the **Somnia Testnet**:
- **Network Name**: Somnia Testnet
- **RPC URL**: `https://dream-rpc.somnia.network`
- **Chain ID**: `50312`
- **Currency Symbol**: `STT`
- **Block Explorer**: `https://somnia-testnet.socialscan.io`

## 🚀 How to Run Locally

You need [Node.js](https://nodejs.org/) installed on your computer.

```bash
# 1. Install Dependencies
npm install

# 2. Run the Development Server
npm run dev
```

## 📜 Smart Contract Architecture

The game utilizes an interlocking suite of 4 primary contracts deployed to the Somnia Testnet:
1.  **`BlastLeaderboard.sol`** (`0xc70343667d292c3393491c4008e1bDd7cfe0D495`): An immutable record of player statistics (Kills, Deaths, XP, Matches Played). Emits the critical state events that drive the Reactivity engine.
2.  **`BlastRewarder.sol`** (`0x1AaaD8e892e8898f32CB2C2beB45Fa713d622907`): The SomniaEventHandler that listens to the Leaderboard and automatically mints/transfers `$BLAST` to killers.
3.  **`BlastWager.sol`** (`0x6be14c9c3191dF902973124cF61349613397207B`): A highly secure Escrow contract explicitly managing high-stakes 1v1 multiplayer matches. It locks `$BLAST` upon lobby creation and joins, only paying out upon cryptographic outcome verification.
4.  **`BlastSkins.sol`** (`0xCA3E4d110E33A89dC369e8cA9FD73290e18241Df`): A token-gated ownership ledger. Verifies a user's `$BLAST` balance, handles the token transfer payment, and permanently unlocks premium in-game 3D models for that wallet address. Prices can be updated dynamically via owner controls.
