// ================== GAME SETUP ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

let player = { x: 100, y: canvas.height / 2, w: 30, h: 30, color: "cyan", speed: 5, hp: 3 };
let bullets = [];
let enemies = [];
let enemyBullets = [];
let wave = 1;
let score = 0;
let tunnelWalls = []; // top and bottom walls
let miniBoss = null;
let gameOver = false;

// ================== UTILITIES ==================
function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ================== PLAYER ==================
function updatePlayer() {
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  if (keys["Space"] && !player.shooting) {
    bullets.push({ x: player.x + player.w, y: player.y + player.h / 2 - 2, w: 8, h: 4, color: "white", speed: 8 });
    player.shooting = true;
  }
  if (!keys["Space"]) player.shooting = false;
}

// ================== BULLETS ==================
function updateBullets() {
  bullets.forEach((b, i) => {
    b.x += b.speed;
    if (b.x > canvas.width) bullets.splice(i, 1);
  });

  enemyBullets.forEach((b, i) => {
    b.x -= b.speed;
    if (rectsCollide(b, player)) {
      enemyBullets.splice(i, 1);
      player.hp--;
      if (player.hp <= 0) gameOver = true;
    }
    if (b.x + b.w < 0) enemyBullets.splice(i, 1);
  });
}

// ================== ENEMIES ==================
function spawnEnemies() {
  // Spawn new wave if no enemies, no miniBoss, no tunnel walls
  if (enemies.length === 0 && !miniBoss && tunnelWalls.length === 0) {
    wave++;
    if (wave === 6) {
      // Wave 6: spawn tunnel walls and miniBoss
      const wallHeight = canvas.height / 3;
      tunnelWalls.push({ x: canvas.width, y: 0, w: 200, h: wallHeight, color: "purple", speed: 3 }); // top wall
      tunnelWalls.push({ x: canvas.width, y: canvas.height - wallHeight, w: 200, h: wallHeight, color: "purple", speed: 3 }); // bottom wall

      miniBoss = { x: canvas.width - 100, y: canvas.height / 2 - 40, w: 80, h: 80, color: "yellow", hp: 10, fireRate: 60, fireTimer: 0 };
      return;
    }

    // Regular enemy waves
    for (let i = 0; i < wave * 3; i++) {
      enemies.push({
        x: canvas.width + Math.random() * 200,
        y: Math.random() * (canvas.height - 40),
        w: 30, h: 30,
        color: wave % 2 === 0 ? "orange" : "red",
        speed: 2
      });
    }
  }
}

function updateEnemies() {
  enemies.forEach((e, i) => {
    e.x -= e.speed;

    // Collide with player
    if (rectsCollide(e, player)) {
      enemies.splice(i, 1);
      player.hp--;
      if (player.hp <= 0) gameOver = true;
    }

    // Collide with bullets
    bullets.forEach((b, j) => {
      if (rectsCollide(b, e)) {
        bullets.splice(j, 1);
        enemies.splice(i, 1);
        score += 10;
      }
    });

    if (e.x + e.w < 0) enemies.splice(i, 1);
  });
}

// ================== MINI-BOSS ==================
function updateMiniBoss() {
  if (!miniBoss) return;

  // Fire bullets
  miniBoss.fireTimer++;
  if (miniBoss.fireTimer >= miniBoss.fireRate) {
    miniBoss.fireTimer = 0;
    enemyBullets.push({ x: miniBoss.x, y: miniBoss.y + miniBoss.h / 2 - 4, w: 8, h: 8, color: "red", speed: 5 });
    enemyBullets.push({ x: miniBoss.x, y: miniBoss.y + miniBoss.h / 2 - 20, w: 8, h: 8, color: "red", speed: 5 });
    enemyBullets.push({ x: miniBoss.x, y: miniBoss.y + miniBoss.h / 2 + 12, w: 8, h: 8, color: "red", speed: 5 });
  }

  // Damage from player bullets
  bullets.forEach((b, j) => {
    if (rectsCollide(b, miniBoss)) {
      bullets.splice(j, 1);
      miniBoss.hp--;
      if (miniBoss.hp <= 0) {
        miniBoss = null;
        score += 100;
      }
    }
  });

  // Draw mini-boss
  ctx.fillStyle = miniBoss.color;
  ctx.fillRect(miniBoss.x, miniBoss.y, miniBoss.w, miniBoss.h);
}

// ================== TUNNEL WALLS ==================
function updateTunnelWalls() {
  if (tunnelWalls.length === 0) return;

  tunnelWalls.forEach((wall, i) => {
    wall.x -= wall.speed;

    // Draw wall
    ctx.fillStyle = wall.color;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

    // Damage player if touching wall
    if (rectsCollide(player, wall)) {
      player.hp = 0;
      gameOver = true;
    }

    // Remove wall if offscreen
    if (wall.x + wall.w < 0) {
      tunnelWalls.splice(i, 1);
    }
  });
}

// ================== DRAW ==================
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  });

  // Enemy bullets
  enemyBullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  // Tunnel walls
  tunnelWalls.forEach(w => {
    ctx.fillStyle = w.color;
    ctx.fillRect(w.x, w.y, w.w, w.h);
  });

  // Mini-boss
  if (miniBoss) {
    ctx.fillStyle = miniBoss.color;
    ctx.fillRect(miniBoss.x, miniBoss.y, miniBoss.w, miniBoss.h);
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("HP: " + player.hp, 10, 20);
  ctx.fillText("Wave: " + wave, 10, 40);
  ctx.fillText("Score: " + score, 10, 60);

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
  }
}

// ================== GAME LOOP ==================
function loop() {
  if (!gameOver) {
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateMiniBoss();
    updateTunnelWalls();
    spawnEnemies();
  }
  draw();
  requestAnimationFrame(loop);
}

loop();