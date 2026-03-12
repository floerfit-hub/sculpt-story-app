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

      <p>These Terms of Service ("Terms") govern your access to and use of FitTrack Pro ("the App", "Service", "we", "us", or "our"), a fitness tracking software-as-a-service platform operated by FitTrack Pro. By accessing or using the App, you agree to be bound by these Terms. If you do not agree, you must not use the App.</p>

      <h2 className="text-lg font-semibold text-foreground">1. Description of Service</h2>
      <p>FitTrack Pro is a web-based and mobile-optimized fitness tracking application that enables users to log workouts, track body measurements (weight, waist, chest, arms, glutes, thighs, body fat percentage), upload progress photos, view training analytics including muscle group heatmaps and strength progression charts, and receive AI-powered personalized training and nutrition insights. The App offers both a free tier with core functionality and a premium subscription tier ("FitTrack Pro") with advanced features.</p>

      <h2 className="text-lg font-semibold text-foreground">2. Eligibility</h2>
      <p>You must be at least 16 years of age to create an account and use FitTrack Pro. By registering, you represent and warrant that you meet this age requirement. If you are under the age of 18, you must have the consent of a parent or legal guardian to use the Service.</p>

      <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
      <p>To access the full functionality of the App, you must create an account by providing a valid email address, your name, and a secure password. You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to: (a) provide accurate, current, and complete information during registration; (b) maintain and promptly update your account information; (c) notify us immediately of any unauthorized access to your account. We reserve the right to suspend or terminate accounts that contain inaccurate information or violate these Terms.</p>

      <h2 className="text-lg font-semibold text-foreground">4. Subscriptions and Billing</h2>
      <p>FitTrack Pro offers a free tier and a premium subscription with the following plans:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-foreground">Monthly Plan:</strong> $1.00 USD per month</li>
        <li><strong className="text-foreground">Yearly Plan:</strong> $10.00 USD per year (equivalent to approximately $0.83/month)</li>
      </ul>
      <p>All premium subscriptions include a 7-day free trial. During the trial period, you will not be charged. If you do not cancel before the trial ends, your selected payment method will be automatically charged for the chosen plan. Subscriptions renew automatically at the end of each billing period (monthly or annually) unless cancelled prior to the renewal date. All payments are processed securely through Paddle, our authorized payment provider. Prices are subject to change with reasonable notice. Any price changes will not affect your current billing period.</p>

      <h2 className="text-lg font-semibold text-foreground">5. Free Trial</h2>
      <p>Each new user is eligible for one 7-day free trial of FitTrack Pro premium features. During the trial, you will have full access to all premium features including advanced muscle-group analytics, AI training insights, and unlimited workout history. You may cancel the trial at any time before it ends without being charged. After the trial period expires, you will be charged for the selected subscription plan unless you have cancelled.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Cancellation</h2>
      <p>You may cancel your subscription at any time through the Profile section within the App. Upon cancellation: (a) you will retain access to premium features until the end of your current billing period; (b) your account will revert to the free plan after the billing period ends; (c) no further charges will be applied to your payment method. We do not provide partial refunds for unused portions of a billing period unless required by applicable law.</p>

      <h2 className="text-lg font-semibold text-foreground">7. User Content and Data</h2>
      <p>You retain full ownership of all content and data you submit to the App, including but not limited to workout logs, body measurement records, progress photos, and personal notes. By using the App, you grant FitTrack Pro a limited, non-exclusive, non-transferable license to store, process, and display this data solely for the purpose of providing the Service to you. We do not sell, rent, or share your personal data with third parties for marketing purposes. Your data is stored securely using industry-standard encryption protocols.</p>

      <h2 className="text-lg font-semibold text-foreground">8. Acceptable Use</h2>
      <p>You agree not to: (a) use the App for any unlawful or fraudulent purposes; (b) attempt to gain unauthorized access to any part of the Service, its servers, or any systems connected to the Service; (c) interfere with or disrupt the integrity or performance of the App or its infrastructure; (d) upload or transmit malicious code, viruses, or any other harmful content; (e) use the App to harass, abuse, or harm other users; (f) reverse-engineer, decompile, or disassemble any part of the App; (g) use automated systems, bots, or scripts to access the Service without express written permission.</p>

      <h2 className="text-lg font-semibold text-foreground">9. Health and Fitness Disclaimer</h2>
      <p>FitTrack Pro is not a medical device, and the App does not provide medical advice, diagnosis, or treatment. All fitness data, AI-generated insights, training recommendations, calorie calculations, and macro targets are provided for informational and educational purposes only. They should not be considered a substitute for professional medical advice, personal training, or nutritional counseling. You should consult a qualified healthcare professional before starting any exercise program, changing your diet, or if you have any health concerns. You use the fitness-related features of this App at your own risk.</p>

      <h2 className="text-lg font-semibold text-foreground">10. Intellectual Property</h2>
      <p>All content, features, and functionality of FitTrack Pro — including but not limited to the software, design, text, graphics, logos, icons, algorithms, and user interface — are owned by FitTrack Pro and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the App without prior written consent.</p>

      <h2 className="text-lg font-semibold text-foreground">11. Limitation of Liability</h2>
      <p>To the fullest extent permitted by applicable law, FitTrack Pro and its owners, officers, employees, agents, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the App, including but not limited to loss of data, personal injury, or loss of profits, whether based on warranty, contract, tort, or any other legal theory, even if we have been advised of the possibility of such damages. Our total liability for any claim arising from or related to the Service shall not exceed the amount you paid for the Service in the twelve (12) months preceding the claim.</p>

      <h2 className="text-lg font-semibold text-foreground">12. Disclaimer of Warranties</h2>
      <p>The App is provided on an "as is" and "as available" basis without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the App will be uninterrupted, error-free, secure, or free of viruses or other harmful components.</p>

      <h2 className="text-lg font-semibold text-foreground">13. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless FitTrack Pro and its affiliates, officers, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use or misuse of the App; (b) your violation of these Terms; (c) your violation of any rights of a third party.</p>

      <h2 className="text-lg font-semibold text-foreground">14. Termination</h2>
      <p>We reserve the right to suspend or terminate your account and access to the App at any time, with or without cause, and with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion. You may delete your account at any time through the Profile section in the App. Upon termination, your right to use the App will immediately cease.</p>

      <h2 className="text-lg font-semibold text-foreground">15. Modifications to Terms</h2>
      <p>We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email or through a prominent notice within the App at least 14 days before the changes take effect. Your continued use of the App after the effective date of any modifications constitutes your acceptance of the updated Terms.</p>

      <h2 className="text-lg font-semibold text-foreground">16. Governing Law</h2>
      <p>These Terms shall be governed by and construed in accordance with the laws of the European Union and the applicable national laws. Any disputes arising under these Terms shall be resolved in the competent courts of the jurisdiction in which FitTrack Pro operates.</p>

      <h2 className="text-lg font-semibold text-foreground">17. Severability</h2>
      <p>If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions will remain in full force and effect.</p>

      <h2 className="text-lg font-semibold text-foreground">18. Contact Information</h2>
      <p>For questions, concerns, or notices regarding these Terms of Service, please contact us at:</p>
      <p><strong className="text-foreground">Email:</strong> <a href="mailto:support@fittrack.app" className="text-primary hover:underline">support@fittrack.app</a></p>
    </div>

    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-8 pb-4">
      <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      <Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
      <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
    </div>
  </div>
);

export default Terms;
