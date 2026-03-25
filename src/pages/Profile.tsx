import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation, type Language } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Save, Download, Globe, Moon, Sun, Crown, Check, X, Mail, Weight, LayoutDashboard, RefreshCw, Target, Bell, Smartphone, Camera } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useNotifications } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "uk", label: "Українська" },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const COMPARISON_FEATURES = [
  { key: "muscleAnalytics" as const, free: false, pro: true },
  { key: "historyFilters" as const, free: false, pro: true },
  { key: "noAds" as const, free: false, pro: true },
  { key: "unlimitedHistory" as const, free: false, pro: true },
  { key: "customPlans" as const, free: false, pro: true },
  { key: "prioritySupport" as const, free: false, pro: true },
];

const NotificationCard = () => {
  const { enabled, permission, requestPermission, disableNotifications } = useNotifications();
  const { lang } = useTranslation();
  const isUk = lang === "uk";

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await requestPermission();
    } else {
      await disableNotifications();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm">
            {isUk ? "Сповіщення" : "Notifications"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isUk ? "Нагадування, рекорди, відновлення" : "Reminders, records, recovery"}
          </p>
        </div>
        <Switch
          checked={enabled && permission === "granted"}
          onCheckedChange={handleToggle}
        />
      </CardContent>
    </Card>
  );
};

