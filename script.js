// Full integrated script with diamond enemy + waves as requested

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ======== Setup ========
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======== Game Variables ========
let keys = {};
let bullets = [];
let enemies = [];
let lightning = [];
let explosions = [];
let diamonds = [];
let score = 0;
let waveIndex = 0; // waves 0..10 per your breakdown
let minionsToAdd = [];
let tunnels = [];

let lastDir = { x: 1, y: 0 };
let shootCooldown = 0;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  health: 100,
  maxHealth: 100
};

// ======== Controls ========
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ======== Shooting ========
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
    return b.x >= 0 && b.x <= canvas.width && b.y >= 0 && b.y <= canvas.height;
  });
}

// ======== Enemy Spawning ========
function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height / 2),
      size: 30,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }
}

function spawnTriangleEnemies(count) {
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

function spawnReflector(x, y) {
  enemies.push({
    x: x,
    y: y,
    width: 40,
    height: 20,
    angle: 0,
    speed: 0.8,
    health: 200,
    type: "reflector"
  });
}

function spawnBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 100,
    size: 150,
    health: 1000,
    type: "boss",
    spawnTimer: 0,
    shootTimer: 0
  });
}

function spawnMiniBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 120,
    size: 80,
    health: 500,
    type: "mini-boss",
    spawnTimer: 0,
    shootTimer: 0
  });
}

// ======== Diamond: spawn / behavior / attachments ========
function spawnDiamondEnemy(x = canvas.width / 2, y = canvas.height / 3) {
  // Diamond enemy: moves around, attracts enemies, attaches them when close.
  const diamond = {
    x, y,
    size: 40,
    health: 300,
    type: "diamond",
    attachments: [],    // attached enemies (objects removed from enemies[] and moved here)
    canReflect: false,  // set when reflectors attach
    spawnMini: false,   // set when red-square attaches (spawns minions)
    fireRateBoost: false, // set when triangle attaches
    angle: Math.random() * Math.PI * 2,
    shootTimer: 0,
    orbitSpeed: 0.02,
    pulse: 0
  };

  // Additionally: spawn potential attachable enemies near the diamond (they will start as separate enemies)
  // We'll add them as regular enemies positioned in a ring around the diamond so they can be attracted & attached.
  const attachables = [];
  // Add 5 red-squares, 5 triangles, 5 reflectors as separate enemies (per your requirement)
  for (let i = 0; i < 5; i++) {
    // red-square (treated as 'normal' with a special 'red-square' tag)
    attachables.push({
      x: diamond.x + Math.cos(i / 5 * Math.PI * 2) * 80 + (Math.random() * 20 - 10),
      y: diamond.y + Math.sin(i / 5 * Math.PI * 2) * 80 + (Math.random() * 20 - 10),
      size: 24,
      speed: 2,
      health: 30,
      type: "red-square",
      shootTimer: 0
    });
    // triangle
    attachables.push({
      x: diamond.x + Math.cos((i + 0.3) / 5 * Math.PI * 2) * 100 + (Math.random() * 20 - 10),
      y: diamond.y + Math.sin((i + 0.3) / 5 * Math.PI * 2) * 100 + (Math.random() * 20 - 10),
      size: 24,
      speed: 1.5,
      health: 35,
      type: "triangle",
      shootTimer: 0
    });
    // reflector
    attachables.push({
      x: diamond.x + Math.cos((i + 0.6) / 5 * Math.PI * 2) * 120 + (Math.random() * 20 - 10),
      y: diamond.y + Math.sin((i + 0.6) / 5 * Math.PI * 2) * 120 + (Math.random() * 20 - 10),
      width: 30,
      height: 14,
      angle: 0,
      speed: 0.8,
      health: 50,
      type: "reflector",
      shootTimer: 0
    });
  }

  // push diamond as an enemy entity (so updateEnemies handles it)
  enemies.push(diamond);
  // push attachables as normal enemies (they may get later attached by diamond)
  enemies.push(...attachables);
  return diamond;
}

