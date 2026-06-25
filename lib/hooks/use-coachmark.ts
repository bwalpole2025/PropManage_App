"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "pm.coachmark.";

/**
 * First-visit coachmark state, persisted in localStorage so a section's tip is
 * shown once. SSR-safe: stays closed until mounted to avoid hydration mismatch.
 *
 *   const { open, dismiss } = useCoachmark("transactions");
 */
export function useCoachmark(key: string) {
  const storageKey = PREFIX + key;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch {
      /* localStorage unavailable — leave closed */
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [storageKey]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [storageKey]);

  return { open, dismiss, reset };
}
