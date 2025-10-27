// Repaired script.js
// Fixes syntax errors and corrupted fragments so the game runs.
// Adds Earth-orbit style background for the first 11 waves (wave indices 0..10)
// and moves the player slightly closer to Earth each time a new wave is spawned (first 11 waves).
// No other gameplay logic was preserved where possible; missing helpers were added as minimal stubs.

// == Globals and initial state ==
let canvas, ctx;

let cloudParticles = [];
let bullets = [];
let enemies = [];
let diamonds = [];
let tunnels = [];
let tanks = [];
let walkers = [];
let mechs = [];
let debris = [];
let explosions = [];
let lightning = [];
let powerUps = [];
let reflectionEffects = [];
let redPunchEffects = [];
let minionsToAdd = [];

let keys = {};
let shootCooldown = 0;
let frameCount = 0;
let firingIndicatorAngle = 0;

let score = 0;
let wave = 0;
let waveTransition = false;
let waveTransitionTimer = 0;
const WAVE_BREAK_MS = 3000;

let highScore = 0;
let highScores = [];

let gameOver = false;
let recordedScoreThisRun = false;

let cinematic = {
  playing: false,
  playerName: "Pilot"
};

let player = {
  x: 0,
  y: 0,
  size: 28,
  speed: 4,
  health: 100,
  maxHealth: 100,
  lives: 3,
  invulnerable: false,
  invulnerableTimer: 0,
  reflectAvailable: false,
  fireRateBoost: 1,
  healAccumulator: 0
};

let goldStar = {
  x: 0,
  y: 0,
  size: 36,
  health: 200,
  maxHealth: 200,
  alive: true,
  collecting: false,
  collectTimer: 0,
  speed: 2,
  reflectAvailable: false,
  redPunchLevel: 0,
  blueCannonnLevel: 0,
  redKills: 0,
  blueKills: 0,
  punchCooldown: 0,
  cannonCooldown: 0,
  respawnTimer: 0,
  healAccumulator: 0,
  targetPowerUp: null
};

const GOLD_STAR_PICKUP_FRAMES = 30;
const PICKUP_RADIUS = 60;
const MIN_SPAWN_DIST = 220;

// -------------------- Drawing functions --------------------

