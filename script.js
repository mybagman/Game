// Full game script with Diamond enemy integration (complete)

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ======== Setup ========
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======== Game Variables ========
let keys = {};
let bullets = [];        // player bullets
let enemies = [];        // normal enemies (red-square, triangle, reflector, boss, mini-boss)
let lightning = [];      // enemy projectiles
let explosions = [];
let diamonds = [];       // active diamond enemies (rare)
let score = 0;
let wave = 0;            // waves numbered 0..10 per your list (displayed as wave+1)
let minionsToAdd = [];
let tunnels = [];

// player
let lastDir = { x: 1, y: 0 };
let shootCooldown = 0;
let waveTransition = false;
let waveTransitionTimer = 0;
const WAVE_BREAK_MS = 2500; // 2.5 seconds between waves

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  health: 100,
  maxHealth: 100
};

// ======== Controls ========
document.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// ======== Shoot (player uses arrow keys for shooting) ========
function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;

  let dirX = 0, dirY = 0;
  if (keys["arrowup"]) dirY = -1;
  if (keys["arrowdown"]) dirY = 1;
  if (keys["arrowleft"]) dirX = -1;
  if (keys["arrowright"]) dirX = 1;

  if ((dirX !== 0 || dirY !== 0) && shootCooldown === 0) {
    const mag = Math.hypot(dirX, dirY) || 1;
    bullets.push({
      x: player.x,
      y: player.y,
      dx: (dirX / mag) * 10,
      dy: (dirY / mag) * 10,
      size: 6
    });
    shootCooldown = 10;
  }
}

function updateBullets() {
  bullets = bullets.filter(b => {
    b.x += b.dx;
    b.y += b.dy;
    return b.x >= -20 && b.x <= canvas.width + 20 && b.y >= -20 && b.y <= canvas.height + 20;
  });
}

// ======== Spawning helpers ========
function spawnRedSquares(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height / 2),
      size: 30,
      speed: 1.8,
      health: 30,
      type: "red-square",
      shootTimer: 0
    });
  }
}
function spawnTriangles(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 30,
      speed: 1.5,
      health: 40,
      type: "triangle",
      shootTimer: 0
    });
  }
}
function spawnReflectors(count) {
  for (let i = 0; i < count; i++) {
    spawnReflector(Math.random() * canvas.width, Math.random() * canvas.height);
  }
}
function spawnBoss() {
  enemies.push({ x: canvas.width / 2, y: 100, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0 });
}
function spawnMiniBoss() {
  enemies.push({ x: Math.random() * canvas.width, y: 120 + Math.random() * 60, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0 });
}
function spawnReflector(x, y) {
  enemies.push({ x, y, width: 40, height: 20, angle: 0, speed: 0.8, health: 200, type: "reflector" });
}

// ======== Diamond spawning (enemy) ========
function spawnDiamondEnemy(x = canvas.width / 2, y = canvas.height / 3) {
  const diamond = {
    x, y,
    size: 40,
    health: 200,
    type: "diamond",
    attachments: [], // will store attached enemy objects (removed from enemies[] when attached)
    canReflect: false,
    angle: Math.random() * Math.PI * 2,
    shootTimer: 0,
    pulse: 0,
    roamTarget: null // for seeking enemies
  };

  // create diamond as separate entity
  diamonds.push(diamond);
}

// Helper: attract enemies to diamond (pull into diamond to attach)
function attractEnemiesToDiamond(diamond, allEnemies) {
  for (let i = allEnemies.length - 1; i >= 0; i--) {
    const e = allEnemies[i];
    if (!e || e === diamond || e.attachedTo || e.type === "boss" || e.type === "mini-boss") continue;
    const dx = diamond.x - e.x;
    const dy = diamond.y - e.y;
    const dist = Math.hypot(dx, dy);
    // stronger attraction than earlier default
    if (dist < 260 && diamond.attachments.length < 15) {
      // pull faster if closer
      const pull = 0.04 + (1 - Math.min(dist / 260, 1)) * 0.06;
      e.x += dx * pull;
      e.y += dy * pull;
      // attach if very close
      if (dist < 28) {
        // remove from enemies and attach
        allEnemies.splice(i, 1);
        attachToDiamond(diamond, e);
      }
    }
  }
}

