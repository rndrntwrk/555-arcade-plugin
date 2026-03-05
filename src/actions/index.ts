import { authVerifyAction } from "./authVerify.js";
import { gamesCatalogAction } from "./gamesCatalog.js";
import { gamesPlayAction } from "./gamesPlay.js";
import { gamesStopAction } from "./gamesStop.js";
import { gamesSwitchAction } from "./gamesSwitch.js";
import { healthcheckAction } from "./healthcheck.js";
import { legacyActionAliases } from "./legacyAliases.js";
import { scoreSubmitAction } from "./scoreSubmit.js";
import { sessionBootstrapAction } from "./sessionBootstrap.js";

const enableLegacyActionAliases =
  process.env.ARCADE555_ENABLE_LEGACY_ACTION_ALIASES === "true";

export const allActions = [
  healthcheckAction,
  authVerifyAction,
  sessionBootstrapAction,
  gamesCatalogAction,
  gamesPlayAction,
  gamesSwitchAction,
  gamesStopAction,
  scoreSubmitAction,
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
  scoreSubmitAction,
  legacyActionAliases,
};
