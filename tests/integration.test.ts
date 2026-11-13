import { beforeAll, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Scene, Texture, Vector3 } from 'three';
import { VehiclePhysics } from '../src/vehicle/VehiclePhysics';
import { WorldManager } from '../src/world/WorldManager';

beforeAll(async () => { await RAPIER.init(); });
const dt=1/120;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

it('drives over 3 km on streamed road colliders through origin rebases without losing support or growing resources',()=>{
 const physics=new RAPIER.World({x:0,y:-9.81,z:0});physics.timestep=dt;
 const texture=new Texture();const material={map:texture,normalMap:texture,roughnessMap:texture};
 const scene=new Scene();const manager=new WorldManager(scene,physics,{asphalt:material,ground:material},42,'low');
 const start=manager.road.sample(0);
 const vehicle=new VehiclePhysics(physics,{x:start.x+1.5,y:start.y+.9,z:0});
 vehicle.reset({x:start.x+1.5,y:start.y+.9,z:0},Math.atan2(start.tangent.x,start.tangent.z));
 let origin=0,rebases=0,maxChunks=0,maxColliders=0,maxLaneError=0,unsupportedSteps=0,steps=0;
 const visitedChunks=new Set<number>();const settled={throttle:0,brake:0,steer:0,handbrake:false};
 try {
  for(let i=0;i<240;i++){vehicle.step(dt,settled);physics.step();vehicle.afterStep();}
  expect(vehicle.groundedWheels).toBe(4);
  // A test-only pure-pursuit driver changes controls. It never edits the body pose or velocity.
  while(vehicle.body.translation().z+origin<3100 && steps<120*240){
   const p=vehicle.body.translation();const globalZ=p.z+origin;const speed=vehicle.speedKmh/3.6;
   const lookAhead=18+Math.max(0,speed)*.4;
   const target=manager.road.sample(globalZ+lookAhead);
   const bodyRotation=vehicle.body.rotation();const q=new Quaternion(bodyRotation.x,bodyRotation.y,bodyRotation.z,bodyRotation.w);
   const forward=new Vector3(0,0,1).applyQuaternion(q);
   const heading=Math.atan2(forward.x,forward.z);const desired=Math.atan2(target.x+1.5-p.x,lookAhead);
   const headingError=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
   const wheelAngle=Math.atan2(2*2.96*Math.sin(headingError),lookAhead);
   const steerLimit=.105+(.48-.105)/(1+(Math.abs(speed)/16)**2);
   const steer=clamp(-wheelAngle/steerLimit,-1,1);
   const speedError=20-speed;
   vehicle.step(dt,{throttle:clamp(speedError*.2,0,.8),brake:clamp(-speedError*.12,0,.3),steer,handbrake:false});
   // Rebase after wheel queries, before Rapier's step refreshes its broad phase.
   // Rebasing after world.step leaves the next frame's rays querying stale spatial bounds.
   if(Math.abs(vehicle.body.translation().z)>1536){
    const delta=Math.trunc(vehicle.body.translation().z/768)*768;
    origin+=delta;manager.rebase(delta);vehicle.rebase(delta);rebases++;
   }
   physics.step();vehicle.afterStep();steps++;
   if(vehicle.groundedWheels===0)unsupportedSteps++;
   if(steps%2===0)manager.update(vehicle.body.translation().z+origin,1,origin);
   maxChunks=Math.max(maxChunks,manager.chunkCount);maxColliders=Math.max(maxColliders,physics.colliders.len());
   if(steps%120===0){
    const at=vehicle.body.translation();const station=at.z+origin;const road=manager.road.sample(station);
    visitedChunks.add(Math.floor(station/manager.chunkSize));
    maxLaneError=Math.max(maxLaneError,Math.abs(at.x-road.x-1.5));
    expect([at.x,at.y,at.z,vehicle.speedKmh].every(Number.isFinite)).toBe(true);
    expect(at.y-road.y).toBeGreaterThan(.5);expect(at.y-road.y).toBeLessThan(1.2);
    expect(manager.chunks.has(Math.floor(station/manager.chunkSize))).toBe(true);
    expect(manager.chunkCount).toBeLessThanOrEqual(9);
   }
  }
  expect(vehicle.body.translation().z+origin).toBeGreaterThanOrEqual(3100);
  expect(visitedChunks.size).toBeGreaterThanOrEqual(32);expect(rebases).toBeGreaterThanOrEqual(2);
  expect(unsupportedSteps).toBe(0);expect(maxLaneError).toBeLessThan(.65);
  expect(maxChunks).toBeLessThanOrEqual(9);expect(maxColliders).toBeLessThan(600);
  expect(physics.colliders.len()).toBeLessThanOrEqual(maxColliders);
  // Chassis equilibrium and wheel mesh origin use the same dimensions as rendering.
  const wheel=vehicle.wheels[0];const centerY=wheel.localPosition.y-wheel.suspensionLength;
  expect(centerY).toBeGreaterThan(-.52);expect(centerY).toBeLessThan(-.3);
  console.info('3 km physical integration',JSON.stringify({distance:vehicle.body.translation().z+origin,simulationSeconds:steps*dt,rebases,maxChunks,maxColliders,unsupportedSteps,maxLaneError}));
 } finally {manager.dispose();expect(physics.colliders.len()).toBe(1);physics.free();texture.dispose();}
},60000);
