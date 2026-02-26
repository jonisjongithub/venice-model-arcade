'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Zap, Lock, Trophy, Flame, Target, Swords } from 'lucide-react';
import { useArcadeStore } from '@/lib/store';

export default function AchievementsPage() {
  const [mounted, setMounted] = useState(false);
  const { achievements, totalXP, totalBattles, streak, bestStreak } = useArcadeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-arcade-purple text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;
  const completionPercent = Math.round((unlockedCount / totalCount) * 100);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // XP levels
  const xpLevels = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 300 },
    { level: 4, xp: 600 },
    { level: 5, xp: 1000 },
    { level: 6, xp: 1500 },
    { level: 7, xp: 2200 },
    { level: 8, xp: 3000 },
    { level: 9, xp: 4000 },
    { level: 10, xp: 5500 },
  ];

  const currentLevel = xpLevels.filter(l => totalXP >= l.xp).pop() || xpLevels[0];
  const nextLevel = xpLevels.find(l => l.xp > totalXP) || xpLevels[xpLevels.length - 1];
  const xpProgress = nextLevel.xp > currentLevel.xp 
    ? ((totalXP - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100
    : 100;

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 text-arcade-purple hover:text-arcade-pink transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Lobby</span>
        </Link>
        <h1 className="text-2xl md:text-3xl font-arcade text-arcade-yellow flex items-center gap-3">
          <Zap className="w-8 h-8" />
          ACHIEVEMENTS
        </h1>
        <div className="w-24" />
      </div>

      {/* Player Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mb-8 p-6 rounded-xl border-2 border-arcade-purple bg-arcade-dark/50 backdrop-blur"
      >
        <div className="flex items-center gap-6">
          <div className="text-6xl">🎮</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-arcade text-arcade-cyan">
                Level {currentLevel.level}
              </span>
              <span className="text-sm text-arcade-yellow bg-arcade-yellow/20 px-2 py-0.5 rounded">
                {totalXP.toLocaleString()} XP
              </span>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{currentLevel.xp} XP</span>
                <span>{nextLevel.xp} XP</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full progress-bar rounded-full"
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Swords className="w-4 h-4 text-arcade-purple" />
                <span>{totalBattles} battles</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-arcade-pink" />
                <span>{streak} streak</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-arcade-cyan" />
                <span>Best: {bestStreak}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Completion Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Achievement Progress</span>
          <span className="text-arcade-cyan font-bold">{unlockedCount}/{totalCount}</span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-arcade-purple to-arcade-pink rounded-full"
          />
        </div>
        <div className="text-right mt-1 text-sm text-gray-500">{completionPercent}% complete</div>
      </motion.div>

      {/* Achievements Grid */}
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => {
            const isUnlocked = achievement.unlockedAt !== null;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isUnlocked
                    ? 'border-arcade-yellow bg-arcade-yellow/10'
                    : 'border-gray-700 bg-arcade-dark/30 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`text-4xl ${isUnlocked ? '' : 'grayscale'}`}>
                    {isUnlocked ? achievement.icon : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${isUnlocked ? 'text-arcade-yellow' : 'text-gray-400'}`}>
                        {achievement.name}
                      </h3>
                      {isUnlocked && (
                        <Trophy className="w-4 h-4 text-arcade-yellow" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {achievement.description}
                    </p>
                    {isUnlocked && achievement.unlockedAt && (
                      <p className="text-xs text-arcade-green">
                        ✓ Unlocked {formatDate(achievement.unlockedAt)}
                      </p>
                    )}
                    {!isUnlocked && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Achievement Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="max-w-2xl mx-auto mt-12 p-4 rounded-xl border border-arcade-purple/30 bg-arcade-dark/30"
      >
        <h3 className="text-arcade-purple font-bold mb-2 flex items-center gap-2">
          💡 Tips for Unlocking
        </h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Complete battles regularly to build your streak</li>
          <li>• Try Daily Challenges for bonus XP</li>
          <li>• Battle with different models to earn Model Master</li>
          <li>• Keep voting to earn Sharpshooter and Champion</li>
        </ul>
      </motion.div>
    </main>
  );
}
