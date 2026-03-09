import type { JsonRecord } from "../intelligence/types.js";

export type MasteryLifecycleState =
  | "LOADING"
  | "MENU"
  | "PLAYING"
  | "PAUSED"
  | "GAME_OVER"
  | "WIN"
  | "UNKNOWN";

export type MasteryRunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled";

export type MasteryEpisodeStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled";

export type MasteryMetricOperator = ">=" | "<=" | "==" | "!=";

export type MasteryLogLevel = "info" | "warn" | "error";

export type MasteryEvidenceMode = "strict" | "basic" | "off";

export type MasteryEvidenceProvenance =
  | "runtime-native"
  | "synthetic"
  | "derived";

export type MasteryVerificationStatus = "verified" | "UNVERIFIED_LEGACY";

export type MasteryFrameType =
  | "boot/menu"
  | "play-start"
  | "progress"
  | "terminal"
  | "stuck-check";

export type MasteryConsistencyStatus = "pass" | "fail" | "insufficient";

export interface MasteryObjective {
  summary: string;
  winCondition: string;
  masteryDefinition: string;
}

export interface MasteryControl {
  action: string;
  input: string;
  note?: string;
}

export interface MasteryProgressionNode {
  id: string;
  label: string;
  description: string;
  successSignal: string;
  failureSignals: string[];
}

export interface MasteryRisk {
  id: string;
  label: string;
  symptom: string;
  mitigation: string;
}

export interface MasteryPassGate {
  id: string;
  metric: string;
  operator: MasteryMetricOperator;
  threshold: number;
  description: string;
}

export interface MasteryRuntimeGate extends MasteryPassGate {
  required?: boolean;
  source?: MasteryEvidenceProvenance;
}

export interface MasteryLevelRequirement {
  metric: string;
  totalLevels: number;
  requiredLevel: number;
  indexBase: 0 | 1;
  mode: "at_least" | "at_most";
  clearedLevelsMetric?: string;
  minimumClearedLevels?: number;
  temporaryOverride?: boolean;
  temporaryOverrideReason?: string;
}

export interface MasteryQualityRequirement {
  medianClearTimeMetric?: string;
  goldenLevelTimeMs?: number;
  maxMedianClearTimeFactor?: number;
  medianScoreMetric?: string;
  goldenLevelScore?: number;
  minMedianScoreFactor?: number;
}

export interface MasteryTruthChecks {
  requireFrameTypes: MasteryFrameType[];
  stuckCheckIntervalSec: number;
  failOnMenuAdvance: boolean;
  failOnStaticFramesWithProgress: boolean;
  failOnTelemetryFrameMismatch: boolean;
  requiredControlAxes?: string[];
}

export interface MasteryGateV2 {
  runtimeGates: MasteryRuntimeGate[];
  levelRequirement?: MasteryLevelRequirement | null;
  qualityRequirement?: MasteryQualityRequirement | null;
  truthChecks: MasteryTruthChecks;
  disallowedEvidence: string[];
  status: "ACTIVE" | "DEFERRED_MULTIPLAYER";
}

export interface MasteryGateResult {
  gateId: string;
  metric: string;
  operator: MasteryMetricOperator;
  threshold: number;
  observed: number | null;
  passed: boolean;
  reason: string;
  source?: MasteryEvidenceProvenance;
}

export interface MasteryConsistencyVerdict {
  status: MasteryConsistencyStatus;
  checkedAt: string;
  reasons: string[];
  mismatchDetails: string[];
}

export interface MasteryEpisodeOutcomeV2 {
  runtimeQualified: boolean;
  visualQualified: boolean;
  finalQualified: boolean;
  failureCode?: string | null;
}

export interface MasteryEvidenceFrame {
  runId: string;
  episodeId: string;
  seq: number;
  frameType: MasteryFrameType;
  ts: string;
  hash: string;
  path?: string;
  ocr: string[];
  telemetrySnapshot: JsonRecord;
}

export interface MasteryEpisodeEvidence {
  frames: MasteryEvidenceFrame[];
  consistency: MasteryConsistencyVerdict;
  syntheticSignals: string[];
}

export interface MasteryVerdict {
  passed: boolean;
  confidence: number;
  reasons: string[];
  gateResults: MasteryGateResult[];
  outcome: MasteryEpisodeOutcomeV2;
  consistency: MasteryConsistencyVerdict;
}

export interface MasteryRecoveryPolicy {
  menu: string;
  paused: string;
  gameOver: string;
  stuck: string;
}

export interface MasteryPolicyBounds {
  min: number;
  max: number;
  kind: "float" | "int";
}

export interface MasteryPolicyProfile {
  family: string;
  defaults: JsonRecord;
  bounds: Record<string, MasteryPolicyBounds>;
}

export type MasteryAtomicAuditStatus =
  | "pending"
  | "in_progress"
  | "audited"
  | "closed"
  | "regression-only"
  | "deferred";

export interface MasteryAtomicAuditControl {
  action: string;
  binding: string;
  source: string;
  semantics: string;
}

export interface MasteryAtomicAuditLifecycleNode {
  state: MasteryLifecycleState | string;
  enterSignals: string[];
  exitSignals: string[];
  notes?: string;
}

export interface MasteryAtomicAuditObjectiveModel {
  primaryObjective: string;
  winSignals: string[];
  failSignals: string[];
  currentFailureReason: string;
}

export interface MasteryAtomicAuditTopology {
  structure: string;
  stages: string[];
  completionMetric: string;
  notes?: string[];
}

export type MasteryAtomicAuditMetricCoverage =
  | "native"
  | "controller"
  | "hybrid"
  | "missing";

