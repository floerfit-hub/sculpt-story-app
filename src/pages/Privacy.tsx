import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background px-5 py-8 max-w-2xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </Link>
    <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
    <div className="prose prose-sm text-muted-foreground space-y-4">
      <p className="text-xs text-muted-foreground">Last updated: March 12, 2026</p>

      <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
      <p><strong className="text-foreground">Account Data:</strong> Email address, name, and password when you create an account.</p>
      <p><strong className="text-foreground">Fitness Data:</strong> Workouts, exercises, body measurements, weight, body fat percentage, and progress photos you voluntarily submit.</p>
      <p><strong className="text-foreground">Usage Data:</strong> App usage patterns, device information, and browser type for service improvement.</p>
      <p><strong className="text-foreground">Payment Data:</strong> Billing information is processed by our payment provider (Paddle) and is not stored on our servers.</p>

      <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Data</h2>
      <p>We use your data to: (a) provide and maintain the fitness tracking service; (b) generate personalized insights and analytics; (c) process subscription payments; (d) send service-related notifications; (e) improve the App experience.</p>

      <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Security</h2>
      <p>Your data is stored securely using industry-standard encryption. Progress photos are stored in encrypted cloud storage. We implement appropriate technical and organizational measures to protect your personal data.</p>

      <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
      <p>We do not sell, rent, or trade your personal data. We may share data with: (a) payment processors to handle subscriptions; (b) cloud infrastructure providers for hosting; (c) law enforcement when legally required.</p>

      <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
      <p>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) delete your account and all associated data; (d) export your data; (e) withdraw consent at any time.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
      <p>We retain your data for as long as your account is active. Upon account deletion, all personal data and fitness records are permanently deleted within 30 days.</p>

      <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
      <p>The App uses essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

      <h2 className="text-lg font-semibold text-foreground">8. Children's Privacy</h2>
      <p>FitTrack is not intended for users under 16 years of age. We do not knowingly collect data from children.</p>

      <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification.</p>

      <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
      <p>For privacy-related inquiries, contact us at privacy@fittrack.app.</p>
    </div>
  </div>
);

export default Privacy;
