/**
 * Global generation lock — only one AI generation runs at a time across the app
 * (post batches, images, voice-overs, sounds). All generate buttons subscribe.
 */

type Listener = (locked: boolean) => void;

let locked = false;
let owner: string | null = null;
const listeners = new Set<Listener>();

export function isGenerationLocked(): boolean {
  return locked;
}

export function generationOwner(): string | null {
  return owner;
}

export function subscribeGenerationLock(listener: Listener): () => void {
  listeners.add(listener);
  listener(locked);
  return () => listeners.delete(listener);
}

/** Acquire the lock. Returns false if another generation is running. */
export function acquireGenerationLock(id: string): boolean {
  if (locked) return false;
  locked = true;
  owner = id;
  listeners.forEach((l) => l(true));
  return true;
}

export function releaseGenerationLock(id: string): void {
  if (owner === id || owner === null) {
    locked = false;
    owner = null;
    listeners.forEach((l) => l(false));
  }
}
