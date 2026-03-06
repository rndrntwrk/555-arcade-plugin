import { adminCabinetPossessAction } from "./adminCabinetPossess.js";
import { adminCabinetReleaseAction } from "./adminCabinetRelease.js";
import { adminEventTriggerAction } from "./adminEventTrigger.js";
import { adminThemeSetAction } from "./adminThemeSet.js";
import { authVerifyAction } from "./authVerify.js";
import { battlesCreateAction } from "./battlesCreate.js";
import { battlesReadAction } from "./battlesRead.js";
import { battlesResolveAction } from "./battlesResolve.js";
import { gamesCatalogAction } from "./gamesCatalog.js";
import { gamesGoLivePlayAction } from "./gamesGoLivePlay.js";
import { gamesLiveCapabilitySprintAction } from "./gamesLiveCapabilitySprint.js";
import { gamesPlayAction } from "./gamesPlay.js";
import { gamesStopAction } from "./gamesStop.js";
import { gamesSwitchAction } from "./gamesSwitch.js";
import { githubListReposAction } from "./githubListRepos.js";
import { healthcheckAction } from "./healthcheck.js";
import { legacyActionAliases } from "./legacyAliases.js";
import { leaderboardReadAction } from "./leaderboardRead.js";
import { leaderboardWriteAction } from "./leaderboardWrite.js";
import { masteryBriefAction } from "./masteryBrief.js";
import { masteryCertifyAction } from "./masteryCertify.js";
import { masteryEvidenceAction } from "./masteryEvidence.js";
import { masteryStatusAction } from "./masteryStatus.js";
import { masteryValidateAction } from "./masteryValidate.js";
import { questsCompleteAction } from "./questsComplete.js";
import { questsCreateAction } from "./questsCreate.js";
import { questsReadAction } from "./questsRead.js";
import { rewardsAllocateAction } from "./rewardsAllocate.js";
import { rewardsProjectAction } from "./rewardsProject.js";
import { scoreReadAction } from "./scoreRead.js";
import { scoreSubmitAction } from "./scoreSubmit.js";
import { sessionBootstrapAction } from "./sessionBootstrap.js";
import { socialAssignPointsAction } from "./socialAssignPoints.js";
import { socialMonitorAction } from "./socialMonitor.js";

const enableLegacyActionAliases =
  process.env.ARCADE555_ENABLE_LEGACY_ACTION_ALIASES === "true";

export const allActions = [
  // Connection / session
  healthcheckAction,
  authVerifyAction,
  sessionBootstrapAction,
  // Games
  gamesCatalogAction,
  gamesPlayAction,
  gamesSwitchAction,
  gamesStopAction,
  gamesGoLivePlayAction,
  gamesLiveCapabilitySprintAction,
  // Progression
  scoreReadAction,
  scoreSubmitAction,
  leaderboardReadAction,
  leaderboardWriteAction,
  questsReadAction,
  questsCreateAction,
  questsCompleteAction,
  // Advanced operators
  battlesReadAction,
  battlesCreateAction,
  battlesResolveAction,
  rewardsProjectAction,
  rewardsAllocateAction,
  socialMonitorAction,
  socialAssignPointsAction,
  adminThemeSetAction,
  adminEventTriggerAction,
  adminCabinetPossessAction,
  adminCabinetReleaseAction,
  githubListReposAction,
  // Alice-only / advanced mastery
  masteryBriefAction,
  masteryCertifyAction,
  masteryStatusAction,
  masteryValidateAction,
  masteryEvidenceAction,
  ...(enableLegacyActionAliases ? legacyActionAliases : []),
];

export {
  healthcheckAction,
  authVerifyAction,
  sessionBootstrapAction,
  gamesCatalogAction,
  gamesPlayAction,
  gamesSwitchAction,
  gamesStopAction,
  gamesGoLivePlayAction,
  gamesLiveCapabilitySprintAction,
  masteryBriefAction,
  masteryCertifyAction,
  masteryStatusAction,
  masteryValidateAction,
  masteryEvidenceAction,
  scoreReadAction,
  scoreSubmitAction,
  leaderboardReadAction,
  leaderboardWriteAction,
  questsReadAction,
  questsCreateAction,
  questsCompleteAction,
  battlesReadAction,
  battlesCreateAction,
  battlesResolveAction,
  rewardsProjectAction,
  rewardsAllocateAction,
  socialMonitorAction,
  socialAssignPointsAction,
  adminThemeSetAction,
  adminEventTriggerAction,
  adminCabinetPossessAction,
  adminCabinetReleaseAction,
  githubListReposAction,
  legacyActionAliases,
};
