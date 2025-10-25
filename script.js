 url=https://github.com/mybagman/Game/blob/2bbd9b33c8181267fb03d95c490e8cb355b8b1ff/script.js
// Paste this file next to index.html. It contains only JavaScript (no HTML tags).

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let keys = {}, bullets = [], enemies = [], lightning = [], explosions = [], diamonds = [], powerUps = [];
let score = 0, wave = 0, minionsToAdd = [], tunnels = [];
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
  collecting: false, collectTimer: 0, targetPowerUp: null, respawnTimer: 0
};

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function respawnGoldStar() {
  goldStar.x = canvas.width/4; goldStar.y = canvas.height/2; goldStar.health = goldStar.maxHealth;
  goldStar.alive = true; goldStar.redPunchLevel = 0; goldStar.blueCannonnLevel = 0;
  goldStar.redKills = 0; goldStar.blueKills = 0; goldStar.collecting = false;
  goldStar.collectTimer = 0; goldStar.targetPowerUp = null; goldStar.respawnTimer = 0;
}

// NOTE: There are two Gold Star update functions in this file: updateGoldStarAI() and updateGoldStar().
// The game loop must call the one that matches the rest of the game's data structures (powerUps, bullets, etc).
// The original bug: gameLoop was calling updateGoldStarAI() which expects different properties (e.g. p.active, b.vx/b.vy, e.alive).
// Those properties don't exist on the objects produced by the rest of the code, so the AI never targeted powerups, detected collisions, or respawned correctly.
// The fix is to call updateGoldStar() (which uses the same shapes: powerUps with lifetime, bullets with dx/dy, etc).
// Below is the rest of the file unchanged except the gameLoop now calls updateGoldStar().

function updateGoldStarAI() {
    if (!goldStar.alive) return;

    const MOVE_SPEED = 5;
    const DANGER_RADIUS = 200;      // detect threats before too close
    const SAFE_DIST = 120;           // minimal safe distance from enemies/bullets
    const POWERUP_RADIUS = 400;
    const SNAP_DISTANCE = 25;
    const FOLLOW_DIST = 150;
    const PREDICT_TIME = 20;

    let vx = 0, vy = 0;
    let threatDetected = false;

    // === STEP 1: Avoid enemies ===
    for (let e of enemies) {
        if (!e.alive) continue;
        const dx = goldStar.x - e.x;
        const dy = goldStar.y - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < DANGER_RADIUS && dist > 0) {
            const force = (DANGER_RADIUS - dist) / DANGER_RADIUS * 10;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
            if (dist < SAFE_DIST) threatDetected = true;
        }
    }

    // === STEP 1b: Avoid enemy bullets (predictive) ===
    for (let b of bullets) {
        if (b.owner !== "enemy") continue;
        const futureX = b.x + b.vx * PREDICT_TIME;
        const futureY = b.y + b.vy * PREDICT_TIME;
        const dx = goldStar.x - futureX;
        const dy = goldStar.y - futureY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < DANGER_RADIUS && dist > 0) {
            const force = (DANGER_RADIUS - dist) / DANGER_RADIUS * 12;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
            if (dist < SAFE_DIST) threatDetected = true;
        }
    }

    // === STEP 2: Move toward nearest safe power-up if no threat ===
    let nearestPowerUp = null;
    if (!threatDetected) {
        let nearestDist = Infinity;

        for (let p of powerUps) {
            if (!p.active) continue;
            const dx = p.x - goldStar.x;
            const dy = p.y - goldStar.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // safety check around power-up
            let safe = true;
            for (let e of enemies) {
                if (!e.alive) continue;
                const ex = e.x - p.x;
                const ey = e.y - p.y;
                if (Math.sqrt(ex*ex + ey*ey) < SAFE_DIST) safe = false;
            }
            for (let b of bullets) {
                if (b.owner !== "enemy") continue;
                const futureX = b.x + b.vx * PREDICT_TIME;
                const futureY = b.y + b.vy * PREDICT_TIME;
                const bx = futureX - p.x;
                const by = futureY - p.y;
                if (Math.sqrt(bx*bx + by*by) < SAFE_DIST) safe = false;
            }

            if (safe && dist < nearestDist && dist < POWERUP_RADIUS) {
                nearestDist = dist;
                nearestPowerUp = p;
            }
        }

        if (nearestPowerUp) {
            const dx = nearestPowerUp.x - goldStar.x;
            const dy = nearestPowerUp.y - goldStar.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < SNAP_DISTANCE) {
                goldStar.x = nearestPowerUp.x;
                goldStar.y = nearestPowerUp.y;
                if (typeof nearestPowerUp.collect === "function") nearestPowerUp.collect();
                else nearestPowerUp.active = false;
            } else if (dist > 0) {
                vx += (dx / dist) * 3;
                vy += (dy / dist) * 3;
            }
        }
    }

    // === STEP 3: Follow player if safe and no nearby power-up ===
    if (!threatDetected && nearestPowerUp == null) {
        const dx = player.x - goldStar.x;
        const dy = player.y - goldStar.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > FOLLOW_DIST && dist > 0) {
            vx += (dx / dist) * 2;
            vy += (dy / dist) * 2;
        }
    }

    // === STEP 4: Apply movement ===
    const len = Math.sqrt(vx*vx + vy*vy);
    if (len > 0) {
        goldStar.x += (vx / len) * MOVE_SPEED;
        goldStar.y += (vy / len) * MOVE_SPEED;
    }

    // === STEP 5: Clamp inside canvas ===
    goldStar.x = Math.max(goldStar.size/2, Math.min(canvas.width - goldStar.size/2, goldStar.x));
    goldStar.y = Math.max(goldStar.size/2, Math.min(canvas.height - goldStar.size/2, goldStar.y));
}

