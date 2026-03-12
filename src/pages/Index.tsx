import { Link } from "react-router-dom";
import { Dumbbell, BarChart3, Target, Sparkles, Shield, Zap, ArrowRight, Check, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const features = [
    { icon: Dumbbell, title: "Workout Tracking", desc: "Log every set, rep, and weight. Track 40+ exercises across 6 muscle groups with a built-in rest timer." },
    { icon: BarChart3, title: "Muscle Analytics", desc: "Visualize training volume with muscle heatmaps, strength progression charts, and body composition trends." },
    { icon: Target, title: "Body Measurements", desc: "Track weight, waist, chest, arms, glutes, thighs, and body fat percentage with bi-weekly check-ins." },
    { icon: Sparkles, title: "AI Insights", desc: "Get personalized training recommendations, plateau detection, and nutrition optimization powered by AI." },
    { icon: Shield, title: "Progress Photos", desc: "Upload and compare progress photos side-by-side to visually track your transformation over time." },
    { icon: Zap, title: "Calorie & Macro Calculator", desc: "Personalized calorie and macronutrient targets based on your goals, activity level, and body composition." },
  ];

  const steps = [
    { num: "01", title: "Create Your Account", desc: "Sign up in seconds. No credit card required to start." },
    { num: "02", title: "Log Your Workouts", desc: "Track exercises, sets, reps, and weights. Use our library of 40+ exercises." },
    { num: "03", title: "Track Your Progress", desc: "Log body measurements and photos every two weeks to monitor your transformation." },
    { num: "04", title: "Get Smarter Insights", desc: "Unlock AI-powered analytics, muscle heatmaps, and personalized recommendations with Pro." },
  ];

  const freeFeatures = ["Basic workout logging", "Exercise library (40+ exercises)", "Bi-weekly body measurements", "Weight & waist tracking", "Progress photo uploads"];
  const proFeatures = ["Everything in Free", "Muscle group heatmap analytics", "AI training insights & recommendations", "Advanced strength progression charts", "Body composition dashboard", "Fitness Score tracking", "Unlimited workout history with filters", "Priority support"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary glow-primary">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">FitTrack Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Sign Up Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3" /> Workout Tracking & Muscle Analytics SaaS
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
          Track Workouts. Analyze Muscles. <span className="text-primary">Transform Your Body.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          FitTrack Pro is a comprehensive fitness tracking platform for logging workouts, monitoring body measurements, and getting AI-powered insights to optimize your training and nutrition.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/auth">
            <Button size="lg" className="text-base px-8">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="text-base px-8">
              View Pricing
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">No credit card required · Free plan available · Cancel anytime</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-extrabold">Everything You Need to Track Your Fitness</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">From basic workout logging to advanced AI-powered analytics — FitTrack Pro covers your entire fitness journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-extrabold">How It Works</h2>
          <p className="text-muted-foreground mt-3">Get started in four simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="text-center space-y-3">
              <div className="text-4xl font-display font-extrabold text-primary/20">{num}</div>
              <h3 className="font-display font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-extrabold">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mt-3">Start free, upgrade when you're ready</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Free</h3>
              <p className="text-3xl font-display font-extrabold">$0 <span className="text-sm font-normal text-muted-foreground">/ forever</span></p>
              <ul className="space-y-2">
                {freeFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/auth"><Button variant="outline" className="w-full">Get Started</Button></Link>
            </CardContent>
          </Card>
          <Card className="border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Pro</h3>
              <p className="text-3xl font-display font-extrabold">$1 <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
              <p className="text-xs text-muted-foreground">or $10/year (save 17%) · 7-day free trial</p>
              <ul className="space-y-2">
                {proFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/pricing"><Button className="w-full">Start Free Trial <ChevronRight className="ml-1 h-4 w-4" /></Button></Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-extrabold">Contact Us</h2>
          <p className="text-muted-foreground mt-3">Have questions? We're here to help.</p>
        </div>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">For support, billing, or general inquiries:</p>
            <a href="mailto:support@fittrack.app" className="text-primary font-semibold hover:underline">support@fittrack.app</a>
            <p className="text-xs text-muted-foreground">We typically respond within 24 hours.</p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-5 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-sm">FitTrack Pro</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 FitTrack Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
