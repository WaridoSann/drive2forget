export type InputAction = 'pause' | 'reset' | 'camera' | 'debug';
export interface InputState {
  throttle: number;
  brake: number;
  /** -1 turns left, +1 turns right. */
  steer: number;
  handbrake: boolean;
}

/** Keyboard AZERTY/QWERTY and standard gamepad input, independent of physics. */
export class InputManager {
  readonly state: InputState = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  onAction?: (action: InputAction) => void;
  private enabled = false;
  private readonly held = new Set<string>();
  private gamepadPauseHeld = false;
  private readonly drivingKeys = new Set([
    'z', 'w', 'arrowup', 's', 'arrowdown', 'q', 'a', 'arrowleft',
    'd', 'arrowright', ' ',
  ]);

  constructor() {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.visibility);
  }

  private isFormFocused(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (
      target.isContentEditable || !!target.closest('input, textarea, select, button, [contenteditable="true"]')
    );
  }

  private keyDown = (event: KeyboardEvent): void => {
    if(event.key==='Escape'){event.preventDefault();if(!event.repeat)this.onAction?.('pause');return;}
    if (this.isFormFocused(event.target)) return;
    const key = event.key.toLowerCase();
    const action: InputAction | undefined = {
      escape: 'pause', r: 'reset', c: 'camera', f3: 'debug',
    }[key] as InputAction | undefined;
    if (action) {
      if (!event.repeat && (this.enabled || action === 'pause' || action === 'debug')) {
        if (key === 'f3') event.preventDefault();
        this.onAction?.(action);
      }
      return;
    }
    if (this.enabled && this.drivingKeys.has(key)) {
      event.preventDefault();
      this.held.add(key);
    }
  };

  private keyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.held.delete(key);
    if (this.enabled && this.drivingKeys.has(key) && !this.isFormFocused(event.target)) {
      event.preventDefault();
    }
  };

  private visibility = (): void => {
    if (document.hidden) this.clear();
  };

  private clear = (): void => {
    this.held.clear();
    Object.assign(this.state, { throttle: 0, brake: 0, steer: 0, handbrake: false });
  };

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.clear();
  }

  /** Poll system actions while the simulation is paused as well. */
  pollActions(): void {
    const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected&&p.mapping==='standard');
    const pressed=!!pad?.buttons[9]?.pressed;
    if(pressed&&!this.gamepadPauseHeld)this.onAction?.('pause');
    this.gamepadPauseHeld=pressed;
  }

  update(dt: number): void {
    if (!this.enabled || document.hidden) return;
    const pressed = (...keys: string[]): boolean => keys.some(key => this.held.has(key));
    let throttle = pressed('w', 'z', 'arrowup') ? 1 : 0;
    let brake = pressed('s', 'arrowdown') ? 1 : 0;
    let steer = Number(pressed('d', 'arrowright')) - Number(pressed('q', 'a', 'arrowleft'));
    let handbrake = pressed(' ');
    const gamepad = Array.from(navigator.getGamepads?.() ?? []).find(pad => pad?.connected && pad.mapping === 'standard');
    if (gamepad) {
      throttle = Math.max(throttle, gamepad.buttons[7]?.value ?? 0);
      brake = Math.max(brake, gamepad.buttons[6]?.value ?? 0);
      const axis = gamepad.axes[0] ?? 0;
      const deadzone = 0.12;
      const analogSteer = Math.abs(axis) > deadzone ? Math.sign(axis) * (Math.abs(axis) - deadzone) / (1 - deadzone) : 0;
      if (Math.abs(analogSteer) > Math.abs(steer)) steer = analogSteer;
      handbrake ||= !!gamepad.buttons[0]?.pressed;
    }
    const step = Math.max(0, Math.min(dt, 0.1));
    const pedals = 1 - Math.exp(-12 * step);
    const steering = 1 - Math.exp(-8 * step);
    this.state.throttle += (throttle - this.state.throttle) * pedals;
    this.state.brake += (brake - this.state.brake) * pedals;
    this.state.steer += (steer - this.state.steer) * steering;
    this.state.handbrake = handbrake;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.visibility);
    this.clear();
  }
}