function attachToDiamond(diamond, enemy) {
  enemy.attachedTo = diamond;
  // set orbit angle for attachment visuals and positioning
  enemy.orbitAngle = Math.random() * Math.PI * 2;
  // small differentiation for reflectors
  if (enemy.type === "triangle") enemy.fireRateBoost = true;
  if (enemy.type === "red-square") enemy.spawnMini = true;
  if (enemy.type === "reflector") diamond.canReflect = true;
  // reduce their movement since they're attached
  enemy.speed = 0;
  diamond.attachments.push(enemy);
}

// Diamond death: release attachments as smaller minions (or explode)
function diamondDeath(d) {
  createExplosion(d.x, d.y, "white");
  // release attachments as small enemies
  d.attachments.forEach(a => {
    // convert attachments to smaller, weaker enemies
    enemies.push({
      x: a.x + (Math.random() - 0.5) * 10,
      y: a.y + (Math.random() - 0.5) * 10,
      size: a.size ? Math.max(12, a.size * 0.6) : 15,
      speed: 2,
      health: Math.max(10, (a.health || 20) * 0.5),
      type: a.type === "reflector" ? "reflector" : (a.type === "triangle" ? "triangle" : "red-square"),
      shootTimer: 0
    });
  });
}

// ======== Tunnel ========
function spawnTunnel() {
  const wallHeight = canvas.height / 3;
  const wallWidth = 600;
  const topWall = { x: canvas.width, y: 0, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };
  const bottomWall = { x: canvas.width, y: canvas.height - wallHeight, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };
  tunnels.push(topWall, bottomWall);
  return { x: canvas.width, y: wallHeight, width: wallWidth, gapY: wallHeight };
}
function updateTunnels() {
  for (let i = tunnels.length - 1; i >= 0; i--) {
    const t = tunnels[i];
    if (!t.active) continue;
    t.x -= t.speed;
    ctx.fillStyle = "rgba(0,255,255,0.5)";
    ctx.fillRect(t.x, t.y, t.width, t.height);
    if (t.x + t.width < 0) tunnels.splice(i, 1);
  }
}

// ======== Boss & Mini updates (unchanged) ========
function updateBoss(boss) {
  boss.angle = boss.angle || 0;
  boss.angle += 0.01;
  boss.x = canvas.width / 2 + Math.cos(boss.angle) * 150;
  boss.y = 80 + Math.sin(boss.angle) * 50;

  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if (boss.spawnTimer > 200) {
    boss.spawnTimer = 0;
    minionsToAdd.push({
      x: boss.x + (Math.random() - 0.5) * 100,
      y: boss.y + (Math.random() - 0.5) * 100,
      size: 30,
      speed: 2,
      health: 30,
      type: "red-square",
      shootTimer: 0
    });
  }

  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 150) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => {
      lightning.push({ x: boss.x, y: boss.y, dx: d.x*5, dy: d.y*5, size: 6, damage: 20 });
    });
  }
}
function updateMiniBoss(boss) {
  boss.angle = boss.angle || Math.random()*Math.PI*2;
  boss.angle += 0.02;
  boss.x = canvas.width / 2 + Math.cos(boss.angle)*100;
  boss.y = 80 + Math.sin(boss.angle)*30;

  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if (boss.spawnTimer > 300) {
    boss.spawnTimer = 0;
    minionsToAdd.push({ x: boss.x + (Math.random()-0.5)*80, y: boss.y + (Math.random()-0.5)*80, size: 25, speed:2, health:30, type: "red-square", shootTimer:0 });
  }

  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    [
      { x: 0, y: -1 },{ x: 0, y: 1 },{ x: -1, y: 0 },{ x: 1, y: 0 },
      { x: 1, y: 1 },{ x: 1, y: -1 },{ x: -1, y: 1 },{ x: -1, y: -1 }
    ].forEach(d => {
      const mag = Math.hypot(d.x, d.y)||1;
      lightning.push({ x: boss.x, y: boss.y, dx: d.x/mag*5, dy: d.y/mag*5, size:6, damage:10 });
    });
  }
}

