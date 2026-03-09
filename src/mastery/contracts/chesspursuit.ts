import { createMasteryContract } from "./_shared.js";

export const chesspursuitMasteryContract = createMasteryContract({
  gameId: "chesspursuit",
  aliases: ["chess-pursuit"],
  title: "Chesspursuit",
  objective: {
    summary: "Threat-avoidance puzzle with chess-like attack vectors.",
    winCondition: "Advance checkpoint-row progress while respecting native threat maps.",
    masteryDefinition:
      "Reach real board checkpoints through legal move planning, not static-board survival.",
  },
  controls: [
    { action: "Move", input: "Arrow keys / WASD" },
    { action: "Start", input: "Space" },
    { action: "Pause/Resume", input: "Enter" },
  ],
  progression: [
    {
      id: "board_progression",
      label: "Board Progression",
      description: "Advance row-block checkpoints while avoiding active threat lines.",
      successSignal: "Checkpoint and completion states achieved.",
      failureSignals: ["threat_violation", "pause_lock"],
    },
  ],
  risks: [
    {
      id: "threat-overlook",
      label: "Threat Overlook",
      symptom: "Agent advances into active piece attack lanes.",
      mitigation: "Require threat map confirmation before each move commit.",
    },
  ],
  passGates: [
    {
      id: "completion-rate",
      metric: "run.completionRate",
      operator: ">=",
      threshold: 0.85,
      description: "Completion >=85%.",
    },
    {
      id: "threat-fatal-rate",
      metric: "threat.fatalTurnRate",
      operator: "<=",
      threshold: 0.05,
      description: "Fatal threat violations <5% of turns.",
    },
    {
      id: "pause-integrity",
      metric: "pause.resumeCorrectness",
      operator: "==",
      threshold: 1,
      description: "Pause/resume correctness remains 100%.",
    },
  ],
  recovery: {
    menu: "Start with Space and verify board control enabled.",
    paused: "Enter toggles until PLAYING.",
    gameOver: "Restart from run menu and reset board stage.",
    stuck: "Re-open menu and relaunch board if no move accepted.",
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Move one square",
        binding: "Arrow keys or mouse",
        source: "src/index.html + game runtime exports",
        semantics: "Moves are discrete board actions, not freeform movement.",
      },
      {
        action: "Start / restart",
        binding: "Space and click",
        source: "agent.js clickStart() + intro/menu handling",
        semantics: "The live adapter already relies on Space plus click for menu/bootstrap reliability.",
      },
      {
        action: "Pause / resume",
        binding: "Enter",
        source: "src/index.html help text + exported paused flag",
        semantics: "Pause is explicitly supported and must remain correct under automation.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["intro true", "player missing"],
        exitSignals: ["player present", "intro false"],
        notes: "Intro/menu can still expose a board, so menu must be keyed off the exported intro/player state rather than screenshots alone.",
      },
      {
        state: "PLAYING",
        enterSignals: ["player present", "gameOver false", "paused false"],
        exitSignals: ["paused true", "gameOver true"],
        notes: "Board progression is meaningful only while PLAYING.",
      },
      {
        state: "PAUSED",
        enterSignals: ["exported paused true"],
        exitSignals: ["paused false"],
        notes: "Pause integrity is part of the current contract and must stay explicit.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["gameIsOver or vb true"],
        exitSignals: ["restart to intro or playing"],
        notes: "Game-over is native and should be treated as terminal evidence.",
      },
    ],
    objectiveModel: {
      primaryObjective: "Advance a black-king player down the scrolling board by choosing legal safe moves that preserve row/checkpoint progression while respecting chess-piece threat lines.",
      winSignals: [
        "progressRow increases over time",
        "checkpoint count advances",
        "nextCheckpointDistanceRows closes while checkpoint count eventually advances",
        "board progression occurs without playerInvalid churn",
      ],
      failSignals: [
        "static board or row with no progression",
        "fatal threat violation",
        "pre-checkpoint reset before checkpoint attainment",
        "pre-checkpoint route target oscillates between edge lanes without checkpoint conversion",
        "playerInvalid / keysBlockedUntilAllUp loops",
        "pause/menu misclassification on a visible board",
      ],
      currentFailureReason:
        "The current controller now reads native board and legality truthfully, but its pre-checkpoint planner still over-selects edge target columns before checkpoint 1. Transient pawn-band / slalom states do appear, but the retained bounded runs still end with edge-target bias even when those states are inactive, so the stable blocker is edge-route targeting before checkpoint conversion rather than seam survival or legality churn.",
    },
    levelTopology: {
      structure: "An 8-column scrolling chess board with checkpoints and enemy-piece threat zones instead of discrete rooms or free movement.",
      stages: [
        "Intro / board bootstrap",
        "Threat-map scanning",
        "Checkpoint-aligned row progression",
        "Late-board survival without invalid move churn",
      ],
      completionMetric: "progressRow and checkpoint count from native runtime exports.",
      notes: [
        "The agent reads player from Eb / __chessPursuitState.player and the board from zb / exported board.",
        "This game is progression-on-board, not just survival against threats.",
      ],
    },
    metricSourceMap: [
      {
        metric: "progressRow",
        coverage: "native",
        location: "__chessPursuitState.progress or window.xb",
        notes: "Primary forward board-progress metric and the correct anti-stall source.",
      },
      {
        metric: "checkpoint",
        coverage: "native",
        location: "__chessPursuitState.checkpoint or window.rb",
        notes: "Native checkpoint counter; mastery must be checkpoint-driven, not score-driven.",
      },
      {
        metric: "nextCheckpointRow / nextCheckpointDistanceRows / playerCheckpointDistanceRows",
        coverage: "native",
        location: "__chessPursuitState.nextCheckpointRow plus adapter-derived distance metrics",
        notes: "These expose the exact gap between board progress, player row, and the next native checkpoint trigger.",
      },
      {
        metric: "playerInvalid / keysBlockedUntilAllUp",
        coverage: "native",
        location: "__chessPursuitState exports",
        notes: "Critical for diagnosing illegal-move loops.",
      },
      {
        metric: "fellBehindThresholdRow / progressLagMargin",
        coverage: "hybrid",
        location: "agent.js derived from native progressRow and playerRow",
        notes: "This exposes the exact native loss threshold that triggers `fell_behind_progress`.",
      },
      {
        metric: "gameOverCount / menuReentryCountAfterPlaying / restartCount",
        coverage: "controller",
        location: "agent.js lifecycle transition counters",
        notes: "These prove whether runs are resetting before the first checkpoint is attained.",
      },
      {
        metric: "furthestProgressRow / furthestPlayerRow / lifeMaxProgressRow / lifeMaxPlayerRow",
        coverage: "controller",
        location: "agent.js per-session and per-life furthest-row tracking",
        notes: "These distinguish real best-life progress from end-of-run snapshots after resets.",
      },
      {
        metric: "threats / safeMoves / checkCount",
        coverage: "hybrid",
        location: "agent.js threat-map and move scoring + __chessPursuitState.checkCount",
        notes: "Legality and invalid churn are now observable enough to prove the remaining blocker is route-target selection under forward-blocked pre-checkpoint states, not illegal move spam.",
      },
      {
        metric: "pawnBandCurrentRowPawns / pawnBandRowPlus2Pawns / edgeSlalom*",
        coverage: "controller",
        location: "agent.js route-plan diagnostics",
        notes: "These expose when the planner is entering pawn-band or edge-slalom targeting and whether that transition is actually justified by the current board state.",
      },
    ],
    controllerDesign: {
      mode: "checkpoint-distance-and-route-target planner",
      substates: [
        "INTRO_BOOTSTRAP",
        "LEGAL_MOVE_SCAN",
        "PRE_CHECKPOINT_ROUTE_TARGET_SELECTION",
        "CHECKPOINT_DISTANCE_CLOSE",
        "INVALID_MOVE_RECOVERY",
        "STALL_BREAK",
      ],
      currentBlockingSubsystem: "checkpoint1_wedge_window_move_selection_policy",
      controllerFailureMode:
        "Current move choice is legality-aware and can advance rows, and the retained planner patches now recover out of the worst row-cap seam and opposite-edge flips. The remaining blocker is narrower: once the player reaches the checkpoint-1 wedge rows, the move-selection phase inside that wedge still does not hold the correct central conversion line long enough to reach checkpoint 1. The stable blocker is now checkpoint-1 wedge-window move selection, not the earlier generic edge-route bias or row-cap seam.",
      telemetryAdditions: [
        "Pre-checkpoint reset counts",
        "Furthest row tracking per life and per session",
        "Checkpoint-distance metrics split between player row and board progress",
        "Fell-behind threshold row and lag margin",
        "Pawn-band and edge-slalom route diagnostics",
      ],
      boundedGate:
        "Bounded smoke must prove the controller holds a non-oscillating pre-checkpoint route target strongly enough to reach the first native checkpoint; partial row progress, preserved lead, and legality alone are insufficient.",
    },
    smokeAssertions: [
      {
        id: "chess_runtime_board_progress",
        description: "Board progression must be native and monotonic enough to rule out static-board false passes.",
        successMetric: "progressRow delta > 0 and checkpoint distance closes toward a native checkpoint",
        currentFailure: "The controller now progresses the board, but it still resets before converting that into actual first-checkpoint attainment.",
      },
      {
        id: "chess_invalid_move_control",
        description: "Controller must not churn on blocked/invalid moves.",
        successMetric: "playerInvalid and keysBlockedUntilAllUp remain bounded",
        currentFailure: "This is largely fixed; invalid churn is no longer the dominant blocker.",
      },
      {
        id: "chess_pre_checkpoint_survival",
        description: "Controller must convert pre-checkpoint route planning into a real first checkpoint.",
        successMetric: "checkpoint >= 1 before menu/game-over reset while route-target selection remains stable and justified by native board state",
        currentFailure: "The controller advances rows and preserves lead, but checkpoint stays at zero because route-target selection keeps oscillating between edge-forward and transient pawn-band/slalom lanes before conversion.",
      },
      {
        id: "chess_pause_correctness",
        description: "Pause handling must stay explicit and correct.",
        successMetric: "Paused state only when exported paused is true",
        currentFailure: "Static-board and pause states are easy to confuse without native exports.",
      },
    ],
  },
  policy: { family: "deterministic_planner" },
});