function drawClouds() {
  cloudParticles.forEach(c => {
    ctx.fillStyle = `rgba(220,230,240,${c.opacity})`;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCityBackground() {
  // Simple city silhouette
  ctx.fillStyle = "rgba(20,20,30,0.8)";
  for (let i = 0; i < 20; i++) {
    const x = i * (canvas.width / 20);
    const height = 100 + Math.sin(i) * 50;
    ctx.fillRect(x, canvas.height - height, canvas.width / 20 - 5, height);
  }
}

function drawPlayer() {
  const invulFlash = player.invulnerable && Math.floor(Date.now()/100)%2 === 0;
  ctx.fillStyle = invulFlash ? "rgba(0,255,0,0.5)" : "lime";
  ctx.fillRect(player.x-player.size/2, player.y-player.size/2, player.size, player.size);

  if (goldStarAura.active && (shootCooldown > 0 || (keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"]))) {
    const indicatorDistance = player.size / 2 + 8;
    const dotX = player.x + Math.cos(firingIndicatorAngle) * indicatorDistance;
    const dotY = player.y + Math.sin(firingIndicatorAngle) * indicatorDistance;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "yellow";
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    firingIndicatorAngle += 0.15;
  }

  if (player.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(player.x, player.y, player.size/2 + 14, 0, Math.PI*2); 
    ctx.stroke();
  }
}

function drawBullets() { 
  ctx.fillStyle = "yellow"; 
  bullets.forEach(b => ctx.fillRect(b.x-b.size/2, b.y-b.size/2, b.size, b.size)); 
}

function drawEnemies() {
  enemies.forEach(e => {
    if (!e) return;
    
    if (e.type === "red-square") { 
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.fillStyle = "red"; 
      ctx.fillRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
      ctx.shadowBlur = 0;
      
      const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255,100,100,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);

      try {
        const eyeTriggerDist = 140;
        const dxP = player.x - e.x, dyP = player.y - e.y, dP = Math.hypot(dxP, dyP);
        const dxG = goldStar.x - e.x, dyG = goldStar.y - e.y, dG = Math.hypot(dxG, dyG);
        let target = null, td = Infinity;
        if (dP < eyeTriggerDist) { target = {x: player.x, y: player.y}; td = dP; }
        if (dG < eyeTriggerDist && dG < td) { target = {x: goldStar.x, y: goldStar.y}; td = dG; }
        if (target) {
          const insideRadius = Math.min(6, e.size/4);
          const dirX = target.x - e.x, dirY = target.y - e.y;
          const mag = Math.hypot(dirX, dirY) || 1;
          const eyeOffset = Math.min(insideRadius, Math.max(2, insideRadius * 0.8));
          const eyeX = e.x + (dirX / mag) * eyeOffset;
          const eyeY = e.y + (dirY / mag) * eyeOffset;
          ctx.beginPath();
          ctx.fillStyle = "rgba(160,200,255,0.95)";
          ctx.arc(eyeX, eyeY, 5, 0, Math.PI*2);
          ctx.fill();
        }
      } catch (err) {}
    }
    else if (e.type === "triangle") { 
      ctx.shadowBlur = 15;
      ctx.shadowColor = "cyan";
      ctx.fillStyle = "cyan"; 
      ctx.beginPath(); 
      ctx.moveTo(e.x, e.y-e.size/2); 
      ctx.lineTo(e.x-e.size/2, e.y+e.size/2); 
      ctx.lineTo(e.x+e.size/2, e.y+e.size/2); 
      ctx.closePath(); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      const pulse = Math.sin(frameCount * 0.08 + e.x) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(100,255,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.moveTo(e.x, e.y-e.size/2); 
      ctx.lineTo(e.x-e.size/2, e.y+e.size/2); 
      ctx.lineTo(e.x+e.size/2, e.y+e.size/2); 
      ctx.closePath(); 
      ctx.stroke();

      try {
        const fireRate = 100;
        const chargeTime = 30;
        const chargeStart = Math.max(0, fireRate - chargeTime);
        const st = e.shootTimer || 0;
        if (st > chargeStart) {
          const progress = Math.min(1, (st - chargeStart) / chargeTime);
          const cx = e.x, cy = e.y;
          const tx = e.x, ty = e.y - e.size/2;
          const dotX = cx + (tx - cx) * progress;
          const dotY = cy + (ty - cy) * progress;
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,50,50,${0.4 + progress*0.6})`;
          const r = 3 + progress * 4;
          ctx.arc(dotX, dotY, r, 0, Math.PI*2);
          ctx.fill();
          if (progress >= 1) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,80,80,0.6)";
            ctx.arc(tx, ty, 6, 0, Math.PI*2);
            ctx.fill();
          }
        }
      } catch (err) {}
    }
    else if (e.type === "boss") { 
      const pulse = Math.sin(frameCount * 0.05) * 10 + e.size/2;
      ctx.shadowBlur = 30;
      ctx.shadowColor = "yellow";
      ctx.fillStyle = "yellow"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, pulse + 10, 0, Math.PI*2);
      ctx.stroke();
    }
    else if (e.type === "mini-boss") { 
      const pulse = Math.sin(frameCount * 0.07) * 5 + e.size/2;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "orange";
      ctx.fillStyle = "orange"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI * 2); 
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle||0);
      
      if (e.shieldActive) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "purple";
      }
      ctx.fillStyle = e.shieldActive ? "rgba(138,43,226,0.8)" : "purple";
      ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
      ctx.shadowBlur = 0;
      
      if (e.shieldActive) {
        const shieldPulse = Math.sin(frameCount * 0.1) * 5 + 60;
        ctx.strokeStyle = `rgba(138,43,226,${0.5 + Math.sin(frameCount * 0.1) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shieldPulse, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
    else if (e.type === "mother-core") {
      // Draw main core
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      
      const glowIntensity = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
      ctx.shadowBlur = 50;
      ctx.shadowColor = "rgba(0,200,255,0.8)";
      ctx.strokeStyle = `rgba(0,150,255,${glowIntensity})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, -e.size/2);
      ctx.lineTo(e.size/2, 0);
      ctx.lineTo(0, e.size/2);
      ctx.lineTo(-e.size/2, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(20,40,80,0.9)";
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      
      // Draw rotating cores
      e.cores.forEach(core => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "cyan";
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(core.x, core.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      });
      
      // Health bar
      const barWidth = e.size;
      const barHeight = 10;
      ctx.fillStyle = "rgba(50,50,50,0.8)";
      ctx.fillRect(e.x - barWidth/2, e.y - e.size/2 - 30, barWidth, barHeight);
      ctx.fillStyle = "red";
      ctx.fillRect(e.x - barWidth/2, e.y - e.size/2 - 30, barWidth * (e.health / e.maxHealth), barHeight);
    }
  });
}

function drawTanks() {
  tanks.forEach(tank => {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    
    // Tank body
    ctx.fillStyle = "rgba(100,100,100,0.9)";
    ctx.fillRect(-tank.width/2, -tank.height/2, tank.width, tank.height);
    
    // Turret
    ctx.rotate(tank.turretAngle);
    ctx.fillStyle = "rgba(80,80,80,0.9)";
    ctx.fillRect(0, -5, 25, 10);
    
    ctx.restore();
  });
}

function drawWalkers() {
  walkers.forEach(walker => {
    ctx.save();
    ctx.translate(walker.x, walker.y);
    
    // Body
    ctx.fillStyle = "rgba(120,120,150,0.9)";
    ctx.fillRect(-walker.width/2, -walker.height/2, walker.width, walker.height/2);
    
    // Legs
    const legOffset = Math.sin(walker.legPhase) * 10;
    ctx.strokeStyle = "rgba(100,100,130,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, walker.height/4);
    ctx.lineTo(-10 + legOffset, walker.height/2 + 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(10, walker.height/4);
    ctx.lineTo(10 - legOffset, walker.height/2 + 10);
    ctx.stroke();
    
    ctx.restore();
  });
}

function drawMechs() {
  mechs.forEach(mech => {
    ctx.save();
    ctx.translate(mech.x, mech.y);
    
    // Shield
    if (mech.shieldActive) {
      const pulse = Math.sin(frameCount * 0.1) * 5;
      ctx.strokeStyle = "rgba(100,200,255,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, mech.size/2 + 15 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Body
    ctx.fillStyle = "rgba(150,50,50,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, mech.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Weapons
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + frameCount * 0.02;
      ctx.fillStyle = "rgba(200,100,100,0.9)";
      ctx.fillRect(Math.cos(angle) * 30 - 3, Math.sin(angle) * 30 - 3, 6, 6);
    }
    
    ctx.restore();
  });
}

function drawDebris() {
  debris.forEach(d => {
    const alpha = d.life / d.maxLife;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);
    ctx.fillStyle = `rgba(150,150,150,${alpha})`;
    ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
    ctx.restore();
  });
}

function drawDiamonds() {
  diamonds.forEach(d => {
    ctx.save(); 
    ctx.translate(d.x, d.y); 
    ctx.rotate(d.angle||0);
    
    // Graviton pull visual effect
    if (d.gravitonActive && d.gravitonCharge < 600) {
      const pullIntensity = d.gravitonCharge / 600;
      ctx.strokeStyle = `rgba(100,200,255,${pullIntensity * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, d.size/2 + 60 + Math.sin(frameCount * 0.1) * 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner rings
      ctx.strokeStyle = `rgba(150,220,255,${pullIntensity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, d.size/2 + 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Vulnerable state glow
    if (d.vulnerable) {
      const vulnPulse = Math.sin(frameCount * 0.2) * 0.3 + 0.7;
      ctx.shadowBlur = 40;
      ctx.shadowColor = `rgba(255,100,100,${vulnPulse})`;
    }
    
    const glowIntensity = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.shadowBlur = d.vulnerable ? 40 : 30;
    ctx.shadowColor = d.canReflect ? "cyan" : (d.vulnerable ? "red" : "white");
    ctx.strokeStyle = d.canReflect ? `rgba(0,255,255,${glowIntensity})` : (d.vulnerable ? `rgba(255,100,100,${glowIntensity})` : `rgba(255,255,255,${glowIntensity})`);
    ctx.lineWidth = 3;
    ctx.beginPath(); 
    ctx.moveTo(0, -d.size/2 - d.pulse); 
    ctx.lineTo(d.size/2 + d.pulse, 0); 
    ctx.lineTo(0, d.size/2 + d.pulse); 
    ctx.lineTo(-d.size/2 - d.pulse, 0); 
    ctx.closePath(); 
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    
    d.attachments.forEach(a => {
      if (a.type === "triangle") {
        ctx.fillStyle = "cyan";
        ctx.beginPath(); 
        ctx.moveTo(a.x, a.y-(a.size||20)/2); 
        ctx.lineTo(a.x-(a.size||20)/2, a.y+(a.size||20)/2); 
        ctx.lineTo(a.x+(a.size||20)/2, a.y+(a.size||20)/2); 
        ctx.closePath(); 
        ctx.fill();
      }
      else if (a.type === "reflector") {
        ctx.save(); 
        ctx.translate(a.x, a.y); 
        ctx.rotate(a.orbitAngle||0); 
        ctx.fillStyle = "magenta"; 
        ctx.fillRect(-(a.width||20)/2, -(a.height||10)/2, a.width||20, a.height||10); 
        ctx.restore();
      }
      else {
        ctx.fillStyle = "lime"; 
        ctx.fillRect(a.x-(a.size||20)/2, a.y-(a.size||20)/2, a.size||20, a.size||20);
      }
    });
  });
}

function drawLightning() { 
  lightning.forEach(l => {
    ctx.shadowBlur = 8;
    ctx.shadowColor = "cyan";
    ctx.fillStyle = "cyan"; 
    ctx.fillRect(l.x-(l.size||6)/2, l.y-(l.size||6)/2, l.size||6, l.size||6);
    ctx.shadowBlur = 0;
  });
}

function drawExplosions(){ 
  explosions.forEach(ex => { 
    ctx.fillStyle = ex.color; 
    ctx.beginPath(); 
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2); 
    ctx.fill(); 
  }); 
}

function drawTunnels() { 
  tunnels.forEach(t => { 
    if (t.active) { 
      ctx.fillStyle = "rgba(0,255,255,0.5)"; 
      ctx.fillRect(t.x, t.y, t.width, t.height); 
    }
  }); 
}

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.save(); 
    ctx.translate(p.x, p.y);
    
    const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
    ctx.shadowBlur = 15 * pulse;
    
    if (p.type === "red-punch") {
      ctx.shadowColor = "red";
      ctx.fillStyle = "red";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "blue-cannon") {
      ctx.shadowColor = "cyan";
      ctx.fillStyle = "cyan";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "health") {
      ctx.shadowColor = "magenta";
      ctx.fillStyle = "magenta";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "reflect") {
      ctx.shadowColor = "purple";
      ctx.fillStyle = "purple";
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2, 0, Math.PI*2); 
      ctx.fill();
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.arc(0, 0, p.size/2 + 4, 0, Math.PI*2); 
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

function drawGoldStar() {
  if (!goldStar.alive) return;
  if (goldStar.collecting) {
    const progress = 1 - (goldStar.collectTimer / GOLD_STAR_PICKUP_FRAMES);
    const maxRadius = goldStar.size/2 + 18;
    const currentRadius = goldStar.size/2 + 10 + (progress * 8);
    ctx.strokeStyle = `rgba(255, 255, 0, ${progress})`;
    ctx.lineWidth = 3 * progress;
    ctx.beginPath(); 
    ctx.arc(goldStar.x, goldStar.y, currentRadius, 0, Math.PI*2); 
    ctx.stroke();
  }
  ctx.save(); 
  ctx.translate(goldStar.x, goldStar.y); 
  ctx.fillStyle = "gold";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i*4*Math.PI)/5 - Math.PI/2;
    const radius = i%2===0 ? goldStar.size/2 : goldStar.size/4;
    const x = Math.cos(angle)*radius, y = Math.sin(angle)*radius;
    if (i === 0) ctx.moveTo(x,y); 
    else ctx.lineTo(x,y);
  }
  ctx.closePath(); 
  ctx.fill();
  ctx.restore();
  
  const barWidth = 50; 
  ctx.fillStyle = "gray"; 
  ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth, 5);
  ctx.fillStyle = "gold"; 
  ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth*(goldStar.health/goldStar.maxHealth), 5);

  if (goldStar.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(goldStar.x, goldStar.y, goldStar.size/2 + 14, 0, Math.PI*2); 
    ctx.stroke();
  }
}

function drawRedPunchEffects() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  redPunchEffects.forEach(e => {
    const lifeFactor = Math.max(0, e.life / e.maxLife);
    if (e.fill) {
      ctx.beginPath();
      ctx.fillStyle = e.color;
      ctx.globalAlpha = lifeFactor * 0.9;
      ctx.arc(e.x, e.y, Math.max(2, e.r), 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 6 * lifeFactor;
      ctx.arc(e.x, e.y, Math.max(2, e.r), 0, Math.PI*2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = r || 6;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawUI() {
  const pad = 12;
  const hudW = 260;
  const hudH = 84;
  const x = pad;
  const y = pad;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = "rgba(0,255,255,0.08)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(10,14,20,0.6)";
  roundRect(ctx, x, y, hudW, hudH, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(0,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x+0.5, y+0.5, hudW-1, hudH-1, 10);
  ctx.stroke();
  ctx.restore();

  ctx.font = "12px 'Orbitron', monospace";
  ctx.textBaseline = "top";

  const hbX = x + 12, hbY = y + 10, hbW = hudW - 24, hbH = 10;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, hbX, hbY, hbW, hbH, 6);
  ctx.fill();

  const healthRatio = Math.max(0, player.health / player.maxHealth);
  const grad = ctx.createLinearGradient(hbX, hbY, hbX+hbW, hbY);
  grad.addColorStop(0, "rgba(0,255,180,0.95)");
  grad.addColorStop(0.5, "rgba(0,200,255,0.95)");
  grad.addColorStop(1, "rgba(100,50,255,0.95)");

  ctx.save();
  ctx.shadowColor = "rgba(0,200,255,0.15)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = grad;
  roundRect(ctx, hbX+1, hbY+1, (hbW-2) * healthRatio, hbH-2, 6);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(220,230,255,0.95)";
  ctx.font = "11px 'Orbitron', monospace";
  ctx.fillText(`HP ${Math.floor(player.health)}/${player.maxHealth}`, hbX + 6, hbY - 14);

  ctx.fillStyle = "rgba(200,220,255,0.95)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText(`SCORE: ${score}`, hbX, hbY + hbH + 10);
  ctx.fillText(`BEST: ${highScore}`, hbX + 100, hbY + hbH + 10);
  ctx.fillText(`WAVE: ${wave+1}`, hbX + 180, hbY + hbH + 10);

  const livesX = x + hudW - 12 - 18;
  const livesY = y + 12;
  for (let i = 0; i < 5; i++) {
    const cx = livesX - i * 14;
    ctx.beginPath();
    ctx.arc(cx, livesY, 5, 0, Math.PI*2);
    if (i < player.lives) {
      ctx.fillStyle = "rgba(255,120,80,0.98)";
      ctx.shadowColor = "rgba(255,80,40,0.35)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
    }
    ctx.closePath();
  }
  ctx.fillStyle = "rgba(180,200,255,0.8)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText("LIVES", livesX - 3*14, livesY + 10);

  const badgeX = x + hudW - 62, badgeY = y + hudH - 26;
  roundRect(ctx, badgeX, badgeY, 50, 16, 6);
  ctx.fillStyle = player.reflectAvailable ? "rgba(0,220,255,0.08)" : "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = player.reflectAvailable ? "rgba(0,220,255,0.35)" : "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX + 0.5, badgeY + 0.5, 49, 15, 6);
  ctx.stroke();

  ctx.fillStyle = player.reflectAvailable ? "rgba(0,220,255,0.95)" : "rgba(180,200,255,0.35)";
  ctx.font = "11px 'Orbitron', monospace";
  ctx.fillText("REFLECT", badgeX + 6, badgeY + 2);

  const gsX = x + hudW + 12;
  const gsY = y + 8;
  ctx.save();
  ctx.fillStyle = "rgba(10,14,20,0.5)";
  roundRect(ctx, gsX, gsY, 150, 56, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(100,120,255,0.06)";
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = goldStar.alive ? "rgba(255,210,90,0.98)" : "rgba(255,100,100,0.9)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText("GOLD STAR", gsX + 10, gsY + 6);

  const alX = gsX + 10, alY = gsY + 26;
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillStyle = "rgba(190,210,255,0.9)";
  ctx.fillText(`Aura Lv ${goldStarAura.level}`, alX, alY - 12);

  const barW = 110, barH = 8;
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, alX, alY, barW, barH, 6);
  ctx.fill();

  const fillRatio = Math.min(1, goldStarAura.level / 5);
  const auraGrad = ctx.createLinearGradient(alX, alY, alX + barW, alY);
  auraGrad.addColorStop(0, "rgba(255,220,100,0.9)");
  auraGrad.addColorStop(1, "rgba(255,100,40,0.9)");

  ctx.fillStyle = auraGrad;
  roundRect(ctx, alX + 1, alY + 1, (barW - 2) * fillRatio, barH - 2, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(180,200,255,0.75)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText(`R: ${Math.floor(goldStarAura.radius)}`, alX + barW - 38, alY - 12);

  let iconX = alX + barW + 8;
  const iconY = alY - 8;
  ctx.font = "10px 'Orbitron', monospace";
  if (goldStar.redPunchLevel > 0) {
    ctx.fillStyle = "red";
    ctx.fillRect(iconX, iconY, 12, 12);
    ctx.fillStyle = "rgba(220,230,255,0.95)";
    ctx.fillText(goldStar.redPunchLevel.toString(), iconX + 16, iconY + 1);
    iconX += 34;
  }
  if (goldStar.blueCannonnLevel > 0) {
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(iconX + 6, iconY);
    ctx.lineTo(iconX, iconY + 12);
    ctx.lineTo(iconX + 12, iconY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(220,230,255,0.95)";
    ctx.fillText(goldStar.blueCannonnLevel.toString(), iconX + 16, iconY + 1);
    iconX += 34;
  }

  if (waveTransition) {
    const bannerW = 320, bannerH = 48;
    const bx = (canvas.width - bannerW) / 2;
    const by = 22;
    ctx.save();
    ctx.fillStyle = "rgba(5,6,10,0.75)";
    roundRect(ctx, bx, by, bannerW, bannerH, 10);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,200,255,0.14)";
    ctx.lineWidth = 1;
    roundRect(ctx, bx + 0.5, by + 0.5, bannerW - 1, bannerH - 1, 10);
    ctx.stroke();

    ctx.fillStyle = "rgba(200,230,255,0.96)";
    ctx.font = "14px 'Orbitron', monospace";
    ctx.fillText("WAVE CLEARED", bx + 18, by + 8);
    const timeRemaining = Math.ceil((WAVE_BREAK_MS - waveTransitionTimer * (1000/60)) / 1000);
    ctx.fillStyle = "rgba(160,200,255,0.86)";
    ctx.font = "12px 'Orbitron', monospace";
    ctx.fillText(`Next in ${timeRemaining}s`, bx + 18, by + 28);
    ctx.restore();
  }
}

// -------------------- Waves and spawning --------------------

const waves = [
  { enemies: [{ type: "red-square", count: 2 }] },
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }] },
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }] },
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }, { type: "reflector", count: 1 }] },
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }, { type: "reflector", count: 1 }] },
  { enemies: [{ type: "boss", count: 1 }, { type: "triangle", count: 3 }] },
  { enemies: [{ type: "reflector", count: 2 }, { type: "triangle", count: 5 }] },
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }, { type: "mini-boss", count: 1 }] },
  { enemies: [{ type: "mini-boss", count: 3 }, { type: "boss", count: 1 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }] },
  { tunnel: true, enemies: [{ type: "triangle", count: 8 }, { type: "reflector", count: 3 }] },
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 3 }, { type: "diamond", count: 1 }] },
  // Wave 12: Atmospheric Entry
  { 
    theme: "atmospheric-entry",
    enemies: [{ type: "red-square", count: 8 }, { type: "triangle", count: 6 }]
  },
  // Wave 13: Cloud Combat
  {
    theme: "cloud-combat",
    clouds: true,
    enemies: [{ type: "triangle", count: 10 }, { type: "reflector", count: 2 }]
  },
  // Wave 14: Descent to City
  {
    theme: "city-descent",
    enemies: [{ type: "red-square", count: 6 }, { type: "triangle", count: 6 }, { type: "tank", count: 2 }]
  },
  // Wave 15: Ruined City
  {
    theme: "ruined-city",
    enemies: [{ type: "tank", count: 4 }, { type: "walker", count: 3 }, { type: "mech", count: 1 }]
  },
  // Wave 16: Siege Defense
  {
    theme: "siege-defense",
    enemies: [{ type: "tank", count: 3 }, { type: "walker", count: 4 }, { type: "mech", count: 2 }, { type: "triangle", count: 5 }]
  },
  // Wave 17: Calm Before the Storm
  {
    theme: "calm",
    enemies: [{ type: "reflector", count: 3 }, { type: "triangle", count: 4 }]
  },
  // Wave 18: Counter-Offensive Begins
  {
    theme: "counter-offensive",
    enemies: [{ type: "red-square", count: 10 }, { type: "triangle", count: 10 }, { type: "tank", count: 5 }, { type: "walker", count: 3 }]
  },
  // Wave 19: Full Assault
  {
    theme: "full-assault",
    enemies: [{ type: "tank", count: 6 }, { type: "walker", count: 6 }, { type: "mech", count: 3 }, { type: "mini-boss", count: 2 }]
  },
  // Wave 20: The Last Stand
  {
    theme: "last-stand",
    enemies: [{ type: "red-square", count: 15 }, { type: "triangle", count: 15 }, { type: "tank", count: 5 }, { type: "walker", count: 5 }, { type: "mech", count: 4 }, { type: "boss", count: 1 }]
  },
  // Wave 21: MOTHER CORE
  {
    theme: "mother-core",
    enemies: [{ type: "mother-core", count: 1 }, { type: "triangle", count: 8 }, { type: "reflector", count: 4 }]
  }
];

function spawnWave(waveIndex) {
  if (waveIndex < 0 || waveIndex >= waves.length) return;
  const waveData = waves[waveIndex];
  
  // Handle special themes
  if (waveData.theme === "cloud-combat" || waveData.clouds) {
    spawnCloudParticles(50);
  }
  
  if (waveData.tunnel) spawnTunnel();
  if (waveData.enemies) {
    waveData.enemies.forEach(group => {
      if (group.type === "red-square") spawnRedSquares(group.count);
      else if (group.type === "triangle") spawnTriangles(group.count);
      else if (group.type === "reflector") spawnReflectors(group.count);
      else if (group.type === "boss") for (let i = 0; i < group.count; i++) spawnBoss();
      else if (group.type === "mini-boss") for (let i = 0; i < group.count; i++) spawnMiniBoss();
      else if (group.type === "diamond") for (let i = 0; i < group.count; i++) spawnDiamondEnemy();
      else if (group.type === "tank") spawnTank(group.count);
      else if (group.type === "walker") spawnWalker(group.count);
      else if (group.type === "mech") spawnMech(group.count);
      else if (group.type === "mother-core") spawnMotherCore();
    });
  }
}

function tryAdvanceWave() {
  const allEnemiesClear = enemies.length === 0 && diamonds.length === 0 && tunnels.length === 0 && 
                          tanks.length === 0 && walkers.length === 0 && mechs.length === 0;
  
  if (allEnemiesClear && !waveTransition) {
    bullets = [];
    lightning = [];

    if (wave >= waves.length-1) { 
      waveTransition = true; 
      waveTransitionTimer = 0; 
      return; 
    }
    waveTransition = true;
    waveTransitionTimer = 0;
  }

  if (waveTransition) {
    waveTransitionTimer++;
    if (waveTransitionTimer >= WAVE_BREAK_MS / (1000/60)) {
      wave++;
      if (wave < waves.length) {
        spawnWave(wave);

        // Move player closer to Earth after each wave for the first 11 waves (indices 0..10)
        // This ensures the background matches the player approaching Earth.
        if (wave <= 10) {
          const earthY = canvas.height * 0.85;
          player.y += (earthY - player.y) * 0.15; // move 15% of remaining distance
          player.x += (canvas.width/2 - player.x) * 0.06; // slight horizontal centering
        }
      }
      waveTransition = false;
      waveTransitionTimer = 0;
    }
  }
}

// -------------------- Visual effects --------------------

function updateAndDrawReflectionEffects() {
  for (let i = reflectionEffects.length - 1; i >= 0; i--) {
    const r = reflectionEffects[i];
    r.life--;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = "rgba(180,240,255," + (r.life / (r.maxLife || 20)) + ")";
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(1, r.life / 3), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    if (r.life <= 0) reflectionEffects.splice(i, 1);
  }
}

// -------------------- Game loop --------------------

function gameLoop(now) {
  if (cinematic.playing) return;

  frameCount++;

  updatePlayerMovement();
  handleShooting();
  updateBullets();
  updateLightning();
  updateExplosions();
  updatePowerUps();
  updateTunnels();
  updateRedPunchEffects();
  updateGoldStarAura();
  updateGoldStar();
  updateEnemies();
  updateDebris();
  updateCloudParticles();
  checkBulletCollisions();
  tryAdvanceWave();

  if (player.health <= 0) {
    player.lives--;
    if (player.lives > 0) {
      respawnPlayer();
    } else {
      gameOver = true;
      saveHighScoresOnGameOver();
    }
  }

  if (!ensureCanvas()) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground(wave);
  drawTunnels();
  drawDiamonds();
  drawEnemies();
  drawTanks();
  drawWalkers();
  drawMechs();
  drawDebris();
  drawBullets();
  drawLightning();
  drawExplosions();
  drawPowerUps();
  drawGoldStar();
  drawGoldStarAura(ctx);
  drawRedPunchEffects();
  drawPlayer();
  updateAndDrawReflectionEffects();
  drawUI();

  if (gameOver) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 30);
    ctx.restore();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// -------------------- Spawn / utility functions (fixed) --------------------

function spawnPowerUp(x, y, type) {
  powerUps.push({x, y, type, size: 18, lifetime: 600, active: true});
}

function spawnTunnel() {
  const h = canvas.height/3, w = 600;
  tunnels.push({x: canvas.width, y: 0, width: w, height: h, speed: 2, active: true}, {x: canvas.width, y: canvas.height-h, width: w, height: h, speed: 2, active: true});
}

function createExplosion(x,y,color="red"){ 
  for (let i=0;i<20;i++) explosions.push({x, y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color, life:30}); 
}

function spawnCloudParticles(count = 50) {
  for (let i = 0; i < count; i++) {
    cloudParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 60 + 20,
      opacity: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.2
    });
  }
}

// -------------------- Input / player / bullets --------------------

function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;
  let dirX = 0, dirY = 0;
  if (keys["arrowup"]) dirY = -1; if (keys["arrowdown"]) dirY = 1;
  if (keys["arrowleft"]) dirX = -1; if (keys["arrowright"]) dirX = 1;
  if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
    const mag = Math.hypot(dirX, dirY) || 1;
    bullets.push({x: player.x, y: player.y, dx: (dirX/mag)*10, dy: (dirY/mag)*10, size: 6, owner: "player"});
    shootCooldown = Math.max(5, Math.floor(10 / player.fireRateBoost));
    
    firingIndicatorAngle += Math.PI / 2;
  }
}

function updatePlayerMovement() {
  let mx = 0, my = 0;
  if (keys["w"]) my = -1;
  if (keys["s"]) my = 1;
  if (keys["a"]) mx = -1;
  if (keys["d"]) mx = 1;
  const mag = Math.hypot(mx, my) || 0;
  if (mag > 0) {
    player.x += (mx / mag) * player.speed;
    player.y += (my / mag) * player.speed;
    player.x = Math.max(player.size/2, Math.min(canvas.width - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(canvas.height - player.size/2, player.y));
  }
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx; b.y += b.dy;
    return b.x >= -40 && b.x <= canvas.width+40 && b.y >= -40 && b.y <= canvas.height+40;
  });
}

function updatePowerUps() {
  powerUps = powerUps.filter(p => { p.lifetime--; return p.lifetime > 0; });
}

function updateTunnels() { 
  for (let i = tunnels.length-1; i >= 0; i--) { 
    const t = tunnels[i]; 
    if (!t.active) continue; 
    t.x -= t.speed; 
    if (t.x+t.width < 0) tunnels.splice(i,1); 
  }
}

function updateExplosions(){ 
  explosions = explosions.filter(ex => { 
    ex.x += ex.dx; 
    ex.y += ex.dy; 
    ex.life--; 
    return ex.life>0; 
  }); 
}

function updateRedPunchEffects() {
  for (let i = redPunchEffects.length-1; i >= 0; i--) {
    const e = redPunchEffects[i];
    e.life--;
    e.r = e.maxR * (1 - e.life / e.maxLife);
    if (e.life <= 0) redPunchEffects.splice(i,1);
  }
}

function updateDebris() {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.x += d.dx;
    d.y += d.dy;
    d.rotation += d.rotationSpeed;
    d.life--;
    if (d.life <= 0) {
      debris.splice(i, 1);
    }
  }
}

function updateCloudParticles() {
  cloudParticles.forEach(c => {
    c.x -= c.speed;
    if (c.x + c.size < 0) {
      c.x = canvas.width + c.size;
    }
  });
}

// -------------------- Gold Star & Aura --------------------

const goldStarAura = {
  baseRadius: 50,
  radius: 50,
  pulse: 0,
  level: 0,
  active: false
};

let auraSparks = [];
let auraShockwaves = [];
let auraPulseTimer = 0;

function getAuraSparkColor() {
  switch (goldStarAura.level) {
    case 0: return "rgba(255,255,100,0.3)";
    case 1: return "rgba(255,200,80,0.35)";
    case 2: return "rgba(255,150,60,0.4)";
    case 3: return "rgba(255,100,40,0.45)";
    case 4: return "rgba(255,80,20,0.5)";
    default: return "rgba(255,50,0,0.5)";
  }
}

function updateAuraStats() {
  goldStarAura.radius = goldStarAura.baseRadius * (1 + 0.05 * goldStarAura.level);

  if (goldStar.alive) {
    const dx = player.x - goldStar.x;
    const dy = player.y - goldStar.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    goldStarAura.active = dist < goldStarAura.radius;
  } else {
    goldStarAura.active = false;
  }
}

function resetAuraOnDeath() {
  goldStarAura.level = 0;
  goldStarAura.radius = goldStarAura.baseRadius;
  goldStarAura.active = false;
  goldStarAura.pulse = 0;

  auraSparks = [];
  auraShockwaves = [];

  for (const l of lightning) {
    if (l._origDx !== undefined && l._origDy !== undefined) {
      l.dx = l._origDx;
      l.dy = l._origDy;
      l._inAura = false;
    }
  }
}

function triggerAuraShockwave() {
  auraShockwaves.push({
    x: goldStar.x,
    y: goldStar.y,
    r: goldStarAura.radius * 0.5,
    maxR: goldStarAura.radius * 2,
    life: 30,
    maxLife: 30,
    color: getAuraSparkColor()
  });
}

function updateAuraShockwaves() {
  auraShockwaves.forEach(s => {
    s.r += (s.maxR - s.r) * 0.25;
    s.life--;
    lightning.forEach(l => {
      const dx = l.x - s.x;
      const dy = l.y - s.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < s.r && dist > 0) {
        const push = (1 - dist / s.r) * 2;
        l.dx += (dx / dist) * push * 0.1;
        l.dy += (dy / dist) * push * 0.1;
      }
    });
  });
  auraShockwaves = auraShockwaves.filter(s => s.life > 0);
}

function drawAuraShockwaves(ctx) {
  auraShockwaves.forEach(s => {
    const alpha = s.life / s.maxLife;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    const color = s.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${0.4 * alpha})`);
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 - 4 * (1 - alpha);
    ctx.stroke();
  });
}

function updateAuraSparks() {
  if (!goldStar.alive) return;
  auraPulseTimer++;
  if (auraPulseTimer % 6 === 0) {
    auraSparks.push({
      x: goldStar.x + (Math.random() - 0.5) * goldStarAura.radius * 2,
      y: goldStar.y + (Math.random() - 0.5) * goldStarAura.radius * 2,
      life: 30,
      color: getAuraSparkColor()
    });
  }
  auraSparks.forEach(s => s.life--);
  auraSparks = auraSparks.filter(s => s.life > 0);
}

function drawAuraSparks(ctx) {
  auraSparks.forEach(s => {
    const alpha = s.life / 30;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
    const color = s.color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function drawAura(ctx) {
  if (!goldStar.alive || !goldStarAura.active) return;
  const r = goldStarAura.radius + Math.sin(Date.now() * 0.005) * 10;
  const grad = ctx.createRadialGradient(goldStar.x, goldStar.y, r * 0.3, goldStar.x, goldStar.y, r);
  grad.addColorStop(0, "rgba(255,255,150,0.15)");
  grad.addColorStop(1, getAuraSparkColor());
  ctx.beginPath();
  ctx.arc(goldStar.x, goldStar.y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function applyGoldStarAuraEffects() {
  player.fireRateBoost = 1;

  if (!goldStar.alive || !goldStarAura.active) {
    for (const l of lightning) {
      if (l._origDx !== undefined && l._origDy !== undefined) {
        if (l._inAura) {
          l.dx = l._origDx;
          l.dy = l._origDy;
          l._inAura = false;
        }
      }
    }
    return;
  }

  const dx = player.x - goldStar.x;
  const dy = player.y - goldStar.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < goldStarAura.radius) {
    const healPerSecondStar = 1 + goldStarAura.level * 0.5;
    goldStar.healAccumulator = goldStar.healAccumulator || 0;
    goldStar.healAccumulator += healPerSecondStar / 60;
    if (goldStar.health < goldStar.maxHealth) {
      const toHeal = Math.floor(goldStar.healAccumulator);
      if (toHeal > 0) {
        goldStar.health = Math.min(goldStar.maxHealth, goldStar.health + toHeal);
        goldStar.healAccumulator -= toHeal;
        createExplosion(goldStar.x + (Math.random()-0.5)*8, goldStar.y + (Math.random()-0.5)*8, "magenta");
      }
      player.fireRateBoost = 1 + goldStarAura.level * 0.15;
    } else {
      const healPerSecondPlayer = 1 + goldStarAura.level * 0.5;
      player.healAccumulator = player.healAccumulator || 0;
      player.healAccumulator += healPerSecondPlayer / 60;
      const toHealP = Math.floor(player.healAccumulator);
      if (toHealP > 0) {
        player.health = Math.min(player.maxHealth, player.health + toHealP);
        player.healAccumulator -= toHealP;
      }
      player.fireRateBoost = 1 + goldStarAura.level * 0.15;
    }
  } else {
    player.fireRateBoost = 1;
  }

  for (const l of lightning) {
    if (l._origDx === undefined || l._origDy === undefined) {
      l._origDx = l.dx;
      l._origDy = l.dy;
      l._inAura = false;
    }

    const bx = l.x - goldStar.x;
    const by = l.y - goldStar.y;
    const bd = Math.sqrt(bx*bx + by*by);
    const bulletSlowRadius = goldStarAura.radius * 1.5;
    if (bd < bulletSlowRadius) {
      const slowFactor = Math.max(0.5, 1 - 0.08 * goldStarAura.level);
      l.dx = l._origDx * slowFactor;
      l.dy = l._origDy * slowFactor;
      l._inAura = true;
    } else {
      if (l._inAura) {
        l.dx = l._origDx;
        l.dy = l._origDy;
        l._inAura = false;
      }
    }
  }
}

function levelUpGoldStar() {
  goldStarAura.level++;
  updateAuraStats();
  triggerAuraShockwave();
}

function updateGoldStarAura() {
  updateAuraStats();
  updateAuraSparks();
  updateAuraShockwaves();
  applyGoldStarAuraEffects();
}

function drawGoldStarAura(ctx) {
  drawAura(ctx);
  drawAuraSparks(ctx);
  drawAuraShockwaves(ctx);

  if (goldStar.alive && goldStarAura.active) {
    const healingActive = (goldStar.health < goldStar.maxHealth) || (player.health < player.maxHealth && goldStar.health >= goldStar.maxHealth);
    if (healingActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const t = Date.now() * 0.002 + i * 7;
        const jitter = 12 + i * 2;
        ctx.strokeStyle = `rgba(${200 - i*40},${220 - i*40},255,${0.15 + 0.25 * Math.abs(Math.sin(t))})`;
        ctx.lineWidth = 2 + i * 0.6;
        ctx.beginPath();
        const steps = 6;
        const sx = goldStar.x, sy = goldStar.y;
        const tx = player.x, ty = player.y;
        ctx.moveTo(sx, sy);
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const nx = sx + (tx - sx) * u + (Math.sin(t * (1 + s*0.1)) * jitter * (1 - u*0.8));
          const ny = sy + (ty - sy) * u + (Math.cos(t * (1 + s*0.12)) * jitter * (u*0.4));
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// -------------------- Entities and spawning --------------------

function getSafeSpawnPosition(minDist = MIN_SPAWN_DIST) {
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const dxP = x - player.x, dyP = y - player.y;
    const dxG = x - goldStar.x, dyG = y - goldStar.y;
    const dP = Math.hypot(dxP, dyP);
    const dG = Math.hypot(dxG, dyG);
    if (dP >= minDist && dG >= minDist) return { x, y };
  }
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) return { x: 10, y: Math.random() * canvas.height };
  if (edge === 1) return { x: canvas.width - 10, y: Math.random() * canvas.height };
  if (edge === 2) return { x: Math.random() * canvas.width, y: 10 };
  return { x: Math.random() * canvas.width, y: canvas.height - 10 };
}

function respawnGoldStar() {
  goldStar.x = canvas.width/4; goldStar.y = canvas.height/2;
  goldStar.health = goldStar.maxHealth;
  goldStar.alive = true;
  goldStar.redPunchLevel = 0;
  goldStar.blueCannonnLevel = 0;
  goldStar.redKills = 0;
  goldStar.blueKills = 0;
  goldStar.collecting = false;
  goldStar.collectTimer = 0;
  goldStar.targetPowerUp = null;
  goldStar.respawnTimer = 0;
  goldStar.punchCooldown = 0;
  goldStar.cannonCooldown = 0;
  goldStar.reflectAvailable = false;
  goldStar.healAccumulator = 0;
}

function respawnPlayer() {
  player.health = player.maxHealth;
  player.x = canvas.width/2;
  player.y = canvas.height/2;
  player.invulnerable = true;
  player.invulnerableTimer = 120;
  player.healAccumulator = 0;
}

// Spawners for enemy types
function spawnRedSquares(c, fromBoss = false) {
  for (let i = 0; i < c; i++) {
    const pos = getSafeSpawnPosition();
    enemies.push({
      x: pos.x,
      y: pos.y,
      size: 30, speed: 1.8, health: 30, type: "red-square", shootTimer: 0, fromBoss
    });
  }
}

function spawnTriangles(c, fromBoss = false) {
  for (let i = 0; i < c; i++) {
    const pos = getSafeSpawnPosition();
    enemies.push({
      x: pos.x,
      y: pos.y,
      size: 30, speed: 1.5, health: 40, type: "triangle", shootTimer: 0, fromBoss
    });
  }
}

function spawnReflectors(c) {
  for (let i = 0; i < c; i++) {
    const pos = getSafeSpawnPosition();
    enemies.push({
      x: pos.x,
      y: pos.y,
      width: 40, height: 20, angle: 0, speed: 1.2, health: 200, type: "reflector", shieldActive: false, fromBoss: false
    });
  }
}

function spawnBoss() {
  let pos = { x: canvas.width/2, y: 100 };
  const dP = Math.hypot(pos.x - player.x, pos.y - player.y);
  const dG = Math.hypot(pos.x - goldStar.x, pos.y - goldStar.y);
  if (dP < MIN_SPAWN_DIST || dG < MIN_SPAWN_DIST) {
    pos = getSafeSpawnPosition(MIN_SPAWN_DIST + 50);
  }
  enemies.push({x: pos.x, y: pos.y, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0, angle: 0});
}

function spawnMiniBoss() {
  const pos = getSafeSpawnPosition();
  enemies.push({x: pos.x, y: pos.y, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0, angle: Math.random()*Math.PI*2});
}

function spawnDiamondEnemy() {
  const pos = getSafeSpawnPosition();
  diamonds.push({
    x: pos.x, 
    y: pos.y, 
    size: 40, 
    health: 200, 
    type: "diamond", 
    attachments: [], 
    canReflect: false, 
    angle: Math.random()*Math.PI*2, 
    shootTimer: 0, 
    pulse: 0,
    gravitonTimer: 0,
    gravitonActive: false,
    gravitonCharge: 0,
    vulnerable: false,
    vulnerableTimer: 0,
    pulledEnemies: []
  });
}

// Modified spawners for ground-based units: spawn near bottom of screen
function spawnTank(count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height - (30 + Math.random() * 60); // near bottom
    tanks.push({
      x: x,
      y: y,
      width: 50,
      height: 35,
      health: 150,
      speed: 0.8,
      shootTimer: 0,
      turretAngle: 0
    });
  }
}

function spawnWalker(count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height - (40 + Math.random() * 80); // near bottom
    walkers.push({
      x: x,
      y: y,
      width: 40,
      height: 60,
      health: 200,
      speed: 1.2,
      shootTimer: 0,
      legPhase: 0
    });
  }
}

function spawnMech(count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height - (50 + Math.random() * 100); // near bottom
    mechs.push({
      x: x,
      y: y,
      size: 80,
      health: 400,
      speed: 1.5,
      shootTimer: 0,
      shieldActive: true,
      shieldHealth: 150
    });
  }
}

function spawnMotherCore() {
  const pos = { x: canvas.width / 2, y: canvas.height / 2 };
  enemies.push({
    x: pos.x,
    y: pos.y,
    size: 250,
    health: 3000,
    maxHealth: 3000,
    type: "mother-core",
    phase: 1,
    shootTimer: 0,
    phaseTimer: 0,
    angle: 0,
    cores: [
      { angle: 0, distance: 120, health: 200, shootTimer: 0, x: pos.x + Math.cos(0) * 120, y: pos.y + Math.sin(0) * 120 },
      { angle: Math.PI * 2/3, distance: 120, health: 200, shootTimer: 0, x: pos.x + Math.cos(Math.PI * 2/3) * 120, y: pos.y + Math.sin(Math.PI * 2/3) * 120 },
      { angle: Math.PI * 4/3, distance: 120, health: 200, shootTimer: 0, x: pos.x + Math.cos(Math.PI * 4/3) * 120, y: pos.y + Math.sin(Math.PI * 4/3) * 120 }
    ]
  });
}

function spawnDebris(x, y, count = 5) {
  for (let i = 0; i < count; i++) {
    debris.push({
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      size: Math.random() * 8 + 3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life: 60 + Math.random() * 40,
      maxLife: 60 + Math.random() * 40
    });
  }
}

// -------------------- Enemy updates --------------------

function updateBoss(boss) {
  boss.angle = boss.angle||0; boss.angle += 0.01;
  boss.x = canvas.width/2 + Math.cos(boss.angle)*150;
  boss.y = 80 + Math.sin(boss.angle)*50;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++;
  if (boss.spawnTimer > 200) {
    boss.spawnTimer = 0;
    minionsToAdd.push({x: boss.x+(Math.random()-0.5)*100, y: boss.y+(Math.random()-0.5)*100, size: 25, speed: 2, health: 30, type: "red-square", fromBoss: true});
  }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++;
  if (boss.shootTimer > 150) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*6, dy: d.y*6, size: 8, damage: 20}));
  }
}

function updateMiniBoss(boss) {
  boss.angle = boss.angle||Math.random()*Math.PI*2; boss.angle += 0.02;
  boss.x = canvas.width/2 + Math.cos(boss.angle)*100;
  boss.y = 80 + Math.sin(boss.angle)*30;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++;
  if (boss.spawnTimer > 300) {
    boss.spawnTimer = 0;
    minionsToAdd.push({x: boss.x+(Math.random()-0.5)*80, y: boss.y+(Math.random()-0.5)*80, size: 25, speed: 2.2, health: 30, type: "triangle", fromBoss: true});
  }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*5, dy: d.y*5, size: 6, damage: 12}));
  }
}

// Minimal update for mother-core to avoid errors
function updateMotherCore(e) {
  e.angle = (e.angle || 0) + 0.005;
  e.phaseTimer = (e.phaseTimer || 0) + 1;
  for (let i = 0; i < e.cores.length; i++) {
    const core = e.cores[i];
    core.angle = (core.angle || 0) + 0.01 + i * 0.002;
    const dist = core.distance || 120;
    core.x = e.x + Math.cos(core.angle) * dist;
    core.y = e.y + Math.sin(core.angle) * dist;
    core.shootTimer = (core.shootTimer||0)+1;
    if (core.shootTimer > 200) {
      core.shootTimer = 0;
      // shoot outward projectiles
      for (let a = 0; a < 6; a++) {
        const angle = a / 6 * Math.PI * 2;
        lightning.push({x: core.x, y: core.y, dx: Math.cos(angle) * 5, dy: Math.sin(angle) * 5, size: 6, damage: 18});
      }
    }
  }
}

// updateDiamond, updateTanks, updateWalkers, updateMechs (with ground-only movement constraints)

function updateDiamond(d) {
  // (unchanged from provided)
  d.gravitonTimer = (d.gravitonTimer || 0) + 1;
  
  if (d.gravitonTimer >= 600 && !d.gravitonActive) {
    d.gravitonActive = true;
    d.gravitonCharge = 0;
    d.pulledEnemies = [];
    d.gravitonTimer = 0;
  }

  if (d.gravitonActive) {
    d.gravitonCharge++;
    if (d.gravitonCharge < 600) {
      const pullRadius = 400;
      enemies.forEach(e => {
        if (e === d || e.type === "boss" || e.type === "mini-boss" || e.type === "mother-core") return;
        const dx = d.x - e.x;
        const dy = d.y - e.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < pullRadius) {
          const pullStrength = 0.08 + (1 - dist / pullRadius) * 0.12;
          e.x += (dx / dist) * pullStrength * 10;
          e.y += (dy / dist) * pullStrength * 10;
          
          if (!d.pulledEnemies.find(pe => pe === e)) {
            d.pulledEnemies.push(e);
          }
        }
      });
      if (d.gravitonCharge % 10 === 0) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 200 + Math.random() * 200;
          explosions.push({
            x: d.x + Math.cos(angle) * dist,
            y: d.y + Math.sin(angle) * dist,
            dx: -Math.cos(angle) * 2,
            dy: -Math.sin(angle) * 2,
            radius: 4,
            color: "rgba(100,200,255,0.8)",
            life: 20
          });
        }
      }
    } else if (d.gravitonCharge === 600) {
      d.pulledEnemies.forEach(e => {
        const dx = e.x - d.x;
        const dy = e.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        lightning.push({
          x: e.x,
          y: e.y,
          dx: (dx / dist) * 12,
          dy: (dy / dist) * 12,
          size: e.size || 8,
          damage: 30
        });
        const idx = enemies.indexOf(e);
        if (idx !== -1) enemies.splice(idx, 1);
      });
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        explosions.push({
          x: d.x,
          y: d.y,
          dx: Math.cos(angle) * 8,
          dy: Math.sin(angle) * 8,
          radius: 8,
          color: "rgba(255,200,100,0.9)",
          life: 30
        });
      }
      d.vulnerable = true;
      d.vulnerableTimer = 360;
      d.gravitonActive = false;
      d.pulledEnemies = [];
    }
  }
  
  if (d.vulnerable) {
    d.vulnerableTimer--;
    if (d.vulnerableTimer <= 0) {
      d.vulnerable = false;
    }
  }

  const roamSpeed = 1.6;
  let nearest = null, nd = Infinity;
  for (const e of enemies) {
    if (!e || e.type === "diamond" || ["boss","mini-boss"].includes(e.type)) continue;
    const dist = Math.hypot(e.x-d.x, e.y-d.y);
    if (dist < nd) { nd = dist; nearest = e; }
  }
  if (nearest && nd < 800) {
    const dx = nearest.x-d.x, dy = nearest.y-d.y, mag = Math.hypot(dx,dy)||1;
    d.x += (dx/mag)*Math.min(roamSpeed, mag); d.y += (dy/mag)*Math.min(roamSpeed, mag);
  } else {
    d.angle += 0.01;
    const radius = Math.min(300, Math.max(120, (canvas.width+canvas.height)/8));
    d.x = canvas.width/2 + Math.cos(d.angle) * radius;
    d.y = canvas.height/2 + Math.sin(d.angle) * radius;
  }

  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    if (!e || e === d || e.attachedTo || e.type === "boss" || e.type === "mini-boss") continue;
    const dx = d.x - e.x, dy = d.y - e.y, dist = Math.hypot(dx,dy);
    if (dist < 260 && d.attachments.length < 15) {
      const pull = 0.04 + (1 - Math.min(dist/260,1)) * 0.06;
      e.x += dx * pull; e.y += dy * pull;
      if (dist < 28) {
        enemies.splice(i,1);
        e.attachedTo = d;
        e.orbitAngle = Math.random()*Math.PI*2;
        if (e.type === "triangle") e.fireRateBoost = true;
        if (e.type === "red-square") e.spawnMini = true;
        if (e.type === "reflector") d.canReflect = true;
        e.speed = 0;
        d.attachments.push(e);
      }
    }
  }

  for (let i = 0; i < d.attachments.length; i++) {
    const a = d.attachments[i];
    a.orbitAngle = (a.orbitAngle||0) + 0.06 + (a.type === "reflector" ? 0.02 : 0);
    const orbitRadius = d.size/2 + 28 + (a.type === "reflector" ? 14 : 0);
    a.x = d.x + Math.cos(a.orbitAngle) * orbitRadius;
    a.y = d.y + Math.sin(a.orbitAngle) * orbitRadius;

    a.shootTimer = (a.shootTimer||0) + 1;
    const fireRate = a.type === "triangle" ? (a.fireRateBoost ? 40 : 100) : 120;
    if (a.shootTimer > fireRate) {
      a.shootTimer = 0;
      const dxp = player.x - a.x, dyp = player.y - a.y, mag = Math.hypot(dxp,dyp)||1;
      lightning.push({x: a.x, y: a.y, dx: (dxp/mag)*5, dy: (dyp/mag)*5, size: 6, damage: 15});
    }

    if (a.type === "reflector") {
      for (let bi = bullets.length-1; bi >= 0; bi--) {
        const b = bullets[bi], distB = Math.hypot(b.x-a.x, b.y-a.y);
        if (distB < 40) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
          reflectionEffects.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, life: 22, maxLife: 22});
          bullets.splice(bi,1);
        }
      }
    }
  }

  d.shootTimer = (d.shootTimer||0)+1;
  d.pulse = Math.sin(d.shootTimer*0.1)*4;
  if (d.canReflect) {
    for (let bi = bullets.length-1; bi >= 0; bi--) {
      const b = bullets[bi], dist = Math.hypot(b.x-d.x, b.y-d.y);
      if (dist < 90) {
        lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
        bullets.splice(bi,1);
      }
    }
  }

  if (d.attachments.some(a=>a.spawnMini) && d.shootTimer % 200 === 0) {
    minionsToAdd.push({x: d.x+(Math.random()-0.5)*80, y: d.y+(Math.random()-0.5)*80, size: 25, speed: 2, health: 30, type: "red-square", fromBoss: true});
  }
  if (d.attachments.length >= 3 && d.shootTimer % 180 === 0) {
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dv => lightning.push({x: d.x, y: d.y, dx: dv.x*6, dy: dv.y*6, size: 8, damage: 20}));
  }

  const distToPlayer = Math.hypot(d.x-player.x, d.y-player.y);
  if (distToPlayer < (d.size/2 + player.size/2)) {
    if (!player.invulnerable) player.health -= 30;
    createExplosion(d.x, d.y, "white");
    d.health -= 100;
  }

  const distToGoldStar = Math.hypot(d.x-goldStar.x, d.y-goldStar.y);
  if (goldStar.alive && distToGoldStar < (d.size/2 + goldStar.size/2)) {
    goldStar.health -= 25;
    createExplosion(d.x, d.y, "white");
    if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
  }
}

