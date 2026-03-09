import { createMasteryContract } from "./_shared.js";

export const playbackMasteryContract = createMasteryContract({
  gameId: "playback",
  aliases: [],
  title: "Playback",
  objective: {
    summary: "Room-based puzzle platformer with tape instruction mechanics.",
    winCondition: "Solve room objectives without softlocks and complete route.",
    masteryDefinition: "90% room solve rate and robust softlock recovery.",
  },
  controls: [
    { action: "Move", input: "Arrow keys" },
    { action: "Jump", input: "Space" },
    { action: "Pick/Drop", input: "Mapped interact key" },
    { action: "Tape controls", input: "Play/Record/Rewind/Fast-forward keys" },
    { action: "Throw/Shoot", input: "Mapped action keys" },
  ],
  progression: [
    {
      id: "room_graph",
      label: "Room Graph",
      description: "5x5 world with factory/legend-driven puzzle constraints.",
      successSignal: "Room objectives solved and exits traversed.",
      failureSignals: ["softlock", "state_corruption", "loop_without_progress"],
    },
  ],
  risks: [
    {
      id: "instruction-order",
      label: "Instruction Order Error",
      symptom: "Incorrect tape sequencing invalidates room state.",
      mitigation: "Enforce deterministic tape action ordering per room template.",
    },
  ],
  passGates: [
    {
      id: "room-solve-rate",
      metric: "rooms.solveRate",
      operator: ">=",
      threshold: 0.9,
      description: "Room solve rate >=90%.",
    },
    {
      id: "softlock-recovery",
      metric: "softlock.recoverySec",
      operator: "<=",
      threshold: 15,
      description: "Softlock recovery <=15s.",
    },
    {
      id: "objective-completion",
      metric: "objective.completionRate",
      operator: ">=",
      threshold: 0.8,
      description: "Objective completion >=80%.",
    },
  ],
  recovery: {
    menu: "Start/continue game from menu and validate room load.",
    paused: "Resume then verify input acceptance.",
    gameOver: "Restart room with previous instruction plan.",
    stuck: "Reset room state and replay deterministic tape sequence.",
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Horizontal/vertical movement",
        binding: "Arrow keys or WASD",
        source: "src/ts/common/inputs.ts",
        semantics: "Movement instructions are mapped to directional instruction IDs and can be injected either through setInput() or keyboard events.",
      },
      {
        action: "Jump",
        binding: "J or Space",
        source: "src/ts/common/inputs.ts",
        semantics: "Single jump instruction used for platforming and ascent into tape/object setups.",
      },
      {
        action: "Tape/object manipulation",
        binding: "G/B/T/I/K",
        source: "src/ts/common/inputs.ts",
        semantics: "Pick up, drop, throw, insert, and eject are distinct instructions and are required for room solutions.",
      },
      {
        action: "Recorder transport",
        binding: "P/R/[ / ]/Enter",
        source: "src/ts/common/inputs.ts",
        semantics: "Play, record, rewind, fast-forward, and shoot are room-objective actions, not cosmetic inputs.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["no fresh runtime worldAge", "no localIndex progress"],
        exitSignals: ["worldAge > 0", "localIndex > 0"],
        notes: "Adapter treats missing runtime or zeroed run state as MENU.",
      },
      {
        state: "PLAYING",
        enterSignals: ["runtime hooks active", "worldAge ticking", "playerEntity present"],
        exitSignals: ["pause overlay visible", "deathAge within MAX_DEATH_AGE"],
        notes: "PLAYING is the only state where room transitions and tape interactions are meaningful.",
      },
      {
        state: "PAUSED",
        enterSignals: ["overlay #o visible while runtime still alive"],
        exitSignals: ["overlay hidden"],
        notes: "Pause is UI-driven and should not be confused with a dead boot screen.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["deathAge recent relative to worldAge"],
        exitSignals: ["restart to MENU/PLAYING"],
        notes: "Death is native and exposed through playerEntity death age.",
      },
    ],
    objectiveModel: {
      primaryObjective: "Traverse the 5x5 room graph by solving recorder/tape/object puzzles, starting with the tape bootstrap room and then progressing through room transitions.",
      winSignals: [
        "roomTransitions increases under controller control",
        "localIndex and score advance with room/objective completion",
        "playback state leaves the start-room bootstrap and continues through additional rooms",
      ],
      failSignals: [
        "blank/start room escape without room transition",
        "loop_without_progress",
        "softlock from wrong tape/object sequencing",
        "death/restart cycle without new room state",
      ],
      currentFailureReason:
        "The current controller has one explicit start-room bootstrap and then falls back to generic move-right/jump/play heuristics, so it does not model room-specific puzzle objectives after the first room.",
    },
    levelTopology: {
      structure: "A 5x5 room graph defined by roomFactories with persistent entities and room-local puzzle rules.",
      stages: [
        "Start-room tape acquisition",
        "Tape insertion and playback bootstrap",
        "Room transition into downstream puzzle rooms",
        "Room-specific solve loops for transport, pressure, shooting, and recorder state",
      ],
      completionMetric: "roomTransitions plus room/objective completion without softlock.",
      notes: [
        "room.factory.ts declares worldWidth = 5 and worldHeight = 5.",
        "The game is room-graph based, not a single linear platform segment.",
      ],
    },
    metricSourceMap: [
      {
        metric: "worldAge",
        coverage: "native",
        location: "game.Oa via wrapped Jb runtime hook",
        notes: "Native runtime clock for active simulation.",
      },
      {
        metric: "localIndex",
        coverage: "native",
        location: "playerEntity.ea",
        notes: "Current local progression/index value used by the adapter.",
      },
      {
        metric: "roomTransitions",
        coverage: "controller",
        location: "derived from changes in game.fb room coordinates",
        notes: "Controller-derived but sourced from native room coordinates.",
      },
      {
        metric: "roomCoords",
        coverage: "native",
        location: "game.fb and game.mb",
        notes: "Current room coordinates and room matrix.",
      },
      {
        metric: "heldTape / nearestTapeDist",
        coverage: "controller",
        location: "room entity scan where tape entity V === 5",
        notes: "Controller-derived room-objective signals needed for the bootstrap room.",
      },
    ],
    controllerDesign: {
      mode: "room-specific state machine required",
      substates: [
        "START_ROOM_HAS_TAPE",
        "START_ROOM_PICK_UP",
        "START_ROOM_STEP_APPROACH",
        "START_ROOM_STEP_JUMP",
        "START_ROOM_UPPER_TRAVERSE",
        "START_ROOM_FAR_RIGHT_DROP",
        "START_ROOM_FLOOR_APPROACH",
        "START_ROOM_FLOOR_PICKUP",
        "GENERIC",
        "GENERIC_HAS_TAPE",
      ],
      currentBlockingSubsystem: "start_room_step_jump_single_surface_setup_policy",
      controllerFailureMode:
        "The controller now reaches the start-room right-side choke honestly, and source truth shows there is no active transfer platform there. The new step-jump setup metrics show the deeper failure: the controller never creates a valid single-surface grab setup during START_ROOM_STEP_JUMP at all. By the time playback enters the later crate/terrain corner states, the run is already too late and the grab window is contaminated by multiple blocking surfaces. The blocker is now the pre-grab step-jump setup policy, not blank-state handling or a generic hurdle-phase jump cadence.",
      telemetryAdditions: [
        "Native room objective completion marker",
        "Room-specific puzzle state/goal markers",
        "Start-room grab-window / candidate classification",
        "Step-jump single-surface setup traces before the hurdle window",
        "Softlock classification by room",
      ],
      boundedGate:
        "Bounded smoke must show repeatable roomTransitions > 0 and downstream room/objective progress, not just start-room escape.",
    },
    smokeAssertions: [
      {
        id: "playback_reaches_playing",
        description: "Leave boot/menu and enter active simulation.",
        successMetric: "PLAYING samples >= 1",
        currentFailure: "Historically vulnerable to blank/start-room false positives.",
      },
      {
        id: "playback_room_progression",
        description: "Progress beyond the bootstrap room.",
        successMetric: "roomTransitions > 0 with localIndex/score support",
        currentFailure:
          "Current controller never produces a valid single-surface setup during START_ROOM_STEP_JUMP, so downstream room progression never begins.",
      },
      {
        id: "playback_nonblank_evidence",
        description: "Evidence frames must show real rendered rooms.",
        successMetric: "non-blank frame sizes and contract-valid telemetry",
        currentFailure: "Blank-state loopholes existed before truth tightening.",
      },
    ],
  },
  policy: { family: "sequence_retention" },
});