// ======== Explosions ========
function createExplosion(x,y,color="red"){
  for (let i=0;i<20;i++){
    explosions.push({ x, y, dx:(Math.random()-0.5)*6, dy:(Math.random()-0.5)*6, radius:Math.random()*4+2, color, life:30 });
  }
}
function updateExplosions(){
  explosions = explosions.filter(ex => {
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI*2);
    ctx.fill();
    ex.x += ex.dx;
    ex.y += ex.dy;
    ex.life--;
    return ex.life>0;
  });
}

// ======== Enemy update loop (includes diamond behavior) ========
function updateEnemies() {
  // Update diamonds first (they are separate in diamonds[])
  for (let di = diamonds.length-1; di >= 0; di--) {
    const d = diamonds[di];
    updateDiamond(d);
    if (d.health <= 0) {
      // diamond death -> release attachments as smaller enemies
      diamondDeath(d);
      diamonds.splice(di,1);
      score += 200;
    }
  }

  // Update other enemies
  enemies = enemies.filter(e => {
    if (!e) return false;
    if (e.type === "boss") { updateBoss(e); return true; }
    if (e.type === "mini-boss") { updateMiniBoss(e); return true; }
    if (e.type === "triangle" || e.type === "red-square" || e.type === "normal") {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;

      if (e.type === "triangle") {
        e.shootTimer = (e.shootTimer || 0) + 1;
        if (e.shootTimer > 100) {
          e.shootTimer = 0;
          lightning.push({ x: e.x, y: e.y, dx: (dx/dist)*5, dy: (dy/dist)*5, size:6, damage:15 });
        }
      }

      // collision with player
      const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
      if (distToPlayer < (e.size/2 + player.size/2)) {
        player.health -= (e.type === "triangle" ? 25 : 15);
        createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : "red");
        return false;
      }
      return true;
    }

    if (e.type === "reflector") {
      // reflectors chase bullets if nearby
      if (bullets.length > 0) {
        let closest = bullets.reduce((p,c) => (Math.hypot(c.x-e.x,c.y-e.y) < Math.hypot(p.x-e.x,p.y-e.y) ? c : p));
        const dx = closest.x - e.x;
        const dy = closest.y - e.y;
        const dist = Math.hypot(dx,dy) || 1;
        if (dist < 300) {
          const move = Math.min(2, dist/20);
          e.x += (dx/dist) * move;
          e.y += (dy/dist) * move;
        }
      }
      e.angle = (e.angle || 0) + 0.1;
      const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
      if (distToPlayer < (e.size/2 + player.size/2 || 20)) {
        player.health -= 15;
        createExplosion(e.x, e.y, "magenta");
        return false;
      }
      return true;
    }

    // default keep
    return true;
  });

  // Add minions queued by bosses / diamond
  if (minionsToAdd.length > 0) {
    enemies.push(...minionsToAdd);
    minionsToAdd = [];
  }
}

