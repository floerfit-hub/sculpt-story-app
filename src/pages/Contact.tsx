import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Contact = () => (
  <div className="min-h-screen bg-background px-5 py-8 max-w-2xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </Link>
    <h1 className="text-2xl font-bold mb-2">Contact Us</h1>
    <p className="text-muted-foreground text-sm mb-8">Have questions, feedback, or need help? We'd love to hear from you.</p>

    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 flex gap-4 items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-sm">Email Support</p>
            <p className="text-sm text-muted-foreground mt-1">For general inquiries, billing questions, or technical support:</p>
            <a href="mailto:ruslanstrus465@gmail.com" className="text-primary font-semibold text-sm hover:underline mt-1 inline-block">ruslanstrus465@gmail.com</a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 flex gap-4 items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-sm">Feedback & Feature Requests</p>
            <p className="text-sm text-muted-foreground mt-1">We're always improving. Share your ideas and suggestions:</p>
            <a href="mailto:ruslanstrus465@gmail.com" className="text-primary font-semibold text-sm hover:underline mt-1 inline-block">ruslanstrus465@gmail.com</a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 flex gap-4 items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-sm">Response Time</p>
            <p className="text-sm text-muted-foreground mt-1">We typically respond to all inquiries within 24 hours during business days (Monday–Friday, 9 AM – 6 PM CET).</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="mt-8 p-5 rounded-2xl border border-border bg-muted/30 space-y-2">
      <p className="font-display font-bold text-sm">Before contacting us, check these common topics:</p>
      <ul className="text-sm text-muted-foreground space-y-1">
        <li>• <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link> — How to request a refund</li>
        <li>• <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> — How we handle your data</li>
        <li>• <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> — Usage terms and conditions</li>
      </ul>
    </div>

    <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-8">
      <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
      <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
      <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
    </div>
  </div>
);

export default Contact;