// Tanks: modified so they behave as ground units and stay near bottom
function updateTanks() {
  const groundY = canvas.height - 30; // baseline ground y coordinate (center of tank)
  for (let i = tanks.length - 1; i >= 0; i--) {
    const tank = tanks[i];
    
    // Move primarily horizontally toward player's x, but remain on ground band
    const targetX = player.x;
    const dx = targetX - tank.x;
    const distX = Math.abs(dx) || 1;
    const moveX = Math.sign(dx) * Math.min(tank.speed * 1.2, distX);
    tank.x += moveX;

    // softly keep y near groundY
    const desiredY = groundY - tank.height/2;
    tank.y += (desiredY - tank.y) * 0.2;

    tank.turretAngle = Math.atan2(player.y - tank.y, player.x - tank.x);
    
    tank.shootTimer = (tank.shootTimer || 0) + 1;
    if (tank.shootTimer > 120) {
      tank.shootTimer = 0;
      lightning.push({
        x: tank.x,
        y: tank.y,
        dx: Math.cos(tank.turretAngle) * 4,
        dy: Math.sin(tank.turretAngle) * 4,
        size: 8,
        damage: 20
      });
    }
    
    if (tank.health <= 0) {
      createExplosion(tank.x, tank.y, "orange");
      spawnDebris(tank.x, tank.y, 8);
      tanks.splice(i, 1);
      score += 30;
      spawnPowerUp(tank.x, tank.y, Math.random() > 0.5 ? "red-punch" : "blue-cannon");
    }
  }
}

