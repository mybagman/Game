const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let keys = {}, bullets = [], enemies = [], lightning = [], explosions = [], diamonds = [], powerUps = [], tunnels = [];
let redPunchEffects = []; // visual AoE pulses for Gold Star red punch
let score = 0, wave = 0, minionsToAdd = [];
let shootCooldown = 0, waveTransition = false;
const WAVE_BREAK_MS = 2500;

let player = {
  x: canvas.width/2, y: canvas.height/2, size: 30, speed: 5,
  health: 100, maxHealth: 100, lives: 3, invulnerable: false, invulnerableTimer: 0
};

let goldStar = {
  x: canvas.width/4, y: canvas.height/2, size: 35, speed: 3,
  health: 150, maxHealth: 150, alive: true, redPunchLevel: 0, blueCannonnLevel: 0,
  redKills: 0, blueKills: 0, punchCooldown: 0, cannonCooldown: 0,
  collecting: false, collectTimer: 0, targetPowerUp: null, respawnTimer: 0,
  reflectAvailable: false // one-charge reflector ability (from reflector power-up)
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
  // power-ups are circles now
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
    shootCooldown = 10;
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

// update and fade AoE pulses
function updateRedPunchEffects() {
  for (let i = redPunchEffects.length-1; i >= 0; i--) {
    const e = redPunchEffects[i];
    e.life--;
    e.r = e.maxR * (1 - e.life / e.maxLife);
    if (e.life <= 0) redPunchEffects.splice(i,1);
  }
}

// Centralized red punch implementation so it's a named function and reliable
function performRedPunch() {
  // AoE radius scales with level
  const baseRadius = 80;
  const radius = baseRadius + Math.max(0, (goldStar.redPunchLevel - 1)) * 40;
  // Determine how many targets to hit (level-limited). Guarantee at least 1 hit if level > 0
  let punches = Math.max(1, Math.min(goldStar.redPunchLevel, 8));
  // Damage scales with level
  const damage = 40 * goldStar.redPunchLevel;

  // Deal damage to enemies in radius (nearest first, up to punches)
  const nearby = enemies
    .map(e => ({e, d: Math.hypot((e.x||0) - goldStar.x, (e.y||0) - goldStar.y)}))
    .filter(o => o.d <= radius)
    .sort((a,b) => a.d - b.d)
    .slice(0, punches);

  nearby.forEach(o => {
    if (!o.e) return;
    o.e.health -= damage;
    createExplosion(o.e.x, o.e.y, "orange");
    if (o.e.health <= 0) {
      // award score and possibly spawn power-ups similar to normal kills
      const idx = enemies.indexOf(o.e);
      if (idx !== -1) {
        const e = enemies[idx];
        if (!e.fromBoss) {
          if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); }
          else if (e.type === "red-square") { score += 10; spawnPowerUp(e.x, e.y, "red-punch"); }
          else if (e.type === "boss") score += 100;
          else if (e.type === "mini-boss") score += 50;
        }
        // If the killed enemy is a reflector we also want to drop health AND reflect power-up
        if (e.type === "reflector" && !e.fromBoss) {
          // spawn the health power-up where it died
          spawnPowerUp(e.x, e.y, "health");
          spawnPowerUp(e.x, e.y, "reflect"); // give a reflector ability power-up
          score += 20;
        }
        enemies.splice(idx,1);
      }
    }
  });
  // Visual pulse
  redPunchEffects.push({x: goldStar.x, y: goldStar.y, maxR: radius, r: 0, life: 30, maxLife: 30, color: "rgba(255,100,0,0.25)"});
}