// ======== Diamond update: roam, attract, attach, use attachments ========
function updateDiamond(d) {
  // roam: if there are enemies (not attachments), seek nearest enemy; otherwise circle center
  const roamSpeed = 1.6;
  // find nearest non-attached enemy to pursue
  let nearest = null;
  let nd = Infinity;
  for (const e of enemies) {
    if (!e || e.type === "diamond") continue;
    // only seek smaller units (not bosses)
    if (["boss","mini-boss"].includes(e.type)) continue;
    const dist = Math.hypot(e.x - d.x, e.y - d.y);
    if (dist < nd) { nd = dist; nearest = e; }
  }

  if (nearest && nd < 800) {
    // move toward nearest enemy (to grab it)
    const dx = nearest.x - d.x;
    const dy = nearest.y - d.y;
    const mag = Math.hypot(dx,dy) || 1;
    d.x += (dx/mag) * Math.min(roamSpeed, mag);
    d.y += (dy/mag) * Math.min(roamSpeed, mag);
  } else {
    // orbit around center if no target
    d.angle += 0.01;
    const radius = Math.min(300, Math.max(120, (canvas.width + canvas.height)/8));
    const cx = canvas.width/2, cy = canvas.height/2;
    d.x = cx + Math.cos(d.angle) * radius;
    d.y = cy + Math.sin(d.angle) * radius;
  }

  // Attract nearby enemies
  attractEnemiesToDiamond(d, enemies);

  // Update attachments orbit
  for (let i = 0; i < d.attachments.length; i++) {
    const a = d.attachments[i];
    a.orbitAngle = (a.orbitAngle || 0) + 0.06 + (a.type === "reflector" ? 0.02 : 0);
    const orbitRadius = d.size + 28 + (a.type === "reflector" ? 14 : 0);
    a.x = d.x + Math.cos(a.orbitAngle) * orbitRadius;
    a.y = d.y + Math.sin(a.orbitAngle) * orbitRadius;

    // triangle and red-square attached behaviors
    if (a.type === "triangle" || a.type === "red-square") {
      a.shootTimer = (a.shootTimer || 0) + 1;
      // triangles fire faster when attached (fireRateBoost)
      const fireRate = a.type === "triangle" ? (a.fireRateBoost ? 40 : 100) : (a.type === "red-square" ? 120 : 100);
      if (a.shootTimer > fireRate) {
        a.shootTimer = 0;
        const dx = player.x - a.x;
        const dy = player.y - a.y;
        const mag = Math.hypot(dx, dy) || 1;
        lightning.push({ x: a.x, y: a.y, dx: (dx/mag)*5, dy: (dy/mag)*5, size: 6, damage: (a.type==="triangle"?15:10) });
      }
    }

    // reflectors attached: reflect player bullets that pass near them
    if (a.type === "reflector") {
      for (let bi = bullets.length-1; bi >= 0; bi--) {
        const b = bullets[bi];
        const distB = Math.hypot(b.x - a.x, b.y - a.y);
        if (distB < 40) {
          // invert bullet into enemy projectile
          lightning.push({ x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 12 });
          bullets.splice(bi, 1);
        }
      }
    }
  }

  // Diamond abilities based on attachments
  d.shootTimer = (d.shootTimer || 0) + 1;
  d.pulse = Math.sin(d.shootTimer * 0.1) * 4;

  // If reflective capability (has reflector attachment) reflect bullets nearby
  if (d.canReflect) {
    for (let bi = bullets.length-1; bi >= 0; bi--) {
      const b = bullets[bi];
      const dx = b.x - d.x, dy = b.y - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90) {
        // reflect into enemy projectile
        lightning.push({ x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 12 });
        bullets.splice(bi, 1);
      }
    }
  }

  // If any attached red-square had spawnMini flag, spawn minions periodically
  if (d.attachments.some(a=>a.spawnMini)) {
    if (d.shootTimer % 200 === 0) {
      minionsToAdd.push({
        x: d.x + (Math.random()-0.5)*80,
        y: d.y + (Math.random()-0.5)*80,
        size: 25,
        speed: 2,
        health: 30,
        type: "red-square",
        shootTimer: 0
      });
    }
  }

  // Occasionally the diamond itself fires radial if it has attachments that boost it
  if (d.attachments.length >= 3 && d.shootTimer % 180 === 0) {
    // radial 4 shots
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dv => {
      lightning.push({ x: d.x, y: d.y, dx: dv.x*6, dy: dv.y*6, size: 8, damage: 20 });
    });
  }

  // Player collision with diamond
  const distToPlayer = Math.hypot(d.x - player.x, d.y - player.y);
  if (distToPlayer < (d.size/2 + player.size/2)) {
    player.health -= 30;
    createExplosion(d.x, d.y, "white");
    // damage diamond a bit on collision
    d.health -= 80;
  }
}

// ======== Lightning (enemy projectiles) ========
function updateLightning() {
  lightning = lightning.filter(l => {
    l.x += l.dx;
    l.y += l.dy;
    if (Math.hypot(l.x - player.x, l.y - player.y) < player.size / 2) {
      player.health -= l.damage;
      return false;
    }
    return l.x >= -20 && l.x <= canvas.width + 20 && l.y >= -20 && l.y <= canvas.height + 20;
  });
}

