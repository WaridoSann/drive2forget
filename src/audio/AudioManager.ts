/** Soft development synthesizer. These are not recorded BMW engine sounds. */
export class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private motor?: GainNode;
  private tire?: GainNode;
  private wind?: GainNode;
  private readonly engineVoices: OscillatorNode[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];
  private volume = 0.35;
  private paused = false;
  private birdTimer = 2.8;
  private randomState = 0x3f014bc;

  private random(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  async start(): Promise<void> {
    if (this.context) {
      if (this.context.state === 'suspended') await this.context.resume();
      return;
    }
    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    master.gain.value = this.paused ? 0 : this.volume;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    master.connect(compressor);
    compressor.connect(context.destination);
    this.master = master;

    const motor = context.createGain();
    motor.gain.value = 0.025;
    const motorFilter = context.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 1150;
    motorFilter.Q.value = 0.35;
    motor.connect(motorFilter);
    motorFilter.connect(master);
    this.motor = motor;
    const harmonics = [1, 2, 3, 4];
    for (let i = 0; i < harmonics.length; i++) {
      const oscillator = context.createOscillator();
      oscillator.type = i === 0 ? 'triangle' : 'sine';
      oscillator.frequency.value = 50 * harmonics[i];
      const gain = context.createGain();
      gain.gain.value = [0.7, 0.28, 0.13, 0.06][i];
      oscillator.connect(gain);
      gain.connect(motor);
      oscillator.start();
      this.engineVoices.push(oscillator);
      this.sources.push(oscillator);
    }

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    // A deterministic filtered-noise bed keeps the prototype reproducible.
    let brown = 0;
    for (let i = 0; i < samples.length; i++) {
      brown = (brown + (this.random() * 2 - 1) * 0.06) / 1.03;
      samples[i] = brown * 3;
    }
    this.tire = this.noiseLayer(noiseBuffer, 800, 'bandpass', 0);
    this.wind = this.noiseLayer(noiseBuffer, 450, 'lowpass', 0);
    this.noiseLayer(noiseBuffer, 1300, 'highpass', 0.008);
    if (context.state === 'suspended') await context.resume();
  }

  private noiseLayer(buffer: AudioBuffer, frequency: number, type: BiquadFilterType, volume: number): GainNode {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.5;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    source.start(0, this.random() * 3);
    this.sources.push(source);
    return gain;
  }

  update(rpm: number, speedKmh: number, throttle: number, dt: number): void {
    const context = this.context;
    if (!context || this.paused || context.state !== 'running') return;
    const time = context.currentTime;
    const safeRpm = Number.isFinite(rpm) ? Math.max(650, Math.min(7800, rpm)) : 750;
    const speed = Number.isFinite(speedKmh) ? Math.abs(speedKmh) : 0;
    const pedal = Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle)) : 0;
    // V8 firing rate: four firing pulses per crank revolution. Harmonically
    // softened for comfort, without implying an accurate sampled exhaust note.
    const frequency = safeRpm / 60 * 4;
    this.engineVoices.forEach((voice, index) => {
      voice.frequency.setTargetAtTime(frequency * (index + 1), time, 0.065);
    });
    this.motor!.gain.setTargetAtTime(0.025 + pedal * 0.035 + Math.min(safeRpm / 7800, 1) * 0.012, time, 0.09);
    this.tire!.gain.setTargetAtTime(Math.min(speed / 140, 1) * 0.075, time, 0.15);
    this.wind!.gain.setTargetAtTime(Math.min((speed / 180) ** 1.5, 1.4) * 0.065, time, 0.2);
    this.birdTimer -= Math.max(0, Math.min(dt, 0.1));
    if (this.birdTimer <= 0) {
      this.chirp();
      this.birdTimer = 5 + this.random() * 9;
    }
  }

  private chirp(): void {
    const context = this.context!;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    const pitch = 2300 + this.random() * 900;
    oscillator.frequency.setValueAtTime(pitch, now);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 1.32, now + 0.07);
    oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.86, now + 0.19);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.008, now + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(envelope);
    envelope.connect(this.master!);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + 0.24);
  }

  setVolume(volume: number): void {
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    this.master?.gain.setTargetAtTime(this.paused ? 0 : this.volume, this.context!.currentTime, 0.05);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.master?.gain.setTargetAtTime(paused ? 0 : this.volume, this.context!.currentTime, 0.05);
  }

  dispose(): void {
    for (const source of this.sources) {
      try { source.stop(); } catch { /* A stopped source is already silent. */ }
      source.disconnect();
    }
    this.sources.length = 0;
    this.engineVoices.length = 0;
    this.master?.disconnect();
    void this.context?.close();
    this.context = undefined;
    this.master = undefined;
    this.motor = this.tire = this.wind = undefined;
  }
}
