import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background px-5 py-8 max-w-2xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </Link>
    <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
    <div className="prose prose-sm text-muted-foreground space-y-4">
      <p className="text-xs text-muted-foreground">Last updated: March 12, 2026</p>

      <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
      <p>By accessing or using FitTrack ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</p>

      <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
      <p>FitTrack is a fitness tracking application that allows users to log workouts, track body measurements, view progress analytics, and access personalized insights. The App offers both free and premium subscription tiers.</p>

      <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
      <p>You must create an account to use the App. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must provide accurate and complete information during registration.</p>

      <h2 className="text-lg font-semibold text-foreground">4. Subscriptions & Billing</h2>
      <p>FitTrack offers a free tier and a Premium subscription at $1/month or $10/year. Premium subscriptions include a 7-day free trial. After the trial, your chosen payment method will be charged automatically unless you cancel before the trial ends. Subscriptions renew automatically at the end of each billing period.</p>

      <h2 className="text-lg font-semibold text-foreground">5. User Content</h2>
      <p>You retain ownership of all data you submit (workouts, photos, measurements). By using the App, you grant FitTrack a limited license to store and process this data solely to provide the service. We do not sell your data to third parties.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Prohibited Conduct</h2>
      <p>You agree not to: (a) use the App for unlawful purposes; (b) attempt to gain unauthorized access to any part of the service; (c) interfere with or disrupt the App's infrastructure; (d) upload malicious content.</p>

      <h2 className="text-lg font-semibold text-foreground">7. Health Disclaimer</h2>
      <p>FitTrack is not a medical device and does not provide medical advice. All fitness data, insights, and recommendations are for informational purposes only. Consult a healthcare professional before starting any exercise or nutrition program.</p>

      <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
      <p>FitTrack is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the App.</p>

      <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
      <p>We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time through the App settings.</p>

      <h2 className="text-lg font-semibold text-foreground">10. Changes to Terms</h2>
      <p>We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms.</p>

      <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
      <p>For questions about these Terms, contact us at support@fittrack.app.</p>
    </div>
  </div>
);

export default Terms;