export interface MasteryAtomicAuditMetricSource {
  metric: string;
  coverage: MasteryAtomicAuditMetricCoverage;
  location: string;
  notes?: string;
}

export interface MasteryAtomicAuditControllerDesign {
  mode: string;
  substates: string[];
  currentBlockingSubsystem: string;
  controllerFailureMode: string;
  telemetryAdditions: string[];
  boundedGate: string;
}

export interface MasteryAtomicAuditSmokeAssertion {
  id: string;
  description: string;
  successMetric: string;
  currentFailure: string;
}

export interface MasteryAtomicAudit {
  auditStatus: MasteryAtomicAuditStatus;
  controls: MasteryAtomicAuditControl[];
  lifecycleMap: MasteryAtomicAuditLifecycleNode[];
  objectiveModel: MasteryAtomicAuditObjectiveModel;
  levelTopology: MasteryAtomicAuditTopology;
  metricSourceMap: MasteryAtomicAuditMetricSource[];
  controllerDesign: MasteryAtomicAuditControllerDesign;
  smokeAssertions: MasteryAtomicAuditSmokeAssertion[];
}

export interface Five55MasteryContract {
  gameId: string;
  aliases: string[];
  title: string;
  contractVersion: number;
  objective: MasteryObjective;
  controls: MasteryControl[];
  progression: MasteryProgressionNode[];
  risks: MasteryRisk[];
  passGates: MasteryPassGate[];
  gateV2: MasteryGateV2;
  recovery: MasteryRecoveryPolicy;
  policy: MasteryPolicyProfile;
  atomicAudit: MasteryAtomicAudit;
  notes?: string[];
}

export interface MasteryProfileEnvelope {
  suiteId: string;
  runId: string;
  gameId: string;
  episodeIndex: number;
  episodeId: string;
  seed: number;
  strict: boolean;
  evidenceMode?: MasteryEvidenceMode;
  contractVersion: number;
}

export interface Five55MasteryRun {
  runId: string;
  suiteId: string;
  status: MasteryRunStatus;
  strict: boolean;
  verificationStatus: MasteryVerificationStatus;
  seedMode: "fixed" | "mixed" | "rolling";
  maxDurationSec: number;
  episodesPerGame: number;
  games: string[];
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  progress: {
    totalEpisodes: number;
    completedEpisodes: number;
    passedEpisodes: number;
    failedEpisodes: number;
  };
  summary: {
    passedGames: string[];
    failedGames: string[];
    deferredGames: string[];
    evaluatedGames: number;
    denominatorGames: number;
    gamePassRate: number;
  };
  error: string | null;
}

export interface Five55MasteryEpisode {
  runId: string;
  episodeId: string;
  gameId: string;
  gameTitle: string;
  episodeIndex: number;
  seed: number;
  status: MasteryEpisodeStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  actionResult: {
    ok: boolean;
    requestId: string;
    error: string | null;
  };
  verdict: MasteryVerdict;
  evidence: MasteryEpisodeEvidence;
  metadata: JsonRecord;
}

export interface Five55MasteryLog {
  runId: string;
  seq: number;
  ts: string;
  level: MasteryLogLevel;
  message: string;
  stage?: string;
  gameId?: string;
  episodeId?: string;
}

export interface Five55MasteryGameSnapshot {
  gameId: string;
  updatedAt: string;
  latestRunId: string;
  latestEpisodeId: string;
  latestVerdict: MasteryVerdict;
  latestStatus: MasteryEpisodeStatus;
  latestOutcome?: MasteryEpisodeOutcomeV2;
  latestConsistency?: MasteryConsistencyVerdict;
  objective: MasteryObjective;
  controls: MasteryControl[];
  riskFlags: string[];
}

export interface Five55MasteryRunsPage {
  runs: Five55MasteryRun[];
  limit: number;
  cursor: string | null;
  nextCursor: string | null;
  total: number;
}

export interface Arcade555MasteryProgress {
  totalEpisodes: number;
  completedEpisodes: number;
  passedEpisodes: number;
  failedEpisodes: number;
  completionRate: number;
  passRate: number;
}

export interface Arcade555GameTelemetryV2 {
  gameId: string | null;
  runId: string | null;
  episodeId: string | null;
  ts: string;
  lifecycle: MasteryLifecycleState;
  nativeMetrics: JsonRecord;
  objectiveProgress: JsonRecord;
  failReason: string | null;
  controlCoverage: JsonRecord;
  visualHash: string | null;
  provenance: JsonRecord;
}

export interface Arcade555TelemetryValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface Arcade555TelemetryValidationResult {
  valid: boolean;
  telemetry: Arcade555GameTelemetryV2;
  issues: Arcade555TelemetryValidationIssue[];
}

export interface Arcade555ActiveSession {
  sessionId: string;
  runId: string;
  gameId: string | null;
  gameTitle: string | null;
  generatedAt: string;
  startedAt: string;
  updatedAt: string;
  status: MasteryRunStatus | MasteryEpisodeStatus | "idle";
  objective: string | null;
  phase: string | null;
  currentAction: string | null;
  confidence: number | null;
  blocker: string | null;
  progress: Arcade555MasteryProgress;
  frameCount: number;
  evidenceLinks: Array<{
    label: string;
    href: string;
    kind?: "api" | "artifact" | "ui";
  }>;
  metadata?: JsonRecord;
}

export interface MasteryCertificationRequest {
  suiteId: string;
  games: string[];
  episodesPerGame: number;
  seedMode: "fixed" | "mixed" | "rolling";
  maxDurationSec: number;
  strict: boolean;
  evidenceMode: MasteryEvidenceMode;
}
