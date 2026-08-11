export class Profiler {
  constructor() {
    this.timers = new Map();
    this.samples = new Map();
    this.maxSamples = 60;
  }

  start(label) {
    this.timers.set(label, performance.now());
  }

  end(label) {
    const start = this.timers.get(label);
    if (start === undefined) return;
    const elapsed = performance.now() - start;
    if (!this.samples.has(label)) this.samples.set(label, []);
    const arr = this.samples.get(label);
    arr.push(elapsed);
    if (arr.length > this.maxSamples) arr.shift();
  }

  average(label) {
    const arr = this.samples.get(label);
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
