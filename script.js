const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ==============================
// Cinematic cutscene system (with sprite launch)
// ==============================

let cinematic = {
  playing: false,
  playerName: "Pilot",
  images: {
    launch: null,
    commander: null,
    commanderClose: null,
    schematic: null,
    diamond: null,
    greenSquare: null,
    launchSprite: null // new sprite animation
  }
};

// Replace these with your own assets
const cinematicImagePaths = {
  launch: "assets/launch_hangar.jpg",
  commander: "assets/commander_full.png",
  commanderClose: "assets/commander_face.png",
  schematic: "assets/schematic.png",
  diamond: "assets/diamond.png",
  greenSquare: "assets/green_square.png",
  launchSprite: "assets/green_launch_sprite.png" // <-- sprite sheet (8 frames wide)
};

function loadCinematicImages(paths, onDone) {
  const keys = Object.keys(paths);
  let loaded = 0;
  keys.forEach(k => {
    const img = new Image();
    img.onload = () => { cinematic.images[k] = img; loaded++; if (loaded === keys.length) onDone(); };
    img.onerror = () => { cinematic.images[k] = null; loaded++; if (loaded === keys.length) onDone(); };
    img.src = paths[k];
  });
}

// helper text box
function drawTextBox(lines, x, y, maxW, lineHeight = 26, align = "left") {
  ctx.save();
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
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

function makeCutsceneScenes() {
  const scenes = [];

  // Scene 1: Launch bay
  scenes.push({
    duration: 3000,
    draw: (t,p) => {
      if (cinematic.images.launch) ctx.drawImage(cinematic.images.launch, 0, 0, canvas.width, canvas.height);
      else { ctx.fillStyle = "#001a33"; ctx.fillRect(0,0,canvas.width,canvas.height); }
      const gx = canvas.width*0.35, gy = canvas.height*0.65;
      ctx.fillStyle = "lime"; ctx.fillRect(gx-25, gy-25, 50, 50);
      drawTextBox(["Scene 1 — Launch bay.", "The pilot prepares aboard the ship."], 50, canvas.height - 120, 520);
    }
  });

  // Scene 2: Commander briefing
  scenes.push({
    duration: 4200,
    draw: (t,p) => {
      ctx.fillStyle = "#071020"; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (cinematic.images.commander) {
        const img = cinematic.images.commander;
        const h = Math.min(canvas.height*0.75, img.height);
        const w = h * (img.width / img.height);
        ctx.drawImage(img, 60, canvas.height*0.12, w, h);
      }
      drawTextBox([
        'Commander: "As you already know,',
        'the autonomous mother ships are out of control,',
        'they have invaded our planet and taken out command."'
      ], 420, canvas.height - 170, 600);
    }
  });

  // Scene 3: Commander close-up
  scenes.push({
    duration: 4200,
    draw: (t,p) => {
      ctx.fillStyle = "#080a10"; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (cinematic.images.commanderClose) {
        const img = cinematic.images.commanderClose;
        const w = Math.min(canvas.width*0.45, img.width);
        const h = w * (img.height / img.width);
        ctx.drawImage(img, canvas.width*0.05, canvas.height*0.08, w, h);
      }
      const name = cinematic.playerName || "Pilot";
      drawTextBox([
        `Commander: "We're the last ones left, ${name}.`,
        'It’s up to you now."'
      ], 520, canvas.height - 170, 500);
    }
  });

  // Scene 4: Schematics
  scenes.push({
    duration: 5200,
    draw: (t,p) => {
      ctx.fillStyle = "#061020"; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (cinematic.images.schematic) {
        const img = cinematic.images.schematic;
        const w = Math.min(canvas.width*0.45, img.width);
        const h = w * (img.height / img.width);
        ctx.drawImage(img, canvas.width*0.05, canvas.height*0.08, w, h);
      }
      if (cinematic.images.diamond) {
        const img = cinematic.images.diamond;
        const w = 160, h = 160;
        ctx.drawImage(img, canvas.width*0.66, canvas.height*0.22, w, h);
      }
      drawTextBox([
        'Commander: "First, we need you to launch the Green Square Mk1."',
        '"Make your way to the Mother Diamond — it appears to be coordinating the attacks from space."',
        '"Once you’ve done that, we can attempt landfall."'
      ], 50, canvas.height - 220, canvas.width - 100, 26);
    }
  });

  // Scene 5: Launch animation with sprite
  scenes.push({
    duration: 4200,
    draw: (t,p) => {
      ctx.fillStyle = "#001218"; ctx.fillRect(0,0,canvas.width,canvas.height);

      // text panel
      drawTextBox(['Pilot: "Ikimus! I’m going!"', 'Commander: "Good luck, Green Square pilot."'], 60, canvas.height - 160, 520);

      // launch animation
      const sprite = cinematic.images.launchSprite;
      const totalFrames = 8;  // adjust based on your sprite sheet
      const frameW = sprite ? sprite.width / totalFrames : 60;
      const frameH = sprite ? sprite.height : 60;
      const frame = Math.floor((t / 100) % totalFrames);

      // position
      const startX = canvas.width*0.22, startY = canvas.height*0.7;
      const endX = canvas.width*0.8, endY = canvas.height*0.12;
      const sx = startX + (endX - startX) * p;
      const sy = startY + (endY - startY) * p;

      if (sprite) {
        ctx.drawImage(sprite, frame * frameW, 0, frameW, frameH, sx - 40, sy - 40, 80, 80);
      } else {
        // fallback
        ctx.fillStyle = "lime"; ctx.fillRect(sx-20, sy-20, 40, 40);
      }

      // exhaust glow
      ctx.beginPath();
      ctx.arc(sx-30, sy+25, 20 * (1-p), 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,150,0,${0.4*(1-p)})`;
      ctx.fill();
    }
  });

  return scenes;
}

let cinematicScenes = [];
let cinematicIndex = 0;
let cinematicStartTime = 0;

function startCutscene() {
  cinematic.playerName = prompt("Enter your name:", "Pilot") || "Pilot";
  cinematic.playing = true;
  cinematicScenes = makeCutsceneScenes();
  cinematicIndex = 0;
  cinematicStartTime = performance.now();

  loadCinematicImages(cinematicImagePaths, () => {
    requestAnimationFrame(cinematicTick);
  });
}

function cinematicTick(now) {
  if (!cinematic.playing) return;
  const scene = cinematicScenes[cinematicIndex];
  let elapsedBefore = 0;
  for (let i = 0; i < cinematicIndex; i++) elapsedBefore += cinematicScenes[i].duration;
  const sceneElapsed = now - (cinematicStartTime + elapsedBefore);
  const progress = Math.max(0, Math.min(1, sceneElapsed / scene.duration));

  ctx.clearRect(0,0,canvas.width,canvas.height);
  scene.draw(now, progress);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "14px Arial";
  ctx.fillText("Press ESC to skip intro", canvas.width - 180, 30);

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

function endCutscene() {
  ctx.fillStyle = "black";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  wave = 0;
  waveTransition = false;
  spawnWave(wave);
  gameLoop();
}
let keys = {}, bullets = [], enemies = [], lightning = [], explosions = [], diamonds = [], powerUps = [], tunnels = [];
let redPunchEffects = [];
let score = 0, wave = 0, minionsToAdd = [];
let shootCooldown = 0, waveTransition = false, waveTransitionTimer = 0;
const WAVE_BREAK_MS = 2500;
let frameCount = 0;

// Pickup constants
const GOLD_STAR_PICKUP_FRAMES = 30; // 0.5s @ 60fps
const PICKUP_RADIUS = 60; // radius for grabbing nearby power-ups

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
  // Aura radius increases only by 2% per level (relative to baseRadius)
  goldStarAura.radius = goldStarAura.baseRadius * (1 + 0.02 * goldStarAura.level);
  
  // Check if player is within aura radius to activate it
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
  // Reset aura level and visuals when Gold Star dies.
  goldStarAura.level = 0;
  goldStarAura.radius = goldStarAura.baseRadius;
  goldStarAura.active = false;
  goldStarAura.pulse = 0;

  // Clear aura particles/visuals
  auraSparks = [];
  auraShockwaves = [];

  // Restore any slowed lightning velocities to their originals
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
    // Push bullets slightly
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
    ctx.strokeStyle = s.color.replace(/[\d.]+\)$/g, (0.4 * alpha) + ")");
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
    ctx.fillStyle = s.color.replace(/[\d.]+\)$/g, alpha + ")");
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
  // Ensure bullets restore to original speed when not in aura or when gold star dead.
  // Also only apply player buffs when the player is actually within the aura radius.
  // Default player buff state
  player.fireRateBoost = 1;

  // If gold star isn't alive or aura not active, restore any modified lightning velocities and skip buffs.
  if (!goldStar.alive || !goldStarAura.active) {
    for (const l of lightning) {
      if (l._origDx !== undefined && l._origDy !== undefined) {
        // If the bullet was previously slowed, restore its original velocity.
        if (l._inAura) {
          l.dx = l._origDx;
          l.dy = l._origDy;
          l._inAura = false;
        }
      }
    }
    return;
  }

  // Gold star is alive and aura is active -> we may apply buffs if the player is within the radius.
  const dx = player.x - goldStar.x;
  const dy = player.y - goldStar.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < goldStarAura.radius) {
    // Fire rate buff only while inside aura
    player.fireRateBoost = 1 + goldStarAura.level * 0.15;
    // Health regen over time while inside
    if (frameCount % Math.max(90 - goldStarAura.level * 10, 30) === 0) {
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
  } else {
    player.fireRateBoost = 1;
  }

  // Slow enemy bullets in aura — non-cumulative effect.
  for (const l of lightning) {
    // initialize original velocities once
    if (l._origDx === undefined || l._origDy === undefined) {
      l._origDx = l.dx;
      l._origDy = l.dy;
      l._inAura = false;
    }

    const bx = l.x - goldStar.x;
    const by = l.y - goldStar.y;
    const bd = Math.sqrt(bx*bx + by*by);
    // Extend bullet slow effect radius by 25% while keeping the visible aura size unchanged
    const bulletSlowRadius = goldStarAura.radius * 1.25;
    if (bd < bulletSlowRadius) {
      // Compute a single, non-cumulative slow factor (clamped so bullets always move).
      // Keep the factor tied to aura level; at level 0 there's no slow (1.0), higher levels reduce speed.
      const slowFactor = Math.max(0.2, 1 - 0.1 * goldStarAura.level);
      l.dx = l._origDx * slowFactor;
      l.dy = l._origDy * slowFactor;
      l._inAura = true;
    } else {
      // If it was in the aura previously, restore to original velocities (prevent cumulative slow)
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
  x: canvas.width/2, y: canvas.height/2, size: 30, speed: 5,
  health: 100, maxHealth: 100, lives: 3, invulnerable: false, invulnerableTimer: 0,
  reflectAvailable: false, fireRateBoost: 1
};

let goldStar = {
  x: canvas.width/4, y: canvas.height/2, size: 35, speed: 3,
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
  for (let i = 0; i < c; i++) enemies.push({
    x: Math.random()*canvas.width,
    y: Math.random()*(canvas.height/2),
    size: 30, speed: 1.8, health: 30, type: "red-square", shootTimer: 0, fromBoss
  });
}
function spawnTriangles(c, fromBoss = false) {
  for (let i = 0; i < c; i++) enemies.push({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    size: 30, speed: 1.5, health: 40, type: "triangle", shootTimer: 0, fromBoss
  });
}
function spawnReflectors(c) {
  for (let i = 0; i < c; i++) enemies.push({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    width: 40, height: 20, angle: 0, speed: 1.2, health: 200, type: "reflector", shieldActive: false, fromBoss: false
  });
}
function spawnBoss() {
  enemies.push({x: canvas.width/2, y: 100, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0, angle: 0});
}
function spawnMiniBoss() {
  enemies.push({x: Math.random()*canvas.width, y: 120+Math.random()*60, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0, angle: Math.random()*Math.PI*2});
}
function spawnDiamondEnemy() {
  diamonds.push({x: canvas.width/2, y: canvas.height/3, size: 40, health: 200, type: "diamond", attachments: [], canReflect: false, angle: Math.random()*Math.PI*2, shootTimer: 0, pulse: 0});
}
function spawnPowerUp(x, y, type) {
  powerUps.push({x, y, type, size: 18, lifetime: 600, active: true});
}
function spawnTunnel() {
  const h = canvas.height/3, w = 600;
  tunnels.push({x: canvas.width, y: 0, width: w, height: h, speed: 2, active: true}, {x: canvas.width, y: canvas.height-h, width: w, height: h, speed: 2, active: true});
}
function createExplosion(x,y,color="red"){ for (let i=0;i<20;i++) explosions.push({x, y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color, life:30}); }

function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;
  let dirX = 0, dirY = 0;
  if (keys["arrowup"]) dirY = -1; if (keys["arrowdown"]) dirY = 1;
  if (keys["arrowleft"]) dirX = -1; if (keys["arrowright"]) dirX = 1;
  if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
    const mag = Math.hypot(dirX, dirY) || 1;
    bullets.push({x: player.x, y: player.y, dx: (dirX/mag)*10, dy: (dirY/mag)*10, size: 6, owner: "player"});
    shootCooldown = Math.max(5, Math.floor(10 / player.fireRateBoost));
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
function updateTunnels() { for (let i = tunnels.length-1; i >= 0; i--) { const t = tunnels[i]; if (!t.active) continue; t.x -= t.speed; if (t.x+t.width < 0) tunnels.splice(i,1); }}
function updateExplosions(){ explosions = explosions.filter(ex => { ex.x += ex.dx; ex.y += ex.dy; ex.life--; return ex.life>0; }); }

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
      const pushX = (dx / dist) * knockbackForce;
      const pushY = (dy / dist) * knockbackForce;
      o.e.x += pushX;
      o.e.y += pushY;
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
    redPunchEffects.push({
      x: goldStar.x,
      y: goldStar.y,
      maxR: radius,
      r: 0,
      life: 18,
      maxLife: 18,
      color: "rgba(255,220,120,0.9)",
      fill: true
    });
    for (let i = 0; i < 8; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*8, dy:(Math.random()-0.5)*8, radius:Math.random()*6+2, color:"rgba(255,200,100,0.9)", life:12});
  } else if (goldStar.redPunchLevel === 2) {
    redPunchEffects.push({
      x: goldStar.x,
      y: goldStar.y,
      maxR: radius + 30,
      r: 0,
      life: 24,
      maxLife: 24,
      color: "rgba(255,160,60,0.95)",
      fill: true
    });
    // fixed: create a set of medium explosions for level 2
    for (let i = 0; i < 14; i++) {
      explosions.push({
        x: goldStar.x,
        y: goldStar.y,
        dx: (Math.random() - 0.5) * 10,
        dy: (Math.random() - 0.5) * 10,
        radius: Math.random() * 8 + 3,
        color: "rgba(255,140,50,0.95)",
        life: 16
      });
    }
  } else {
    redPunchEffects.push({
      x: goldStar.x,
      y: goldStar.y,
      maxR: radius + 60,
      r: 0,
      life: 36,
      maxLife: 36,
      color: "rgba(255,60,255,0.95)",
      fill: false,
      ring: true
    });
    explosions.push({x: goldStar.x, y: goldStar.y, dx:0, dy:0, radius: 40, color:"rgba(255,255,255,0.95)", life:8});
    for (let i = 0; i < 20; i++) explosions.push({x: goldStar.x, y: goldStar.y, dx:(Math.random()-0.5)*12, dy:(Math.random()-0.5)*12, radius:Math.random()*6+2, color:"rgba(255,50,200,0.9)", life:22});
  }

  if (goldStar.redPunchLevel >= 3) {
    createExplosion(goldStar.x, goldStar.y, "magenta");
  }
}

function updateGoldStar() {
  // If the Gold Star is dead, reset aura level and visuals once and handle respawn timer.
  if (!goldStar.alive) {
    // Reset aura the moment gold star is dead (only happens once because level set to 0)
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
        // pick up all powerUps within PICKUP_RADIUS of the picked one (including it)
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

        // remove all picked powerUps from the world
        powerUps = powerUps.filter(p => !picked.includes(p));
      }
      goldStar.collecting = false; goldStar.collectTimer = 0; goldStar.targetPowerUp = null;
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
    const FRAMES_PER_5S = 300;
    if (goldStar.punchCooldown >= FRAMES_PER_5S) {
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
          for (let i = -1; i <= 1; i++) { const angle = Math.atan2(dy,dx)+i*0.3; bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); }
        }
        else if (goldStar.blueCannonnLevel === 4) {
          for (let i = -2; i <= 2; i++) { const angle = Math.atan2(dy,dx)+i*0.25; bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8, owner: "gold"}); }
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
      if (distToPlayer < (e.size/2 + player.size/2)) { if (!player.invulnerable) player.health -= (e.type === "triangle" ? 25 : 15); createExplosion(e.x, e.y, "red"); e.health -= 100; }
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
      }
      return e.health > 0;
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
  // Player no longer collects powerUps directly.
  // Gold Star still has its own collection behavior (goldStar.collecting).
  // So do nothing here to prevent player pickup.
  return;
}

function drawPlayer() {
  ctx.fillStyle = (player.invulnerable && Math.floor(Date.now()/100)%2 === 0) ? "rgba(0,255,0,0.5)" : "lime";
  ctx.fillRect(player.x-player.size/2, player.y-player.size/2, player.size, player.size);
  
  if (player.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.size/2 + 14, 0, Math.PI*2); ctx.stroke();
  }
}

function drawBullets() { ctx.fillStyle = "yellow"; bullets.forEach(b => ctx.fillRect(b.x-b.size/2, b.y-b.size/2, b.size, b.size)); }

function drawEnemies() {
  enemies.forEach(e => {
    if (!e) return;
    if (e.type === "red-square") { ctx.fillStyle = "red"; ctx.fillRect(e.x-e.size/2, e.y-e.size/2, e.size, e.size); }
    else if (e.type === "triangle") { ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.moveTo(e.x, e.y-e.size/2); ctx.lineTo(e.x-e.size/2, e.y+e.size/2); ctx.lineTo(e.x+e.size/2, e.y+e.size/2); ctx.closePath(); ctx.fill(); }
    else if (e.type === "boss") { ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.arc(e.x, e.y, e.size/2, 0, Math.PI*2); ctx.fill(); }
    else if (e.type === "mini-boss") { ctx.fillStyle = "orange"; ctx.beginPath(); ctx.arc(e.x, e.y, e.size/2, 0, Math.PI*2); ctx.fill(); }
    else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle||0);
      ctx.fillStyle = e.shieldActive ? "rgba(138,43,226,0.8)" : "purple";
      ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
      if (e.shieldActive) {
        ctx.strokeStyle = "rgba(138,43,226,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
  });
}

function drawDiamonds() {
  diamonds.forEach(d => {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle||0);
    ctx.strokeStyle = d.canReflect ? "cyan" : "white"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -d.size/2 - d.pulse); ctx.lineTo(d.size/2 + d.pulse, 0); ctx.lineTo(0, d.size/2 + d.pulse); ctx.lineTo(-d.size/2 - d.pulse, 0); ctx.closePath(); ctx.stroke();
    ctx.restore();
    d.attachments.forEach(a => {
      if (a.type === "triangle") {
        ctx.fillStyle = "cyan";
        ctx.beginPath(); ctx.moveTo(a.x, a.y-(a.size||20)/2); ctx.lineTo(a.x-(a.size||20)/2, a.y+(a.size||20)/2); ctx.lineTo(a.x+(a.size||20)/2, a.y+(a.size||20)/2); ctx.closePath(); ctx.fill();
      }
      else if (a.type === "reflector") {
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.orbitAngle||0); ctx.fillStyle = "magenta"; ctx.fillRect(-(a.width||20)/2, -(a.height||10)/2, a.width||20, a.height||10); ctx.restore();
      }
      else {
        ctx.fillStyle = "lime"; ctx.fillRect(a.x-(a.size||20)/2, a.y-(a.size||20)/2, a.size||20, a.size||20);
      }
    });
  });
}

function drawLightning() { ctx.fillStyle = "cyan"; lightning.forEach(l => ctx.fillRect(l.x-(l.size||6)/2, l.y-(l.size||6)/2, l.size||6, l.size||6)); }
function drawExplosions(){ explosions.forEach(ex => { ctx.fillStyle = ex.color; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2); ctx.fill(); }); }
function drawTunnels() { tunnels.forEach(t => { if (t.active) { ctx.fillStyle = "rgba(0,255,255,0.5)"; ctx.fillRect(t.x, t.y, t.width, t.height); }}); }

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.type === "red-punch") {
      ctx.fillStyle = "red";
      ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "blue-cannon") {
      ctx.fillStyle = "cyan";
      ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "health") {
      ctx.fillStyle = "magenta";
      ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.fillRect(-2, -6, 4, 4);
    }
    else if (p.type === "reflect") {
      ctx.fillStyle = "purple";
      ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, p.size/2 + 4, 0, Math.PI*2); ctx.stroke();
    }
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
  ctx.save(); ctx.translate(goldStar.x, goldStar.y); ctx.fillStyle = "gold";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i*4*Math.PI)/5 - Math.PI/2;
    const radius = i%2===0 ? goldStar.size/2 : goldStar.size/4;
    const x = Math.cos(angle)*radius, y = Math.sin(angle)*radius;
    if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
  const barWidth = 50; ctx.fillStyle = "gray"; ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth, 5);
  ctx.fillStyle = "gold"; ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth*(goldStar.health/goldStar.maxHealth), 5);

  if (goldStar.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(goldStar.x, goldStar.y, goldStar.size/2 + 14, 0, Math.PI*2); ctx.stroke();
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

// ---------- Compact futuristic UI ----------
// helper: rounded rectangle
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

// Draw compact, neon/futuristic HUD
function drawUI() {
  // Positions and sizes (compact)
  const pad = 12;
  const hudW = 260;
  const hudH = 84;
  const x = pad;
  const y = pad;

  // Background panel (semi-transparent, subtle blur via shadow)
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = "rgba(0,255,255,0.08)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(10,14,20,0.6)";
  roundRect(ctx, x, y, hudW, hudH, 10);
  ctx.fill();
  ctx.restore();

  // Neon border
  ctx.save();
  ctx.strokeStyle = "rgba(0,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x+0.5, y+0.5, hudW-1, hudH-1, 10);
  ctx.stroke();
  ctx.restore();

  // Use compact, monospaced/futuristic font
  ctx.font = "12px 'Orbitron', monospace";
  ctx.textBaseline = "top";

  // Health bar (small and sleek)
  const hbX = x + 12, hbY = y + 10, hbW = hudW - 24, hbH = 10;
  // Background track
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, hbX, hbY, hbW, hbH, 6);
  ctx.fill();

  // Gradient fill for health
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

  // tiny health text
  ctx.fillStyle = "rgba(220,230,255,0.95)";
  ctx.font = "11px 'Orbitron', monospace";
  ctx.fillText(`HP ${Math.floor(player.health)}/${player.maxHealth}`, hbX + 6, hbY - 14);

  // Score & wave compact
  ctx.fillStyle = "rgba(200,220,255,0.95)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText(`SCORE: ${score}`, hbX, hbY + hbH + 10);
  ctx.fillText(`WAVE: ${wave+1}`, hbX + 110, hbY + hbH + 10);

  // Lives as small neon dots
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
  // label for lives
  ctx.fillStyle = "rgba(180,200,255,0.8)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText("LIVES", livesX - 3*14, livesY + 10);

  // Reflect status (player) small badge
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

  // Gold Star compact info (small icons & level)
  const gsX = x + hudW + 12;
  const gsY = y + 8;
  // Minimal info box near top-left but to the right of HUD
  ctx.save();
  ctx.fillStyle = "rgba(10,14,20,0.5)";
  roundRect(ctx, gsX, gsY, 150, 56, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(100,120,255,0.06)";
  ctx.stroke();
  ctx.restore();

  // Gold Star name + small icon
  ctx.fillStyle = goldStar.alive ? "rgba(255,210,90,0.98)" : "rgba(255,100,100,0.9)";
  ctx.font = "12px 'Orbitron', monospace";
  ctx.fillText("GOLD STAR", gsX + 10, gsY + 6);

  // Aura level indicator (small bars)
  const alX = gsX + 10, alY = gsY + 26;
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillStyle = "rgba(190,210,255,0.9)";
  ctx.fillText(`Aura Lv ${goldStarAura.level}`, alX, alY - 12);

  const barW = 110, barH = 8;
  // background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, alX, alY, barW, barH, 6);
  ctx.fill();

  // fill = proportion of level up to 5 (visual only)
  const fillRatio = Math.min(1, goldStarAura.level / 5);
  const auraGrad = ctx.createLinearGradient(alX, alY, alX + barW, alY);
  auraGrad.addColorStop(0, "rgba(255,220,100,0.9)");
  auraGrad.addColorStop(1, "rgba(255,100,40,0.9)");

  ctx.fillStyle = auraGrad;
  roundRect(ctx, alX + 1, alY + 1, (barW - 2) * fillRatio, barH - 2, 5);
  ctx.fill();

  // Small tooltip text for radius
  ctx.fillStyle = "rgba(180,200,255,0.75)";
  ctx.font = "10px 'Orbitron', monospace";
  ctx.fillText(`R: ${Math.floor(goldStarAura.radius)}`, alX + barW - 38, alY - 12);

  // Show small icons for Gold Star power-up levels (red square = red-punch, cyan triangle = blue-cannon)
  let iconX = alX + barW + 8;
  const iconY = alY - 8;
  ctx.font = "10px 'Orbitron', monospace";
  if (goldStar.redPunchLevel > 0) {
    // small red square
    ctx.fillStyle = "red";
    ctx.fillRect(iconX, iconY, 12, 12);
    ctx.fillStyle = "rgba(220,230,255,0.95)";
    ctx.fillText(goldStar.redPunchLevel.toString(), iconX + 16, iconY + 1);
    iconX += 34;
  }
  if (goldStar.blueCannonnLevel > 0) {
    // small cyan triangle
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

  // Wave transition compact banner (top center)
  if (waveTransition) {
    const bannerW = 320, bannerH = 48;
    const bx = (canvas.width - bannerW) / 2;
    const by = 22;
    ctx.save();
    ctx.fillStyle = "rgba(5,6,10,0.75)";
    roundRect(ctx, bx, by, bannerW, bannerH, 10);
    ctx.fill();

    // Neon outline
    ctx.strokeStyle = "rgba(0,200,255,0.14)";
    ctx.lineWidth = 1;
    roundRect(ctx, bx + 0.5, by + 0.5, bannerW - 1, bannerH - 1, 10);
    ctx.stroke();

    // Text
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

// ---------- End UI ----------

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
    // When a wave ends and we begin the transition, remove all player and enemy bullets so the next wave starts clean.
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
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw aura behind everything
  drawGoldStarAura(ctx);
  
  let newX = player.x, newY = player.y;
  if (keys["w"]) newY -= player.speed; if (keys["s"]) newY += player.speed;
  if (keys["a"]) newX -= player.speed; if (keys["d"]) newX += player.speed;
  let blocked = false;
  for (const t of tunnels) {
    if (newX+player.size/2 > t.x && newX-player.size/2 < t.x+t.width && newY+player.size/2 > t.y && newY-player.size/2 < t.y+t.height) {
      blocked = true; if (!player.invulnerable) player.health -= 1; createExplosion(player.x, player.y, "cyan"); break;
    }
  }
  if (!blocked) { player.x = newX; player.y = newY; }

  handleShooting(); updateBullets(); updateEnemies(); updateLightning(); checkBulletCollisions();
  updateExplosions(); updateTunnels(); updatePowerUps();

  handlePowerUpCollections();

  updateGoldStar(); 
  updateGoldStarAura();
  updateRedPunchEffects();

  drawPlayer(); drawBullets(); drawEnemies(); drawDiamonds(); drawLightning(); drawExplosions();
  drawTunnels(); drawPowerUps(); drawGoldStar(); drawRedPunchEffects(); drawUI(); tryAdvanceWave();

  if (player.health <= 0) {
    player.lives--;
    if (player.lives > 0) { respawnPlayer(); requestAnimationFrame(gameLoop); }
    else {
      ctx.fillStyle = "white"; ctx.font = "50px Arial"; ctx.fillText("GAME OVER", canvas.width/2-150, canvas.height/2);
      ctx.font = "30px Arial"; ctx.fillText(`Final Score: ${score}`, canvas.width/2-120, canvas.height/2+50);
    }
  } else requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
wave = 0; waveTransition = false; waveTransitionTimer = 0; spawnWave(wave); gameLoop();
