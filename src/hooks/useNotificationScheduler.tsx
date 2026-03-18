import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInHours } from "date-fns";

/**
 * Background notification scheduler. 
 * Checks conditions and fires browser notifications for:
 * - Workout reminders based on training frequency
 * - Muscle group neglect (7+ days)
 * - Fit Score improvements
 * - Measurement reminders
 */
export function useNotificationScheduler() {
  const { user, profile } = useAuth();
  const { enabled, sendNotification } = useNotifications();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!user || !enabled || hasRunRef.current) return;
    hasRunRef.current = true;

    const lang = (profile as any)?.language || "uk";
    const isUk = lang === "uk";

    const runChecks = async () => {
      // 1. Last workout check
      const { data: lastWorkout } = await supabase
        .from("workouts")
        .select("started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1);

      if (lastWorkout?.length) {
        const daysSince = differenceInDays(new Date(), new Date(lastWorkout[0].started_at));
        
        if (daysSince >= 3) {
          sendNotification(
            isUk ? "Час тренуватись! 💪" : "Time to train! 💪",
            isUk ? "Ти не тренувався 3 дні — час повернутись" : "You haven't trained in 3 days — time to get back"
          );
        }
      }

      // 2. Muscle group neglect (7+ days)
      const { data: recovery } = await supabase
        .from("muscle_recovery")
        .select("muscle_group, last_trained_at")
        .eq("user_id", user.id);

      if (recovery?.length) {
        const neglected = recovery.filter(r => differenceInDays(new Date(), new Date(r.last_trained_at)) >= 7);
        if (neglected.length > 0) {
          const groupName = neglected[0].muscle_group;
          sendNotification(
            isUk ? "Баланс м'язів ⚠️" : "Muscle Balance ⚠️",
            isUk
              ? `Група "${groupName}" не тренувалась 7+ днів`
              : `"${groupName}" hasn't been trained in 7+ days`
          );
        }
      }

      // 3. Measurement reminder
      const { data: lastEntry } = await supabase
        .from("progress_entries")
        .select("entry_date")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(1);

      if (lastEntry?.length) {
        const daysSinceMeasurement = differenceInDays(new Date(), new Date(lastEntry[0].entry_date));
        if (daysSinceMeasurement >= 14) {
          sendNotification(
            isUk ? "Час оновити виміри 📏" : "Time to update measurements 📏",
            isUk ? "Час оновити виміри тіла (+5 XP)" : "Time to update body measurements (+5 XP)"
          );
        }
      }

      // 4. Fit Score change
      const { data: stats } = await supabase
        .from("fitness_stats")
        .select("fit_score, fit_score_previous")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats && stats.fit_score > stats.fit_score_previous) {
        sendNotification(
          isUk ? "Fit Score виріс! 📈" : "Fit Score improved! 📈",
          isUk ? `Ваш Fit Score зріс цього тижня` : `Your Fit Score improved this week`
        );
      }
    };

    // Delay checks to avoid firing on every page load
    const timer = setTimeout(runChecks, 5000);
    return () => clearTimeout(timer);
  }, [user, enabled, sendNotification, profile]);
}
