import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Dumbbell, Home, PlusCircle, UserCircle, Crown, Scale, Utensils, Zap, Shield } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, isAdmin } = useAuth();
  const { isPremium } = usePremium();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const isWorkoutActive = location.pathname === "/workouts" && 
    (sessionStorage.getItem("workout-view") === "start" || sessionStorage.getItem("workout-view") === "edit");

  const quickActions = [
    ...(isWorkoutActive ? [
      {
        icon: Dumbbell,
        label: lang === "uk" ? "Додати вправу" : "Add Exercise",
        onClick: () => { setActionSheetOpen(false); navigate("/workouts"); sessionStorage.setItem("workout-view", "library"); },
      },
    ] : []),
    {
      icon: Zap,
      label: t.nav.quickStartWorkout || "Workout",
      onClick: () => { setActionSheetOpen(false); navigate("/workouts"); sessionStorage.setItem("workout-view", "start"); },
    },
    {
      icon: Scale,
      label: t.nav.quickLogMeasurements || "Log Measurements",
      onClick: () => { setActionSheetOpen(false); navigate("/add-entry"); },
    },
    {
      icon: Utensils,
      label: t.nav.quickLogNutrition || "Log Nutrition",
      onClick: () => { setActionSheetOpen(false); navigate("/add-entry"); },
    },
    ...(isAdmin ? [{
      icon: Shield,
      label: t.nav.admin || "Admin Panel",
      onClick: () => { setActionSheetOpen(false); navigate("/admin"); },
    }] : []),
  ];

  const navItems = [
    { to: "/", icon: Home, label: t.nav.home },
    { to: "/profile", icon: UserCircle, label: t.nav.profile },
  ];

  const isHomeActive = location.pathname === "/";
  const isProfileActive = location.pathname === "/profile";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-strong safe-top">
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary glow-primary transition-all duration-300 group-hover:glow-primary-strong">
              <Dumbbell className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">{t.nav.appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            {isPremium && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                <Crown className="h-3 w-3" />
                Pro
              </span>
            )}
            <span className="text-sm text-muted-foreground truncate max-w-[120px] font-medium">
              {profile?.full_name || ""}
            </span>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-36 lg:pb-8 max-w-2xl mx-auto">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-none border-0 pb-0 mb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-3 items-center pt-3 pb-0 max-w-lg mx-auto">
          {/* Home — centered between left edge and center */}
          <div className="flex justify-center">
            <Link
              to="/"
              onClick={(e) => {
                if (isHomeActive) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 text-[11px] transition-all duration-200 rounded-xl ${
                isHomeActive
                  ? "text-primary text-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isHomeActive ? "bg-accent" : ""}`}>
                <Home className={`h-5 w-5 transition-transform duration-200 ${isHomeActive ? "scale-110" : ""}`} />
                {isHomeActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-semibold leading-tight">{t.nav.home}</span>
            </Link>
          </div>

          {/* Center FAB — inline, not floating */}
          <div className="flex justify-center">
            <button
              onClick={() => setActionSheetOpen(true)}
              aria-label={t.nav.quickActions || "Quick actions"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg glow-primary hover:glow-primary-strong transition-all duration-200 active:scale-95"
            >
              <PlusCircle className="h-7 w-7" />
            </button>
          </div>

          {/* Profile — centered between center and right edge */}
          <div className="flex justify-center">
            <Link
              to="/profile"
              onClick={(e) => {
                if (isProfileActive) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 text-[11px] transition-all duration-200 rounded-xl ${
                isProfileActive
                  ? "text-primary text-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isProfileActive ? "bg-accent" : ""}`}>
                <UserCircle className={`h-5 w-5 transition-transform duration-200 ${isProfileActive ? "scale-110" : ""}`} />
                {isProfileActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-semibold leading-tight">{t.nav.profile}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Action Sheet */}
      <Drawer open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-lg font-bold">
              {t.nav.quickActions || "Quick Actions"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4 pb-8">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-150 hover:bg-accent active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-base font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AppLayout;