function respawnPlayer() {
  player.health = player.maxHealth; player.x = canvas.width/2; player.y = canvas.height/2;
  player.invulnerable = true; player.invulnerableTimer = 120;
}

function spawnRedSquares(c, fromBoss = false) {
  for (let i = 0; i < c; i++) enemies.push({x: Math.random()*canvas.width, y: Math.random()*(canvas.height/2), size: 30, speed: 1.8, health: 30, type: "red-square", shootTimer: 0, fromBoss});
}
function spawnTriangles(c, fromBoss = false) {
  for (let i = 0; i < c; i++) enemies.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: 30, speed: 1.5, health: 40, type: "triangle", shootTimer: 0, fromBoss});
}
function spawnReflectors(c) {
  for (let i = 0; i < c; i++) enemies.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, width: 40, height: 20, angle: 0, speed: 0.8, health: 200, type: "reflector"});
}
function spawnBoss() { enemies.push({x: canvas.width/2, y: 100, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0}); }
function spawnMiniBoss() { enemies.push({x: Math.random()*canvas.width, y: 120+Math.random()*60, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0}); }
function spawnDiamondEnemy() { diamonds.push({x: canvas.width/2, y: canvas.height/3, size: 40, health: 200, type: "diamond", attachments: [], canReflect: false, angle: Math.random()*Math.PI*2}); }
function spawnPowerUp(x, y, type) { powerUps.push({x, y, type, size: 20, lifetime: 600}); }
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
    bullets.push({x: player.x, y: player.y, dx: (dirX/mag)*10, dy: (dirY/mag)*10, size: 6});
    shootCooldown = 10;
  }
}

function updateBullets() { bullets = bullets.filter(b => { b.x += b.dx; b.y += b.dy; return b.x >= -20 && b.x <= canvas.width+20 && b.y >= -20 && b.y <= canvas.height+20; }); }
function updatePowerUps() { powerUps = powerUps.filter(p => { p.lifetime--; return p.lifetime > 0; }); }
function updateTunnels() { for (let i = tunnels.length-1; i >= 0; i--) { const t = tunnels[i]; if (!t.active) continue; t.x -= t.speed; if (t.x+t.width < 0) tunnels.splice(i,1); }}
function updateExplosions(){ explosions = explosions.filter(ex => { ex.x += ex.dx; ex.y += ex.dy; ex.life--; return ex.life>0; }); }

