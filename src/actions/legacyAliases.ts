import type { Action } from "../types/index.js";
import { gamesCatalogAction } from "./gamesCatalog.js";
import { gamesPlayAction } from "./gamesPlay.js";
import { gamesStopAction } from "./gamesStop.js";
import { gamesSwitchAction } from "./gamesSwitch.js";
import { scoreSubmitAction } from "./scoreSubmit.js";

function createActionAlias(
  actionName: string,
  sourceAction: Action,
  description: string,
  extraSimiles: string[] = [],
): Action {
  return {
    ...sourceAction,
    name: actionName,
    description,
    similes: Array.from(
      new Set([...(sourceAction.similes ?? []), ...extraSimiles]),
    ),
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
    gamesPlayAction,
    "Compatibility alias for ARCADE555_GAMES_PLAY. Use STREAM555_GO_LIVE separately when stream orchestration is required.",
    ["FIVE55_GO_LIVE_PLAY"],
  ),
  createActionAlias(
    "FIVE55_SCORE_CAPTURE_SUBMIT",
    scoreSubmitAction,
    "Compatibility alias for ARCADE555_SCORE_SUBMIT.",
    ["FIVE55_REPORT_SCORE"],
  ),
];