function attractEnemiesToDiamond(diamond, allEnemies) {
  // stronger pull so attachments happen noticeably
  allEnemies.forEach(e => {
    if (!e || e === diamond) return;
    if (e.attachedTo) return; // already attached
    // only attract attachable types (normal/red-square/triangle/reflector)
    if (!["normal","red-square","triangle","reflector"].includes(e.type)) return;
    const dx = diamond.x - e.x;
    const dy = diamond.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 300 && diamond.attachments.length < 15) { // allow up to many attachments
      // stronger factor than earlier: 0.06
      e.x += dx * 0.06;
      e.y += dy * 0.06;
      if (dist < 28) {
        attachToDiamond(diamond, e);
      }
    }
  });
}

function attachToDiamond(diamond, enemy) {
  // remove enemy from enemies array (it will be removed naturally by caller when filtering)
  enemy.attachedTo = diamond;
  enemy.orbitAngle = Math.random() * Math.PI * 2;
  // store minimal data for attachment; keep original type and stats
  diamond.attachments.push(enemy);

  // apply attachment flags to diamond
  if (enemy.type === "triangle") diamond.fireRateBoost = true;
  if (enemy.type === "red-square") diamond.spawnMini = true;
  if (enemy.type === "reflector") diamond.canReflect = true;
}

// When diamond dies, spawn attachments back as enemies (detached)
function diamondDeath(diamond) {
  createExplosion(diamond.x, diamond.y, "white");
  diamond.attachments.forEach(a => {
    // Convert back to enemies with a little scatter so player sees them reappearing
    const ex = a.x + (Math.random() * 40 - 20);
    const ey = a.y + (Math.random() * 40 - 20);
    if (a.type === "reflector") {
      enemies.push({
        x: ex, y: ey, width: a.width || 30, height: a.height || 14, angle: a.angle || 0, speed: 0.8, health: 50, type: "reflector"
      });
    } else {
      enemies.push({
        x: ex, y: ey, size: a.size || 24, speed: (a.speed || 2), health: a.health || 30, type: a.type === "red-square" ? "red-square" : "triangle", shootTimer: 0
      });
    }
  });
}

