import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

const PWAUpdatePrompt = () => {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xl mx-4 max-w-sm w-full">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t.pwa.updateAvailable}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t.pwa.updateDescription}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => updateServiceWorker(true)}
                className="h-8 text-xs"
              >
                {t.pwa.update}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPrompt(false)}
                className="h-8 text-xs"
              >
                {t.pwa.later}
              </Button>
            </div>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