function updateGoldStar() {
  if (!goldStar.alive) { goldStar.respawnTimer++; if (goldStar.respawnTimer >= 300) respawnGoldStar(); return; }
  if (goldStar.collecting) {
    goldStar.collectTimer++;
    if (goldStar.collectTimer >= 60) {
      if (goldStar.targetPowerUp) {
        const pu = goldStar.targetPowerUp;
        if (pu.type === "red-punch") { goldStar.redKills++; if (goldStar.redKills % 5 === 0 && goldStar.redPunchLevel < 5) goldStar.redPunchLevel++; }
        else if (pu.type === "blue-cannon") { goldStar.blueKills++; if (goldStar.blueKills % 5 === 0 && goldStar.blueCannonnLevel < 5) goldStar.blueCannonnLevel++; }
        else if (pu.type === "health") { goldStar.health = Math.min(goldStar.maxHealth, goldStar.health+30); player.health = Math.min(player.maxHealth, player.health+30); }
        powerUps = powerUps.filter(p => p !== pu);
      }
      goldStar.collecting = false; goldStar.collectTimer = 0; goldStar.targetPowerUp = null;
    }
    return;
  }
  let nearest = null, minDist = Infinity;
  for (const pu of powerUps) { const dist = Math.hypot(pu.x-goldStar.x, pu.y-goldStar.y); if (dist < minDist) { minDist = dist; nearest = pu; }}
  if (nearest && minDist < 300) {
    const dx = nearest.x-goldStar.x, dy = nearest.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
    goldStar.x += (dx/mag)*goldStar.speed; goldStar.y += (dy/mag)*goldStar.speed;
    if (minDist < 25) { goldStar.collecting = true; goldStar.targetPowerUp = nearest; goldStar.collectTimer = 0; }
  } else {
    const dx = player.x-goldStar.x, dy = player.y-goldStar.y, dist = Math.hypot(dx,dy);
    if (dist > 100) { const mag = dist||1; goldStar.x += (dx/mag)*goldStar.speed*0.7; goldStar.y += (dy/mag)*goldStar.speed*0.7; }
  }
  if (goldStar.redPunchLevel > 0) {
    goldStar.punchCooldown++; if (goldStar.punchCooldown > 40) { goldStar.punchCooldown = 0;
      const range = goldStar.redPunchLevel === 1 ? 80 : 200, punches = Math.min(goldStar.redPunchLevel, 5);
      enemies.filter(e => Math.hypot(e.x-goldStar.x, e.y-goldStar.y) < range).slice(0, punches).forEach(e => { e.health -= 25; createExplosion(e.x, e.y, "orange"); });
    }
  }
  if (goldStar.blueCannonnLevel > 0) {
    goldStar.cannonCooldown++; if (goldStar.cannonCooldown > 50) { goldStar.cannonCooldown = 0;
      if (enemies.length > 0) {
        const target = enemies[0], dx = target.x-goldStar.x, dy = target.y-goldStar.y, mag = Math.hypot(dx,dy)||1;
        if (goldStar.blueCannonnLevel === 1) bullets.push({x: goldStar.x, y: goldStar.y, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8});
        else if (goldStar.blueCannonnLevel === 2) { bullets.push({x: goldStar.x, y: goldStar.y-5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8}); bullets.push({x: goldStar.x, y: goldStar.y+5, dx: (dx/mag)*8, dy: (dy/mag)*8, size: 8}); }
        else if (goldStar.blueCannonnLevel === 3) for (let i = -1; i <= 1; i++) { const angle = Math.atan2(dy,dx)+i*0.3; bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8}); }
        else if (goldStar.blueCannonnLevel === 4) for (let i = -2; i <= 2; i++) { const angle = Math.atan2(dy,dx)+i*0.25; bullets.push({x: goldStar.x, y: goldStar.y, dx: Math.cos(angle)*8, dy: Math.sin(angle)*8, size: 8}); }
        else if (goldStar.blueCannonnLevel === 5) for (let i = 0; i < 5; i++) bullets.push({x: goldStar.x+(dx/mag)*i*20, y: goldStar.y+(dy/mag)*i*20, dx: (dx/mag)*12, dy: (dy/mag)*12, size: 10});
      }
    }
  }
}

