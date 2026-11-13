import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/** Critically damped chase camera. Vehicle pose is always read-only. */
export class VehicleCamera {
  private readonly focus=new THREE.Vector3();
  private readonly velocity=new THREE.Vector3();
  private readonly smoothedForward=new THREE.Vector3(0,0,1);
  private readonly desired=new THREE.Vector3();
  private readonly previousPosition=new THREE.Vector3();
  private readonly target=new THREE.Vector3();
  private mode=0;
  private orbitYaw=0;
  private orbitPitch=0;
  private initialized=false;
  constructor(private readonly camera:THREE.PerspectiveCamera,private readonly world:RAPIER.World,private readonly exclude:RAPIER.RigidBody) {}

  update(dt:number,position:THREE.Vector3,quaternion:THREE.Quaternion,speedKmh:number,steer=0):void {
    dt=Math.min(dt,.05);
    if(!this.initialized)this.reset(position,quaternion);
    // Translate the spring's reference frame with the interpolated chassis. This
    // retains the requested chase distance at speed instead of accumulating a
    // second, several-metre lag behind a moving spring target.
    const chassisDelta=position.clone().sub(this.previousPosition);
    this.camera.position.add(chassisDelta);this.focus.add(chassisDelta);this.previousPosition.copy(position);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(quaternion);forward.y=0;forward.normalize();
    if(speedKmh < -5)forward.multiplyScalar(-1);
    this.smoothedForward.lerp(forward,1-Math.exp(-dt*5)).normalize();
    if(Math.abs(speedKmh)>8){this.orbitYaw*=Math.exp(-dt*1.8);this.orbitPitch*=Math.exp(-dt*1.8);}
    const modeSettings=[{distance:7.6,height:2.65,look:1.3},{distance:5.5,height:1.9,look:1.4},{distance:10.8,height:4.1,look:2}];
    const setting=modeSettings[this.mode];
    const heading=Math.atan2(this.smoothedForward.x,this.smoothedForward.z)+this.orbitYaw;
    const distance=setting.distance+Math.min(Math.abs(speedKmh)/180,.7);
    const sideOffset=THREE.MathUtils.clamp(steer,-1,1)*Math.min(Math.abs(speedKmh)/70,1)*.45;
    this.desired.set(position.x-Math.sin(heading)*distance+Math.cos(heading)*sideOffset,position.y+setting.height+this.orbitPitch,position.z-Math.cos(heading)*distance-Math.sin(heading)*sideOffset);
    this.target.copy(position).addScaledVector(this.smoothedForward,setting.look).add(new THREE.Vector3(0,.45,0));
    this.focus.lerp(this.target,1-Math.exp(-dt*9));
    const rayDirection=this.desired.clone().sub(this.target),rayLength=rayDirection.length();rayDirection.normalize();
    const hit=this.world.castRay(new RAPIER.Ray(this.target,rayDirection),rayLength,true,undefined,undefined,undefined,this.exclude);
    if(hit&&hit.timeOfImpact<rayLength)this.desired.copy(this.target).addScaledVector(rayDirection,Math.max(.7,hit.timeOfImpact-.3));
    // Analytic critically damped spring, stable under varying render frame intervals.
    const omega=8.5,decay=Math.exp(-omega*dt);
    const difference=this.camera.position.clone().sub(this.desired);
    const temp=this.velocity.clone().addScaledVector(difference,omega).multiplyScalar(dt);
    this.camera.position.copy(this.desired).add(difference.add(temp).multiplyScalar(decay));
    this.velocity.addScaledVector(temp,-omega).multiplyScalar(decay);
    this.camera.lookAt(this.focus);
    const nextFov=52+Math.min(Math.abs(speedKmh)/180,1)*8;
    this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,nextFov,1-Math.exp(-dt*3));this.camera.updateProjectionMatrix();
  }
  cycle():void {this.mode=(this.mode+1)%3;}
  orbit(deltaX:number,deltaY:number):void {this.orbitYaw-=deltaX*.004;this.orbitPitch=THREE.MathUtils.clamp(this.orbitPitch+deltaY*.009,-1.1,3);}
  reset(position:THREE.Vector3,quaternion:THREE.Quaternion):void {
    this.smoothedForward.set(0,0,1).applyQuaternion(quaternion).setY(0).normalize();
    this.camera.position.copy(position).addScaledVector(this.smoothedForward,-7.6).add(new THREE.Vector3(0,2.65,0));
    this.focus.copy(position).add(new THREE.Vector3(0,.45,0)).addScaledVector(this.smoothedForward,1.3);
    this.previousPosition.copy(position);this.velocity.set(0,0,0);this.orbitYaw=0;this.orbitPitch=0;this.camera.lookAt(this.focus);this.initialized=true;
  }
  rebase(deltaZ:number):void {this.camera.position.z-=deltaZ;this.previousPosition.z-=deltaZ;this.focus.z-=deltaZ;this.desired.z-=deltaZ;this.target.z-=deltaZ;}
}
