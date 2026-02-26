import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import modelsData from '@/data/models.json';

export interface Model {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  type: string;
  elo: number;
  wins: number;
  losses: number;
  description: string;
  strengths: string[];
}

export interface Battle {
  id: string;
  prompt: string;
  modelA: string;
  modelB: string;
  responseA: string;
  responseB: string;
  winner: 'A' | 'B' | null;
  timestamp: number;
  eloChangeA: number;
  eloChangeB: number;
  mode: 'quick' | 'ranked' | 'daily';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

interface ArcadeState {
  // Models & ELO
  models: Model[];
  imageModels: Model[];
  updateModelElo: (modelId: string, newElo: number, won: boolean, isImage?: boolean) => void;
  
  // Battles
  battles: Battle[];
  currentBattle: Battle | null;
  addBattle: (battle: Battle) => void;
  setCurrentBattle: (battle: Battle | null) => void;
  
  // Player stats
  totalBattles: number;
  totalXP: number;
  streak: number;
  bestStreak: number;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  
  // Achievements
  achievements: Achievement[];
  unlockAchievement: (id: string) => void;
  
  // Settings
  soundEnabled: boolean;
  toggleSound: () => void;
}

const defaultAchievements: Achievement[] = [
  { id: 'first-blood', name: 'First Blood', description: 'Complete your first battle', icon: '🎮', unlockedAt: null },
  { id: 'hot-streak', name: 'Hot Streak', description: '5 battles in a row', icon: '🔥', unlockedAt: null },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Vote in 10 battles', icon: '🎯', unlockedAt: null },
  { id: 'champion', name: 'Champion', description: 'Complete 100 battles', icon: '🏆', unlockedAt: null },
  { id: 'model-master', name: 'Model Master', description: 'Battle with all models', icon: '🌟', unlockedAt: null },
  { id: 'daily-warrior', name: 'Daily Warrior', description: 'Complete a daily challenge', icon: '📅', unlockedAt: null },
  { id: 'underdog', name: 'Underdog', description: 'Vote for lower ELO model that wins', icon: '💪', unlockedAt: null },
  { id: 'veteran', name: 'Veteran', description: 'Earn 1000 XP', icon: '⭐', unlockedAt: null },
];

export const useArcadeStore = create<ArcadeState>()(
  persist(
    (set, get) => ({
      // Models
      models: modelsData.models as Model[],
      imageModels: (modelsData as { models: Model[]; imageModels: Model[] }).imageModels || [],
      updateModelElo: (modelId, newElo, won, isImage = false) =>
        set((state) => {
          const key = isImage ? 'imageModels' : 'models';
          return {
            [key]: state[key].map((m) =>
              m.id === modelId
                ? {
                    ...m,
                    elo: newElo,
                    wins: won ? m.wins + 1 : m.wins,
                    losses: won ? m.losses : m.losses + 1,
                  }
                : m
            ),
          };
        }),

      // Battles
      battles: [],
      currentBattle: null,
      addBattle: (battle) =>
        set((state) => ({
          battles: [battle, ...state.battles].slice(0, 100), // Keep last 100
          totalBattles: state.totalBattles + 1,
        })),
      setCurrentBattle: (battle) => set({ currentBattle: battle }),

      // Player stats
      totalBattles: 0,
      totalXP: 0,
      streak: 0,
      bestStreak: 0,
      addXP: (amount) =>
        set((state) => ({
          totalXP: state.totalXP + amount,
        })),
      incrementStreak: () =>
        set((state) => ({
          streak: state.streak + 1,
          bestStreak: Math.max(state.bestStreak, state.streak + 1),
        })),
      resetStreak: () => set({ streak: 0 }),

      // Achievements
      achievements: defaultAchievements,
      unlockAchievement: (id) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id && !a.unlockedAt
              ? { ...a, unlockedAt: Date.now() }
              : a
          ),
        })),

      // Settings
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'venice-arcade-storage',
      partialize: (state) => ({
        // NOTE: models excluded from persistence - always load fresh from models.json
        // This ensures new models are picked up without users needing to clear localStorage
        battles: state.battles,
        totalBattles: state.totalBattles,
        totalXP: state.totalXP,
        streak: state.streak,
        bestStreak: state.bestStreak,
        achievements: state.achievements,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
