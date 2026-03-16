import { ReactNode, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Dumbbell, LayoutDashboard, PlusCircle, Calculator, UserCircle, Shield, Crown } from "lucide-react";


const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, isAdmin } = useAuth();
  const { isPremium } = usePremium();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: t.nav.home },
    { to: "/workouts", icon: Dumbbell, label: t.nav.workouts },
    { to: "/add-entry", icon: PlusCircle, label: t.nav.track },
    { to: "/calculator", icon: Calculator, label: t.nav.macros },
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: t.nav.admin }] : []),
    { to: "/profile", icon: UserCircle, label: t.nav.profile },
  ];

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore swipes on interactive elements (inputs, textareas, sliders, charts)
    const tag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (["input", "textarea", "select", "canvas"].includes(tag)) {
      touchStart.current = null;
      return;
    }
    // Ignore edge swipes (within 30px of screen edge) to avoid OS gesture conflicts
    const x = e.touches[0].clientX;
    if (x < 30 || x > window.innerWidth - 30) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Require 80px horizontal swipe, mostly horizontal direction
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
    const currentIndex = navItems.findIndex((item) => item.to === location.pathname);
    if (currentIndex === -1) return;
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < navItems.length) {
      navigate(navItems[nextIndex].to);
    }
  }, [navItems, location.pathname, navigate]);

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
                Pro версія
              </span>
            )}
            <span className="text-sm text-muted-foreground truncate max-w-[120px] font-medium">
              {profile?.full_name || ""}
            </span>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-20 lg:pb-8 max-w-2xl mx-auto" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="flex justify-around py-1 max-w-lg mx-auto">
          {navItems.map((item) => {
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
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-all duration-200 min-w-[48px] rounded-xl ${
                  active
                    ? "text-primary text-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1 rounded-xl transition-all duration-200 ${active ? "bg-accent" : ""}`}>
                  <item.icon className={`h-4.5 w-4.5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                  {active && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>


      
    </div>
  );
};

export default AppLayout;