function updateGoldStar() {
  if (!goldStar.alive) { goldStar.respawnTimer++; if (goldStar.respawnTimer >= 300) respawnGoldStar(); return; }

  if (goldStar.collecting) {
    goldStar.collectTimer++;
    if (goldStar.collectTimer >= 60) {
      if (goldStar.targetPowerUp) {
        const pu = goldStar.targetPowerUp;
        if (pu.type === "red-punch") {
          goldStar.redKills++;
          if (goldStar.redKills % 5 === 0 && goldStar.redPunchLevel < 5) goldStar.redPunchLevel++;
          createExplosion(pu.x, pu.y, "orange");
          score += 8;
        }
        else if (pu.type === "blue-cannon") {
          goldStar.blueKills++;
          if (goldStar.blueKills % 5 === 0 && goldStar.blueCannonnLevel < 5) goldStar.blueCannonnLevel++;
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
          // one-charge reflect ability
          goldStar.reflectAvailable = true;
          createExplosion(pu.x, pu.y, "magenta");
          score += 12;
        }
        powerUps = powerUps.filter(p => p !== pu);
      }
      goldStar.collecting = false; goldStar.collectTimer = 0; goldStar.targetPowerUp = null;
    }
    return;
  }

  // SMART AVOIDANCE - check for nearby threats
  let dangerX = 0, dangerY = 0, dangerCount = 0;
  const DANGER_RADIUS = 120;

  // Avoid enemies
  enemies.forEach(e => {
    const dist = Math.hypot(e.x - goldStar.x, e.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS;
      dangerX += (goldStar.x - e.x) / dist * weight;
      dangerY += (goldStar.y - e.y) / dist * weight;
      dangerCount++;
    }
  });

  // Avoid enemy projectiles
  lightning.forEach(l => {
    const dist = Math.hypot(l.x - goldStar.x, l.y - goldStar.y);
    if (dist < DANGER_RADIUS && dist > 0) {
      const weight = (DANGER_RADIUS - dist) / DANGER_RADIUS * 1.5;
      dangerX += (goldStar.x - l.x) / dist * weight;
      dangerY += (goldStar.y - l.y) / dist * weight;
      dangerCount++;
    }
  });

  // Move toward nearest power-up if safe
  let nearest = null, minDist = Infinity;
  for (const pu of powerUps) {
    const dist = Math.hypot(pu.x-goldStar.x, pu.y-goldStar.y);
    if (dist < minDist) { minDist = dist; nearest = pu; }
  }

  let moveX = 0, moveY = 0;

  if (dangerCount > 0) {
    // FLEE from danger
    moveX = dangerX;
    moveY = dangerY;
  } else if (nearest && minDist < 300) {
    // Move toward power-up
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
    // Follow player at safe distance
    const dx = player.x-goldStar.x, dy = player.y-goldStar.y, dist = Math.hypot(dx,dy);
    if (dist > 100) {
      const mag = dist||1;
      moveX = dx/mag * 0.7;
      moveY = dy/mag * 0.7;
    }
  }

  // Normalize and apply movement
  const moveMag = Math.hypot(moveX, moveY);
  if (moveMag > 0) {
    goldStar.x += (moveX / moveMag) * goldStar.speed;
    goldStar.y += (moveY / moveMag) * goldStar.speed;
  }

  // Keep in bounds
  goldStar.x = Math.max(50, Math.min(canvas.width-50, goldStar.x));
  goldStar.y = Math.max(50, Math.min(canvas.height-50, goldStar.y));

  // Red punch AoE attack (every 5 seconds)
  if (goldStar.redPunchLevel > 0) {
    goldStar.punchCooldown++;
    const FRAMES_PER_5S = 60 * 5; // assuming ~60fps
    if (goldStar.punchCooldown >= FRAMES_PER_5S) {
      goldStar.punchCooldown = 0;
      performRedPunch();
    }
  }

  // Blue cannon attack (unchanged behavior but ensure cooldown resets on respawn)
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
      if (goldStar.alive && distToGoldStar < (e.size/2 + goldStar.size/2)) { goldStar.health -= (e.type === "triangle" ? 20 : 12); createExplosion(e.x, e.y, "orange"); if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); } }
      return e.health > 0;
    }

    if (e.type === "reflector") {
      // NEW BEHAVIOR: Shield nearby allies
      let nearestAlly = null, minDist = Infinity;
      enemies.forEach(ally => {
        if (ally !== e && ally.type !== "reflector") {
          const dist = Math.hypot(ally.x - e.x, ally.y - e.y);
          if (dist < minDist && dist < 150) { minDist = dist; nearestAlly = ally; }
        }
      });

      if (nearestAlly) {
        // Move toward ally to shield them
        const dx = nearestAlly.x - e.x, dy = nearestAlly.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed;
        e.y += (dy/dist) * e.speed;
        e.shieldActive = true;
      } else {
        // Move toward player as fallback
        const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx,dy)||1;
        e.x += (dx/dist) * e.speed * 0.5;
        e.y += (dy/dist) * e.speed * 0.5;
        e.shieldActive = false;
      }

      e.angle = (e.angle||0)+0.1;

      // Reflect nearby bullets
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
      if (goldStar.alive && distToGoldStar < 30) { goldStar.health -= 15; createExplosion(e.x, e.y, "magenta"); if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; createExplosion(goldStar.x, goldStar.y, "gold"); } }

      // If reflector died here, spawn health pickup and award score (and add reflect power-up)
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
    if (Math.hypot(l.x-player.x, l.y-player.y) < player.size/2) { if (!player.invulnerable) player.health -= l.damage; return false; }
    // When a lightning projectile would hit the goldStar, check for reflect ability
    if (goldStar.alive && Math.hypot(l.x-goldStar.x, l.y-goldStar.y) < goldStar.size/2) {
      if (goldStar.reflectAvailable) {
        // reflect this single projectile back
        lightning.push({x: l.x, y: l.y, dx: -l.dx, dy: -l.dy, size: l.size || 6, damage: l.damage || 15});
        goldStar.reflectAvailable = false;
        // visual cue
        createExplosion(goldStar.x, goldStar.y, "cyan");
        return false; // remove incoming projectile
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
            // If the attachment that died was a reflector, spawn a health pickup and reflect power-up
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

// Only gold star (not player) can pick up power-ups.
// Gold star retains its slow collect mechanic (collecting when minDist < 25),
// We removed the instant overlap pickup: goldStar must use the slow collecting mechanic.
function handlePowerUpCollections() {
  // Intentionally empty: immediate pickup removed.
  // Gold star collects via the slow collect mechanic implemented in updateGoldStar().
  return;
}

function drawPlayer() {
  ctx.fillStyle = (player.invulnerable && Math.floor(Date.now()/100)%2 === 0) ? "rgba(0,255,0,0.5)" : "lime";
  ctx.fillRect(player.x-player.size/2, player.y-player.size/2, player.size, player.size);
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
      if (a.type === "triangle") { ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.moveTo(a.x, a.y-(a.size||20)/2); ctx.lineTo(a.x-(a.size||20)/2, a.y+(a.size||20)/2); ctx.lineTo(a.x+(a.size||20)/2, a.y+(a.size||20)/2); ctx.closePath(); ctx.fill(); }
      else if (a.type === "reflector") { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.orbitAngle||0); ctx.fillStyle = "magenta"; ctx.fillRect(-(a.width||20)/2, -(a.height||10)/2, a.width||20, a.height||10); ctx.restore(); }
      else { ctx.fillStyle = "lime"; ctx.fillRect(a.x-(a.size||20)/2, a.y-(a.size||20)/2, a.size||20, a.size||20); }
    });
  });
}

