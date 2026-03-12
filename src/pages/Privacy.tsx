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

      <p>This Privacy Policy describes how FitTrack Pro ("the App", "Service", "we", "us", or "our") collects, uses, stores, and protects your personal information when you use our fitness tracking platform. We are committed to protecting your privacy and handling your data responsibly. By using FitTrack Pro, you consent to the practices described in this policy.</p>

      <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>
      <p><strong className="text-foreground">1.1 Account Information:</strong> When you create an account, we collect your email address, full name, and an encrypted password. This information is necessary to provide you with access to the Service.</p>
      <p><strong className="text-foreground">1.2 Fitness and Health Data:</strong> When you use the App, you may voluntarily submit fitness-related data including: workout logs (exercises, sets, repetitions, weights); body measurements (weight, waist, chest, arms, glutes, thighs, body fat percentage); progress photos; personal notes and observations about your training.</p>
      <p><strong className="text-foreground">1.3 Usage Data:</strong> We automatically collect certain information about how you interact with the App, including: pages visited and features used; device type, operating system, and browser information; session duration and frequency; IP address (anonymized for analytics).</p>
      <p><strong className="text-foreground">1.4 Payment Information:</strong> Payment processing is handled entirely by our third-party payment provider, Paddle. We do not store your credit card numbers, bank account details, or other sensitive payment information on our servers. Paddle may collect payment-related information in accordance with their own privacy policy.</p>

      <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
      <p>We use your information to: (a) provide, maintain, and improve the fitness tracking Service; (b) create and manage your user account; (c) process subscription payments and manage billing through Paddle; (d) generate personalized fitness insights, analytics, and AI-powered recommendations; (e) display your progress data, charts, and heatmaps within the App; (f) send transactional emails related to your account (password resets, subscription confirmations); (g) respond to your support inquiries and feedback; (h) analyze usage patterns to improve the App's features and user experience; (i) comply with legal obligations.</p>

      <h2 className="text-lg font-semibold text-foreground">3. Data Storage and Security</h2>
      <p>Your data is stored on secure, encrypted cloud infrastructure. We implement industry-standard security measures including: encryption of data in transit (TLS/SSL) and at rest; row-level security policies ensuring users can only access their own data; regular security audits and vulnerability assessments; access controls limiting employee access to user data. Progress photos are stored in encrypted cloud storage with access restricted to the authenticated account owner. While we take reasonable measures to protect your data, no method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>

      <h2 className="text-lg font-semibold text-foreground">4. Data Sharing and Third Parties</h2>
      <p>We do not sell, rent, trade, or share your personal data with third parties for their marketing purposes. We may share data with the following categories of service providers, strictly for the purposes of operating the Service:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-foreground">Payment Processing:</strong> Paddle processes subscription payments. They receive only the information necessary to complete transactions.</li>
        <li><strong className="text-foreground">Cloud Infrastructure:</strong> Our hosting providers store and process data on our behalf under strict data processing agreements.</li>
        <li><strong className="text-foreground">Analytics:</strong> We may use anonymized, aggregated usage data to improve the Service. This data cannot be used to identify individual users.</li>
        <li><strong className="text-foreground">Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental regulation, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
      </ul>

      <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
        <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and all associated personal data.</li>
        <li><strong className="text-foreground">Data Portability:</strong> Export your fitness data in a standard format (CSV/PDF).</li>
        <li><strong className="text-foreground">Withdrawal of Consent:</strong> Withdraw your consent to data processing at any time by deleting your account.</li>
        <li><strong className="text-foreground">Restriction:</strong> Request restriction of processing of your personal data under certain circumstances.</li>
        <li><strong className="text-foreground">Objection:</strong> Object to processing of your personal data for specific purposes.</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:privacy@fittrack.app" className="text-primary hover:underline">privacy@fittrack.app</a>. We will respond to your request within 30 days.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
      <p>We retain your personal data for as long as your account is active and as needed to provide the Service. If you delete your account: (a) your personal profile information will be deleted immediately; (b) your fitness data, workout logs, and progress photos will be permanently deleted within 30 days; (c) anonymized, aggregated data that cannot identify you may be retained for analytical purposes; (d) data required by law or for legitimate business purposes (e.g., billing records) may be retained for the legally required period.</p>

      <h2 className="text-lg font-semibold text-foreground">7. Cookies and Local Storage</h2>
      <p>FitTrack Pro uses essential cookies and local storage mechanisms for: (a) user authentication and session management; (b) remembering your language and theme preferences; (c) ensuring the security of your account. We do not use third-party tracking cookies, advertising cookies, or cross-site tracking technologies. No personal data is shared with advertisers.</p>

      <h2 className="text-lg font-semibold text-foreground">8. International Data Transfers</h2>
      <p>Your data may be processed and stored in data centers located outside your country of residence. When we transfer data internationally, we ensure appropriate safeguards are in place, including standard contractual clauses approved by relevant data protection authorities.</p>

      <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
      <p>FitTrack Pro is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children under 16. If we discover that we have inadvertently collected data from a child under 16, we will promptly delete that information. If you are a parent or guardian and believe your child has provided us with personal data, please contact us at <a href="mailto:privacy@fittrack.app" className="text-primary hover:underline">privacy@fittrack.app</a>.</p>

      <h2 className="text-lg font-semibold text-foreground">10. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or the features of the App. If we make material changes, we will notify you by email or through a prominent notice within the App at least 14 days before the changes take effect. We encourage you to review this policy periodically.</p>

      <h2 className="text-lg font-semibold text-foreground">11. Data Protection Officer</h2>
      <p>For any privacy-related inquiries, data protection concerns, or to exercise your rights under applicable data protection laws (including GDPR), please contact our Data Protection team:</p>
      <p><strong className="text-foreground">Email:</strong> <a href="mailto:privacy@fittrack.app" className="text-primary hover:underline">privacy@fittrack.app</a></p>
      <p><strong className="text-foreground">General Support:</strong> <a href="mailto:support@fittrack.app" className="text-primary hover:underline">support@fittrack.app</a></p>
    </div>

    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-8 pb-4">
      <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
      <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
    </div>
  </div>
);

export default Privacy;
