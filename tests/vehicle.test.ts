import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { VehiclePhysics, type VehicleInput } from '../src/vehicle/VehiclePhysics';
const idle:VehicleInput={throttle:0,brake:0,steer:0,handbrake:false};
beforeAll(async()=>{await RAPIER.init();});
function setup(){
 const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/120;
 world.createCollider(RAPIER.ColliderDesc.cuboid(500,.5,1000).setTranslation(0,-.5,0).setFriction(1.08));
 const vehicle=new VehiclePhysics(world,{x:0,y:.9,z:0});
 return {world,vehicle};
}
function tick(world:RAPIER.World,vehicle:VehiclePhysics,seconds:number,input=idle){
 for(let i=0;i<Math.round(seconds*120);i++){vehicle.step(1/120,input);world.step();vehicle.afterStep();}
}
describe('physical vehicle on an actual Rapier road',()=>{
 it('settles on four independent suspension contacts and remains still',()=>{
 const{world,vehicle}=setup();tick(world,vehicle,5);
 expect(vehicle.groundedWheels).toBe(4);expect(vehicle.body.translation().y).toBeGreaterThan(.65);expect(vehicle.body.translation().y).toBeLessThan(.9);
 expect(Math.abs(vehicle.speedKmh)).toBeLessThan(.1);
 const p={...vehicle.body.translation()};tick(world,vehicle,8);expect(vehicle.body.translation().z).toBeCloseTo(p.z,3);expect(vehicle.rpm).toBeCloseTo(800,0);world.free();
 });
 it('accelerates by tire forces and stops progressively under braking',()=>{
 const{world,vehicle}=setup();tick(world,vehicle,2);tick(world,vehicle,4,{...idle,throttle:1});
 expect(vehicle.speedKmh).toBeGreaterThan(55);expect(vehicle.body.translation().z).toBeGreaterThan(25);const speed=vehicle.speedKmh;
 tick(world,vehicle,.25,{...idle,brake:1});expect(vehicle.speedKmh).toBeGreaterThan(10);expect(vehicle.speedKmh).toBeLessThan(speed);
 tick(world,vehicle,2,{...idle,brake:1});expect(Math.abs(vehicle.speedKmh)).toBeLessThan(speed*.45);world.free();
 });
 it('changes front-wheel steering assistance with speed and stays finite in a fast turn',()=>{
 const{world,vehicle}=setup();tick(world,vehicle,2);tick(world,vehicle,.6,{...idle,throttle:.2,steer:1});
 const slowAngle=Math.abs(vehicle.wheels[0].steering);expect(slowAngle).toBeGreaterThan(.35);
 vehicle.reset({x:0,y:.9,z:0});tick(world,vehicle,2);tick(world,vehicle,4,{...idle,throttle:1});
 tick(world,vehicle,1,{...idle,throttle:.3,steer:1});expect(Math.abs(vehicle.wheels[0].steering)).toBeLessThan(slowAngle*.8);
 const p=vehicle.body.translation();expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);expect(p.y).toBeGreaterThan(.4);expect(p.y).toBeLessThan(1.5);world.free();
 });
 it('responds independently to a raised wheel contact',()=>{
 const{world,vehicle}=setup();world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.07,.4).setTranslation(-.81,.07,1.48).setFriction(1.08));
 tick(world,vehicle,3);expect(vehicle.groundedWheels).toBe(4);
 expect(Math.abs(vehicle.wheels[0].compression-vehicle.wheels[1].compression)).toBeGreaterThan(.01);world.free();
 });
 it('selects reverse only after stopping, steers through tire forces, and resets',()=>{
 const{world,vehicle}=setup();tick(world,vehicle,2);tick(world,vehicle,2,{...idle,brake:1});
 expect(vehicle.gear).toBe('R');expect(vehicle.speedKmh).toBeLessThan(-5);
 vehicle.reset({x:0,y:.9,z:0});tick(world,vehicle,2);tick(world,vehicle,3,{...idle,throttle:.5,steer:.5});
 expect(vehicle.body.translation().x).toBeLessThan(-.3);expect(vehicle.body.rotation().y).toBeLessThan(-.02);
 vehicle.reset({x:10,y:.9,z:40});expect(vehicle.speedKmh).toBe(0);expect(vehicle.gear).toBe('1');expect(vehicle.interpolated(.5).position.z).toBe(40);
 vehicle.rebase(32);expect(vehicle.body.translation().z).toBe(8);expect(vehicle.interpolated(.5).position.z).toBe(8);world.free();
 });
});
