import { createMasteryContract } from "./_shared.js";

export const clawstrikeMasteryContract = createMasteryContract({
  gameId: "clawstrike",
  aliases: ["clawstrike-main"],
  title: "Clawstrike",
  objective: {
    summary: "Combat platformer with die-and-retry flow across level chain.",
    winCondition: "Clear full level sequence quickly with controlled deaths.",
    masteryDefinition: "75%+ full clears while reducing death load and completion time.",
  },
  controls: [
    { action: "Move", input: "WASD / arrows" },
    { action: "Jump", input: "Space" },
    { action: "Attack/Interact", input: "Mouse / mapped combat keys" },
  ],
  progression: [
    {
      id: "run",
      label: "Level Run",
      description: "Sequential level combat screens.",
      successSignal: "ALL_LEVELS clear.",
      failureSignals: ["game_over_screen", "death_loop"],
    },
  ],
  risks: [
    {
      id: "aggression-bias",
      label: "Aggression Bias",
      symptom: "High-risk close combat without recovery windowing.",
      mitigation: "Lower engage risk and prioritize spacing.",
    },
  ],
  passGates: [
    {
      id: "full-clear-rate",
      metric: "run.fullClearRate",
      operator: ">=",
      threshold: 0.75,
      description: "Full clear in >=75% runs.",
    },
    {
      id: "deaths-relative",
      metric: "deaths.relativeToBaseline",
      operator: "<=",
      threshold: 0.6,
      description: "Deaths per run <= baseline*0.6.",
    },
    {
      id: "time-relative",
      metric: "time.relativeToBaseline",
      operator: "<=",
      threshold: 0.8,
      description: "Completion time <= baseline*0.8.",
    },
  ],
  recovery: {
    menu: "Start run from title/menu and confirm gameplay camera.",
    paused: "Resume with mapped pause toggle.",
    gameOver: "Trigger retry path immediately.",
    stuck: "Escape via restart when combat state is unresponsive.",
  },
  policy: {
    family: "combat_window",
    defaults: {
      reactionWindowMs: 150,
      riskTolerance: 0.46,
      enemyEngageRiskMax: 0.34,
      hazardAvoidanceBias: 0.78,
    },
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Move",
        binding: "ArrowLeft / ArrowRight",
        source: "agent.js document key handlers",
        semantics: "Primary horizontal navigation and combat spacing.",
      },
      {
        action: "Jump",
        binding: "ArrowUp",
        source: "agent.js document key handlers",
        semantics: "Used for traversal, wall-jumps, and aerial combat timing.",
      },
      {
        action: "Roll",
        binding: "ArrowDown",
        source: "agent.js document key handlers",
        semantics: "Used for hazard evasion and close-quarters recovery.",
      },
      {
        action: "Attack / confirm start",
        binding: "Space",
        source: "agent.js and GameplayScreen input",
        semantics: "Space is both menu bootstrap and attack in active play.",
      },
      {
        action: "Retry",
        binding: "R",
        source: "agent.js",
        semantics: "Retry is explicit and should reset the run after real failure only.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["top screen is MainMenuScreen or no GameplayScreen present"],
        exitSignals: ["GameplayScreen becomes active"],
        notes: "Menu bootstrap is screen-class driven.",
      },
      {
        state: "PLAYING",
        enterSignals: ["top screen is GameplayScreen"],
        exitSignals: ["GameOverScreen", "FullGameOverScreen", "GameCompleteScreen"],
        notes: "PLAYING is the sequential level run with live world entities.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["GameOverScreen or FullGameOverScreen"],
        exitSignals: ["R retry or new GameplayScreen"],
        notes: "Death state is native and tied to runDeaths/maxDeaths.",
      },
      {
        state: "WIN",
        enterSignals: ["GameCompleteScreen"],
        exitSignals: ["new run"],
        notes: "The current adapter collapses complete and death screens too aggressively; this remains a telemetry gap.",
      },
    ],
    objectiveModel: {
      primaryObjective:
        "Clear the sequential combat level chain by killing each level's human enemies fast enough to trigger native level completion while keeping deaths and run time bounded.",
      winSignals: [
        "enemyCountAfter reaches zero for the active level",
        "runLevelIndex increases under live play",
        "runDeaths stays bounded while runTime and level count progress",
      ],
      failSignals: [
        "combat stalls with enemiesAlive > 0",
        "death loops that burn runDeaths before level conversion",
        "aggressive spacing that never finishes the last enemy cleanly",
        "screen-state collapse that hides whether a complete screen was a win or death",
      ],
      currentFailureReason:
        "The retained finisher patch improved the first fight enough to reach level 1 honestly, so traversal is no longer the main blocker. The remaining problem is combat throughput: the controller under-kills enemies relative to the level-clear requirement and does not sustain that first-fight conversion deep enough to reach level 7.",
    },
    levelTopology: {
      structure: "A sequential ALL_LEVELS combat run with horizontal and vertical stages, hazard variants, and native enemy-count based progression.",
      stages: [
        "Menu bootstrap",
        "Per-level navigation and spacing",
        "Enemy clear conversion",
        "Run-level promotion or death/retry",
      ],
      completionMetric: "runLevelIndex / full level chain progression with bounded runDeaths and runTime.",
      notes: [
        "GameplayScreen advances when enemyCountBefore is non-zero and enemyCountAfter becomes zero.",
        "The controller problem is combat throughput, not simple movement.",
      ],
    },
    metricSourceMap: [
      {
        metric: "runLevelIndex",
        coverage: "native",
        location: "window.G.runLevelIndex",
        notes: "Authoritative native level progression source.",
      },
      {
        metric: "runDeaths / runTime",
        coverage: "native",
        location: "window.G.runDeaths and window.G.runTime",
        notes: "True run-level quality metrics.",
      },
      {
        metric: "enemies alive / tactical info",
        coverage: "native",
        location: "GameplayScreen.world.category('human')",
        notes: "Enemy count drives level-clear conversion.",
      },
      {
        metric: "level info / hazards",
        coverage: "controller",
        location: "LEVEL_INFO in agent.js",
        notes: "Controller-native but derived from source level characteristics.",
      },
      {
        metric: "score",
        coverage: "controller",
        location: "agent.js runTime*3 proxy",
        notes: "Not authoritative for progression; quality-only.",
      },
    ],
    controllerDesign: {
      mode: "pre-closure-combat-throughput-and-level-clear-sequencer",
      substates: [
        "MENU_BOOTSTRAP",
        "LEVEL_SCAN",
        "SPACING_AND_APPROACH",
        "FINISHER_CONVERSION",
        "HAZARD_RECOVERY",
        "LEVEL_CLEAR_CONFIRM",
        "RETRY_RECOVERY",
      ],
      currentBlockingSubsystem: "combat_throughput_and_level_clear_policy",
      controllerFailureMode:
        "The controller has enough world access to navigate and fight, and the retained finisher patch proves it can close the first room honestly. What it still lacks is sustained combat throughput: enemies remain alive too long, the final enemy is not always converted efficiently, and runLevelIndex does not climb anywhere near the required level-7 gate.",
      telemetryAdditions: [
        "native enemy-count transitions per level",
        "clear-versus-death screen classification",
        "finisher conversion timing on last enemy",
        "engage risk versus actual kill throughput",
        "hazard-driven attack suppression near spikes/water/vertical rooms",
      ],
      boundedGate:
        "Bounded smoke must show real enemy-count collapse and at least early level promotion under native runLevelIndex. Survival or travel without level conversion is not sufficient.",
    },
    smokeAssertions: [
      {
        id: "clawstrike_first_level_conversion",
        description: "The controller must clear the first combat room honestly.",
        successMetric: "enemy count reaches zero and runLevelIndex increases",
        currentFailure: "Retained finisher patch gets to level 1, but deeper levels still fail from throughput.",
      },
      {
        id: "clawstrike_level_clear_truth",
        description: "Level advancement must be native runLevelIndex progression, not inferred score growth.",
        successMetric: "runLevelIndex rises through repeated level clears",
        currentFailure: "Score proxy and movement still outrun actual combat closure.",
      },
      {
        id: "clawstrike_bounded_gate",
        description: "Bounded smoke must improve level conversion, not only combat survival.",
        successMetric: "higher runLevelIndex with bounded deaths",
        currentFailure: "Current controller under-kills enemies and stalls before level 7.",
      },
    ],
  },
});