// Update diamond (movement, attraction, attachments orbit + abilities)
function updateDiamond(d) {
  d.angle = d.angle || 0;
  d.shootTimer = d.shootTimer || 0;
  d.angle += d.orbitSpeed;

  // Movement logic:
  // If there are enemies (non-attached) the diamond will seek the nearest enemy to attract
  const targets = enemies.filter(e => e !== d && !e.attachedTo && ["normal","triangle","red-square","reflector"].includes(e.type));
  if (targets.length > 0) {
    // move toward the closest target (makes it roam looking for enemies to absorb)
    let closest = targets[0];
    let cd = Math.hypot(targets[0].x - d.x, targets[0].y - d.y);
    for (let t of targets) {
      const td = Math.hypot(t.x - d.x, t.y - d.y);
      if (td < cd) { cd = td; closest = t; }
    }
    // approach but not too fast
    const dx = closest.x - d.x;
    const dy = closest.y - d.y;
    const mag = Math.hypot(dx, dy) || 1;
    const moveSpeed = 1.8; // diamond is mobile
    d.x += (dx / mag) * moveSpeed;
    d.y += (dy / mag) * moveSpeed;
  } else {
    // no other enemies -> move towards player to be aggressive
    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const mag = Math.hypot(dx, dy) || 1;
    const moveSpeed = 1.2;
    d.x += (dx / mag) * moveSpeed;
    d.y += (dy / mag) * moveSpeed;
  }

  // Attract nearby enemies (stronger)
  attractEnemiesToDiamond(d, enemies);

  // update attachments orbit positions and abilities
  const orbitRadius = d.size + 30;
  d.attachments.forEach((a, i) => {
    a.orbitAngle = (a.orbitAngle || Math.random() * Math.PI * 2) + 0.06;
    a.x = d.x + Math.cos(a.orbitAngle) * orbitRadius;
    a.y = d.y + Math.sin(a.orbitAngle) * orbitRadius;

    // shooting logic for attached triangles and red-squares
    if (a.type === "triangle" || a.type === "red-square") {
      a.shootTimer = (a.shootTimer || 0) + 1;
      const shootThreshold = a.type === "triangle" ? 90 : 120; // triangles shoot faster
      const boosted = d.fireRateBoost ? 0.6 : 1.0;
      if (a.shootTimer > shootThreshold * boosted) {
        a.shootTimer = 0;
        const dx = player.x - a.x;
        const dy = player.y - a.y;
        const mag = Math.hypot(dx, dy) || 1;
        lightning.push({
          x: a.x, y: a.y,
          dx: (dx / mag) * 5,
          dy: (dy / mag) * 5,
          size: 6, damage: 12
        });
      }
    }

    // reflectors reflect bullets around them
    if (a.type === "reflector") {
      bullets.forEach(b => {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < 40) {
          b.dx *= -1;
          b.dy *= -1;
        }
      });
    }
  });

  // Pulse visual
  d.pulse = Math.sin(d.shootTimer * 0.12) * 4;

  // Diamond base shooting (if it has triangle attachments or periodically)
  d.shootTimer++;
  if (d.shootTimer % 140 === 0) {
    // fire a radial shot if has reflectors, else single shot toward player
    if (d.canReflect) {
      const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
      dirs.forEach(dir => lightning.push({x:d.x,y:d.y,dx:dir.x*5,dy:dir.y*5,size:6,damage:18}));
    } else {
      const dx = player.x - d.x;
      const dy = player.y - d.y;
      const mag = Math.hypot(dx, dy) || 1;
      lightning.push({x:d.x,y:d.y,dx:(dx/mag)*5,dy:(dy/mag)*5,size:6,damage:18});
    }
  }

  // spawn minions if red-square attachments present and timer passes
  if (d.spawnMini && d.shootTimer % 300 === 0) {
    minionsToAdd.push({
      x: d.x + (Math.random() - 0.5) * 80,
      y: d.y + (Math.random() - 0.5) * 80,
      size: 25,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }

  // collision with player
  const distToPlayer = Math.hypot(d.x - player.x, d.y - player.y);
  if (distToPlayer < (d.size / 2 + player.size / 2)) {
    player.health -= 30; // diamond hits hard
    createExplosion(d.x, d.y, "magenta");
    // optional: diamond remains, don't destroy on collision naturally
  }
}

// ======== Tunnel Logic ========
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

// ======== Boss Logic ========
function updateBoss(boss) {
  boss.angle = boss.angle || 0;
  boss.angle += 0.01;
  boss.x = canvas.width / 2 + Math.cos(boss.angle) * 150;
  boss.y = 80 + Math.sin(boss.angle) * 50;
  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if (boss.spawnTimer > 200) {
    boss.spawnTimer = 0;
    minionsToAdd.push({ x: boss.x + (Math.random() - 0.5) * 100, y: boss.y + (Math.random() - 0.5) * 100, size: 30, speed: 2, health: 30, type: "normal", shootTimer: 0 });
  }
  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 150) {
    boss.shootTimer = 0;
    [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => lightning.push({x:boss.x,y:boss.y,dx:d.x*5,dy:d.y*5,size:6,damage:20}));
  }
}

function updateMiniBoss(boss) {
  boss.angle = boss.angle || Math.random() * Math.PI * 2;
  boss.angle += 0.02;
  boss.x = canvas.width / 2 + Math.cos(boss.angle) * 100;
  boss.y = 80 + Math.sin(boss.angle) * 30;
  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if (boss.spawnTimer > 300) {
    boss.spawnTimer = 0;
    minionsToAdd.push({ x: boss.x + (Math.random() - 0.5) * 80, y: boss.y + (Math.random() - 0.5) * 80, size: 25, speed: 2, health: 30, type: "normal", shootTimer: 0 });
  }
  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1}];
    dirs.forEach(d => { const mag = Math.hypot(d.x,d.y)||1; lightning.push({x:boss.x,y:boss.y,dx:(d.x/mag)*5,dy:(d.y/mag)*5,size:6,damage:10}); });
  }
}