// ======== Bullet Collisions (includes diamond attachments) ========
function checkBulletCollisions() {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    // check normal enemies
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (!e) continue;
      if (e.type === "reflector") {
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < Math.max(e.width, e.height)) {
          // Reflect bullet as enemy projectile
          lightning.push({ x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15 });
          bullets.splice(bi, 1);
          e.health -= 5;
          if (e.health <= 0) {
            createExplosion(e.x, e.y, "purple");
            enemies.splice(ei, 1);
            score += 20;
          }
          break;
        }
      } else {
        if (Math.hypot(b.x - e.x, b.y - e.y) < (e.size || 20) / 2) {
          e.health -= 10;
          bullets.splice(bi, 1);
          if (e.health <= 0) {
            createExplosion(e.x, e.y,
              e.type === "triangle" ? "cyan" :
              e.type === "boss" ? "yellow" :
              e.type === "mini-boss" ? "orange" : "red"
            );
            // if this was an attached-like unit (shouldn't be in enemies), just normal handling
            enemies.splice(ei, 1);
            score += (e.type === "boss" ? 100 : e.type === "mini-boss" ? 50 : 10);
          }
          break;
        }
      }
    }

    // check diamond attachments
    for (let di = diamonds.length - 1; di >= 0; di--) {
      const d = diamonds[di];
      // attachments are separate objects inside d.attachments
      for (let ai = d.attachments.length - 1; ai >= 0; ai--) {
        const a = d.attachments[ai];
        const radius = (a.size || 20) / 2 || 10;
        if (Math.hypot(b.x - a.x, b.y - a.y) < radius) {
          // hit attachment
          a.health = (a.health || 30) - 10;
          bullets.splice(bi, 1);
          if (a.health <= 0) {
            createExplosion(a.x, a.y, "white");
            // remove attachment
            d.attachments.splice(ai, 1);
            score += 5;
            // if it was a reflector, remove reflect capability if none left
            if (!d.attachments.some(at => at.type === "reflector")) d.canReflect = false;
          }
          // break out after handling one hit
          ai = -1;
          break;
        }
      }
      // bullets may have been spliced already
    }
  }
}

// ======== Explosions Update ========
function updateExplosions() {
  explosions = explosions.filter(ex => {
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fill();
    ex.x += ex.dx;
    ex.y += ex.dy;
    ex.life--;
    return ex.life > 0;
  });
}

// ======== Draw Functions ========
function drawPlayer() {
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
}
function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size));
}
function drawEnemies() {
  enemies.forEach(e => {
    if (!e) return;
    if (e.type === "red-square") {
      ctx.fillStyle = "red";
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    } else if (e.type === "triangle") {
      ctx.fillStyle = "cyan";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.size / 2);
      ctx.lineTo(e.x - e.size / 2, e.y + e.size / 2);
      ctx.lineTo(e.x + e.size / 2, e.y + e.size / 2);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "boss") {
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "mini-boss") {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle || 0);
      ctx.fillStyle = "purple";
      ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
      ctx.restore();
    }
  });
}
function drawDiamonds() {
  diamonds.forEach(d => {
    // diamond body
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle || 0);
    ctx.strokeStyle = d.canReflect ? "cyan" : "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -d.size / 2 - d.pulse);
    ctx.lineTo(d.size / 2 + d.pulse, 0);
    ctx.lineTo(0, d.size / 2 + d.pulse);
    ctx.lineTo(-d.size / 2 - d.pulse, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // attachments
    d.attachments.forEach(a => {
      if (a.type === "triangle") {
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - (a.size||20)/2);
        ctx.lineTo(a.x - (a.size||20)/2, a.y + (a.size||20)/2);
        ctx.lineTo(a.x + (a.size||20)/2, a.y + (a.size||20)/2);
        ctx.closePath();
        ctx.fill();
      } else if (a.type === "reflector") {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.orbitAngle || 0);
        ctx.fillStyle = "magenta";
        ctx.fillRect(- (a.width||20)/2, - (a.height||10)/2, a.width||20, a.height||10);
        ctx.restore();
      } else {
        // red-square
        ctx.fillStyle = "lime";
        ctx.fillRect(a.x - (a.size||20)/2, a.y - (a.size||20)/2, a.size||20, a.size||20);
      }
    });
  });
}
function drawLightning() {
  ctx.fillStyle = "cyan";
  lightning.forEach(l => ctx.fillRect(l.x - (l.size||6)/2, l.y - (l.size||6)/2, l.size||6, l.size||6));
}
function drawExplosions() { updateExplosions(); }

