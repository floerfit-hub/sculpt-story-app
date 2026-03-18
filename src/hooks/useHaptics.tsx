import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

type HapticType = "light" | "medium" | "double" | "countdown" | "prCelebration" | "workoutComplete";

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 15,
  medium: 40,
  double: [30, 80, 30],
  countdown: 10,
  prCelebration: [25, 120, 25],
  workoutComplete: [40, 150, 40],
};

function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silent fail — vibration not supported
  }
}

export function useHaptics() {
  const { profile } = useAuth();

  const prefs = useMemo(() => {
    const p = profile as any;
    return {
      haptic: p?.haptic_feedback ?? true,
      timer: p?.timer_vibration ?? true,
      pr: p?.pr_celebration_vibration ?? true,
    };
  }, [profile]);

  const trigger = useCallback((type: HapticType) => {
    // Check preferences
    if (!prefs.haptic) return;
    if ((type === "countdown") && !prefs.timer) return;
    if ((type === "prCelebration") && !prefs.pr) return;

    vibrate(PATTERNS[type]);
  }, [prefs]);

  return { trigger, prefs };
}
