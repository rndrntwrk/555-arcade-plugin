import type { Action } from "../types/index.js";
import { adminCabinetPossessAction } from "./adminCabinetPossess.js";
import { adminCabinetReleaseAction } from "./adminCabinetRelease.js";
import { adminEventTriggerAction } from "./adminEventTrigger.js";
import { adminThemeSetAction } from "./adminThemeSet.js";
import { battlesCreateAction } from "./battlesCreate.js";
import { battlesReadAction } from "./battlesRead.js";
import { battlesResolveAction } from "./battlesResolve.js";
import { gamesCatalogAction } from "./gamesCatalog.js";
import { gamesGoLivePlayAction } from "./gamesGoLivePlay.js";
import { gamesLiveCapabilitySprintAction } from "./gamesLiveCapabilitySprint.js";
import { gamesPlayAction } from "./gamesPlay.js";
import { gamesStopAction } from "./gamesStop.js";
import { gamesSwitchAction } from "./gamesSwitch.js";
import { buildLegacyAliasEnvelope } from "./gamesAgentRuntime.js";
import { githubListReposAction } from "./githubListRepos.js";
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
import { socialAssignPointsAction } from "./socialAssignPoints.js";
import { socialMonitorAction } from "./socialMonitor.js";

function createActionAlias(
  actionName: string,
  sourceAction: Action,
  description: string,
  extraSimiles: string[] = [],
): Action {
  const replacement = sourceAction.name;
  return {
    ...sourceAction,
    name: actionName,
    description,
    similes: Array.from(
      new Set([...(sourceAction.similes ?? []), ...extraSimiles]),
    ),
    handler: async (runtime, message, state, options, callback) => {
      console.warn(
        `[555arcade] deprecated action ${actionName} invoked; use ${replacement}. Planned removal: Release C.`,
      );
      let callbackPayload:
        | { text: string; content?: Record<string, unknown> }
        | null = null;
      const sourceOptions =
        options &&
        typeof options === "object" &&
        "parameters" in options &&
        typeof (options as { parameters?: unknown }).parameters === "object"
          ? ((options as { parameters?: Record<string, unknown> }).parameters ?? {})
          : options;

      const result = await sourceAction.handler(
        runtime,
        message,
        state,
        sourceOptions,
        (payload) => {
          callbackPayload = payload;
          callback?.(payload);
        },
      );
      return buildLegacyAliasEnvelope(actionName, callbackPayload, result);
    },
  };
}

