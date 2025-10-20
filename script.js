const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Player & Partner ---
let player = { x: canvas.width/2, y: canvas.height/2, size: 20, color: "lime", speed: 5 };
let partner = { x: player.x + 50, y: player.y + 50, size: 15, color: "cyan" };

// --- Bullets & Enemies ---
let bullets = [];
let enemies = [];

// --- Keys & player direction ---
let keys = {};
let playerDir = { dx: 1, dy: 0 }; // default right

// --- Partner shooting ---
let lastPartnerShot = 0;
const partnerFireRate = 500; // ms

// --- Event listeners ---
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  // Player shooting
  if (e.key === " " && (playerDir.dx !== 0 || playerDir.dy !== 0)) {
    bullets.push({
      x: player.x + player.size/2,
      y: player.y + player.size/2,
      dx: playerDir.dx * 10,
      dy: playerDir.dy * 10,
      owner: "player"
    });
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// --- Enemy spawner ---
setInterval(() => {
  enemies.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 20,
    color: "red",
    health: 2
  });
}, 2000);

// --- Game loop ---
function update() {
  // --- Update player movement & direction ---
  let dirX = 0, dirY = 0;
  if (keys["w"]) dirY -= 1;
  if (keys["s"]) dirY += 1;
  if (keys["a"]) dirX -= 1;
  if (keys["d"]) dirX += 1;

  if (dirX !== 0 || dirY !== 0) {
    let mag = Math.hypot(dirX, dirY);
    playerDir = { dx: dirX / mag, dy: dirY / mag }; // normalized
    player.x += playerDir.dx * player.speed;
    player.y += playerDir.dy * player.speed;
  }

  // --- Partner follows player ---
  partner.x += (player.x - partner.x) * 0.05;
  partner.y += (player.y - partner.y) * 0.05;

  // --- Partner auto-shoot ---
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

    const angle = Math.atan2(nearest.y - partner.y, nearest.x - partner.x);
    bullets.push({
      x: partner.x + partner.size/2,
      y: partner.y + partner.size/2,
      dx: Math.cos(angle) * 8,
      dy: Math.sin(angle) * 8,
      owner: "partner"
    });

    lastPartnerShot = now;
  }

  // --- Update bullets ---
  bullets.forEach((b, bi) => {
    b.x += b.dx;
    b.y += b.dy;

    // --- Bullet collision with enemies ---
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.size &&
          b.x + 6 > e.x &&
          b.y < e.y + e.size &&
          b.y + 2 > e.y) {
        e.health -= 1;
        bullets.splice(bi, 1);
        if (e.health <= 0) enemies.splice(ei, 1);
      }
    });

    // Remove bullets leaving screen
    if (b.x > canvas.width || b.x < 0 || b.y > canvas.height || b.y < 0) bullets.splice(bi, 1);
  });

  // --- Draw everything ---
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Partner
  ctx.fillStyle = partner.color;
  ctx.fillRect(partner.x, partner.y, partner.size, partner.size);

  // Enemies
  enemies.forEach(e => {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.size, e.size);
  });

  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.owner === "player" ? "yellow" : "cyan";
    ctx.fillRect(b.x, b.y, 6, 2);
  });

  requestAnimationFrame(update);
}

update();
