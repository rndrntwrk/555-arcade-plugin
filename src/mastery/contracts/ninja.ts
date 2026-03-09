import { createMasteryContract } from "./_shared.js";

export const ninjaMasteryContract = createMasteryContract({
  gameId: "ninja",
  aliases: ["ninja-evilcorp", "ninja_vs_evilcorp", "ninja-vs-evilcorp"],
  title: "Ninja",
  objective: {
    summary: "Stealth platformer with fixed level maps and guard/camera constraints.",
    winCondition: "Reach each level exit with minimal detections.",
    masteryDefinition: "High completion with deterministic route + retry recovery.",
  },
  controls: [
    { action: "Move", input: "Arrow keys / WASD" },
    { action: "Jump", input: "Space" },
    { action: "Retry", input: "R" },
  ],
  progression: [
    {
      id: "menu",
      label: "Menu",
      description: "Difficulty/menu stage.",
      successSignal: "PLAYING state and level spawn resolved.",
      failureSignals: ["start_stall"],
    },
    {
      id: "level_matrix",
      label: "Level Matrix",
      description: "Move through fixed level graphs with patrol awareness.",
      successSignal: "Exit tile reached.",
      failureSignals: ["camera_detection", "guard_contact", "fall_loop"],
    },
  ],
  risks: [
    {
      id: "patrol-desync",
      label: "Patrol Desync",
      symptom: "Route timing collides with guard patrol windows.",
      mitigation: "Introduce wait frames at deterministic danger junctions.",
    },
  ],
  passGates: [
    {
      id: "level-completion",
      metric: "levels.completionRate",
      operator: ">=",
      threshold: 0.8,
      description: "Complete levels at least 80% of episodes.",
    },
    {
      id: "detection-mean",
      metric: "detections.meanPerLevel",
      operator: "<=",
      threshold: 1.2,
      description: "Mean detections <=1.2 per level.",
    },
    {
      id: "retry-recovery",
      metric: "retry.recoverySec",
      operator: "<=",
      threshold: 1,
      description: "Retry lifecycle recovers in one second or less.",
    },
  ],
  recovery: {
    menu: "Enter START path and verify level entity spawn.",
    paused: "Resume with mapped pause key.",
    gameOver: "R retry pulse until state returns PLAYING.",
    stuck: "Fallback to local retry when progress delta is flat.",
  },
  policy: {
    family: "platform_route",
    defaults: {
      reactionWindowMs: 165,
      riskTolerance: 0.42,
      recoveryBias: 0.68,
      hazardAvoidanceBias: 0.8,
    },
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Move left / right",
        binding: "ArrowLeft / ArrowRight",
        source: "agent.js and runtime key handlers",
        semantics: "Horizontal movement is deterministic and is the primary route-following control.",
      },
      {
        action: "Jump",
        binding: "Space",
        source: "agent.js and runtime key handlers",
        semantics: "Jump cadence is the key control for wall climbs, roof-gap transitions, and exit intercepts.",
      },
      {
        action: "Retry",
        binding: "R",
        source: "agent.js",
        semantics: "Retry returns the level to a fresh spawn and must be used for explicit recovery only.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["!G.aA", "level.cs falsey", "player missing"],
        exitSignals: ["G.aA truthy", "level.cs truthy", "player entity present"],
        notes: "Menu is inferred from runtime readiness and missing play-state entities.",
      },
      {
        state: "PLAYING",
        enterSignals: ["G.aA truthy", "level.cs truthy", "!level.bx"],
        exitSignals: ["level.bx", "level.dZ"],
        notes: "PLAYING is the only state where level routing and exit progression are meaningful.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["level.bx", "level.dZ"],
        exitSignals: ["R retry", "fresh PLAYING spawn"],
        notes: "Game-over is native and must not be confused with a menu/bootstrap state.",
      },
    ],
    objectiveModel: {
      primaryObjective:
        "Traverse the fixed stealth-platform levels by following geometry-aware routes, avoiding patrol/camera failures, and touching each level exit to advance level._a to at least 8.",
      winSignals: [
        "runtime level._a increases under controller input",
        "exit world position is reached or crossed in the current level",
        "pathIdx and route substates advance through the real level geometry",
      ],
      failSignals: [
        "camera or guard death states",
        "fall loop or wall-cling loop without route promotion",
        "generic later-level routing with no source-backed policy",
        "any forced or synthetic level advancement path",
      ],
      currentFailureReason:
        "The controller now reads the real level matrix and exits honestly, but it still fails at the level-0 runtime-gap transition and then falls back to generic later-level routes. The stable blocker is level-0 runtime-gap transition policy: the bot can reach the upper chamber honestly, but it does not yet convert that into the roof-gap and top-corridor closure needed for repeatable real level advancement.",
    },
    levelTopology: {
      structure: "A fixed 20x20 tile-matrix stealth platformer with an ordered level chain and deterministic exits.",
      stages: [
        "Menu bootstrap",
        "Per-level fixed route execution",
        "Wall-climb / gap / roof transition phases",
        "Exit touch and next-level promotion",
      ],
      completionMetric: "Runtime level._a / native level progression, not controller-derived score.",
      notes: [
        "agent.js embeds level matrices and route waypoints sourced from levels.js.",
        "The current closure blocker is entirely inside level 0; higher levels must not be tuned until that closes honestly.",
      ],
    },
    metricSourceMap: [
      {
        metric: "level",
        coverage: "native",
        location: "level._a",
        notes: "Runtime-native level progression is the only acceptable mastery progression source.",
      },
      {
        metric: "player position / velocity",
        coverage: "native",
        location: "level._H",
        notes: "Source of route progression, wall attachment, and roof-gap closure.",
      },
      {
        metric: "matrix / exit cell",
        coverage: "native",
        location: "level.S._C and level.S.am",
        notes: "Native tile grid and exit coordinates used by the controller.",
      },
      {
        metric: "route path index / runtime-gap substates",
        coverage: "controller",
        location: "adapter route state",
        notes: "Controller-native diagnostics required to classify the level-0 gap transition failure.",
      },
      {
        metric: "score proxy",
        coverage: "controller",
        location: "agent.js derived level/time score",
        notes: "Quality-only metric; not authoritative for progression.",
      },
    ],
    controllerDesign: {
      mode: "pre-closure-level0-runtime-gap-and-generic-level-routes",
      substates: [
        "MENU_BOOTSTRAP",
        "LEVEL0_RUNTIME_GAP",
        "ROOF_GAP_APPROACH",
        "TOP_CORRIDOR",
        "EXIT_INTERCEPT",
        "GENERIC_LATER_LEVEL_ROUTE",
        "RETRY_RECOVERY",
      ],
      currentBlockingSubsystem: "level0_runtime_gap_transition_policy",
      controllerFailureMode:
        "The retained controller reaches the level-0 chamber honestly but does not convert that chamber state into a stable roof-gap and top-corridor transition. That prevents repeatable native level advancement and makes all later-level routing moot until the level-0 runtime-gap seam is closed.",
      telemetryAdditions: [
        "routeModel and routeSubstate per PLAYING sample",
        "runtime-gap chamber and roof-gap promotion state",
        "best waypoint and exit-distance progression inside level 0",
        "retry cause and retry recovery reason",
        "proof that no synthetic level advancement path fired",
      ],
      boundedGate:
        "Bounded smoke must show runtime-native level progression, route-state promotion through the level-0 runtime-gap seam, and no synthetic level advancement. Chamber entry alone is not sufficient.",
    },
    smokeAssertions: [
      {
        id: "ninja_runtime_level_truth",
        description: "Reported level progression must come from runtime-native level._a.",
        successMetric: "level max increases without synthetic path activation",
        currentFailure: "Current root controller still has a level-0 seam that prevents honest advancement to the required mastery bar.",
      },
      {
        id: "ninja_level0_runtime_gap",
        description: "Controller must convert level-0 chamber ascent into roof-gap and top-corridor closure.",
        successMetric: "routeSubstate progresses through roof-gap / top corridor and level changes",
        currentFailure: "The bot reaches the chamber but not the stable runtime-gap closure.",
      },
      {
        id: "ninja_bounded_gate",
        description: "Bounded smoke must classify the exact seam instead of treating the run as generic low progress.",
        successMetric: "route diagnostics and blocker classification present in the smoke artifact",
        currentFailure: "Without the level-0 seam closure, later levels remain unactionable.",
      },
    ],
  },
});
