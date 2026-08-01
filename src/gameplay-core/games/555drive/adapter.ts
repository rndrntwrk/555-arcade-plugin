import { sha256Canonical } from "../../canonical.js";
import type { GameAdapter, DeterministicEventWindowDetector } from "../../controller.js";
import type { AppliedDecisionCorrelation, BoundGameRunBinding, GameEventDraft, GameObservation, GameplayEvidenceWindowContext, GameplayRuntimeProvenance, RawGameSampleEnvelope } from "../../contracts.js";
import { DRIVE555_V0_MANIFEST, createGameProgressVerdict, mapControlIntent, validateAppliedDecisionCorrelation, validateObservation } from "../../validators.js";

export interface Drive555RawState {
  lifecycle: "menu" | "countdown" | "playing" | "paused" | "game_over" | "completed";
  frame: number;
  trackSeed: number;
  player: { x: number; z: number; velocityX: number; velocityZ: number; };
  checkpoint: number;
  remainingTimeMs: number;
  score: number;
  collisionSequence: number;
  lastCollision: { sequence: number; kind: "vehicle" | "track_object"; objectId: string; physicsFrameSequence: number; } | null;
  hazards: Array<{ id: string; relativeX: number; relativeZ: number; relativeVelocityZ: number; }>;
}

export interface Drive555EventWindowState {
  gameRunId: string | null;
  sourceId: string | null;
  fence: number | null;
  plateauStartedAtAuthorityMs: number | null;
  plateauStartedSourceObservationSequence: number | null;
  minimumZ: number | null;
  maximumZ: number | null;
  sawReflectedForwardIntent: boolean;
  qualifyingReflectedForwardDecisionIds: string[];
  emittedForCurrentPlateau: boolean;
  lastSourceObservationSequence: number | null;
  lastObservedAtAuthorityMs: number | null;
}

const rawLifecycle = new Set<Drive555RawState["lifecycle"]>(["menu", "countdown", "playing", "paused", "game_over", "completed"]);
const trackHazardId = /^track:(0|[1-9]\d*):(0|[1-9]\d*)$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, name: string): number => typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) ? value : (() => { throw new TypeError(`${name} must be a finite integer`); })();
const finite = (value: unknown, name: string): number => typeof value === "number" && Number.isFinite(value) ? value : (() => { throw new TypeError(`${name} must be a finite number`); })();
const nonEmpty = (value: unknown, name: string): string => typeof value === "string" && value.length > 0 ? value : (() => { throw new TypeError(`${name} must be a non-empty string`); })();
const digest = (value: unknown, name: string): string => {
  const result = nonEmpty(value, name);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new TypeError(`${name} must be lowercase SHA-256 hex`);
  return result;
};
const closed = (record: Record<string, unknown>, fields: readonly string[], name: string): void => {
  for (const key of Object.keys(record)) if (!fields.includes(key)) throw new TypeError(`${name} has unknown field ${key}`);
};

