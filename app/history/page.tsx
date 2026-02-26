'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Clock, Trophy, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useArcadeStore, Battle } from '@/lib/store';
import { formatEloChange } from '@/lib/elo';
import modelsData from '@/data/models.json';

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [expandedBattle, setExpandedBattle] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'quick' | 'ranked' | 'daily'>('all');
  const { battles } = useArcadeStore();

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

  const getModelById = (id: string) => {
    return modelsData.models.find(m => m.id === id);
  };

  const filteredBattles = battles.filter(b => 
    filterMode === 'all' || b.mode === filterMode
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 text-arcade-purple hover:text-arcade-pink transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Lobby</span>
        </Link>
        <h1 className="text-2xl md:text-3xl font-arcade text-arcade-cyan flex items-center gap-3">
          <Clock className="w-8 h-8" />
          BATTLE HISTORY
        </h1>
        <div className="w-24" />
      </div>

      {/* Stats Bar */}
      <div className="max-w-4xl mx-auto mb-6 grid grid-cols-4 gap-4">
        <div className="p-3 rounded-lg border border-arcade-purple/30 bg-arcade-dark/50 text-center">
          <div className="text-2xl font-bold text-arcade-purple">{battles.length}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="p-3 rounded-lg border border-arcade-cyan/30 bg-arcade-dark/50 text-center">
          <div className="text-2xl font-bold text-arcade-cyan">
            {battles.filter(b => b.mode === 'quick').length}
          </div>
          <div className="text-xs text-gray-400">Quick</div>
        </div>
        <div className="p-3 rounded-lg border border-arcade-pink/30 bg-arcade-dark/50 text-center">
          <div className="text-2xl font-bold text-arcade-pink">
            {battles.filter(b => b.mode === 'ranked').length}
          </div>
          <div className="text-xs text-gray-400">Ranked</div>
        </div>
        <div className="p-3 rounded-lg border border-arcade-yellow/30 bg-arcade-dark/50 text-center">
          <div className="text-2xl font-bold text-arcade-yellow">
            {battles.filter(b => b.mode === 'daily').length}
          </div>
          <div className="text-xs text-gray-400">Daily</div>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          {(['all', 'quick', 'ranked', 'daily'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-1 rounded-lg text-sm capitalize transition-colors ${
                filterMode === mode
                  ? 'bg-arcade-purple text-white'
                  : 'bg-arcade-dark/50 text-gray-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Battle List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-4"
      >
        {filteredBattles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No battles yet!</p>
            <p className="text-sm">Start a battle to see your history here.</p>
            <Link href="/battle?mode=quick" className="arcade-btn inline-block mt-4">
              Start First Battle
            </Link>
          </div>
        ) : (
          filteredBattles.map((battle, index) => {
            const modelA = getModelById(battle.modelA);
            const modelB = getModelById(battle.modelB);
            const isExpanded = expandedBattle === battle.id;

            return (
              <motion.div
                key={battle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-arcade-purple/30 bg-arcade-dark/50 overflow-hidden"
              >
                {/* Summary Row */}
                <button
                  onClick={() => setExpandedBattle(isExpanded ? null : battle.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-arcade-purple/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{modelA?.icon}</span>
                      <span className="text-sm font-medium">
                        {modelA?.shortName}
                        <span className={`ml-1 text-xs ${battle.eloChangeA > 0 ? 'text-arcade-green' : 'text-arcade-red'}`}>
                          ({formatEloChange(battle.eloChangeA)})
                        </span>
                      </span>
                    </div>
                    <span className="text-arcade-red font-arcade text-xs">VS</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{modelB?.icon}</span>
                      <span className="text-sm font-medium">
                        {modelB?.shortName}
                        <span className={`ml-1 text-xs ${battle.eloChangeB > 0 ? 'text-arcade-green' : 'text-arcade-red'}`}>
                          ({formatEloChange(battle.eloChangeB)})
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-arcade-yellow" />
                        <span className="text-sm">
                          {battle.winner === 'A' ? modelA?.shortName : modelB?.shortName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(battle.timestamp)} • {battle.mode}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-arcade-purple/20"
                  >
                    <div className="p-4">
                      <div className="mb-4">
                        <div className="text-xs text-arcade-purple mb-1">PROMPT:</div>
                        <div className="text-sm text-gray-300 bg-arcade-dark/50 p-2 rounded">
                          {battle.prompt}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg border ${battle.winner === 'A' ? 'border-arcade-green bg-arcade-green/10' : 'border-gray-700'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span>{modelA?.icon}</span>
                            <span className="font-medium">{modelA?.name}</span>
                            {battle.winner === 'A' && <Trophy className="w-4 h-4 text-arcade-yellow" />}
                          </div>
                          <div className="text-xs text-gray-400 max-h-40 overflow-y-auto">
                            {battle.responseA.slice(0, 500)}
                            {battle.responseA.length > 500 && '...'}
                          </div>
                        </div>
                        
                        <div className={`p-3 rounded-lg border ${battle.winner === 'B' ? 'border-arcade-green bg-arcade-green/10' : 'border-gray-700'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span>{modelB?.icon}</span>
                            <span className="font-medium">{modelB?.name}</span>
                            {battle.winner === 'B' && <Trophy className="w-4 h-4 text-arcade-yellow" />}
                          </div>
                          <div className="text-xs text-gray-400 max-h-40 overflow-y-auto">
                            {battle.responseB.slice(0, 500)}
                            {battle.responseB.length > 500 && '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </main>
  );
}