function updateBoss(boss) {
  boss.angle = boss.angle||0; boss.angle += 0.01; boss.x = canvas.width/2+Math.cos(boss.angle)*150; boss.y = 80+Math.sin(boss.angle)*50;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++; if (boss.spawnTimer > 200) { boss.spawnTimer = 0; minionsToAdd.push({x: boss.x+(Math.random()-0.5)*100, y: boss.y+(Math.random()-0.5)*100, size: 25, speed: 2, health: 30, type: "red-square"}); }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++; if (boss.shootTimer > 150) { boss.shootTimer = 0; [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*6, dy: d.y*6, size: 8, damage: 20})); }
}

function updateMiniBoss(boss) {
  boss.angle = boss.angle||Math.random()*Math.PI*2; boss.angle += 0.02; boss.x = canvas.width/2+Math.cos(boss.angle)*100; boss.y = 80+Math.sin(boss.angle)*30;
  boss.spawnTimer = boss.spawnTimer||0; boss.spawnTimer++; if (boss.spawnTimer > 300) { boss.spawnTimer = 0; minionsToAdd.push({x: boss.x+(Math.random()-0.5)*80, y: boss.y+(Math.random()-0.5)*80, size: 25, speed: 2, health: 30, type: "red-square"}); }
  boss.shootTimer = boss.shootTimer||0; boss.shootTimer++; if (boss.shootTimer > 180) { boss.shootTimer = 0; [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}].forEach(d => lightning.push({x: boss.x, y: boss.y, dx: d.x*5, dy: d.y*5, size: 6, damage: 15})); }
}

