// Debugged copy of script.js
// Fixed a syntax error (restored a truncated line `e.health -= 100;`) that prevented the script from parsing.
// Minor runtime-safety fixes added to ensure the canvas exists and to guard cutscene progression.
// No other game logic behavior intentionally changed.

let canvas, ctx;

function ensureCanvas() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    // Create a fallback canvas if one does not exist in the DOM.
    try {
      canvas = document.createElement("canvas");
      canvas.id = "gameCanvas";
      document.body.appendChild(canvas);
      // Basic styles so it is visible and fills the window
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

  window.addEventListener('resize', () => {
    if (!ensureCanvas()) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  goldStar.x = canvas.width / 4;
  goldStar.y = canvas.height / 2;

  loadHighScore();

  wave = 0; waveTransition = false; waveTransitionTimer = 0;
  startCutscene();
}

// ==============================
// Enhanced Cinematic cutscene system
// ==============================

let cinematic = {
  playing: false,
  playerName: "Pilot"
};

function drawTextBox(lines, x, y, maxW, lineHeight = 26, align = "left") {
  ctx.save();
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  const padding = 12;
  const h = lines.length * lineHeight + padding*2;
  ctx.fillRect(x, y - padding, maxW, h);
  ctx.fillStyle = "white";
  ctx.textAlign = align;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + 12, y + (i+1)*lineHeight);
  }
  ctx.restore();
}

function drawLaunchBayScene() {
  ctx.fillStyle = "#000814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 100; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 241) % canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(x, y, 2, 2);
  }
  
  ctx.fillStyle = "#1a2332";
  ctx.fillRect(canvas.width * 0.2, canvas.height * 0.3, canvas.width * 0.6, canvas.height * 0.5);
  
  ctx.fillStyle = "#0d1520";
  ctx.fillRect(canvas.width * 0.25, canvas.height * 0.35, canvas.width * 0.5, canvas.height * 0.4);
  
  ctx.strokeStyle = "#2a4055";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const x = canvas.width * 0.25 + (canvas.width * 0.5 / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.35);
    ctx.lineTo(x, canvas.height * 0.75);
    ctx.stroke();
  }
  
  const squareSize = 60;
  const squareX = canvas.width / 2 - squareSize / 2;
  const squareY = canvas.height / 2 - squareSize / 2;
  
  ctx.shadowBlur = 30;
  ctx.shadowColor = "lime";
  ctx.fillStyle = "lime";
  ctx.fillRect(squareX, squareY, squareSize, squareSize);
  ctx.shadowBlur = 0;
  
  // Add Year 2050 and location text
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("YEAR 2050", canvas.width / 2, 60);
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(200,220,255,0.7)";
  ctx.fillText("Earth's Orbit", canvas.width / 2, 90);
}