// ======== Update Enemies (including diamond handling) ========
function updateEnemies() {
  enemies = enemies.filter(e => {
    // diamond is managed here
    if (e.type === "diamond") {
      updateDiamond(e);
      // keep diamond alive (we'll remove it if health <= 0 via bullet collisions)
      return e.health > 0;
    }

    // bosses
    if (e.type === "boss") { updateBoss(e); return true; }
    if (e.type === "mini-boss") { updateMiniBoss(e); return true; }

    // normal behavior for other enemies (triangle, normal, red-square, reflector)
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    // ensure they have speed defined (reflectors use slower)
    e.x += (dx / dist) * (e.speed || 1.5);
    e.y += (dy / dist) * (e.speed || 1.5);

    // Triangle shooting behavior
    if (e.type === "triangle") {
      e.shootTimer = (e.shootTimer || 0) + 1;
      if (e.shootTimer > 100) {
        e.shootTimer = 0;
        const mag = Math.hypot(dx, dy) || 1;
        lightning.push({x: e.x, y: e.y, dx: (dx / mag) * 5, dy: (dy / mag) * 5, size: 6, damage: 15});
      }
    }

    // Reflector behavior (chase bullets a bit)
    if (e.type === "reflector" && bullets.length > 0) {
      let closest = bullets.reduce((p,c) => (Math.hypot(c.x-e.x,c.y-e.y) < Math.hypot(p.x-e.x,p.y-e.y) ? c : p));
      const dxB = closest.x - e.x;
      const dyB = closest.y - e.y;
      const distB = Math.hypot(dxB, dyB) || 1;
      const maxChaseDistance = 300;
      const moveSpeed = Math.min(2, distB / 20);
      if (distB < maxChaseDistance) {
        e.x += (dxB / distB) * moveSpeed;
        e.y += (dyB / distB) * moveSpeed;
      }
      e.angle += 0.1;
    }

    // red-square: behaves like normal but could have special later
    // Collision with player
    const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
    if (distToPlayer < (e.size / 2 + player.size / 2)) {
      player.health -= (e.type === "triangle" ? 25 : 15);
      createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : "red");
      return false;
    }

    return true;
  });

  // add any minions requested by bosses/diamond
  if (minionsToAdd.length > 0) {
    enemies.push(...minionsToAdd);
    minionsToAdd = [];
  }
}

// ======== Lightning (enemy bullets) ========
function updateLightning() {
  lightning = lightning.filter(l => {
    l.x += l.dx;
    l.y += l.dy;
    if (Math.hypot(l.x - player.x, l.y - player.y) < player.size / 2) {
      player.health -= l.damage;
      return false;
    }
    return l.x >= 0 && l.x <= canvas.width && l.y >= 0 && l.y <= canvas.height;
  });
}

// ======== Bullet Collisions (includes diamond attachments interaction) ========
function checkBulletCollisions() {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    // check enemies
    let hitSomething = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      // diamond main entity collision
      if (e.type === "diamond") {
        const r = e.size / 2;
        if (Math.hypot(b.x - e.x, b.y - e.y) < r) {
          e.health -= 15;
          bullets.splice(bi, 1);
          hitSomething = true;
          if (e.health <= 0) {
            // on death, diamond's attachments spawn back as enemies
            diamondDeath(e);
            enemies.splice(ei, 1);
            score += 200;
          }
          break;
        }
      } else {
        // reflectors have width/height collision
        if (e.type === "reflector") {
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const r = Math.max(e.width, e.height) / 2;
          if (Math.hypot(dx, dy) < r) {
            // reflect the bullet back as enemy lightning
            lightning.push({ x: b.x, y: b.y, dx: -b.dx, dy: -b.dy, size: 6, damage: 15 });
            bullets.splice(bi, 1);
            e.health -= 5;
            hitSomething = true;
            if (e.health <= 0) {
              createExplosion(e.x, e.y, "purple");
              enemies.splice(ei, 1);
              score += 20;
            }
            break;
          }
        } else {
          // other enemies
          const rr = e.size / 2 || 15;
          if (Math.hypot(b.x - e.x, b.y - e.y) < rr) {
            e.health -= 10;
            bullets.splice(bi, 1);
            hitSomething = true;
            if (e.health <= 0) {
              createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : "red");
              enemies.splice(ei, 1);
              score += (e.type === "boss" ? 100 : e.type === "mini-boss" ? 50 : 10);
            }
            break;
          }
        }
      }
    }
    if (hitSomething) continue;

    // Additionally check diamond attachments (they orbit inside diamond object)
    // Find diamond that has attachments
    for (let di = 0; di < enemies.length && bi >= 0; di++) {
      const e = enemies[di];
      if (e.type !== "diamond") continue;
      for (let ai = e.attachments.length - 1; ai >= 0; ai--) {
        const a = e.attachments[ai];
        const ar = (a.size || a.width || 20) / 2;
        if (Math.hypot(b.x - a.x, b.y - a.y) < ar) {
          // hit attachment
          a.health = (a.health || 30) - 10;
          bullets.splice(bi, 1);
          if (a.health <= 0) {
            createExplosion(a.x, a.y, "white");
            // remove attachment permanently
            e.attachments.splice(ai, 1);
            score += 5;
            // if attachment was reflector/triangle change diamond flags
            // recalc flags simply
            e.canReflect = e.attachments.some(x => x.type === "reflector");
            e.spawnMini = e.attachments.some(x => x.type === "red-square");
            e.fireRateBoost = e.attachments.some(x => x.type === "triangle");
          }
          di = enemies.length; // break outer loop
          break;
        }
      }
    }
  }
}