function updateDiamond(d) {
  const roamSpeed = 1.6; let nearest = null, nd = Infinity;
  for (const e of enemies) { if (!e || e.type === "diamond" || ["boss","mini-boss"].includes(e.type)) continue; const dist = Math.hypot(e.x-d.x, e.y-d.y); if (dist < nd) { nd = dist; nearest = e; } }
  if (nearest && nd < 800) { const dx = nearest.x-d.x, dy = nearest.y-d.y, mag = Math.hypot(dx,dy)||1; d.x += (dx/mag)*Math.min(roamSpeed, mag); d.y += (dy/mag)*Math.min(roamSpeed, mag); }
  else { d.angle += 0.01; const radius = Math.min(300, Math.max(120, (canvas.width+canvas.height)/8)); d.x = canvas.width/2+Math.cos(d.angle)*radius; d.y = canvas.height/2+Math.sin(d.angle)*radius; }
  
  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i]; if (!e || e === d || e.attachedTo || e.type === "boss" || e.type === "mini-boss") continue;
    const dx = d.x-e.x, dy = d.y-e.y, dist = Math.hypot(dx,dy);
    if (dist < 260 && d.attachments.length < 15) { const pull = 0.04+(1-Math.min(dist/260,1))*0.06; e.x += dx*pull; e.y += dy*pull;
      if (dist < 28) { enemies.splice(i,1); e.attachedTo = d; e.orbitAngle = Math.random()*Math.PI*2; if (e.type === "triangle") e.fireRateBoost = true; if (e.type === "red-square") e.spawnMini = true; d.attachments.push(e); }
    }
  }

  for (let i = 0; i < d.attachments.length; i++) {
    const a = d.attachments[i]; a.orbitAngle = (a.orbitAngle||0)+0.06+(a.type === "reflector" ? 0.02 : 0); const orbitRadius = d.size+28+(a.type === "reflector" ? 14 : 0); a.x = d.x+Math.cos(a.orbitAngle)*orbitRadius; a.y = d.y+Math.sin(a.orbitAngle)*orbitRadius;
    if (a.type === "triangle" || a.type === "red-square") { a.shootTimer = (a.shootTimer||0)+1; const fireRate = a.type === "triangle" ? (a.fireRateBoost ? 40 : 100) : 120; if (a.shootTimer > fireRate) { a.shootTimer = 0; if (a.type === "triangle") lightning.push({x: a.x, y: a.y, dx: (player.x-a.x)/Math.hypot(player.x-a.x,player.y-a.y)*5, dy: (player.y-a.y)/Math.hypot(player.x-a.x,player.y-a.y)*5, size:6, damage:15}); } }
    if (a.type === "reflector") for (let bi = bullets.length-1; bi >= 0; bi--) { const b = bullets[bi], distB = Math.hypot(b.x-a.x, b.y-a.y); if (distB < 40) { lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15}); bullets.splice(bi,1); } }
  }

  d.shootTimer = (d.shootTimer||0)+1; d.pulse = Math.sin(d.shootTimer*0.1)*4;
  if (d.canReflect) for (let bi = bullets.length-1; bi >= 0; bi--) { const b = bullets[bi], dist = Math.hypot(b.x-d.x, b.y-d.y); if (dist < 90) { lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15}); bullets.splice(bi,1); } }
  if (d.attachments.some(a=>a.spawnMini) && d.shootTimer % 200 === 0) minionsToAdd.push({x: d.x+(Math.random()-0.5)*80, y: d.y+(Math.random()-0.5)*80, size: 25, speed: 2, health: 30, type: "red-square"});
  if (d.attachments.length >= 3 && d.shootTimer % 180 === 0) [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dv => lightning.push({x: d.x, y: d.y, dx: dv.x*6, dy: dv.y*6, size: 8, damage: 20}));
  const distToPlayer = Math.hypot(d.x-player.x, d.y-player.y); if (distToPlayer < (d.size/2+player.size/2)) { if (!player.invulnerable) player.health -= 30; createExplosion(d.x, d.y, "white"); d.health -= 999; }
  const distToGoldStar = Math.hypot(d.x-goldStar.x, d.y-goldStar.y); if (goldStar.alive && distToGoldStar < (d.size/2+goldStar.size/2)) { goldStar.health -= 25; createExplosion(d.x, d.y, "white"); }
}

