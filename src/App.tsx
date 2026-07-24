import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Menu from './components/Menu';
import GameCanvas from './components/GameCanvas';
import { AircraftType, Upgrades, HighScore, AIRCRAFT_PRESETS } from './types';
import { Trophy, Coins, Award, Compass, RefreshCw, VolumeX, Volume2 } from 'lucide-react';
import { audioManager } from './audio';

const STORAGE_KEYS = {
  UPGRADES: '1945_retro_upgrades',
  COINS: '1945_retro_coins',
  HIGH_SCORES: '1945_retro_high_scores',
};

const DEFAULT_UPGRADES: Upgrades = {
  damage: 0,
  fireRate: 0,
  shieldDuration: 0,
  bombsCount: 0,
  magnet: 0,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'MENU' | 'GAME' | 'DEBRIEF'>('MENU');
  
  // Game states
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftType>('P38');
  const [coins, setCoins] = useState<number>(0);
  const [upgrades, setUpgrades] = useState<Upgrades>(DEFAULT_UPGRADES);
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // Current session stats for Debrief
  const [sessionStats, setSessionStats] = useState({
    score: 0,
    coinsEarned: 0,
    stageReached: 1,
  });

  const [pilotName, setPilotName] = useState('');
  const [isScoreSaved, setIsScoreSaved] = useState(false);

  // Load state from LocalStorage on mount
  useEffect(() => {
    try {
      const savedUpgrades = localStorage.getItem(STORAGE_KEYS.UPGRADES);
      if (savedUpgrades) setUpgrades(JSON.parse(savedUpgrades));

      const savedCoins = localStorage.getItem(STORAGE_KEYS.COINS);
      if (savedCoins) setCoins(Number(savedCoins));

      const savedScores = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
      if (savedScores) setHighScores(JSON.parse(savedScores));
    } catch (e) {
      console.warn('Could not read from local storage', e);
    }
  }, []);

  // Save changes to LocalStorage
  const saveUpgrades = (newUpgrades: Upgrades) => {
    setUpgrades(newUpgrades);
    localStorage.setItem(STORAGE_KEYS.UPGRADES, JSON.stringify(newUpgrades));
  };

  const saveCoins = (newCoins: number) => {
    setCoins(newCoins);
    localStorage.setItem(STORAGE_KEYS.COINS, String(newCoins));
  };

  const saveScores = (newScores: HighScore[]) => {
    setHighScores(newScores);
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(newScores));
  };

  // Upgrading logic
  const handleBuyUpgrade = (category: keyof Upgrades) => {
    const currentLevel = upgrades[category];
    if (currentLevel >= 5) return; // already max

    const costs = {
      damage: [150, 300, 600, 1200, 2500],
      fireRate: [150, 300, 600, 1200, 2500],
      shieldDuration: [100, 200, 400, 800, 1500],
      bombsCount: [200, 400, 800, 1600, 3000],
      magnet: [100, 200, 400, 800, 1500]
    };

    const cost = costs[category][currentLevel];
    if (coins >= cost) {
      const updated = { ...upgrades, [category]: currentLevel + 1 };
      saveUpgrades(updated);
      saveCoins(coins - cost);
      audioManager.playPowerup();
    }
  };

  // Reset entire account data
  const handleResetData = () => {
    setUpgrades(DEFAULT_UPGRADES);
    setCoins(0);
    setHighScores([]);
    localStorage.removeItem(STORAGE_KEYS.UPGRADES);
    localStorage.removeItem(STORAGE_KEYS.COINS);
    localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
    audioManager.playGameOver();
  };

  // Start the battle!
  const handleStartGame = (aircraft: AircraftType) => {
    setSelectedAircraft(aircraft);
    setCurrentScreen('GAME');
    audioManager.playPowerup();
  };

  // Finish current run and move to Pilot Debriefing screen
  const handleGameOver = (finalScore: number, finalCoins: number, stage: number) => {
    // Save coins earned
    const updatedCoins = coins + finalCoins;
    saveCoins(updatedCoins);

    setSessionStats({
      score: finalScore,
      coinsEarned: finalCoins,
      stageReached: stage,
    });
    
    // Reset pilots submission state
    setPilotName('');
    setIsScoreSaved(false);
    setCurrentScreen('DEBRIEF');
  };

  // Save score to local leaderboard
  const handleSaveHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilotName.trim() || isScoreSaved) return;

    const newScore: HighScore = {
      name: pilotName.trim().toUpperCase(),
      score: sessionStats.score,
      aircraft: selectedAircraft,
      date: new Date().toLocaleDateString(),
    };

    const updated = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // keep only top 10 aces

    saveScores(updated);
    setIsScoreSaved(true);
    audioManager.playPowerup();
  };

  // Exit game back to main menu
  const handleGameExit = () => {
    setCurrentScreen('MENU');
    audioManager.stopMusic();
  };

  return (
    <div id="app-root-container" className="w-full h-screen flex flex-col bg-cyber-dark text-white select-none overflow-hidden scanlines font-sans">
      <AnimatePresence mode="wait">
        {/* VIEW 1: Main Menu & Setup */}
        {currentScreen === 'MENU' && (
          <motion.div
            key="screen-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Menu
              upgrades={upgrades}
              coins={coins}
              highScores={highScores}
              onStartGame={handleStartGame}
              onBuyUpgrade={handleBuyUpgrade}
              onResetData={handleResetData}
            />
          </motion.div>
        )}

        {/* VIEW 2: Dynamic Canvas Combat */}
        {currentScreen === 'GAME' && (
          <motion.div
            key="screen-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <GameCanvas
              selectedAircraft={selectedAircraft}
              upgrades={upgrades}
              onGameOver={handleGameOver}
              onGameExit={handleGameExit}
            />
          </motion.div>
        )}

        {/* VIEW 3: Pilot Debriefing / Score Submission Screen */}
        {currentScreen === 'DEBRIEF' && (
          <motion.div
            key="screen-debrief"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center p-4 relative"
          >
            {/* Dark layout overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,51,0.12)_0%,rgba(5,5,5,0.98)_100%)] z-0" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 z-0" />

            <div className="bg-cyber-panel/90 border border-neon-red/40 rounded-2xl w-full max-w-xl p-6 md:p-8 shadow-2xl z-10 flex flex-col gap-6 backdrop-blur-md text-center max-h-[95vh] overflow-y-auto neon-border-red">
              <div>
                <span className="text-xs font-mono font-bold tracking-widest text-neon-red bg-neon-red/10 border border-neon-red/30 px-3 py-1 rounded-sm uppercase inline-block">
                  SYSTEM STATUS: MIS_END // 전과 보고
                </span>
                <h2 className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white mt-3 uppercase neon-text-red">
                  조종사 귀환 보고서
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1 tracking-wider">
                  TACTICAL DEBRIEFING ENGAGED • PACIFIC COALESCENCE
                </p>
              </div>

              {/* Stats overview boxes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col items-center hover:border-neon-yellow/30 transition-colors">
                  <Trophy className="w-6 h-6 text-neon-yellow mb-1" />
                  <span className="text-[10px] font-mono text-slate-400">최종 점수</span>
                  <span className="text-lg font-black font-mono mt-1 text-neon-yellow neon-text-yellow">
                    {sessionStats.score.toLocaleString()}
                  </span>
                </div>

                <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col items-center hover:border-neon-cyan/30 transition-colors">
                  <Coins className="w-6 h-6 text-neon-cyan mb-1" />
                  <span className="text-[10px] font-mono text-slate-400">금화 획득</span>
                  <span className="text-lg font-black font-mono mt-1 text-neon-cyan neon-text-cyan">
                    +{sessionStats.coinsEarned}
                  </span>
                </div>

                <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col items-center hover:border-neon-red/30 transition-colors">
                  <Award className="w-6 h-6 text-neon-red mb-1" />
                  <span className="text-[10px] font-mono text-slate-400">생존 구역</span>
                  <span className="text-lg font-black font-mono mt-1 text-neon-red neon-text-red">
                    STAGE {sessionStats.stageReached}
                  </span>
                </div>
              </div>

              {/* Selected pilot plane showcase */}
              <div className="bg-black/50 p-4 rounded-lg border border-slate-800 text-left flex items-center gap-3.5">
                <div className="text-2xl p-1.5 rounded-sm bg-cyber-panel border border-slate-800 text-neon-cyan">
                  ✈️
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-500 tracking-wider">PILOT ACTIVE CHASSIS // 참전 기체</div>
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {AIRCRAFT_PRESETS[selectedAircraft]?.name}
                  </div>
                </div>
              </div>

              {/* Score Saving Form */}
              <div className="border-t border-slate-800 pt-5">
                {isScoreSaved ? (
                  <div className="bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm font-mono p-4 rounded-lg flex items-center justify-center gap-2 neon-shadow-inset-cyan">
                    <span>✓ PILOT RECORDS EXCHANGED SECURELY WITH HQ</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveHighScore} className="flex flex-col gap-3">
                    <label className="text-xs font-mono font-bold text-slate-400 text-left tracking-widest uppercase">
                      ENTER CALLSIGN FOR HIGH SCORE RECORD // 조종사 코드 입력:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="input-pilot-name"
                        type="text"
                        maxLength={8}
                        placeholder="PILOT CODE"
                        value={pilotName}
                        onChange={(e) => setPilotName(e.target.value)}
                        className="flex-1 bg-black border border-slate-800 focus:border-neon-cyan rounded-lg px-4 py-3 text-sm font-mono tracking-widest text-neon-cyan uppercase outline-none transition-all duration-200"
                        required
                      />
                      <button
                        id="btn-submit-score"
                        type="submit"
                        disabled={!pilotName.trim()}
                        className="bg-black hover:bg-neon-cyan/20 active:scale-95 text-neon-cyan font-black font-mono text-xs uppercase px-5 rounded-lg border border-neon-cyan/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 neon-shadow-inset-cyan"
                      >
                        RECORD DATA
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Action Back Button */}
              <div className="flex gap-3">
                <button
                  id="btn-return-menu"
                  onClick={() => {
                    audioManager.playPowerup();
                    setCurrentScreen('MENU');
                  }}
                  className="flex-1 bg-black hover:bg-neon-red/15 active:scale-95 text-neon-red py-3.5 rounded-lg text-sm font-mono font-bold uppercase transition-all duration-200 tracking-wider border border-neon-red/40 neon-shadow-inset-red"
                >
                  RETURN TO SECTOR SELECTION // 대기 화면으로
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