// ======== Explosions ========
function createExplosion(x, y, color = "red") {
  for (let i = 0; i < 20; i++) {
    explosions.push({
      x, y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 4 + 2,
      color,
      life: 30
    });
  }
}

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

// ======== Player ========
function movePlayer() {
  let newX = player.x;
  let newY = player.y;
  if (keys["w"]) { newY -= player.speed; lastDir = { x: 0, y: -1 }; }
  if (keys["s"]) { newY += player.speed; lastDir = { x: 0, y: 1 }; }
  if (keys["a"]) { newX -= player.speed; lastDir = { x: -1, y: 0 }; }
  if (keys["d"]) { newX += player.speed; lastDir = { x: 1, y: 0 }; }

  // Tunnel collision
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

  if (!blocked) {
    player.x = newX;
    player.y = newY;
  }
}

// ======== Drawing ========
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
    if (e.type === "normal" || e.type === "red-square") {
      ctx.fillStyle = (e.type === "red-square") ? "crimson" : "red";
      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.size || 30) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "triangle") {
      ctx.fillStyle = "cyan";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - (e.size || 30) / 2);
      ctx.lineTo(e.x - (e.size || 30) / 2, e.y + (e.size || 30) / 2);
      ctx.lineTo(e.x + (e.size || 30) / 2, e.y + (e.size || 30) / 2);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "reflector") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle || 0);
      ctx.fillStyle = "magenta";
      ctx.fillRect(- (e.width || 30) / 2, - (e.height || 14) / 2, e.width || 30, e.height || 14);
      ctx.restore();
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
    } else if (e.type === "diamond") {
      // diamond base
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.moveTo(0, -e.size / 2 - e.pulse);
      ctx.lineTo(e.size / 2 + e.pulse, 0);
      ctx.lineTo(0, e.size / 2 + e.pulse);
      ctx.lineTo(-e.size / 2 - e.pulse, 0);
      ctx.closePath();
      ctx.fillStyle = "magenta";
      ctx.fill();
      ctx.restore();

      // attachments (orbiting)
      e.attachments.forEach(a => {
        if (a.type === "reflector") {
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(a.angle || 0);
          ctx.fillStyle = "purple";
          ctx.fillRect(- (a.width || 20) / 2, - (a.height || 10) / 2, a.width || 20, a.height || 10);
          ctx.restore();
        } else if (a.type === "triangle") {
          ctx.fillStyle = "cyan";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - (a.size || 14) / 2);
          ctx.lineTo(a.x - (a.size || 14) / 2, a.y + (a.size || 14) / 2);
          ctx.lineTo(a.x + (a.size || 14) / 2, a.y + (a.size || 14) / 2);
          ctx.closePath();
          ctx.fill();
        } else { // red-square
          ctx.fillStyle = "lime";
          ctx.beginPath();
          ctx.arc(a.x, a.y, (a.size || 14) / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  });
}
function drawLightning() { ctx.fillStyle = "cyan"; lightning.forEach(l => ctx.fillRect(l.x - l.size/2, l.y - l.size/2, l.size, l.size)); }

function drawHUD() {
  // health bar
  ctx.fillStyle = "gray"; ctx.fillRect(20,20,200,20);
  ctx.fillStyle = "lime"; ctx.fillRect(20,20,200*(player.health/player.maxHealth),20);
  ctx.strokeStyle = "black"; ctx.strokeRect(20,20,200,20);
  ctx.fillStyle = "white"; ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60);
  ctx.fillText(`Wave: ${waveIndex + 1}`, 20, 90);
}