function updateEnemies() {
  if (player.invulnerable) { player.invulnerableTimer--; if (player.invulnerableTimer <= 0) player.invulnerable = false; }
  for (let di = diamonds.length-1; di >= 0; di--) { const d = diamonds[di]; updateDiamond(d); if (d.health <= 0) { createExplosion(d.x, d.y, "white"); d.attachments.forEach(a => enemies.push({x: a.x, y: a.y, size: a.size||20, speed: a.speed||1.5, health: a.health||30, type: a.type})); diamonds.splice(di,1); score += 100; } }
  enemies = enemies.filter(e => {
    if (!e) return false; if (e.type === "boss") { updateBoss(e); return true; } if (e.type === "mini-boss") { updateMiniBoss(e); return true; }
    if (e.type === "triangle" || e.type === "red-square") {
      const dx = player.x-e.x, dy = player.y-e.y, dist = Math.hypot(dx,dy)||1; e.x += (dx/dist)*e.speed; e.y += (dy/dist)*e.speed;
      if (e.type === "triangle") { e.shootTimer = (e.shootTimer||0)+1; if (e.shootTimer > 100) { e.shootTimer = 0; lightning.push({x: e.x, y: e.y, dx: (dx/dist)*5, dy: (dy/dist)*5, size:6, damage:15}); } }
      const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y); if (distToPlayer < (e.size/2+player.size/2)) { if (!player.invulnerable) player.health -= (e.type === "triangle" ? 25 : 15); createExplosion(e.x, e.y, "red"); }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y); if (goldStar.alive && distToGoldStar < (e.size/2+goldStar.size/2)) { goldStar.health -= (e.type === "triangle" ? 20 : 12); createExplosion(e.x, e.y, "yellow"); if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; } }
      return true;
    }
    if (e.type === "reflector") {
      if (bullets.length > 0) { let closest = bullets.reduce((p,c) => (Math.hypot(c.x-e.x,c.y-e.y) < Math.hypot(p.x-e.x,p.y-e.y) ? c : p)); const dx = closest.x-e.x, dy = closest.y-e.y, dist = Math.hypot(dx,dy); if (dist < 120) { e.x += (dx/dist)*e.speed; e.y += (dy/dist)*e.speed; } }
      e.angle = (e.angle||0)+0.1; const distToPlayer = Math.hypot(e.x-player.x, e.y-player.y); if (distToPlayer < 30) { if (!player.invulnerable) player.health -= 15; createExplosion(e.x, e.y, "magenta"); }
      const distToGoldStar = Math.hypot(e.x-goldStar.x, e.y-goldStar.y); if (goldStar.alive && distToGoldStar < 30) { goldStar.health -= 15; createExplosion(e.x, e.y, "magenta"); if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; } }
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
    if (goldStar.alive && Math.hypot(l.x-goldStar.x, l.y-goldStar.y) < goldStar.size/2) { goldStar.health -= l.damage; if (goldStar.health <= 0) { goldStar.alive = false; goldStar.respawnTimer = 0; } return false; }
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
        if (dist < Math.max(e.width,e.height)) { lightning.push({x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15}); bullets.splice(bi,1); e.health -= 5;
          if (e.health <= 0) { createExplosion(e.x, e.y, "purple"); enemies.splice(ei,1); if (!e.fromBoss) { score += 20; spawnPowerUp(e.x, e.y, "health"); }} break;
        }
      } else {
        if (Math.hypot(b.x-e.x, b.y-e.y) < (e.size||20)/2) { e.health -= 10; bullets.splice(bi,1);
          if (e.health <= 0) { createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : e.type === "boss" ? "yellow" : e.type === "mini-boss" ? "orange" : "red"); enemies.splice(ei,1);
            if (!e.fromBoss) { if (e.type === "boss") score += 100; else if (e.type === "mini-boss") score += 50; else if (e.type === "triangle") { score += 10; spawnPowerUp(e.x, e.y, "blue-cannon"); } else score += 5; }
          } break;
        }
      }
    }
    for (let di = diamonds.length-1; di >= 0; di--) {
      const d = diamonds[di];
      for (let ai = d.attachments.length-1; ai >= 0; ai--) {
        const a = d.attachments[ai], radius = (a.size||20)/2||10;
        if (Math.hypot(b.x-a.x, b.y-a.y) < radius) { a.health = (a.health||30)-10; bullets.splice(bi,1);
          if (a.health <= 0) { createExplosion(a.x, a.y, "white"); d.attachments.splice(ai,1); score += 5; if (!d.attachments.some(at => at.type === "reflector")) d.canReflect = false; } ai = -1;
        }
      }
    }
    if (bi >= 0 && bi < bullets.length) { const b2 = bullets[bi]; for (let di = diamonds.length-1; di >= 0; di--) { const d = diamonds[di]; if (Math.hypot(b2.x-d.x, b2.y-d.y) < d.size/2) { d.health -= 10; bullets.splice(bi,1); if (d.health <= 0) { createExplosion(d.x, d.y, "white"); d.attachments.forEach(a => enemies.push({x: a.x, y: a.y, size: a.size||20, speed: a.speed||1.5, health: a.health||30, type: a.type})); diamonds.splice(di,1); score += 100; } di = -1; } } }
  }
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
    else if (e.type === "reflector") { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle||0); ctx.fillStyle = "purple"; ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height); ctx.restore(); }
  });
}

