import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
}

const CACHE_KEY = "muscle-recovery-cache";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function useRecovery() {
  const { user } = useAuth();
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecovery = useCallback(async () => {
    if (!user) return;

    // Check cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setRecoveryData(data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const { data, error } = await (supabase as any)
      .from("muscle_recovery")
      .select("muscle_group, fatigue_score, recovery_percent, last_trained_at")
      .eq("user_id", user.id);

    if (!error && data) {
      // Calculate real-time recovery values
      const updated = (data as RecoveryData[]).map((r) => {
        const days = Math.max(0, (Date.now() - new Date(r.last_trained_at).getTime()) / (1000 * 60 * 60 * 24));
        const fatigueRemaining = r.fatigue_score * Math.exp(-0.9 * days);
        return {
          ...r,
          recovery_percent: Math.min(100, Math.max(0, 100 - fatigueRemaining)),
        };
      });
      setRecoveryData(updated);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: updated, timestamp: Date.now() }));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRecovery();
  }, [fetchRecovery]);

  return { recoveryData, loading, refetch: fetchRecovery };
}
