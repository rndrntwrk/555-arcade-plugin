import { createMasteryContract } from "./_shared.js";

export const floor13MasteryContract = createMasteryContract({
  gameId: "floor13",
  aliases: ["floor-13"],
  title: "Floor13",
  objective: {
    summary: "Top-down floor progression with combat, loot, and exits.",
    winCondition: "Reach exit nodes while managing ammo and health.",
    masteryDefinition: "Exit success >=85% with low ammo-starvation and early deaths.",
  },
  controls: [
    { action: "Move", input: "Arrow keys" },
    { action: "Fire", input: "X" },
    { action: "Reload", input: "C" },
    { action: "Pick up", input: "V" },
    { action: "Start/Retry", input: "Space" },
  ],
  progression: [
    {
      id: "floor_loop",
      label: "Floor Loop",
      description: "Dungeon floors with `nextLevel` transitions.",
      successSignal: "Exit transition triggered.",
      failureSignals: ["ammo_starvation", "death_before_exit"],
    },
  ],
  risks: [
    {
      id: "ammo-collapse",
      label: "Ammo Collapse",
      symptom: "Agent enters dense encounter with low reserves.",
      mitigation: "Prioritize reload/loot windows before room pushes.",
    },
  ],
  passGates: [
    {
      id: "exit-success",
      metric: "exit.successRate",
      operator: ">=",
      threshold: 0.85,
      description: "Exit success >=85%.",
    },
    {
      id: "ammo-starvation",
      metric: "ammo.starvationRate",
      operator: "<=",
      threshold: 0.1,
      description: "Ammo starvation <10% runs.",
    },
    {
      id: "early-death",
      metric: "death.beforeExitRate",
      operator: "<=",
      threshold: 0.25,
      description: "Death-before-exit <25%.",
    },
  ],
  recovery: {
    menu: "Start run and verify player spawn.",
    paused: "Resume and validate weapon input.",
    gameOver: "Space retry and floor reset check.",
    stuck: "Reload/pickup cycle then restart floor if no pathing progress.",
  },
  atomicAudit: {
    auditStatus: "audited",
    controls: [
      {
        action: "Move",
        binding: "Arrow keys",
        source: "src/game/systems/keyboardcontrolsystem.js",
        semantics: "Movement is normalized to motion.dx/motion.dy and consumed each update tick.",
      },
      {
        action: "Fire",
        binding: "X",
        source: "src/game/systems/keyboardcontrolsystem.js",
        semantics: "Attack is gated by reload/attack cooldown and weapon ammo.",
      },
      {
        action: "Reload",
        binding: "C",
        source: "src/game/systems/keyboardcontrolsystem.js",
        semantics: "Reload is explicit and must be sequenced around cooldown windows.",
      },
      {
        action: "Pick / exit advance",
        binding: "V",
        source: "src/game/systems/keyboardcontrolsystem.js",
        semantics: "The same pickup key both collects loot and advances to the next level when the player bounds overlap the exit bounds.",
      },
      {
        action: "Retry",
        binding: "Space",
        source: "agent.js + screen class handling",
        semantics: "Space is used to start or retry from menu/game-over screens.",
      },
    ],
    lifecycleMap: [
      {
        state: "MENU",
        enterSignals: ["root screen class 't'", "window.__level undefined"],
        exitSignals: ["screen class leaves 't'", "player and exit entities available"],
        notes: "Menu is screen-class driven.",
      },
      {
        state: "PLAYING",
        enterSignals: ["screen class neither t/f/w", "__level defined"],
        exitSignals: ["screen class f or w"],
        notes: "PLAYING is the dungeon floor loop with active world, player, exit, door, and loot entities.",
      },
      {
        state: "GAME_OVER",
        enterSignals: ["screen class 'f'"],
        exitSignals: ["Space retry"],
        notes: "Game over is explicit in the DOM screen class.",
      },
      {
        state: "WIN",
        enterSignals: ["screen class 'w'"],
        exitSignals: ["new run"],
        notes: "Win screen is explicit in the DOM screen class.",
      },
    ],
    objectiveModel: {
      primaryObjective: "Move through each dungeon floor by surviving combat, managing ammo/loot, opening reachable space, and overlapping the exit before pressing V to trigger nextLevel().",
      winSignals: [
        "exit bounds overlap occurs while V is pressed",
        "remainingLevels decreases / currentFloor increases",
        "travel, hp, ammo, and exit metrics all reflect a real floor run",
      ],
      failSignals: [
        "death before exit overlap",
        "ammo starvation during door/enemy pressure",
        "late door-target planning keeps winning over exit conversion near the finish corridor",
        "route loss after body-aware door-chain progress and before exit overlap",
      ],
      currentFailureReason:
        "The engine input path is fixed and the retained late-coarse dead-end rejection patch moves the run past the old attack-tile staging failure. On the retained audited runs the controller now reaches the finish corridor honestly, drops `doorTarget`, hands off into `direct_exit_path`, and keeps moving near the exit. The remaining blocker is the final rect-overlap conversion itself: the player keeps native Bounds, the exit keeps native Bounds, and the run never produces `exitOverlap=true`, so the floor never clears. The stable blocker is finish-corridor rect-overlap completion, not late door precedence, direct input, same-tile escape, or generic near-exit drive heuristics.",
    },
    levelTopology: {
      structure: "A floor-by-floor dungeon loop with up to 13 floors, tile-grid navigation, doors registered in AStar, loot entities, enemy groups, and one exit per floor.",
      stages: [
        "Spawn and establish movement/input",
        "Combat and loot stabilization",
        "Door-aware pathfinding toward exit",
        "Exit overlap and V-triggered nextLevel()",
      ],
      completionMetric: "currentFloor / floorsCleared via __level and exit-triggered nextLevel().",
      notes: [
        "window.__PW_LEVELS defaults to 13 and __level tracks remaining floors.",
        "doorsystem.js writes door occupancy into AStar walkability.",
      ],
    },
    metricSourceMap: [
      {
        metric: "currentFloor / floorsCleared",
        coverage: "native",
        location: "window.__level + window.__PW_LEVELS",
        notes: "Progress is native and should drive floor closure gates.",
      },
      {
        metric: "heroHp",
        coverage: "native",
        location: "TAG_PLAYER -> Health.h",
        notes: "Used for combat survivability and deadlock triage.",
      },
      {
        metric: "weaponAmmo / capacity",
        coverage: "native",
        location: "TAG_PLAYER -> Weapon.b / Weapon.bs",
        notes: "Native ammo state, not inferred from keypresses.",
      },
      {
        metric: "doorStates / door positions",
        coverage: "hybrid",
        location: "GROUP_DOORS + Dungeon/AStar-derived liveDoorStates()",
        notes: "Door occupancy is native; readable state is assembled by the adapter.",
      },
      {
        metric: "exit overlap",
        coverage: "controller",
        location: "adapter rectOverlap(playerRect, exitRect)",
        notes: "Derived from native bounds because the game only advances on overlap + V.",
      },
    ],
    controllerDesign: {
      mode: "pre-closure-finish-corridor-rect-overlap-completion",
      substates: [
        "SPAWN_RECOVERY",
        "COMBAT_STABILIZE",
        "DOOR_CHAIN_ROUTE",
        "IMMEDIATE_THREAT_SUPPRESSION",
        "EXIT_APPROACH",
        "EXIT_OVERLAP_CONFIRM",
        "EXIT_TRIGGER",
      ],
      currentBlockingSubsystem: "finish_corridor_rect_overlap_completion_policy",
      controllerFailureMode:
        "The current controller now exits the late door loop honestly and hands off to `direct_exit_path` in the finish corridor. In retained runs it drops `doorTarget`, increments `exitPriorityHandoffCount`, and reaches the last corridor tiles near the exit with a live-valid path head. The remaining blocker is the final rect-overlap completion itself: the player keeps native Bounds and still fails to overlap the exit Bounds, so the run never clears the floor.",
      telemetryAdditions: [
        "When late door precedence is successfully dropped and `direct_exit_path` takes over",
        "Finish-corridor path head and resolved step while `doorTarget=null`",
        "Last-tile oscillation versus successful rect-overlap completion near `exitTileDistance <= 2`",
        "Whether the final path is valid but non-overlapping, or truly blocked",
        "Exit overlap confirmation versus repeated adjacent-tile path recomputation",
        "Player/exit Bounds presence and rect source at the claim moment",
      ],
      boundedGate:
        "Bounded smoke must show travel, finish-corridor handoff to `direct_exit_path`, `doorTarget=null`, and either real rect-overlap conversion or a classified non-overlap failure. Near-exit proximity alone is not sufficient.",
    },
    smokeAssertions: [
      {
        id: "floor13_input_live",
        description: "Input path must move the player in PLAYING.",
        successMetric: "travelDistance > 0 with controller-native key state",
        currentFailure: "Dead input was fixed; remaining failures are planner-side.",
      },
      {
        id: "floor13_exit_overlap",
        description: "Controller must create a real exit overlap before pressing V.",
        successMetric: "exitOverlap true during an exit trigger window",
        currentFailure:
          "Current controller reaches a later exit corridor near the audited retained exit, but late door-target planning still wins over exit conversion. Depending on the retained run, that becomes either a coarse-only local deadlock or an exact-path late door detour, and neither converts into a real overlap.",
      },
      {
        id: "floor13_deadlock_classified",
        description: "Failure near exit must be classifiable as door-plan precedence, immediate-threat suppression, combat collapse, or path deadlock.",
        successMetric: "local deadlock or planner precedence reason present in diagnostics",
        currentFailure:
          "The retained local-stage patch resolves the earlier coarse-only attack-tile dead-end and the finish-corridor recovery patch resolves the frozen live-invalid head step. The seeded blocker is now last-tile exit conversion after `direct_exit_path` handoff, and controller closure must preserve that classification instead of collapsing back to generic same-tile or near-exit heuristics.",
      },
    ],
  },
  policy: { family: "hazard_objective" },
});
