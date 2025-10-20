<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Top Down Shooter</title>
  <style>
    body { margin: 0; overflow: hidden; background: black; }
    canvas { display: block; margin: 0 auto; background: #000; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>

  <script>
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const player = { x: 400, y: 300, size: 30, color: "lime", speed: 5 };
    const bullets = [];
    const enemies = [];
    let keys = {};

    // Spawn enemies
    function spawnEnemy() {
      enemies.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 20,
        color: "red",
        health: 3
      });
    }

    for (let i = 0; i < 5; i++) spawnEnemy();

    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === " ") shoot();
    });

    window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    function shoot() {
      bullets.push({
        x: player.x + player.size / 2,
        y: player.y + player.size / 2,
        dx: 0,
        dy: -10,
        width: 4,
        height: 10,
      });
    }

    function update() {
      // Move player
      if (keys["w"]) player.y -= player.speed;
      if (keys["s"]) player.y += player.speed;
      if (keys["a"]) player.x -= player.speed;
      if (keys["d"]) player.x += player.speed;

      // Move bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].dy;
        if (bullets[i].y < 0) bullets.splice(i, 1);
      }

      // Bullet-enemy collisions
      for (let i = enemies.length - 1; i >= 0; i--) {
        for (let j = bullets.length - 1; j >= 0; j--) {
          const e = enemies[i], b = bullets[j];
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

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.size, player.size);

      bullets.forEach(b => {
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.width, b.height);
      });

      enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.size, e.size);
      });

      requestAnimationFrame(update);
    }

    update();
  </script>
</body>
</html>
