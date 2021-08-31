class Transition {
  constructor(defaultEasing, a, b, f, sec) {
    this.p = defaultEasing;
    this.startTime = 0;
    this.op = {
      a: a,
      b: b,
      f: f,
      sec: sec
    };
    this.ended = false;
    this.onEnd = () => {};
  }
  _bezier(t, p) {
    if (p.length === 1) return p[0];
    let b = [];
    for (let i = 0; i < p.length - 1; i++) b.push([(p[i + 1][0] - p[i][0]) * t + p[i][0], (p[i + 1][1] - p[i][1]) * t + p[i][1]]);
    return this._bezier(t, b);
  }
  update() {
    if (this.ended) return false;
    let { a, b, f, sec } = this.op;
    const time=Date.now()-startTime/sec;
    if (time >= 1) {
      this.ended = true;
      this.onEnd();
    };
    f(typeof this.p === "function" ? this.p(a, b, time) : Array.isArray(this.p) 
      ? (typeof b === "function" ? b() : b).map((c, i) => (c - a[i]) * this._bezier(time, this.p)[1] + a[i]) : false, time, this.ended);
  }
}
class Animator {
  constructor() {
    this.animations = {};
    this.running=[];
    this.defaultEasing=0;
    this.easings = {
      "linear": [],
      "ease": [[0.25, 0.1], [0.25, 1]],
      "ease-in": [[0.37, 0], [0.67, 0]],
      "ease-out": [[0.33, 1], [0.68, 1]],
      "ease-in-out": [[0.65, 0], [0.35, 1]],
      "ease-in-back": [[0.36, 0], [0.66, -0.56]],
      "ease-out-back": [[0.34, 1.56], [0.64, 1]],
      "ease-in-out-back": [[0.68, -0.6], [0.32, 1.6]]
    };
  }
  playAnimation(name) {
    this.running.push(name);
  }
  addAnimation({name,easing=this.defaultEasing,startValue=0,endValue=1,func,duration=1}) {
    this.animations[name]=new Transition(easing,startValue,endValue,func,duration);
    return name;
  }
  updateAnimations(){
    let indices=[];
    this.running.forEach((a,i)=>{
      if(!a.update()){
        indices.push(i);
      };
    });
  }
}