function validateRawState(value: unknown): Drive555RawState {
  if (!isRecord(value)) throw new TypeError("555Drive raw state must be an object");
  closed(value, ["lifecycle", "frame", "trackSeed", "player", "checkpoint", "remainingTimeMs", "score", "collisionSequence", "lastCollision", "hazards"], "555Drive raw state");
  if (!rawLifecycle.has(value.lifecycle as Drive555RawState["lifecycle"])) throw new TypeError("invalid 555Drive lifecycle");
  if (!isRecord(value.player)) throw new TypeError("555Drive player must be an object");
  closed(value.player, ["x", "z", "velocityX", "velocityZ"], "555Drive player");
  const player = { x: finite(value.player.x, "player.x"), z: finite(value.player.z, "player.z"), velocityX: finite(value.player.velocityX, "player.velocityX"), velocityZ: finite(value.player.velocityZ, "player.velocityZ") };
  if (!Array.isArray(value.hazards)) throw new TypeError("555Drive hazards must be an array");
  const hazards = value.hazards.map((hazard) => {
    if (!isRecord(hazard)) throw new TypeError("555Drive hazard must be an object");
    closed(hazard, ["id", "relativeX", "relativeZ", "relativeVelocityZ"], "555Drive hazard");
    const id = nonEmpty(hazard.id, "hazard.id"); if (!trackHazardId.test(id)) throw new TypeError("555Drive hazard id must be track:<segmentIndex>:<trackObjectIndex>");
    return { id, relativeX: finite(hazard.relativeX, "hazard.relativeX"), relativeZ: finite(hazard.relativeZ, "hazard.relativeZ"), relativeVelocityZ: finite(hazard.relativeVelocityZ, "hazard.relativeVelocityZ") };
  });
  if (new Set(hazards.map((hazard) => hazard.id)).size !== hazards.length) throw new TypeError("555Drive hazards must have stable unique IDs");
  let lastCollision: Drive555RawState["lastCollision"] = null;
  if (value.lastCollision !== null) {
    if (!isRecord(value.lastCollision)) throw new TypeError("lastCollision must be null or object");
    closed(value.lastCollision, ["sequence", "kind", "objectId", "physicsFrameSequence"], "lastCollision");
    if (value.lastCollision.kind !== "vehicle" && value.lastCollision.kind !== "track_object") throw new TypeError("invalid collision kind");
    lastCollision = { sequence: integer(value.lastCollision.sequence, "lastCollision.sequence"), kind: value.lastCollision.kind, objectId: nonEmpty(value.lastCollision.objectId, "lastCollision.objectId"), physicsFrameSequence: integer(value.lastCollision.physicsFrameSequence, "lastCollision.physicsFrameSequence") };
  }
  const result: Drive555RawState = { lifecycle: value.lifecycle as Drive555RawState["lifecycle"], frame: integer(value.frame, "frame"), trackSeed: integer(value.trackSeed, "trackSeed"), player, checkpoint: integer(value.checkpoint, "checkpoint"), remainingTimeMs: integer(value.remainingTimeMs, "remainingTimeMs"), score: finite(value.score, "score"), collisionSequence: integer(value.collisionSequence, "collisionSequence"), lastCollision, hazards };
  if (result.frame < 0 || result.checkpoint < 0 || result.remainingTimeMs < 0 || result.collisionSequence < 0 || (lastCollision !== null && lastCollision.sequence !== result.collisionSequence)) throw new TypeError("invalid 555Drive raw state ranges");
  return result;
}

function validateRawEnvelope(value: RawGameSampleEnvelope<Drive555RawState>, binding: BoundGameRunBinding, runtime: GameplayRuntimeProvenance, evidence: GameplayEvidenceWindowContext | null): RawGameSampleEnvelope<Drive555RawState> {
  if (!isRecord(value)) throw new TypeError("raw envelope must be an object");
  const fields = ["gameRunId", "sourceId", "fence", "controlOwnerType", "bridgeVersion", "bridgeDigest", "rawSchemaVersion", "relaySequence", "sourceObservationSequence", "observedAtAuthorityMs", "rawState", "rawStateDigest", "appliedControls", "appliedControlsDigest", "appliedDecision", "rawEnvelopeDigest"];
  closed(value, fields, "raw envelope");
  const rawState = validateRawState(value.rawState); const rawStateDigest = digest(value.rawStateDigest, "rawStateDigest");
  if (rawStateDigest !== sha256Canonical(rawState)) throw new TypeError("rawStateDigest mismatch");
  if (nonEmpty(value.gameRunId, "gameRunId") !== binding.gameRunId || nonEmpty(value.sourceId, "sourceId") !== binding.sourceId || integer(value.fence, "fence") < 0) throw new TypeError("raw envelope binding mismatch");
  if (value.bridgeVersion !== runtime.bridgeVersion || value.bridgeDigest !== runtime.bridgeDigest || value.rawSchemaVersion !== DRIVE555_V0_MANIFEST.observations.stateSchemaId) throw new TypeError("raw envelope runtime mismatch");
  if (evidence && (evidence.binding.gameRunId !== binding.gameRunId || evidence.binding.sourceId !== binding.sourceId || evidence.runtime.runtimeProvenanceDigest !== runtime.runtimeProvenanceDigest)) throw new TypeError("evidence context mismatch");
  const owner = value.controlOwnerType;
  if (owner !== null && owner !== "agent" && owner !== "certification_harness") throw new TypeError("invalid raw envelope owner");
  const appliedControls = value.appliedControls;
  if (appliedControls !== undefined && (!isRecord(appliedControls) || !Object.entries(appliedControls).every(([key, item]) => key.length > 0 && (typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)))))) throw new TypeError("invalid applied controls");
  if ((value.appliedControlsDigest === undefined) !== (appliedControls === undefined)) throw new TypeError("applied controls digest correlation missing");
  if (appliedControls !== undefined && digest(value.appliedControlsDigest, "appliedControlsDigest") !== sha256Canonical(appliedControls)) throw new TypeError("applied controls digest mismatch");
  if (value.appliedDecision !== undefined) {
    const decision = validateAppliedDecisionCorrelation(value.appliedDecision);
    if (!appliedControls || decision.fence !== value.fence || decision.ownerType !== owner || decision.appliedControlsDigest !== value.appliedControlsDigest) throw new TypeError("applied decision correlation mismatch");
  }
  const envelope = value as RawGameSampleEnvelope<Drive555RawState>;
  const unsigned = Object.fromEntries(Object.entries(envelope).filter(([key]) => key !== "relaySequence" && key !== "rawEnvelopeDigest"));
  if (digest(value.rawEnvelopeDigest, "rawEnvelopeDigest") !== sha256Canonical(unsigned)) throw new TypeError("rawEnvelopeDigest mismatch");
  integer(value.relaySequence, "relaySequence"); integer(value.sourceObservationSequence, "sourceObservationSequence"); integer(value.observedAtAuthorityMs, "observedAtAuthorityMs");
  return envelope;
}