// Walkers: ground-only movement; they can wobble vertically slightly but remain near ground
function updateWalkers() {
  const groundY = canvas.height - 40;
  for (let i = walkers.length - 1; i >= 0; i--) {
    const walker = walkers[i];
    
    const dx = player.x - walker.x;
    const distX = Math.abs(dx) || 1;
    
    // Move horizontally towards player's x but constrained
    walker.x += Math.sign(dx) * Math.min(walker.speed * 1.0, distX);

    // small bobbing for legs but keep base near ground
    walker.legPhase = (walker.legPhase || 0) + 0.15;
    const bob = Math.sin(walker.legPhase) * 4;
    const desiredY = groundY + bob;
    walker.y += (desiredY - walker.y) * 0.2;
    
    walker.shootTimer = (walker.shootTimer || 0) + 1;
    if (walker.shootTimer > 90) {
      walker.shootTimer = 0;
      for (let j = -1; j <= 1; j++) {
        const angle = Math.atan2(player.y - walker.y, player.x - walker.x) + j * 0.2;
        lightning.push({
          x: walker.x,
          y: walker.y,
          dx: Math.cos(angle) * 5,
          dy: Math.sin(angle) * 5,
          size: 6,
          damage: 15
        });
      }
    }
    
    if (walker.health <= 0) {
      createExplosion(walker.x, walker.y, "cyan");
      spawnDebris(walker.x, walker.y, 10);
      walkers.splice(i, 1);
      score += 40;
      spawnPowerUp(walker.x, walker.y, "health");
    }
  }
}

