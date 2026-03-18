import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { getLevelTitle, getXPForNextLevel, getXPForCurrentLevel, LEVEL_THRESHOLDS_EXPORT } from "@/hooks/useFitnessStats";
import { TrendingUp, TrendingDown, Minus, Sparkles, Info, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FitnessScoreProps {
  trainingConsistency: number;
  strengthProgress: number;
  bodyProgress: number;
  muscleBalance: number;
  totalXP?: number;
  level?: number;
  fitScore?: number;
  weeklyChange?: number;
  isInactive?: boolean;
  coldStart?: boolean;
}

const CircularProgress = ({ score, size = 140, strokeWidth = 10, dimmed = false }: { score: number; size?: number; strokeWidth?: number; dimmed?: boolean }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = dimmed ? "hsl(var(--muted-foreground))" : score >= 70 ? "hsl(var(--primary))" : score >= 40 ? "hsl(45 90% 55%)" : "hsl(var(--destructive))";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

const MiniBar = ({ value, label }: { value: number; label: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: value >= 70 ? "hsl(var(--primary))" : value >= 40 ? "hsl(45 90% 55%)" : "hsl(var(--destructive))",
          }}
        />
      </div>
    </div>
  </div>
);

const FitnessScore = ({
  trainingConsistency,
  strengthProgress,
  bodyProgress,
  muscleBalance,
  totalXP = 0,
  level = 1,
  fitScore,
  weeklyChange = 0,
  isInactive = false,
  coldStart = false,
}: FitnessScoreProps) => {
  const { t, lang } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  
  const overall = useMemo(
    () => fitScore ?? Math.round(trainingConsistency * 0.3 + strengthProgress * 0.25 + bodyProgress * 0.25 + muscleBalance * 0.2),
    [fitScore, trainingConsistency, strengthProgress, bodyProgress, muscleBalance]
  );

  const levelTitle = getLevelTitle(level, lang);
  const currentLevelXP = getXPForCurrentLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const xpInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpProgress = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Top: Fit Score gauge + breakdown */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <CircularProgress score={coldStart ? 0 : overall} dimmed={isInactive} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {coldStart ? (
                  <div className="text-center px-2">
                    <Sparkles className="h-5 w-5 text-primary mx-auto mb-1" />
                    <span className="text-[10px] text-muted-foreground leading-tight block">{t.fitScore.analyzing}</span>
                  </div>
                ) : (
                  <>
                    <span className={`text-3xl font-display font-extrabold ${isInactive ? "text-muted-foreground" : ""}`}>{overall}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-sm">{t.fitScore.title}</h3>
                  <button
                    onClick={() => setShowInfo(true)}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
                {!coldStart && weeklyChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${weeklyChange > 0 ? "text-green-500" : "text-destructive"}`}>
                    {weeklyChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {weeklyChange > 0 ? "+" : ""}{weeklyChange}
                  </div>
                )}
              </div>
              <MiniBar value={trainingConsistency} label={t.fitScore.training} />
              <MiniBar value={strengthProgress} label={t.fitScore.strength} />
              <MiniBar value={bodyProgress} label={t.fitScore.body} />
              <MiniBar value={muscleBalance} label={t.fitScore.balance} />
            </div>
          </div>

          {/* XP & Level bar */}
          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-display font-bold text-sm ${isInactive ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                  {level}
                </div>
                <div>
                  <p className={`font-display font-bold text-sm leading-none ${isInactive ? "text-muted-foreground" : ""}`}>{levelTitle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{totalXP} XP</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {xpInLevel} / {xpNeeded} XP
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${isInactive ? "bg-muted-foreground/40" : "bg-primary"}`}
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fit Score Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {lang === "uk" ? "Як формується оцінка?" : "How is the score calculated?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {lang === "uk"
                ? "Фітнес-оцінка (0–100) — це ваш загальний показник форми за останні 30 днів. Вона складається з 4 компонентів:"
                : "Fitness Score (0–100) is your overall fitness indicator over the last 30 days. It's made up of 4 components:"}
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold text-base leading-none mt-0.5">📅</span>
                <div>
                  <p className="font-semibold text-foreground text-xs">{t.fitScore.training}</p>
                  <p className="text-xs">
                    {lang === "uk"
                      ? "Чи тренуєтесь ви за планом? Порівнює кількість тренувань з вашою запланованою частотою."
                      : "Are you training as planned? Compares completed workouts to your target frequency."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold text-base leading-none mt-0.5">💪</span>
                <div>
                  <p className="font-semibold text-foreground text-xs">{t.fitScore.strength}</p>
                  <p className="text-xs">
                    {lang === "uk"
                      ? "Чи б'єте ви рекорди? Враховує нові персональні рекорди за останні 30 днів."
                      : "Are you hitting PRs? Tracks new personal records in the last 30 days."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold text-base leading-none mt-0.5">⚖️</span>
                <div>
                  <p className="font-semibold text-foreground text-xs">{t.fitScore.balance}</p>
                  <p className="text-xs">
                    {lang === "uk"
                      ? "Чи тренуєте всі групи м'язів? Чим більше груп задіяно, тим вища оцінка."
                      : "Are you training all muscle groups? More groups trained means a higher score."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold text-base leading-none mt-0.5">📏</span>
                <div>
                  <p className="font-semibold text-foreground text-xs">{t.fitScore.body}</p>
                  <p className="text-xs">
                    {lang === "uk"
                      ? "Як давно ви оновлювали виміри тіла? Свіжіші дані — вища оцінка."
                      : "How recently did you update body measurements? Fresher data means a higher score."}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs border-t border-border pt-2">
              {lang === "uk"
                ? "💡 Ваги компонентів автоматично підлаштовуються під вашу ціль (сила, м'язи, схуднення тощо)."
                : "💡 Component weights automatically adjust based on your goal (strength, muscle, fat loss, etc)."}
            </p>
            <div className="border-t border-border pt-3 mt-3 space-y-2">
              <p className="font-semibold text-foreground text-sm">
                {lang === "uk" ? "⭐ Що таке XP?" : "⭐ What is XP?"}
              </p>
              <p className="text-xs">
                {lang === "uk"
                  ? "XP (досвід) — це бали, які ви збираєте за активність. Чим більше XP, тим вищий ваш рівень."
                  : "XP (experience) are points you earn for activity. The more XP, the higher your level."}
              </p>
              <p className="font-semibold text-foreground text-xs mt-2">
                {lang === "uk" ? "Як заробити XP:" : "How to earn XP:"}
              </p>
              <ul className="text-xs space-y-1 list-none">
                <li>🏋️ {lang === "uk" ? "Завершити тренування → +10 XP" : "Complete a workout → +10 XP"}</li>
                <li>🏆 {lang === "uk" ? "Побити особистий рекорд → +15–40 XP" : "Beat a personal record → +15–40 XP"}</li>
                <li>📏 {lang === "uk" ? "Оновити виміри тіла → +5 XP" : "Update body measurements → +5 XP"}</li>
                <li>🎯 {lang === "uk" ? "Виконати тижневий план тренувань → +20 XP" : "Hit weekly training plan → +20 XP"}</li>
                <li>🏅 {lang === "uk" ? "Виконати місячний план тренувань → +50 XP" : "Hit monthly training plan → +50 XP"}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FitnessScore;
