const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Player, Partner, Enemies, Bullets ---
let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, color: "lime", speed: 5 };
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };
let bullets = [];
let enemies = [];
let keys = {};

// --- Player Controls ---
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === "Space") {
    bullets.push({ x: player.x + player.size / 2, y: player.y + player.size / 2, dx: 10, dy: 0 });
  }
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Enemy Spawner ---
function spawnEnemy() {
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 20,
    color: "red",
  });
}
setInterval(spawnEnemy, 2000);

// --- Game Loop ---
function update() {
  // Movement
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Partner AI follows player
  partner.x += (player.x - partner.x) * 0.05;
  partner.y += (player.y - partner.y) * 0.05;

  // Clear screen
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Draw partner
  ctx.fillStyle = partner.color;
  ctx.fillRect(partner.x, partner.y, partner.size, partner.size);

  // Draw and move bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillRect(b.x, b.y, 6, 2);
  });

  // Draw enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.size, e.size);
  });

  requestAnimationFrame(update);
}

update();
