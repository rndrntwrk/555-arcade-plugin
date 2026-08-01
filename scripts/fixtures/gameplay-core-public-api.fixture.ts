import {
  DRIVE555_INITIAL_FIXTURE,
  DRIVE555_RACING_LINE_POLICY_DEFAULTS,
  DRIVE555_RECOVERY_POLICY_DEFAULTS,
  drive555Adapter,
  drive555EventWindowDetector,
  racingLineController,
} from "@rndrntwrk/plugin-555arcade/gameplay-core";
import type {
  Drive555EventWindowState,
  Drive555RawState,
  RacingLinePolicy,
  RacingLineState,
} from "@rndrntwrk/plugin-555arcade/gameplay-core";

const rawState: Drive555RawState | null = null;
const policy: RacingLinePolicy = DRIVE555_RACING_LINE_POLICY_DEFAULTS;
const controllerState: RacingLineState = racingLineController.initialState(policy);
const eventWindowState: Drive555EventWindowState = drive555EventWindowDetector.initialState();

void [
  rawState,
  controllerState,
  eventWindowState,
  drive555Adapter.manifest.gameId,
  DRIVE555_INITIAL_FIXTURE.fixtureDigest,
  DRIVE555_RECOVERY_POLICY_DEFAULTS.stallWindowMs,
];
