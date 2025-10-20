const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Player & AI partner
let player = { x: canvas.width/2, y: canvas.height/2, size: 20, color: "lime", speed: 5 };
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };

// Bullets and enemies
let bullets = [];
let enemies = [];

// Track pressed keys
let keys = {};

// Listen for key events
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") {  // Spacebar
    bullets.push({ x: player.x + player.size/2, y: player.y + player.size/2, dx: 10, dy: 0 });
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// Spawn enemies every 2 seconds
setInterval(() => {
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 20,
    color: "red"
  });
}, 2000);

// Game loop
function update() {
  // --- Player movement ---
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // --- Partner follows player ---
  partner.x += (player.x - partner.x) * 0.05;
  partner.y += (player.y - partner.y) * 0.05;

  // --- Clear screen ---
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Draw player ---
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // --- Draw partner ---
  ctx.fillStyle = partner.color;
  ctx.fillRect(partner.x, partner.y, partner.size, partner.size);

  // --- Update and draw bullets ---
  bullets.forEach((b, i) => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 6, 2);

    // Remove bullets that leave the screen
    if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y < 0) {
      bullets.splice(i, 1);
    }
  });

  // --- Draw enemies ---
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.size, e.size);
  });

  requestAnimationFrame(update);
}

// Start game
update();
