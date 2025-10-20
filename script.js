<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Partner Shooter</title>
  <style>
    body { margin: 0; overflow: hidden; background: black; color: white; }
    #gameCanvas { display: block; background: #111; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script>
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let keys = {};
    let bullets = [];
    let enemies = [];
    let score = 0;
    let wave = 1;
    let player = { x: canvas.width/2, y: canvas.height/2, size: 30, speed: 5, dirX: 0, dirY: -1, health: 100 };

    // AI Partner
    let partner = { x: player.x + 60, y: player.y + 60, size: 20, health: 100 };

    document.addEventListener("keydown", e => keys[e.key] = true);
    document.addEventListener("keyup", e => keys[e.key] = false);

    function shoot() {
      bullets.push({ 
        x: player.x, 
        y: player.y, 
        dx: player.dirX * 10, 
        dy: player.dirY * 10 
      });
    }

    document.addEventListener("click", shoot);

    function spawnEnemies(num) {
      for (let i = 0; i < num; i++) {
        enemies.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height / 2,
          size: 25,
          speed: 2 + Math.random(),
          health: 20 + wave * 5,
          color: "red",
          shootTimer: 0
        });
      }
    }

    function spawnBoss() {
      enemies.push({
        x: canvas.width / 2,
        y: 80,
        size: 80,
        speed: 1.5,
        health: 300 + wave * 100,
        color: "purple",
        shootTimer: 0,
        boss: true
      });
    }

    spawnEnemies(5);

    function update() {
      // Movement
      if (keys["w"]) { player.y -= player.speed; player.dirX = 0; player.dirY = -1; }
      if (keys["s"]) { player.y += player.speed; player.dirX = 0; player.dirY = 1; }
      if (keys["a"]) { player.x -= player.speed; player.dirX = -1; player.dirY = 0; }
      if (keys["d"]) { player.x += player.speed; player.dirX = 1; player.dirY = 0; }

      // Partner follows player
      let dx = player.x - partner.x;
      let dy = player.y - partner.y;
      partner.x += dx * 0.05;
      partner.y += dy * 0.05;

      // Bullets move
      bullets.forEach((b, i) => {
        b.x += b.dx;
        b.y += b.dy;
        // Remove offscreen
        if (b.x < 0 || b.y < 0 || b.x > canvas.width || b.y > canvas.height) bullets.splice(i, 1);
      });

      // Enemy behavior
      enemies.forEach((e, ei) => {
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let dist = Math.hypot(dx, dy);
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;

        // Enemy shooting
        e.shootTimer++;
        if (e.shootTimer > 100) {
          e.shootTimer = 0;
          bullets.push({ x: e.x, y: e.y, dx: dx / dist * 5, dy: dy / dist * 5, enemy: true });
        }

        // Bullet collisions
        bullets.forEach((b, bi) => {
          if (!b.enemy && Math.hypot(b.x - e.x, b.y - e.y) < e.size / 2) {
            e.health -= 20;
            bullets.splice(bi, 1);
            if (e.health <= 0) {
              enemies.splice(ei, 1);
              score += e.boss ? 100 : 10;
            }
          }
        });

        // Enemy hits player
        if (Math.hypot(player.x - e.x, player.y - e.y) < player.size / 2 + e.size / 2) {
          player.health -= 1;
        }
      });

      // Player hit by enemy bullets
      bullets.forEach((b, i) => {
        if (b.enemy && Math.hypot(b.x - player.x, b.y - player.y) < player.size / 2) {
          player.health -= 5;
          bullets.splice(i, 1);
        }
      });

      // Next wave
      if (enemies.length === 0) {
        wave++;
        if (wave % 3 === 0) spawnBoss();
        else spawnEnemies(5 + wave);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Player
      ctx.fillStyle = "lime";
      ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);

      // Partner
      ctx.fillStyle = "cyan";
      ctx.fillRect(partner.x - partner.size/2, partner.y - partner.size/2, partner.size, partner.size);

      // Bullets
      bullets.forEach(b => {
        ctx.fillStyle = b.enemy ? "orange" : "white";
        ctx.fillRect(b.x, b.y, 5, 5);
      });

      // Enemies
      enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);

        // Enemy HP bar
        ctx.fillStyle = "red";
        ctx.fillRect(e.x - e.size/2, e.y - e.size, e.size * (e.health / (e.boss ? 300 + wave * 100 : 20 + wave * 5)), 5);
      });

      // HUD
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.fillText("Health: " + player.health, 20, 30);
      ctx.fillText("Score: " + score, 20, 60);
      ctx.fillText("Wave: " + wave, 20, 90);
    }

    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }

    gameLoop();
  </script>
</body>
</html>
