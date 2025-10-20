const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Player and AI setup
let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: "lime", speed: 5 };
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };
let bullets = [];
let enemies = [];

let keys = {};

// Movement controls
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// Shoot bullets with Space
window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    bullets.push({ x: player.x, y: player.y, dx: 10, dy: 0 });
  }
});

function spawnEnemy() {
  enemies.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 20, color: "red" });
}

setInterval(spawnEnemy, 2000); // spawn an enemy every 2s

function update() {
  // Player movement
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Partner follows player
  partner.x += (player.x - partner.x) * 0.05;
  partner.y += (player.y - partner.y) * 0.05;

  // Clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player and partner
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  ctx.fillStyle = partner.color;
  ctx.fillRect(partner.x, partner.y, partner.size, partner.size);

  // Bullets
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 5, 2);
  });

  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.size, e.size);
  });

  requestAnimationFrame(update);
}

update();