// Mechs: also ground-based; can strafe but remain in bottom band
function updateMechs() {
  const groundY = canvas.height - 60;
  for (let i = mechs.length - 1; i >= 0; i--) {
    const mech = mechs[i];
    
    const dx = player.x - mech.x;
    const distX = Math.abs(dx) || 1;
    mech.x += Math.sign(dx) * Math.min(mech.speed, distX);

    // keep mech near baseline
    mech.y += (groundY - mech.y) * 0.15;
    
    mech.shootTimer = (mech.shootTimer || 0) + 1;
    if (mech.shootTimer > 60) {
      mech.shootTimer = 0;
      const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4];
      angles.forEach(angle => {
        lightning.push({
          x: mech.x,
          y: mech.y,
          dx: Math.cos(angle) * 6,
          dy: Math.sin(angle) * 6,
          size: 8,
          damage: 25
        });
      });
    }
    
    if (mech.health <= 0) {
      createExplosion(mech.x, mech.y, "yellow");
      spawnDebris(mech.x, mech.y, 15);
      mechs.splice(i, 1);
      score += 60;
      spawnPowerUp(mech.x, mech.y, "reflect");
      spawnPowerUp(mech.x, mech.y, "health");
    }
  }
}

function updateEnemies() {
  if (player.invulnerable) { player.invulnerableTimer--; if (player.invulnerableTimer <= 0) player.invulnerable = false; }

  for (let di = diamonds.length-1; di >= 0; di--) {
    const d = diamonds[di];
    updateDiamond(d);
    if (d.health <= 0) {
      createExplosion(d.x, d.y, "white");
      d.attachments.forEach(a => { a.attachedTo = null; enemies.push(a); });
      diamonds.splice(di,1);
      score += 200;
    }
  }

  enemies = enemies.filter(e => {
    if (!e) return false;
    if (e.type === "boss") { updateBoss(e); return e.health > 0; }
    if (e.type === "mini-boss") { updateMiniBoss(e); return e.health > 0; }
    if (e.type === "mother-core") { updateMotherCore(e); return e.health > 0; }

    if (e.type === "triangle" || e.type === "red-square") {
      const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx,dy)||1;
      e.x += (dx/dist)*e.speed; e.y += (dy/dist)*e.speed;
      if (e.type === "triangle") {
        e.shootTimer = (e.shootTimer||0) + 1;
        if (e.shootTimer > 100) { e.shootTimer = 0; lightning.push({x: e.x, y: e.y, dx: (dx/dist)*5, dy: (dy/dist)*5, size:6, damage:15}); }
      }
      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y);
      if (distToPlayer < (e.size/2 + player.size/2)) {
        if (!player.invulnerable) player.health -= (e.type === "triangle" ? 25 : 15);
        createExplosion(e.x, e.y, "red");
        e.health -= 100;
      }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y);
      if (goldStar.alive && distToGoldStar < (e.size/2 + goldStar.size/2)) {
        goldStar.health -= (e.type === "triangle" ? 20 : 12);
        createExplosion(e.x, e.y, "orange");
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
      }
      if (e.health <= 0) {
        if (!e.fromBoss) {
          if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
          else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
        }
        return false;
      }
      return true;
    }

    if (e.type === "reflector") {
      let nearestAlly = null, minDist = Infinity;
      enemies.forEach(ally => {
        if (ally !== e && ally.type !== "reflector") {
          const dist = Math.hypot(ally.x - e.x, ally.y - e.y);
          if (dist < minDist && dist < 150) { minDist = dist; nearestAlly = ally; }
        }
      });

      if (nearestAlly) {
        const dx = nearestAlly.x - e.x, dy = nearestAlly.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed;
        e.y += (dy/dist) * e.speed;
        e.shieldActive = true;
      } else {
        const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed * 0.5;
        e.y += (dy/dist) * e.speed * 0.5;
        e.shieldActive = false;
      }

      e.angle = (e.angle||0)+0.1;

      for (let bi = bullets.length-1; bi >= 0; bi--) {
        const b = bullets[bi];
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < 50) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
          reflectionEffects.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, life: 24, maxLife: 24});
          bullets.splice(bi,1);
          e.health -= 5;
        }
      }

      if (e.health <= 0) {
        createExplosion(e.x, e.y, "purple");
        if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); spawnPowerUp(e.x, e.y, "reflect"); }
        return false;
      }

      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y);
      if (distToPlayer < 30) { if (!player.invulnerable) player.health -= 15; createExplosion(e.x, e.y, "magenta"); e.health -= 50; }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y);
      if (goldStar.alive && distToGoldStar < 30) {
        goldStar.health -= 15; createExplosion(e.x, e.y, "magenta");
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
      }

      return true;
    }

    return true;
  });

  updateTanks();
  updateWalkers();
  updateMechs();

  if (minionsToAdd.length > 0) { enemies.push(...minionsToAdd); minionsToAdd = []; }
}

