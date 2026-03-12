import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Dumbbell, LayoutDashboard, PlusCircle, Calculator, UserCircle, Shield, Crown } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t.nav.home },
    { to: "/workouts", icon: Dumbbell, label: t.nav.workouts },
    { to: "/add-entry", icon: PlusCircle, label: t.nav.track },
    { to: "/calculator", icon: Calculator, label: t.nav.macros },
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: t.nav.admin }] : []),
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
          <span className="text-sm text-muted-foreground truncate max-w-[140px] font-medium">
            {profile?.full_name || ""}
          </span>
        </div>
      </header>

      <main className="px-5 py-6 pb-28 lg:pb-8 max-w-2xl mx-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[11px] transition-all duration-200 min-w-[56px] rounded-xl ${
                  active
                    ? "text-primary text-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-accent" : ""}`}>
                  <item.icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                  )}
                </div>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="pb-20 lg:pb-4 px-5 pt-4">
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
};

export default AppLayout;
