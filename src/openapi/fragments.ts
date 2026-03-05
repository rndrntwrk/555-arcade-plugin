export interface Arcade555OpenApiFragment {
  paths: Record<string, Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
}

export function buildArcade555OpenApiFragment(): Arcade555OpenApiFragment {
  return {
    paths: {
      "/api/arcade555/games/catalog": {
        get: {
          summary: "List canonical 555 arcade games",
          operationId: "getArcade555GamesCatalog",
          tags: ["Arcade555"],
        },
        post: {
          summary: "List canonical 555 arcade games",
          operationId: "postArcade555GamesCatalog",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/games/play": {
        post: {
          summary: "Launch or focus a canonical 555 arcade game",
          operationId: "playArcade555Game",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/games/switch": {
        post: {
          summary: "Switch the active canonical 555 arcade game",
          operationId: "switchArcade555Game",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/games/stop": {
        post: {
          summary: "Stop the active canonical 555 arcade game",
          operationId: "stopArcade555Game",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/catalog": {
        get: {
          summary: "List canonical 555 arcade mastery contracts",
          operationId: "getArcade555MasteryCatalog",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs": {
        get: {
          summary: "List canonical 555 arcade mastery runs",
          operationId: "listArcade555MasteryRuns",
          tags: ["Arcade555"],
        },
        post: {
          summary: "Start a canonical 555 arcade mastery run",
          operationId: "startArcade555MasteryRun",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}": {
        get: {
          summary: "Get a canonical 555 arcade mastery run",
          operationId: "getArcade555MasteryRun",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}/episodes": {
        get: {
          summary: "List episodes for a canonical 555 arcade mastery run",
          operationId: "getArcade555MasteryEpisodes",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}/logs": {
        get: {
          summary: "List logs for a canonical 555 arcade mastery run",
          operationId: "getArcade555MasteryLogs",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}/evidence": {
        get: {
          summary: "Get run-level evidence for a canonical 555 arcade mastery run",
          operationId: "getArcade555MasteryRunEvidence",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}/episodes/{episodeId}/frames": {
        get: {
          summary: "Get frame evidence for a canonical 555 arcade mastery episode",
          operationId: "getArcade555MasteryEpisodeFrames",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/runs/{runId}/episodes/{episodeId}/consistency": {
        get: {
          summary: "Get consistency verdict for a canonical 555 arcade mastery episode",
          operationId: "getArcade555MasteryEpisodeConsistency",
          tags: ["Arcade555"],
        },
      },
      "/api/arcade555/mastery/games/{gameId}/latest": {
        get: {
          summary: "Get the latest mastery snapshot for a canonical 555 arcade game",
          operationId: "getArcade555MasteryLatest",
          tags: ["Arcade555"],
        },
      },
    },
    tags: [
      {
        name: "Arcade555",
        description:
          "Canonical 555 Arcade actions, mastery, and learning endpoints.",
      },
    ],
  };
}
