import type { DeterministicController } from "../../controller.js";
import type { AgentGameDirective, Drive555InitialFixtureConfig, Drive555RecoveryPolicy, GameControlIntent, GameObservation } from "../../contracts.js";
import type { Drive555RawState } from "./adapter.js";

export interface RacingLinePolicy {
  reactionWindowMs: number;
  riskTolerance: number;
  recenterBias: number;
  hazardAvoidanceBias: number;
}

export interface RacingLineState { previousSteer: number; }

// Controller artifacts are constrained to this runtime file; this is the same canonical JSON/SHA-256 contract as gameplay-core/canonical.ts.
function canonicalJson(value: unknown, stack = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new TypeError("canonical JSON rejects non-finite numbers"); return JSON.stringify(value); }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new TypeError(`canonical JSON rejects ${typeof value}`);
  if (typeof value !== "object" || stack.has(value)) throw new TypeError("canonical JSON rejects unsupported values or cycles");
  stack.add(value);
  try { if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, stack)).join(",")}]`; const record = value as Record<string, unknown>; return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key], stack)}`).join(",")}}`; } finally { stack.delete(value); }
}
const words = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
const right = (value: number, shift: number) => value >>> shift;
const rotate = (value: number, shift: number) => (value >>> shift) | (value << (32 - shift));
function sha256(text: string): string {
  const bytes = new TextEncoder().encode(text); const length = bytes.length; const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6); padded.set(bytes); padded[length] = 128; const bits = length * 8; const highBits = Math.floor(bits / 2 ** 32), lowBits = bits >>> 0; const end = padded.length;
  padded[end - 8] = highBits >>> 24; padded[end - 7] = highBits >>> 16; padded[end - 6] = highBits >>> 8; padded[end - 5] = highBits; padded[end - 4] = lowBits >>> 24; padded[end - 3] = lowBits >>> 16; padded[end - 2] = lowBits >>> 8; padded[end - 1] = lowBits;
  const hash = [1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]; const schedule = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) schedule[index] = (padded[offset + index * 4] << 24) | (padded[offset + index * 4 + 1] << 16) | (padded[offset + index * 4 + 2] << 8) | padded[offset + index * 4 + 3];
    for (let index = 16; index < 64; index += 1) { const x = schedule[index - 15], y = schedule[index - 2]; schedule[index] = (((rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + schedule[index - 16] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10)) + schedule[index - 7]) >>> 0); }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let index = 0; index < 64; index += 1) { const s1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25), choose = (e & f) ^ (~e & g), temp1 = (h + s1 + choose + words[index] + schedule[index]) >>> 0, s0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22), majority = (a & b) ^ (a & c) ^ (b & c), temp2 = (s0 + majority) >>> 0; h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0; }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0; hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0; hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0; hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
}
const sha256Canonical = (value: unknown): string => sha256(canonicalJson(value));

export const DRIVE555_RACING_LINE_POLICY_DEFAULTS: RacingLinePolicy = { reactionWindowMs: 190, riskTolerance: .4, recenterBias: .8, hazardAvoidanceBias: .84 };
export const DRIVE555_RECOVERY_POLICY_DEFAULTS: Drive555RecoveryPolicy = { schemaVersion: "555drive.recovery.v1", stallWindowMs: 4000, maximumPositionRange: 10, maximumAttempts: 1, action: "restart", progressDeadlineMs: 5000, minimumForwardDelta: 1000 };
const initialUnsigned = { schemaVersion: "555drive.initial-fixture.v1" as const, fixtureId: "straight_start_1331_v1" as const, trackSeed: 1331 as const, playerX: 0 as const, playerZ: 2000 as const, playerVelocityX: 0 as const, playerVelocityZ: 0 as const };
export const DRIVE555_INITIAL_FIXTURE: Drive555InitialFixtureConfig = { ...initialUnsigned, fixtureDigest: sha256Canonical(initialUnsigned) };

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
const finite = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${field} must be finite`);
  return value;
};
function validatePolicy(policy: RacingLinePolicy): RacingLinePolicy {
  const reactionWindowMs = finite(policy.reactionWindowMs, "reactionWindowMs");
  const riskTolerance = finite(policy.riskTolerance, "riskTolerance");
  const recenterBias = finite(policy.recenterBias, "recenterBias");
  const hazardAvoidanceBias = finite(policy.hazardAvoidanceBias, "hazardAvoidanceBias");
  if (reactionWindowMs < 0 || riskTolerance < 0 || riskTolerance > 1 || recenterBias < 0 || recenterBias > 1 || hazardAvoidanceBias < 0 || hazardAvoidanceBias > 1) throw new TypeError("invalid racing-line policy bounds");
  return { reactionWindowMs, riskTolerance, recenterBias, hazardAvoidanceBias };
}
const sign = (value: number): number => value > 0 ? 1 : value < 0 ? -1 : 0;

export const racingLineController: DeterministicController<Drive555RawState, RacingLinePolicy, RacingLineState> = {
  initialState: () => ({ previousSteer: 0 }),
  decide({ observation, directive, state, clock }) {
    const policy = validatePolicy(directive.policySnapshot);
    const gameState = observation.gameState;
    const now = clock.nowMs(); if (!Number.isFinite(now)) throw new TypeError("deterministic clock must return a finite time");
    const candidates = gameState.hazards.map((hazard) => ({ hazard, predictedGap: hazard.relativeZ + hazard.relativeVelocityZ * (policy.reactionWindowMs / 1000) }));
    const clearance = 20 + policy.reactionWindowMs * .1 + policy.hazardAvoidanceBias * 20;
    const threat = candidates.filter((candidate) => candidate.hazard.relativeZ > 0 && candidate.predictedGap <= clearance).sort((left, right) => left.predictedGap - right.predictedGap || left.hazard.id.localeCompare(right.hazard.id))[0];
    const playing = gameState.lifecycle === "playing";
    const accelerate = playing ? 1 : 0;
    const brake = playing && threat ? 1 - policy.riskTolerance : 0;
    const recenter = -sign(gameState.player.x) * policy.recenterBias;
    const evade = threat ? -sign(threat.hazard.relativeX) * policy.hazardAvoidanceBias : 0;
    const steer = playing ? clamp(recenter + evade, -1, 1) : 0;
    const commands = [{ kind: "analog" as const, controlId: "accelerate", value: clamp(accelerate, 0, 1) }, { kind: "analog" as const, controlId: "brake", value: clamp(brake, 0, 1) }, { kind: "analog" as const, controlId: "steer", value: clamp(steer, -1, 1) }];
    const base: Omit<GameControlIntent, "semanticIntentDigest"> = { gameRunId: observation.gameRunId, leaseId: directive.leaseId, fence: directive.fence, directiveId: directive.directiveId, decisionId: sha256(`${directive.directiveId}:${observation.sourceObservationSequence}:${now}`), observationSequence: observation.sourceObservationSequence, decidedAtAgentMonotonicMs: now, maximumAgeMs: 250, agentClockDomainId: directive.agentClockDomainId, commands, reasonCode: threat ? "avoid_hazard" : "pursue_objective" };
    const intent = { ...base, semanticIntentDigest: sha256Canonical(base) };
    return { intent, nextState: { previousSteer: steer } };
  },
};