// ======== HUD / UI ========
function drawUI() {
  // Health bar
  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, 200 * Math.max(0, player.health / player.maxHealth), 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(20, 20, 200, 20);

  // Score & Wave
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);

  // Wave transition notice
  if (waveTransition) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(canvas.width/2 - 160, canvas.height/2 - 40, 320, 80);
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Wave Complete", canvas.width/2 - 80, canvas.height/2);
  }
}

// ======== Waves definition (your specified breakdown) ========
const waves = [
  { enemies: [{ type: "red-square", count: 2 }] }, // 0
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }] }, //1
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }] }, //2
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }, { type: "reflector", count: 1 }] }, //3
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }, { type: "reflector", count: 1 }] }, //4
  { enemies: [{ type: "boss", count: 1 }, { type: "triangle", count: 3 }] }, //5
  { enemies: [{ type: "reflector", count: 2 }, { type: "triangle", count: 5 }] }, //6
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }, { type: "mini-boss", count: 1 }] }, //7
  { enemies: [{ type: "mini-boss", count: 3 }, { type: "boss", count: 1 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }] }, //8
  { tunnel: true, enemies: [{ type: "triangle", count: 8 }, { type: "reflector", count: 3 }] }, //9
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 3 }, { type: "diamond", count: 1 }] } //10 final with diamond
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

// ======== Wave progression handling ========
function tryAdvanceWave() {
  // round ends only when enemies AND diamonds AND tunnels are gone
  if (enemies.length === 0 && diamonds.length === 0 && tunnels.length === 0 && !waveTransition) {
    // if we've finished all waves, stop or loop
    if (wave >= waves.length - 1) {
      // final wave completed — could show victory, for now pause
      waveTransition = true;
      waveTransitionTimer = Date.now();
      // do not auto-increment beyond final wave
      return;
    }
    // start transition (show "Wave Complete" for a bit), then spawn next
    waveTransition = true;
    waveTransitionTimer = Date.now();
    setTimeout(() => {
      wave++;
      spawnWave(wave);
      waveTransition = false;
    }, WAVE_BREAK_MS);
  }
}

// ======== Main Loop ========
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player movement
  let newX = player.x, newY = player.y;
  if (keys["w"]) { newY -= player.speed; lastDir = { x: 0, y: -1 }; }
  if (keys["s"]) { newY += player.speed; lastDir = { x: 0, y: 1 }; }
  if (keys["a"]) { newX -= player.speed; lastDir = { x: -1, y: 0 }; }
  if (keys["d"]) { newX += player.speed; lastDir = { x: 1, y: 0 }; }

  // tunnel blocking
  let blocked = false;
  for (const t of tunnels) {
    if (newX + player.size / 2 > t.x && newX - player.size / 2 < t.x + t.width &&
        newY + player.size / 2 > t.y && newY - player.size / 2 < t.y + t.height) {
      blocked = true;
      player.health -= 1;
      createExplosion(player.x, player.y, "cyan");
      break;
    }
  }
  if (!blocked) { player.x = newX; player.y = newY; }

  // Updates
  handleShooting();
  updateBullets();
  updateEnemies();
  updateLightning();
  checkBulletCollisions();
  updateExplosions();
  updateTunnels();

  // Draw
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawDiamonds();
  drawLightning();
  drawExplosions();
  drawUI();

  // try to advance when cleared
  tryAdvanceWave();

  if (player.health > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
    ctx.font = "30px Arial";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 100, canvas.height / 2 + 50);
  }
}

// ======== Start Game ========
// Start first wave properly
function startFirstWave() {
  wave = 0;
  waveTransition = false;
  spawnWave(wave);
}

startFirstWave();
gameLoop();