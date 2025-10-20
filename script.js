const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game variables
let keys = {};
let bullets = [];
let enemies = [];
let explosions = [];
let score = 0;
let wave = 1;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 30,
  speed: 5,
  health: 100,
  direction: { x: 1, y: 0 }
};

// Controls
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
document.addEventListener("keydown", e => {
  if (e.code === "Space") shoot();
});

// Shoot function
function shoot() {
  bullets.push({
    x: player.x,
    y: player.y,
    size: 6,
    dx: player.direction.x * 10,
    dy: player.direction.y * 10
  });
}

// Spawn enemies
function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height / 2,
      size: 30,
      speed: 2,
      health: 30
    });
  }
}

// Explosion effect
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

// Player movement
function movePlayer() {
  if (keys["w"] || keys["arrowup"]) {
    player.y -= player.speed;
    player.direction = { x: 0, y: -1 };
  }
  if (keys["s"] || keys["arrowdown"]) {
    player.y += player.speed;
    player.direction = { x: 0, y: 1 };
  }
  if (keys["a"] || keys["arrowleft"]) {
    player.x -= player.speed;
    player.direction = { x: -1, y: 0 };
  }
  if (keys["d"] || keys["arrowright"]) {
    player.x += player.speed;
    player.direction = { x: 1, y: 0 };
  }
}

// Draw functions
function drawPlayer() {
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
}

function drawBullets() {
  bullets.forEach((b, i) => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.size, b.size);
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
  });
}

function drawEnemies() {
  enemies.forEach((e, ei) => {
    // Move towards player
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let dist = Math.hypot(dx, dy);
    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;

    // Check collision with player
    if (dist < (player.size / 2 + e.size / 2)) {
      player.health -= 20;
      createExplosion(e.x, e.y);
      enemies.splice(ei, 1);
    }

    ctx.fillStyle = "red";
    ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
  });
}

function checkBulletCollisions() {
  enemies.forEach((e, ei) => {
    bullets.forEach((b, bi) => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2) {
        e.health -= 10;
        bullets.splice(bi, 1);
        if (e.health <= 0) {
          createExplosion(e.x, e.y);
          enemies.splice(ei, 1);
          score += 10;
        }
      }
    });
  });
}

function drawExplosions() {
  explosions.forEach((ex, i) => {
    ctx.fillStyle = ex.color;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fill();
    ex.x += ex.dx;
    ex.y += ex.dy;
    ex.life--;
    if (ex.life <= 0) explosions.splice(i, 1);
  });
}

// Draw HUD
function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Health: ${player.health}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);
}

// Wave management
function nextWave() {
  if (enemies.length === 0) {
    wave++;
    spawnEnemies(3 + wave);
  }
}

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  drawPlayer();
  drawBullets();
  drawEnemies();
  checkBulletCollisions();
  drawExplosions();
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

// Start game
spawnEnemies(3);
gameLoop();
