import { useSyncExternalStore } from 'react';

// Long AI tasks (analysing a whole curriculum, writing notes for every topic
// of a unit) run as background jobs: they keep going while the tutor moves
// around the app, show progress in the header, and can be cancelled.

export interface Job {
  id: string;
  label: string;
  done: number;
  total: number;
  message: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  errors: string[];
  link?: string;
  controller: AbortController;
}

let jobs: Job[] = [];
const listeners = new Set<() => void>();
const emit = () => {
  jobs = [...jobs];
  listeners.forEach((l) => l());
};

export function useJobs(): Job[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => jobs,
    () => jobs,
  );
}

export const isRunning = (id: string) => jobs.some((j) => j.id === id && j.status === 'running');

export interface JobContext {
  signal: AbortSignal;
  step: (message: string) => void;
  advance: (message?: string) => void;
  fail: (message: string) => void;
}

/** Run `work` over `items` with limited concurrency as a tracked job. */
export async function runJob<T>(
  opts: { id: string; label: string; link?: string; items: T[]; concurrency?: number },
  work: (item: T, ctx: JobContext) => Promise<void>,
): Promise<Job> {
  const existing = jobs.find((j) => j.id === opts.id && j.status === 'running');
  if (existing) return existing;
  const job: Job = { id: opts.id, label: opts.label, done: 0, total: opts.items.length, message: 'Starting…', status: 'running', errors: [], link: opts.link, controller: new AbortController() };
  jobs = [...jobs.filter((j) => j.id !== opts.id), job];
  emit();
  const ctx: JobContext = {
    signal: job.controller.signal,
    step: (message) => {
      job.message = message;
      emit();
    },
    advance: (message) => {
      job.done += 1;
      if (message) job.message = message;
      emit();
    },
    fail: (message) => {
      job.errors.push(message);
      emit();
    },
  };
  const queue = [...opts.items];
  const worker = async () => {
    while (queue.length && !job.controller.signal.aborted) {
      const item = queue.shift() as T;
      try {
        await work(item, ctx);
      } catch (err) {
        if (job.controller.signal.aborted) break;
        ctx.fail((err as Error).message || String(err));
        ctx.advance();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 1, opts.items.length)) }, worker));
  job.status = job.controller.signal.aborted ? 'cancelled' : job.errors.length && job.errors.length >= job.total ? 'error' : 'done';
  job.message = job.status === 'cancelled' ? 'Stopped' : job.errors.length ? `Finished with ${job.errors.length} problem(s)` : 'Finished';
  emit();
  return job;
}

export function cancelJob(id: string): void {
  jobs.find((j) => j.id === id)?.controller.abort();
}

export function dismissJob(id: string): void {
  jobs = jobs.filter((j) => j.id !== id || j.status === 'running');
  emit();
}