// ======== Waves config (your breakdown) ========
const waves = [
  { enemies: [{ type: "red-square", count: 2 }] }, // 0
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }] }, // 1
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }] }, // 2
  { enemies: [{ type: "red-square", count: 3 }, { type: "triangle", count: 2 }, { type: "reflector", count: 1 }] }, // 3
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 4 }, { type: "reflector", count: 1 }] }, // 4
  { enemies: [{ type: "boss", count: 1 }, { type: "triangle", count: 3 }] }, // 5
  { enemies: [{ type: "reflector", count: 2 }, { type: "triangle", count: 5 }] }, // 6
  { tunnel: true, enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }, { type: "mini-boss", count: 1 }] }, // 7
  { enemies: [{ type: "mini-boss", count: 3 }, { type: "boss", count: 1 }, { type: "triangle", count: 5 }, { type: "reflector", count: 1 }] }, // 8
  { tunnel: true, enemies: [{ type: "triangle", count: 8 }, { type: "reflector", count: 3 }] }, // 9
  { enemies: [{ type: "red-square", count: 5 }, { type: "triangle", count: 5 }, { type: "reflector", count: 3 }], diamond: true } // 10 (diamond wave)
];

function spawnWave(index) {
  if (index < 0 || index >= waves.length) return;
  const data = waves[index];

  if (data.tunnel) spawnTunnel();

  if (data.enemies) {
    data.enemies.forEach(group => {
      if (group.type === "red-square") {
        // spawn red-square as normal enemies labeled type 'red-square'
        for (let i = 0; i < group.count; i++) {
          enemies.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: 24, speed: 2, health: 30, type: "red-square", shootTimer: 0 });
        }
      } else if (group.type === "normal") {
        spawnEnemies(group.count);
      } else if (group.type === "triangle") {
        spawnTriangleEnemies(group.count);
      } else if (group.type === "reflector") {
        for (let i=0;i<group.count;i++) spawnReflector(Math.random()*canvas.width, Math.random()*canvas.height);
      } else if (group.type === "boss") {
        for (let i=0;i<group.count;i++) spawnBoss();
      } else if (group.type === "mini-boss") {
        for (let i=0;i<group.count;i++) spawnMiniBoss();
      }
    });
  }

  if (data.diamond) {
    // spawn diamond and its attachable enemies (they start separate)
    spawnDiamondEnemy(canvas.width/2, canvas.height/3);
  }
}

// next wave only when no enemies and no tunnels and no diamonds (alive)
function nextWaveIfClear() {
  const haveEnemies = enemies.length > 0;
  const haveTunnels = tunnels.length > 0;
  if (!haveEnemies && !haveTunnels) {
    // spawn next wave if exists
    if (waveIndex < waves.length - 1) {
      waveIndex++;
      spawnWave(waveIndex);
    } else {
      // reached the last wave, optionally loop or stop - we'll just keep last wave repeating
      // If you prefer "end game" here, change behavior.
    }
  }
}

// ======== Main Game Loop ========
function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // update / move
  movePlayer();
  handleShooting();
  updateBullets();
  updateEnemies();
  updateLightning();
  checkBulletCollisions();
  updateExplosions();
  updateTunnels();

  // draw
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawLightning();
  drawHUD();

  // spawn initial wave if none
  if (enemies.length === 0 && tunnels.length === 0 && waveIndex === 0 && score === 0) {
    // start with wave 0 if not started
    spawnWave(0);
  }

  // wave progression: ensure diamond attachments that detached have been re-added as enemies via diamondDeath
  // next wave only when there are no enemies and no tunnels (diamond when alive is in enemies[] so covered)
  if (enemies.length === 0 && tunnels.length === 0) {
    // move to next wave
    if (waveIndex < waves.length - 1) {
      waveIndex++;
      spawnWave(waveIndex);
    } else {
      // optionally, repeat last wave
    }
  }

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
spawnWave(0);
gameLoop();