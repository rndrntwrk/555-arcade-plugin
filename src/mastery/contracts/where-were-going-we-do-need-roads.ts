import { createMasteryContract } from "./_shared.js";

export const roadsMasteryContract = createMasteryContract({
  gameId: "where-were-going-we-do-need-roads",
  aliases: ["roads", "where-were-going", "where_were_going"],
  title: "Where We're Going, We Do Need Roads",
  objective: {
    summary: "Endless road-shaping runner with hazard windows and shrinking safety margins.",
    winCondition: "Maximize distance while avoiding hazard collisions.",
    masteryDefinition: "Distance >= baseline*1.8 with low hazard collision rate.",
  },
  controls: [
    { action: "Road shaping", input: "Mouse/touch drag pointer" },
    { action: "Start", input: "Start button / mapped action" },
    { action: "Reset", input: "Reset button" },
  ],
  progression: [
    {
      id: "column_stream",
      label: "Column Stream",
      description: "Dynamic danger table over road columns with decreasing safe pauses.",
      successSignal: "Distance counter increases while maintaining safe path.",
      failureSignals: ["hazard_collision", "restart_latency"],
    },
  ],
  risks: [
    {
      id: "pointer-drift",
      label: "Pointer Drift",
      symptom: "Road shape lag leaves player trajectory inside danger band.",
      mitigation: "Increase lookahead and recenter pointer to projected collision point.",
    },
  ],
  passGates: [
    {
      id: "distance",
      metric: "distance.relativeToBaseline",
      operator: ">=",
      threshold: 1.8,
      description: "p50 distance >= baseline*1.8.",
    },
    {
      id: "collision-rate",
      metric: "hazards.collisionPerMinute",
      operator: "<=",
      threshold: 0.15,
      description: "Hazard collision rate <0.15/min.",
    },
    {
      id: "restart-latency",
      metric: "restart.latencySec",
      operator: "<=",
      threshold: 1,
      description: "Restart latency <=1s.",
    },
  ],
  recovery: {
    menu: "Trigger start button and validate pointer binding.",
    paused: "Resume via menu control.",
    gameOver: "Reset immediately and re-arm pointer drag.",
    stuck: "Reinitialize pointer state and restart on stale columns.",
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Start",
        binding: "Start button / runtime start()",
        source: "agent.js and index.html",
        semantics: "Bootstraps the endless run.",
      },
      {
        action: "Reset",
        binding: "Reset button",
        source: "agent.js and index.html",
        semantics: "Restarts after game over.",
      },
      {
        action: "Road shaping",
        binding: "Pointer drag",
        source: "agent.js and runtime pointer state",
        semantics: "The controller shapes the road by continuously placing the drag pointer ahead of the car.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["home screen visible", "runtime missing"],
        exitSignals: ["runtime present", "home hidden"],
        notes: "Menu is DOM and runtime readiness driven.",
      },
      {
        state: "PLAYING",
        enterSignals: ["runtime G present", "home hidden", "!end visible"],
        exitSignals: ["end screen visible", "window.gameOver"],
        notes: "PLAYING is the continuous road-shaping loop.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["end visible", "window.gameOver"],
        exitSignals: ["reset and fresh runtime"],
        notes: "Game over is explicit and should be followed by a clean drag re-arm.",
      },
    ],
    objectiveModel: {
      primaryObjective:
        "Shape the road continuously so the car avoids the danger bands while accumulating real distance under valid geometry.",
      winSignals: [
        "distance increases materially",
        "invalid placement count remains zero",
        "player trajectory stays outside active danger bands long enough to produce meaningful score growth",
      ],
      failSignals: [
        "hazard collision",
        "pointer drift into danger band",
        "buried or invalid road geometry",
        "distance pacing below the mastery bar despite valid geometry",
      ],
      currentFailureReason:
        "Runtime corruption and invalid-placement false signals were fixed, and the retained controller now keeps invalidPlacementCount at zero while materially improving real distance. The remaining blocker is distance pacing under valid geometry: the bot still shapes survivable roads, but not aggressively enough to clear the required long-run distance bar.",
    },
    levelTopology: {
      structure: "An endless column stream with ahead-of-car danger bands and a continuously shaped road surface.",
      stages: [
        "Run bootstrap",
        "Pointer-led road shaping",
        "Danger-band avoidance",
        "Game-over and restart",
      ],
      completionMetric: "Runtime distance while maintaining valid road geometry.",
      notes: [
        "The game is endless; mastery is a pacing and geometry problem, not a room/level problem.",
        "The controller now has truthful geometry and distance diagnostics, so the remaining work is pure path stability and pace.",
      ],
    },
    metricSourceMap: [
      {
        metric: "distance / score",
        coverage: "native",
        location: "window.G.distance or window.distance",
        notes: "Authoritative endless-run progression metric.",
      },
      {
        metric: "player position / velocity",
        coverage: "native",
        location: "window.G.player",
        notes: "Needed to place the future road-shaping pointer.",
      },
      {
        metric: "danger bands",
        coverage: "native",
        location: "getColumn(x).danger",
        notes: "Source of upcoming hazard windows.",
      },
      {
        metric: "pointer and shaped road intent",
        coverage: "controller",
        location: "window.G.pointer / agent.js lookahead logic",
        notes: "Controller-native shaping target for the road.",
      },
      {
        metric: "invalid placement count",
        coverage: "controller",
        location: "adapter geometry diagnostics",
        notes: "Controller-side truth check to ensure no buried or invalid road states are being counted as success.",
      },
    ],
    controllerDesign: {
      mode: "pre-closure-valid-road-geometry-and-distance-pacing",
      substates: [
        "RUN_BOOTSTRAP",
        "LOOKAHEAD_DANGER_SCAN",
        "SAFE_PATH_SHAPING",
        "DISTANCE_PACING",
        "RESTART_RECOVERY",
      ],
      currentBlockingSubsystem: "valid_road_geometry_distance_pacing_policy",
      controllerFailureMode:
        "The controller now avoids invalid geometry and reports zero invalid placements in truthful runs, but it still shapes the road too conservatively to hit the required long-run distance. The blocker is distance pacing under valid geometry, not fake placement or runtime corruption.",
      telemetryAdditions: [
        "lookahead danger-band choice versus actual pointer target",
        "distance pacing trend while invalidPlacementCount stays zero",
        "whether safe but over-conservative heights are being chosen repeatedly",
        "player trajectory relative to predicted danger bands",
      ],
      boundedGate:
        "Bounded smoke must show valid geometry and meaningful distance growth. Zero invalid placements alone is not sufficient without distance pacing improvement.",
    },
    smokeAssertions: [
      {
        id: "roads_valid_geometry_truth",
        description: "Road shaping must remain valid while distance grows.",
        successMetric: "invalidPlacementCount stays zero and distance rises",
        currentFailure: "Validity is now strong, but distance pacing still lags.",
      },
      {
        id: "roads_distance_pacing",
        description: "Controller must choose a forward road shape that sustains speed through danger bands.",
        successMetric: "distance materially exceeds retained baseline under valid geometry",
        currentFailure: "Current lookahead is safe but too conservative.",
      },
      {
        id: "roads_bounded_gate",
        description: "Bounded smoke must improve distance without introducing invalid placement regressions.",
        successMetric: "higher distance and still-zero invalid placements",
        currentFailure: "Controller is honest but not yet fast enough.",
      },
    ],
  },
  policy: { family: "path_stability" },
});
