import { createMasteryContract } from "./_shared.js";

export const vedasRunMasteryContract = createMasteryContract({
  gameId: "vedas-run",
  aliases: ["vedasrun", "vedas_run"],
  title: "Vedas Run",
  objective: {
    summary: "3D runner/platform route with segmented map and multi-ending logic.",
    winCondition: "Reach successful ending while minimizing falls/turret deaths.",
    masteryDefinition: "Ending success >=80% with controlled hazard death shares.",
  },
  controls: [
    { action: "Move", input: "Arrow keys" },
    { action: "Jump", input: "Space" },
    { action: "Restart", input: "1" },
  ],
  progression: [
    {
      id: "segment_chain",
      label: "Segment Chain",
      description: "~14 segment progression over 10x10 tile chunks with branch endings.",
      successSignal: "Valid ending path completed.",
      failureSignals: ["fall_death", "turret_hit", "wrong_ending_path"],
    },
  ],
  risks: [
    {
      id: "jump-timing",
      label: "Jump Timing Drift",
      symptom: "Late jump windows produce repeated fall deaths.",
      mitigation: "Advance jump trigger by projected tile edge velocity.",
    },
  ],
  passGates: [
    {
      id: "ending-success",
      metric: "ending.successRate",
      operator: ">=",
      threshold: 0.8,
      description: "Successful ending >=80%.",
    },
    {
      id: "fall-deaths",
      metric: "deaths.fallRate",
      operator: "<=",
      threshold: 0.15,
      description: "Fall deaths <15%.",
    },
    {
      id: "turret-deaths",
      metric: "deaths.turretRate",
      operator: "<=",
      threshold: 0.2,
      description: "Turret-hit deaths <20%.",
    },
  ],
  recovery: {
    menu: "Click start or key 1 fallback.",
    paused: "Resume through pause toggle.",
    gameOver: "Immediate key 1 restart.",
    stuck: "Reset held keys and restart if segment index stalls.",
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Horizontal movement",
        binding: "Arrow Left / Arrow Right",
        source: "README.md + agent.js",
        semantics: "Lane correction and track alignment are explicit horizontal controls.",
      },
      {
        action: "Jump",
        binding: "Space",
        source: "README.md + agent.js",
        semantics: "Jump timing is required for platforms and beam/cannon avoidance.",
      },
      {
        action: "Restart",
        binding: "1",
        source: "src/app/game.js keydownEventHandler",
        semantics: "Full run reset is native and clears tz/player/plane/backdrop/object state.",
      },
      {
        action: "Start",
        binding: "Start button / game.startLoop()",
        source: "src/app/ui.js + src/app/game.js + agent.js",
        semantics: "The intro/start flow is UI-driven before the main loop begins.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["window.gs missing", "gs.isRunning false", "gs.status !== 2"],
        exitSignals: ["gs.isRunning true and gs.status === 2"],
        notes: "The adapter currently treats all non-running states as MENU until an explicit game-over status is reached.",
      },
      {
        state: "PLAYING",
        enterSignals: ["gs.isRunning true", "gs.status === 2"],
        exitSignals: ["gs.status === 3", "restart"],
        notes: "PLAYING is driven by the main loop and absolute tz progression.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["gs.status === 3", "window.G.h = 2", "lastEndReason set"],
        exitSignals: ["restart key 1"],
        notes: "Endings 1/2/4 are terminal failures; type 3 is the secret ending path.",
      },
    ],
    objectiveModel: {
      primaryObjective: "Progress through the runner’s segment chain, preserve viable lanes across gaps and turrets, and reach the intended successful ending path rather than merely surviving for a short distance.",
      winSignals: [
        "segment increases toward the mastery target",
        "progressRow and tz advance together under PLAYING",
        "ending type/reason reflects the intended completion path rather than a fall or beam death",
      ],
      failSignals: [
        "fall_off_platform",
        "turret or beam death",
        "segment stall with repeated restarts",
        "wrong ending path / premature terminal state",
      ],
      currentFailureReason:
        "The root controller is still too coarse for the first real continuity chain. Source review of plane.js, hero.js, and the early segment map shows the stable blocker starts one seam earlier than previously labeled: segment 0 contains an immediate center-gap jump that must preserve airborne carry into the segment-1 scripted long-jump window. The retained short-jump fix improved real progress, but the controller still does not convert that segment-0 jump plus segment-1 held long jump into a stable continuity chain through the first 3-row gap.",
    },
    levelTopology: {
      structure: "A segmented 3D runner map where absolute tz is partitioned by plane.segmentLength into segment progression with multiple endings and a late omega/boss sequence.",
      stages: [
        "Intro / start loop bootstrap",
        "Early segment lane and jump stabilization",
        "Mid-run turret and gap management",
        "Late-run segment progression toward ending branch",
        "Ending-specific completion path",
      ],
      completionMetric: "segment and progressRow progression backed by absoluteTz and ending type.",
      notes: [
        "segment = floor(absoluteTz / segmentLength) in the adapter.",
        "game.js encodes ending types 1, 2, 3, and 4 with lastEndReason.",
      ],
    },
    metricSourceMap: [
      {
        metric: "segment / progressRow / tz",
        coverage: "native",
        location: "gs.tz, gs.plane.segmentLength, gs.plane.gsH",
        notes: "Core progression metrics are already native and strong.",
      },
      {
        metric: "ending reason / type",
        coverage: "native",
        location: "gs.lastEndReason, window.G.lastEndReason, state.lastEndType",
        notes: "Ending classification is natively available and should be part of mastery.",
      },
      {
        metric: "lane quality",
        coverage: "controller",
        location: "agent.js computeTrack / laneScore / nextGapRows",
        notes: "Current controller-derived lane heuristics are useful but not authoritative for mastery.",
      },
      {
        metric: "active missiles / turrets / heroHp",
        coverage: "native",
        location: "gs.objects and gs.player.health",
        notes: "Hazard state is already exposed natively.",
      },
    ],
    controllerDesign: {
      mode:
        "segment-0 immediate-gap, segment-1 long-jump, and segment-2 random-platform continuity policy required",
      substates: [
        "INTRO_BOOTSTRAP",
        "SCRIPTED_JUMP_WINDOWS",
        "LANE_SELECTION",
        "JUMP_TIMING",
        "SEGMENT_HAZARD_AVOIDANCE",
        "ENDING_BRANCH_CONTROL",
        "RESTART_RECOVERY",
      ],
      currentBlockingSubsystem: "segment2_random_platform_continuity_policy",
      controllerFailureMode:
        "Current root controller now clears the immediate segment-0 gap and the first segment-1 held long jump honestly, then reaches segment 2 and stalls in the randomized platform band. The next missing policy is not the old first seam anymore; it is deterministic continuity through the segment-2 random-platform section after the long-jump recovery ends and control falls back to coarse lane scoring.",
      telemetryAdditions: [
        "Scripted jump-window id / delta / hold-hint",
        "Segment continuity phase around the segment-0 immediate-gap takeoff plus segment-1 long-jump setup / hold / post-gap recovery",
        "Segment-local hazard topology markers",
        "Ending-branch intent flag",
        "Control-surface coverage per segment window",
      ],
      boundedGate:
        "Bounded smoke must prove correct segment-0 immediate-gap traversal plus a deterministic held long jump through the segment-1 gap, not only short-distance survival.",
    },
    smokeAssertions: [
      {
        id: "vedas_scripted_jump_windows",
        description: "Early tutorial/scripted jump windows must be traversed intentionally rather than by generic local lane safety.",
        successMetric:
          "scriptWindowIndex / nextScriptWindowDelta advance through the early tz≈400/730/1000 windows while progressRow and segment continue increasing",
        currentFailure:
          "The retained controller now converts the segment-0 immediate jump plus the tz≈730 window into a stable held center-lane long jump, but it does not yet preserve deterministic continuity once control reaches the randomized segment-2 platform band.",
      },
      {
        id: "vedas_segment_progression",
        description: "Segment progression must be visible and native.",
        successMetric: "segment delta and progressRow delta both increase during PLAYING",
        currentFailure:
          "Current controller now reaches segment 2 and progress rows in the mid-20s honestly, but native progression still stalls inside the segment-2 random-platform continuity section.",
      },
      {
        id: "vedas_hazard_coverage",
        description: "Controller must exercise lane plus jump control against hazards.",
        successMetric: "lane changes, jump timing, and hazard metrics co-occur in telemetry",
        currentFailure:
          "Current controller covers the first seam but still lacks an audited continuity policy for the segment-2 random-platform band after the long-jump recovery ends.",
      },
      {
        id: "vedas_ending_integrity",
        description: "End-state should be classifiable as desired ending or explicit fail.",
        successMetric: "lastEndReason / lastEndType always explain terminal runs",
        currentFailure: "Current controller has no explicit ending-path policy.",
      },
    ],
  },
  policy: { family: "runner_obstacle_timing" },
});
