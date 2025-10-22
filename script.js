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
let tunnel = null;
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

  // One bullet per press
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
  if (enemies.length === 0 && !tunnel && !miniBoss) {
    wave++;
    if (wave === 6) {
      // Spawn tunnel and mini-boss
      tunnel = { x: canvas.width, w: 200, color: "purple", speed: 3 };
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

// ================== TUNNEL ==================
function updateTunnel() {
  if (!tunnel) return;

  tunnel.x -= tunnel.speed;

  // Draw two impassable blocks (top and bottom)
  const topBlock = { x: tunnel.x, y: 0, w: tunnel.w, h: canvas.height / 3 };
  const bottomBlock = { x: tunnel.x, y: canvas.height * 2 / 3, w: tunnel.w, h: canvas.height / 3 };

  ctx.fillStyle = tunnel.color;
  ctx.fillRect(topBlock.x, topBlock.y, topBlock.w, topBlock.h);
  ctx.fillRect(bottomBlock.x, bottomBlock.y, bottomBlock.w, bottomBlock.h);

  // Damage player if touching either block
  if (
    rectsCollide(player, topBlock) ||
    rectsCollide(player, bottomBlock)
  ) {
    player.hp = 0;
    gameOver = true;
  }

  // Remove tunnel and mini-boss when tunnel passes left edge
  if (tunnel.x + tunnel.w < 0) {
    tunnel = null;
    miniBoss = null;
  }
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
    updateTunnel();
    spawnEnemies();
  }
  draw();
  requestAnimationFrame(loop);
}

loop();