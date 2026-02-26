'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Medal, Swords } from 'lucide-react';
import { useArcadeStore } from '@/lib/store';
import { getEloTier } from '@/lib/elo';

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const { models, battles } = useArcadeStore();

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

  // Sort models by ELO
  const sortedModels = [...models].sort((a, b) => b.elo - a.elo);

  // Calculate win rates
  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 text-arcade-purple hover:text-arcade-pink transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Lobby</span>
        </Link>
        <h1 className="text-2xl md:text-3xl font-arcade text-arcade-yellow flex items-center gap-3">
          <Trophy className="w-8 h-8" />
          LEADERBOARD
        </h1>
        <div className="w-24" />
      </div>

      {/* Podium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto mb-12"
      >
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          {sortedModels[1] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-36 text-center"
            >
              <div className="text-5xl mb-2">{sortedModels[1].icon}</div>
              <div className="font-bold text-sm truncate">{sortedModels[1].shortName}</div>
              <div className="bg-gray-400 rounded-t-lg p-4 mt-2 h-24 flex flex-col justify-end">
                <Medal className="w-8 h-8 mx-auto text-gray-600 mb-1" />
                <div className="text-xl font-bold text-gray-800">#2</div>
                <div className="text-xs text-gray-700">{sortedModels[1].elo} ELO</div>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {sortedModels[0] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-40 text-center"
            >
              <div className="text-6xl mb-2">{sortedModels[0].icon}</div>
              <div className="font-bold text-lg truncate">{sortedModels[0].shortName}</div>
              <div className="bg-arcade-yellow rounded-t-lg p-4 mt-2 h-32 flex flex-col justify-end">
                <Trophy className="w-10 h-10 mx-auto text-yellow-700 mb-1" />
                <div className="text-2xl font-bold text-yellow-900">#1</div>
                <div className="text-sm text-yellow-800">{sortedModels[0].elo} ELO</div>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {sortedModels[2] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-36 text-center"
            >
              <div className="text-5xl mb-2">{sortedModels[2].icon}</div>
              <div className="font-bold text-sm truncate">{sortedModels[2].shortName}</div>
              <div className="bg-amber-600 rounded-t-lg p-4 mt-2 h-20 flex flex-col justify-end">
                <Medal className="w-8 h-8 mx-auto text-amber-900 mb-1" />
                <div className="text-xl font-bold text-amber-900">#3</div>
                <div className="text-xs text-amber-800">{sortedModels[2].elo} ELO</div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Full Rankings */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-4xl mx-auto"
      >
        <div className="rounded-xl border border-arcade-purple/30 bg-arcade-dark/50 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-arcade-purple/20 text-sm text-gray-400 font-medium">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Model</div>
            <div className="col-span-2 text-center">ELO</div>
            <div className="col-span-2 text-center">Win Rate</div>
            <div className="col-span-3 text-center">Record</div>
          </div>

          {/* Rows */}
          {sortedModels.map((model, index) => {
            const tier = getEloTier(model.elo);
            const winRate = getWinRate(model.wins, model.losses);
            const trend = model.wins > model.losses ? 'up' : model.wins < model.losses ? 'down' : 'neutral';

            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="leaderboard-row grid grid-cols-12 gap-4 p-4 border-t border-arcade-purple/10 items-center"
              >
                {/* Rank */}
                <div className="col-span-1 text-center">
                  {index < 3 ? (
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-bold">#{index + 1}</span>
                  )}
                </div>

                {/* Model */}
                <div className="col-span-4 flex items-center gap-3">
                  <span className="text-3xl">{model.icon}</span>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs" style={{ color: tier.color }}>
                      {tier.icon} {tier.name}
                    </div>
                  </div>
                </div>

                {/* ELO */}
                <div className="col-span-2 text-center">
                  <div className="text-xl font-bold text-arcade-cyan">{model.elo}</div>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    {trend === 'up' && <TrendingUp className="w-3 h-3 text-arcade-green" />}
                    {trend === 'down' && <TrendingDown className="w-3 h-3 text-arcade-red" />}
                    {trend === 'neutral' && <Minus className="w-3 h-3 text-gray-500" />}
                  </div>
                </div>

                {/* Win Rate */}
                <div className="col-span-2 text-center">
                  <div className="text-lg font-bold" style={{
                    color: winRate >= 60 ? '#22c55e' : winRate >= 40 ? '#eab308' : '#ef4444'
                  }}>
                    {winRate}%
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full progress-bar"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>

                {/* Record */}
                <div className="col-span-3 text-center">
                  <span className="text-arcade-green font-bold">{model.wins}W</span>
                  <span className="text-gray-500 mx-2">/</span>
                  <span className="text-arcade-red font-bold">{model.losses}L</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Battles"
            value={battles.length.toString()}
            icon={<Swords className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Highest ELO"
            value={sortedModels[0]?.elo.toString() || '1500'}
            icon={<TrendingUp className="w-5 h-5" />}
            color="cyan"
          />
          <StatCard
            label="Lowest ELO"
            value={sortedModels[sortedModels.length - 1]?.elo.toString() || '1500'}
            icon={<TrendingDown className="w-5 h-5" />}
            color="pink"
          />
          <StatCard
            label="Active Models"
            value={sortedModels.length.toString()}
            icon={<Trophy className="w-5 h-5" />}
            color="yellow"
          />
        </div>
      </motion.div>

      {/* Call to Action */}
      <div className="text-center mt-12">
        <Link href="/battle?mode=ranked" className="arcade-btn arcade-btn-primary inline-flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Start a Ranked Battle
        </Link>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'purple' | 'cyan' | 'pink' | 'yellow';
}) {
  const colorClasses = {
    purple: 'border-arcade-purple text-arcade-purple',
    cyan: 'border-arcade-cyan text-arcade-cyan',
    pink: 'border-arcade-pink text-arcade-pink',
    yellow: 'border-arcade-yellow text-arcade-yellow',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} bg-arcade-dark/50`}>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
