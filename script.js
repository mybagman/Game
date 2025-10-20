const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let explosions = [];
let keys = {};
let bullets = [];
let enemies = [];
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

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function shoot() {
  bullets.push({
    x: player.x,
    y: player.y,
    size: 6,
    dx: player.direction.x * 10,
    dy: player.direction.y * 10
  });
}

document.addEventListener("keydown", e => {
  if (e.code === "Space") shoot();
});

function createExplosion(x, y, color = "red") {
  for (let i = 0; i < 20; i++) {
    explosions.push({
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 6, // random velocity
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 4 + 2,
      color: color,
      life: 30  // frames before disappearing
    });
  }
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 30,
      speed: 2,
      health: 30
    });
  }
}

function movePlayer() {
  if (keys["w"] || keys["ArrowUp"]) {
    player.y -= player.speed;
    player.direction = { x: 0, y: -1 };
  }
  if (keys["s"] || keys["ArrowDown"]) {
    player.y += player.speed;
    player.direction = { x: 0, y: 1 };
  }
  if (keys["a"] || keys["ArrowLeft"]) {
    player.x -= player.speed;
    player.direction = { x: -1, y: 0 };
  }
  if (keys["d"] || keys["ArrowRight"]) {
    player.x += player.speed;
    player.direction = { x: 1, y: 0 };
  }
}

function drawPlayer() {
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillRect(b.x, b.y, b.size, b.size);
  });
  bullets = bullets.filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);
}

function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach(e => {
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let dist = Math.hypot(dx, dy);
    e.x += (dx / dist) * e.speed;
    e.y += (dy / dist) * e.speed;
    ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
  });
}

function checkCollisions() {
  enemies.forEach((e, i) => {
    bullets.forEach((b, j) => {
      if (
        b.x < e.x + e.size / 2 &&
        b.x > e.x - e.size / 2 &&
        b.y < e.y + e.size / 2 &&
        b.y > e.y - e.size / 2
      ) {
        e.health -= 10;
        bullets.splice(j, 1);
        if (e.health <= 0) {
          enemies.splice(i, 1);
          score += 10;
        }
      }
    });
  });
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

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Health: ${player.health}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);
}

function nextWave() {
  if (enemies.length === 0) {
    wave++;
    spawnEnemies(3 + wave);
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  drawPlayer();
  drawBullets();
  drawEnemies();
  checkCollisions();
  drawUI();
  nextWave();
  requestAnimationFrame(gameLoop);
}

spawnEnemies(3);
gameLoop();
