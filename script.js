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
let score = 0;
let wave = 1;
let minionsToAdd = [];
let tunnels = [];

let lastDir = { x: 1, y: 0 };
let canShoot = true;
let highScores = JSON.parse(localStorage.getItem("highScores")) || [];

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  health: 100
};

// ======== Controls ========
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// ======== Shoot ========
function shoot() {
  let dx = lastDir.x;
  let dy = lastDir.y;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag;
  dy /= mag;
  bullets.push({
    x: player.x,
    y: player.y,
    size: 6,
    dx: dx * 10,
    dy: dy * 10
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
      x: canvas.width - 100, // hang around right side
      y: Math.random() * (canvas.height - 100) + 50,
      size: 30,
      speed: 1.5,
      health: 40,
      type: "triangle",
      shootTimer: 0
    });
  }
}

function spawnBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 100,
    size: 150,
    health: 1000,
    type: "boss"
  });
}

function spawnMiniBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 120,
    size: 80,
    health: 500,
    type: "mini-boss"
  });
}

function spawnReflector(x, y) {
  enemies.push({
    x: x,
    y: y,
    width: 40,
    height: 20,
    angle: 0,
    speed: 0.8,   // slower speed
    health: 200,
    type: "reflector"
  });
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
    minionsToAdd.push({
      x: boss.x + (Math.random() - 0.5) * 100,
      y: boss.y + (Math.random() - 0.5) * 100,
      size: 30,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }

  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 150) {
    boss.shootTimer = 0;
    let dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];
    dirs.forEach(d => {
      lightning.push({
        x: boss.x,
        y: boss.y,
        dx: d.x * 5,
        dy: d.y * 5,
        size: 6,
        damage: 20
      });
    });
  }
}

function updateMiniBoss(boss) {
  boss.angle = boss.angle || 0;
  boss.angle += 0.02;
  boss.x = canvas.width / 2 + Math.cos(boss.angle) * 100;
  boss.y = 80 + Math.sin(boss.angle) * 30;

  boss.spawnTimer = boss.spawnTimer || 0;
  boss.spawnTimer++;
  if (boss.spawnTimer > 300) {
    boss.spawnTimer = 0;
    minionsToAdd.push({
      x: boss.x + (Math.random() - 0.5) * 80,
      y: boss.y + (Math.random() - 0.5) * 80,
      size: 25,
      speed: 2,
      health: 30,
      type: "normal",
      shootTimer: 0
    });
  }

  boss.shootTimer = boss.shootTimer || 0;
  boss.shootTimer++;
  if (boss.shootTimer > 180) {
    boss.shootTimer = 0;
    let dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];
    dirs.forEach(d => {
      lightning.push({
        x: boss.x,
        y: boss.y,
        dx: d.x * 5,
        dy: d.y * 5,
        size: 6,
        damage: 10
      });
    });
  }
}

// ======== Explosions ========
function createExplosion(x, y, color = "red") {
  for (let i = 0; i < 20; i++) {
    explosions.push({
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 4 + 2,
      color: color,
      life: 30
    });
  }
}

