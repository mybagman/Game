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
  let newX = player.x, newY = player.y;
  if (keys["w"]) { newY -= player.speed; lastDir = { x: 0, y: -1 } }
  if (keys["s"]) { newY += player.speed; lastDir = { x: 0, y: 1 } }
  if (keys["a"]) { newX -= player.speed; lastDir = { x: -1, y: 0 } }
  if (keys["d"]) { newX += player.speed; lastDir = { x: 1, y: 0 } }

  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, newX));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, newY));
}

// ======== HUD ========
function drawHUD() {
  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, 200 * (player.health / player.maxHealth), 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(20, 20, 200, 20);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);
}

// ======== Enemy Spawning ========
function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height / 2), size: 30, speed: 2, health: 30, type: "normal", shootTimer: 0 });
  }
}

function spawnTriangleEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 30, speed: 1.5, health: 40, type: "triangle", shootTimer: 0 });
  }
}

function spawnBoss() {
  enemies.push({ x: canvas.width / 2, y: 100, size: 150, health: 1000, type: "boss", spawnTimer: 0, shootTimer: 0 });
}

function spawnMiniBoss() {
  enemies.push({ x: canvas.width / 2, y: 120, size: 80, health: 500, type: "mini-boss", spawnTimer: 0, shootTimer: 0 });
}

function spawnDiamondEnemy() {
  const diamond = { x: canvas.width / 2, y: canvas.height / 2, size: 40, health: 200, type: "diamond", attachments: [], canReflect: false, angle: 0, shootTimer: 0 };
  
  // Attachments: 5 red squares, 5 triangles, 5 reflectors
  for (let i = 0; i < 5; i++) {
    diamond.attachments.push({ type: "red-square", x: diamond.x, y: diamond.y, size: 20, health: 30, orbitAngle: Math.random() * Math.PI * 2 });
    diamond.attachments.push({ type: "triangle", x: diamond.x, y: diamond.y, size: 20, health: 30, orbitAngle: Math.random() * Math.PI * 2 });
    diamond.attachments.push({ type: "reflector", x: diamond.x, y: diamond.y, width: 20, height: 10, health: 50, angle: Math.random() * Math.PI * 2, orbitAngle: Math.random() * Math.PI * 2 });
  }

  enemies.push(diamond);
}

// ======== Enemy Updates ========
function updateEnemies() {
  enemies.forEach(e => {
    // Normal & triangle movement
    if (e.type === "normal" || e.type === "triangle") {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += dx / dist * e.speed;
      e.y += dy / dist * e.speed;

      if (e.type === "triangle") {
        e.shootTimer++;
        if (e.shootTimer > 100) {
          e.shootTimer = 0;
          lightning.push({ x: e.x, y: e.y, dx: (dx / dist) * 5, dy: (dy / dist) * 5, size: 6, damage: 15 });
        }
      }
    }

    // Boss
    if (e.type === "boss") {
      e.angle = e.angle || 0; e.angle += 0.01;
      e.x = canvas.width / 2 + Math.cos(e.angle) * 150;
      e.y = 80 + Math.sin(e.angle) * 50;
      e.spawnTimer++; e.shootTimer++;
      if (e.spawnTimer > 200) { e.spawnTimer = 0; minionsToAdd.push({ x: e.x + Math.random() * 100 - 50, y: e.y + Math.random() * 100 - 50, size: 30, speed: 2, health: 30, type: "normal", shootTimer: 0 }); }
      if (e.shootTimer > 150) { e.shootTimer = 0; [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }].forEach(d => lightning.push({ x: e.x, y: e.y, dx: d.x * 5, dy: d.y * 5, size: 6, damage: 20 })); }
    }

    // Mini-boss
    if (e.type === "mini-boss") {
      e.angle = e.angle || 0; e.angle += 0.02;
      e.x = canvas.width / 2 + Math.cos(e.angle) * 100;
      e.y = 80 + Math.sin(e.angle) * 30;
      e.spawnTimer++; e.shootTimer++;
      if (e.spawnTimer > 300) { e.spawnTimer = 0; minionsToAdd.push({ x: e.x + Math.random() * 80 - 40, y: e.y + Math.random() * 80 - 40, size: 25, speed: 2, health: 30, type: "normal", shootTimer: 0 }); }
      if (e.shootTimer > 180) {
        e.shootTimer = 0;
        [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }].forEach(d => {
          const mag = Math.hypot(d.x, d.y) || 1;
          lightning.push({ x: e.x, y: e.y, dx: d.x / mag * 5, dy: d.y / mag * 5, size: 6, damage: 10 });
        });
      }
    }

    // Diamond
    if (e.type === "diamond") {
      e.angle += 0.02;
      const radius = 200;
      const cx = canvas.width / 2, cy = canvas.height / 2;
      e.x = cx + Math.cos(e.angle) * radius;
      e.y = cy + Math.sin(e.angle) * radius;
      e.shootTimer++;

      // Update attachments orbit
      e.attachments.forEach(a => {
        a.orbitAngle += 0.05;
        const orbitRadius = e.size + 30;
        a.x = e.x + Math.cos(a.orbitAngle) * orbitRadius;
        a.y = e.y + Math.sin(a.orbitAngle) * orbitRadius;

        // Triangle & red-square shooting
        if (a.type === "triangle" || a.type === "red-square") {
          if (!a.shootTimer) a.shootTimer = 0;
          a.shootTimer++;
          if (a.shootTimer > 100) {
            a.shootTimer = 0;
            const dx = player.x - a.x;
            const dy = player.y - a.y;
            const mag = Math.hypot(dx, dy) || 1;
            lightning.push({ x: a.x, y: a.y, dx: dx / mag * 5, dy: dy / mag * 5, size: 6, damage: 10 });
          }
        }

        // Reflectors: reflect bullets
        if (a.type === "reflector") {
          bullets.forEach(b => {
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            if (dist < 50) { b.dx *= -1; b.dy *= -1; }
          });
        }
      });
    }

  });

  if (minionsToAdd.length > 0) { enemies.push(...minionsToAdd); minionsToAdd = []; }
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

