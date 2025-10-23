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
let lastShotTime = 0;

const shootCooldown = 200; // milliseconds

// ================== UTILITIES ==================
function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ================== PLAYER ==================
function updatePlayer() {
  if (keys["KeyW"]) player.y -= player.speed;
  if (keys["KeyS"]) player.y += player.speed;
  if (keys["KeyA"]) player.x -= player.speed;
  if (keys["KeyD"]) player.x += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  handleShooting();
}

// ================== SHOOTING ==================
function handleShooting() {
  const now = Date.now();

  // Only fire one bullet per key press or every cooldown period
  if (now - lastShotTime < shootCooldown) return;

  let dirX = 0, dirY = 0;
  if (keys["ArrowUp"]) dirY = -1;
  if (keys["ArrowDown"]) dirY = 1;
  if (keys["ArrowLeft"]) dirX = -1;
  if (keys["ArrowRight"]) dirX = 1;

  if (dirX !== 0 || dirY !== 0) {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= len;
    dirY /= len;

    bullets.push({
      x: player.x + player.w / 2 - 2,
      y: player.y + player.h / 2 - 2,
      w: 6,
      h: 6,
      color: "white",
      speed: 7,
      dirX,
      dirY
    });

    lastShotTime = now;
  }
}

// ================== BULLETS ==================
function updateBullets() {
  bullets.forEach((b, i) => {
    b.x += b.dirX * b.speed;
    b.y += b.dirY * b.speed;
    if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y < 0) bullets.splice(i, 1);
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
      tunnel = {
        x: canvas.width,
        speed: 2,
        walls: [
          { y: 0, h: 150, color: "purple" },
          { y: 450, h: 150, color: "purple" }
        ]
      };
      miniBoss = { x: canvas.width - 100, y: canvas.height / 2 - 40, w: 80, h: 80, color: "yellow", hp: 20, fireRate: 60, fireTimer: 0 };
      for (let i = 0; i < 6; i++) {
        enemies.push({ x: canvas.width + Math.random() * 200, y: Math.random() * (canvas.height - 40), w: 30, h: 30, color: "red", speed: 2 });
      }
      return;
    }

    if (wave === 7) {
      enemies.push({ x: canvas.width - 120, y: canvas.height / 2 - 50, w: 100, h: 100, color: "magenta", speed: 1.5, hp: 40, boss: true });
      return;
    }

    // Regular enemies
    for (let i = 0; i < wave * 3; i++) {
      enemies.push({
        x: canvas.width + Math.random() * 200,
        y: Math.random() * (canvas.height - 40),
        w: 30, h: 30,
        color: wave % 2 === 0 ? "orange" : "red",
        speed: 2,
        hp: 10
      });
    }
  }
}

function updateEnemies() {
  enemies.forEach((e, i) => {
    e.x -= e.speed;

    if (rectsCollide(e, player)) {
      enemies.splice(i, 1);
      player.hp--;
      if (player.hp <= 0) gameOver = true;
    }

    bullets.forEach((b, j) => {
      if (rectsCollide(b, e)) {
        bullets.splice(j, 1);
        e.hp -= 10;
        if (e.hp <= 0) {
          enemies.splice(i, 1);
          score += e.boss ? 100 : 10;
        }
      }
    });

    if (e.x + e.w < 0) enemies.splice(i, 1);
  });
}

// ================== MINI-BOSS ==================
function updateMiniBoss() {
  if (!miniBoss) return;

  miniBoss.fireTimer++;
  if (miniBoss.fireTimer >= miniBoss.fireRate) {
    miniBoss.fireTimer = 0;
    enemyBullets.push({ x: miniBoss.x, y: miniBoss.y + miniBoss.h / 2 - 4, w: 8, h: 8, color: "red", speed: 5 });
  }

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

  ctx.fillStyle = miniBoss.color;
  ctx.fillRect(miniBoss.x, miniBoss.y, miniBoss.w, miniBoss.h);
}

// ================== TUNNEL ==================
function updateTunnel() {
  if (!tunnel) return;
  tunnel.x -= tunnel.speed;

  tunnel.walls.forEach(wall => {
    ctx.fillStyle = wall.color;
    ctx.fillRect(tunnel.x, wall.y, 300, wall.h);

    if (player.x + player.w > tunnel.x && player.x < tunnel.x + 300) {
      if (player.y < wall.y + wall.h && player.y + player.h > wall.y) {
        player.hp--;
        if (player.hp <= 0) gameOver = true;
      }
    }
  });

  if (tunnel.x + 300 < 0) {
    tunnel = null;
    miniBoss = null;
  }
}

// ================== DRAW ==================
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  });

  enemyBullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

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