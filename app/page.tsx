'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Swords, Trophy, Calendar, BarChart3, Volume2, VolumeX, Zap, Target, Flame } from 'lucide-react';
import { useArcadeStore } from '@/lib/store';

export default function ArcadeLobby() {
  const [mounted, setMounted] = useState(false);
  const { totalBattles, totalXP, streak, bestStreak, soundEnabled, toggleSound, achievements } = useArcadeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const unlockedAchievements = achievements.filter(a => a.unlockedAt).length;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-arcade-purple text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-arcade text-arcade-purple neon-text mb-4">
          🎮 VENICE MODEL ARCADE 🎮
        </h1>
        <p className="text-arcade-cyan text-lg">
          AI Models Battle • You Judge • The Best Wins
        </p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl mx-auto mb-12 p-4 rounded-xl border border-arcade-purple/30 bg-arcade-dark/50 backdrop-blur"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-arcade-cyan">{totalBattles}</div>
            <div className="text-gray-400 text-sm">Total Battles</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-arcade-yellow">{totalXP.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Total XP</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-arcade-pink flex items-center justify-center gap-1">
              <Flame className="w-6 h-6" />
              {streak}
            </div>
            <div className="text-gray-400 text-sm">Current Streak</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-arcade-green">{unlockedAchievements}/{achievements.length}</div>
            <div className="text-gray-400 text-sm">Achievements</div>
          </div>
        </div>
      </motion.div>

      {/* Main Menu */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <MenuButton
          href="/battle?mode=quick"
          icon={<Swords className="w-8 h-8" />}
          title="QUICK BATTLE"
          subtitle="Random models face off"
          color="purple"
          delay={0.3}
          xpBonus="10 XP"
        />
        <MenuButton
          href="/battle?mode=ranked"
          icon={<Target className="w-8 h-8" />}
          title="RANKED BATTLE"
          subtitle="ELO-matched opponents"
          color="pink"
          delay={0.4}
          xpBonus="20 XP"
        />
        <MenuButton
          href="/battle?mode=daily"
          icon={<Calendar className="w-8 h-8" />}
          title="DAILY CHALLENGE"
          subtitle="Special prompt, bonus rewards"
          color="cyan"
          delay={0.5}
          xpBonus="50 XP"
          badge="NEW"
        />
        <MenuButton
          href="/leaderboard"
          icon={<Trophy className="w-8 h-8" />}
          title="LEADERBOARD"
          subtitle="Model rankings & stats"
          color="yellow"
          delay={0.6}
        />
      </div>

      {/* Secondary Actions */}
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4 mb-12">
        <Link href="/history" className="arcade-btn text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> Battle History
        </Link>
        <Link href="/achievements" className="arcade-btn text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> Achievements
        </Link>
        <button
          onClick={toggleSound}
          className="arcade-btn text-sm flex items-center gap-2"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          Sound {soundEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Model Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-xl font-bold text-arcade-purple mb-4 text-center">
          ⚔️ FIGHTERS ROSTER ⚔️
        </h2>
        <ModelRoster />
      </motion.div>

      {/* Footer */}
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Powered by Venice AI • Privacy-First AI Infrastructure</p>
        <p className="mt-1">May the best model win! 🏆</p>
      </footer>
    </main>
  );
}

function MenuButton({
  href,
  icon,
  title,
  subtitle,
  color,
  delay,
  xpBonus,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: 'purple' | 'pink' | 'cyan' | 'yellow';
  delay: number;
  xpBonus?: string;
  badge?: string;
}) {
  const colorClasses = {
    purple: 'border-arcade-purple hover:shadow-neon-purple text-arcade-purple',
    pink: 'border-arcade-pink hover:shadow-neon-pink text-arcade-pink',
    cyan: 'border-arcade-cyan hover:shadow-neon-cyan text-arcade-cyan',
    yellow: 'border-arcade-yellow hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] text-arcade-yellow',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link
        href={href}
        className={`block p-6 rounded-xl border-2 bg-arcade-dark/50 backdrop-blur ${colorClasses[color]} transition-all duration-300 hover:scale-105 active:scale-95 relative overflow-hidden group`}
      >
        {badge && (
          <span className="absolute top-2 right-2 bg-arcade-green text-black text-xs font-bold px-2 py-0.5 rounded animate-pulse">
            {badge}
          </span>
        )}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-current/10 group-hover:bg-current/20 transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="font-arcade text-lg">{title}</h3>
            <p className="text-gray-400 text-sm">{subtitle}</p>
            {xpBonus && (
              <p className="text-arcade-yellow text-xs mt-1">+{xpBonus} per battle</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ModelRoster() {
  const { models } = useArcadeStore();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {models.map((model, i) => (
        <motion.div
          key={model.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 + i * 0.1 }}
          className="p-3 rounded-lg border border-gray-700 bg-arcade-dark/50 text-center hover:border-arcade-purple transition-colors"
        >
          <div className="text-3xl mb-1">{model.icon}</div>
          <div className="text-sm font-medium truncate" title={model.name}>
            {model.shortName}
          </div>
          <div className="text-xs text-arcade-cyan">{model.elo} ELO</div>
          <div className="text-xs text-gray-500">
            {model.wins}W / {model.losses}L
          </div>
        </motion.div>
      ))}
    </div>
  );
}
