import React from 'react';
import { motion } from 'motion/react';
import { AircraftType, AIRCRAFT_PRESETS, Upgrades, UPGRADE_COSTS, HighScore } from '../types';
import { 
  Play, 
  Shield, 
  Zap, 
  Coins, 
  Trophy, 
  Activity, 
  Volume2, 
  VolumeX, 
  Info, 
  Sparkles,
  RefreshCw,
  Rocket
} from 'lucide-react';
import { audioManager } from '../audio';

interface MenuProps {
  upgrades: Upgrades;
  coins: number;
  highScores: HighScore[];
  onStartGame: (aircraft: AircraftType) => void;
  onBuyUpgrade: (category: keyof Upgrades) => void;
  onResetData: () => void;
}

export default function Menu({
  upgrades,
  coins,
  highScores,
  onStartGame,
  onBuyUpgrade,
  onResetData,
}: MenuProps) {
  const [selectedPlane, setSelectedPlane] = React.useState<AircraftType>('P38');
  const [isMuted, setIsMuted] = React.useState(audioManager.getMute());
  const [activeTab, setActiveTab] = React.useState<'MENU' | 'UPGRADE' | 'SCORES'>('MENU');

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioManager.setMute(newMute);
    if (!newMute) {
      audioManager.startMusic();
    } else {
      audioManager.stopMusic();
    }
  };

  const currentPlane = AIRCRAFT_PRESETS[selectedPlane];

  // Helper to draw horizontal stat meters
  const renderStatMeter = (label: string, value: number, max: number, colorClass: string) => {
    return (
      <div className="flex flex-col gap-1 w-full text-xs font-mono">
        <div className="flex justify-between text-slate-300">
          <span>{label}</span>
          <span>{value}/{max}</span>
        </div>
        <div className="w-full bg-slate-800 border border-slate-700 h-2.5 rounded-full overflow-hidden flex">
          <div 
            className={`h-full ${colorClass}`}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      id="retro-menu-container" 
      className="w-full min-h-screen bg-cyber-dark flex flex-col justify-center items-center text-white relative font-sans p-4 select-none overflow-y-auto"
    >
      {/* Decorative starry grid backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.06)_0%,rgba(5,5,5,0.98)_100%)] z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 z-0" />

      {/* Retro Title banner */}
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 max-w-xl w-full flex flex-col items-center pt-6"
      >
        <div className="inline-flex items-center gap-1.5 bg-neon-red/10 border border-neon-red/30 text-neon-red font-mono text-xs px-3 py-1 rounded-sm uppercase tracking-widest mb-3 animate-pulse shadow-md neon-text-red">
          <Rocket className="w-3.5 h-3.5" />
          <span>TACTICAL SHMUP CONSOLE</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black font-mono tracking-tighter bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] neon-text-cyan">
          1945 RETRO
        </h1>
        <p className="text-xs md:text-sm font-mono text-neon-cyan tracking-widest uppercase mt-1 mb-8 neon-text-cyan">
          - PACIFIC AIR COMBAT SIMULATOR -
        </p>
      </motion.div>

      {/* Main Container Core Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-cyber-panel/90 border border-neon-cyan/35 rounded-2xl w-full max-w-4xl p-5 md:p-8 shadow-2xl z-10 flex flex-col gap-6 backdrop-blur-md neon-border-cyan"
      >
        {/* Navigation Tabs bar */}
        <div className="flex border-b border-slate-800 gap-1 pb-1">
          <button
            id="tab-btn-menu"
            onClick={() => { audioManager.playPowerup(); setActiveTab('MENU'); }}
            className={`flex-1 py-3 text-sm font-bold font-mono tracking-wider transition-all duration-200 uppercase rounded-t-lg ${
              activeTab === 'MENU' 
                ? 'bg-black/90 text-neon-cyan border-b-2 border-neon-cyan neon-text-cyan' 
                : 'text-slate-500 hover:text-white hover:bg-black/40'
            }`}
          >
            🕹️ ENGAGE COMBAT // 출격
          </button>
          <button
            id="tab-btn-upgrade"
            onClick={() => { audioManager.playPowerup(); setActiveTab('UPGRADE'); }}
            className={`flex-1 py-3 text-sm font-bold font-mono tracking-wider transition-all duration-200 uppercase rounded-t-lg flex justify-center items-center gap-2 ${
              activeTab === 'UPGRADE' 
                ? 'bg-black/90 text-neon-yellow border-b-2 border-neon-yellow neon-text-yellow' 
                : 'text-slate-500 hover:text-white hover:bg-black/40'
            }`}
          >
            🔧 HANGAR UPGRADES // 강화
            {coins > 0 && (
              <span className="bg-neon-yellow/10 border border-neon-yellow/30 text-neon-yellow text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                <Coins className="w-3 h-3" />
                {coins}
              </span>
            )}
          </button>
          <button
            id="tab-btn-scores"
            onClick={() => { audioManager.playPowerup(); setActiveTab('SCORES'); }}
            className={`flex-1 py-3 text-sm font-bold font-mono tracking-wider transition-all duration-200 uppercase rounded-t-lg ${
              activeTab === 'SCORES' 
                ? 'bg-black/90 text-neon-red border-b-2 border-neon-red neon-text-red' 
                : 'text-slate-500 hover:text-white hover:bg-black/40'
            }`}
          >
            🏆 HALL OF ACES // 전적
          </button>
        </div>

        {/* Tab 1: Plane Select & Start */}
        {activeTab === 'MENU' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Plane options selector cards */}
            <div className="flex-1 flex flex-col gap-3">
              <h2 className="text-xs font-bold font-mono text-neon-cyan uppercase tracking-widest mb-1 neon-text-cyan">
                SELECT FIGHTER CHASSIS // 기종 선택
              </h2>
              
              {(Object.keys(AIRCRAFT_PRESETS) as AircraftType[]).map((type) => {
                const info = AIRCRAFT_PRESETS[type];
                const isSelected = selectedPlane === type;
                return (
                  <button
                    key={type}
                    id={`plane-select-${type}`}
                    onClick={() => { audioManager.playShoot(); setSelectedPlane(type); }}
                    className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all duration-200 ${
                      isSelected 
                        ? 'bg-black/90 border-neon-cyan neon-border-cyan shadow-lg text-neon-cyan' 
                        : 'bg-black/30 border-slate-800/80 hover:bg-black/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                          isSelected ? 'bg-black border-2 border-neon-cyan neon-border-cyan' : 'bg-black border border-slate-800'
                        }`}
                      >
                        ✈️
                      </div>
                      <div>
                        <div className="font-bold font-mono text-base flex items-center gap-2">
                          <span style={{ color: isSelected ? undefined : info.color }}>{info.name}</span>
                          {type === 'P38' && <span className="bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">BALANCED</span>}
                          {type === 'SPITFIRE' && <span className="bg-neon-yellow/10 border border-neon-yellow/30 text-neon-yellow text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">AGILITY SPEED</span>}
                          {type === 'ZERO' && <span className="bg-neon-red/10 border border-neon-red/30 text-neon-red text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">HEAVY STREAM</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-mono">{info.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Spec breakdown details of selected fighter */}
            <div className="w-full lg:w-96 bg-black/80 rounded-xl border border-slate-800 p-6 flex flex-col justify-between gap-5 hover:border-neon-cyan/30 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Info className="w-4 h-4 text-neon-cyan" />
                  <span className="font-mono text-xs text-slate-300 uppercase tracking-widest">TELEMETRY STATS // 기체 성능 명세</span>
                </div>

                <div className="space-y-4">
                  {renderStatMeter('기동 속도 (SPEED)', currentPlane.speed, 8, 'bg-neon-cyan')}
                  {renderStatMeter('기체 내구도 (MAX HP)', currentPlane.baseHp, 150, 'bg-neon-yellow')}
                  {renderStatMeter('기본 연사력 (FIRE RATE)', 200 - currentPlane.fireRate, 100, 'bg-neon-red')}
                </div>

                <div className="bg-black/50 p-4 rounded-lg border border-slate-800 mt-2">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">PRIMARY ARMANENTS // 기본 탑재 무장</div>
                  <div className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-2 font-mono">
                    <Zap className="w-4 h-4 text-neon-cyan inline" />
                    {currentPlane.weaponDescription}
                  </div>
                </div>
              </div>

              {/* Huge Play trigger */}
              <button
                id="btn-start-combat"
                onClick={() => onStartGame(selectedPlane)}
                className="w-full bg-black hover:bg-neon-red/15 active:scale-95 text-neon-red text-base font-mono font-black uppercase py-4 rounded-lg shadow-lg border border-neon-red neon-shadow-inset-red flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                LAUNCH COMBAT SORTIE // 출격하기
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Retro Upgrade Shop */}
        {activeTab === 'UPGRADE' && (
          <div className="flex flex-col gap-5">
            {/* Coin balance indicator */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/50 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 font-mono text-left">
                <Info className="w-4 h-4 text-neon-cyan shrink-0" />
                <span className="text-xs text-slate-400">수집한 동맹군 격전지 금화를 투입하여 기체 시스템을 하드웨어 레벨에서 영구적으로 업그레이드 하십시오.</span>
              </div>
              <div className="flex items-center gap-2 bg-neon-yellow/10 border border-neon-yellow/40 px-4 py-2 rounded-lg text-neon-yellow font-black text-lg font-mono neon-shadow-inset-yellow neon-text-yellow shrink-0">
                <Coins className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                <span>{coins} COINS</span>
              </div>
            </div>

            {/* Upgrade grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'damage', label: '주무기 파괴력 강화 (Damage)', desc: '적에게 입히는 탄환 기본 공격력을 영구히 올립니다.', icon: <Zap className="w-5 h-5 text-neon-yellow" /> },
                { key: 'fireRate', label: '무장 연사 속도 강화 (Fire Rate)', desc: '탄환 발사 대기시간을 줄여 속사 화망을 구성합니다.', icon: <Activity className="w-5 h-5 text-neon-red" /> },
                { key: 'shieldDuration', label: '에너지 실드 강화 (Shield)', desc: '보호막 캡슐 획득 시 지속 시간(초)을 연장합니다.', icon: <Shield className="w-5 h-5 text-neon-cyan" /> },
                { key: 'bombsCount', label: '시작 폭탄 슬롯 (Bombs)', desc: '출격 시 기본 소지하는 긴급 탈출 폭탄 수를 늘립니다.', icon: <Sparkles className="w-5 h-5 text-neon-yellow" /> },
                { key: 'magnet', label: '자성 유도체 확장 (Magnet)', desc: '금화와 아이템을 끌어당기는 자기장 범위를 확장합니다.', icon: <RefreshCw className="w-5 h-5 text-neon-cyan" /> },
              ].map((up) => {
                const currentLevel = upgrades[up.key as keyof Upgrades];
                const isMax = currentLevel >= 5;
                const cost = isMax ? 0 : UPGRADE_COSTS[up.key as keyof typeof UPGRADE_COSTS][currentLevel];
                const canAfford = coins >= cost;

                return (
                  <div key={up.key} className="bg-black/70 rounded-lg border border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-neon-cyan/25 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-sm bg-cyber-panel border border-slate-800 mt-0.5">
                        {up.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm md:text-base text-slate-200 font-mono">{up.label}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-black border border-slate-800 text-slate-400 rounded">
                            {isMax ? 'MAX' : `LV.${currentLevel}/5`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-mono">{up.desc}</p>
                      </div>
                    </div>

                    {/* Progress block level dots */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <div 
                          key={dot}
                          className={`flex-1 h-1.5 rounded-sm transition-all duration-300 ${
                            dot <= currentLevel ? 'bg-neon-cyan neon-shadow-inset-cyan shadow-[0_0_5px_#00ffff]' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Buy Action */}
                    <button
                      id={`btn-upgrade-${up.key}`}
                      onClick={() => {
                        if (!isMax && canAfford) {
                          onBuyUpgrade(up.key as keyof Upgrades);
                        }
                      }}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                        isMax 
                          ? 'bg-black text-slate-600 border-slate-800 cursor-not-allowed' 
                          : canAfford 
                            ? 'bg-black border-neon-cyan text-neon-cyan hover:bg-neon-cyan/15 active:scale-95 neon-shadow-inset-cyan cursor-pointer' 
                            : 'bg-black border-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                      disabled={isMax || !canAfford}
                    >
                      {isMax ? (
                        '최대 강화 달성 완료 // SYSTEM MAXIMUM'
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>INSTALL MODULE: {cost} COINS</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Local Leaderboard High Scores */}
        {activeTab === 'SCORES' && (
          <div className="flex flex-col gap-5 max-w-xl mx-auto w-full">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-neon-yellow mx-auto animate-bounce mt-2 neon-text-yellow" />
              <h3 className="text-lg font-bold font-mono tracking-wider text-slate-200 mt-2 neon-text-yellow">ALLIED FORCES LEADERBOARD // 에이스 전당</h3>
              <p className="text-xs text-slate-400 font-mono tracking-wider">공중전 영웅전들의 기말 보관 등재 부호 리스트입니다.</p>
            </div>

            <div className="bg-black/50 border border-slate-800 rounded-lg overflow-hidden hover:border-neon-cyan/25 transition-colors">
              <div className="flex bg-black border-b border-slate-800 p-4 font-mono text-xs text-slate-400 uppercase font-bold text-center">
                <span className="w-12">순위</span>
                <span className="flex-1 text-left px-3">조종사 호출부호</span>
                <span className="w-24">탑승 기체</span>
                <span className="w-28 text-right">최종 점수</span>
              </div>

              {highScores.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs tracking-wider">
                  NO ACES DECLARED YET. ENGAGE THE SQUADRONS TO RECORD REPORT!
                </div>
              ) : (
                <div className="divide-y divide-slate-900 font-mono text-sm">
                  {highScores.map((score, idx) => (
                    <div key={idx} className="flex p-4 items-center text-center">
                      <span className="w-12 text-center font-bold text-xs">
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                        {idx > 2 && `${idx + 1}`}
                      </span>
                      <span className="flex-1 text-left px-3 font-bold text-slate-200 font-mono">{score.name}</span>
                      <span className="w-24 text-slate-400 text-xs text-center font-mono">{AIRCRAFT_PRESETS[score.aircraft]?.name || score.aircraft}</span>
                      <span className="w-28 text-right font-black text-neon-yellow neon-text-yellow">{score.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Stats system */}
            <div className="text-center mt-4">
              <button
                id="btn-reset-data"
                onClick={() => {
                  if (confirm('모든 강화 정보와 하이스코어 데이터를 삭제하시겠습니까?')) {
                    onResetData();
                  }
                }}
                className="text-xs text-neon-red hover:text-white border border-neon-red/30 hover:bg-neon-red/15 px-3 py-1.5 rounded transition-all font-mono bg-black cursor-pointer"
              >
                HARD SYSTEM PURGE // 기밀 기록 초기화
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Footer controls HUD bar */}
      <div className="z-10 mt-8 flex gap-4 text-xs font-mono text-slate-500 items-center justify-center tracking-wider">
        <button
          id="btn-menu-mute"
          onClick={toggleMute}
          className="flex items-center gap-1.5 hover:text-white transition-colors bg-black border border-slate-800 px-3 py-1.5 rounded-sm cursor-pointer text-slate-400"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isMuted ? 'UNMUTE COMMS' : 'MUTE COMMS'}</span>
        </button>

        <span>•</span>
        <span>HTML5 CANVAS 2D COCKPIT</span>
        <span>•</span>
        <span>LOCAL PERSISTENCE ACC_V1</span>
      </div>
    </div>
  );
}