function updateLightning() {
  lightning = lightning.filter(l => {
    l.x += l.dx; l.y += l.dy;

    if (Math.hypot(l.x-player.x, l.y-player.y) < player.size/2) {
      if (player.reflectAvailable) {
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
        reflectionEffects.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, life: 18, maxLife: 18});
        player.reflectAvailable = false;
        createExplosion(player.x, player.y, "cyan");
        return false;
      } else {
        if (!player.invulnerable) player.health -= l.damage;
        return false;
      }
    }

    if (goldStar.alive && Math.hypot(l.x-goldStar.x, l.y-goldStar.y) < goldStar.size/2) {
      if (goldStar.reflectAvailable) {
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
        reflectionEffects.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, life: 18, maxLife: 18});
        goldStar.reflectAvailable = false;
        createExplosion(goldStar.x, goldStar.y, "cyan");
        return false;
      } else {
        goldStar.health -= l.damage;
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
        return false;
      }
    }
    return l.x >= -20 && l.x <= canvas.width+20 && l.y >= -20 && l.y <= canvas.height+20;
  });
}

function checkBulletCollisions() {
  for (let bi = bullets.length-1; bi >= 0; bi--) {
    const b = bullets[bi];
    
    // Check collisions with tanks
    for (let ti = tanks.length - 1; ti >= 0; ti--) {
      const tank = tanks[ti];
      if (Math.hypot(b.x - tank.x, b.y - tank.y) < 30) {
        tank.health -= 10;
        bullets.splice(bi, 1);
        createExplosion(tank.x, tank.y, "orange");
        break;
      }
    }
    
    // Check collisions with walkers
    for (let wi = walkers.length - 1; wi >= 0; wi--) {
      const walker = walkers[wi];
      if (Math.hypot(b.x - walker.x, b.y - walker.y) < 25) {
        walker.health -= 10;
        bullets.splice(bi, 1);
        createExplosion(walker.x, walker.y, "cyan");
        break;
      }
    }
    
    // Check collisions with mechs
    for (let mi = mechs.length - 1; mi >= 0; mi--) {
      const mech = mechs[mi];
      if (Math.hypot(b.x - mech.x, b.y - mech.y) < 45) {
        if (mech.shieldActive && mech.shieldHealth > 0) {
          mech.shieldHealth -= 10;
          if (mech.shieldHealth <= 0) {
            mech.shieldActive = false;
          }
        } else {
          mech.health -= 10;
        }
        bullets.splice(bi, 1);
        createExplosion(mech.x, mech.y, "yellow");
        break;
      }
    }
    
    for (let ei = enemies.length-1; ei >= 0; ei--) {
      const e = enemies[ei]; if (!e) continue;
      
      if (e.type === "mother-core") {
        // Check collisions with rotating cores
        for (let ci = e.cores.length - 1; ci >= 0; ci--) {
          const core = e.cores[ci];
          if (Math.hypot(b.x - core.x, b.y - core.y) < 25) {
            core.health -= 10;
            bullets.splice(bi, 1);
            createExplosion(core.x, core.y, "cyan");
            if (core.health <= 0) {
              e.cores.splice(ci, 1);
              score += 50;
            }
            break;
          }
        }
        
        // Main core takes damage only if all small cores destroyed
        if (e.cores.length === 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2) {
          e.health -= 15;
          bullets.splice(bi, 1);
          createExplosion(e.x, e.y, "red");
          if (e.health <= 0) {
            createExplosion(e.x, e.y, "white");
            enemies.splice(ei, 1);
            score += 500;
          }
          break;
        }
        continue;
      }
      
      if (e.type === "reflector") {
        const dx = b.x-e.x, dy = b.y-e.y, dist = Math.hypot(dx,dy);
        if (dist < Math.max(e.width,e.height)) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
          reflectionEffects.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, life: 22, maxLife: 22});
          bullets.splice(bi,1); e.health -= 5;
          if (e.health <= 0) { createExplosion(e.x, e.y, "purple"); enemies.splice(ei,1); if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); spawnPowerUp(e.x, e.y, "reflect"); } }
          break;
        }
      } else {
        if (Math.hypot(b.x-e.x, b.y-e.y) < (e.size||20)/2) {
          e.health -= (b.owner === "player" ? 10 : 6);
          bullets.splice(bi,1);
          if (e.health <= 0) {
            createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : e.type === "boss" ? "yellow" : e.type === "mini-boss" ? "orange" : "red");
            enemies.splice(ei,1);
            if (!e.fromBoss) {
              if (e.type === "boss") score += 100;
              else if (e.type === "mini-boss") score += 50;
              else if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
              else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
            }
          }
          break;
        }
      }
    }

    for (let di = diamonds.length-1; di >= 0; di--) {
      const d = diamonds[di];
      for (let ai = d.attachments.length-1; ai >= 0; ai--) {
        const a = d.attachments[ai], radius = (a.size||20)/2 || 10;
        if (Math.hypot(b.x-a.x, b.y-a.y) < radius) {
          a.health = (a.health||30) - (b.owner === "player" ? 10 : 6); bullets.splice(bi,1);
          if (a.health <= 0) {
            createExplosion(a.x, a.y, "white");
            if (a.type === "reflector" && !a.fromBoss) {
              spawnPowerUp(a.x, a.y, "health");
              spawnPowerUp(a.x, a.y, "reflect");
              score += 20;
            }
            d.attachments.splice(ai,1);
            score += 5;
            if (!d.attachments.some(at => at.type === "reflector")) d.canReflect = false;
          }
          ai = -1;
        }
      }
      if (bi >= 0 && bi < bullets.length && Math.hypot(bullets[bi].x-d.x, bullets[bi].y-d.y) < d.size/2) {
        // Apply damage multiplier if vulnerable
        const damageMultiplier = d.vulnerable ? 1 : 0.3;
        d.health -= (bullets[bi].owner === "player" ? 12 : 6) * damageMultiplier;
        bullets.splice(bi,1);
        if (d.health <= 0) { createExplosion(d.x, d.y, "white"); d.attachments.forEach(a => enemies.push(a)); diamonds.splice(di,1); score += 100; }
        break;
      }
    }
  }
}

