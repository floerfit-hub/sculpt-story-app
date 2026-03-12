import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PremiumProvider } from "@/hooks/usePremium";
import { I18nProvider } from "@/i18n";
import { ThemeProvider } from "@/hooks/useTheme";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import AddEntry from "@/pages/AddEntry";
import Charts from "@/pages/Charts";
import Photos from "@/pages/Photos";
import CoachView from "@/pages/CoachView";
import Calculator from "@/pages/Calculator";
import Insights from "@/pages/Insights";
import Profile from "@/pages/Profile";
import Workouts from "@/pages/Workouts";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refund from "@/pages/Refund";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <HashRouter>
          <I18nProvider>
            <AuthProvider>
              <PremiumProvider>
              <Routes>
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/add-entry" element={<ProtectedRoute><AddEntry /></ProtectedRoute>} />
                <Route path="/charts" element={<ProtectedRoute><Charts /></ProtectedRoute>} />
                <Route path="/photos" element={<ProtectedRoute><Photos /></ProtectedRoute>} />
                <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
                <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/coach" element={<ProtectedRoute><CoachView /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </PremiumProvider>
            </AuthProvider>
          </I18nProvider>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