function drawLightning() { ctx.fillStyle = "cyan"; lightning.forEach(l => ctx.fillRect(l.x-(l.size||6)/2, l.y-(l.size||6)/2, l.size||6, l.size||6)); }
function drawExplosions(){ explosions.forEach(ex => { ctx.fillStyle = ex.color; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2); ctx.fill(); }); }
function drawTunnels() { tunnels.forEach(t => { if (t.active) { ctx.fillStyle = "rgba(0,255,255,0.5)"; ctx.fillRect(t.x, t.y, t.width, t.height); }}); }

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.save(); ctx.translate(p.x, p.y);
    // All power-ups are circular now:
    if (p.type === "red-punch") {
      ctx.fillStyle = "red";
      ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      // small fist dot
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
      // reflector power-up visual
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
    const pulse = Math.sin(goldStar.collectTimer*0.3)*3;
    ctx.strokeStyle = "yellow"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(goldStar.x, goldStar.y, goldStar.size/2+10+pulse, 0, Math.PI*2); ctx.stroke();
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

  // small indicator for reflect availability
  if (goldStar.reflectAvailable) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(goldStar.x, goldStar.y, goldStar.size/2 + 14, 0, Math.PI*2); ctx.stroke();
  }
}

function drawRedPunchEffects() {
  redPunchEffects.forEach(e => {
    ctx.beginPath();
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 4 * (e.life / e.maxLife);
    ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
    ctx.stroke();
  });
}

function drawUI() {
  ctx.fillStyle = "gray"; ctx.fillRect(20, 20, 200, 20); ctx.fillStyle = "lime"; ctx.fillRect(20, 20, 200*Math.max(0, player.health/player.maxHealth), 20);
  ctx.strokeStyle = "black"; ctx.strokeRect(20, 20, 200, 20); ctx.fillStyle = "white"; ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60); ctx.fillText(`Wave: ${wave+1}`, 20, 90); ctx.fillText(`Lives: ${player.lives}`, 20, 120);
  if (goldStar.alive) {
    ctx.fillText(`Gold Star - Red Power Lv${goldStar.redPunchLevel} (${goldStar.redKills}/${Math.ceil((goldStar.redKills+1)/5)*5})`, 20, 150);
    ctx.fillText(`Gold Star - Blue Power Lv${goldStar.blueCannonnLevel} (${goldStar.blueKills}/${Math.ceil((goldStar.blueKills+1)/5)*5})`, 20, 180);
    ctx.fillText(`Reflect: ${goldStar.reflectAvailable ? "READY (1 hit)" : "none"}`, 20, 210);
  } else {
    ctx.fillStyle = "red";
    ctx.fillText(`Gold Star: DESTROYED - Respawning in ${Math.ceil((300-goldStar.respawnTimer)/60)}s`, 20, 150);
  }
  if (waveTransition) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(canvas.width/2-160, canvas.height/2-40, 320, 80);
    ctx.fillStyle = "white"; ctx.font = "24px Arial"; ctx.fillText("Wave Complete! Spawning next...", canvas.width/2-150, canvas.height/2);
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
    if (wave >= waves.length-1) { waveTransition = true; return; }
    waveTransition = true;
    setTimeout(() => { wave++; spawnWave(wave); waveTransition = false; }, WAVE_BREAK_MS);
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // Only gold star may pick up power-ups now (slow collect only)
  handlePowerUpCollections();

  updateGoldStar(); updateRedPunchEffects();

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
wave = 0; waveTransition = false; spawnWave(wave); gameLoop();
