const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = { x: canvas.width/2, y: canvas.height/2, size: 20, color: "lime" };
let bullets = [];

window.addEventListener("keydown", e => {
  if (e.code === "Space") bullets.push({ x: player.x, y: player.y, dx: 5, dy: 0 });
});

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  bullets.forEach(b => {
    b.x += b.dx;
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 5, 2);
  });

  requestAnimationFrame(update);
}
update();
