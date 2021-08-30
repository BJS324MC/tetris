const shape = [
  [0x8C40, 0x6C00, 0x8C40, 0x6C00], // 'Z'
  [0x44C0, 0x8E00, 0xC880, 0xE200], // 'L'
  [0x4C80, 0xC600, 0x4C80, 0xC600], // 'S'
  [0xCC00, 0xCC00, 0xCC00, 0xCC00], // 'O'
  [0x4640, 0x0E40, 0x4C40, 0x4E00], // 'T'
  [0x88C0, 0xE800, 0xC440, 0x2E00], // 'J'
  [0x4444, 0x0F00, 0x4444, 0x0F00] // 'I'
];

function fy(a, b, c, d) {
  c = a.length;
  while (c) b = Math.random() * (--c + 1) | 0, d = a[c], a[c] = a[b], a[b] = d
}

class Board {
  constructor(width = 10, height = 20, size = 50) {
    this.width = width;
    this.height = height;
    this.size = size;
    this.grid = Array.from({ length: height+2 }, b => Array.from({length:width},d=>0));
    this.center = true;
    this.target = null;
    this.garbageActive=false;
    this.colors = {
      0: "black",
      1: "red",
      2: "orange",
      3: "yellow",
      4: "green",
      5: "blue",
      6: "purple",
      7: "white",
      8: "grey"
    };
    this.lineScore = {
      0: 0,
      1: 100,
      2: 300,
      3: 500,
      4: 800
    };
    this.lineGarbage = {
      0: 0,
      1: 0,
      2: 1,
      3: 2,
      4: 4
    }
    this.tSpinScore = {
      0: 400,
      1: 800,
      2: 1200,
      3: 1600
    };
    this.tSpinGarbage = {
      0: 0,
      1: 2,
      2: 4,
      3: 6
    }
    this.comboGarbage = {
      /*
       * @see This table is taken from
       * @link https://tetris.wiki/Combo
       */
      0: 0,
      1: 0,
      2: 1,
      3: 1,
      4: 2,
      5: 2,
      6: 2,
      7: 3,
      8: 3,
      9: 3,
      10: 3,
      11: 3,
      12: 3,
      13: 4
    };
    this.text = "";
    this.scoreText = "";
    this.backToBack = false;
    this.score = 0;
    this.combo = -1;
    this.gameOver = false;
    this.hold = null;
    this.queue = [];
    this.fillerQueue = [];
    this.pos = [Math.floor(width / 2), 0];
    this.piece = 0;
    this.rotation = 0;
    this.dropDelay = 500;
    this.lockDelay = 500;
    this.delay = Date.now() + this.dropDelay;
    this.generateQueue();
    this.refillQueue();
    this.tests = {
      "01": [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
      "10": [[1, 0], [1, 1], [0, -2], [1, -2]],
      "12": [[1, 0], [1, 1], [0, -2], [1, -2]],
      "21": [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
      "23": [[1, 0], [1, -1], [0, 2], [-1, 2]],
      "32": [[-1, 0], [-1, 1], [0, -2], [1, -2]],
      "30": [[-1, 0], [-1, 1], [0, -2], [1, -2]],
      "03": [[1, 0], [1, -1], [0, 2], [-1, 2]]
    }
    this.itests = {
      "01": [[-2, 0], [1, 0], [-2, -1], [1, 2]],
      "10": [[2, 0], [-1, 0], [2, 1], [-1, -2]],
      "12": [[-1, 0], [2, 0], [-1, 2], [2, -1]],
      "21": [[1, 0], [-2, 0], [1, -2], [-2, 1]],
      "23": [[2, 0], [1, 0], [2, 1], [1, 2]],
      "32": [[-2, 0], [-1, 0], [-2, -1], [-1, -2]],
      "30": [[1, 0], [-2, 0], [1, -2], [-2, 1]],
      "03": [[-1, 0], [2, 0], [-1, 2], [2, -1]]
    }
    this.linesCleared = 0;
  }
  draw(ctx, x = 0, y = 0) {
    let { width, height, size, colors, pos } = this,
    piece = shape[this.piece][this.rotation],
      ghostPos = this.ghostDrop();
    for (let i = 0; i < width; i += 1)
      for (let j = 0; j < height; j += 1) {
        let gj=this.grid[j+2];
        if(!gj)continue;
        ctx.fillStyle = colors[gj[i]];
        ctx.fillRect(x + i * size, y + j * size, size, size);
      }
    this.drawQueue(ctx, x + width * size + 50, y);
    this.drawHold(ctx, x - size * 4 - 50, y);
    if (this.gameOver) return;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if (piece & (0x8000 >> (i * 4 + j)))
          ctx.fillRect(x + (i + ghostPos[0]) * size, y + (j + ghostPos[1]-2) * size, size, size);
      }
    ctx.fillStyle = colors[this.piece + 1];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if (piece & (0x8000 >> (i * 4 + j)))
          ctx.fillRect(x + (i + this.pos[0]) * size, y + (j + this.pos[1]-2) * size, size, size);
      }
    ctx.globalAlpha=1;
    this.drawInfo(ctx, x + (this.center ? width * size / 2 : 0), y + height * size + 50);
  }
  drawHold(ctx, x, y) {
    let size = this.size / 1.2;
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, 6 * size, 6 * size);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(x + size, y + size, size * 4, size * 4);
    if (this.hold === null) return;
    let piece = shape[this.hold][0],
      n = this.hold === 3 ? 1 : this.hold === 6 ? 0 : 0.5,
      h = this.hold === 4 ? 0 : this.hold === 6 ? 0.5 : 1;
    ctx.fillStyle = this.colors[this.hold + 1];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if (piece & (0x8000 >> (i * 4 + j)))
          ctx.fillRect((i + 1 + n) * size + x, (j + 1 + h) * size + y, size, size);
      }
  }
  drawQueue(ctx, x, y) {
    let { colors, size } = this;
    size = size / 1.2
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, 6 * size, 5 * size * this.queue.length + size);
    for (let m = 0; m < this.queue.length; m++) {
      let piece = shape[this.queue[m]][0],
        n = this.queue[m] === 3 ? 1 : this.queue[m] === 6 ? 0 : 0.5,
        h = this.queue[m] === 4 ? 0 : this.queue[m] === 6 ? 0.5 : 1;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x + size, y + (1 + m * 5) * size, size * 4, size * 4)
      ctx.fillStyle = colors[this.queue[m] + 1];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          if (piece & (0x8000 >> (i * 4 + j)))
            ctx.fillRect((i + 1 + n) * size + x, (j + 1 + m * 5 + h) * size + y, size, size);
        }
    }
  }
  drawInfo(ctx, x, y) {
    ctx.fillStyle = "white";
    ctx.font = this.size + "px Roboto Mono";
    ctx.textAlign = this.center ? "center" : "left";
    ctx.fillText("Lines Cleared: " + this.linesCleared, x, y)
  }
  getLineClearText(lines = 0, isTSpin = false) {
    let lineNames = {
        0: "",
        1: "Single",
        2: "Double",
        3: "Triple",
        4: "Tetris"
      },
      tSpinNames = {
        0: "T-Spin",
        1: "T-Spin Single",
        2: "T-Spin Double",
        3: "T-Spin Triple"
      }
    return (isTSpin ? tSpinNames : lineNames)[lines];
  }
  getComboText() {
    return this.combo > 0 ? "Combo x" + this.combo : "";
  }
  getBackToBackText() {
    return this.backToBack && this.combo > 0 ? "Back To Back x" + this.combo : "";
  }
  pileGarbage(game, lines = 0, isTSpin = false) {
    if (!game) return false;
    let total = (isTSpin ? this.tSpinGarbage[lines] : this.lineGarbage[lines]) +
      this.comboGarbage[Math.max(0, this.combo)],
      empty = Math.floor(Math.random() * game.width);
    for (let i = 0; i < total; i++) {
      let shifted=game.grid.shift();
      let line = Array.from({ length: game.width }, a => 8);
      line.splice(empty, 1, 0);
      game.grid.push(line);
      if (shifted.some(a => a !== 0) || game.toppedOut()) {
        game.gameOver = true;
        break;
      }
      if(!game.isLegal()){
        game.pos[1]--;
        if(!game.isLegal())game.gameOver=true;
      }
    }
  }
  generateQueue() {
    this.queue = Array.from({ length: 7 }, (a, i) => i);
    fy(this.queue);
    this.piece = this.queue.shift();
  }
  refillQueue() {
    this.fillerQueue = Array.from({ length: 7 }, (a, i) => i);
    fy(this.fillerQueue);
  }
  resetDelay() {
    this.delay = Date.now() + this.dropDelay;
  }
  shiftPiece() {
    this.piece = this.queue.shift();
    this.queue.push(this.fillerQueue.shift());
    if (!this.fillerQueue.length) this.refillQueue();
  }
  restart() {
    this.linesCleared = 0;
    this.gameOver = false;
    this.grid = Array.from({ length: this.height+2 }, a => Array.from({length:this.width},a=>0));
    this.pos = [Math.floor(this.width / 2), 0];
    this.score = 0;
    this.backToBack = false;
  }
  iteratePiece(p = this.piece, r = this.rotation, f = () => 0) {
    let piece = shape[p][r];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if (piece & (0x8000 >> (i * 4 + j))) f(i, j);
      }
  }
  lockPiece() {
    if (this.gameOver) return false;
    let names = {
        0: "",
        1: " Single",
        2: " Double",
        3: " Triple"
      },
      isTSpin = this.tSpin();
    this.iteratePiece(this.piece, this.rotation, (i, j) => this.grid[j + this.pos[1]][i + this.pos[0]] = this.piece + 1);
    this.pos = [Math.floor(this.width/2)-1,0];
    this.shiftPiece();
    let lines = this.clearLines();
    if (isTSpin && lines > 0) {
      if (this.backToBack) this.pileGarbage(this.target, lines, isTSpin);
      else this.backToBack = true;
    }
    else if (lines === 4) {
      if (this.backToBack) this.pileGarbage(this.target, lines, isTSpin);
      else this.backToBack = true;
    }
    else this.backToBack = false;

    this.updateScore(lines, isTSpin);
    if (lines > 0) {
      this.pileGarbage(this.target, lines, isTSpin);
    }
    this.text = this.getLineClearText(lines, isTSpin);
    if (!this.isLegal()) {
      this.gameOver = true;
    };
  }
  updateScore(lines = 0, isTSpin = false) {
    this.score += isTSpin ? this.tSpinScore[lines] : this.lineScore[lines] + (50 * Math.max(0, this.combo));
  }
  clearLines() {
    let { grid, width, height } = this,
    cleared = false,
      ln = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i].every(a => a !== 0)) {
        cleared = true;
        grid.splice(i, 1);
        grid.unshift(Array(width).fill(0));
        this.linesCleared++;
        ln++;
      }
    }
    this.combo = cleared ? this.combo + 1 : -1;
    return ln;
  }
  holdPiece() {
    if (this.hold === null) {
      this.hold = this.piece;
      this.pos[1] = 0;
      this.shiftPiece();
    }
    else {
      this.piece += this.hold;
      this.hold = this.piece - this.hold;
      this.piece -= this.hold;
      this.pos[1] = 0;
    }
    this.holdKick();
  }
  wallKick(testSet) {
    for (let test of testSet) {
      this.pos[0] += test[0];
      this.pos[1] += test[1];
      if (this.isLegal()) {
        this.infinity();
        return true;
      }
      else {
        this.pos[0] -= test[0];
        this.pos[1] -= test[1];
      }
    };
    return false;
  }
  holdKick() {
    if (!this.isLegal()) {
      this.pos[0] -= 1;
      if (!this.isLegal()) {
        this.pos[0] += 2;
        if (!this.isLegal()) {
          this.pos[0] -= 3;
          if (!this.isLegal()) this.pos[0] += 4;
        };
      }
    };
  }
  rotate(counter = false) {
    let og = this.rotation;
    this.rotation = (this.rotation + (counter ? 3 : 1)) % 4;
    if (!this.isLegal()) {
      let testSet = this[this.piece === 6 ? "itests" : "tests"][og + "" + this.rotation];
      if (!this.wallKick(testSet)) {
        this.rotation = og;
        return false;
      }
      else this.infinity();
    }
    else this.infinity();
    return true;
  }
  toppedOut(){
    return this.grid[0].some(a=>a!==0) || this.grid[1].some(a=>a!==0);
  }
  isLegal(grid = this.grid, pos = this.pos, piec = this.piece, rotation = this.rotation) {
    let piece = shape[piec][rotation];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        if ((piece & (0x8000 >> (i * 4 + j))) &&
          (!grid[j + pos[1]] ||
            typeof grid[j + pos[1]][i + pos[0]] === "undefined" ||
            grid[j + pos[1]][i + pos[0]] !== 0)) {
          return false;
        }
      }
    return true;
  }
  drop(freeze = true) {
    this.pos[1]++;
    if (!this.isLegal()) {
      this.pos[1]--;
      if (freeze) this.lockPiece();
      return false;
    }else this.resetDelay();
    return true;
  }
  ghostDrop() {
    let ogPos = this.pos.slice();
    while (this.isLegal()) {
      this.pos[1]++;
    }
    this.pos[1]--;
    let ghostPos = this.pos.slice();
    this.pos = ogPos;
    return ghostPos;
  }
  tSpin(pos = this.pos,rot=this.rotation) {
    if (this.piece !== 4) return false;
    for (let move of [[0, -1], [1, 0], [-1, 0]]) {
      if (this.isLegal(this.grid, [pos[0] + move[0], pos[1] + move[1]], 4, rot))
        return false;
    }
    return true;
  }
  hardDrop() {
    while (this.drop()); // This while loop trick developers hate
  }
  move(right = true) {
    this.pos[0] += right ? 1 : -1;
    if (!this.isLegal()) {
      this.pos[0] += right ? -1 : 1;
      return false;
    }
    else this.infinity();
    return true;
  }
  infinity() {
    if (this.ghostDrop()[1] === this.pos[1])
      this.delay = Date.now() + this.lockDelay;
  }
  stateInfo(pos = this.pos, rot = this.rotation) {
    let copy = JSON.parse(JSON.stringify(this.grid));
    this.iteratePiece(this.piece, rot, (i, j) => copy[j + pos[1]][i + pos[0]] = this.piece + 1);
    let totalHeight = 0,
      holes = 0,
      bumpiness = 0,
      lines = 0,
      garbage = 0,
      heights = Array(this.width).fill(0),
      holed = [],
      bumps = [];
    copy.forEach((a, i) => {
      if (a.every(b => b > 0)) lines++;
      a.forEach((b, j) => {
        if (b === 0) {
          if (copy[i - 1] && (copy[i - 1][j] !== 0 || holed.includes((i - 1) + "," + j))) {
            holes++;
            holed.push(i + "," + j);
          };
        }
        else {
          heights[j]++;
        }
      })
    });
    totalHeight = heights.reduce((t, a) => t + a);
    heights.forEach((a, i) => i + 1 === heights.length ? 0 : bumps.push(Math.abs(a - heights[i + 1])))
    bumpiness = bumps.reduce((t, a) => t + a);
    if(this.garbageActive)
      garbage=(this.tSpin(pos,rot) ? this.tSpinGarbage[lines] : this.lineGarbage[lines]) +
    this.comboGarbage[Math.max(0, this.combo)];
    return [lines * (this.tSpin(pos, rot) ? 2 : lines<3 && totalHeight<50 ? -1 : 1), totalHeight, holes, bumpiness].concat(this.garbageActive?[garbage]:[]);
  }
  possibleStatesAndActions(hold = false, move = true) {
    let finals = this.getPossibleMoves(),
      states = [],
      actions = [];
    finals.forEach(a => {
      let state = this.stateInfo([a.x, a.y], a.rot);
      states.push(state);
      actions.push(move ? a.moves : [a.x, a.y, a.rot, () => 0]);
    });
    if (hold) {
      let p = this.piece,
        pd = this.pos.slice();
      this.piece = this.hold === null ? this.queue[0] : this.hold;
      this.holdKick();
      let finals2 = this.getPossibleMoves();
      finals2.forEach(a => {
        let state = this.stateInfo([a.x, a.y], a.rot);
        states.push(state);
        actions.push(move ? [() => this.holdPiece(), ...a.moves] : [a.x, a.y, a.rot, ()=>this.holdPiece()]);
      });
      this.piece = p;
      this.pos = pd;
    }
    return [states, actions];
  }
  getPossibleMoves() {
    const move = {
      "0,0,-1": () => this.rotate(true),
      "0,0,1": () => this.rotate(false),
      "0,1,0": () => this.drop(),
      "1,0,0": () => this.move(true),
      "-1,0,0": () => this.move(false)
    };
    let start_node = new Node(this.pos[0], this.pos[1], this.rotation),
      frontier = [start_node],
      visited = {[start_node.hash]: true },
      final_nodes = [];
    while (frontier.length > 0) {
      let n = frontier.pop();
      for (let m of [[0, 0, -1], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0]]) {
        let [dx, dy, rot] = m,
        nn = new Node(n.x + dx, n.y + dy, (n.rot + rot + 4) % 4);
        nn.moves = n.moves.slice();
        nn.moves.push(move[m]);
        if (!(nn.hash in visited)) {
          visited[nn.hash] = true;
          if (this.isLegal(this.grid, [nn.x, nn.y], this.piece, nn.rot)) {
            frontier.push(nn);
            if (!this.isLegal(this.grid, [nn.x, nn.y + 1], this.piece, nn.rot)) {
              nn.final = true;
              final_nodes.push(nn);
            }
          }
        }
      }
    }
    return final_nodes;
  }
  frame(ctx, x = 0, y = 0) {
    //this.draw(ctx, x, y);
    if (Date.now() >= this.delay) {
      this.resetDelay();
      this.drop();
    };
  }
}
class Node {
  constructor(x = 0, y = 0, rot = 0) {
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.moves = [];
    this.final = false;
    this.hash = x + "," + y + "," + rot;
  }
  key(){
    return this.x+","+this.y+","+this.rot;
  }
}