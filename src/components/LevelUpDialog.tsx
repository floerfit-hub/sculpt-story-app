import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { getLevelTitle } from "@/hooks/useFitnessStats";
import confetti from "canvas-confetti";

interface LevelUpDialogProps {
  open: boolean;
  onClose: () => void;
  newLevel: number;
}

const LevelUpDialog = ({ open, onClose, newLevel }: LevelUpDialogProps) => {
  const { t, lang } = useTranslation();

  useEffect(() => {
    if (!open) return;
    // Fire confetti burst
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F97316"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [open]);

  const title = getLevelTitle(newLevel, lang);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-xs text-center p-0 overflow-hidden border-none">
        <div className="bg-gradient-to-b from-primary/20 via-primary/5 to-background pt-10 pb-6 px-6 space-y-4">
          {/* Animated level badge */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
            <div className="absolute inset-2 rounded-full bg-primary/10" />
            <span className="relative text-4xl font-display font-extrabold text-primary z-10">
              {newLevel}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-display font-extrabold tracking-tight">
              {t.xp.levelUp} 🎉
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t.xp.newLevel} <span className="font-bold text-foreground">{newLevel}</span>
            </p>
            <p className="text-primary font-display font-bold text-lg mt-1">
              {title}
            </p>
          </div>

          <Button onClick={onClose} className="w-full mt-2">
            {lang === "uk" ? "Чудово!" : "Awesome!"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpDialog;
