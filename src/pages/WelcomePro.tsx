import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Dumbbell, BarChart3, Target, Sparkles } from "lucide-react";

const CONFETTI_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#A78BFA",
  "#F97316",
];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const WelcomePro = () => {
  const { profile } = useAuth();
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const pieces: ConfettiPiece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 8,
    }));
    setConfetti(pieces);
  }, []);

  const features = [
    { icon: BarChart3, title: "Advanced Muscle-Group Analytics", desc: "Deep breakdowns of every muscle group with performance trends." },
    { icon: Target, title: "Unlimited Workout History", desc: "Access your complete training history with advanced filters." },
    { icon: Sparkles, title: "Custom Training Plans", desc: "AI-powered plans tailored to your goals and progress." },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute animate-bounce"
            style={{
              left: `${piece.x}%`,
              top: "-20px",
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.size > 10 ? "50%" : "2px",
              transform: `rotate(${piece.rotation}deg)`,
              animation: `confettiFall ${2.5 + piece.delay}s ease-in ${piece.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="max-w-lg mx-auto px-5 py-12 space-y-8 relative z-20">
        {/* Crown icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary glow-primary animate-fade-in">
            <Crown className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            Welcome to the Elite, {profile?.full_name || "Champion"}! 🎉
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your FitTrack Pro features are now fully unlocked. Get ready to hit your goals with precision.
          </p>
        </div>

        {/* Feature cards */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-primary/20">
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <Link to="/">
            <Button className="w-full" size="lg">
              <Dumbbell className="mr-2 h-5 w-5" />
              Start Training Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WelcomePro;
