export type AircraftType = 'P38' | 'SPITFIRE' | 'ZERO';

export interface AircraftInfo {
  type: AircraftType;
  name: string;
  description: string;
  speed: number;
  baseHp: number;
  fireRate: number; // millisecond cooldown
  weaponDescription: string;
  color: string;
  accentColor: string;
}

export const AIRCRAFT_PRESETS: Record<AircraftType, AircraftInfo> = {
  P38: {
    type: 'P38',
    name: 'P-38 Lightning',
    description: 'A balanced classic fighter with high speed and twin straight lasers.',
    speed: 5.5,
    baseHp: 100,
    fireRate: 150,
    weaponDescription: 'Dual straight energy bolts.',
    color: '#38bdf8', // Light blue
    accentColor: '#f43f5e', // Rose
  },
  SPITFIRE: {
    type: 'SPITFIRE',
    name: 'Supermarine Spitfire',
    description: 'Extremely fast and agile, deploying a spreading fire layout.',
    speed: 6.5,
    baseHp: 80,
    fireRate: 180,
    weaponDescription: 'Spreading multi-shot spray.',
    color: '#4ade80', // Green
    accentColor: '#eab308', // Yellow
  },
  ZERO: {
    type: 'ZERO',
    name: 'Mitsubishi A6M Zero',
    description: 'Heavy armor and maximum focus fire. Devastating close-range punch.',
    speed: 4.5,
    baseHp: 130,
    fireRate: 120,
    weaponDescription: 'High frequency heavy plasma stream.',
    color: '#a855f7', // Purple
    accentColor: '#f97316', // Orange
  }
};

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  damage: number;
  size: number;
  color: string;
  angle?: number;
  type?: 'NORMAL' | 'LASER' | 'MISSILE' | 'WAVE' | 'HEAVY';
}

export type EnemyType = 'SCOUT' | 'BOMBER' | 'KAMIKAZE' | 'GUNSHIP';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  size: number;
  shootCooldown: number;
  scoreValue: number;
  coinValue: number;
  color: string;
  stateTime: number; // For pattern behaviors
}

export interface BossTurret {
  id: string;
  offsetX: number;
  offsetY: number;
  hp: number;
  maxHp: number;
  angle: number;
  shootCooldown: number;
  size: number;
  color: string;
  type: 'RAPID' | 'SPREAD' | 'LASER';
}

export interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  turrets: BossTurret[];
  shootCooldown: number;
  patternTime: number;
  phase: number;
  isActive: boolean;
}

export type PowerUpType = 'POWER' | 'BOMB' | 'HEAL' | 'SHIELD' | 'COIN';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PowerUpType;
  size: number;
}

export type ParticleType = 'SPARK' | 'SMOKE' | 'DEBRIS' | 'SHOCKWAVE' | 'TEXT';

export interface Particle {
  id: string;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  text?: string;
  angle?: number;
  spin?: number;
}

export interface BackgroundElement {
  id: string;
  type: 'CLOUD' | 'ISLAND';
  x: number;
  y: number;
  vy: number;
  size: number;
  color: string;
  rotation?: number;
  points?: { x: number; y: number }[]; // For islands to draw random shapes
}

export interface HighScore {
  name: string;
  score: number;
  aircraft: AircraftType;
  date: string;
}

export interface Upgrades {
  damage: number;       // Level 0-5
  fireRate: number;     // Level 0-5
  shieldDuration: number; // Level 0-5
  bombsCount: number;   // Level 0-5
  magnet: number;       // Level 0-5
}

export const UPGRADE_COSTS = {
  damage: [150, 300, 600, 1200, 2500],
  fireRate: [150, 300, 600, 1200, 2500],
  shieldDuration: [100, 200, 400, 800, 1500],
  bombsCount: [200, 400, 800, 1600, 3000],
  magnet: [100, 200, 400, 800, 1500]
};
