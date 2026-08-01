import type {
  BoundGameRunBinding, BridgeObservationSample, GameAdapterManifest, GameControlIntent,
  GameControlOwnerType, GameEventDraft, GameLifecycleCommandResult, GameObservation,
  GameProgressVerdict, GameplayEvidenceWindowContext, GameplayRuntimeProvenance,
  NormalizedGameControls, PageAuthorityCommitResult, PageControlReleaseResult,
} from "./contracts.js";

export interface DeterministicClock { nowMs(): number; }
export interface DeterministicController<TGameState = unknown, TPolicy = unknown, TState = unknown> {
  initialState(policy: TPolicy): TState;
  decide(input: { observation: GameObservation<TGameState>; directive: import("./contracts.js").AgentGameDirective<TPolicy>; state: TState; clock: DeterministicClock; }): { intent: GameControlIntent; nextState: TState; };
}
export interface DeterministicEventWindowDetector<TGameState, TState> {
  initialState(): TState;
  accept(state: TState, input: { observation: GameObservation<TGameState>; reflectedDecisionIds: readonly string[]; }): { nextState: TState; eventDrafts: GameEventDraft[]; };
}
export interface GameAdapter<TRawObservation = unknown, TGameState = unknown> {
  readonly manifest: GameAdapterManifest;
  normalizeObservation(raw: import("./contracts.js").RawGameSampleEnvelope<TRawObservation>, binding: import("./contracts.js").GameRunBinding, provenance: GameplayRuntimeProvenance, evidenceWindow: GameplayEvidenceWindowContext | null): GameObservation<TGameState>;
  mapControl(intent: GameControlIntent): NormalizedGameControls;
  deriveEventDrafts(previous: GameObservation<TGameState> | null, current: GameObservation<TGameState>): GameEventDraft[];
  createEventWindowDetector(): DeterministicEventWindowDetector<TGameState, unknown>;
  evaluateProgress(previous: GameObservation<TGameState>, current: GameObservation<TGameState>): GameProgressVerdict;
}
export interface GameBridge<TRawObservation = unknown> {
  getCapabilities(): Promise<import("./contracts.js").GameRuntimeCapabilities>;
  observe(): Promise<BridgeObservationSample<TRawObservation>>;
  synchronizeAuthority(input: { transitionId: string; requestDigest: string; authority: { gameRunId: string; leaseId: string | null; ownerType: GameControlOwnerType | null; fence: number; state: "active" | "closing" | "closed" | "emergency_closed"; }; }): Promise<PageAuthorityCommitResult>;
  apply(controls: NormalizedGameControls, authority: { gameRunId: string; leaseId: string; fence: number; ownerType: GameControlOwnerType; directiveId: string; decisionId: string; semanticIntentDigest: string; mappedControlsDigest: string; }): Promise<import("./contracts.js").AppliedControlSnapshot>;
  releaseAll(input: { transitionId: string; requestDigest: string; authority: { gameRunId: string; leaseId: string | null; ownerType: GameControlOwnerType | null; fence: number; }; }): Promise<PageControlReleaseResult>;
  lifecycle(input: { transitionId: string; requestDigest: string; command: "start" | "pause" | "resume" | "restart"; }): Promise<GameLifecycleCommandResult>;
  close(): Promise<void>;
}

export type { BoundGameRunBinding };