function drawEnemyScene(t, p) {
  ctx.fillStyle = "#05000a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 150; i++) {
    const x = (i * 171) % canvas.width;
    const y = (i * 293) % canvas.height;
    const brightness = 0.3 + Math.sin(t * 0.001 + i) * 0.3;
    ctx.fillStyle = `rgba(255,100,100,${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  ctx.save();
  ctx.translate(canvas.width * 0.5, canvas.height * 0.35);
  const pulse = Math.sin(t * 0.003) * 20;
  ctx.rotate(t * 0.0005);
  
  ctx.strokeStyle = `rgba(255,50,50,${0.6 + Math.sin(t * 0.002) * 0.3})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 40;
  ctx.shadowColor = "red";
  
  const dSize = 150 + pulse;
  ctx.beginPath();
  ctx.moveTo(0, -dSize);
  ctx.lineTo(dSize, 0);
  ctx.lineTo(0, dSize);
  ctx.lineTo(-dSize, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  
  for (let i = 0; i < 5; i++) {
    const xOffset = Math.sin(t * 0.001 + i) * 100;
    const yPos = canvas.height * 0.6 + i * 40;
    const size = 25 + Math.sin(t * 0.002 + i) * 5;
    
    ctx.fillStyle = `rgba(255,0,0,${0.6 + Math.sin(t * 0.002 + i) * 0.3})`;
    ctx.fillRect(canvas.width * 0.3 + xOffset + i * 80, yPos, size, size);
  }
  
  function drawEnemyScene(t, p) {
  ctx.fillStyle = "#05000a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 150; i++) {
    const x = (i * 171) % canvas.width;
    const y = (i * 293) % canvas.height;
    const brightness = 0.3 + Math.sin(t * 0.001 + i) * 0.3;
    ctx.fillStyle = `rgba(255,100,100,${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  ctx.save();
  ctx.translate(canvas.width * 0.5, canvas.height * 0.35);
  const pulse = Math.sin(t * 0.003) * 20;
  ctx.rotate(t * 0.0005);
  
  ctx.strokeStyle = `rgba(255,50,50,${0.6 + Math.sin(t * 0.002) * 0.3})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 40;
  ctx.shadowColor = "red";
  
  const dSize = 150 + pulse;
  ctx.beginPath();
  ctx.moveTo(0, -dSize);
  ctx.lineTo(dSize, 0);
  ctx.lineTo(0, dSize);
  ctx.lineTo(-dSize, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  
  // Green squares being destroyed
  for (let i = 0; i < 5; i++) {
    const xOffset = Math.sin(t * 0.001 + i) * 100;
    const yPos = canvas.height * 0.6 + i * 40;
    const size = 25 + Math.sin(t * 0.002 + i) * 5;
    const destruction = Math.min(1, (t / 4500) + i * 0.1);
    
    ctx.fillStyle = `rgba(0,255,0,${(0.6 - destruction * 0.6) + Math.sin(t * 0.002 + i) * 0.3})`;
    ctx.fillRect(canvas.width * 0.3 + xOffset + i * 80, yPos, size * (1 - destruction * 0.5), size * (1 - destruction * 0.5));
    
    // Destruction particles
    if (destruction > 0.3) {
      for (let j = 0; j < 3; j++) {
        const px = canvas.width * 0.3 + xOffset + i * 80 + (Math.random() - 0.5) * 40 * destruction;
        const py = yPos + (Math.random() - 0.5) * 40 * destruction;
        ctx.fillStyle = `rgba(0,255,0,${(1 - destruction) * 0.5})`;
        ctx.fillRect(px, py, 3, 3);
      }
    }
  }
  
  for (let i = 0; i < 4; i++) {
    const xOffset = Math.cos(t * 0.0015 + i) * 120;
    const yPos = canvas.height * 0.7 + i * 35;
    const size = 30;
    
    ctx.fillStyle = `rgba(0,255,255,${0.5 + Math.cos(t * 0.002 + i) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.6 + xOffset + i * 70, yPos - size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 - size/2, yPos + size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 + size/2, yPos + size/2);
    ctx.closePath();
    ctx.fill();
  }
}

  for (let i = 0; i < 4; i++) {
    const xOffset = Math.cos(t * 0.0015 + i) * 120;
    const yPos = canvas.height * 0.7 + i * 35;
    const size = 30;
    
    ctx.fillStyle = `rgba(0,255,255,${0.5 + Math.cos(t * 0.002 + i) * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.6 + xOffset + i * 70, yPos - size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 - size/2, yPos + size/2);
    ctx.lineTo(canvas.width * 0.6 + xOffset + i * 70 + size/2, yPos + size/2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGoldStarLaunch(t, p) {
  ctx.fillStyle = "#000814";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < 100; i++) {
    const x = ((i * 137) % canvas.width) - p * canvas.width * 0.5;
    const y = (i * 241) % canvas.height;
    const speed = 1 + (i % 3);
    ctx.fillStyle = `rgba(255,255,255,${0.6 - p * 0.4})`;
    ctx.fillRect(x - speed * p * 200, y, 2 + speed * p * 3, 2);
  }
  
  const startX = canvas.width * 0.3;
  const startY = canvas.height * 0.5;
  const endX = canvas.width * 0.5;
  const endY = canvas.height * 0.5;
  
  const gsX = startX + (endX - startX) * p;
  const gsY = startY + (endY - startY) * p;
  const gsSize = 40 + p * 60;
  
  if (p > 0.4) {
    const blastIntensity = Math.min(1, (p - 0.4) / 0.3);
    
    for (let i = 0; i < 20; i++) {
      const trailP = i / 20;
      const tx = gsX - (30 + i * 15) * blastIntensity;
      const ty = gsY + (Math.random() - 0.5) * 20 * blastIntensity;
      const tSize = (20 - i) * blastIntensity;
      
      ctx.fillStyle = `rgba(255,${150 - i * 7},0,${(1 - trailP) * 0.8})`;
      ctx.beginPath();
      ctx.arc(tx, ty, tSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 40;
    ctx.shadowColor = "orange";
    ctx.fillStyle = `rgba(255,200,0,${blastIntensity})`;
    ctx.beginPath();
    ctx.arc(gsX - 25, gsY, 15 * blastIntensity, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  ctx.save();
  ctx.translate(gsX, gsY);
  ctx.shadowBlur = 30 + p * 20;
  ctx.shadowColor = "gold";
  ctx.fillStyle = "gold";
  
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? gsSize / 2 : gsSize / 4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  if (p > 0.85) {
    const flashIntensity = (p - 0.85) / 0.15;
    ctx.fillStyle = `rgba(255,255,255,${flashIntensity * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function makeCutsceneScenes() {
  const scenes = [];

  scenes.push({
    duration: 2500,
    draw: (t, p) => {
      drawLaunchBayScene();
    }
  });

  scenes.push({
    duration: 4500,
    draw: (t, p) => {
      drawEnemyScene(t, p);
      drawTextBox([
        'Commander: "The Mother Diamond has been',
        'destroying all the Green Squares on Earth.',
        'We\'re the last ones left."'
      ], 50, canvas.height - 170, canvas.width - 100);
    }
  });

  scenes.push({
    duration: 4000,
    draw: (t, p) => {
      ctx.fillStyle = "#080a10";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const name = cinematic.playerName || "Pilot";
      drawTextBox([
        `Commander: "${name}, you must reach the`,
        'Mother Diamond and destroy it.',
        'Then we can take back Earth."'
      ], 50, canvas.height - 170, canvas.width - 100);
    }
  });

  scenes.push({
    duration: 3500,
    draw: (t, p) => {
      drawGoldStarLaunch(t, p);
      
      if (p < 0.3) {
        drawTextBox([
          'Pilot: "I\'m going!"',
          'Commander: "Believe in the Gold Star!"'
        ], 50, canvas.height - 140, 520);
      }
    }
  });

  scenes.push({
    duration: 2500,
    draw: (t, p) => {
      const fadeOut = 1 - p;
      ctx.fillStyle = `rgba(255,255,255,${fadeOut * 0.8})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (p > 0.4) {
        const countdown = Math.ceil(2.5 - (p * 2.5));
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("WAVE 1 STARTING IN", canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = "72px Arial";
        ctx.fillStyle = countdown <= 1 ? "red" : "yellow";
        ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2 + 40);
        ctx.font = "32px Arial";
        ctx.fillStyle = "cyan";
        ctx.fillText("GET READY FOR BATTLE", canvas.width / 2, canvas.height / 2 + 100);
      }
    }
  });

  return scenes;
}

let cinematicScenes = [];
let cinematicIndex = 0;
let cinematicStartTime = 0;

function startCutscene() {
  const name = typeof prompt === 'function' ? (prompt("Enter your pilot name:", "Pilot") || "Pilot") : "Pilot";
  cinematic.playerName = name;
  cinematic.playing = true;
  cinematicScenes = makeCutsceneScenes();
  cinematicIndex = 0;
  cinematicStartTime = performance.now();

  if (!cinematicScenes || cinematicScenes.length === 0) {
    cinematic.playing = false;
    endCutscene();
    return;
  }

  requestAnimationFrame(cinematicTick);
}

function cinematicTick(now) {
  if (!cinematic.playing) return;

  // Guard: ensure scene exists
  const scene = cinematicScenes[cinematicIndex];
  if (!scene) {
    cinematic.playing = false;
    endCutscene();
    return;
  }

  let elapsedBefore = 0;
  for (let i = 0; i < cinematicIndex; i++) elapsedBefore += cinematicScenes[i].duration;
  const sceneElapsed = now - (cinematicStartTime + elapsedBefore);
  const progress = Math.max(0, Math.min(1, sceneElapsed / scene.duration));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  scene.draw(now, progress);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "14px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Press ESC to skip intro", canvas.width - 20, 30);

  if (sceneElapsed >= scene.duration) {
    cinematicIndex++;
    if (cinematicIndex >= cinematicScenes.length) {
      cinematic.playing = false;
      endCutscene();
      return;
    }
  }

  requestAnimationFrame(cinematicTick);
}

window.addEventListener("keydown", e => {
  if (e.key === "Escape" && cinematic.playing) {
    cinematic.playing = false;
    endCutscene();
  }
});

// ======= Persistence and restart =======
let gameOver = false;
let highScore = 0;
const HIGH_SCORE_KEY = 'mybagman_game_highscore';

function loadHighScore() {
  try {
    const v = localStorage.getItem(HIGH_SCORE_KEY);
    highScore = v ? parseInt(v, 10) || 0 : 0;
  } catch (e) {
    highScore = 0;
  }
}

function saveHighScoreIfNeeded() {
  try {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
  } catch (e) {}
}

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r' && gameOver) {
    resetGame();
  }
});

function resetGame() {
  bullets = []; lightning = []; enemies = []; diamonds = []; powerUps = []; explosions = []; tunnels = []; minionsToAdd = [];
  score = 0;
  wave = 0;
  waveTransition = false;
  waveTransitionTimer = 0;
  player.lives = 3;
  respawnPlayer();
  respawnGoldStar();
  loadHighScore();
  gameOver = false;
  startCutscene();
}

function endCutscene() {
  if (!ensureCanvas()) return;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  wave = 0;
  waveTransition = false;
  spawnWave(wave);
  gameLoop();
}

// ======= Game state and systems =======

let keys = {}, bullets = [], enemies = [], lightning = [], explosions = [], diamonds = [], powerUps = [], tunnels = [];
let redPunchEffects = [];
let score = 0, wave = 0, minionsToAdd = [];
let shootCooldown = 0, waveTransition = false, waveTransitionTimer = 0;
const WAVE_BREAK_MS = 2500;
let frameCount = 0;

// Firing indicator angle
let firingIndicatorAngle = 0;

const GOLD_STAR_PICKUP_FRAMES = 30;
const PICKUP_RADIUS = 60;
const MIN_SPAWN_DIST = 220;

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

// ======== GOLD STAR AURA SYSTEM ========
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
  goldStarAura.radius = goldStarAura.baseRadius * (1 + 0.02 * goldStarAura.level);

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
    player.fireRateBoost = 1 + goldStarAura.level * 0.15;
    if (frameCount % Math.max(90 - goldStarAura.level * 10, 30) === 0) {
      player.health = Math.min(player.maxHealth, player.health + 1);
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
    const bulletSlowRadius = goldStarAura.radius * 1.25;
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
}
// ======== END GOLD STAR AURA SYSTEM ========

let player = {
  x: 0, y: 0, size: 30, speed: 5,
  health: 100, maxHealth: 100, lives: 3, invulnerable: false, invulnerableTimer: 0,
  reflectAvailable: false, fireRateBoost: 1
};

let goldStar = {
  x: 0, y: 0, size: 35, speed: 3,
  health: 150, maxHealth: 150, alive: true, redPunchLevel: 0, blueCannonnLevel: 0,
  redKills: 0, blueKills: 0, punchCooldown: 0, cannonCooldown: 0,
  collecting: false, collectTimer: 0, targetPowerUp: null, respawnTimer: 0,
  reflectAvailable: false
};

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

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
}

function respawnPlayer() {
  player.health = player.maxHealth;
  player.x = canvas.width/2;
  player.y = canvas.height/2;
  player.invulnerable = true;
  player.invulnerableTimer = 120;
}

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
  diamonds.push({x: pos.x, y: pos.y, size: 40, health: 200, type: "diamond", attachments: [], canReflect: false, angle: Math.random()*Math.PI*2, shootTimer: 0, pulse: 0});
}

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

function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;
  let dirX = 0, dirY = 0;
  if (keys["arrowup"]) dirY = -1; if (keys["arrowdown"]) dirY = 1;
  if (keys["arrowleft"]) dirX = -1; if (keys["arrowright"]) dirX = 1;
  if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
    const mag = Math.hypot(dirX, dirY) || 1;
    bullets.push({x: player.x, y: player.y, dx: (dirX/mag)*10, dy: (dirY/mag)*10, size: 6, owner: "player"});
    shootCooldown = Math.max(5, Math.floor(10 / player.fireRateBoost));
    
    // Rotate firing indicator when shooting
    firingIndicatorAngle += Math.PI / 2;
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
    minionsToAdd.push({x: boss.x+(Math.random()-0.5)*80, y: boss.y+(Math.random()-0.5)*80, size: 20, speed: 2.2, health: 30, type: "triangle", fromBoss: true});
  }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*5, dy: d.y*5, size: 6, damage: 12}));
  }
}

function updateDiamond(d) {
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
    d.x = canvas.width/2 + Math.cos(d.angle)*radius;
    d.y = canvas.height/2 + Math.sin(d.angle)*radius;
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
          bullets.splice(bi,1);
          e.health -= 5;
        }
      }

      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y);
      if (distToPlayer < 30) { if (!player.invulnerable) player.health -= 15; createExplosion(e.x, e.y, "magenta"); e.health -= 50; }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y);
      if (goldStar.alive && distToGoldStar < 30) {
        goldStar.health -= 15; createExplosion(e.x, e.y, "magenta");
        if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); }
      }

      if (e.health <= 0) {
        createExplosion(e.x, e.y, "purple");
        if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); spawnPowerUp(e.x, e.y, "reflect"); }
        return false;
      }

      return true;
    }

    return true;
  });

  if (minionsToAdd.length > 0) { enemies.push(...minionsToAdd); minionsToAdd = []; }
}

function updateLightning() {
  lightning = lightning.filter(l => {
    l.x += l.dx; l.y += l.dy;

    if (Math.hypot(l.x-player.x, l.y-player.y) < player.size/2) {
      if (player.reflectAvailable) {
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
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
    for (let ei = enemies.length-1; ei >= 0; ei--) {
      const e = enemies[ei]; if (!e) continue;
      if (e.type === "reflector") {
        const dx = b.x-e.x, dy = b.y-e.y, dist = Math.hypot(dx,dy);
        if (dist < Math.max(e.width,e.height)) {
          lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15});
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
        d.health -= (bullets[bi].owner === "player" ? 12 : 6);
        bullets.splice(bi,1);
        if (d.health <= 0) { createExplosion(d.x, d.y, "white"); d.attachments.forEach(a => enemies.push(a)); diamonds.splice(di,1); score += 100; }
        break;
      }
    }
  }
}

function handlePowerUpCollections() {
  return;
}

function drawPlayer() {
  const invulFlash = player.invulnerable && Math.floor(Date.now()/100)%2 === 0;
  ctx.fillStyle = invulFlash ? "rgba(0,255,0,0.5)" : "lime";
  ctx.fillRect(player.x-player.size/2, player.y-player.size/2, player.size, player.size);

  // Draw firing indicator dot that moves around the square
  if (shootCooldown > 0 || (keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"])) {
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
    
    // Smoothly rotate the indicator
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
      // Enhanced red square with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.fillStyle = "red"; 
      ctx.fillRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
      ctx.shadowBlur = 0;
      
      // Pulsing edge highlight
      const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255,100,100,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size);
    }
    else if (e.type === "triangle") { 
      // Enhanced triangle with glow and trail
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
      
      // Pulsing outline
      const pulse = Math.sin(frameCount * 0.08 + e.x) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(100,255,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); 
      ctx.moveTo(e.x, e.y-e.size/2); 
      ctx.lineTo(e.x-e.size/2, e.y+e.size/2); 
      ctx.lineTo(e.x+e.size/2, e.y+e.size/2); 
      ctx.closePath(); 
      ctx.stroke();
    }
    else if (e.type === "boss") { 
      // Enhanced boss with pulsing aura
      const pulse = Math.sin(frameCount * 0.05) * 10 + e.size/2;
      ctx.shadowBlur = 30;
      ctx.shadowColor = "yellow";
      ctx.fillStyle = "yellow"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Outer ring
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, pulse + 10, 0, Math.PI*2);
      ctx.stroke();
    }
    else if (e.type === "mini-boss") { 
      // Enhanced mini-boss
      const pulse = Math.sin(frameCount * 0.07) * 5 + e.size/2;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "orange";
      ctx.fillStyle = "orange"; 
      ctx.beginPath(); 
      ctx.arc(e.x, e.y, pulse, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle||0);
      
      // Enhanced reflector with glow
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
  });
}

function drawDiamonds() {
  diamonds.forEach(d => {
    ctx.save(); 
    ctx.translate(d.x, d.y); 
    ctx.rotate(d.angle||0);
    
    // Enhanced diamond with glow and pulsing
    const glowIntensity = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.shadowBlur = 30;
    ctx.shadowColor = d.canReflect ? "cyan" : "white";
    ctx.strokeStyle = d.canReflect ? `rgba(0,255,255,${glowIntensity})` : `rgba(255,255,255,${glowIntensity})`;
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
  // Enhanced lightning with glow
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
    
    // Pulsing glow for all powerups
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
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 3 }, { type: "diamond", count: 1 }] }
];

function spawnWave(waveIndex) {
  if (waveIndex < 0 || waveIndex >= waves.length) return;
  const waveData = waves[waveIndex];
  if (waveData.tunnel) spawnTunnel();
  if (waveData.enemies) {
    waveData.enemies.forEach(group => {
      if (group.type === "red-square") spawnRedSquares(group.count);
      else if (group.type === "triangle") spawnTriangles(group.count);
      else if (group.type === "reflector") spawnReflectors(group.count);
      else if (group.type === "boss") for (let i = 0; i < group.count; i++) spawnBoss();
      else if (group.type === "mini-boss") for (let i = 0; i < group.count; i++) spawnMiniBoss();
      else if (group.type === "diamond") for (let i = 0; i < group.count; i++) spawnDiamondEnemy();
    });
  }
}

function tryAdvanceWave() {
  if (enemies.length === 0 && diamonds.length === 0 && tunnels.length === 0 && !waveTransition) {
    bullets = [];
    lightning = [];

    if (wave >= waves.length-1) { waveTransition = true; waveTransitionTimer = 0; return; }
    waveTransition = true;
    waveTransitionTimer = 0;
  }

  if (waveTransition) {
    waveTransitionTimer++;
    if (waveTransitionTimer >= WAVE_BREAK_MS / (1000/60)) {
      wave++;
      if (wave < waves.length) {
        spawnWave(wave);
      }
      waveTransition = false;
      waveTransitionTimer = 0;
    }
  }
}

function gameLoop() {
  if (gameOver) return;

  // Ensure canvas/context are present (in case something removed the element)
  if (!canvas || !ctx) {
    if (!ensureCanvas()) return;
  }

  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGoldStarAura(ctx);

  let newX = player.x, newY = player.y;
  if (keys["w"]) newY -= player.speed; 
  if (keys["s"]) newY += player.speed;
  if (keys["a"]) newX -= player.speed; 
  if (keys["d"]) newX += player.speed;
  
  let blocked = false;
  for (const t of tunnels) {
    if (newX+player.size/2 > t.x && newX-player.size/2 < t.x+t.width && newY+player.size/2 > t.y && newY-player.size/2 < t.y+t.height) {
      blocked = true; 
      if (!player.invulnerable) player.health -= 1; 
      createExplosion(player.x, player.y, "cyan"); 
      break;
    }
  }
  if (!blocked) { player.x = newX; player.y = newY; }

  handleShooting(); 
  updateBullets(); 
  updateEnemies(); 
  updateLightning(); 
  checkBulletCollisions();
  updateExplosions(); 
  updateTunnels(); 
  updatePowerUps();

  handlePowerUpCollections();

  updateGoldStar(); 
  updateGoldStarAura();
  updateRedPunchEffects();

  drawPlayer(); 
  drawBullets(); 
  drawEnemies(); 
  drawDiamonds(); 
  drawLightning(); 
  drawExplosions();
  drawTunnels(); 
  drawPowerUps(); 
  drawGoldStar(); 
  drawRedPunchEffects(); 
  drawUI(); 
  tryAdvanceWave();

  if (player.health <= 0) {
    player.lives--;
    if (player.lives > 0) { 
      respawnPlayer(); 
      requestAnimationFrame(gameLoop); 
    } else {
      gameOver = true;
      saveHighScoreIfNeeded();
      ctx.fillStyle = "white"; 
      ctx.font = "50px Arial"; 
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
      ctx.font = "30px Arial";
      ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2+50);
      ctx.font = "20px Arial";
      ctx.fillText(`Best: ${highScore}`, canvas.width/2, canvas.height/2+90);
      ctx.fillText(`Press R to restart`, canvas.width/2, canvas.height/2+130);
    }
  } else {
    requestAnimationFrame(gameLoop);
  }
}
