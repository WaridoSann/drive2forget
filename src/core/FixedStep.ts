export class FixedStep {
  accumulator=0;
  constructor(readonly dt=1/120,readonly maxSteps=8){}
  advance(elapsed:number,step:(dt:number)=>void){this.accumulator+=Math.min(Math.max(elapsed,0),this.dt*this.maxSteps);let steps=0;while(this.accumulator+1e-10>=this.dt&&steps<this.maxSteps){step(this.dt);this.accumulator=Math.max(0,this.accumulator-this.dt);steps++;}return this.accumulator/this.dt;}
  reset(){this.accumulator=0;}
}