export const legacyActionAliases: Action[] = [
  createActionAlias(
    "FIVE55_GAMES_CATALOG",
    gamesCatalogAction,
    "Compatibility alias for ARCADE555_GAMES_CATALOG.",
    ["FIVE55_CATALOG_GAMES"],
  ),
  createActionAlias(
    "FIVE55_GAMES_PLAY",
    gamesPlayAction,
    "Compatibility alias for ARCADE555_GAMES_PLAY.",
    ["FIVE55_PLAY_GAME"],
  ),
  createActionAlias(
    "FIVE55_GAMES_SWITCH",
    gamesSwitchAction,
    "Compatibility alias for ARCADE555_GAMES_SWITCH.",
  ),
  createActionAlias(
    "FIVE55_GAMES_STOP",
    gamesStopAction,
    "Compatibility alias for ARCADE555_GAMES_STOP.",
  ),
  createActionAlias(
    "FIVE55_GAMES_GO_LIVE_PLAY",
    gamesGoLivePlayAction,
    "Compatibility alias for ARCADE555_GAMES_GO_LIVE_PLAY.",
    ["FIVE55_GO_LIVE_PLAY"],
  ),
  createActionAlias(
    "FIVE55_GAMES_LIVE_CAPABILITY_SPRINT",
    gamesLiveCapabilitySprintAction,
    "Compatibility alias for ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT.",
    ["FIVE55_GAMES_SPRINT", "ALICE_GAME_CAPABILITY_SPRINT"],
  ),
  createActionAlias(
    "FIVE55_GAMES_MASTERY_BRIEF",
    masteryBriefAction,
    "Compatibility alias for ARCADE555_MASTERY_BRIEF.",
    ["FIVE55_MASTERY_BRIEF", "GAMES_MASTERY_BRIEF"],
  ),
  createActionAlias(
    "FIVE55_GAMES_MASTERY_CERTIFY",
    masteryCertifyAction,
    "Compatibility alias for ARCADE555_MASTERY_CERTIFY.",
    ["FIVE55_MASTERY_CERTIFY", "CERTIFY_FIVE55_GAMES"],
  ),
  createActionAlias(
    "FIVE55_GAMES_MASTERY_STATUS",
    masteryStatusAction,
    "Compatibility alias for ARCADE555_MASTERY_STATUS.",
    ["FIVE55_MASTERY_STATUS", "GET_FIVE55_MASTERY_STATUS"],
  ),
  createActionAlias(
    "FIVE55_GAMES_MASTERY_VALIDATE",
    masteryValidateAction,
    "Compatibility alias for ARCADE555_MASTERY_VALIDATE.",
    ["FIVE55_MASTERY_VALIDATE", "VALIDATE_FIVE55_EPISODE"],
  ),
  createActionAlias(
    "FIVE55_GAMES_MASTERY_EVIDENCE",
    masteryEvidenceAction,
    "Compatibility alias for ARCADE555_MASTERY_EVIDENCE.",
    ["FIVE55_MASTERY_EVIDENCE", "GET_FIVE55_MASTERY_EVIDENCE"],
  ),
  createActionAlias(
    "FIVE55_SCORE_CAPTURE_READ",
    scoreReadAction,
    "Compatibility alias for ARCADE555_SCORE_READ.",
    ["READ_SCORE_CAPTURE", "GET_CAPTURED_SCORE"],
  ),
  createActionAlias(
    "FIVE55_SCORE_CAPTURE_SUBMIT",
    scoreSubmitAction,
    "Compatibility alias for ARCADE555_SCORE_SUBMIT.",
    ["FIVE55_REPORT_SCORE"],
  ),
  createActionAlias(
    "FIVE55_LEADERBOARD_READ",
    leaderboardReadAction,
    "Compatibility alias for ARCADE555_LEADERBOARD_READ.",
    ["READ_LEADERBOARD", "GET_LEADERBOARD"],
  ),
  createActionAlias(
    "FIVE55_LEADERBOARD_WRITE",
    leaderboardWriteAction,
    "Compatibility alias for ARCADE555_LEADERBOARD_WRITE.",
    ["WRITE_LEADERBOARD", "UPDATE_LEADERBOARD"],
  ),
  createActionAlias(
    "FIVE55_QUESTS_READ",
    questsReadAction,
    "Compatibility alias for ARCADE555_QUESTS_READ.",
    ["READ_QUESTS", "LIST_QUESTS", "GET_QUESTS"],
  ),
  createActionAlias(
    "FIVE55_QUESTS_CREATE",
    questsCreateAction,
    "Compatibility alias for ARCADE555_QUESTS_CREATE.",
    ["CREATE_QUEST", "NEW_QUEST"],
  ),
  createActionAlias(
    "FIVE55_QUESTS_COMPLETE",
    questsCompleteAction,
    "Compatibility alias for ARCADE555_QUESTS_COMPLETE.",
    ["COMPLETE_QUEST", "FINISH_QUEST"],
  ),
  createActionAlias(
    "FIVE55_BATTLES_READ",
    battlesReadAction,
    "Compatibility alias for ARCADE555_BATTLES_READ.",
    ["READ_BATTLES", "LIST_BATTLES"],
  ),
  createActionAlias(
    "FIVE55_BATTLES_CREATE",
    battlesCreateAction,
    "Compatibility alias for ARCADE555_BATTLES_CREATE.",
    ["CREATE_BATTLE", "START_BATTLE", "DUEL_USER", "CREATE_CHALLENGE"],
  ),
  createActionAlias(
    "FIVE55_BATTLES_RESOLVE",
    battlesResolveAction,
    "Compatibility alias for ARCADE555_BATTLES_RESOLVE.",
    ["RESOLVE_BATTLE", "SETTLE_BATTLE"],
  ),
  createActionAlias(
    "FIVE55_REWARDS_PROJECT",
    rewardsProjectAction,
    "Compatibility alias for ARCADE555_REWARDS_PROJECT.",
    ["PROJECT_REWARDS", "REWARDS_PROJECTION"],
  ),
  createActionAlias(
    "FIVE55_REWARDS_ALLOCATE",
    rewardsAllocateAction,
    "Compatibility alias for ARCADE555_REWARDS_ALLOCATE.",
    ["ALLOCATE_REWARDS", "SETTLE_REWARDS", "PAYOUT_REWARDS"],
  ),
  createActionAlias(
    "FIVE55_SOCIAL_MONITOR",
    socialMonitorAction,
    "Compatibility alias for ARCADE555_SOCIAL_MONITOR.",
    ["SOCIAL_MONITOR", "READ_SOCIAL_FEED"],
  ),
  createActionAlias(
    "FIVE55_SOCIAL_ASSIGN_POINTS",
    socialAssignPointsAction,
    "Compatibility alias for ARCADE555_SOCIAL_ASSIGN_POINTS.",
    ["ASSIGN_SOCIAL_POINTS", "SOCIAL_POINTS_UPDATE"],
  ),
  createActionAlias(
    "FIVE55_THEME_SET",
    adminThemeSetAction,
    "Compatibility alias for ARCADE555_THEME_SET.",
    ["UPDATE_THEME", "CHANGE_THEME", "SET_THEME"],
  ),
  createActionAlias(
    "FIVE55_EVENT_TRIGGER",
    adminEventTriggerAction,
    "Compatibility alias for ARCADE555_EVENT_TRIGGER.",
    ["TRIGGER_EVENT", "START_EVENT", "ACTIVATE_BONUS"],
  ),
  createActionAlias(
    "FIVE55_CABINET_POSSESS",
    adminCabinetPossessAction,
    "Compatibility alias for ARCADE555_CABINET_POSSESS.",
    ["POSSESS_CABINET", "CONTROL_CABINET", "OVERRIDE_CABINET"],
  ),
  createActionAlias(
    "FIVE55_CABINET_RELEASE",
    adminCabinetReleaseAction,
    "Compatibility alias for ARCADE555_CABINET_RELEASE.",
    ["RELEASE_CABINET", "UNPOSSESS_CABINET", "RELEASE_MACHINE"],
  ),
  createActionAlias(
    "FIVE55_GITHUB_LIST_REPOS",
    githubListReposAction,
    "Compatibility alias for ARCADE555_GITHUB_LIST_REPOS.",
    ["LIST_GITHUB_REPOS", "GITHUB_LIST_REPOS", "LIST_REPOS", "SHOW_REPOS"],
  ),
];
