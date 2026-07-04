"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * false during SSR/prerender and hydration, true on the client afterwards.
 * Lets components read browser-only state (localStorage) during render
 * without setState-in-effect or hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
