import { getMasteryContractOrNull } from "./registry.js";
import {
  listMasteryRuns,
  readAllMasteryGameSnapshots,
  readMasteryEpisodeFrames,
} from "./store.js";
import type {
  Arcade555ActiveSession,
  Arcade555MasteryProgress,
  Five55MasteryGameSnapshot,
  Five55MasteryRun,
} from "./types.js";

function buildProgress(run: Five55MasteryRun): Arcade555MasteryProgress {
  const totalEpisodes = Math.max(0, run.progress.totalEpisodes ?? 0);
  const completedEpisodes = Math.max(0, run.progress.completedEpisodes ?? 0);
  const passedEpisodes = Math.max(0, run.progress.passedEpisodes ?? 0);
  const failedEpisodes = Math.max(0, run.progress.failedEpisodes ?? 0);
  return {
    totalEpisodes,
    completedEpisodes,
    passedEpisodes,
    failedEpisodes,
    completionRate:
      totalEpisodes > 0 ? completedEpisodes / totalEpisodes : 0,
    passRate:
      completedEpisodes > 0 ? passedEpisodes / completedEpisodes : 0,
  };
}

function buildEvidenceLinks(
  runId: string,
  latestEpisodeId: string | null,
): Arcade555ActiveSession["evidenceLinks"] {
  const links: Arcade555ActiveSession["evidenceLinks"] = [
    {
      label: "Run detail",
      href: `/api/arcade555/mastery/runs/${encodeURIComponent(runId)}`,
      kind: "api",
    },
    {
      label: "Run logs",
      href: `/api/arcade555/mastery/runs/${encodeURIComponent(runId)}/logs`,
      kind: "api",
    },
  ];
  if (latestEpisodeId) {
    links.push({
      label: "Episode frames",
      href: `/api/arcade555/mastery/runs/${encodeURIComponent(runId)}/episodes/${encodeURIComponent(latestEpisodeId)}/frames`,
      kind: "api",
    });
    links.push({
      label: "Episode consistency",
      href: `/api/arcade555/mastery/runs/${encodeURIComponent(runId)}/episodes/${encodeURIComponent(latestEpisodeId)}/consistency`,
      kind: "api",
    });
  }
  return links;
}

function deriveSnapshotBlocker(
  snapshot: Five55MasteryGameSnapshot | null,
): string | null {
  if (!snapshot?.latestConsistency) return null;
  if (snapshot.latestConsistency.status === "pass") return null;
  return snapshot.latestConsistency.reasons[0] ?? null;
}

function selectLatestRunSnapshot(
  runId: string,
  snapshots: Five55MasteryGameSnapshot[],
): Five55MasteryGameSnapshot | null {
  return snapshots
    .filter((snapshot) => snapshot.latestRunId === runId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export async function readArcade555ActiveSessions(): Promise<{
  generatedAt: string;
  current: Arcade555ActiveSession | null;
  sessions: Arcade555ActiveSession[];
}> {
  const generatedAt = new Date().toISOString();
  const activeRuns = await listMasteryRuns({ status: "running", limit: 100 });
  const snapshots = Object.values(await readAllMasteryGameSnapshots());

  const sessions = await Promise.all(
    activeRuns.runs.map(async (run) => {
      const latestSnapshot = selectLatestRunSnapshot(run.runId, snapshots);
      const contract = latestSnapshot
        ? getMasteryContractOrNull(latestSnapshot.gameId)
        : null;
      const frameCount =
        latestSnapshot?.latestEpisodeId != null
          ? (
              await readMasteryEpisodeFrames({
                runId: run.runId,
                episodeId: latestSnapshot.latestEpisodeId,
              })
            ).length
          : 0;
      const latestEpisodeId = latestSnapshot?.latestEpisodeId ?? null;
      return {
        sessionId: `games:${run.runId}`,
        runId: run.runId,
        gameId: latestSnapshot?.gameId ?? null,
        gameTitle: contract?.title ?? latestSnapshot?.gameId ?? null,
        generatedAt,
        startedAt: run.startedAt,
        updatedAt: latestSnapshot?.updatedAt ?? run.startedAt,
        status: latestSnapshot?.latestStatus ?? run.status,
        objective: contract?.objective.summary ?? null,
        phase:
          latestSnapshot?.latestOutcome?.failureCode == null
            ? "certifying"
            : latestSnapshot.latestOutcome.failureCode,
        currentAction:
          latestSnapshot?.latestVerdict.reasons[0] ??
          (contract?.objective.summary ?? "Running mastery evaluation"),
        confidence: latestSnapshot?.latestVerdict.confidence ?? null,
        blocker: deriveSnapshotBlocker(latestSnapshot),
        progress: buildProgress(run),
        frameCount,
        evidenceLinks: buildEvidenceLinks(run.runId, latestEpisodeId),
        metadata: {
          summary: run.summary,
          snapshotUpdatedAt: latestSnapshot?.updatedAt ?? null,
        },
      } satisfies Arcade555ActiveSession;
    }),
  );

  return {
    generatedAt,
    current: sessions[0] ?? null,
    sessions,
  };
}
