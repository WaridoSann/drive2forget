import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { vehicleConfig as cfg } from '../config/vehicle';
import { Drivetrain } from './Drivetrain';

export interface VehicleInput { throttle: number; brake: number; steer: number; handbrake: boolean; }
export interface WheelState {
  localPosition: Vector3;
  compression: number;
  suspensionLength: number;
  grounded: boolean;
  rotation: number;
  steering: number;
  slip: number;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const v3 = (v: {x:number;y:number;z:number}) => new Vector3(v.x,v.y,v.z);

/** Forces and impulses only during driving. Pose changes are restricted to reset and floating origin. */
export class VehiclePhysics {
  readonly body: RAPIER.RigidBody;
  readonly wheels: WheelState[];
  readonly drivetrain = new Drivetrain();
  private previousPosition = new Vector3();
  private currentPosition = new Vector3();
  private previousQuaternion = new Quaternion();
  private currentQuaternion = new Quaternion();
  private smoothedSteer = 0;
  private settledTime = 0;
  private dt = 1 / 120;
  speedKmh = 0;
  brakeLight = false;

  constructor(readonly world: RAPIER.World, spawn: {x:number;y:number;z:number}) {
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x,spawn.y,spawn.z)
      .setCanSleep(true).setCcdEnabled(true).setAngularDamping(.18)
      .setAdditionalMassProperties(cfg.mass, {x:0,y:cfg.centerOfMassY,z:0}, {x:4200,y:3800,z:1000}, {x:0,y:0,z:0,w:1}));
    world.createCollider(RAPIER.ColliderDesc.cuboid(cfg.halfWidth,.25,cfg.halfLength).setDensity(0).setFriction(.55).setRestitution(.03), this.body);
    this.wheels = [-1,1,-1,1].map((side,i) => ({localPosition:new Vector3(side*cfg.halfTrack,cfg.mountY,i<2?cfg.halfWheelbase:-cfg.halfWheelbase), compression:0,suspensionLength:cfg.suspensionRest,grounded:false,rotation:0,steering:0,slip:0}));
    this.reset(spawn);
  }

  get rpm() { return this.drivetrain.rpm; }
  get gear() { return this.drivetrain.gear; }
  get groundedWheels() { return this.wheels.filter(w=>w.grounded).length; }

  step(dt: number, input: VehicleInput) {
    this.dt = dt;
    this.previousPosition.copy(this.currentPosition);
    this.previousQuaternion.copy(this.currentQuaternion);
    const position = v3(this.body.translation());
    const r = this.body.rotation();
    const quaternion = new Quaternion(r.x,r.y,r.z,r.w);
    const up = new Vector3(0,1,0).applyQuaternion(quaternion);
    const forward = new Vector3(0,0,1).applyQuaternion(quaternion);
    const velocity = v3(this.body.linvel());
    const angularVelocity = v3(this.body.angvel());
    const speed = velocity.dot(forward);
    this.speedKmh = speed * 3.6;
    const active = input.throttle > .001 || input.brake > .001 || input.handbrake;
    if (active) { this.body.wakeUp(); this.settledTime = 0; }
    const power = this.drivetrain.step(dt,speed,input.throttle,input.brake);
    this.brakeLight = power.braking > .05 || input.handbrake;
    const limit = cfg.minSteer + (cfg.maxSteer-cfg.minSteer) / (1 + (Math.abs(speed)/16)**2);
    // With +Z forward, a driver's right turn rotates toward -X (negative yaw).
    this.smoothedSteer += (-clamp(input.steer,-1,1)*limit-this.smoothedSteer) * (1-Math.exp(-dt/cfg.steerTime));
    this.wheels[0].steering = this.wheels[1].steering = this.smoothedSteer;
    if (this.body.isSleeping() && !active) return;

    this.body.resetForces(false);
    this.body.resetTorques(false);
    const normalLoads = [0,0,0,0];
    const surfaceFriction = [cfg.tireFriction as number,cfg.tireFriction as number,cfg.tireFriction as number,cfg.tireFriction as number];
    const contactPoints: (Vector3 | null)[] = [null,null,null,null];
    const contactNormals: Vector3[] = [];
    const down = up.clone().negate();
    const centerOfMass = v3(this.body.worldCom());
    const maxRay = cfg.suspensionRest + cfg.suspensionTravel + cfg.wheelRadius;
    for (let i=0;i<4;i++) {
      const wheel = this.wheels[i];
      const mount = wheel.localPosition.clone().applyQuaternion(quaternion).add(position);
      const hit = this.world.castRayAndGetNormal(new RAPIER.Ray(mount,down),maxRay,true,undefined,undefined,undefined,this.body);
      wheel.grounded = hit !== null && hit.normal.y > .15;
      if (!hit || !wheel.grounded) { wheel.suspensionLength=cfg.suspensionRest+cfg.suspensionTravel; wheel.compression=-cfg.suspensionTravel; continue; }
      const length = clamp(hit.timeOfImpact-cfg.wheelRadius,.08,cfg.suspensionRest+cfg.suspensionTravel);
      wheel.suspensionLength = length;
      wheel.compression = cfg.suspensionRest-length;
      const contact = mount.clone().addScaledVector(down,hit.timeOfImpact);
      const normal = v3(hit.normal).normalize();
      const pointVelocity = angularVelocity.clone().cross(contact.clone().sub(centerOfMass)).add(velocity);
      const normalSpeed = pointVelocity.dot(normal);
      const damping = normalSpeed < 0 ? cfg.compressionDamping : cfg.reboundDamping;
      normalLoads[i] = clamp(wheel.compression*cfg.springRate-normalSpeed*damping,0,18000);
      contactPoints[i] = contact;
      contactNormals[i] = normal;
      surfaceFriction[i] = clamp(hit.collider.friction(),.2,1.5);
    }
    // Axle anti-roll coupling transfers load through physical forces; it never locks body rotation.
    for (const axle of [[0,1],[2,3]]) {
      const [left,right] = axle;
      if (!contactPoints[left] || !contactPoints[right]) continue;
      const transfer = (this.wheels[left].compression-this.wheels[right].compression)*cfg.antiRoll;
      normalLoads[left] = Math.max(0,normalLoads[left]+transfer);
      normalLoads[right] = Math.max(0,normalLoads[right]-transfer);
    }
    for (let i=0;i<4;i++) {
      const contact = contactPoints[i];
      const wheel = this.wheels[i];
      if (!contact) { wheel.rotation += speed / cfg.wheelRadius * dt; continue; }
      const normal = contactNormals[i];
      const pointVelocity = angularVelocity.clone().cross(contact.clone().sub(centerOfMass)).add(velocity);
      const steerQuaternion = new Quaternion().setFromAxisAngle(up,wheel.steering);
      const tireForward = forward.clone().applyQuaternion(steerQuaternion).addScaledVector(normal,-forward.clone().applyQuaternion(steerQuaternion).dot(normal)).normalize();
      const tireRight = normal.clone().cross(tireForward).normalize();
      const longitudinalSpeed = pointVelocity.dot(tireForward);
      const lateralSpeed = pointVelocity.dot(tireRight);
      // Surface coefficient comes from the actual road/shoulder collider material.
      const maxGrip = Math.max(10,normalLoads[i]*surfaceFriction[i]);
      const rear = i>=2;
      const brakeForce = power.braking*cfg.brakeForce/4 + (input.handbrake&&rear?cfg.parkingBrakeForce/2:0);
      const autoHold = power.demand < .01 && Math.abs(speed)<.4 ? cfg.brakeForce/4 : 0;
      const stopForce = -longitudinalSpeed * cfg.mass / 4 / dt;
      const brakingForce = clamp(stopForce,-brakeForce-autoHold,brakeForce+autoHold);
      const rollingForce = Math.abs(longitudinalSpeed)>.02 ? -Math.sign(longitudinalSpeed)*(normalLoads[i]*cfg.rollingResistance+power.engineBraking/4) : 0;
      const requestedLong = power.driveForce/4+brakingForce+rollingForce;
      const handbrakeGrip = input.handbrake&&rear ? .55 : 1;
      const requestedLat = -lateralSpeed * cfg.lateralStiffness * handbrakeGrip;
      // Smooth friction circle approximates combined slip; it permits progressive under/oversteer.
      const demand = Math.hypot(requestedLong,requestedLat)/maxGrip;
      const scale = demand>1 ? 1/demand : 1;
      wheel.slip = Math.max(0,demand-1);
      const force = normal.clone().multiplyScalar(normalLoads[i]).addScaledVector(tireForward,requestedLong*scale).addScaledVector(tireRight,requestedLat*scale);
      this.body.applyImpulseAtPoint(force.multiplyScalar(dt),contact,false);
      wheel.rotation += (longitudinalSpeed / cfg.wheelRadius + Math.sign(power.driveForce)*Math.min(wheel.slip,3)*8)*dt;
    }
    // Aerodynamic drag is a force, not scripted velocity reduction.
    const airForce = velocity.clone().multiplyScalar(-.5*1.225*cfg.dragCoefficientArea*velocity.length()*dt);
    this.body.applyImpulse(airForce,false);
    if (!active && velocity.length()<.04 && angularVelocity.length()<.035 && this.groundedWheels===4) this.settledTime += dt;
    else this.settledTime=0;
    if (this.settledTime>.8) this.body.sleep();
  }

  afterStep() {
    this.currentPosition.copy(v3(this.body.translation()));
    const q=this.body.rotation(); this.currentQuaternion.set(q.x,q.y,q.z,q.w);
    this.speedKmh=v3(this.body.linvel()).dot(new Vector3(0,0,1).applyQuaternion(this.currentQuaternion))*3.6;
  }

  interpolated(alpha: number) {
    return {position:this.previousPosition.clone().lerp(this.currentPosition,clamp(alpha,0,1)),quaternion:this.previousQuaternion.clone().slerp(this.currentQuaternion,clamp(alpha,0,1))};
  }

  reset(position: {x:number;y:number;z:number}, yaw=0) {
    this.body.setTranslation(position,true);
    const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw);
    this.body.setRotation(q,true); this.body.setLinvel({x:0,y:0,z:0},true); this.body.setAngvel({x:0,y:0,z:0},true);
    this.body.resetForces(false); this.body.resetTorques(false);
    this.currentPosition.copy(v3(position)); this.previousPosition.copy(this.currentPosition);
    this.currentQuaternion.copy(q); this.previousQuaternion.copy(q);
    this.smoothedSteer=0; this.settledTime=0; this.speedKmh=0; this.drivetrain.reset();
    for(const wheel of this.wheels) {wheel.rotation=0;wheel.steering=0;wheel.compression=0;wheel.suspensionLength=cfg.suspensionRest;wheel.grounded=false;wheel.slip=0;}
  }

  rebase(deltaZ: number) {
    const p=this.body.translation(); this.body.setTranslation({x:p.x,y:p.y,z:p.z-deltaZ},false);
    this.currentPosition.z-=deltaZ;this.previousPosition.z-=deltaZ;
  }
}