// -------------------- GoldStar behavior functions (remaining) --------------------

function performRedPunch() {
  const baseRadius = 80;
  const radius = baseRadius + Math.max(0, (goldStar.redPunchLevel - 1)) * 40;
  let punches = Math.max(1, Math.min(goldStar.redPunchLevel, 8));
  const damage = 40 * goldStar.redPunchLevel;
  const knockbackForce = goldStar.redPunchLevel >= 3 ? 15 + (goldStar.redPunchLevel - 3) * 5 : 0;

  const nearby = enemies
    .map(e => ({ e, d: Math.hypot((e.x || 0) - goldStar.x, (e.y || 0) - goldStar.y) }))
    .filter(o => o.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, punches);

  nearby.forEach(o => {
    if (!o.e) return;
    o.e.health -= damage;
    createExplosion(o.e.x, o.e.y, goldStar.redPunchLevel >= 3 ? "magenta" : "orange");

    if (knockbackForce > 0 && o.d > 0) {
      const dx = o.e.x - goldStar.x;
      const dy = o.e.y - goldStar.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      o.e.x += (dx / dist) * knockbackForce;
      o.e.y += (dy / dist) * knockbackForce;
    }

    if (o.e.health <= 0) {
      const idx = enemies.indexOf(o.e);
      if (idx !== -1) {
        const e = enemies[idx];
        if (!e.fromBoss) {
          if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
          else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
          else if (e.type === "boss") score += 100;
          else if (e.type === "mini-boss") score += 50;
        }
        if (e.type === "reflector" && !e.fromBoss) {
          spawnPowerUp(e.x, e.y, "health");
          spawnPowerUp(e.x, e.y, "reflect");
          score += 20;
        }
        enemies.splice(idx, 1);
      }
    }
  });

  if (goldStar.redPunchLevel <= 1) {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius, r: 0, life: 18, maxLife: 18, color: "rgba(255,220,120,0.9)", fill: true});
    for (let i = 0; i < 8; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*8, dy:(Math.random()-0.5)*8, radius:Math.random()*6+2, color:"rgba(255,200,100,0.9)", life:12});
  } else if (goldStar.redPunchLevel === 2) {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius + 30, r: 0, life: 24, maxLife: 24, color: "rgba(255,160,60,0.95)", fill: true});
    for (let i = 0; i < 14; i++) {
      explosions.push({x: goldStar.x, y: goldStar.y, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, radius: Math.random() * 8 + 3, color: "rgba(255,140,50,0.95)", life: 16});
    }
  } else {
    redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius + 60, r: 0, life: 36, maxLife: 36, color: "rgba(255,60,255,0.95)", fill: false, ring: true});
    explosions.push({x: goldStar.x, y: goldStar.y, dx:0, dy:0, radius: 40, color:"rgba(255,255,255,0.95)", life:8});
    for (let i = 0; i < 20; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*12, dy:(Math.random()-0.5)*12, radius:Math.random()*6+2, color:"rgba(255,50,200,0.9)", life:22});
  }

  if (goldStar.redPunchLevel >= 3) {
    createExplosion(goldStar.x, goldStar.y, "magenta");
  }
}

// -------------------- Remaining updates for gold star and other systems --------------------

