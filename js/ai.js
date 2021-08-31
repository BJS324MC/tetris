class AI {
  constructor(game, { x = innerWidth / 2, y = innerHeight / 2}) {
    this.x = x;
    this.y = y;
    this.loading=false;
    this.agent = new DQNAgent({
      arch: [
        { inputShape: [4], units: 32, activation: "relu" },
        { units: 32, activation: "relu" },
        { units: 1, activation: "linear" }
            ],
      miniBatchSize: 512,
      minReplaySize: 2000,
      discount: 0.95,
      replayMemorySize: 20000,
      epsilon: 1,
      epsilonDecay: 1 / 1500,
      alpha: 0.01,
    });
    this.actions = [];
    this.epoches = 0;
    this.game = game;
    this.isLearning = false;
    this.moves = true;
    this.currentState = game.stateInfo();
    this.nextState = null;
    this.speed = 1;
    this.garbageActive=false;
  }
  save(name = "model") {
    this.agent.model.save("downloads://" + name);
  }
  update() {
    const game = this.game;
    game.drop();
    if (game.gameOver) {
      this.epoches++;
      game.restart();
      game.target.restart();
      if (this.isLearning) this.agent.train();
      return true;
    };
    return false;
  }
  act() {
    const game = this.game;
    if (this.update()) return true;
    const pairs = game.possibleStatesAndActions(!this.isLearning,this.moves);
    if(!pairs[0].length)return false;
    const index = this.agent.bestStateIndex(pairs[0]),
      nextState = pairs[0][index],
      actions = pairs[1][index];
    if (this.moves) {
      this.actions = actions;
    }
    else {
      game.pos[0] = actions[0];
      game.pos[1] = actions[1];
      game.rotation = actions[2];
    }
    if (this.isLearning) this.learn((game.gameOver ? -1 : 1) 
    + nextState[0] ** 2 * game.width 
    + (this.garbageActive?nextState[4] ** 2 * game.width:0),nextState);
    this.currentState = nextState;
  }
  actLookAhead() {
    const game = this.game;
    if (this.update()) return true;
    const pairs = game.possibleStatesAndActions(!this.isLearning, this.moves);
    if (!pairs[0].length) return false;
    let queue = this.agent.topStateIndices(pairs[0],6),ps=[],pa=[],pi=[];
    queue.map(a=>pairs[2][a]).forEach((a,k)=>{
      let og = JSON.parse(JSON.stringify(game.grid)),
        ol = game.linesCleared,
        ogpos = game.pos.slice(),
        ogp = game.piece,
        ogrot = game.rotation;
      if(a[0].toString()==="() => this.holdPiece()"){
        game.piece = game.hold === null ? game.queue[0] : game.hold;
        game.holdKick();
        a.slice(1).forEach(b=>b());
      }
      else a.forEach(b=>b());
      game.iteratePiece(game.piece, game.rotation, (i, j) => game.grid[j + game.pos[1]][i + game.pos[0]] = game.piece + 1);
      game.clearLines();
      if(a[0].toString()==="() => this.holdPiece()" && game.hold===null)game.piece = game.queue[1];
      else game.piece = game.queue[0];
      game.pos[0]=4;
      game.pos[1] = 0;
      if (game.isLegal()){
        let psa=game.possibleStatesAndActions(!this.isLearning, this.moves);
        psa[0].forEach(g=>g[0]+=pairs[0][k][0])
        ps=ps.concat(psa[0]);
        pa=pa.concat(psa[1]);
        pi=pi.concat(Array(psa[0].length).fill(k));
      }
      game.linesCleared = ol;
      game.grid = og;
      game.pos = ogpos;
      game.rotation = ogrot;
      game.piece = ogp;
    })
    const rs=this.agent.bestStateIndex(ps),
      index=queue[pi[rs]],
      nextState = pairs[0][index],
      actions = pairs[1][index].concat(()=>game.drop()).concat(pa[rs]);
    console.log(pi[rs]);
    if (this.moves) {
      this.actions = actions;
    }
    else {
      game.pos[0] = actions[0];
      game.pos[1] = actions[1];
      game.rotation = actions[2];
    }
    if (this.isLearning) this.learn((game.gameOver ? -1 : 1) +
      nextState[0] ** 2 * game.width +
      (this.garbageActive ? nextState[4] ** 2 * game.width : 0), nextState);
    this.currentState = nextState;
  }
  learn(reward,nextState) {
    const currentState = this.currentState;
    this.agent.updateReplayMemory({
      state: currentState,
      nextState: nextState,
      reward: reward,
      done: this.game.gameOver
    });
  }
  loadModel(name = "model") {
    
    tf.loadLayersModel(
      (location.href==="https://bjs324mc.github.io/tetris/"
      ?"https://bjs324mc.github.io/tetris/models/"
      :"http://localhost:7700/models/") + name + ".json")
      .then(model => {
        this.agent.model = model;
        this.agent.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        this.loading=false;
      });
    this.agent.epsilon = 0;
    //this.isLearning = false;
    this.loading=true;
  }
  doActions(instant = false) {
    if(this.loading)return false;
    let actions = this.actions;
    if (actions.length) {
      if (instant) {
        actions.forEach(a => a());
        this.actions = [];
      }
      else {
        actions.shift()();
        //while(actions[0] && actions[0].toString()==="() => this.drop()")actions.shift()();
      }
    }
    else {
      for (let i = 0; i < this.speed; i++)
        if (this.act()) break;
    }
  }
  draw(ctx) {
    const { game, x, y } = this,
    scoreX = x - game.width / 2 * game.size - 4 * game.size;
    ctx.globalAlpha=0.5;
    game.draw(ctx, x - game.width * game.size / 2, y,startDelay-Date.now()<0);
    ctx.globalAlpha=1;
    ctx.fillStyle = "white"
    ctx.fillText("Loses:" + this.epoches, x - 4 * game.size, (game.height+4) * game.size+y);
    ctx.fillText("Score:" + game.score, x + 4 * game.size, (game.height+4) * game.size+y);
    ctx.fillText(game.text, scoreX, 8 * game.size+y);
    ctx.fillText(game.getComboText(), scoreX, 10 * game.size+y);
    ctx.fillText(game.getBackToBackText(), scoreX, 12 * game.size+y);
  }
}