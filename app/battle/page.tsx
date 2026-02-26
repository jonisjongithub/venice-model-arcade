'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Shuffle, Play, Trophy, Zap, Plus, X, Users, Swords, Scale, Bot } from 'lucide-react';
import { useArcadeStore, Model } from '@/lib/store';
import { calculateElo, formatEloChange, getEloTier } from '@/lib/elo';
import promptsData from '@/data/prompts.json';
import { nanoid } from 'nanoid';

type BattlePhase = 'setup' | 'vs-screen' | 'battle' | 'voting' | 'results';
type BattleMode = '1v1' | 'multi';

function BattleContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'quick') as 'quick' | 'ranked' | 'daily';
  
  const { models, updateModelElo, addBattle, addXP, incrementStreak, unlockAchievement, totalBattles } = useArcadeStore();
  
  const [phase, setPhase] = useState<BattlePhase>('setup');
  const [battleMode, setBattleMode] = useState<BattleMode>('1v1');
  const [prompt, setPrompt] = useState('');
  
  // 1v1 mode
  const [modelA, setModelA] = useState<Model | null>(null);
  const [modelB, setModelB] = useState<Model | null>(null);
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  
  // Multi mode
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);
  const [multiResponses, setMultiResponses] = useState<Record<string, string>>({});
  const [multiLoading, setMultiLoading] = useState<Record<string, boolean>>({});
  const [multiWinner, setMultiWinner] = useState<string | null>(null);
  
  // Model picker
  const [showModelPicker, setShowModelPicker] = useState<'A' | 'B' | 'multi' | null>(null);
  
  const [eloResult, setEloResult] = useState<{ changeA: number; changeB: number } | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  
  // Judge mode
  const [useJudge, setUseJudge] = useState(false);
  const [judgeModel, setJudgeModel] = useState<Model | null>(null);
  const [judgeVerdict, setJudgeVerdict] = useState<{
    winner: 'A' | 'B';
    reasoning: string;
    scores?: {
      A: { accuracy: number; helpfulness: number; clarity: number; completeness: number };
      B: { accuracy: number; helpfulness: number; clarity: number; completeness: number };
    } | null;
    judgeModel: string;
  } | null>(null);
  const [judging, setJudging] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize suggested prompts and random models on mount
  useEffect(() => {
    selectRandomModels();
    refreshSuggestedPrompts();
  }, []);

  function refreshSuggestedPrompts() {
    const shuffled = [...promptsData.prompts].sort(() => Math.random() - 0.5);
    setSuggestedPrompts(shuffled.slice(0, 3).map(p => p.text));
  }

  function selectRandomModels() {
    const shuffled = [...models].sort(() => Math.random() - 0.5);
    setModelA(shuffled[0]);
    setModelB(shuffled[1]);
    // For multi mode, select 3 random models
    setSelectedModels(shuffled.slice(0, 3));
  }

  function selectModel(slot: 'A' | 'B' | 'multi', model: Model) {
    if (slot === 'A') {
      setModelA(model);
    } else if (slot === 'B') {
      setModelB(model);
    } else if (slot === 'multi') {
      if (selectedModels.find(m => m.id === model.id)) {
        setSelectedModels(selectedModels.filter(m => m.id !== model.id));
      } else if (selectedModels.length < 5) {
        setSelectedModels([...selectedModels, model]);
      }
    }
    setShowModelPicker(null);
  }

  function removeMultiModel(modelId: string) {
    setSelectedModels(selectedModels.filter(m => m.id !== modelId));
  }

  function addRandomMultiModel() {
    const available = models.filter(m => !selectedModels.find(s => s.id === m.id));
    if (available.length > 0 && selectedModels.length < 5) {
      const random = available[Math.floor(Math.random() * available.length)];
      setSelectedModels([...selectedModels, random]);
    }
  }

  function getRandomPrompt() {
    if (mode === 'daily') {
      const daily = promptsData.dailyChallenges[Math.floor(Math.random() * promptsData.dailyChallenges.length)];
      return daily.text;
    }
    const random = promptsData.prompts[Math.floor(Math.random() * promptsData.prompts.length)];
    return random.text;
  }

  function handleRandomPrompt() {
    setPrompt(getRandomPrompt());
  }

  async function startBattle() {
    if (!prompt.trim()) return;
    
    if (battleMode === '1v1') {
      if (!modelA || !modelB) return;
      await start1v1Battle();
    } else {
      if (selectedModels.length < 2) return;
      await startMultiBattle();
    }
  }

  async function start1v1Battle() {
    setPhase('vs-screen');
    setJudgeVerdict(null);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPhase('battle');
    setResponseA('');
    setResponseB('');
    setLoadingA(true);
    setLoadingB(true);
    
    abortControllerRef.current = new AbortController();
    
    // Store responses for judge
    let finalResponseA = '';
    let finalResponseB = '';
    
    await Promise.all([
      streamResponse(modelA!.id, (fn) => {
        setResponseA(prev => {
          const newVal = fn(prev);
          finalResponseA = newVal;
          return newVal;
        });
      }, setLoadingA),
      streamResponse(modelB!.id, (fn) => {
        setResponseB(prev => {
          const newVal = fn(prev);
          finalResponseB = newVal;
          return newVal;
        });
      }, setLoadingB),
    ]);
    
    // If judge mode is enabled, get AI verdict
    if (useJudge && judgeModel) {
      setJudging(true);
      try {
        const judgeResponse = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judgeModel: judgeModel.id,
            prompt,
            responseA: finalResponseA,
            responseB: finalResponseB,
            modelA: modelA!.name,
            modelB: modelB!.name,
          }),
        });
        
        if (judgeResponse.ok) {
          const verdict = await judgeResponse.json();
          setJudgeVerdict(verdict);
          // Auto-vote based on judge's decision
          handleVote(verdict.winner);
          return;
        }
      } catch (error) {
        console.error('Judge error:', error);
      } finally {
        setJudging(false);
      }
    }
    
    setPhase('voting');
  }

  async function startMultiBattle() {
    setPhase('vs-screen');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPhase('battle');
    setMultiResponses({});
    
    const loadingState: Record<string, boolean> = {};
    selectedModels.forEach(m => loadingState[m.id] = true);
    setMultiLoading(loadingState);
    
    abortControllerRef.current = new AbortController();
    
    await Promise.all(
      selectedModels.map(model =>
        streamResponse(
          model.id,
          (fn) => setMultiResponses(prev => ({ ...prev, [model.id]: fn(prev[model.id] || '') })),
          (loading) => setMultiLoading(prev => ({ ...prev, [model.id]: loading }))
        )
      )
    );
    
    setPhase('voting');
  }

  async function streamResponse(
    model: string,
    setResponse: (fn: (prev: string) => string) => void,
    setLoading: (loading: boolean) => void
  ) {
    try {
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) throw new Error('Failed to start battle');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                setResponse(prev => prev + token);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setResponse(() => `Error: Failed to get response from ${model}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleVote(choice: 'A' | 'B') {
    if (!modelA || !modelB) return;
    
    setWinner(choice);
    
    const winnerModel = choice === 'A' ? modelA : modelB;
    const loserModel = choice === 'A' ? modelB : modelA;
    
    const result = calculateElo(winnerModel.elo, loserModel.elo);
    
    updateModelElo(winnerModel.id, result.winnerNewElo, true);
    updateModelElo(loserModel.id, result.loserNewElo, false);
    
    setEloResult({
      changeA: choice === 'A' ? result.winnerChange : result.loserChange,
      changeB: choice === 'B' ? result.winnerChange : result.loserChange,
    });
    
    let xp = mode === 'quick' ? 10 : mode === 'ranked' ? 20 : 50;
    setXpGained(xp);
    addXP(xp);
    incrementStreak();
    
    addBattle({
      id: nanoid(),
      prompt,
      modelA: modelA.id,
      modelB: modelB.id,
      responseA,
      responseB,
      winner: choice,
      timestamp: Date.now(),
      eloChangeA: choice === 'A' ? result.winnerChange : result.loserChange,
      eloChangeB: choice === 'B' ? result.winnerChange : result.loserChange,
      mode,
    });
    
    if (totalBattles === 0) unlockAchievement('first-blood');
    if (totalBattles + 1 >= 10) unlockAchievement('sharpshooter');
    if (mode === 'daily') unlockAchievement('daily-warrior');
    
    setPhase('results');
  }

  function handleMultiVote(winnerId: string) {
    setMultiWinner(winnerId);
    
    const winnerModel = selectedModels.find(m => m.id === winnerId)!;
    
    // Update ELO: winner gains from all losers
    selectedModels.forEach(model => {
      if (model.id !== winnerId) {
        const result = calculateElo(winnerModel.elo, model.elo);
        updateModelElo(model.id, result.loserNewElo, false);
      }
    });
    
    // Winner gets accumulated gains
    const avgOtherElo = selectedModels
      .filter(m => m.id !== winnerId)
      .reduce((sum, m) => sum + m.elo, 0) / (selectedModels.length - 1);
    const winResult = calculateElo(winnerModel.elo, avgOtherElo);
    updateModelElo(winnerId, winResult.winnerNewElo, true);
    
    let xp = (mode === 'quick' ? 10 : mode === 'ranked' ? 20 : 50) * (selectedModels.length - 1);
    setXpGained(xp);
    addXP(xp);
    incrementStreak();
    
    setPhase('results');
  }

  function resetBattle() {
    setPhase('setup');
    setPrompt('');
    setResponseA('');
    setResponseB('');
    setMultiResponses({});
    setMultiLoading({});
    setWinner(null);
    setMultiWinner(null);
    setEloResult(null);
    setXpGained(0);
    selectRandomModels();
    refreshSuggestedPrompts();
  }

  const canStart = battleMode === '1v1' 
    ? (prompt.trim() && modelA && modelB) 
    : (prompt.trim() && selectedModels.length >= 2);

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-arcade-purple hover:text-arcade-pink transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Lobby</span>
        </Link>
        <div className="text-center">
          <span className="text-lg font-arcade text-arcade-cyan uppercase">
            {mode} Battle
          </span>
        </div>
        <div className="w-24" />
      </div>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-5xl mx-auto"
        >
          {/* Battle Mode Toggle */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setBattleMode('1v1')}
              className={`arcade-btn flex items-center gap-2 ${battleMode === '1v1' ? 'arcade-btn-primary' : ''}`}
            >
              <Swords className="w-4 h-4" />
              1v1 Battle
            </button>
            <button
              onClick={() => setBattleMode('multi')}
              className={`arcade-btn flex items-center gap-2 ${battleMode === 'multi' ? 'arcade-btn-primary' : ''}`}
            >
              <Users className="w-4 h-4" />
              Multi Battle (3-5)
            </button>
          </div>

          {/* 1v1 Model Selection */}
          {battleMode === '1v1' && (
            <>
              <div className="flex items-center justify-center gap-8 mb-6">
                <ModelCard 
                  model={modelA} 
                  label="A" 
                  onClick={() => setShowModelPicker('A')}
                  selectable
                />
                <div className="text-4xl font-arcade text-arcade-red vs-text">VS</div>
                <ModelCard 
                  model={modelB} 
                  label="B" 
                  onClick={() => setShowModelPicker('B')}
                  selectable
                />
              </div>
              <div className="flex justify-center mb-8">
                <button onClick={selectRandomModels} className="arcade-btn flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Shuffle Models
                </button>
              </div>
            </>
          )}

          {/* Multi Model Selection */}
          {battleMode === 'multi' && (
            <div className="mb-8">
              <div className="text-center text-arcade-purple mb-4">
                Select 3-5 models to battle ({selectedModels.length}/5)
              </div>
              <div className="flex flex-wrap justify-center gap-4 mb-4">
                {selectedModels.map((model, i) => (
                  <div key={model.id} className="relative">
                    <ModelCard model={model} label={String(i + 1)} onClick={() => {}} />
                    <button
                      onClick={() => removeMultiModel(model.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-arcade-red rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {selectedModels.length < 5 && (
                  <button
                    onClick={() => setShowModelPicker('multi')}
                    className="p-6 rounded-xl border-2 border-dashed border-arcade-purple/50 bg-arcade-dark/30 min-w-[140px] flex flex-col items-center justify-center gap-2 hover:border-arcade-purple transition-colors"
                  >
                    <Plus className="w-8 h-8 text-arcade-purple" />
                    <span className="text-arcade-purple text-sm">Add Model</span>
                  </button>
                )}
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={addRandomMultiModel} className="arcade-btn flex items-center gap-2" disabled={selectedModels.length >= 5}>
                  <Plus className="w-4 h-4" />
                  Add Random
                </button>
                <button onClick={selectRandomModels} className="arcade-btn flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Shuffle All
                </button>
              </div>
            </div>
          )}

          {/* Suggested Prompts */}
          <div className="mb-4">
            <div className="text-sm text-arcade-purple mb-2">💡 Suggested Prompts (click to use):</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestedPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p)}
                  className="px-3 py-2 text-sm bg-arcade-dark/50 border border-arcade-purple/30 rounded-lg hover:border-arcade-purple hover:bg-arcade-purple/10 transition-colors text-left max-w-xs truncate"
                >
                  {p}
                </button>
              ))}
              <button
                onClick={refreshSuggestedPrompts}
                className="px-3 py-2 text-sm text-arcade-cyan hover:text-arcade-pink transition-colors"
              >
                🔄 More
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-arcade-purple font-medium">Your Prompt</label>
              <button
                onClick={handleRandomPrompt}
                className="text-sm text-arcade-cyan hover:text-arcade-pink transition-colors"
              >
                🎲 Random Prompt
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt for the models to compete on..."
              className="w-full h-32 bg-arcade-dark/50 border-2 border-arcade-purple/30 rounded-xl p-4 text-white placeholder-gray-500 focus:border-arcade-purple focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Judge Mode Toggle (1v1 only) */}
          {battleMode === '1v1' && (
            <div className="mb-6 p-4 rounded-xl border border-arcade-purple/30 bg-arcade-dark/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-arcade-cyan" />
                  <span className="text-arcade-purple font-medium">AI Judge Mode</span>
                </div>
                <button
                  onClick={() => setUseJudge(!useJudge)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    useJudge ? 'bg-arcade-green' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      useJudge ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {useJudge && (
                <div className="mt-3">
                  <div className="text-sm text-gray-400 mb-2">Select a judge model to evaluate responses:</div>
                  <div className="flex flex-wrap gap-2">
                    {models.slice(0, 8).map(model => (
                      <button
                        key={model.id}
                        onClick={() => setJudgeModel(model)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                          judgeModel?.id === model.id
                            ? 'border-arcade-green bg-arcade-green/20 text-arcade-green'
                            : 'border-arcade-purple/30 hover:border-arcade-purple text-gray-300'
                        }`}
                      >
                        <span>{model.icon}</span>
                        <span>{model.shortName}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <Bot className="w-3 h-3 inline mr-1" />
                    The judge will read both responses and declare a winner with reasoning.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={startBattle}
              disabled={!canStart || (useJudge && !judgeModel)}
              className="arcade-btn arcade-btn-primary text-xl px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            >
              <Play className="w-6 h-6" />
              START {battleMode === 'multi' ? 'MULTI ' : ''}BATTLE {useJudge && '(Judged)'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Model Picker Modal */}
      <AnimatePresence>
        {showModelPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModelPicker(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-arcade-darker rounded-xl border-2 border-arcade-purple p-6 max-w-4xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-arcade text-arcade-cyan">
                  {showModelPicker === 'multi' ? 'Select Models' : `Select Model ${showModelPicker}`}
                </h2>
                <button onClick={() => setShowModelPicker(null)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {models.map(model => {
                  const isSelected = showModelPicker === 'multi' 
                    ? selectedModels.find(m => m.id === model.id)
                    : (showModelPicker === 'A' ? modelA?.id : modelB?.id) === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => selectModel(showModelPicker, model)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        isSelected 
                          ? 'border-arcade-green bg-arcade-green/20' 
                          : 'border-arcade-purple/30 hover:border-arcade-purple bg-arcade-dark/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{model.icon}</span>
                        <span className="font-medium text-sm">{model.shortName}</span>
                      </div>
                      <div className="text-xs text-arcade-cyan">{model.elo} ELO</div>
                      <div className="text-xs text-gray-500 truncate">{model.type}</div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VS Screen */}
      <AnimatePresence>
        {phase === 'vs-screen' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-arcade-darker/95 z-50 flex items-center justify-center"
          >
            {battleMode === '1v1' && modelA && modelB ? (
              <div className="flex items-center gap-12">
                <motion.div initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
                  <div className="text-8xl mb-4">{modelA.icon}</div>
                  <div className="text-2xl font-arcade text-arcade-cyan">{modelA.shortName}</div>
                  <div className="text-arcade-purple">{modelA.elo} ELO</div>
                </motion.div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="text-6xl font-arcade text-arcade-red vs-text">
                  ⚔️ VS ⚔️
                </motion.div>
                <motion.div initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
                  <div className="text-8xl mb-4">{modelB.icon}</div>
                  <div className="text-2xl font-arcade text-arcade-pink">{modelB.shortName}</div>
                  <div className="text-arcade-purple">{modelB.elo} ELO</div>
                </motion.div>
              </div>
            ) : (
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl font-arcade text-arcade-red mb-8">
                  ⚔️ MULTI BATTLE ⚔️
                </motion.div>
                <div className="flex flex-wrap justify-center gap-6">
                  {selectedModels.map((model, i) => (
                    <motion.div
                      key={model.id}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="text-center"
                    >
                      <div className="text-6xl mb-2">{model.icon}</div>
                      <div className="text-lg font-arcade text-arcade-cyan">{model.shortName}</div>
                      <div className="text-arcade-purple text-sm">{model.elo} ELO</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle & Voting Phase - 1v1 */}
      {(phase === 'battle' || phase === 'voting') && battleMode === '1v1' && modelA && modelB && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
          <div className="mb-6 p-4 rounded-xl border border-arcade-purple/30 bg-arcade-dark/50">
            <div className="text-sm text-arcade-purple mb-1">PROMPT:</div>
            <div className="text-white">{prompt}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <ResponseCard label="A" response={responseA} loading={loadingA} model={phase === 'voting' ? modelA : null} isWinner={winner === 'A'} onVote={phase === 'voting' ? () => handleVote('A') : undefined} />
            <ResponseCard label="B" response={responseB} loading={loadingB} model={phase === 'voting' ? modelB : null} isWinner={winner === 'B'} onVote={phase === 'voting' ? () => handleVote('B') : undefined} />
          </div>
          {phase === 'voting' && !useJudge && <div className="text-center text-arcade-cyan animate-pulse">⬆️ Click on the response you think is better! ⬆️</div>}
          {judging && (
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-arcade-cyan/20 border border-arcade-cyan">
                <Scale className="w-5 h-5 text-arcade-cyan animate-pulse" />
                <span className="text-arcade-cyan">Judge is evaluating responses...</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Battle & Voting Phase - Multi */}
      {(phase === 'battle' || phase === 'voting') && battleMode === 'multi' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto">
          <div className="mb-6 p-4 rounded-xl border border-arcade-purple/30 bg-arcade-dark/50">
            <div className="text-sm text-arcade-purple mb-1">PROMPT:</div>
            <div className="text-white">{prompt}</div>
          </div>
          <div className={`grid gap-4 mb-8 ${selectedModels.length <= 3 ? 'md:grid-cols-3' : selectedModels.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
            {selectedModels.map((model, i) => (
              <MultiResponseCard
                key={model.id}
                model={model}
                response={multiResponses[model.id] || ''}
                loading={multiLoading[model.id]}
                isWinner={multiWinner === model.id}
                showModel={phase === 'voting'}
                onVote={phase === 'voting' ? () => handleMultiVote(model.id) : undefined}
              />
            ))}
          </div>
          {phase === 'voting' && <div className="text-center text-arcade-cyan animate-pulse">⬆️ Click on your favorite response! ⬆️</div>}
        </motion.div>
      )}

      {/* Results Phase - 1v1 */}
      {phase === 'results' && battleMode === '1v1' && modelA && modelB && eloResult && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-3xl font-arcade text-arcade-yellow mb-2">WINNER</h2>
            <div className="text-6xl mb-2">{winner === 'A' ? modelA.icon : modelB.icon}</div>
            <div className="text-2xl font-bold text-white">{winner === 'A' ? modelA.name : modelB.name}</div>
            {judgeVerdict && (
              <div className="mt-2 text-arcade-cyan text-sm flex items-center justify-center gap-2">
                <Scale className="w-4 h-4" />
                Judged by {models.find(m => m.id === judgeVerdict.judgeModel)?.shortName || judgeVerdict.judgeModel}
              </div>
            )}
          </div>
          
          {/* Judge Verdict Card */}
          {judgeVerdict && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 rounded-xl border border-arcade-cyan/30 bg-arcade-dark/50 text-left max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-5 h-5 text-arcade-cyan" />
                <span className="font-arcade text-arcade-cyan">JUDGE&apos;S VERDICT</span>
              </div>
              <p className="text-gray-300 mb-4">{judgeVerdict.reasoning}</p>
              {judgeVerdict.scores && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-arcade-dark/50">
                    <div className="font-medium text-arcade-purple mb-2">{modelA.shortName}</div>
                    <div className="space-y-1 text-gray-400">
                      <div>Accuracy: {judgeVerdict.scores.A.accuracy}/10</div>
                      <div>Helpfulness: {judgeVerdict.scores.A.helpfulness}/10</div>
                      <div>Clarity: {judgeVerdict.scores.A.clarity}/10</div>
                      <div>Completeness: {judgeVerdict.scores.A.completeness}/10</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-arcade-dark/50">
                    <div className="font-medium text-arcade-purple mb-2">{modelB.shortName}</div>
                    <div className="space-y-1 text-gray-400">
                      <div>Accuracy: {judgeVerdict.scores.B.accuracy}/10</div>
                      <div>Helpfulness: {judgeVerdict.scores.B.helpfulness}/10</div>
                      <div>Clarity: {judgeVerdict.scores.B.clarity}/10</div>
                      <div>Completeness: {judgeVerdict.scores.B.completeness}/10</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          <div className="flex justify-center gap-12 mb-8">
            <EloChangeDisplay model={modelA} change={eloResult.changeA} isWinner={winner === 'A'} />
            <EloChangeDisplay model={modelB} change={eloResult.changeB} isWinner={winner === 'B'} />
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="inline-block px-6 py-3 rounded-xl bg-arcade-yellow/20 border border-arcade-yellow mb-8">
            <div className="flex items-center gap-2 text-arcade-yellow text-xl font-bold">
              <Zap className="w-6 h-6" />
              +{xpGained} XP
            </div>
          </motion.div>
          <div className="flex justify-center gap-4">
            <button onClick={resetBattle} className="arcade-btn arcade-btn-primary flex items-center gap-2">
              <Play className="w-5 h-5" />
              Battle Again
            </button>
            <Link href="/leaderboard" className="arcade-btn flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              View Leaderboard
            </Link>
          </div>
        </motion.div>
      )}

      {/* Results Phase - Multi */}
      {phase === 'results' && battleMode === 'multi' && multiWinner && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-3xl font-arcade text-arcade-yellow mb-2">WINNER</h2>
            {(() => {
              const winnerModel = selectedModels.find(m => m.id === multiWinner)!;
              return (
                <>
                  <div className="text-6xl mb-2">{winnerModel.icon}</div>
                  <div className="text-2xl font-bold text-white">{winnerModel.name}</div>
                </>
              );
            })()}
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {selectedModels.map(model => (
              <div key={model.id} className="text-center">
                <div className="text-3xl mb-1">{model.icon}</div>
                <div className="font-medium text-sm">{model.shortName}</div>
                {model.id === multiWinner && <div className="text-arcade-yellow text-sm">🏆 Winner</div>}
              </div>
            ))}
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="inline-block px-6 py-3 rounded-xl bg-arcade-yellow/20 border border-arcade-yellow mb-8">
            <div className="flex items-center gap-2 text-arcade-yellow text-xl font-bold">
              <Zap className="w-6 h-6" />
              +{xpGained} XP
            </div>
          </motion.div>
          <div className="flex justify-center gap-4">
            <button onClick={resetBattle} className="arcade-btn arcade-btn-primary flex items-center gap-2">
              <Play className="w-5 h-5" />
              Battle Again
            </button>
            <Link href="/leaderboard" className="arcade-btn flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              View Leaderboard
            </Link>
          </div>
        </motion.div>
      )}
    </main>
  );
}

function ModelCard({ model, label, onClick, selectable }: { model: Model | null; label: string; onClick?: () => void; selectable?: boolean }) {
  if (!model) return null;
  const tier = getEloTier(model.elo);
  return (
    <div 
      className={`p-6 rounded-xl border-2 border-arcade-purple/50 bg-arcade-dark/50 text-center min-w-[160px] ${selectable ? 'cursor-pointer hover:border-arcade-purple hover:bg-arcade-purple/10 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="text-5xl mb-2">{model.icon}</div>
      <div className="font-bold text-lg">{model.shortName}</div>
      <div className="text-arcade-cyan text-sm">{model.elo} ELO</div>
      <div className="text-xs mt-1" style={{ color: tier.color }}>{tier.icon} {tier.name}</div>
      {selectable && <div className="text-xs text-arcade-purple mt-2">Click to change</div>}
    </div>
  );
}

function ResponseCard({ label, response, loading, model, isWinner, onVote }: { label: string; response: string; loading: boolean; model: Model | null; isWinner: boolean; onVote?: () => void }) {
  const colorClass = label === 'A' ? 'border-arcade-cyan' : 'border-arcade-pink';
  const bgClass = label === 'A' ? 'bg-arcade-cyan/10' : 'bg-arcade-pink/10';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`response-card rounded-xl border-2 ${colorClass} ${isWinner ? 'winner-card' : ''} overflow-hidden`}>
      <div className={`p-3 ${bgClass} flex items-center justify-between`}>
        <span className="font-arcade text-lg">Response {label}</span>
        {model && <span className="flex items-center gap-2"><span>{model.icon}</span><span className="text-sm">{model.shortName}</span></span>}
        {!model && <span className="text-gray-500 text-sm">??? (Hidden)</span>}
      </div>
      <div className="p-4 h-80 overflow-y-auto bg-arcade-dark/30">
        {loading ? <div className="text-gray-400 typing-cursor">{response || 'Generating...'}</div> : <div className="text-white whitespace-pre-wrap">{response}</div>}
      </div>
      {onVote && <button onClick={onVote} className={`w-full p-4 ${bgClass} hover:bg-opacity-50 transition-colors font-bold uppercase tracking-wider`}>🗳️ Vote for {label}</button>}
      {isWinner && <div className="p-3 bg-arcade-green/20 text-arcade-green text-center font-bold">🏆 WINNER</div>}
    </motion.div>
  );
}

function MultiResponseCard({ model, response, loading, isWinner, showModel, onVote }: { model: Model; response: string; loading: boolean; isWinner: boolean; showModel: boolean; onVote?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`response-card rounded-xl border-2 border-arcade-purple/50 ${isWinner ? 'border-arcade-green bg-arcade-green/10' : ''} overflow-hidden`}>
      <div className="p-3 bg-arcade-purple/10 flex items-center justify-between">
        {showModel ? <span className="flex items-center gap-2"><span>{model.icon}</span><span className="text-sm font-medium">{model.shortName}</span></span> : <span className="text-gray-500 text-sm">??? (Hidden)</span>}
        <span className="text-xs text-arcade-cyan">{model.elo} ELO</span>
      </div>
      <div className="p-3 h-64 overflow-y-auto bg-arcade-dark/30 text-sm">
        {loading ? <div className="text-gray-400 typing-cursor">{response || 'Generating...'}</div> : <div className="text-white whitespace-pre-wrap">{response}</div>}
      </div>
      {onVote && <button onClick={onVote} className="w-full p-3 bg-arcade-purple/10 hover:bg-arcade-purple/20 transition-colors font-bold text-sm">🗳️ Vote</button>}
      {isWinner && <div className="p-2 bg-arcade-green/20 text-arcade-green text-center font-bold text-sm">🏆 WINNER</div>}
    </motion.div>
  );
}

function EloChangeDisplay({ model, change, isWinner }: { model: Model; change: number; isWinner: boolean }) {
  return (
    <div className="text-center">
      <div className="text-3xl mb-1">{model.icon}</div>
      <div className="font-medium">{model.shortName}</div>
      <div className={`text-xl font-bold ${change > 0 ? 'text-arcade-green' : 'text-arcade-red'}`}>{formatEloChange(change)}</div>
      {isWinner && <div className="text-arcade-yellow text-sm">🏆</div>}
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-arcade-purple text-2xl animate-pulse">Loading Battle...</div></div>}>
      <BattleContent />
    </Suspense>
  );
}
