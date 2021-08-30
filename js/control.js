function linkKeyboard(game) {
  const keys = {
    arrowleft: [false, () => game.move(false)],
    arrowright: [false, () => game.move(true)],
    arrowdown: [false, () => game.drop(false)],
    arrowup: [false, () => game.rotate(false)],
    z: [false, () => game.rotate(true)],
    " ": [false, () => game.hardDrop()],
    shift: [false, () => game.holdPiece()],
    c: [false, () => game.holdPiece()]
  };
  addEventListener("keydown", e => {
    hasKeyboard=true;
    let keyed = keys[e.key.toLowerCase()];
    if (!keyed || keyed[0]) return;
    else e.preventDefault();
    if (e.key.toLowerCase() === "arrowup" ||
      e.key.toLowerCase() === "z" ||
      e.key.toLowerCase() === " " ||
      e.key.toLowerCase() === "shift" ||
      e.key.toLowerCase() === "c") {
      keyed[0] = true;
      return keyed[1]();
    };
    keyed[0] = true;
    setTimeout(function handler() {
      if (keyed[0]) {
        keyed[1]();
        setTimeout(handler, 90 / (e.key.toLowerCase() === "arrowdown" ? 4 : 1));
      };
    }, 0)
  })
  addEventListener("keyup", e => {
    hasKeyboard=true;
    if (keys[e.key.toLowerCase()]) {
      e.preventDefault();
      keys[e.key.toLowerCase()][0] = false
    };
  })
}
class ButtonManager {
  constructor() {
    this.buttons = [];
    this.touches = [];
    this.init();
  }
  init() {
    addEventListener("touchstart", e => this.convertTouches(e.touches));
    addEventListener("touchmove", e => this.convertTouches(e.touches));
    addEventListener("touchend", e => this.convertTouches(e.touches));
  }
  convertTouches(touches) {
    this.touches = [];
    for (let touch of touches) this.touches.push([touch.clientX, touch.clientY]);
    this.handle();
  }
  add(...buttons) {
    this.buttons.push(...buttons);
  }
  draw(ctx) {
    this.buttons.forEach(a => a.draw(ctx));
  }
  handle() {
    for (let button of this.buttons) {
      let hd = true;
      for (let touch of this.touches) {
        if (button.hasCollided(touch[0], touch[1])) {
          if ((!button.hold && button.holded) || button.delay>Date.now()) return false;
          button.touched();
          button.delay=Date.now()+button.holdDelay + ((button.delayed && !button.holded)?100:0);
          button.holded = true;
          hd = false;
          break;
        }
      }
      if (hd) button.holded = false;
    }
  }
}
class Button {
  constructor(touched, image, x, y, r = 50, holdDelay=50,hold = true,delayed=false) {
    this.touched = touched;
    this.image = image;
    this.x = x;
    this.y = y;
    this.r = r*rs;
    this.hold = hold;
    this.holded = false;
    this.holdDelay=holdDelay;
    this.delay=Date.now()+this.holdDelay;
    this.delayed=delayed;
  }
  hasCollided(x, y) {
    return (this.x - x) ** 2 + (this.y - y) ** 2 <= this.r ** 2
  }
  draw(ctx) {
    ctx.fillStyle = "rgba(155,155,155,0.3)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha=0.4;
    if (this.image) ctx.drawImage(this.image, this.x - this.r / 2-10, this.y - this.r / 2-10, this.r+20, this.r+20);
    ctx.globalAlpha=1;
  }
}

function addButtons(manager, game) {
  let off = screen.width * 0.05;
  manager.add(
    new Button(() => game.move(false), imgs[4], screen.width * 0.2 - off, screen.height * 0.7,40,50,true,true),
    new Button(() => game.move(true), imgs[6], screen.width * 0.2 + off, screen.height * 0.7,40,50,true,true),
    new Button(() => game.drop(false), imgs[7], screen.width * 0.2, screen.height * 0.7 + off,40,22),
    new Button(() => game.hardDrop(), imgs[5], screen.width * 0.2, screen.height * 0.7 - off, 40,90,false),
    new Button(() => game.rotate(false),imgs[1],screen.width*0.8+off,screen.height*0.7,40,90,false),
    new Button(() => game.rotate(true),imgs[2],screen.width*0.8,screen.height*0.7+off,40,90,false),
    new Button(() => game.holdPiece(),imgs[3],screen.width*0.8+off,screen.height*0.7-off*2,40,90,false)
  );
}