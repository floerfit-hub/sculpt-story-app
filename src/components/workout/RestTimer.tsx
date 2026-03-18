import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Timer, X, Bell } from "lucide-react";

const PRESETS = [30, 60, 120, 180];
const PRESET_LABELS: Record<number, string> = { 30: "0:30", 60: "1:00", 120: "2:00", 180: "3:00" };

const RestTimer = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
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

  useEffect(() => {
    if (!running || remaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          playBeep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const start = (s: number) => { setSeconds(s); setRemaining(s); setRunning(true); };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = seconds ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" /> {t.workouts.restTimer}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        {running || (remaining === 0 && seconds) ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 58}`} strokeDashoffset={`${2 * Math.PI * 58 * (1 - pct / 100)}`} className="transition-all duration-1000" />
              </svg>
              <span className="text-3xl font-display font-bold">{remaining === 0 ? "🔔" : formatTime(remaining)}</span>
            </div>
            {remaining === 0 ? (
              <div className="space-y-2 w-full">
                <p className="text-center font-display font-semibold text-primary">{t.workouts.timeToStartSet}</p>
                <Button className="w-full" onClick={onClose}>{t.workouts.continueWorkout}</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => { clearInterval(intervalRef.current); setRunning(false); setSeconds(null); }}>{t.workouts.cancel}</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((p) => (
                <Button key={p} variant="outline" className="h-14 text-lg font-display" onClick={() => start(p)}>{PRESET_LABELS[p] || formatTime(p)}</Button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder={t.workouts.customSec} value={customInput} onChange={(e) => setCustomInput(e.target.value)} className="flex-1 h-12 rounded-lg border border-input bg-background px-3 text-base" />
              <Button className="h-12 px-6" disabled={!customInput || Number(customInput) <= 0} onClick={() => start(Number(customInput))}>{t.workouts.start}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestTimer;