function updateGoldStar() {
  if (!goldStar.alive) {
    if (goldStarAura.level !== 0 || auraSparks.length || auraShockwaves.length) {
      resetAuraOnDeath();
    }
    goldStar.respawnTimer++;
    if (goldStar.respawnTimer >= 300) respawnGoldStar();
    return;
  }

  if (goldStar.collecting) {
    goldStar.collectTimer++;
    if (goldStar.collectTimer >= GOLD_STAR_PICKUP_FRAMES) {
      if (goldStar.targetPowerUp) {
        const centerPU = goldStar.targetPowerUp;
        const picked = powerUps.filter(p => Math.hypot(p.x - centerPU.x, p.y - centerPU.y) <= PICKUP_RADIUS);

        for (const pu of picked) {
          if (pu.type === "red-punch") {
            goldStar.redKills++;
            if (goldStar.redKills % 5 === 0 && goldStar.redPunchLevel < 5) {
              goldStar.redPunchLevel++;
              levelUpGoldStar();
            }
            createExplosion(pu.x, pu.y, "orange");
            score += 8;
          }
          else if (pu.type === "blue-cannon") {
            goldStar.blueKills++;
            if (goldStar.blueKills % 5 === 0 && goldStar.blueCannonnLevel < 5) {
              goldStar.blueCannonnLevel++;
              levelUpGoldStar();
            }
            createExplosion(pu.x, pu.y, "cyan");
            score += 8;
          }
          else if (pu.type === "health") {
            goldStar.health = Math.min(goldStar.maxHealth, goldStar.health+30);
            player.health = Math.min(player.maxHealth, player.health+30);
            createExplosion(pu.x, pu.y, "magenta");
            score += 5;
          }
          else if (pu.type === "reflect") {
            goldStar.reflectAvailable = true;
            player.reflectAvailable = true;
            createExplosion(pu.x, pu.y, "magenta");
            score += 12;
          }
        }
        powerUps = powerUps.filter(p => !picked.includes(p));
      }
      goldStar.collecting = false; 
      goldStar.collectTimer = 0; 
      goldStar.targetPowerUp = null;
    }
    return;
  }

  let dangerX = 0, dangerY = 0, dangerCount = 0;
  const DANGER_RADIUS = 120;

  enemies.forEach(e => {
    const dist = Math.hypot(e.x - goldStar.x, e.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS;
      dangerX += (goldStar.x - e.x) / dist * weight;
      dangerY += (goldStar.y - e.y) / dist * weight;
      dangerCount++;
    }
  });

  lightning.forEach(l => {
    const dist = Math.hypot(l.x - goldStar.x, l.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS * 1.5;
      dangerX += (goldStar.x - l.x) / dist * weight;
      dangerY += (goldStar.y - l.y) / dist * weight;
      dangerCount++;
    }
  });

  let nearest = null, minDist = Infinity;
  for (const pu of powerUps) {
    const dist = Math.hypot(pu.x-goldStar.x, pu.y-goldStar.y);
    if (dist < minDist) { minDist = dist; nearest = pu; }
  }

  let moveX = 0, moveY = 0;

  if (dangerCount > 0) {
    moveX = dangerX;
    moveY = dangerY;
  } else if (nearest && minDist < 300) {
    const dx = nearest.x-goldStar.x, dy = nearest.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
    moveX = dx/mag;
    moveY = dy/mag;
    if (minDist < 25) {
      goldStar.collecting = true;
      goldStar.targetPowerUp = nearest;
      goldStar.collectTimer = 0;
      return;
    }
  } else {
    const dx = player.x-goldStar.x, dy = player.y-goldStar.y, dist = Math.hypot(dx,dy);
    if (dist > 100) {
      const mag = dist||1;
      moveX = dx/mag * 0.7;
      moveY = dy/mag * 0.7;
    }
  }

  const moveMag = Math.hypot(moveX, moveY);
  if (moveMag > 0) {
    goldStar.x += (moveX / moveMag) * goldStar.speed;
    goldStar.y += (moveY / moveMag) * goldStar.speed;
  }

  goldStar.x = Math.max(50, Math.min(canvas.width-50, goldStar.x));
  goldStar.y = Math.max(50, Math.min(canvas.height-50, goldStar.y));

  if (goldStar.redPunchLevel > 0) {
    goldStar.punchCooldown++;
    if (goldStar.punchCooldown >= 300) {
      goldStar.punchCooldown = 0;
      performRedPunch();
    }
  }

  if (goldStar.blueCannonnLevel > 0) {
    goldStar.cannonCooldown++;
    if (goldStar.cannonCooldown > 50) {
      goldStar.cannonCooldown = 0;
      if (enemies.length > 0) {
        const target = enemies[0], dx = target.x-goldStar.x, dy = target.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
        if (goldStar.blueCannonnLevel === 1) bullets.push({x: goldStar.x, y: goldStar.y, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
        else if (goldStar.blueCannonnLevel === 2) {
          bullets.push({x: goldStar.x, y: goldStar.y-5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
          bullets.push({x: goldStar.x, y: goldStar.y+5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8, owner: "gold"});
        }
        else if (goldStar.blueCannonnLevel === 3) {
          for (let i = -1; i <= 1; i++) { 
            const angle = Math.atan2(dy,dx)+i*0.3; 
            bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); 
          }
        }
        else if (goldStar.blueCannonnLevel === 4) {
          for (let i = -2; i <= 2; i++) { 
            const angle = Math.atan2(dy,dx)+i*0.25; 
            bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); 
          }
        }
        else if (goldStar.blueCannonnLevel === 5) {
          for (let i = 0; i < 5; i++) bullets.push({x: goldStar.x+(dx/mag)*i*20, y: goldStar.y+(dy/mag)*i*20, dx: (dx/mag)*12, dy: (dy/mag)*12, size: 10, owner: "gold"});
        }
      }
    }
  }
}

// -------------------- Background drawing (Earth orbit for first 11 waves) --------------------

let backgroundOffset = 0;

function drawBackground(waveNum) {
  // Use Earth-orbit visual for first 11 waves (wave indices 0..10).
  if (waveNum >= 12 && waveNum <= 21) {
    // Atmospheric/Earth backgrounds (existing themed waves)
    if (waveNum === 12) {
      // Re-entry fire
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#1a0a0a");
      grad.addColorStop(0.5, "#4a1a0a");
      grad.addColorStop(1, "#8a3a1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Fire particles
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width;
        const y = (frameCount * 3 + i * 50) % canvas.height;
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,${Math.random() * 0.5})`;
        ctx.fillRect(x, y, 3, 10);
      }
    } else if (waveNum === 13) {
      // Clouds
      ctx.fillStyle = "#6a8a9a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawClouds();
    } else if (waveNum >= 14 && waveNum <= 19) {
      // City/ground
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#2a2a3a");
      grad.addColorStop(1, "#4a3a2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCityBackground();
    } else if (waveNum >= 20) {
      // Dark stormy night (waves 20+)
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frameCount % 60 < 3) {
        ctx.fillStyle = `rgba(255,255,255,${(3 - frameCount % 60) / 3 * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  } else {
    // FIRST 11 WAVES: Earth-orbit style background with stars and a distant Earth at bottom.
    ctx.fillStyle = "#00142b"; // deep-space-blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    for (let i = 0; i < 80; i++) {
      const seed = (i * 97 + (i % 7) * 13);
      const x = (seed + backgroundOffset * (0.2 + (i % 5) * 0.02)) % canvas.width;
      const y = (i * 89 + Math.sin(frameCount * 0.01 + i) * 20) % canvas.height;
      const alpha = 0.3 + (i % 3) * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Faint orbital lines/arcs to suggest orbital paths
    ctx.strokeStyle = "rgba(200,240,255,0.03)";
    ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      const radius = (Math.min(canvas.width, canvas.height) / 2) * (0.5 + r * 0.12 + Math.sin(frameCount * 0.005 + r) * 0.01);
      ctx.arc(canvas.width / 2, canvas.height * 0.25, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Distant Earth near bottom (grows slightly as player approaches across waves)
    const earthBaseY = canvas.height * 0.9;
    const progressFactor = Math.min(1, Math.max(0, wave / 10)); // 0..1 over first 11 waves
    const earthRadius = 120 + progressFactor * 90;
    const earthX = canvas.width / 2;
    const earthY = earthBaseY;
    // Earth gradient
    const eg = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.1, earthX, earthY, earthRadius);
    eg.addColorStop(0, "#2b6f2b");
    eg.addColorStop(0.6, "#144f8a");
    eg.addColorStop(1, "#071325");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthRadius, Math.PI, 2 * Math.PI);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    // subtle atmosphere glow
    ctx.globalAlpha = 0.08 + progressFactor * 0.12;
    ctx.fillStyle = "rgba(100,180,255,0.6)";
    ctx.beginPath();
    ctx.arc(earthX, earthY - 10, earthRadius + 30, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  backgroundOffset += 0.5;
}

// -------------------- Input handling / cinematic / UI --------------------

function ensureCanvas() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    try {
      canvas = document.createElement("canvas");
      canvas.id = "gameCanvas";
      document.body.appendChild(canvas);
      canvas.style.position = "fixed";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.zIndex = "999";
    } catch (err) {
      console.error("Failed to create canvas element:", err);
      return false;
    }
  }
  ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2D context from canvas.");
    return false;
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return true;
}

window.addEventListener('load', init);

function init() {
  if (!ensureCanvas()) return;

  // Basic input handling
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'r' || e.key === 'R') {
      if (gameOver) {
        location.reload();
      }
    }
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('resize', () => {
    if (!ensureCanvas()) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  goldStar.x = canvas.width / 4;
  goldStar.y = canvas.height / 2;

  loadHighScores();

  wave = 0; waveTransition = false; waveTransitionTimer = 0;
  startCutscene();
}

// -------------------- Cinematic system --------------------

function drawTextBox(lines, x, y, maxW, lineHeight = 26, align = "left", reveal = 1) {
  const joined = lines.join("\n");
  const totalChars = joined.length;
  const revealChars = Math.floor(totalChars * Math.max(0, Math.min(1, reveal)));

  let remaining = revealChars;
  const visibleLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (remaining >= line.length) {
      visibleLines.push(line);
      remaining -= line.length;
    } else if (remaining > 0) {
      visibleLines.push(line.slice(0, remaining));
      remaining = 0;
    } else {
      visibleLines.push("");
    }
  }

  const showCursor = revealChars < totalChars && (Math.floor(Date.now() / 200) % 2 === 0);

  ctx.save();
  ctx.font = "18px 'Courier New', monospace";
  const padding = 14;
  const h = visibleLines.length * lineHeight + padding*2;
  ctx.fillStyle = "rgba(5,10,15,0.88)";
  ctx.fillRect(x, y - padding, maxW, h);
  ctx.strokeStyle = "rgba(40,200,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 0.5, y - padding + 0.5, maxW - 1, h - 1, 8);
  ctx.stroke();

  ctx.fillStyle = "rgba(140,240,255,0.95)";
  ctx.textAlign = align;
  ctx.shadowColor = "rgba(0,200,255,0.25)";
  ctx.shadowBlur = 8;

  let drawX = x + 12;
  if (align === "center") drawX = x + maxW / 2;
  else if (align === "right") drawX = x + maxW - 12;

  for (let i = 0; i < visibleLines.length; i++) {
    const line = visibleLines[i];
    ctx.fillText(line, drawX, y + (i+1)*lineHeight);
  }

  if (showCursor) {
    let li = visibleLines.length - 1;
    while (li >= 0 && visibleLines[li] === "") li--;
    if (li >= 0) {
      const textBefore = visibleLines[li];
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(140,240,255,0.95)";
      const metrics = ctx.measureText(textBefore);
      let cursorX = drawX + metrics.width;
      if (align === "center") cursorX = drawX - metrics.width/2 + metrics.width;
      else if (align === "right") cursorX = drawX - metrics.width;
      const cursorY = y + (li+1)*lineHeight - 14;
      ctx.fillRect(cursorX + 2, cursorY, 8, 14);
    } else {
      const cursorX = x + 18;
      const cursorY = y + lineHeight - 14;
      ctx.fillRect(cursorX, cursorY, 8, 14);
    }
  }

  ctx.restore();
}

// A subset of cinematic draw functions (kept as in original repo)
function drawLaunchBayScene(t, p) {
  ctx.fillStyle = "#000814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 140; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 241) % canvas.height;
    const alpha = 0.25 + Math.abs(Math.sin((t||0) * 0.001 + i)) * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${0.12 * alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const hangarX = canvas.width * 0.15, hangarW = canvas.width * 0.7;
  const hangarY = canvas.height * 0.28, hangarH = canvas.height * 0.52;
  const g = ctx.createLinearGradient(hangarX, hangarY, hangarX, hangarY+hangarH);
  g.addColorStop(0, "#0f1721"); g.addColorStop(1, "#121827");
  ctx.fillStyle = g; ctx.fillRect(hangarX, hangarY, hangarW, hangarH);
  ctx.strokeStyle = "#1e2b3a"; ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const x = hangarX + (hangarW / 12) * i;
    ctx.beginPath(); ctx.moveTo(x, hangarY); ctx.lineTo(x, hangarY + hangarH); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(50,80,100,0.08)"; ctx.lineWidth = 1;
  for (let j = 0; j < 10; j++) {
    const gy = canvas.height * 0.6 + j * 20;
    ctx.beginPath(); ctx.moveTo(hangarX, gy); ctx.lineTo(hangarX + hangarW, gy); ctx.stroke();
  }
  ctx.shadowBlur = 30 * (1 - disconnectProgress * 0.6);
  ctx.shadowColor = "lime";
  ctx.fillStyle = "lime";
  ctx.fillRect(squareX, squareY, squareSize, squareSize);
  ctx.shadowBlur = 0;
}

// Minimal placeholder cinematic scene draw functions that were missing in the provided code.
// These are intentionally lightweight so they don't change gameplay logic but prevent runtime errors.
function drawDiamondDestructionScene(t, p) {
  // t: seconds-ish, p: progress 0..1
  ctx.fillStyle = "#081020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // center flash / diamond
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const flash = 1 - Math.abs(0.5 - (p % 1)) * 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,220,180,${0.35 + 0.65 * flash})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 60 + flash * 120, 0, Math.PI * 2);
  ctx.fill();

  // a few radial shards to suggest destruction
  ctx.strokeStyle = `rgba(255,200,120,${0.6 * flash})`;
  ctx.lineWidth = 2 + 6 * flash;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (frameCount * 0.02);
    const r1 = 40 + flash * 80;
    const r2 = r1 + 60 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // HUD-like text
  ctx.fillStyle = "rgba(200,220,255,0.9)";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("DIAMOND CORE DESTROYED", cx, cy + 180 * (1 - p));
  ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
  ctx.font = "14px Arial";
  ctx.fillText("Systems failing... retreat!", cx, cy + 200 * (1 - p));
}

// -------------------- Minimal missing helpers (non-intrusive) --------------------

function loadHighScores() {
  try {
    const raw = localStorage.getItem('highScores');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support both array of numbers and array of {score, date}
      if (Array.isArray(parsed)) {
        highScores = parsed.map(item => {
          if (typeof item === 'number') return { score: item, date: null };
          if (item && typeof item.score === 'number') return item;
          return { score: 0, date: null };
        });
      } else {
        highScores = [];
      }
      if (highScores.length > 0) {
        highScore = highScores.reduce((max, s) => Math.max(max, s.score || 0), 0);
      } else {
        highScore = 0;
      }
    } else {
      highScores = [];
      highScore = 0;
    }
  } catch (err) {
    console.error('Failed to load high scores', err);
    highScores = [];
    highScore = 0;
  }
}

function saveHighScoresOnGameOver() {
  try {
    if (recordedScoreThisRun) return;
    recordedScoreThisRun = true;
    const entry = { score: score, date: new Date().toISOString() };
    highScores.push(entry);
    highScores.sort((a, b) => (b.score || 0) - (a.score || 0));
    highScores = highScores.slice(0, 10);
    localStorage.setItem('highScores', JSON.stringify(highScores));
    highScore = highScores.length > 0 ? highScores[0].score : highScore;
  } catch (err) {
    console.error('Failed to save high scores', err);
  }
}

function startCutscene() {
  cinematic.playing = true;
  const startTime = Date.now();
  let phase = 0;
  function step() {
    if (!ensureCanvas()) return;
    const t = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (phase === 0) {
      drawLaunchBayScene(t, Math.min(1, t / 1800));
      drawTextBox([`Pilot: ${cinematic.playerName}`, "Prepare for deployment."], 40, canvas.height - 160, Math.min(600, canvas.width - 80), 26, "left", Math.min(1, t/1800));
      if (t > 1800) phase = 1;
    } else if (phase === 1) {
      const p = Math.min(1, (t - 1800) / 1200);
      drawDiamondDestructionScene(t, p);
      drawTextBox(["Alert: Diamond core integrity compromised."], 40, canvas.height - 140, Math.min(700, canvas.width - 80), 22, "left", p);
      if (t > 1800 + 1200) phase = 2;
    } else {
      cinematic.playing = false;
      spawnWave(wave);
      requestAnimationFrame(gameLoop);
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
