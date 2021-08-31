const canvas = document.getElementById("game");
  ctx = canvas.getContext('2d'),
  rs=(innerWidth+innerHeight)/1998,
  mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent);
canvas.width = innerWidth;
canvas.height = innerHeight;


var game1 = new Board(10, 20, 22*rs),
  game2 = new Board(10, 20, 22*rs),
  ai = new AI(game1, { x: innerWidth / 4, y: 30 }),
  ai2 = new AI(game2, { x: innerWidth / 4 * 3, y: 30 }),
  manager = new ButtonManager();
  

let sources = ["background.jpg", "rotate.png", "rotatecounterclockwise.png", "hold.png", "left.png", "up.png", "right.png", "down.png"],
  imgs = sources.map(() => new Image()),
  ld = 0;
imgs.forEach((a, i) => a.src = "images/" + sources[i]);

var hasKeyboard = !mobile,
  started=false,
  startDelay = 4000;

game1.target = game2;
game2.target = game1;

linkKeyboard(game1);

function loop() {
  requestAnimationFrame(loop);
  ctx.drawImage(imgs[0], 0, 0, innerWidth, innerHeight);
  ai.draw(ctx);
  ai2.draw(ctx);
  if (startDelay - Date.now() > -2000) {
    let dl = startDelay - Date.now(),
      dd = Math.floor(dl / 1000) + 1,
      tx = { 3: 3, 2: 2, 1: 1, 0: "GO" } [dd];
    ctx.fillStyle = "rgba(0,0,0," + (dl / 4000) + ")";
    ctx.font = innerHeight / 4 + "px Roboto Mono";
    ctx.fillRect(0, 0, screen.width, screen.height);
    if (tx) {
      ctx.fillStyle = "rgba(255,255,255," + (((dl<0?1000+dl:dl) % 1000) / 1000) + ")";
      ctx.fillText(tx, screen.width / 2, screen.height / 2);
    }
  }
  if (startDelay > Date.now()) return;
  //ai.doActions();
  ai2.doActions();
  game1.frame();
  if (game1.gameOver) {
    ai.epoches++;
    game1.restart();
  }
  if (!hasKeyboard) {
    manager.draw(ctx);
    manager.handle();
  }
}
//ai.loadModel("s-model");
ai2.loadModel("s-model");
ctx.font = innerHeight / 16 + "px Roboto Mono";
ctx.textAlign = "center";
for (let i = 0; i < 100; i++) setTimeout(a => {
  ld += 0.01
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  ctx.fillStyle = "rgba(255,255,255," + ld + ")"
  ctx.fillText("Click to start", innerWidth / 2, innerHeight / 2);
}, i * 10 + 500);
function start(ios=false) {
  if(started)return false;
  started=true;
  startDelay += Date.now();
  ai.x = innerWidth / 4;
  ai2.x = innerWidth / 4 * 3;
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  addButtons(manager, game1,ios ? screen.height:screen.width,ios?screen.width:screen.height);
  loop();
}
canvas.addEventListener("touchstart",function hd()  {
  canvas.removeEventListener("touchstart",hd);
  setTimeout(a=>!document.fullscreenEnabled && start(true),1000);
});
canvas.addEventListener("click", function handler() {
  canvas.removeEventListener("click", handler);
  canvas.requestFullscreen().catch(err => console.log(err));
  canvas.addEventListener("fullscreenchange", function hand() {
    canvas.removeEventListener("fullscreenchange", hand);
    let orientation = screen.orientation.type;
    if (orientation === "portrait-primary" || orientation === "portrait-secondary") {
      screen.orientation.lock("landscape");
      screen.orientation.addEventListener("change", function ori() {
        screen.orientation.removeEventListener("change", ori);
        setTimeout(start,1000);
      })
    }
    else start();
  });
  canvas.addEventListener("fullscreenerror", function hand() {
    canvas.removeEventListener("fullscreenerror", hand);
    start();
  });
});
var download = function() {
  document.write('<img src="'+canvas.toDataURL()+'"/>');
}