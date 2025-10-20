<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Top Down Shooter - Working Base</title>
  <style>
    body { margin: 0; overflow: hidden; background: black; }
    canvas { display: block; margin: auto; background: #111; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>

  <script>
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 600;

    const player = { x: 400, y: 300, size: 25, color: "lime", speed: 5 };
    const bullets = [];
    const enemies = [];
    const keys = {};

    // Spawn a few enemies in fixed positions so they're always visible
    enemies.push({ x: 100, y: 100, size: 25, color: "red", health: 3 });
    enemies.push({ x: 600, y: 150, size: 25, color: "red", health: 3 });
    enemies.push({ x: 300, y: 400, size: 25, color: "red", health: 3 });

    // --- Controls ---
    window.addEventListener("keydown", e => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === " ") shoot();
    });
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

    function shoot() {
      bullets.push({
        x: player.x + player.size / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        dy: -8
      });
    }

    // --- Update Loop ---
    function update() {
      // Movement
      if (keys["w"]) player.y -= player.speed;
      if (keys["s"]) player.y += player.speed;
      if (keys["a"]) player.x -= player.speed;
      if (keys["d"]) player.x += player.speed;

      // Keep on screen
      player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

      // Move bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].dy;
        if (bullets[i].y < 0) bullets.splice(i, 1);
      }

      // Collision check
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (b.x < e.x + e.size &&
              b.x + b.width > e.x &&
              b.y < e.y + e.size &&
              b.y + b.height > e.y) {
            e.health--;
            bullets.splice(j, 1);
            if (e.health <= 0) enemies.splice(i, 1);
            break;
          }
        }
      }

      draw();
      requestAnimationFrame(update);
    }

    // --- Draw Everything ---
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Player
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.size, player.size);

      // Bullets
      ctx.fillStyle = "yellow";
      bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

      // Enemies
      enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.size, e.size);
      });
    }

    update();
  </script>
</body>
</html>