function adjacent(previous: GameObservation<Drive555RawState> | null, current: GameObservation<Drive555RawState>): previous is GameObservation<Drive555RawState> {
  return previous !== null && previous.gameRunId === current.gameRunId && previous.sourceId === current.sourceId && previous.fence === current.fence && previous.controlOwnerType === current.controlOwnerType && previous.runtimeProvenanceDigest === current.runtimeProvenanceDigest && previous.evidenceWindowContextDigest === current.evidenceWindowContextDigest && previous.sourceObservationSequence + 1 === current.sourceObservationSequence && previous.observedAtAuthorityMs < current.observedAtAuthorityMs && current.observedAtAuthorityMs - previous.observedAtAuthorityMs <= DRIVE555_V0_MANIFEST.observations.maximumGapMs;
}

function qualifyingForwardDecisionId(observation: GameObservation<Drive555RawState>, reflectedDecisionIds: readonly string[]): string | null {
  const decision = observation.appliedDecision; const controls = observation.appliedControls;
  if (decision === undefined || controls === undefined || observation.controlOwnerType !== "agent" || decision.ownerType !== "agent" || !reflectedDecisionIds.includes(decision.decisionId)) return null;
  return typeof controls.accelerate === "number" && controls.accelerate > 0 ? decision.decisionId : null;
}

