/** In-memory reel job store — polling replaces fragile long streams. */
export interface ReelJob {
  id: string;
  phase: string;
  done?: { videoUrl: string; durationSeconds: number; imageCount: number };
  error?: string;
}

const jobs = new Map<string, ReelJob>();

export function createReelJob(): ReelJob {
  const job: ReelJob = { id: crypto.randomUUID(), phase: "Starting…" };
  jobs.set(job.id, job);
  return job;
}

export function getReelJob(id: string): ReelJob | null {
  return jobs.get(id) ?? null;
}

export function finishReelJob(id: string): void {
  // Keep terminal states briefly readable, then drop.
  setTimeout(() => jobs.delete(id), 10 * 60 * 1000).unref?.();
}
