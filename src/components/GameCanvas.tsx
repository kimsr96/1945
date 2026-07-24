import React, { useEffect, useRef, useState } from 'react';
import { 
  AircraftType, 
  AIRCRAFT_PRESETS, 
  Bullet, 
  Enemy, 
  EnemyType, 
  Boss, 
  BossTurret, 
  PowerUp, 
  PowerUpType, 
  Particle, 
  BackgroundElement, 
  Upgrades 
} from '../types';
import { audioManager } from '../audio';
import { Shield, Sparkles, AlertTriangle, Zap, Volume2, VolumeX } from 'lucide-react';

interface GameCanvasProps {
  selectedAircraft: AircraftType;
  upgrades: Upgrades;
  onGameOver: (score: number, coins: number, stage: number) => void;
  onGameExit: () => void;
}

export default function GameCanvas({
  selectedAircraft,
  upgrades,
  onGameOver,
  onGameExit,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core Game State Refs to bypass React re-render lag in the 60fps loop
  const stateRef = useRef({
    score: 0,
    coins: 0,
    stage: 1,
    playerHp: 100,
    playerMaxHp: 100,
    playerX: 0,
    playerY: 0,
    playerRadius: 18,
    isShieldActive: false,
    shieldTimeLeft: 0,
    bombsRemaining: 3,
    weaponLevel: 1, // Max 4
    isGameOver: false,
    screenShake: 0,
    isBossActive: false,
    stageProgress: 0, // 0 to 100% until boss spawn
    isMuted: audioManager.getMute(),
    autoFire: true,

    // Controls
    keys: {} as Record<string, boolean>,
    touchActive: false,
    touchX: 0,
    touchY: 0,

    // Entities lists
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerups: [] as PowerUp[],
    particles: [] as Particle[],
    bgElements: [] as BackgroundElement[],
    boss: null as Boss | null,

    // Cooldown timers (ms)
    lastShotTime: 0,
    lastEnemySpawn: 0,
    lastCloudSpawn: 0,
    lastIslandSpawn: 0,
    bossDefeatedTime: 0,
    bombVisualActive: 0, // timestamp for bomb flash duration
  });

  const [hudState, setHudState] = useState({
    score: 0,
    coins: 0,
    stage: 1,
    playerHp: 100,
    playerMaxHp: 100,
    bombs: 3,
    weaponLevel: 1,
    stageProgress: 0,
    isBossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    isMuted: audioManager.getMute(),
  });

  // Keep HUD updated from high-speed game loop without killing performance (e.g. 10fps tick)
  useEffect(() => {
    const hudInterval = setInterval(() => {
      const state = stateRef.current;
      setHudState({
        score: state.score,
        coins: state.coins,
        stage: state.stage,
        playerHp: Math.max(0, state.playerHp),
        playerMaxHp: state.playerMaxHp,
        bombs: state.bombsRemaining,
        weaponLevel: state.weaponLevel,
        stageProgress: state.stageProgress,
        isBossActive: state.isBossActive,
        bossHp: state.boss?.hp || 0,
        bossMaxHp: state.boss?.maxHp || 1,
        isMuted: state.isMuted,
      });

      if (state.isGameOver) {
        clearInterval(hudInterval);
        onGameOver(state.score, state.coins, state.stage);
      }
    }, 100);

    return () => clearInterval(hudInterval);
  }, [onGameOver]);

  // Handle Mute Button toggle
  const toggleMute = () => {
    const newMute = !stateRef.current.isMuted;
    stateRef.current.isMuted = newMute;
    audioManager.setMute(newMute);
    if (!newMute) {
      audioManager.startMusic();
    } else {
      audioManager.stopMusic();
    }
    setHudState(prev => ({ ...prev, isMuted: newMute }));
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      stateRef.current.keys[e.key] = true;
      stateRef.current.keys[e.key.toLowerCase()] = true;

      // Prevent window scrolling when playing the game with arrow keys, space, or WASD
      const gameCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyB'];
      const gameKeys = [' ', 'w', 'a', 's', 'd', 'b', 'W', 'A', 'S', 'D', 'B', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ㅈ', 'ㅁ', 'ㄴ', 'ㅇ', 'ㅠ'];
      if (gameCodes.includes(e.code) || gameKeys.includes(e.key)) {
        e.preventDefault();
      }

      // Trigger Bomb on 'B' Key (Korean layout: 'ㅠ')
      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'ㅠ') {
        triggerScreenClearingBomb();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = false;
      stateRef.current.keys[e.key] = false;
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Initial setup for Audio context
    const firstInteraction = () => {
      if (!stateRef.current.isMuted) {
        audioManager.startMusic();
      }
      window.removeEventListener('click', firstInteraction);
      window.removeEventListener('keydown', firstInteraction);
    };
    window.addEventListener('click', firstInteraction);
    window.addEventListener('keydown', firstInteraction);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', firstInteraction);
      window.removeEventListener('keydown', firstInteraction);
      audioManager.stopMusic();
    };
  }, []);

  // Trigger screen-clearing bomb
  const triggerScreenClearingBomb = () => {
    const state = stateRef.current;
    if (state.bombsRemaining > 0 && !state.isGameOver && state.bombVisualActive === 0) {
      state.bombsRemaining--;
      state.bombVisualActive = Date.now();
      state.screenShake = 30;
      audioManager.playBomb();

      // Spawn shockwave particles
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          const speed = 10 + Math.random() * 8;
          state.particles.push({
            id: Math.random().toString(),
            type: 'SHOCKWAVE',
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#38bdf8',
            size: 6 + Math.random() * 8,
            alpha: 1,
            life: 0,
            maxLife: 60 + Math.random() * 40,
          });
        }
      }

      // Damage boss or clear enemies
      state.enemies.forEach(enemy => {
        enemy.hp -= 250;
        // Explode triggers inside loop
        for (let j = 0; j < 8; j++) {
          state.particles.push({
            id: Math.random().toString(),
            type: 'SPARK',
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: '#f43f5e',
            size: 2 + Math.random() * 3,
            alpha: 1,
            life: 0,
            maxLife: 30,
          });
        }
      });

      // Erase all enemy bullets
      state.bullets = state.bullets.filter(b => !b.isEnemy);

      // Damage boss if present
      if (state.boss) {
        state.boss.hp -= 350;
        // Damage turrets
        state.boss.turrets.forEach(t => {
          t.hp -= 100;
        });
      }
    }
  };

  // Resize canvas responsively
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;

        // Initialize player position to bottom-center of canvas on first load
        if (stateRef.current.playerX === 0 && stateRef.current.playerY === 0) {
          stateRef.current.playerX = width / 2;
          stateRef.current.playerY = height * 0.8;
          stateRef.current.playerMaxHp = AIRCRAFT_PRESETS[selectedAircraft].baseHp;
          stateRef.current.playerHp = AIRCRAFT_PRESETS[selectedAircraft].baseHp;
          stateRef.current.bombsRemaining = 2 + upgrades.bombsCount;
        }
      }
    });

    resizeObserver.observe(container);

    // Seed initial background islands & clouds
    const state = stateRef.current;
    for (let i = 0; i < 5; i++) {
      state.bgElements.push(createBgElement('CLOUD', Math.random() * 600, Math.random() * 800));
    }
    for (let i = 0; i < 3; i++) {
      state.bgElements.push(createBgElement('ISLAND', Math.random() * 600, Math.random() * 800));
    }

    return () => resizeObserver.disconnect();
  }, [selectedAircraft, upgrades]);

  // Helper to create Background Clouds & Islands
  const createBgElement = (type: 'CLOUD' | 'ISLAND', forceX?: number, forceY?: number): BackgroundElement => {
    const canvas = canvasRef.current;
    const width = canvas?.width || 600;
    const x = forceX !== undefined ? forceX : Math.random() * width;
    const y = forceY !== undefined ? forceY : -150; // spawn off-screen top

    if (type === 'CLOUD') {
      return {
        id: Math.random().toString(),
        type: 'CLOUD',
        x,
        y,
        vy: 1 + Math.random() * 1.5,
        size: 50 + Math.random() * 70,
        color: `rgba(255, 255, 255, ${0.1 + Math.random() * 0.12})`,
      };
    } else {
      // Create interesting island shapes via polygon points
      const size = 60 + Math.random() * 120;
      const pointsCount = 6 + Math.floor(Math.random() * 5);
      const points = [];
      for (let i = 0; i < pointsCount; i++) {
        const angle = (i / pointsCount) * Math.PI * 2;
        const radius = size * (0.6 + Math.random() * 0.4);
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }

      // Shades of Pacific green/sand
      const islandGreen = [
        'rgba(40, 110, 75, 0.25)',
        'rgba(45, 125, 85, 0.25)',
        'rgba(35, 95, 65, 0.25)',
      ][Math.floor(Math.random() * 3)];

      return {
        id: Math.random().toString(),
        type: 'ISLAND',
        x,
        y,
        vy: 0.4 + Math.random() * 0.3,
        size,
        color: islandGreen,
        rotation: Math.random() * Math.PI * 2,
        points,
      };
    }
  };

  // Main high-performance game loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.666, 4); // target 60fps delta, clamp to prevent huge jumps
      lastTime = time;

      updateGame(dt);
      drawGame();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedAircraft, upgrades]);

  // Spawning logic based on stage progress
  const handleSpawning = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    if (state.isGameOver) return;

    // Background cloud/island spawns
    if (now - state.lastCloudSpawn > 2500 && state.bgElements.filter(e => e.type === 'CLOUD').length < 12) {
      state.bgElements.push(createBgElement('CLOUD'));
      state.lastCloudSpawn = now;
    }
    if (now - state.lastIslandSpawn > 7000 && state.bgElements.filter(e => e.type === 'ISLAND').length < 6) {
      state.bgElements.push(createBgElement('ISLAND'));
      state.lastIslandSpawn = now;
    }

    // Don't spawn standard enemies if Boss is active
    if (state.isBossActive) return;

    // Update Stage Progress (0 to 100)
    if (state.stageProgress < 100) {
      state.stageProgress += 0.04 * (1 / state.stage); // stages get slightly longer
    } else if (!state.isBossActive && !state.boss) {
      // Trigger Boss!
      triggerBossArrival();
    }

    // Enemy Aircraft Spawning
    const spawnInterval = Math.max(1200 - state.stage * 150, 450);
    if (now - state.lastEnemySpawn > spawnInterval && state.enemies.length < 15 + state.stage) {
      spawnEnemy();
      state.lastEnemySpawn = now;
    }
  };

  const spawnEnemy = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    const stageModifier = 1 + (state.stage - 1) * 0.25;

    // Pick enemy type
    const rand = Math.random();
    let type: EnemyType = 'SCOUT';
    let hp = 15 * stageModifier;
    let size = 18;
    let color = '#ef4444'; // Red scout
    let scoreValue = 100;
    let coinValue = 1;

    if (rand > 0.85) {
      type = 'GUNSHIP';
      hp = 80 * stageModifier;
      size = 32;
      color = '#eab308'; // Yellow Gunship
      scoreValue = 400;
      coinValue = 5;
    } else if (rand > 0.6) {
      type = 'BOMBER';
      hp = 50 * stageModifier;
      size = 28;
      color = '#3b82f6'; // Blue Bomber
      scoreValue = 250;
      coinValue = 3;
    } else if (rand > 0.45) {
      type = 'KAMIKAZE';
      hp = 10 * stageModifier;
      size = 15;
      color = '#f97316'; // Orange Fire ball
      scoreValue = 150;
      coinValue = 2;
    }

    // Calculate spawning position (top of screen, random X)
    const x = size + Math.random() * (canvas.width - size * 2);
    const y = -size * 2;

    // Velocities
    let vx = 0;
    let vy = 1.5 + Math.random() * 2;

    if (type === 'SCOUT') {
      vx = (Math.random() - 0.5) * 2;
      vy = 3 + Math.random() * 2;
    } else if (type === 'KAMIKAZE') {
      // Aim slightly towards the player
      const dx = state.playerX - x;
      const dy = state.playerY - y;
      const dist = Math.hypot(dx, dy);
      const speed = 4.5 + Math.random() * 1.5;
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    } else if (type === 'BOMBER') {
      vx = (Math.random() - 0.5) * 1.2;
      vy = 1.2 + Math.random() * 0.8;
    } else if (type === 'GUNSHIP') {
      vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
      vy = 1.0;
    }

    state.enemies.push({
      id: Math.random().toString(),
      type,
      x,
      y,
      vx,
      vy,
      hp,
      maxHp: hp,
      size,
      shootCooldown: 50 + Math.random() * 100,
      scoreValue,
      coinValue,
      color,
      stateTime: 0,
    });
  };

  const triggerBossArrival = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    state.isBossActive = true;
    audioManager.playBossWarning();

    // Spawn massive bosses with multiple gun turrets
    const bossHp = 800 + state.stage * 600;
    const turretCount = 2 + Math.min(state.stage, 4);
    const turrets: BossTurret[] = [];

    for (let i = 0; i < turretCount; i++) {
      const offsetX = ((i - (turretCount - 1) / 2) * 50);
      const offsetY = 20;
      turrets.push({
        id: `turret-${i}`,
        offsetX,
        offsetY,
        hp: 150 + state.stage * 80,
        maxHp: 150 + state.stage * 80,
        angle: Math.PI / 2,
        shootCooldown: 60 + Math.random() * 60,
        size: 14,
        color: '#f43f5e',
        type: i % 2 === 0 ? 'SPREAD' : 'RAPID',
      });
    }

    state.boss = {
      x: canvas.width / 2,
      y: -150, // slowly hover down
      vx: 1.2,
      vy: 1.2,
      hp: bossHp,
      maxHp: bossHp,
      width: 180,
      height: 80,
      turrets,
      shootCooldown: 80,
      patternTime: 0,
      phase: 1,
      isActive: false, // will activate once fully entered on-screen
    };
  };

  // Upgrades-based math modifiers
  const getPlayerStats = () => {
    const info = AIRCRAFT_PRESETS[selectedAircraft];
    const dmgLevel = upgrades.damage; // 0-5
    const frLevel = upgrades.fireRate; // 0-5
    const magLevel = upgrades.magnet; // 0-5

    return {
      speed: info.speed,
      fireRate: info.fireRate * (1 - frLevel * 0.08), // shoot faster
      damage: 10 + dmgLevel * 3, // punch harder
      magnetRange: 50 + magLevel * 30, // pull items from further
    };
  };

  // Core update cycle
  const updateGame = (dt: number) => {
    const state = stateRef.current;
    const now = Date.now();

    // 1. Spawning
    handleSpawning(now);

    // 2. Screen Shake decay
    if (state.screenShake > 0) {
      state.screenShake -= dt * 0.8;
      if (state.screenShake < 0) state.screenShake = 0;
    }

    // 3. Bomb flash decay
    if (state.bombVisualActive > 0 && now - state.bombVisualActive > 800) {
      state.bombVisualActive = 0;
    }

    if (state.isGameOver) return;

    const stats = getPlayerStats();

    // 4. Update Background elements
    state.bgElements.forEach(e => {
      e.y += e.vy * dt;
    });
    // Remove offscreen
    state.bgElements = state.bgElements.filter(e => e.y < (canvasRef.current?.height || 800) + 150);

    // 5. Shield powerup countdown
    if (state.isShieldActive) {
      state.shieldTimeLeft -= dt * 16.66; // approx ms per frame at 60fps
      if (state.shieldTimeLeft <= 0) {
        state.isShieldActive = false;
        state.shieldTimeLeft = 0;
      }
    }

    // 6. Handle Player controls & bounds
    const speed = stats.speed * dt;
    let dx = 0;
    let dy = 0;

    if (state.keys['ArrowUp'] || state.keys['KeyW'] || state.keys['w'] || state.keys['W'] || state.keys['ㅈ']) dy -= speed;
    if (state.keys['ArrowDown'] || state.keys['KeyS'] || state.keys['s'] || state.keys['S'] || state.keys['ㄴ']) dy += speed;
    if (state.keys['ArrowLeft'] || state.keys['KeyA'] || state.keys['a'] || state.keys['A'] || state.keys['ㅁ']) dx -= speed;
    if (state.keys['ArrowRight'] || state.keys['KeyD'] || state.keys['d'] || state.keys['D'] || state.keys['ㅇ']) dx += speed;

    state.playerX += dx;
    state.playerY += dy;

    // Mouse or Touch controls (direct follow / drag movement)
    if (state.touchActive) {
      const touchDx = state.touchX - state.playerX;
      const touchDy = state.touchY - state.playerY;
      const touchDist = Math.hypot(touchDx, touchDy);

      // Smooth modern drag catch-up
      if (touchDist > 5) {
        const easeSpeed = Math.min(touchDist * 0.25, stats.speed * 1.5) * dt;
        state.playerX += (touchDx / touchDist) * easeSpeed;
        state.playerY += (touchDy / touchDist) * easeSpeed;
      }
    }

    // Keep Player inside canvas borders
    const canvas = canvasRef.current;
    if (canvas) {
      const boundaryOffset = 25;
      if (state.playerX < boundaryOffset) state.playerX = boundaryOffset;
      if (state.playerX > canvas.width - boundaryOffset) state.playerX = canvas.width - boundaryOffset;
      if (state.playerY < boundaryOffset) state.playerY = boundaryOffset;
      if (state.playerY > canvas.height - boundaryOffset) state.playerY = canvas.height - boundaryOffset;
    }

    // 7. Auto Weapon Firing logic
    if (state.autoFire || state.keys['Space']) {
      if (now - state.lastShotTime > stats.fireRate) {
        fireWeapon(stats.damage);
        state.lastShotTime = now;
      }
    }

    // 8. Update Bullets
    state.bullets.forEach(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    // Remove off-screen bullets
    if (canvas) {
      state.bullets = state.bullets.filter(b => 
        b.y > -20 && b.y < canvas.height + 20 && b.x > -20 && b.x < canvas.width + 20
      );
    }

    // 9. Update Enemy Ships
    state.enemies.forEach(enemy => {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.stateTime += dt;

      // Enemy specific shooting algorithms
      const enemyFireInterval = Math.max(120, 180 - state.stage * 10);
      enemy.shootCooldown -= dt;

      if (enemy.shootCooldown <= 0) {
        enemy.shootCooldown = enemyFireInterval + Math.random() * 100;
        fireEnemyWeapon(enemy);
      }

      // Border bounds checking
      if (canvas) {
        // Bounce horizontal for Bombers and Gunships
        if (enemy.type === 'BOMBER' || enemy.type === 'GUNSHIP') {
          if (enemy.x < enemy.size || enemy.x > canvas.width - enemy.size) {
            enemy.vx = -enemy.vx;
          }
        }
      }
    });

    // Remove dead and offscreen enemies
    if (canvas) {
      state.enemies = state.enemies.filter(enemy => {
        const isOffscreen = enemy.y > canvas.height + 50;
        if (enemy.hp <= 0) {
          handleEnemyExplosion(enemy);
          return false;
        }
        return !isOffscreen;
      });
    }

    // 10. Update Boss Aircraft
    if (state.boss) {
      const boss = state.boss;
      boss.patternTime += dt;

      if (!boss.isActive) {
        // Descend slow to battlefield y=120
        if (boss.y < 120) {
          boss.y += 0.8 * dt;
        } else {
          boss.isActive = true;
        }
      } else {
        // Move side-to-side pattern
        boss.x += boss.vx * dt;
        if (canvas && (boss.x < boss.width / 2 + 20 || boss.x > canvas.width - boss.width / 2 - 20)) {
          boss.vx = -boss.vx;
        }

        // Periodic main weapon heavy discharge
        boss.shootCooldown -= dt;
        if (boss.shootCooldown <= 0) {
          triggerBossPattern(boss);
          boss.shootCooldown = 90 - state.stage * 8; // get faster
        }

        // Update each turret
        boss.turrets.forEach(turret => {
          if (turret.hp > 0) {
            // Track player angle
            const dx = state.playerX - (boss.x + turret.offsetX);
            const dy = state.playerY - (boss.y + turret.offsetY);
            turret.angle = Math.atan2(dy, dx);

            turret.shootCooldown -= dt;
            if (turret.shootCooldown <= 0) {
              fireBossTurret(boss, turret);
              turret.shootCooldown = 40 + Math.random() * 40;
            }
          }
        });
      }

      // Handle boss defeat
      if (boss.hp <= 0) {
        handleBossExplosion(boss);
        state.boss = null;
        state.isBossActive = false;
        state.bossDefeatedTime = now;
        state.stageProgress = 0;
        // Advance stage!
        state.stage++;
        // Play success fanfare
        audioManager.playPowerup();
        // Give heavy score and coin bonus
        state.score += 5000;
        state.coins += 150;
        triggerTextParticles(canvas?.width ? canvas.width / 2 : 200, 200, 'STAGE CLEARED! +5000 pts', '#4ade80');
      }
    }

    // 11. Update Powerups & magnets
    state.powerups.forEach(p => {
      // Pull items to player with magnet level modifier
      const dx = state.playerX - p.x;
      const dy = state.playerY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < stats.magnetRange) {
        const pullSpeed = (5 + (stats.magnetRange - dist) * 0.15) * dt;
        p.vx = (dx / dist) * pullSpeed;
        p.vy = (dy / dist) * pullSpeed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });

    // Remove off-screen powerups
    if (canvas) {
      state.powerups = state.powerups.filter(p => p.y < canvas.height + 50);
    }

    // 12. Update Particles
    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.spin !== undefined && p.angle !== undefined) {
        p.angle += p.spin * dt;
      }
    });
    // Filter dead particles
    state.particles = state.particles.filter(p => p.life < p.maxLife);

    // 13. COLLISION ENGINE DETECTIONS
    detectCollisions();
  };

  // Helper: custom text particles floating up
  const triggerTextParticles = (x: number, y: number, text: string, color: string) => {
    stateRef.current.particles.push({
      id: Math.random().toString(),
      type: 'TEXT',
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.5,
      color,
      size: 14,
      alpha: 1,
      life: 0,
      maxLife: 45,
      text,
    });
  };

  // Bullet discharges based on selected aircraft and upgrades
  const fireWeapon = (baseDamage: number) => {
    const state = stateRef.current;
    const bulletType = selectedAircraft;
    const now = Date.now();

    // Sound effect
    if (bulletType === 'ZERO') {
      audioManager.playShoot('HEAVY');
    } else if (bulletType === 'SPITFIRE') {
      audioManager.playShoot('SPREAD');
    } else {
      audioManager.playShoot('NORMAL');
    }

    // Add engine particle sparks to make fire look awesome
    state.particles.push({
      id: Math.random().toString(),
      type: 'SPARK',
      x: state.playerX,
      y: state.playerY - 20,
      vx: (Math.random() - 0.5) * 4,
      vy: -5,
      color: '#fbbf24',
      size: 3,
      alpha: 1,
      life: 0,
      maxLife: 15,
    });

    // Weapon layout based on level (1 to 4)
    if (bulletType === 'P38') {
      // Dual front straight bolts
      const bOffset = 10;
      if (state.weaponLevel === 1) {
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 15, 0, -12, baseDamage, 3, '#38bdf8'));
      } else if (state.weaponLevel === 2) {
        state.bullets.push(createPlayerBullet(state.playerX - bOffset, state.playerY - 15, 0, -12, baseDamage, 3.5, '#38bdf8'));
        state.bullets.push(createPlayerBullet(state.playerX + bOffset, state.playerY - 15, 0, -12, baseDamage, 3.5, '#38bdf8'));
      } else if (state.weaponLevel === 3) {
        state.bullets.push(createPlayerBullet(state.playerX - bOffset, state.playerY - 15, 0, -12, baseDamage, 3.5, '#38bdf8'));
        state.bullets.push(createPlayerBullet(state.playerX + bOffset, state.playerY - 15, 0, -12, baseDamage, 3.5, '#38bdf8'));
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 20, -1.5, -11.5, baseDamage * 0.7, 3, '#38bdf8', -0.1));
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 20, 1.5, -11.5, baseDamage * 0.7, 3, '#38bdf8', 0.1));
      } else {
        // Level 4 (Ultimate)
        state.bullets.push(createPlayerBullet(state.playerX - bOffset, state.playerY - 15, 0, -13, baseDamage, 4, '#38bdf8'));
        state.bullets.push(createPlayerBullet(state.playerX + bOffset, state.playerY - 15, 0, -13, baseDamage, 4, '#38bdf8'));
        state.bullets.push(createPlayerBullet(state.playerX - bOffset * 2, state.playerY - 10, -2, -12, baseDamage * 0.8, 3.5, '#06b6d4', -0.15));
        state.bullets.push(createPlayerBullet(state.playerX + bOffset * 2, state.playerY - 10, 2, -12, baseDamage * 0.8, 3.5, '#06b6d4', 0.15));
        // Back guardian homing plasma
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY, 0, -10, baseDamage * 0.5, 4, '#f43f5e'));
      }
    } else if (bulletType === 'SPITFIRE') {
      // Spreading spray layout
      if (state.weaponLevel === 1) {
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 15, 0, -10, baseDamage, 3, '#4ade80'));
      } else if (state.weaponLevel === 2) {
        state.bullets.push(createPlayerBullet(state.playerX - 5, state.playerY - 15, -1.2, -10, baseDamage * 0.9, 3, '#4ade80', -0.12));
        state.bullets.push(createPlayerBullet(state.playerX + 5, state.playerY - 15, 1.2, -10, baseDamage * 0.9, 3, '#4ade80', 0.12));
      } else if (state.weaponLevel === 3) {
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 18, 0, -11, baseDamage, 3.5, '#4ade80'));
        state.bullets.push(createPlayerBullet(state.playerX - 8, state.playerY - 12, -2.4, -9.5, baseDamage * 0.8, 3, '#4ade80', -0.24));
        state.bullets.push(createPlayerBullet(state.playerX + 8, state.playerY - 12, 2.4, -9.5, baseDamage * 0.8, 3, '#4ade80', 0.24));
      } else {
        // Level 4 Spray hell
        state.bullets.push(createPlayerBullet(state.playerX - 4, state.playerY - 18, -0.6, -11.5, baseDamage, 3.5, '#4ade80', -0.06));
        state.bullets.push(createPlayerBullet(state.playerX + 4, state.playerY - 18, 0.6, -11.5, baseDamage, 3.5, '#4ade80', 0.06));
        state.bullets.push(createPlayerBullet(state.playerX - 12, state.playerY - 10, -3.5, -9, baseDamage * 0.7, 3, '#10b981', -0.35));
        state.bullets.push(createPlayerBullet(state.playerX + 12, state.playerY - 10, 3.5, -9, baseDamage * 0.7, 3, '#10b981', 0.35));
        state.bullets.push(createPlayerBullet(state.playerX - 20, state.playerY - 5, -5, -7.5, baseDamage * 0.5, 3, '#10b981', -0.55));
        state.bullets.push(createPlayerBullet(state.playerX + 20, state.playerY - 5, 5, -7.5, baseDamage * 0.5, 3, '#10b981', 0.55));
      }
    } else if (bulletType === 'ZERO') {
      // Focused heavy plasma streams
      if (state.weaponLevel === 1) {
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 15, 0, -9, baseDamage * 1.5, 5, '#a855f7'));
      } else if (state.weaponLevel === 2) {
        state.bullets.push(createPlayerBullet(state.playerX - 6, state.playerY - 15, 0, -9.5, baseDamage * 1.2, 5, '#a855f7'));
        state.bullets.push(createPlayerBullet(state.playerX + 6, state.playerY - 15, 0, -9.5, baseDamage * 1.2, 5, '#a855f7'));
      } else if (state.weaponLevel === 3) {
        state.bullets.push(createPlayerBullet(state.playerX - 8, state.playerY - 12, -0.5, -10, baseDamage * 1.1, 5, '#a855f7'));
        state.bullets.push(createPlayerBullet(state.playerX + 8, state.playerY - 12, 0.5, -10, baseDamage * 1.1, 5, '#a855f7'));
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 20, 0, -11, baseDamage * 1.4, 6.5, '#c084fc'));
      } else {
        // Level 4 Beam
        state.bullets.push(createPlayerBullet(state.playerX - 12, state.playerY - 10, -0.8, -10.5, baseDamage, 5.5, '#a855f7'));
        state.bullets.push(createPlayerBullet(state.playerX + 12, state.playerY - 10, 0.8, -10.5, baseDamage, 5.5, '#a855f7'));
        state.bullets.push(createPlayerBullet(state.playerX - 4, state.playerY - 18, 0, -12, baseDamage * 1.3, 6, '#c084fc'));
        state.bullets.push(createPlayerBullet(state.playerX + 4, state.playerY - 18, 0, -12, baseDamage * 1.3, 6, '#c084fc'));
        // High frequency rocket/missile
        state.bullets.push(createPlayerBullet(state.playerX, state.playerY - 22, 0, -13, baseDamage * 1.8, 8, '#f97316'));
      }
    }
  };

  const createPlayerBullet = (
    x: number, y: number, vx: number, vy: number, 
    damage: number, size: number, color: string, angle = 0
  ): Bullet => {
    return {
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      isEnemy: false,
      damage,
      size,
      color,
      angle,
    };
  };

  // Enemy weaponry triggers
  const fireEnemyWeapon = (enemy: Enemy) => {
    const state = stateRef.current;
    if (state.isGameOver) return;

    audioManager.playEnemyShoot();

    if (enemy.type === 'SCOUT' || enemy.type === 'KAMIKAZE') {
      // Standard slow bullet directly down
      state.bullets.push(createEnemyBullet(enemy.x, enemy.y + enemy.size, 0, 4.5, 10, 4, '#fb7185'));
    } else if (enemy.type === 'BOMBER') {
      // Dual spread bullets
      state.bullets.push(createEnemyBullet(enemy.x - 8, enemy.y + enemy.size, -0.8, 3.5, 15, 4.5, '#fb7185'));
      state.bullets.push(createEnemyBullet(enemy.x + 8, enemy.y + enemy.size, 0.8, 3.5, 15, 4.5, '#fb7185'));
    } else if (enemy.type === 'GUNSHIP') {
      // 3-way circular pattern spray
      const angles = [Math.PI * 0.4, Math.PI * 0.5, Math.PI * 0.6];
      angles.forEach(angle => {
        const speed = 4;
        state.bullets.push(createEnemyBullet(
          enemy.x,
          enemy.y + enemy.size,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          20,
          5,
          '#fb923c'
        ));
      });
    }
  };

  // Boss specific heavy arrays
  const triggerBossPattern = (boss: Boss) => {
    const state = stateRef.current;
    audioManager.playEnemyShoot();

    const stageMod = state.stage;

    // Phase 1: Huge spiral spray
    if (boss.phase === 1) {
      const sprayCount = 8 + stageMod * 2;
      for (let i = 0; i < sprayCount; i++) {
        const angle = (i / sprayCount) * Math.PI * 0.8 + Math.PI * 0.1; // down spray arch
        const speed = 3.5 + Math.random() * 2;
        state.bullets.push(createEnemyBullet(
          boss.x,
          boss.y + 40,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          25,
          6,
          '#f43f5e'
        ));
      }
    } else {
      // Phase 2: Ring nova blast
      const waveCount = 16 + stageMod * 2;
      for (let i = 0; i < waveCount; i++) {
        const angle = (i / waveCount) * Math.PI * 2;
        const speed = 4.2;
        state.bullets.push(createEnemyBullet(
          boss.x,
          boss.y + 20,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          30,
          6.5,
          '#c084fc'
        ));
      }
    }
  };

  const fireBossTurret = (boss: Boss, turret: BossTurret) => {
    const state = stateRef.current;
    const tx = boss.x + turret.offsetX;
    const ty = boss.y + turret.offsetY;

    if (turret.type === 'RAPID') {
      // Direct stream at player
      const vx = Math.cos(turret.angle) * 5.5;
      const vy = Math.sin(turret.angle) * 5.5;
      state.bullets.push(createEnemyBullet(tx, ty, vx, vy, 15, 4.5, '#ef4444'));
    } else if (turret.type === 'SPREAD') {
      // 3-way spread around targeting angle
      const spread = 0.25;
      const angles = [turret.angle - spread, turret.angle, turret.angle + spread];
      angles.forEach(angle => {
        const vx = Math.cos(angle) * 4.2;
        const vy = Math.sin(angle) * 4.2;
        state.bullets.push(createEnemyBullet(tx, ty, vx, vy, 18, 5, '#eab308'));
      });
    }
  };

  const createEnemyBullet = (x: number, y: number, vx: number, vy: number, damage: number, size: number, color: string): Bullet => {
    return {
      id: Math.random().toString(),
      x,
      y,
      vx,
      vy,
      isEnemy: true,
      damage,
      size,
      color,
    };
  };

  // Particle bursts on death
  const handleEnemyExplosion = (enemy: Enemy) => {
    const state = stateRef.current;
    audioManager.playExplosion('SMALL');

    state.screenShake = Math.max(state.screenShake, 4);

    // Score pop-up
    state.score += enemy.scoreValue;
    triggerTextParticles(enemy.x, enemy.y, `+${enemy.scoreValue}`, '#eab308');

    // Trigger vector sparks
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      state.particles.push({
        id: Math.random().toString(),
        type: 'SPARK',
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: enemy.color,
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }

    // Spawn power-up or coin
    const roll = Math.random();
    if (roll < 0.22) {
      // 22% chance to drop useful items
      const itemTypes: PowerUpType[] = ['COIN', 'COIN', 'COIN', 'POWER', 'HEAL', 'SHIELD', 'BOMB'];
      const pick = itemTypes[Math.floor(Math.random() * itemTypes.length)];

      // Special item rates
      if (pick === 'BOMB' && Math.random() > 0.4) return; // lower bomb rates
      if (pick === 'SHIELD' && Math.random() > 0.5) return;

      state.powerups.push({
        id: Math.random().toString(),
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.5 + Math.random() * 1,
        type: pick,
        size: pick === 'COIN' ? 12 : 16,
      });
    }
  };

  const handleBossExplosion = (boss: Boss) => {
    const state = stateRef.current;
    audioManager.playExplosion('BOSS');
    state.screenShake = 25;

    // Giant radial smoke-cloud rings
    for (let i = 0; i < 45; i++) {
      const angle = (i / 45) * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      state.particles.push({
        id: Math.random().toString(),
        type: 'SHOCKWAVE',
        x: boss.x + (Math.random() - 0.5) * 40,
        y: boss.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#f97316' : '#94a3b8',
        size: 5 + Math.random() * 12,
        alpha: 1,
        life: 0,
        maxLife: 50 + Math.random() * 30,
      });
    }

    // Heavy sparks flying
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      state.particles.push({
        id: Math.random().toString(),
        type: 'SPARK',
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#fbbf24',
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 20,
      });
    }
  };

  // Collision checks & bounds logic
  const detectCollisions = () => {
    const state = stateRef.current;
    const stats = getPlayerStats();

    // 1. Player Bullets vs Enemies
    state.bullets.forEach(b => {
      if (b.isEnemy) return;

      // Check against standard enemies
      state.enemies.forEach(enemy => {
        if (enemy.hp <= 0) return;
        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (dist < b.size + enemy.size) {
          enemy.hp -= b.damage;
          b.y = -100; // discard bullet

          // Sparks
          state.particles.push({
            id: Math.random().toString(),
            type: 'SPARK',
            x: b.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: '#fbbf24',
            size: 2,
            alpha: 1,
            life: 0,
            maxLife: 10,
          });
        }
      });

      // Check against Boss & Turrets
      if (state.boss && state.boss.isActive) {
        const boss = state.boss;

        // Check turrets first
        boss.turrets.forEach(turret => {
          if (turret.hp > 0) {
            const tx = boss.x + turret.offsetX;
            const ty = boss.y + turret.offsetY;
            const dist = Math.hypot(b.x - tx, b.y - ty);
            if (dist < b.size + turret.size) {
              turret.hp -= b.damage;
              b.y = -100;

              triggerTextParticles(tx, ty, `-${Math.round(b.damage)}`, '#ff4444');

              if (turret.hp <= 0) {
                audioManager.playExplosion('SMALL');
                state.score += 500;
                triggerTextParticles(tx, ty, 'TURRET DESTROYED +500', '#22c55e');
              }
            }
          }
        });

        // Check main boss chassis (bounding box)
        if (b.y > -50) {
          const halfW = boss.width / 2;
          const halfH = boss.height / 2;
          if (b.x > boss.x - halfW && b.x < boss.x + halfW &&
              b.y > boss.y - halfH && b.y < boss.y + halfH) {
            boss.hp -= b.damage;
            b.y = -100; // discard

            // Flash sparks
            state.particles.push({
              id: Math.random().toString(),
              type: 'SPARK',
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: '#f8fafc',
              size: 2.5,
              alpha: 1,
              life: 0,
              maxLife: 12,
            });

            // Enter Phase 2 when under 40% health
            if (boss.hp < boss.maxHp * 0.4 && boss.phase === 1) {
              boss.phase = 2;
              audioManager.playBossWarning();
              triggerTextParticles(boss.x, boss.y - 30, 'BOSS PHASE 2 - ANGRY!', '#a855f7');
            }
          }
        }
      }
    });

    // 2. Enemy Bullets vs Player
    state.bullets.forEach(b => {
      if (!b.isEnemy) return;

      const dist = Math.hypot(b.x - state.playerX, b.y - state.playerY);
      if (dist < b.size + state.playerRadius) {
        b.y = 9999; // discard
        handlePlayerDamage(b.damage);
      }
    });

    // 3. Enemy ships crashed into player directly
    state.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;
      const dist = Math.hypot(enemy.x - state.playerX, enemy.y - state.playerY);
      if (dist < enemy.size + state.playerRadius) {
        enemy.hp = 0; // kill enemy instantly
        handlePlayerDamage(enemy.size * 1.5); // heavy crash penalty
      }
    });

    // 4. Player vs Powerups
    state.powerups = state.powerups.filter(p => {
      const dist = Math.hypot(p.x - state.playerX, p.y - state.playerY);
      const collisionRadius = p.size + state.playerRadius + 5;

      if (dist < collisionRadius) {
        handlePowerupCollect(p.type);
        return false; // delete powerup
      }
      return true;
    });
  };

  const handlePlayerDamage = (amount: number) => {
    const state = stateRef.current;
    if (state.isGameOver) return;

    if (state.isShieldActive) {
      // Absorb damage entirely, spawn sparks
      for (let i = 0; i < 5; i++) {
        state.particles.push({
          id: Math.random().toString(),
          type: 'SPARK',
          x: state.playerX + (Math.random() - 0.5) * 40,
          y: state.playerY + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          color: '#38bdf8',
          size: 2,
          alpha: 1,
          life: 0,
          maxLife: 15,
        });
      }
      return;
    }

    // Trigger visual hit
    state.playerHp -= amount;
    state.screenShake = Math.max(state.screenShake, 14);
    audioManager.playHit();

    // Damage sparks
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        id: Math.random().toString(),
        type: 'SPARK',
        x: state.playerX,
        y: state.playerY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: '#f43f5e',
        size: 2.5,
        alpha: 1,
        life: 0,
        maxLife: 25,
      });
    }

    if (state.playerHp <= 0) {
      triggerGameOver();
    }
  };

  const handlePowerupCollect = (type: PowerUpType) => {
    const state = stateRef.current;
    audioManager.playPowerup();

    if (type === 'COIN') {
      state.coins += 1;
      state.score += 50;
      triggerTextParticles(state.playerX, state.playerY - 20, '+1 Coin', '#fbbf24');
    } else if (type === 'POWER') {
      if (state.weaponLevel < 4) {
        state.weaponLevel++;
        triggerTextParticles(state.playerX, state.playerY - 25, 'WEAPON UPGRADED!', '#a855f7');
      } else {
        state.score += 1000;
        triggerTextParticles(state.playerX, state.playerY - 25, '+1000 Max Level Bonus', '#eab308');
      }
    } else if (type === 'HEAL') {
      state.playerHp = Math.min(state.playerHp + 35, state.playerMaxHp);
      triggerTextParticles(state.playerX, state.playerY - 25, 'HP RESTORED!', '#4ade80');
    } else if (type === 'SHIELD') {
      state.isShieldActive = true;
      state.shieldTimeLeft = (4 + upgrades.shieldDuration * 1.5) * 1000; // shield duration based on upgrade level
      triggerTextParticles(state.playerX, state.playerY - 25, 'SHIELD ACTIVE!', '#38bdf8');
    } else if (type === 'BOMB') {
      state.bombsRemaining++;
      triggerTextParticles(state.playerX, state.playerY - 25, '+1 Screen Bomb', '#f43f5e');
    }
  };

  const triggerGameOver = () => {
    const state = stateRef.current;
    state.isGameOver = true;
    audioManager.playGameOver();
    audioManager.stopMusic();

    // Spawn massive explosion particles where player died
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      state.particles.push({
        id: Math.random().toString(),
        type: 'SHOCKWAVE',
        x: state.playerX,
        y: state.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#fb7185',
        size: 4 + Math.random() * 8,
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 20,
      });
    }
  };

  // Custom HTML5 Vector Artist Canvas Rendering
  const drawGame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = stateRef.current;

    ctx.save();

    // Implement Screen Shake by translating coordinate grid
    if (state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * state.screenShake;
      const dy = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(dx, dy);
    }

    // 1. Dark Pacific Ocean backdrop
    ctx.fillStyle = '#05070f'; // Immersive Deep Dark Ocean
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for retro speed movement look
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridY = (Date.now() / 25) % 40;
    for (let y = gridY; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 2. Background Islands & Clouds
    state.bgElements.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'ISLAND') {
        if (e.rotation) ctx.rotate(e.rotation);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        if (e.points && e.points.length > 0) {
          ctx.moveTo(e.points[0].x, e.points[0].y);
          for (let i = 1; i < e.points.length; i++) {
            ctx.lineTo(e.points[i].x, e.points[i].y);
          }
        } else {
          ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();

        // Draw dynamic island shores / sand contour lines
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.08)';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Draw fluffy semi-transparent cloud vectors
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.arc(-e.size * 0.4, e.size * 0.2, e.size * 0.7, 0, Math.PI * 2);
        ctx.arc(e.size * 0.4, -e.size * 0.1, e.size * 0.8, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });

    // 3. Bullets
    state.bullets.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.angle) {
        ctx.rotate(b.angle + Math.PI / 2);
      }

      // Bullets draw glows for neon laser vibe
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;

      ctx.beginPath();
      if (b.isEnemy) {
        // Enemy spheres or spikes
        ctx.arc(0, 0, b.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Player energy spikes
        ctx.fillRect(-b.size / 2, -b.size * 2, b.size, b.size * 4);
      }
      ctx.restore();
    });

    // 4. Powerups
    state.powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Rotating glow effect
      const angle = (Date.now() / 250) % (Math.PI * 2);
      ctx.rotate(angle);

      // Shadow glow
      ctx.shadowBlur = 12;

      if (p.type === 'COIN') {
        ctx.shadowColor = '#eab308';
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner symbol
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      } else {
        // Special powerup capsule drawing
        let mainCol = '#ef4444';
        let symbol = 'P';
        if (p.type === 'POWER') { mainCol = '#a855f7'; symbol = 'P'; }
        if (p.type === 'HEAL') { mainCol = '#10b981'; symbol = 'H'; }
        if (p.type === 'SHIELD') { mainCol = '#06b6d4'; symbol = 'S'; }
        if (p.type === 'BOMB') { mainCol = '#f43f5e'; symbol = 'B'; }

        ctx.shadowColor = mainCol;
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Border contour
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 0);
      }

      ctx.restore();
    });

    // 5. Enemy Aircrafts drawing
    state.enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Rotate slightly based on horizontal speed for responsive look
      const tiltAngle = enemy.vx * 0.05;
      ctx.rotate(tiltAngle);

      // Wing glow
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';

      // Draw vector aircraft based on enemy type
      ctx.fillStyle = enemy.color;

      if (enemy.type === 'SCOUT') {
        // Slim retro stealth wing
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size);
        ctx.lineTo(enemy.size, enemy.size * 0.5);
        ctx.lineTo(enemy.size * 0.3, enemy.size * 0.3);
        ctx.lineTo(0, enemy.size);
        ctx.lineTo(-enemy.size * 0.3, enemy.size * 0.3);
        ctx.lineTo(-enemy.size, enemy.size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -enemy.size * 0.2, enemy.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'KAMIKAZE') {
        // Fast interceptor dart shape
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size);
        ctx.lineTo(enemy.size, enemy.size);
        ctx.lineTo(0, enemy.size * 0.4);
        ctx.lineTo(-enemy.size, enemy.size);
        ctx.closePath();
        ctx.fill();

        // Orange thruster aura fire
        const engineFire = (Date.now() / 30) % 5 + 4;
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, enemy.size * 0.7, engineFire, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'BOMBER') {
        // Heavy twin-prop broad cargo plane shape
        const w = enemy.size * 1.5;
        const h = enemy.size;

        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, -h * 0.2);
        ctx.lineTo(w, 0);
        ctx.lineTo(w * 0.2, h * 0.3);
        ctx.lineTo(w * 0.2, h);
        ctx.lineTo(-w * 0.2, h);
        ctx.lineTo(-w * 0.2, h * 0.3);
        ctx.lineTo(-w, 0);
        ctx.lineTo(-w, -h * 0.2);
        ctx.closePath();
        ctx.fill();

        // Glass canopy panels
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-w * 0.15, -h * 0.6, w * 0.3, h * 0.3);
      } else if (enemy.type === 'GUNSHIP') {
        // Heavy circular armored fortress aircraft
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.fill();

        // Yellow core highlights
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Ring frame
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // 6. Boss Heavy Aircraft drawing
    if (state.boss) {
      const boss = state.boss;
      ctx.save();
      ctx.translate(boss.x, boss.y);

      // Warning alert halo if boss is entering battlefield
      if (!boss.isActive) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(-boss.width / 2 - 10, -boss.height / 2 - 10, boss.width + 20, boss.height + 20);
        ctx.stroke();
      }

      // Broad steel bomber body
      const w = boss.width / 2;
      const h = boss.height / 2;

      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';

      ctx.fillStyle = '#1e293b'; // slate-800 plate metal
      ctx.beginPath();
      // Main wing
      ctx.moveTo(-w, -h * 0.4);
      ctx.lineTo(w, -h * 0.4);
      // Nose
      ctx.lineTo(w * 0.2, -h);
      ctx.lineTo(-w * 0.2, -h);
      ctx.closePath();
      ctx.fill();

      // Fuselage / hull body plates
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w * 0.3, -h * 0.8, w * 0.6, h * 1.8);

      // Heavy engines
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.6, -h * 0.3, w * 0.15, h * 1.2);
      ctx.fillRect(w * 0.45, -h * 0.3, w * 0.15, h * 1.2);

      // Engine flames
      const flameH = 15 + Math.random() * 10;
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-w * 0.58, h * 0.9, w * 0.11, flameH);
      ctx.fillRect(w * 0.47, h * 0.9, w * 0.11, flameH);

      // Red boss marks decals
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-w, -h * 0.3, w * 0.2, h * 0.15);
      ctx.fillRect(w * 0.8, -h * 0.3, w * 0.2, h * 0.15);

      // Draw all active turrets
      boss.turrets.forEach(turret => {
        if (turret.hp > 0) {
          ctx.save();
          ctx.translate(turret.offsetX, turret.offsetY);
          ctx.rotate(turret.angle - Math.PI / 2); // align rotation

          // Turret metallic base circle
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, turret.size, 0, Math.PI * 2);
          ctx.fill();

          // Barrel launcher line
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, turret.size * 1.4);
          ctx.stroke();

          ctx.restore();
        } else {
          // Wrecked black turret hole
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(turret.offsetX, turret.offsetY, turret.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }

    // 7. Player Fighter Aircraft drawing
    if (!state.isGameOver) {
      ctx.save();
      ctx.translate(state.playerX, state.playerY);

      // Slight roll banking tilt based on keys pressed
      let bankAngle = 0;
      if (state.keys['ArrowLeft'] || state.keys['KeyA']) bankAngle = -0.22;
      if (state.keys['ArrowRight'] || state.keys['KeyD']) bankAngle = 0.22;
      ctx.rotate(bankAngle);

      // Jet exhaust fire
      const flicker = Math.random() * 8 + 8;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-10, 15);
      ctx.lineTo(0, 15 + flicker);
      ctx.lineTo(10, 15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(0, 15 + flicker * 0.6);
      ctx.lineTo(5, 15);
      ctx.closePath();
      ctx.fill();

      // Shadow overlay
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';

      // Draw fighter preset designs
      const info = AIRCRAFT_PRESETS[selectedAircraft];
      ctx.fillStyle = info.color;

      if (selectedAircraft === 'P38') {
        // P-38 Lightning Twin boom fighter layout
        // Center Cockpit fuselage pod
        ctx.fillRect(-6, -22, 12, 34);

        // Wing span
        ctx.beginPath();
        ctx.moveTo(-28, -6);
        ctx.lineTo(28, -6);
        ctx.lineTo(28, 0);
        ctx.lineTo(-28, 0);
        ctx.closePath();
        ctx.fill();

        // Twin booms
        ctx.fillRect(-18, -16, 6, 36);
        ctx.fillRect(12, -16, 6, 36);

        // Horizontal tail connector
        ctx.fillRect(-18, 16, 36, 4);

        // Spin propeller visual circles
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-15, -16, 12, 0, Math.PI * 2);
        ctx.arc(15, -16, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Glass Cockpit canopy
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-3, -12, 6, 14);
      } else if (selectedAircraft === 'SPITFIRE') {
        // Sleek aerodynamic Spitfire elliptical wings
        // Fuselage pod
        ctx.fillRect(-5, -24, 10, 44);

        // Wide curved sweep wings
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.ellipse(0, -2, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Horizontal back stabilizer wings
        ctx.beginPath();
        ctx.ellipse(0, 14, 11, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Yellow wingtip visual markers
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-28, -2, 3, 4);
        ctx.fillRect(25, -2, 3, 4);

        // Blue bubble canopy glass
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(-2, -10, 4, 15);
      } else if (selectedAircraft === 'ZERO') {
        // Mitsubishi heavy angular fighter design
        // Fuselage body
        ctx.fillRect(-7, -26, 14, 46);

        // Angular swept wing outline
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-32, 2);
        ctx.lineTo(-32, 8);
        ctx.lineTo(0, 0);
        ctx.lineTo(32, 8);
        ctx.lineTo(32, 2);
        ctx.closePath();
        ctx.fill();

        // Large Red circular decals on wing points
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(-22, 4, 5, 0, Math.PI * 2);
        ctx.arc(22, 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Back stabilizer wing
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(-14, 18);
        ctx.lineTo(14, 18);
        ctx.closePath();
        ctx.fill();

        // Deep blue window canopy
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-3, -11, 6, 17);
      }

      // Draw active glowing Energy Shield Ring
      if (state.isShieldActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(Date.now() / 100) * 0.25})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, state.playerRadius + 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 8. Particles Engine Render
    state.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'TEXT' && p.text) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, 0, 0);
      } else if (p.type === 'SHOCKWAVE') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 + p.life * 0.05), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'SMOKE') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard high speed sparks
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    });

    // 9. Screen-clearing bomb blast flash effect
    if (state.bombVisualActive > 0) {
      const elapsed = Date.now() - state.bombVisualActive;
      const progress = elapsed / 800; // 0 to 1
      const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  };

  return (
    <div 
      id="game-root-layout"
      className="w-full h-full flex flex-col md:flex-row bg-cyber-dark overflow-hidden text-white font-mono select-none"
    >
      {/* 1. Immersive Cockpit Sidebar HUD - Visible on desktop, hidden on mobile */}
      <div 
        id="desktop-cockpit-sidebar"
        className="hidden md:flex w-72 bg-black border-r border-neon-cyan/35 flex-col justify-between p-6 z-20 neon-shadow-inset-cyan relative overflow-y-auto shrink-0 select-none"
      >
        {/* Subtle scanline overlay just on the sidebar to make it match the arcade display */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.04)_0%,transparent_100%)] pointer-events-none" />

        {/* Top telemetry brand block */}
        <div className="space-y-6 z-10">
          <div className="border-b border-neon-cyan/25 pb-4">
            <h2 className="text-xs text-neon-cyan font-black tracking-widest neon-text-cyan flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neon-cyan animate-pulse" />
              SYSTEM TELEMETRY
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">FIGHTER COCKPIT V4.0</p>
          </div>

          {/* Core pilot logs */}
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">ACE PILOT SCORE</div>
              <div className="text-2xl font-black text-neon-yellow tracking-wider font-mono neon-text-yellow mt-0.5">
                {hudState.score.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">TACTICAL COINS</div>
              <div className="text-lg font-bold text-neon-cyan tracking-wider font-mono flex items-center gap-2 mt-0.5">
                <Sparkles className="w-4 h-4 text-neon-cyan animate-spin" style={{ animationDuration: '6s' }} />
                <span>{hudState.coins} COINS</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-cyber-panel border border-slate-800 p-2.5 rounded-sm">
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">CURRENT SECTOR</div>
                <div className="text-sm font-black text-neon-yellow font-mono">STAGE {hudState.stage}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">WEAPON POWER</div>
                <div className="text-xs font-bold text-neon-cyan font-mono">LV.{hudState.weaponLevel}</div>
              </div>
            </div>
          </div>

          {/* Core vital bars (Fighter HP) */}
          <div className="space-y-2 pt-2 border-t border-slate-900">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">FIGHTER VITAL HP</span>
              <span className={`font-black ${hudState.playerHp / hudState.playerMaxHp > 0.4 ? 'text-neon-cyan neon-text-cyan' : 'text-neon-red neon-text-red animate-pulse'}`}>
                {Math.ceil(hudState.playerHp)}%
              </span>
            </div>
            <div className="w-full bg-black border border-slate-800 h-4 rounded-sm overflow-hidden flex p-0.5">
              <div 
                className={`h-full transition-all duration-100 rounded-sm ${
                  hudState.playerHp / hudState.playerMaxHp > 0.4 ? 'bg-neon-cyan shadow-[0_0_8px_#00ffff]' : 'bg-neon-red shadow-[0_0_8px_#ff0033] animate-pulse'
                }`}
                style={{ width: `${(hudState.playerHp / hudState.playerMaxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Sector progression / Boss HP */}
          <div className="space-y-2 pt-2 border-t border-slate-900">
            {hudState.isBossActive ? (
              <div className="bg-neon-red/5 border border-neon-red/30 p-3 rounded-sm animate-pulse space-y-1.5">
                <div className="flex items-center gap-1.5 text-neon-red font-bold text-[11px] tracking-wider neon-text-red">
                  <AlertTriangle className="w-4 h-4 text-neon-red" />
                  <span>BOSS DEFENSE SHIELD</span>
                </div>
                <div className="w-full bg-black border border-neon-red/35 h-3.5 rounded-sm overflow-hidden flex p-0.5">
                  <div 
                    className="h-full bg-neon-red shadow-[0_0_8px_#ff0033] transition-all duration-100"
                    style={{ width: `${(hudState.bossHp / hudState.bossMaxHp) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                  <span>SECTOR PROGRESSION</span>
                  <span>{Math.round(hudState.stageProgress)}%</span>
                </div>
                <div className="w-full bg-black border border-slate-800 h-2 rounded-sm overflow-hidden flex">
                  <div 
                    className="h-full bg-neon-yellow shadow-[0_0_6px_#ffcc00] transition-all duration-200"
                    style={{ width: `${hudState.stageProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actionable controls and weapon stocks */}
        <div className="space-y-4 z-10 border-t border-slate-900 pt-4">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">QUICK FLIGHT CONTROLS</div>
            <button 
              id="sidebar-btn-bomb"
              onClick={(e) => {
                e.stopPropagation();
                triggerScreenClearingBomb();
              }}
              className={`w-full bg-black hover:bg-neon-red/10 active:scale-95 text-neon-red border border-neon-red/70 py-3 rounded-lg font-mono font-bold tracking-widest flex items-center justify-center gap-2 transition-all neon-shadow-inset-red ${
                hudState.bombs === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              disabled={hudState.bombs === 0}
            >
              <AlertTriangle className="w-4 h-4 text-neon-red animate-bounce" />
              DEPLOY BOMB: {hudState.bombs}
            </button>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              id="sidebar-btn-mute"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="flex-1 bg-black border border-slate-800 hover:border-neon-cyan/50 text-slate-400 hover:text-neon-cyan py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {hudState.isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{hudState.isMuted ? 'UNMUTE' : 'MUTE'}</span>
            </button>

            <button
              id="sidebar-btn-exit"
              onClick={(e) => {
                e.stopPropagation();
                onGameExit();
              }}
              className="flex-1 bg-black border border-slate-800 hover:border-neon-red/50 text-slate-400 hover:text-neon-red py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>EXIT ABORT</span>
            </button>
          </div>

          {/* Pilot instructions helper */}
          <div className="text-[10px] text-slate-500 border border-slate-950 p-2.5 rounded-md bg-cyber-panel/30 leading-relaxed">
            🕹️ 마우스/터치: 드래그하여 비행 (자동 연사)<br />
            ⌨️ 키보드: 방향키(Arrow Keys) 또는 WASD 이동<br />
            🚀 SPACE: 수동 사격 | B키: 폭탄 투하
          </div>
        </div>
      </div>

      {/* Main Game Stage Area */}
      <div 
        id="game-canvas-container" 
        ref={containerRef} 
        className="relative flex-1 h-full overflow-hidden bg-black select-none"
      >
        {/* Dynamic Background Parallax Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,transparent_100%)] z-0" />

        {/* Main rendering Canvas */}
        <canvas 
          id="game-canvas"
          ref={canvasRef}
          className="w-full h-full z-10 block cursor-crosshair touch-none"
          onMouseMove={(e) => {
            if (stateRef.current.isGameOver) return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              stateRef.current.touchX = e.clientX - rect.left;
              stateRef.current.touchY = e.clientY - rect.top;
              stateRef.current.touchActive = true;
            }
          }}
          onMouseLeave={() => {
            stateRef.current.touchActive = false;
          }}
          onTouchStart={(e) => {
            if (stateRef.current.isGameOver) return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && e.touches[0]) {
              stateRef.current.touchX = e.touches[0].clientX - rect.left;
              stateRef.current.touchY = e.touches[0].clientY - rect.top;
              stateRef.current.touchActive = true;
            }
          }}
          onTouchMove={(e) => {
            if (stateRef.current.isGameOver) return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect && e.touches[0]) {
              stateRef.current.touchX = e.touches[0].clientX - rect.left;
              stateRef.current.touchY = e.touches[0].clientY - rect.top;
            }
          }}
          onTouchEnd={() => {
            stateRef.current.touchActive = false;
          }}
        />

        {/* 2. Mobile Compact Overlay HUD - Hidden on desktop, overlayed on mobile */}
        <div className="md:hidden absolute inset-x-0 top-0 p-3 z-20 pointer-events-none flex flex-col gap-2 font-mono">
          <div className="flex justify-between items-start text-white text-xs">
            {/* Top Left: Score, Coin stats */}
            <div className="flex flex-col gap-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/70 p-2 rounded-sm border border-slate-800/60">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">PTS:</span>
                <span className="text-neon-yellow font-bold tracking-wider">{hudState.score.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">COINS:</span>
                <span className="text-neon-cyan font-bold flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-neon-cyan" />
                  {hudState.coins}
                </span>
              </div>
            </div>

            {/* Top Right: HP status & Bomb inventory */}
            <div className="flex flex-col items-end gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-1.5 bg-black/70 p-1.5 rounded-sm border border-slate-800/60">
                <div className="w-20 bg-black border border-slate-800 h-2.5 rounded-sm overflow-hidden flex p-0.5">
                  <div 
                    className={`h-full ${hudState.playerHp / hudState.playerMaxHp > 0.4 ? 'bg-neon-cyan shadow-[0_0_4px_#00ffff]' : 'bg-neon-red shadow-[0_0_4px_#ff0033] animate-pulse'}`}
                    style={{ width: `${(hudState.playerHp / hudState.playerMaxHp) * 100}%` }}
                  />
                </div>
                <span className="text-slate-200 font-bold text-[9px]">{Math.ceil(hudState.playerHp)}%</span>
              </div>

              <div className="flex gap-1.5">
                <button 
                  id="mobile-btn-bomb"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerScreenClearingBomb();
                  }}
                  className={`pointer-events-auto bg-black hover:bg-neon-red/15 active:scale-95 text-neon-red text-[10px] px-2 py-1 rounded-sm border border-neon-red font-bold shadow-md flex items-center gap-1 transition-all ${
                    hudState.bombs === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  disabled={hudState.bombs === 0}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-neon-red" />
                  BOMB: {hudState.bombs}
                </button>

                <button
                  id="mobile-btn-mute"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="pointer-events-auto bg-black hover:bg-slate-900 active:scale-95 text-slate-300 p-1 rounded-sm border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {hudState.isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                <button
                  id="mobile-btn-exit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGameExit();
                  }}
                  className="pointer-events-auto bg-black hover:bg-slate-900 active:scale-95 text-slate-300 text-[10px] px-2 py-1 rounded-sm border border-slate-800 transition-colors cursor-pointer"
                >
                  EXIT
                </button>
              </div>
            </div>
          </div>

          {/* Boss HP Bar or Level Progress (Mobile Overlay) */}
          <div className="w-full max-w-xs mx-auto mt-1 pointer-events-none">
            {hudState.isBossActive ? (
              <div className="flex flex-col gap-1 items-center bg-black/80 p-2 rounded-sm border border-neon-red/40 animate-pulse">
                <div className="flex items-center gap-1 text-neon-red font-bold text-[10px] tracking-wider neon-text-red">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>BOSS EMERGENCY</span>
                </div>
                <div className="w-full bg-black border border-neon-red/30 h-2.5 rounded-sm overflow-hidden flex">
                  <div 
                    className="h-full bg-neon-red shadow-[0_0_6px_#ff0033]"
                    style={{ width: `${(hudState.bossHp / hudState.bossMaxHp) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full bg-black/40 border border-slate-900 h-1 rounded-sm overflow-hidden">
                <div 
                  className="h-full bg-neon-cyan shadow-[0_0_4px_#00ffff]"
                  style={{ width: `${hudState.stageProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only Help overlay */}
        <div className="md:hidden absolute bottom-4 left-4 z-20 pointer-events-none font-mono text-[9px] text-slate-500 bg-black/80 px-2.5 py-1.5 rounded-sm border border-slate-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          🕹️ 드래그하여 조종 (자동 사격)
        </div>
      </div>
    </div>
  );
}
