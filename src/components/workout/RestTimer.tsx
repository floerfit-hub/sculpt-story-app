import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Timer, X, Bell } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

const PRESETS = [30, 60, 120, 180];
const PRESET_LABELS: Record<number, string> = { 30: "0:30", 60: "1:00", 120: "2:00", 180: "3:00" };

const sendTimerNotification = () => {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("FitTrack", {
        body: "⏱️ Час відпочинку закінчився! Час починати підхід.",
        icon: "/pwa-icon-192.png",
        tag: "rest-timer",
      });
    } catch { /* SW notification fallback not needed for simple case */ }
  }
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

interface RestTimerProps {
  onClose: () => void;
  inline?: boolean;
}

const RestTimer = ({ onClose, inline }: RestTimerProps) => {
  const { t } = useTranslation();
  const { trigger: haptic } = useHaptics();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(() => 
    "Notification" in window && Notification.permission === "granted"
  );
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Use absolute end time so timer survives screen-off on Android
  const endTimeRef = useRef<number>(0);

  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(880, 0, 0.15);
      playTone(880, 0.2, 0.15);
      playTone(1320, 0.4, 0.3);
    } catch { /* audio not available */ }
  };

  // Use absolute time calculation to survive screen off
  useEffect(() => {
    if (!running || endTimeRef.current <= 0) return;

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setRemaining(left);

      if (left <= 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        haptic("medium");
        playBeep();
        sendTimerNotification();
        return;
      }
      if (left <= 5) {
        haptic("countdown");
      }
    };

    // Tick immediately, then every 250ms for accuracy after screen wake
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Also recalculate on visibility change (Android screen on)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && running && endTimeRef.current > 0) {
        const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) {
          clearInterval(intervalRef.current);
          setRunning(false);
          haptic("medium");
          playBeep();
          sendTimerNotification();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [running]);

  const start = (s: number) => {
    setSeconds(s);
    setRemaining(s);
    endTimeRef.current = Date.now() + s * 1000;
    setRunning(true);
    haptic("light");
  };

  const cancel = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSeconds(null);
    endTimeRef.current = 0;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = seconds ? ((seconds - remaining) / seconds) * 100 : 0;

  const content = (
    <div className={`w-full ${inline ? "" : "max-w-sm"} rounded-2xl border bg-card ${inline ? "p-4" : "p-6"} shadow-lg space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-display font-bold ${inline ? "text-base" : "text-lg"} flex items-center gap-2`}>
          <Timer className={`${inline ? "h-4 w-4" : "h-5 w-5"} text-primary`} /> {t.workouts.restTimer}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${notifEnabled ? "text-primary" : "text-muted-foreground"}`}
            onClick={async () => {
              const granted = await requestNotificationPermission();
              setNotifEnabled(granted);
            }}
            title={notifEnabled ? "Сповіщення увімкнено" : "Увімкнути сповіщення"}
          >
            <Bell className={`h-4 w-4 ${notifEnabled ? "" : "opacity-40"}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {running || (remaining === 0 && seconds) ? (
        <div className="flex flex-col items-center gap-3">
          <div className={`relative flex ${inline ? "h-24 w-24" : "h-32 w-32"} items-center justify-center`}>
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 58}`} strokeDashoffset={`${2 * Math.PI * 58 * (1 - pct / 100)}`} className="transition-all duration-300" />
            </svg>
            <span className={`${inline ? "text-2xl" : "text-3xl"} font-display font-bold`}>{remaining === 0 ? "🔔" : formatTime(remaining)}</span>
          </div>
          {remaining === 0 ? (
            <div className="space-y-2 w-full">
              <p className="text-center font-display font-semibold text-primary text-sm">{t.workouts.timeToStartSet}</p>
              <Button className="w-full" size={inline ? "sm" : "default"} onClick={onClose}>{t.workouts.continueWorkout}</Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" size={inline ? "sm" : "default"} onClick={cancel}>{t.workouts.cancel}</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button key={p} variant="outline" className={`${inline ? "h-10 text-sm" : "h-14 text-lg"} font-display`} onClick={() => start(p)}>{PRESET_LABELS[p] || formatTime(p)}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder={t.workouts.customSec} value={customInput} onChange={(e) => setCustomInput(e.target.value)} className={`flex-1 ${inline ? "h-10" : "h-12"} rounded-lg border border-input bg-background px-3 text-base`} />
            <Button className={`${inline ? "h-10" : "h-12"} px-5`} disabled={!customInput || Number(customInput) <= 0} onClick={() => start(Number(customInput))}>{t.workouts.start}</Button>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      {content}
    </div>
  );
};

export default RestTimer;
