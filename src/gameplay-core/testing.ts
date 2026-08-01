import type { DeterministicClock } from "./controller.js";

export class FixedDeterministicClock implements DeterministicClock {
  constructor(private readonly value: number) {}
  nowMs(): number { return this.value; }
}
