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

      <h2 className="text-lg font-semibold text-foreground">1. Free Trial</h2>
      <p>FitTrack Premium includes a 7-day free trial. You will not be charged during the trial period. You may cancel at any time before the trial ends to avoid being charged.</p>

      <h2 className="text-lg font-semibold text-foreground">2. Subscription Refunds</h2>
      <p>If you are not satisfied with FitTrack Premium, you may request a full refund within 7 days of your first payment. Refund requests after this period will be evaluated on a case-by-case basis.</p>

      <h2 className="text-lg font-semibold text-foreground">3. How to Request a Refund</h2>
      <p>To request a refund, contact us at support@fittrack.app with your account email and reason for the refund. We aim to process all refund requests within 5 business days.</p>

      <h2 className="text-lg font-semibold text-foreground">4. Cancellation</h2>
      <p>You can cancel your subscription at any time from the Profile section of the App. Upon cancellation: (a) you retain access to Premium features until the end of your current billing period; (b) your account reverts to the Free plan after the billing period ends; (c) no further charges will be made.</p>

      <h2 className="text-lg font-semibold text-foreground">5. Yearly Subscriptions</h2>
      <p>For yearly subscriptions ($10/year), refunds are available within 14 days of purchase. After 14 days, a prorated refund may be issued at our discretion.</p>

      <h2 className="text-lg font-semibold text-foreground">6. Exceptions</h2>
      <p>Refunds will not be issued for: (a) accounts terminated due to Terms of Service violations; (b) partial billing periods after cancellation; (c) duplicate purchases (contact us and we will resolve these promptly).</p>

      <h2 className="text-lg font-semibold text-foreground">7. Payment Provider</h2>
      <p>Payments are processed through Paddle. In some cases, refunds may need to be processed through Paddle's systems. Processing times may vary depending on your payment method and financial institution.</p>

      <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
      <p>For refund requests or billing questions, contact us at support@fittrack.app.</p>
    </div>
  </div>
);

export default Refund;
