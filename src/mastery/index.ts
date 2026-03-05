export {
  CANONICAL_MASTERY_GAME_IDS,
  canonicalizeMasteryGameId,
  isCanonicalMasteryGameId,
  listCanonicalMasteryGameIds,
  tryCanonicalizeMasteryGameId,
  type CanonicalMasteryGameId,
} from "./aliases.js";

export {
  getMasteryContract,
  getMasteryContractOrNull,
  getMasteryContractsById,
  listMasteryContracts,
  resolveMasteryGameOrder,
} from "./registry.js";

export {
  appendMasteryEpisode,
  appendMasteryLog,
  findMasteryEpisodeById,
  listMasteryRuns,
  readAllMasteryGameSnapshots,
  readMasteryEpisodeById,
  readMasteryEpisodeConsistency,
  readMasteryEpisodeEvidence,
  readMasteryEpisodeFrames,
  readMasteryEpisodes,
  readMasteryGameSnapshot,
  readMasteryLogs,
  readMasteryRun,
  readMasteryRunEvidence,
  writeMasteryGameSnapshot,
  writeMasteryRun,
} from "./store.js";

export { getMasteryCertificationOrchestrator } from "./certification.js";

export type {
  Five55MasteryContract,
  Five55MasteryEpisode,
  Five55MasteryGameSnapshot,
  Five55MasteryLog,
  Five55MasteryRun,
  Five55MasteryRunsPage,
  MasteryCertificationRequest,
  MasteryControl,
  MasteryEpisodeStatus,
  MasteryGateResult,
  MasteryLifecycleState,
  MasteryLogLevel,
  MasteryMetricOperator,
  MasteryObjective,
  MasteryPassGate,
  MasteryPolicyBounds,
  MasteryPolicyProfile,
  MasteryProfileEnvelope,
  MasteryProgressionNode,
  MasteryRecoveryPolicy,
  MasteryRisk,
  MasteryRunStatus,
  MasteryVerdict,
} from "./types.js";

export type Arcade555MasteryContract = import("./types.js").Five55MasteryContract;
export type Arcade555MasteryEpisode = import("./types.js").Five55MasteryEpisode;
export type Arcade555MasteryGameSnapshot = import("./types.js").Five55MasteryGameSnapshot;
export type Arcade555MasteryLog = import("./types.js").Five55MasteryLog;
export type Arcade555MasteryRun = import("./types.js").Five55MasteryRun;
export type Arcade555MasteryRunsPage = import("./types.js").Five55MasteryRunsPage;
export type Arcade555MasteryVerdict = import("./types.js").MasteryVerdict;
export type Arcade555MasteryEvidenceFrame = import("./types.js").MasteryEvidenceFrame;
export type Arcade555MasteryConsistencyVerdict = import("./types.js").MasteryConsistencyVerdict;
