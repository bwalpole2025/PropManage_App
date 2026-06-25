"use client";

import * as React from "react";
import {
  dismissCoachmarkAction,
  type CoachmarkLevel,
  type CoachmarkState,
} from "@/actions/coachmarks";

interface CoachmarkContextValue {
  /** True only after hydration — gate auto-open to avoid a pre-hydration flash. */
  mounted: boolean;
  isDismissed: (section: string) => boolean;
  dismiss: (section: string, level: CoachmarkLevel) => void;
}

const CoachmarkContext = React.createContext<CoachmarkContextValue | null>(null);

/**
 * Provides the current user's coachmark dismissal map (seeded from the server in
 * the (app) layout) to every <SectionCoachmark>. Dismissals update optimistically
 * and persist via a server action.
 */
export function CoachmarkProvider({
  initial,
  children,
}: {
  initial: CoachmarkState;
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = React.useState<CoachmarkState>(initial);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDismissed = React.useCallback(
    (section: string) => Boolean(dismissed[section]),
    [dismissed],
  );

  const dismiss = React.useCallback(
    (section: string, level: CoachmarkLevel) => {
      setDismissed((prev) => ({ ...prev, [section]: level })); // optimistic
      void dismissCoachmarkAction(section, level); // persist (fire-and-forget)
    },
    [],
  );

  return (
    <CoachmarkContext.Provider value={{ mounted, isDismissed, dismiss }}>
      {children}
    </CoachmarkContext.Provider>
  );
}

export function useCoachmarks(): CoachmarkContextValue {
  const ctx = React.useContext(CoachmarkContext);
  if (!ctx) {
    throw new Error("useCoachmarks must be used within <CoachmarkProvider>");
  }
  return ctx;
}
