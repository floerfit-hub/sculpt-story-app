import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, PlusSquare, CheckCircle } from "lucide-react";
import { useTranslation } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    if (standalone) return;
    if (localStorage.getItem("install-prompt-dismissed")) return;
    if (!localStorage.getItem("workoutCompleted")) return;

    setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || !visible) return null;

  const dismiss = () => {
    localStorage.setItem("install-prompt-dismissed", "true");
    setVisible(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("install-prompt-dismissed", "true");
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  const handleIOSGotIt = () => {
    localStorage.setItem("install-prompt-dismissed", "true");
    setShowIOSModal(false);
    setVisible(false);
  };

  // Only show for iOS or when Android prompt is available
  if (!deferredPrompt && !isIOS) return null;

  const steps = [
    { icon: Share, text: t.install.step1 },
    { icon: PlusSquare, text: t.install.step2 },
    { icon: CheckCircle, text: t.install.step3 },
  ];

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
        <div className="rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t.install.installButton}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.install.androidDesc}
              </p>
            </div>
            <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={isIOS ? () => setShowIOSModal(true) : handleAndroidInstall}
          >
            <Download className="mr-2 h-4 w-4" />
            {t.install.installButton}
          </Button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="max-w-sm rounded-2xl" aria-describedby="ios-install-desc">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold">{t.install.title}</DialogTitle>
            <DialogDescription id="ios-install-desc" className="sr-only">
              {t.install.androidDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <step.icon className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleIOSGotIt}
          >
            {t.install.gotIt}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallPrompt;
