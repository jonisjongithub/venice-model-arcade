# Venice Model Arcade — Build Plan

## Goal
Implement Erik's UI feedback and global leaderboard functionality.

## Tasks

### 1. Add All Venice Image Models
- Fetch complete list from Venice API/outerface repo
- Include ALL models (even NSFW like Lustify)
- Update `data/models.json` imageModels array

### 2. Fix Panel Misalignment
- Image containers should be UNIFORM size regardless of aspect ratio
- Use `object-fit: contain` or similar to fit images within fixed containers
- All panels in multi-battle should be identical dimensions

### 3. Image Lightbox Modal
- Click any image → fullscreen modal overlay
- Left/right arrow buttons to navigate between responses
- Arrow key keyboard support (← →)
- Click outside or press Escape to close
- Show model name in lightbox

### 4. Leaderboard Toggle (Text vs Image)
- Add toggle switch on leaderboard page
- Text mode: show text model rankings
- Image mode: show image model rankings
- History page can aggregate both (no toggle needed)

### 5. Global Leaderboard (Vercel KV)
- Set up Vercel KV for server-side ELO storage
- API route: POST /api/vote — record vote, update ELO
- API route: GET /api/leaderboard?mode=text|image — get rankings
- Frontend: fetch from API instead of localStorage
- Fallback: use localStorage if API fails

## Tech Stack
- Next.js 14 (existing)
- Tailwind CSS (existing)
- Vercel KV (new)
- Zustand for local state (existing)

## File Structure
```
app/
  api/
    vote/route.ts          # New: record votes to Vercel KV
    leaderboard/route.ts   # New: get global rankings
  battle/page.tsx          # Modify: add lightbox, fix panels
  leaderboard/page.tsx     # Modify: add text/image toggle
components/
  Lightbox.tsx             # New: fullscreen image viewer
data/
  models.json              # Modify: add all Venice image models
lib/
  kv.ts                    # New: Vercel KV client wrapper
```

## Acceptance Criteria
- [ ] All Venice image models appear in model picker
- [ ] Image panels are uniform size in multi-battle
- [ ] Clicking image opens fullscreen lightbox
- [ ] Arrow keys navigate between images in lightbox
- [ ] Leaderboard has working text/image toggle
- [ ] Votes persist across users (global leaderboard)
- [ ] Graceful fallback if KV unavailable

## Testing Instructions
1. `npm run dev` locally
2. Test image mode multi-battle — verify uniform panels
3. Click any generated image — verify lightbox opens
4. Use arrow keys in lightbox — verify navigation
5. Go to leaderboard — verify toggle works
6. Deploy to Vercel, vote from two browsers — verify votes aggregate