function drawDiamonds() {
  diamonds.forEach(d => {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle||0); ctx.strokeStyle = d.canReflect ? "cyan" : "white"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -d.size/2-d.pulse); ctx.lineTo(d.size/2+d.pulse, 0); ctx.lineTo(0, d.size/2+d.pulse); ctx.lineTo(-d.size/2-d.pulse, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
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
    if (p.type === "red-punch") { ctx.fillStyle = "red"; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); }
    else if (p.type === "blue-cannon") { ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.moveTo(0, -p.size/2); ctx.lineTo(-p.size/2, p.size/2); ctx.lineTo(p.size/2, p.size/2); ctx.closePath(); ctx.fill(); }
    else if (p.type === "health") { ctx.fillStyle = "magenta"; ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  });
}

function drawGoldStar() {
  if (!goldStar.alive) return;
  if (goldStar.collecting) { const pulse = Math.sin(goldStar.collectTimer*0.3)*3; ctx.strokeStyle = "yellow"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(goldStar.x, goldStar.y, goldStar.size/2+10, 0, Math.PI*2); ctx.stroke(); }
  ctx.save(); ctx.translate(goldStar.x, goldStar.y); ctx.fillStyle = "gold"; ctx.beginPath();
  for (let i = 0; i < 5; i++) { const angle = (i*4*Math.PI)/5-Math.PI/2, radius = i%2===0 ? goldStar.size/2 : goldStar.size/4, x = Math.cos(angle)*radius, y = Math.sin(angle)*radius; if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  const barWidth = 50; ctx.fillStyle = "gray"; ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth, 5);
  ctx.fillStyle = "gold"; ctx.fillRect(goldStar.x-barWidth/2, goldStar.y-goldStar.size-10, barWidth*(goldStar.health/goldStar.maxHealth), 5);
}

function drawUI() {
  ctx.fillStyle = "gray"; ctx.fillRect(20, 20, 200, 20); ctx.fillStyle = "lime"; ctx.fillRect(20, 20, 200*Math.max(0, player.health/player.maxHealth), 20);
  ctx.strokeStyle = "black"; ctx.strokeRect(20, 20, 200, 20); ctx.fillStyle = "white"; ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60); ctx.fillText(`Wave: ${wave+1}`, 20, 90); ctx.fillText(`Lives: ${player.lives}`, 20, 120);
  if (goldStar.alive) {
    ctx.fillText(`Gold Star - Red Punch Lv${goldStar.redPunchLevel} (${goldStar.redKills}/${Math.ceil((goldStar.redKills+1)/5)*5})`, 20, 150);
    ctx.fillText(`Gold Star - Blue Cannon Lv${goldStar.blueCannonnLevel} (${goldStar.blueKills}/${Math.ceil((goldStar.blueKills+1)/5)*5})`, 20, 180);
  } else { ctx.fillStyle = "red"; ctx.fillText(`Gold Star: DESTROYED - Respawning in ${Math.ceil((300-goldStar.respawnTimer)/60)}s`, 20, 150); }
  if (waveTransition) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(canvas.width/2-160, canvas.height/2-40, 320, 80); ctx.fillStyle = "white"; ctx.font = "24px Arial"; ctx.fillText("Wave Complete!", canvas.width/2-120, canvas.height/2); }
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
  updateExplosions(); updateTunnels(); updatePowerUps(); updateGoldStar(); // <<--- FIX: call updateGoldStar() (matches game objects)

  drawPlayer(); drawBullets(); drawEnemies(); drawDiamonds(); drawLightning(); drawExplosions();
  drawTunnels(); drawPowerUps(); drawGoldStar(); drawUI(); tryAdvanceWave();

  if (player.health <= 0) {
    player.lives--;
    if (player.lives > 0) { respawnPlayer(); requestAnimationFrame(gameLoop); }
    else { ctx.fillStyle = "white"; ctx.font = "50px Arial"; ctx.fillText("GAME OVER", canvas.width/2-150, canvas.height/2); ctx.font = "30px Arial"; ctx.fillText(`Final Score: ${score}`, canvas.width/2-120, canvas.height/2+40); }
  } else requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
wave = 0; waveTransition = false; spawnWave(wave); gameLoop();