export const drive555EventWindowDetector: DeterministicEventWindowDetector<Drive555RawState, Drive555EventWindowState> = {
  initialState: () => ({ gameRunId: null, sourceId: null, fence: null, plateauStartedAtAuthorityMs: null, plateauStartedSourceObservationSequence: null, minimumZ: null, maximumZ: null, sawReflectedForwardIntent: false, qualifyingReflectedForwardDecisionIds: [], emittedForCurrentPlateau: false, lastSourceObservationSequence: null, lastObservedAtAuthorityMs: null }),
  accept(state, { observation, reflectedDecisionIds }) {
    const valid = validateObservation(observation) as GameObservation<Drive555RawState>;
    const identityChanged = state.gameRunId !== null && (state.gameRunId !== valid.gameRunId || state.sourceId !== valid.sourceId || state.fence !== valid.fence);
    const orderedContinuation = !identityChanged && state.lastSourceObservationSequence !== null && state.lastObservedAtAuthorityMs !== null && state.lastSourceObservationSequence + 1 === valid.sourceObservationSequence && valid.observedAtAuthorityMs > state.lastObservedAtAuthorityMs && valid.observedAtAuthorityMs - state.lastObservedAtAuthorityMs <= 300;
    const forwardDiscontinuity = !identityChanged && state.lastSourceObservationSequence !== null && state.lastObservedAtAuthorityMs !== null && valid.sourceObservationSequence > state.lastSourceObservationSequence && valid.observedAtAuthorityMs > state.lastObservedAtAuthorityMs && !orderedContinuation;
    const reset = !orderedContinuation;
    const z = valid.gameState.player.z;
    const observedQualifyingId = (state.lastSourceObservationSequence === null || identityChanged || orderedContinuation || forwardDiscontinuity) ? qualifyingForwardDecisionId(valid, reflectedDecisionIds) : null;
    const qualifyingId = (!state.emittedForCurrentPlateau || reset) ? observedQualifyingId : null;
    const qualifyingIds = (ids: readonly string[]) => [...new Set(qualifyingId === null ? ids : [...ids, qualifyingId])].sort();
    const base: Drive555EventWindowState = reset ? { gameRunId: valid.gameRunId, sourceId: valid.sourceId, fence: valid.fence, plateauStartedAtAuthorityMs: valid.observedAtAuthorityMs, plateauStartedSourceObservationSequence: valid.sourceObservationSequence, minimumZ: z, maximumZ: z, sawReflectedForwardIntent: qualifyingId !== null, qualifyingReflectedForwardDecisionIds: qualifyingIds([]), emittedForCurrentPlateau: false, lastSourceObservationSequence: valid.sourceObservationSequence, lastObservedAtAuthorityMs: valid.observedAtAuthorityMs } : { ...state, minimumZ: Math.min(state.minimumZ!, z), maximumZ: Math.max(state.maximumZ!, z), sawReflectedForwardIntent: qualifyingIds(state.qualifyingReflectedForwardDecisionIds).length > 0, qualifyingReflectedForwardDecisionIds: qualifyingIds(state.qualifyingReflectedForwardDecisionIds), lastSourceObservationSequence: valid.sourceObservationSequence, lastObservedAtAuthorityMs: valid.observedAtAuthorityMs };
    const range = base.maximumZ! - base.minimumZ!;
    if (!base.emittedForCurrentPlateau && base.qualifyingReflectedForwardDecisionIds.length > 0 && range <= 10 && valid.observedAtAuthorityMs - base.plateauStartedAtAuthorityMs! >= 4000) {
      const qualifyingDecisionIds = base.qualifyingReflectedForwardDecisionIds;
      if (qualifyingDecisionIds.length > 0) return { nextState: { ...base, emittedForCurrentPlateau: true }, eventDrafts: [{ type: "player.stalled", payload: { fromSourceObservationSequence: base.plateauStartedSourceObservationSequence, toSourceObservationSequence: valid.sourceObservationSequence, plateauStartedAtAuthorityMs: base.plateauStartedAtAuthorityMs, observedAtAuthorityMs: valid.observedAtAuthorityMs, minimumZ: base.minimumZ, maximumZ: base.maximumZ, positionRange: range, qualifyingDecisionIds } }] };
    }
    if (!reset && range > 10) {
      const rearmIds = observedQualifyingId === null ? [] : [observedQualifyingId];
      return { nextState: { ...base, plateauStartedAtAuthorityMs: valid.observedAtAuthorityMs, plateauStartedSourceObservationSequence: valid.sourceObservationSequence, minimumZ: z, maximumZ: z, sawReflectedForwardIntent: rearmIds.length > 0, qualifyingReflectedForwardDecisionIds: rearmIds, emittedForCurrentPlateau: false }, eventDrafts: [] };
    }
    return { nextState: base, eventDrafts: [] };
  },
};

