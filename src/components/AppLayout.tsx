import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dumbbell, LayoutDashboard, PlusCircle, BarChart3, Images, Users, LogOut, Calculator } from "lucide-react";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, isCoach, profile, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/add-entry", icon: PlusCircle, label: "Add Entry" },
    { to: "/charts", icon: BarChart3, label: "Charts" },
    { to: "/photos", icon: Images, label: "Photos" },
    { to: "/calculator", icon: Calculator, label: "Calculator" },
  ];

  if (isCoach) {
    navItems.push({ to: "/coach", icon: Users, label: "Clients" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">FitTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 pb-24 lg:pb-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm lg:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side nav (desktop) - hidden on mobile, integrated in top bar area */}
      <div className="fixed left-0 top-16 hidden w-56 border-r bg-card p-4 lg:block" style={{ height: "calc(100vh - 4rem)" }}>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
