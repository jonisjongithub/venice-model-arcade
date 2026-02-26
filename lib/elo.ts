// ELO Rating System for Model Battles

const K_FACTOR = 32; // How much ratings can change per game

export interface EloResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerChange: number;
  loserChange: number;
}

/**
 * Calculate expected score (probability of winning)
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a match
 */
export function calculateElo(
  winnerElo: number,
  loserElo: number
): EloResult {
  const expectedWin = expectedScore(winnerElo, loserElo);
  const expectedLose = expectedScore(loserElo, winnerElo);

  // Winner scored 1, loser scored 0
  const winnerChange = Math.round(K_FACTOR * (1 - expectedWin));
  const loserChange = Math.round(K_FACTOR * (0 - expectedLose));

  return {
    winnerNewElo: winnerElo + winnerChange,
    loserNewElo: loserElo + loserChange,
    winnerChange,
    loserChange,
  };
}

/**
 * Calculate win probability based on ELO difference
 */
export function winProbability(eloA: number, eloB: number): number {
  return expectedScore(eloA, eloB);
}

/**
 * Get ELO tier name based on rating
 */
export function getEloTier(elo: number): { name: string; color: string; icon: string } {
  if (elo >= 2000) return { name: 'Grandmaster', color: '#f97316', icon: '👑' };
  if (elo >= 1800) return { name: 'Master', color: '#a855f7', icon: '💎' };
  if (elo >= 1600) return { name: 'Diamond', color: '#3b82f6', icon: '💠' };
  if (elo >= 1400) return { name: 'Gold', color: '#eab308', icon: '🥇' };
  if (elo >= 1200) return { name: 'Silver', color: '#9ca3af', icon: '🥈' };
  return { name: 'Bronze', color: '#cd7c32', icon: '🥉' };
}

/**
 * Format ELO change for display
 */
export function formatEloChange(change: number): string {
  if (change > 0) return `+${change}`;
  return String(change);
}
