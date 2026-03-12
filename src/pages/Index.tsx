import { Link } from "react-router-dom";
import { Dumbbell, BarChart3, Target, Sparkles, Shield, Zap, ArrowRight, Check, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const features = [
    { icon: Dumbbell, title: "Відстеження тренувань", desc: "Записуйте кожний підхід, повторення та вагу. Відстежуйте 40+ вправ у 6 м'язових групах з вбудованим таймером відпочинку." },
    { icon: BarChart3, title: "Аналітика м'язів", desc: "Візуалізуйте обсяг тренувань за допомогою теплових карт м'язів, графіків прогресу сили та трендів складу тіла." },
    { icon: Target, title: "Вимірювання тіла", desc: "Відстежуйте вагу, талію, груди, руки, сідниці, стегна та відсоток жиру з перевірками кожні два тижні." },
    { icon: Sparkles, title: "AI-інсайти", desc: "Отримуйте персоналізовані рекомендації щодо тренувань, виявлення плато та оптимізацію харчування на основі ШІ." },
    { icon: Shield, title: "Фото прогресу", desc: "Завантажуйте та порівнюйте фото прогресу поруч, щоб візуально відстежувати вашу трансформацію." },
    { icon: Zap, title: "Калькулятор калорій та макросів", desc: "Персоналізовані цілі калорій та макронутрієнтів на основі ваших цілей, рівня активності та складу тіла." },
  ];

  const steps = [
    { num: "01", title: "Створіть акаунт", desc: "Реєстрація за кілька секунд. Кредитна картка не потрібна." },
    { num: "02", title: "Записуйте тренування", desc: "Відстежуйте вправи, підходи, повторення та вагу. Бібліотека з 40+ вправ." },
    { num: "03", title: "Слідкуйте за прогресом", desc: "Фіксуйте вимірювання тіла та фото кожні два тижні для моніторингу трансформації." },
    { num: "04", title: "Отримуйте розумні інсайти", desc: "Відкрийте AI-аналітику, теплові карти м'язів та персоналізовані рекомендації з Pro." },
  ];

  const freeFeatures = ["Базове логування тренувань", "Бібліотека вправ (40+ вправ)", "Вимірювання тіла кожні 2 тижні", "Відстеження ваги та талії", "Завантаження фото прогресу"];
  const proFeatures = ["Все з безкоштовного плану", "Теплова карта м'язових груп", "AI-інсайти та рекомендації", "Розширені графіки прогресу сили", "Панель складу тіла", "Відстеження Fitness Score", "Необмежена історія тренувань з фільтрами", "Пріоритетна підтримка"];

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
              <Button variant="ghost" size="sm">Увійти</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Реєстрація</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3" /> Відстеження тренувань та аналітика м'язів SaaS
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
          Відстежуй тренування. Аналізуй м'язи. <span className="text-primary">Трансформуй своє тіло.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          FitTrack Pro — це комплексна платформа для відстеження фітнесу: логування тренувань, моніторинг вимірювань тіла та AI-інсайти для оптимізації тренувань і харчування.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/auth">
            <Button size="lg" className="text-base px-8">
              Почати безкоштовно <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="text-base px-8">
              Переглянути ціни
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Кредитна картка не потрібна · Безкоштовний план · Скасування в будь-який час</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-extrabold">Все необхідне для відстеження фітнесу</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Від базового логування тренувань до розширеної AI-аналітики — FitTrack Pro покриває весь ваш фітнес-шлях.</p>
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
          <h2 className="text-3xl font-display font-extrabold">Як це працює</h2>
          <p className="text-muted-foreground mt-3">Почніть за чотири простих кроки</p>
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
          <h2 className="text-3xl font-display font-extrabold">Прості та прозорі ціни</h2>
          <p className="text-muted-foreground mt-3">Почніть безкоштовно, оновіть коли будете готові</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Безкоштовний</h3>
              <p className="text-3xl font-display font-extrabold">$0 <span className="text-sm font-normal text-muted-foreground">/ назавжди</span></p>
              <ul className="space-y-2">
                {freeFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/auth"><Button variant="outline" className="w-full">Почати</Button></Link>
            </CardContent>
          </Card>
          <Card className="border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">ПОПУЛЯРНИЙ</div>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display font-bold text-xl">Pro</h3>
              <p className="text-3xl font-display font-extrabold">$1 <span className="text-sm font-normal text-muted-foreground">/ місяць</span></p>
              <p className="text-xs text-muted-foreground">або $10/рік (економія 17%) · 7 днів безкоштовно</p>
              <ul className="space-y-2">
                {proFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/pricing"><Button className="w-full">Почати безкоштовний тріал <ChevronRight className="ml-1 h-4 w-4" /></Button></Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-extrabold">Зв'яжіться з нами</h2>
          <p className="text-muted-foreground mt-3">Маєте питання? Ми тут, щоб допомогти.</p>
        </div>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">З питань підтримки, оплати або загальних запитів:</p>
            <a href="mailto:support@fittrack.app" className="text-primary font-semibold hover:underline">support@fittrack.app</a>
            <p className="text-xs text-muted-foreground">Ми зазвичай відповідаємо протягом 24 годин.</p>
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
              <Link to="/terms" className="hover:text-foreground transition-colors">Умови використання</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Конфіденційність</Link>
              <Link to="/refund" className="hover:text-foreground transition-colors">Повернення коштів</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Контакти</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 FitTrack Pro. Усі права захищені.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