export const drive555Adapter: GameAdapter<Drive555RawState, Drive555RawState> = {
  manifest: DRIVE555_V0_MANIFEST,
  normalizeObservation(raw, bindingInput, runtime, evidence) {
    const binding = bindingInput as BoundGameRunBinding;
    const value = validateRawEnvelope(raw, binding, runtime, evidence);
    const gameState = validateRawState(value.rawState);
    const observation = {
      gameRunId: value.gameRunId, sourceId: value.sourceId, fence: value.fence, controlOwnerType: value.controlOwnerType,
      runtimeProvenanceDigest: runtime.runtimeProvenanceDigest, evidenceWindowContextDigest: evidence?.contextDigest ?? null,
      observationSchemaVersion: DRIVE555_V0_MANIFEST.observationSchemaVersion, sequence: value.sourceObservationSequence, sourceObservationSequence: value.sourceObservationSequence, sourceObservationDigest: value.rawEnvelopeDigest, observedAtAuthorityMs: value.observedAtAuthorityMs, lifecycle: gameState.lifecycle,
      player: { position: { x: gameState.player.x, y: 0, z: gameState.player.z }, velocity: { x: gameState.player.velocityX, y: 0, z: gameState.player.velocityZ }, score: gameState.score },
      progression: { distance: gameState.player.z, checkpoint: gameState.checkpoint, remainingTimeMs: gameState.remainingTimeMs },
      entities: gameState.hazards.map((hazard) => ({ id: hazard.id, kind: "hazard", relativePosition: { x: hazard.relativeX, y: 0, z: hazard.relativeZ }, relativeVelocity: { x: 0, y: 0, z: hazard.relativeVelocityZ } })), gameState,
      ...(value.appliedControls === undefined ? {} : { appliedControls: value.appliedControls }), ...(value.appliedDecision === undefined ? {} : { appliedDecision: value.appliedDecision }),
    };
    return validateObservation(observation) as GameObservation<Drive555RawState>;
  },
  mapControl: (intent) => mapControlIntent(intent, DRIVE555_V0_MANIFEST),
  deriveEventDrafts(previous, current) {
    validateObservation(current); if (previous !== null) validateObservation(previous);
    if (!adjacent(previous, current)) return [];
    const drafts: GameEventDraft[] = []; const before = previous.gameState, after = current.gameState;
    if (after.score > before.score) drafts.push({ type: "score.improved", payload: { previousScore: before.score, currentScore: after.score, delta: after.score - before.score } });
    if (after.checkpoint > before.checkpoint) drafts.push({ type: "checkpoint.reached", payload: { previousCheckpoint: before.checkpoint, currentCheckpoint: after.checkpoint, delta: after.checkpoint - before.checkpoint } });
    if (before.lifecycle !== "completed" && after.lifecycle === "completed") drafts.push({ type: "run.completed", payload: { previousLifecycle: before.lifecycle, currentLifecycle: after.lifecycle, finalScore: after.score, finalCheckpoint: after.checkpoint, finalPosition: { x: after.player.x, z: after.player.z } } });
    if (after.collisionSequence > before.collisionSequence) drafts.push({ type: "collision", payload: { previousCollisionSequence: before.collisionSequence, currentCollisionSequence: after.collisionSequence, delta: after.collisionSequence - before.collisionSequence, collision: after.lastCollision } });
    for (const hazard of before.hazards) {
      const later = after.hazards.find((candidate) => candidate.id === hazard.id);
      const collided = after.collisionSequence !== before.collisionSequence && after.lastCollision?.objectId === hazard.id;
      if (trackHazardId.test(hazard.id) && later && hazard.relativeZ > 0 && later.relativeZ < 0 && !collided) drafts.push({ type: "hazard.avoided", payload: { hazardId: hazard.id } });
    }
    return drafts;
  },
  createEventWindowDetector: () => drive555EventWindowDetector,
  evaluateProgress(previous, current) {
    if (!adjacent(previous, current)) throw new TypeError("progress requires adjacent authoritative observations");
    const forwardZDelta = current.gameState.player.z - previous.gameState.player.z;
    const scoreDelta = current.gameState.score - previous.gameState.score;
    const collisionSequenceDelta = current.gameState.collisionSequence - previous.gameState.collisionSequence;
    const contributingDecisionIds = [...new Set([previous.appliedDecision?.decisionId, current.appliedDecision?.decisionId].filter((entry): entry is string => entry !== undefined))].sort();
    return createGameProgressVerdict({ gameRunId: current.gameRunId, sourceId: current.sourceId, fence: current.fence, controlOwnerType: current.controlOwnerType, evidenceWindowContextDigest: current.evidenceWindowContextDigest, progressSchemaVersion: DRIVE555_V0_MANIFEST.progressSchemaVersion, fromSourceObservationSequence: previous.sourceObservationSequence, toSourceObservationSequence: current.sourceObservationSequence, fromSourceObservationDigest: previous.sourceObservationDigest, toSourceObservationDigest: current.sourceObservationDigest, evaluatedAtAuthorityMs: current.observedAtAuthorityMs, progressed: forwardZDelta > 0, metrics: { forwardZDelta, scoreDelta, collisionSequenceDelta }, contributingDecisionIds });
  },
};