const HapticSettingsCard = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const p = profile as any;
  const [haptic, setHaptic] = useState(p?.haptic_feedback ?? true);
  const [timer, setTimer] = useState(p?.timer_vibration ?? true);
  const [pr, setPr] = useState(p?.pr_celebration_vibration ?? true);

  // Sync from profile when it loads/changes
  useEffect(() => {
    if (p) {
      setHaptic(p.haptic_feedback ?? true);
      setTimer(p.timer_vibration ?? true);
      setPr(p.pr_celebration_vibration ?? true);
    }
  }, [p?.haptic_feedback, p?.timer_vibration, p?.pr_celebration_vibration]);

  const update = async (field: string, value: boolean) => {
    if (!user) return;
    await supabase.from("profiles").update({ [field]: value } as any).eq("user_id", user.id);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">{t.profile.hapticFeedback}</p>
            <p className="text-xs text-muted-foreground">{t.profile.hapticFeedbackDesc}</p>
          </div>
          <Switch checked={haptic} onCheckedChange={(v) => { setHaptic(v); update("haptic_feedback", v); }} />
        </div>
        {haptic && (
          <>
            <div className="flex items-center gap-3 pl-[52px]">
              <div className="flex-1">
                <p className="text-sm">{t.profile.timerVibration}</p>
                <p className="text-xs text-muted-foreground">{t.profile.timerVibrationDesc}</p>
              </div>
              <Switch checked={timer} onCheckedChange={(v) => { setTimer(v); update("timer_vibration", v); }} />
            </div>
            <div className="flex items-center gap-3 pl-[52px]">
              <div className="flex-1">
                <p className="text-sm">{t.profile.prVibration}</p>
                <p className="text-xs text-muted-foreground">{t.profile.prVibrationDesc}</p>
              </div>
              <Switch checked={pr} onCheckedChange={(v) => { setPr(v); update("pr_celebration_vibration", v); }} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const { isPremium } = usePremium();
  const { toast } = useToast();
  const { t, lang, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.full_name || "");
  const [weightUnit, setWeightUnit] = useState(profile?.weight_unit || "kg");
  const [primaryGoal, setPrimaryGoal] = useState(profile?.primary_goal || "");
  const [trainingFrequency, setTrainingFrequency] = useState(profile?.training_frequency?.toString() || "4");
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || "");
  const [saving, setSaving] = useState(false);

  // Sync local state from profile when it loads/changes
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setWeightUnit(profile.weight_unit || "kg");
      setPrimaryGoal(profile.primary_goal || "");
      setTrainingFrequency(profile.training_frequency?.toString() || "4");
      setExperienceLevel(profile.experience_level || "");
    }
  }, [profile]);

  const autoSaveGoal = async (field: string, value: any) => {
    if (!user) return;
    await supabase.from("profiles").update({ [field]: value } as any).eq("user_id", user.id);
  };
  const [isStandalone] = useState(window.matchMedia("(display-mode: standalone)").matches);
  const [isIOS] = useState(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, _registration) {},
    onRegisterError() {},
  });

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations?.length) {
        await Promise.all(registrations.map(r => r.update()));
      }
      // Give SW time to detect update
      await new Promise(r => setTimeout(r, 2000));
      if (needRefresh) {
        toast({ title: t.profile.updateFound });
        updateServiceWorker(true);
      } else {
        toast({ title: t.profile.noUpdates });
      }
    } catch {
      toast({ title: t.profile.noUpdates });
    }
    setCheckingUpdate(false);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      toast({ title: t.profile.installApp, description: "✅" });
    }
  }, [deferredPrompt, toast, t]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.profile.profileUpdated });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold">{t.profile.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t.profile.account}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.profile.email}</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t.profile.fullName}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profile.yourName} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t.profile.saving : t.profile.saveChanges}
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            {t.profile.theme}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.themeDesc}</p>
          <div className="flex gap-2">
            <Button variant={theme === "dark" ? "default" : "outline"} className="flex-1" onClick={() => setTheme("dark")}>
              <Moon className="mr-1 h-4 w-4" /> {t.profile.dark}
            </Button>
            <Button variant={theme === "light" ? "default" : "outline"} className="flex-1" onClick={() => setTheme("light")}>
              <Sun className="mr-1 h-4 w-4" /> {t.profile.light}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t.profile.language}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.languageDesc}</p>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <Button key={l.code} variant={lang === l.code ? "default" : "outline"} className="flex-1" onClick={() => setLanguage(l.code)}>
                {l.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weight Unit */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Weight className="h-5 w-5 text-primary" />
            {t.profile.weightUnit}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.weightUnitDesc}</p>
          <div className="flex gap-2">
            <Button
              variant={weightUnit === "kg" ? "default" : "outline"}
              className="flex-1"
              onClick={async () => {
                setWeightUnit("kg");
                if (user) await supabase.from("profiles").update({ weight_unit: "kg" } as any).eq("user_id", user.id);
              }}
            >
              kg
            </Button>
            <Button
              variant={weightUnit === "lb" ? "default" : "outline"}
              className="flex-1"
              onClick={async () => {
                setWeightUnit("lb");
                if (user) await supabase.from("profiles").update({ weight_unit: "lb" } as any).eq("user_id", user.id);
              }}
            >
              lb
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <NotificationCard />

      {/* Haptic Feedback */}
      <HapticSettingsCard />

      {/* Training Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t.profile.trainingGoals || "Training Goals"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.onboarding.goalTitle}</Label>
            <Select value={primaryGoal} onValueChange={(v) => { setPrimaryGoal(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["muscle_gain", "fat_loss", "strength", "maintenance", "endurance"].map(g => (
                  <SelectItem key={g} value={g}>{t.onboarding.goals[g as keyof typeof t.onboarding.goals]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.onboarding.frequencyTitle}</Label>
            <Select value={trainingFrequency} onValueChange={(v) => { setTrainingFrequency(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map(f => (
                  <SelectItem key={f} value={f.toString()}>{f}x {lang === "uk" ? "на тиждень" : "per week"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.onboarding.levelTitle}</Label>
            <Select value={experienceLevel} onValueChange={(v) => { setExperienceLevel(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["beginner", "intermediate", "advanced"].map(l => (
                  <SelectItem key={l} value={l}>{t.onboarding.levels[l as keyof typeof t.onboarding.levels]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              if (!user) return;
              setSaving(true);
              await supabase.from("profiles").update({
                primary_goal: primaryGoal,
                training_frequency: Number(trainingFrequency),
                experience_level: experienceLevel,
              } as any).eq("user_id", user.id);
              setSaving(false);
              toast({ title: t.profile.profileUpdated });
            }}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? t.profile.saving : (lang === "uk" ? "Зберегти цілі" : "Save Goals")}
          </Button>
        </CardContent>
      </Card>
      {/* Dashboard Customization */}
      <Card className="cursor-pointer transition-all hover:border-primary/40 active:scale-[0.98]" onClick={() => navigate("/?edit=true")}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">{t.dashboard.customizeDashboard}</p>
            <p className="text-xs text-muted-foreground">{t.dashboard.editPanels}</p>
          </div>
        </CardContent>
      </Card>

      <SubscriptionManager />

      {/* Pro Benefits comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {t.proBenefits.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_60px] bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground">
              <span></span>
              <span className="text-center">{t.proBenefits.freeLabel}</span>
              <span className="text-center text-primary">{t.proBenefits.proLabel}</span>
            </div>
            {COMPARISON_FEATURES.map(({ key, free, pro }) => (
              <div key={key} className="grid grid-cols-[1fr_60px_60px] px-3 py-2.5 border-t border-border text-sm">
                <span className="font-medium">{t.proBenefits[key]}</span>
                <span className="flex justify-center">
                  {free ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground/40" />}
                </span>
                <span className="flex justify-center">
                  {pro ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground/40" />}
                </span>
              </div>
            ))}
          </div>
          {isPremium && (
            <div className="mt-3 text-center">
              <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-500">
                <Crown className="mr-1 h-3 w-3" /> Pro версія
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check for updates */}
      <Card
        className="cursor-pointer transition-all hover:border-primary/40 active:scale-[0.98]"
        onClick={checkingUpdate ? undefined : handleCheckUpdate}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <RefreshCw className={`h-5 w-5 text-primary ${checkingUpdate ? "animate-spin" : ""}`} />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">{t.profile.checkForUpdates}</p>
            <p className="text-xs text-muted-foreground">{checkingUpdate ? t.profile.checking : t.profile.checkForUpdatesDesc}</p>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t.profile.support}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">{t.profile.supportDesc}</p>
          <a href={`mailto:${t.profile.supportEmail}`} className="text-primary font-semibold text-sm hover:underline">
            {t.profile.supportEmail}
          </a>
        </CardContent>
      </Card>

      {!isStandalone && (
        <Card
          className="border-primary/30 cursor-pointer transition-all duration-200 hover:border-primary/60 active:scale-[0.98]"
          onClick={isIOS ? undefined : handleInstall}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary glow-primary">
              <Download className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">{t.profile.installApp}</p>
              <p className="text-xs text-muted-foreground">
                {isIOS ? "Tap Share → Add to Home Screen" : t.profile.addToHome}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        {t.profile.signOut}
      </Button>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-4 pb-2">
        <Link to="/terms" className="hover:text-foreground transition-colors">Умови</Link>
        <Link to="/privacy" className="hover:text-foreground transition-colors">Конфіденційність</Link>
        <Link to="/refund" className="hover:text-foreground transition-colors">Повернення</Link>
        <Link to="/contact" className="hover:text-foreground transition-colors">Контакти</Link>
        <a href="mailto:ruslanstrus465@gmail.com" className="hover:text-foreground transition-colors">Підтримка</a>
      </div>
    </div>
  );
};

export default Profile;
