// Vercel KV client wrapper for global leaderboard
// Uses the REST API directly to avoid build-time dependencies
// Falls back gracefully when KV is not configured (dev mode)

// Check if Vercel KV is configured
export function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// REST API helper
async function kvRequest(command: string[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error('KV not configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

// Key prefixes for organization
const KEYS = {
  textElo: (modelId: string) => `elo:text:${modelId}`,
  imageElo: (modelId: string) => `elo:image:${modelId}`,
  textWins: (modelId: string) => `wins:text:${modelId}`,
  textLosses: (modelId: string) => `losses:text:${modelId}`,
  imageWins: (modelId: string) => `wins:image:${modelId}`,
  imageLosses: (modelId: string) => `losses:image:${modelId}`,
};

export interface ModelScore {
  id: string;
  elo: number;
  wins: number;
  losses: number;
}

export interface VoteResult {
  winnerId: string;
  loserId: string;
  winnerNewElo: number;
  loserNewElo: number;
  winnerChange: number;
  loserChange: number;
}

const DEFAULT_ELO = 1500;
const K_FACTOR = 32;

// Calculate expected score (probability of winning)
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Calculate ELO changes
function calculateEloChange(winnerElo: number, loserElo: number): { winnerChange: number; loserChange: number } {
  const expectedWin = expectedScore(winnerElo, loserElo);
  const expectedLose = expectedScore(loserElo, winnerElo);

  const winnerChange = Math.round(K_FACTOR * (1 - expectedWin));
  const loserChange = Math.round(K_FACTOR * (0 - expectedLose));

  return { winnerChange, loserChange };
}

// Get a value from KV
async function kvGet(key: string): Promise<number | null> {
  try {
    const result = await kvRequest(['GET', key]);
    if (result === null || result === undefined) return null;
    return typeof result === 'number' ? result : parseInt(String(result), 10);
  } catch (error) {
    // Silently return null for individual key fetches - caller handles missing data
    console.debug('KV get failed for key:', key, error);
    return null;
  }
}

// Set a value in KV
async function kvSet(key: string, value: number): Promise<void> {
  await kvRequest(['SET', key, String(value)]);
}

// Increment a value in KV
async function kvIncr(key: string): Promise<number> {
  const result = await kvRequest(['INCR', key]);
  return typeof result === 'number' ? result : parseInt(String(result), 10);
}

// Get model score from KV
export async function getModelScore(modelId: string, mode: 'text' | 'image'): Promise<ModelScore | null> {
  if (!isKVConfigured()) return null;

  try {
    const eloKey = mode === 'text' ? KEYS.textElo(modelId) : KEYS.imageElo(modelId);
    const winsKey = mode === 'text' ? KEYS.textWins(modelId) : KEYS.imageWins(modelId);
    const lossesKey = mode === 'text' ? KEYS.textLosses(modelId) : KEYS.imageLosses(modelId);

    const [elo, wins, losses] = await Promise.all([
      kvGet(eloKey),
      kvGet(winsKey),
      kvGet(lossesKey),
    ]);

    return {
      id: modelId,
      elo: elo ?? DEFAULT_ELO,
      wins: wins ?? 0,
      losses: losses ?? 0,
    };
  } catch (error) {
    console.error('Error getting model score from KV:', error);
    return null;
  }
}

// Record a vote and update ELO scores atomically
export async function recordVote(
  winnerId: string,
  loserId: string,
  mode: 'text' | 'image'
): Promise<VoteResult | null> {
  if (!isKVConfigured()) return null;

  try {
    // Get current ELO scores
    const winnerEloKey = mode === 'text' ? KEYS.textElo(winnerId) : KEYS.imageElo(winnerId);
    const loserEloKey = mode === 'text' ? KEYS.textElo(loserId) : KEYS.imageElo(loserId);
    const winnerWinsKey = mode === 'text' ? KEYS.textWins(winnerId) : KEYS.imageWins(winnerId);
    const loserLossesKey = mode === 'text' ? KEYS.textLosses(loserId) : KEYS.imageLosses(loserId);

    const [currentWinnerElo, currentLoserElo] = await Promise.all([
      kvGet(winnerEloKey),
      kvGet(loserEloKey),
    ]);

    const winnerElo = currentWinnerElo ?? DEFAULT_ELO;
    const loserElo = currentLoserElo ?? DEFAULT_ELO;

    // Calculate ELO changes
    const { winnerChange, loserChange } = calculateEloChange(winnerElo, loserElo);
    const winnerNewElo = winnerElo + winnerChange;
    const loserNewElo = loserElo + loserChange;

    // Update all values
    await Promise.all([
      kvSet(winnerEloKey, winnerNewElo),
      kvSet(loserEloKey, loserNewElo),
      kvIncr(winnerWinsKey),
      kvIncr(loserLossesKey),
    ]);

    return {
      winnerId,
      loserId,
      winnerNewElo,
      loserNewElo,
      winnerChange,
      loserChange,
    };
  } catch (error) {
    console.error('Error recording vote in KV:', error);
    return null;
  }
}

// Get all model scores for leaderboard
export async function getLeaderboard(
  mode: 'text' | 'image',
  modelIds: string[]
): Promise<ModelScore[] | null> {
  if (!isKVConfigured()) return null;

  try {
    // Fetch all scores in parallel
    const scores = await Promise.all(
      modelIds.map(async (id) => {
        const score = await getModelScore(id, mode);
        return score || { id, elo: DEFAULT_ELO, wins: 0, losses: 0 };
      })
    );

    // Sort by ELO descending
    return scores.sort((a, b) => b.elo - a.elo);
  } catch (error) {
    console.error('Error getting leaderboard from KV:', error);
    return null;
  }
}