// ======== Bullet Collisions ========
function checkBulletCollisions() {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      let radius = e.size / 2 || 20;
      if (Math.hypot(b.x - e.x, b.y - e.y) < radius) {
        e.health -= 10;
        bullets.splice(bi, 1);
        if (e.health <= 0) { createExplosion(e.x, e.y, "red"); enemies.splice(ei, 1); score += 10; }
        break;
      }
      if (e.type === "diamond") {
        for (let ai = e.attachments.length - 1; ai >= 0; ai--) {
          const a = e.attachments[ai];
          let r = a.size / 2 || 15;
          if (Math.hypot(b.x - a.x, b.y - a.y) < r) {
            a.health -= 10;
            bullets.splice(bi, 1);
            if (a.health <= 0) { createExplosion(a.x, a.y, "white"); e.attachments.splice(ai, 1); score += 5; }
            break;
          }
        }
      }
    }
  }
}

// ======== Drawing ========
function drawPlayer() { ctx.fillStyle = "lime"; ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size); }
function drawBullets() { ctx.fillStyle = "yellow"; bullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size)); }
function drawEnemies() {
  enemies.forEach(e => {
    ctx.fillStyle = e.type === "triangle" ? "cyan" : e.type === "boss" ? "yellow" : e.type === "mini-boss" ? "orange" : e.type === "diamond" ? "white" : "red";
    ctx.beginPath();
    if (e.type === "triangle") { ctx.moveTo(e.x, e.y - e.size / 2); ctx.lineTo(e.x - e.size / 2, e.y + e.size / 2); ctx.lineTo(e.x + e.size / 2, e.y + e.size / 2); ctx.closePath(); }
    else { ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2); }
    ctx.fill();
    // Diamond attachments
    if (e.type === "diamond") {
      e.attachments.forEach(a => {
        ctx.fillStyle = a.type === "triangle" ? "cyan" : a.type === "red-square" ? "red" : "magenta";
        if (a.type === "reflector") { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle || 0); ctx.fillRect(-a.width / 2, -a.height / 2, a.width, a.height); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(a.x, a.y, a.size / 2, 0, Math.PI * 2); ctx.fill(); }
      });
    }
  });
}

// ======== Waves ========
function nextWave() {
  wave++;
  if (wave === 2) spawnTriangleEnemies(5);
  else if (wave === 3) spawnEnemies(10);
  else if (wave === 4) spawnBoss();
  else if (wave === 5) spawnMiniBoss();
  else if (wave === 9) spawnDiamondEnemy();
}

// ======== Main Loop ========
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  handleShooting();
  updateBullets();
  updateEnemies();
  updateLightning();
  updateExplosions();
  checkBulletCollisions();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawHUD();
  if (enemies.length === 0) nextWave();
  requestAnimationFrame(loop);
}

loop();