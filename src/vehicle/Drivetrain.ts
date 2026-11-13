import { vehicleConfig as cfg } from '../config/vehicle';

/** Automatic torque-converter approximation. No idle creep: intentional relaxed-drive auto hold. */
export class Drivetrain {
  rpm = cfg.idleRpm as number;
  gearIndex = 0;
  reverse = false;
  private reverseIntent = 0;
  private shiftTime = 0;
  private throttle = 0;

  get gear(): string { return this.reverse ? 'R' : String(this.gearIndex + 1); }

  step(dt: number, speed: number, accelerator: number, brakeInput: number) {
    const throttle = Math.max(0, Math.min(1, accelerator));
    const brake = Math.max(0, Math.min(1, brakeInput));
    if (!this.reverse && brake > .1 && Math.abs(speed) < .4) {
      this.reverseIntent += dt;
      if (this.reverseIntent > .38) this.reverse = true;
    } else this.reverseIntent = 0;
    if (this.reverse && throttle > .1 && speed > -.7) { this.reverse = false; this.gearIndex = 0; }

    const demand = this.reverse ? brake : throttle;
    this.throttle += (demand - this.throttle) * (1 - Math.exp(-dt * 8));
    this.shiftTime = Math.max(0, this.shiftTime - dt);
    const ratio = this.reverse ? cfg.reverseRatio : cfg.gearRatios[this.gearIndex];
    const wheelRpm = Math.abs(speed) / (2 * Math.PI * cfg.wheelRadius) * 60;
    const coupledRpm = wheelRpm * ratio * cfg.finalDrive;
    const targetRpm = Math.max(cfg.idleRpm + this.throttle * 850, coupledRpm);
    this.rpm += (Math.min(cfg.maxRpm, targetRpm) - this.rpm) * (1 - Math.exp(-dt * 12));
    if (!this.reverse && this.shiftTime === 0) {
      if (this.rpm > 5900 && this.gearIndex < cfg.gearRatios.length - 1) { this.gearIndex++; this.shiftTime = .22; }
      else if (this.rpm < 1700 && this.gearIndex > 0) { this.gearIndex--; this.shiftTime = .15; }
    }
    const torqueFactor = this.rpm < 1800 ? .73 + this.rpm / 1800 * .27 : this.rpm < 5600 ? 1 : Math.max(.56, 1 - (this.rpm - 5600) / 3100);
    const limiter = this.rpm > 6900 ? .1 : 1;
    const shiftFactor = this.shiftTime > 0 ? .32 : 1;
    const actualRatio = this.reverse ? cfg.reverseRatio : cfg.gearRatios[this.gearIndex];
    const driveForce = cfg.maxTorque * torqueFactor * this.throttle * actualRatio * cfg.finalDrive * cfg.efficiency / cfg.wheelRadius * shiftFactor * limiter * (this.reverse ? -1 : 1);
    const braking = this.reverse ? throttle : brake;
    const engineBraking = demand < .02 && Math.abs(speed) > .5 ? Math.min(1300, Math.abs(speed) * 30) : 0;
    return { driveForce, braking, engineBraking, demand };
  }

  reset() { this.rpm = cfg.idleRpm; this.gearIndex = 0; this.reverse = false; this.reverseIntent = 0; this.shiftTime = 0; this.throttle = 0; }
}
