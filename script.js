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
      x: Math.random() * canvas.width,
      y: Math.random() * (canvas.height / 2),
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
    size: 80,
    health: 300 + wave * 100,
    type: "boss"
  });
}

function spawnMiniBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 120,
    size: 40,
    health: 150 + wave * 50,
    type: "mini-boss"
  });
}

// ======== Tunnel ========
function spawnTunnel() {
  const wallHeight = canvas.height / 3;
  const wallWidth = 300;

  const topWall = { x: canvas.width, y: 0, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };
  const bottomWall = { x: canvas.width, y: canvas.height - wallHeight, width: wallWidth, height: wallHeight, speed: 2, damage: 30, active: true };

  tunnels.push(topWall, bottomWall);

  // Return gap info for enemy spawning
  return { x: canvas.width, y: wallHeight, width: wallWidth, gapY: wallHeight };
}

// ======== Waves ========
const waves = [
  { enemies: [{ type: "normal", count: 3 }] },
  { enemies: [{ type: "triangle", count: 2 }, { type: "normal", count: 3 }] },
  { enemies: [{ type: "boss", count: 1 }] },
  { enemies: [{ type: "triangle", count: 3 }, { type: "normal", count: 5 }] },
  { enemies: [{ type: "mini-boss", count: 1 }, { type: "normal", count: 3 }] },
  { tunnel: true, enemies: [{ type: "normal", count: 4 }, { type: "triangle", count: 2 }] } // wave 6
];

function spawnWave(waveIndex) {
  if (waveIndex >= waves.length) return;
  const waveData = waves[waveIndex];

  let gap = null;
  if (waveData.tunnel) gap = spawnTunnel();

  if (waveData.enemies) {
    waveData.enemies.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        let spawnY = gap ? gap.gapY + Math.random() * 100 - 50 : Math.random() * canvas.height / 2;
        enemies.push({
          x: gap ? gap.x + Math.random() * 50 : Math.random() * canvas.width,
          y: spawnY,
          size: 30,
          speed: group.type === "triangle" ? 1.5 : 2,
          health: group.type === "triangle" ? 40 : 30,
          type: group.type,
          shootTimer: 0
        });
      }
    });
  }
}

// ======== Next Wave ========
function nextWave() {
  if (enemies.length === 0 && tunnels.length === 0) {
    spawnWave(wave - 1);
    wave++;
  }
}

// ======== Main Loop ========
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;

  // Shooting
  if (keys[" "] && canShoot) { shoot(); canShoot = false; }
  if (!keys[" "]) canShoot = true;

  // Bullets
  bullets.forEach((b, i) => {
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
  });

  // Tunnel draw
  tunnels.forEach((t, i) => {
    ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
    ctx.fillRect(t.x, t.y, t.width, t.height);
    t.x -= t.speed;
    if (t.x + t.width < 0) tunnels.splice(i, 1);
  });

  // Enemies
  enemies.forEach((e, i) => {
    if (e.type === "normal" || e.type === "triangle") {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;

      if (dist < (player.size / 2 + e.size / 2)) {
        player.health -= e.type === "triangle" ? 25 : 15;
        enemies.splice(i, 1);
      }
    }
  });

  // Draw
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.size, b.size));
  enemies.forEach(e => {
    ctx.fillStyle = e.type === "normal" ? "red" : "cyan";
    ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
  });

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Health: ${player.health}`, 20, 60);
  ctx.fillText(`Wave: ${wave}`, 20, 90);

  nextWave();

  if (player.health > 0) requestAnimationFrame(gameLoop);
  else {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
  }
}

// ======== Start ========
spawnWave(wave - 1);
gameLoop();