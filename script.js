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

// --- Enemy spawn ---
setInterval(() => {
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 20,
    color: "red",
    health: 2 // takes 2 hits to die
  });
}, 2000);

// --- Inside update() after bullets move ---
bullets.forEach((b, bi) => {
  b.x += b.dx;
  b.y += b.dy;
  ctx.fillStyle = "yellow";
  ctx.fillRect(b.x, b.y, 6, 2);

  // Check collision with enemies
  enemies.forEach((e, ei) => {
    if (b.x < e.x + e.size &&
        b.x + 6 > e.x &&
        b.y < e.y + e.size &&
        b.y + 2 > e.y) {
      e.health -= 1;           // reduce enemy health
      bullets.splice(bi, 1);   // destroy bullet
      if (e.health <= 0) {
        enemies.splice(ei, 1); // destroy enemy
      }
    }
  });

  // Remove bullets leaving screen
  if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y > canvas.height) {
    bullets.splice(bi, 1);
  }
});

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

  let lastPartnerShot = 0;
const partnerFireRate = 500; // ms

function update() {
  // --- Movement code here remains the same ---

  // --- Partner shooting ---
  const now = Date.now();
  if (enemies.length > 0 && now - lastPartnerShot > partnerFireRate) {
    // Find nearest enemy
    let nearest = enemies[0];
    let minDist = Math.hypot(nearest.x - partner.x, nearest.y - partner.y);
    enemies.forEach(e => {
      const d = Math.hypot(e.x - partner.x, e.y - partner.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });

    // Shoot bullet toward nearest enemy
    const angle = Math.atan2(nearest.y - partner.y, nearest.x - partner.x);
    bullets.push({
      x: partner.x + partner.size / 2,
      y: partner.y + partner.size / 2,
      dx: Math.cos(angle) * 8,
      dy: Math.sin(angle) * 8
    });

    lastPartnerShot = now;
  }

  // --- Clear screen, draw player, partner, bullets, enemies ---
  // (same as before)

  requestAnimationFrame(update);
}

  requestAnimationFrame(update);
}

// Start game
update();
