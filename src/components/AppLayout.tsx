import { ReactNode, useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Dumbbell, Home, PlusCircle, UserCircle, Crown, X, Scale, Utensils, Zap } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, isAdmin } = useAuth();
  const { isPremium } = usePremium();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const quickActions = [
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
    {
      icon: Zap,
      label: t.nav.quickStartWorkout || "Start Workout",
      onClick: () => { setActionSheetOpen(false); navigate("/workouts"); },
    },
  ];

  const navItems = [
    { to: "/", icon: Home, label: t.nav.home },
    { to: "/profile", icon: UserCircle, label: t.nav.profile },
  ];

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

      <main className="px-5 py-6 pb-28 lg:pb-8 max-w-2xl mx-auto">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="relative flex items-center justify-around pb-[env(safe-area-inset-bottom)] pt-2 pb-3 max-w-lg mx-auto">
          {/* Home */}
          {navItems.map((item, idx) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={(e) => {
                  if (active) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`flex flex-col items-center gap-1 px-6 py-1.5 text-[11px] transition-all duration-200 rounded-xl ${
                  active
                    ? "text-primary text-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={idx === 0 ? { marginRight: "auto" } : { marginLeft: "auto" }}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-accent" : ""}`}>
                  <item.icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                  {active && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                  )}
                </div>
                <span className="font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* Floating Action Button — centered */}
          <button
            onClick={() => setActionSheetOpen(true)}
            aria-label={t.nav.quickActions || "Quick actions"}
            className="absolute left-1/2 -translate-x-1/2 -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg glow-primary hover:glow-primary-strong transition-all duration-200 active:scale-95"
          >
            <PlusCircle className="h-7 w-7" />
          </button>
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
