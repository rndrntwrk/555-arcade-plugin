import { createMasteryContract } from "./_shared.js";

export const leftAndRightMasteryContract = createMasteryContract({
  gameId: "leftandright",
  aliases: ["left-and-right"],
  title: "Left and Right",
  objective: {
    summary: "Dual-car lane switch reflex game with obstacle/collectible flow.",
    winCondition: "Collect safely while minimizing unsafe lane swaps.",
    masteryDefinition: "Score uplift +50% with <2% unsafe swap decisions.",
  },
  controls: [
    { action: "Lane group toggle", input: "Left / Right" },
    { action: "Restart", input: "Space" },
  ],
  progression: [
    {
      id: "stream",
      label: "Four-Lane Stream",
      description: "Continuous A/B/C/D spawn timing with synchronized car control.",
      successSignal: "Score climbs with low collision cadence.",
      failureSignals: ["unsafe_swap", "collision_gameover"],
    },
  ],
  risks: [
    {
      id: "swap-latency",
      label: "Swap Latency",
      symptom: "Late lane toggles cause unavoidable collisions.",
      mitigation: "Increase anticipation horizon and lower risky collectible bias.",
    },
  ],
  passGates: [
    {
      id: "score-gain",
      metric: "score.relativeToBaseline",
      operator: ">=",
      threshold: 1.5,
      description: "p50 score >= baseline +50%.",
    },
    {
      id: "unsafe-swap-rate",
      metric: "swap.unsafeRate",
      operator: "<=",
      threshold: 0.02,
      description: "Unsafe swaps below 2% of decisions.",
    },
  ],
  recovery: {
    menu: "Start loop and verify lane ticker updates.",
    paused: "Resume with mapped key when available.",
    gameOver: "Space restart and resync lane cadence.",
    stuck: "Issue rapid double-toggle to recover control sync.",
  },
  policy: {
    family: "reflex_timing",
    defaults: {
      collectibleBias: 0.78,
      hazardAvoidanceBias: 0.82,
      recenterBias: 0.62,
      riskTolerance: 0.34,
    },
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Left pair toggle",
        binding: "ArrowLeft",
        source: "agent.js",
        semantics: "Switches the left car between lanes A and B.",
      },
      {
        action: "Right pair toggle",
        binding: "ArrowRight",
        source: "agent.js",
        semantics: "Switches the right car between lanes C and D.",
      },
      {
        action: "Restart / start",
        binding: "Space",
        source: "agent.js",
        semantics: "Starts or restarts the current endless run.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["left_sprite missing", "right_sprite missing"],
        exitSignals: ["left_sprite present", "right_sprite present"],
        notes: "Menu is inferred from missing active car sprites.",
      },
      {
        state: "PLAYING",
        enterSignals: ["left_sprite present", "right_sprite present", "!window.isGameOver"],
        exitSignals: ["window.isGameOver"],
        notes: "PLAYING is the active dual-car lane arbitration loop.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["window.isGameOver"],
        exitSignals: ["restart() or loop.start() returns to live sprites"],
        notes: "Game over is runtime-native and should be classified by death reason, not just by score loss.",
      },
    ],
    objectiveModel: {
      primaryObjective:
        "Keep both cars alive in the four-lane stream by making timely lane commitments that collect viable collectibles and avoid imminent obstacle collisions.",
      winSignals: [
        "survivalSec rises materially with no collision",
        "score increases while wrong collectible count stays zero",
        "lane decisions remain aligned with survivable lanes under cooldown constraints",
      ],
      failSignals: [
        "obstacle_hit",
        "missed_collectible",
        "stale already_desired commitment into an invalidated lane",
        "cooldown lock after an early low-value swap",
      ],
      currentFailureReason:
        "The runtime now reports truthful fail reasons and the controller diagnostics expose per-side lane commitments. The dominant failure is not wrong-coin logic; it is commitment timing. The bot commits too early to an already_desired or urgent-collect lane, that lane invalidates under falling obstacles while swap cooldown is still active, and obstacle_hit remains the dominant death class.",
    },
    levelTopology: {
      structure: "An endless four-lane stream with two independently toggled cars controlling lane pairs A/B and C/D.",
      stages: [
        "Run bootstrap",
        "Dual-car lane scoring and commitment",
        "Cooldown-constrained lane invalidation recovery",
        "Death by obstacle or missed collectible",
      ],
      completionMetric: "Survival time and score under truthful fail reasons; there are no rooms or finite levels.",
      notes: [
        "The source runtime ends the run both on obstacle collision and on certain missed collectible conditions.",
        "The closure problem is temporal arbitration, not static route planning.",
      ],
    },
    metricSourceMap: [
      {
        metric: "score",
        coverage: "native",
        location: "window.score",
        notes: "Primary live score source for this endless run.",
      },
      {
        metric: "cars and lanes",
        coverage: "native",
        location: "window.left_sprite, window.right_sprite, lane constants A/B/C/D",
        notes: "Source of lane occupancy and swap consequences.",
      },
      {
        metric: "obstacles and collectibles",
        coverage: "native",
        location: "window.sprites with sprite.type",
        notes: "Native stream entities the controller scores each tick.",
      },
      {
        metric: "fail reason",
        coverage: "native",
        location: "runtime fail-reason hooks in main.js",
        notes: "Truth source for obstacle_hit versus missed_collectible.",
      },
      {
        metric: "lane commitment diagnostics",
        coverage: "controller",
        location: "agent.js diagnostics",
        notes: "Required to classify commitment timing, cooldown lock, and invalidation timing.",
      },
    ],
    controllerDesign: {
      mode: "pre-closure-dual-car-lane-commitment-and-invalidation-planner",
      substates: [
        "RUN_BOOTSTRAP",
        "LANE_SCORE_EVALUATION",
        "URGENT_COLLECT_DECISION",
        "COMMITTED_LANE_HOLD",
        "COOLDOWN_LOCK",
        "LANE_INVALIDATION_REEVAL",
        "RESTART_RECOVERY",
      ],
      currentBlockingSubsystem: "lane_commitment_timing_and_invalidation_policy",
      controllerFailureMode:
        "The retained baseline already scores both lane pairs and exposes pre-death traces, but it still commits too early to collectible-favored lanes. Once cooldown is spent, the active lane invalidates underneath the car and obstacle_hit dominates before a new safe swap window opens.",
      telemetryAdditions: [
        "decisionAgeMs and framesSinceLastSwap",
        "first invalidation after commitment",
        "death-class classification per side",
        "lane-pair score/risk/reward traces",
        "explicit cooldown-locked versus committed-too-early reasoning",
      ],
      boundedGate:
        "Bounded smoke must reduce obstacle-hit dominance without collapsing score or survival. Generic reward/risk tweaks are not sufficient; the artifact must show improved commitment timing and invalidation recovery.",
    },
    smokeAssertions: [
      {
        id: "leftandright_truthful_fail_reason",
        description: "Runs must classify deaths as obstacle or missed collectible from source truth.",
        successMetric: "failReasonCounts present and stable",
        currentFailure: "Truth path is fixed; controller closure still fails on obstacle-heavy commitment timing.",
      },
      {
        id: "leftandright_commitment_timing",
        description: "Controller must re-evaluate stale lane commitments before the lane invalidates under cooldown.",
        successMetric: "reduced committed_too_early / cooldown_locked tails and longer survival",
        currentFailure: "Current controller sits in already_desired or urgent-collect holds until obstacle collision.",
      },
      {
        id: "leftandright_bounded_gate",
        description: "Short smoke runs must improve survival without score collapse.",
        successMetric: "survival and score both hold while obstacle deaths fall",
        currentFailure: "Broad veto and bypass patches regressed and were reverted.",
      },
    ],
  },
});
