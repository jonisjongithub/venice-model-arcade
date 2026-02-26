# Venice Model Arcade 🎮

A gamified AI model testing experience where models battle head-to-head and users vote on the best responses. Features ELO ratings, leaderboards, achievements, and a retro arcade aesthetic.

![Venice Model Arcade](https://img.shields.io/badge/Venice-Model%20Arcade-purple?style=for-the-badge)

## Features

### 🎯 Core Gameplay
- **Head-to-Head Battles** - Two models compete on the same prompt
- **Blind Voting** - Model names hidden until you vote (prevents bias)
- **ELO Rating System** - Fair ranking based on win/loss history
- **Live Leaderboard** - See which models reign supreme

### 🏆 Gamification
- **Achievements** - Unlock badges for voting milestones
- **Battle Streaks** - Track your judging consistency
- **Daily Challenges** - Special prompts with bonus XP
- **Battle History** - Review past matchups and outcomes

### 🎨 Arcade Experience
- **Retro Aesthetics** - Pixel fonts, neon glow, CRT effects
- **Sound Effects** - Victory fanfares, typing sounds (optional)
- **Animations** - Battle intros, vote celebrations, combo multipliers
- **VS Screen** - Dramatic model face-off presentation

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Venice API key

# Run development server
npm run dev

# Open http://localhost:3500
```

## Environment Variables

```env
VENICE_API_KEY=your_api_key_here
```

## How It Works

### Battle Flow
1. **Select Battle Mode** - Quick battle, ranked, or daily challenge
2. **Enter Your Prompt** - Or use a random community prompt
3. **Watch the Battle** - Both models stream their responses simultaneously
4. **Vote for Winner** - Pick Response A or B (blind voting)
5. **Reveal Results** - See which model you chose + ELO changes
6. **Track Progress** - Earn XP, unlock achievements, climb the ranks

### ELO Rating System
Models start at 1500 ELO. After each battle:
- Winner gains ELO based on opponent strength
- Loser loses ELO proportionally
- Upsets (weaker beats stronger) = bigger swings
- ELO history tracked over time

### Battle Modes

| Mode | Description | XP Bonus |
|------|-------------|----------|
| **Quick Battle** | Random model matchup | 1x |
| **Ranked Battle** | ELO-matched opponents | 2x |
| **Daily Challenge** | Special prompt, all models | 3x |
| **Tournament** | 8-model bracket (coming soon) | 5x |

## Architecture

```
venice-model-arcade/
├── app/
│   ├── page.tsx            # Landing/arcade lobby
│   ├── battle/
│   │   └── page.tsx        # Battle arena
│   ├── leaderboard/
│   │   └── page.tsx        # Model rankings
│   ├── history/
│   │   └── page.tsx        # Past battles
│   └── api/
│       ├── battle/route.ts # Start battle
│       ├── vote/route.ts   # Submit vote
│       ├── leaderboard/route.ts
│       └── models/route.ts
├── components/
│   ├── BattleArena.tsx     # Main battle UI
│   ├── VSScreen.tsx        # Dramatic intro
│   ├── ResponseCard.tsx    # Streaming response
│   ├── VoteButton.tsx      # Vote interaction
│   ├── Leaderboard.tsx     # ELO rankings
│   ├── AchievementToast.tsx
│   └── ArcadeFrame.tsx     # Retro styling wrapper
├── lib/
│   ├── venice.ts           # API client
│   ├── elo.ts              # Rating calculations
│   └── store.ts            # Zustand state
└── data/
    ├── models.json         # Model metadata
    └── prompts.json        # Community prompts
```

## Model Roster

| Model | Starting ELO | Type |
|-------|--------------|------|
| llama-3.3-70b | 1500 | Chat |
| llama-3.1-405b | 1500 | Chat |
| dolphin-2.9.2-qwen2-72b | 1500 | Chat |
| deepseek-r1-llama-70b | 1500 | Reasoning |
| qwen-2.5-coder-32b | 1500 | Code |
| nous-hermes-3-llama3.1-70b | 1500 | Chat |

## Screenshots

### Arcade Lobby
```
╔══════════════════════════════════════════╗
║     🎮 VENICE MODEL ARCADE 🎮            ║
║                                          ║
║   [▶ QUICK BATTLE]    [🏆 RANKED]       ║
║                                          ║
║   [📅 DAILY CHALLENGE]  [🏅 LEADERBOARD]║
║                                          ║
║   Your Stats: 47 battles | 2,340 XP     ║
║   Current Streak: 🔥 5                   ║
╚══════════════════════════════════════════╝
```

### Battle Arena
```
╔══════════════════════════════════════════╗
║              ⚔️ VS ⚔️                    ║
║   [MODEL A]           [MODEL B]          ║
║      ???                 ???              ║
╠══════════════════════════════════════════╣
║ PROMPT: Explain quantum entanglement... ║
╠══════════════════════════════════════════╣
║ Response A:          │ Response B:       ║
║ Quantum...           │ Entanglement...   ║
║ █████████░░          │ ███████████░      ║
╠══════════════════════════════════════════╣
║        [🅰️ VOTE A]     [VOTE B 🅱️]       ║
╚══════════════════════════════════════════╝
```

## Achievements

| Badge | Name | Requirement |
|-------|------|-------------|
| 🎮 | First Blood | Complete first battle |
| 🔥 | Hot Streak | 5 battles in a row |
| 🎯 | Sharpshooter | Pick winner 10 times |
| 🏆 | Champion | 100 total battles |
| 👁️ | Oracle | Correctly predict 90%+ |
| 🌟 | Model Master | Battle with all models |

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Venice AI** - Model inference

## API Reference

### POST /api/battle
Start a new battle
```json
{
  "prompt": "string",
  "modelA": "string (optional)",
  "modelB": "string (optional)",
  "mode": "quick | ranked | daily"
}
```

### POST /api/vote
Submit vote for a battle
```json
{
  "battleId": "string",
  "winner": "A | B",
  "userId": "string"
}
```

### GET /api/leaderboard
Get current model rankings
```json
{
  "models": [
    { "id": "llama-3.3-70b", "elo": 1587, "wins": 42, "losses": 23 }
  ]
}
```

## Privacy

- No prompts or responses are stored permanently
- Battle outcomes stored locally in browser
- Anonymous voting (no account required)
- Venice's privacy-first inference

## Future Ideas

- [ ] Tournament brackets (8/16 model elimination)
- [ ] Custom model categories (code, creative, reasoning)
- [ ] Multiplayer judging (multiple users same battle)
- [ ] Model trash talk (AI-generated banter)
- [ ] Spectator mode
- [ ] Battle replays

## License

MIT - Built for the Venice AI ecosystem

---

**May the best model win! 🏆**
