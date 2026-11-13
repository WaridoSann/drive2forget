import {describe,it,expect} from 'vitest';
import {FixedStep} from '../src/core/FixedStep';
describe('fixed timestep',()=>{
 it('bounds catch-up after a long frame',()=>{const clock=new FixedStep();let steps=0;clock.advance(8,()=>steps++);expect(steps).toBe(8);expect(clock.accumulator).toBeLessThan(clock.dt);});
 it('produces the same simulation time at different render rates',()=>{for(const fps of [30,60,144]){const clock=new FixedStep();let simulation=0;for(let f=0;f<fps*2;f++)clock.advance(1/fps,dt=>simulation+=dt);expect(simulation).toBeCloseTo(2,2);}});
});
