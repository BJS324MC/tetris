class DQNAgent {
  constructor({ arch, epsilon, epsilonDecay, replayMemorySize, miniBatchSize, minReplaySize,discount }) {
    this.arch = arch;
    this.epsilon = epsilon;
    this.epsilonDecay = epsilonDecay;
    this.replayMemorySize = replayMemorySize;
    this.miniBatchSize = miniBatchSize || 64;
    this.minReplaySize = minReplaySize;
    this.discount = discount;
    this.model = this.createModel();
    this.replayMemory = [];
    this.episodeSteps = 0;
    this.episode = 0;
    this.totalRewards = 0;
    this.totalSteps = 0;
    this.episodeStartTime = Date.now();
  }
  createModel() {
    const model = tf.sequential();
    for (let index = 0; index < this.arch.length; index++) {
      const layer = this.arch[index];
      model.add(tf.layers.dense(layer));
    };
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
  }
  updateReplayMemory(memory) {
    this.replayMemory.push(memory);
    if(this.replayMemory.length>this.replayMemorySize)this.replayMemory.shift();
    this.totalSteps++;
    this.totalRewards += memory.reward;
  }
  predictScores(states) {
    return tf.tidy(() => this.model.predict(tf.tensor(states)).dataSync());
  }
  bestStateIndex(states,score=false) {
    if (Math.random() > this.epsilon) {
      let max, bestState,
      res=this.predictScores(states);
      for(let i in res){
        let val=res[i];
        if(max===undefined || val>max){
          bestState=i;
          max=val;
        }
      }
      return score?max:bestState;
    }
    else {
      return Math.floor(Math.random() * states.length);
    }
  }
  topStateIndices(states,n=5){
    let queue=[], 
    bestStates=[], 
    res = this.predictScores(states);
    for (let i in res) {
      let val = res[i];
      for(let j=0;j<n;j++){
        if(typeof queue[j]==="undefined" || val>queue[j]){
          bestStates.splice(j,0,i);
          queue.splice(j,0,val);
          break;
        }
      }
    }
    return bestStates.slice(0,n);
  }
  async train() {
    if (this.replayMemory.length < this.minReplaySize) 
      return;
    
    let miniBatch = sample(this.replayMemory, this.miniBatchSize),
        nextStates = miniBatch.map((dp) => { return dp.nextState }),
        nextQs = await this.model.predict(tf.tensor(nextStates)).array(),
        X = [],
        Y = [];

    for (let i = 0; i < miniBatch.length; i++) {
      const {state,nextState,reward,done} = miniBatch[i];
      let newQ;

      if (!done) newQ = reward + this.discount * nextQs[i];
      else newQ = reward;

      X.push(state);
      Y.push(newQ);
    }
    await this.model.fit(tf.tensor(X), tf.tensor(Y), { batchSize: this.miniBatchSize, verbose: 0 });
    this.endEpisode();
  }
  endEpisode() {
    //console.log(`Timing: ${(Date.now() - this.episodeStartTime)}  Epsilon: ${this.epsilon}`);
    this.epsilon = this.epsilon - this.epsilonDecay;
    this.episodeSteps = 0;
  }
}
function sample(arr, size) {
  var shuffled = arr.slice(0),
    i = arr.length,
    temp, index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
}