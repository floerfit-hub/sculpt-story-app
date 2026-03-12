import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Refund = () => (
  <div className="min-h-screen bg-background px-5 py-8 max-w-2xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </Link>
    <h1 className="text-2xl font-bold mb-6">Refund Policy</h1>
    <div className="prose prose-sm text-muted-foreground space-y-4">
      <p className="text-xs text-muted-foreground">Last updated: March 12, 2026</p>

      <p>This Refund Policy outlines the terms and conditions under which refunds are provided for FitTrack Pro premium subscriptions. We want you to be completely satisfied with our Service. If you're not, we're here to help.</p>

      <h2 className="text-lg font-semibold text-foreground">1. Free Trial Period</h2>
      <p>All FitTrack Pro premium subscriptions begin with a complimentary 7-day free trial. During the trial period: (a) you will have full access to all premium features; (b) you will not be charged; (c) you may cancel at any time before the trial ends to avoid being charged. If you cancel during the trial period, your account will revert to the free plan at the end of the trial, and no charges will be applied. We encourage all users to take full advantage of the trial period to evaluate the premium features before committing to a paid subscription.</p>

      <h2 className="text-lg font-semibold text-foreground">2. Monthly Subscription Refunds</h2>
      <p>For monthly subscriptions ($1.00 USD/month): (a) you may request a full refund within 7 days of your first payment after the trial period; (b) refund requests made after the initial 7-day window will be evaluated on a case-by-case basis; (c) if a refund is granted after the 7-day window, it will be prorated based on the remaining days in your billing period; (d) subsequent monthly charges after the first month are generally non-refundable, as you may cancel before the next billing cycle.</p>

      <h2 className="text-lg font-semibold text-foreground">3. Yearly Subscription Refunds</h2>
      <p>For yearly subscriptions ($10.00 USD/year): (a) you may request a full refund within 14 days of your annual payment; (b) refund requests made between 15 and 30 days after payment may receive a prorated refund at our discretion; (c) refund requests after 30 days will be evaluated on a case-by-case basis; (d) prorated refunds, when granted, will be calculated based on the number of full months remaining in the subscription period.</p>

      <h2 className="text-lg font-semibold text-foreground">4. How to Request a Refund</h2>
      <p>To request a refund, follow these steps:</p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Send an email to <a href="mailto:support@fittrack.app" className="text-primary hover:underline">support@fittrack.app</a> with the subject line "Refund Request".</li>
        <li>Include your registered email address associated with your FitTrack Pro account.</li>
        <li>Provide a brief explanation of the reason for your refund request.</li>
        <li>Include the approximate date of the charge you wish to have refunded.</li>
      </ol>
      <p>We aim to acknowledge all refund requests within 2 business days and process approved refunds within 5–10 business days. The actual time for the refund to appear in your account depends on your payment method and financial institution.</p>

      <h2 className="text-lg font-semibold text-foreground">5. Cancellation vs. Refund</h2>
      <p>Please note the difference between cancellation and a refund:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-foreground">Cancellation:</strong> Stops future charges. You retain access to premium features until the end of your current billing period. No refund is issued for the current period.</li>
        <li><strong className="text-foreground">Refund:</strong> Returns the payment for the current billing period. Your premium access may be revoked immediately upon processing.</li>
      </ul>
      <p>You can cancel your subscription at any time through the Profile section of the App without needing to contact support.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Exceptions — When Refunds Are Not Provided</h2>
      <p>Refunds will not be issued in the following circumstances: (a) accounts that have been terminated or suspended due to violations of our Terms of Service; (b) requests for partial billing periods after a voluntary cancellation (as you retain access through the end of the period); (c) duplicate purchases — contact us and we will resolve these promptly without a formal refund process; (d) chargebacks initiated through your bank or payment provider without first contacting us — we encourage you to reach out to our support team before initiating a chargeback; (e) after 30 days from the date of payment for monthly plans; (f) after 90 days from the date of payment for yearly plans.</p>

      <h2 className="text-lg font-semibold text-foreground">7. Payment Provider</h2>
      <p>All payments for FitTrack Pro are processed through Paddle (paddle.com), our Merchant of Record. Paddle handles payment processing, tax collection, and invoicing on our behalf. In some cases, refunds may need to be processed through Paddle's systems. Paddle complies with PCI DSS standards for secure payment processing. Refund processing times may vary depending on: your original payment method (credit card, PayPal, etc.); your financial institution's processing times; your country of residence.</p>

      <h2 className="text-lg font-semibold text-foreground">8. Billing Disputes</h2>
      <p>If you notice an unexpected charge or billing discrepancy, please contact us at <a href="mailto:support@fittrack.app" className="text-primary hover:underline">support@fittrack.app</a> before contacting your bank or payment provider. We will work to resolve any billing issues promptly and fairly.</p>

      <h2 className="text-lg font-semibold text-foreground">9. Changes to This Refund Policy</h2>
      <p>We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated "Last updated" date. Material changes will be communicated via email or in-app notification. Any changes to this policy will not retroactively affect refund requests submitted prior to the change.</p>

      <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
      <p>For refund requests, billing questions, or payment-related issues, contact us at:</p>
      <p><strong className="text-foreground">Email:</strong> <a href="mailto:support@fittrack.app" className="text-primary hover:underline">support@fittrack.app</a></p>
      <p>We strive to resolve all inquiries fairly and promptly.</p>
    </div>

    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-8 pb-4">
      <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
    </div>
  </div>
);

export default Refund;
