import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, LayoutDashboard, PlusCircle, Calculator, Lightbulb, UserCircle, Swords } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Home" },
    { to: "/add-entry", icon: PlusCircle, label: "Track" },
    { to: "/calculator", icon: Calculator, label: "Macros" },
    { to: "/insights", icon: Lightbulb, label: "Insights" },
    { to: "/profile", icon: UserCircle, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">FitTrack</span>
          </Link>
          <span className="text-sm text-muted-foreground truncate max-w-[140px]">
            {profile?.full_name || ""}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-5 pb-24 lg:pb-6 max-w-2xl mx-auto">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm safe-bottom">
        <div className="flex justify-around py-1.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[11px] transition-colors min-w-[56px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  );
};

export default AppLayout;
