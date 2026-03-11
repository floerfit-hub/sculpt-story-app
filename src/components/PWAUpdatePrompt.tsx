import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

const PWAUpdatePrompt = () => {
  const { t } = useI18n();
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
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t.pwa?.updateAvailable ?? "New version available"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t.pwa?.updateDescription ?? "Refresh to get the latest features"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => updateServiceWorker(true)}
                className="h-8 text-xs"
              >
                {t.pwa?.update ?? "Update"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPrompt(false)}
                className="h-8 text-xs"
              >
                {t.pwa?.later ?? "Later"}
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