// ======== Movement ========
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
    if (
      newX + player.size / 2 > t.x &&
      newX - player.size / 2 < t.x + t.width &&
      newY + player.size / 2 > t.y &&
      newY - player.size / 2 < t.y + t.height
    ) {
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

let shootKeys = {};
document.addEventListener("keydown", e => {
  if (["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())) {
    shootKeys[e.key.toLowerCase()] = true;
  }
});
document.addEventListener("keyup", e => {
  if (["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())) {
    shootKeys[e.key.toLowerCase()] = false;
  }
});

let shootCooldown = 0;

function handleShooting() {
  if (shootCooldown > 0) shootCooldown--;

  let dirX = 0;
  let dirY = 0;

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
    ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
    ctx.fillRect(t.x, t.y, t.width, t.height);

    if (t.x + t.width < 0) {
      tunnels.splice(i, 1);
    }
  }
}

// ======== Enemy Logic ========
function updateEnemies() {
  enemies = enemies.filter(e => {
    if (e.type === "boss") {
      updateBoss(e);
    } else if (e.type === "mini-boss") {
      updateMiniBoss(e);
    } else {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;

      // Triangle shooting behavior
      if (e.type === "triangle") {
        e.shootTimer++;
        if (e.shootTimer > 100) {
          e.shootTimer = 0;
          lightning.push({
            x: e.x,
            y: e.y,
            dx: (dx / dist) * 5,
            dy: (dy / dist) * 5,
            size: 6,
            damage: 15
          });
        }
      }

      // Reflector behavior
      if (e.type === "reflector") {
  // Only chase nearby bullets
  if (bullets.length > 0) {
    let closestBullet = bullets.reduce((prev, curr) => {
      const prevDist = Math.hypot(prev.x - e.x, prev.y - e.y);
      const currDist = Math.hypot(curr.x - e.x, curr.y - e.y);
      return currDist < prevDist ? curr : prev;
    });

    const dxBullet = closestBullet.x - e.x;
    const dyBullet = closestBullet.y - e.y;
    const distBullet = Math.hypot(dxBullet, dyBullet) || 1;

    const maxChaseDistance = 300; // only chase bullets within 300px
    const moveSpeed = Math.min(2, distBullet / 20); // slower movement

    if (distBullet < maxChaseDistance) {
      e.x += (dxBullet / distBullet) * moveSpeed;
      e.y += (dyBullet / distBullet) * moveSpeed;
    }
  }

  // Keep rotation for visual spin
  e.angle += 0.1;
}

      // Player collision
      if (dist < (player.size / 2 + e.size / 2)) {
        player.health -= (e.type === "triangle" ? 25 : 15);
        createExplosion(e.x, e.y, e.type === "triangle" ? "cyan" : "red");
        return false;
      }
    }
    return true;
  });

  if (minionsToAdd.length > 0) {
    enemies.push(...minionsToAdd);
    minionsToAdd = [];
  }
}

// ======== Lightning ========
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

// ======== Bullet Collisions with Reflectors ========
function checkBulletCollisions() {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (e.type === "reflector") {
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < e.width) {
          // Reflect bullet as enemy bullet
          lightning.push({
            x: b.x,
            y: b.y,
            dx: -b.dx,
            dy: -b.dy,
            size: 6,
            damage: 15
          });
          bullets.splice(bi, 1);
          e.health -= 5; // small damage
          if (e.health <= 0) {
            createExplosion(e.x, e.y, "purple");
            enemies.splice(ei, 1);
            score += 20;
          }
          break;
        }
      } else {
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2) {
          e.health -= 10;
          bullets.splice(bi, 1);
          if (e.health <= 0) {
            createExplosion(e.x, e.y,
              e.type === "triangle" ? "cyan" :
              e.type === "boss" ? "yellow" :
              e.type === "mini-boss" ? "orange" : "red"
            );
            enemies.splice(ei, 1);
            score += (e.type === "boss" ? 100 : e.type === "mini-boss" ? 50 : 10);
          }
          break;
        }
      }
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

// ======== Drawing ========
function drawPlayer() {
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
}

function drawEnemies() {
  enemies.forEach(e => {
    if (e.type === "normal") {
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
      ctx.rotate(e.angle);
      ctx.fillStyle = "purple";
      ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
      ctx.restore();
    }
  });
}

function drawLightning() {
  ctx.fillStyle = "cyan";
  lightning.forEach(l => ctx.fillRect(l.x, l.y, l.size, l.size));
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Health: ${player.health}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);
}

// ======== Waves ========
const waves = [
  { enemies: [{ type: "normal", count: 3 }] },
  { enemies: [{ type: "triangle", count: 2 }, { type: "normal", count: 3 }, { type: "reflector", count: 1 }] }, // Added 1 reflector
  { enemies: [{ type: "boss", count: 1 }] }, // Removed reflectors
  { enemies: [{ type: "triangle", count: 3 }, { type: "normal", count: 5 }] },
  { enemies: [{ type: "mini-boss", count: 1 }, { type: "normal", count: 3 }] },
  { 
    tunnel: true, 
    enemies: [
      { type: "triangle", count: 10 },
      { type: "mini-boss", count: 1 },
      { type: "normal", count: 4 }
    ] 
  },
  { 
    enemies: [
      { type: "boss", count: 1 },
      { type: "mini-boss", count: 3 }
    ] 
  }
];

function spawnWave(waveIndex) {
  if (waveIndex >= waves.length) return;
  const waveData = waves[waveIndex];

  let gap = null;
  if (waveData.tunnel) {
    gap = spawnTunnel();
  }

  if (waveData.enemies) {
    waveData.enemies.forEach(group => {
      if (group.type === "normal") spawnEnemies(group.count);
      else if (group.type === "triangle") spawnTriangleEnemies(group.count);
      else if (group.type === "boss") for (let i = 0; i < group.count; i++) spawnBoss();
      else if (group.type === "mini-boss") for (let i = 0; i < group.count; i++) spawnMiniBoss();
      else if (group.type === "reflector") {
        for (let i = 0; i < group.count; i++) {
          spawnReflector(canvas.width / 2 + i * 60 - 60, 200); // around boss
        }
      }
    });
  }
}

function nextWave() {
  if (enemies.length === 0 && tunnels.length === 0) {
    spawnWave(wave - 1);
    wave++;
  }
}

// ======== Main Loop ========
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  handleShooting();
  updateBullets();
  updateEnemies();
  updateLightning();
  checkBulletCollisions();
  updateExplosions();
  updateTunnels();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawLightning();
  drawUI();
  nextWave();

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
spawnWave(wave - 1);
gameLoop();