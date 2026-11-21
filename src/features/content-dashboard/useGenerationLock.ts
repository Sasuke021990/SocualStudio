"use client";

import { useSyncExternalStore } from "react";
import { isGenerationLocked, subscribeGenerationLock } from "./generation-lock";

/** True when any generation is running anywhere in the app. */
export function useGenerationLocked(): boolean {
  return useSyncExternalStore(
    (cb) => subscribeGenerationLock(cb),
    () => isGenerationLocked(),
    () => false,
  );
}
