import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "@/i18n";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a one-time notification permission prompt banner.
 * Only appears if permission is "default" and not previously dismissed.
 */
const NotificationPrompt = () => {
  const { permission, requestPermission } = useNotifications();
  const { lang } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (permission !== "default") return;
    const wasDismissed = localStorage.getItem("notification_prompt_dismissed");
    if (wasDismissed) return;
    // Show after a delay
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [permission]);

  if (!show || dismissed || permission !== "default") return null;

  const handleAllow = async () => {
    await requestPermission();
    setShow(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification_prompt_dismissed", "true");
  };

  const isUk = lang === "uk";

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in max-w-md mx-auto">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">
            {isUk ? "Увімкнути сповіщення?" : "Enable notifications?"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isUk
              ? "Нагадування про тренування, рекорди та відновлення"
              : "Workout reminders, records, and recovery alerts"}
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleAllow} className="h-8 text-xs">
              {isUk ? "Увімкнути" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs">
              {isUk ? "Пізніше" : "Later"}
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
