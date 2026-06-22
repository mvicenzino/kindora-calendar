import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy - Kindora</title>
        <meta name="description" content="Learn how Kindora collects, uses, and protects your personal and family data. Our Privacy Policy covers data security, retention, cookies, and your rights." />
        <meta property="og:title" content="Privacy Policy - Kindora" />
        <meta property="og:description" content="Learn how Kindora protects your personal and family data. Read our Privacy Policy." />
        <meta property="og:url" content="https://kindora.ai/privacy" />
        <link rel="canonical" href="https://kindora.ai/privacy" />
      </Helmet>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-muted/50 border-b border-border px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover-elevate" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground font-['Space_Grotesk']">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="backdrop-blur-xl bg-card border border-border rounded-md p-6 md:p-10 text-foreground space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground font-['Space_Grotesk'] mb-2" data-testid="text-privacy-title">Privacy Policy</h2>
            <p className="text-muted-foreground text-sm">Last updated: June 22, 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">1. Introduction</h3>
            <p className="text-muted-foreground leading-relaxed">
              Kindora Family, Inc. ("Kindora," "we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Kindora application and related services (the "Service"). By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">2. Information We Collect</h3>
            <p className="text-muted-foreground leading-relaxed font-medium">Account Information:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>Name, email address, and profile picture (when provided or obtained via Google sign-in).</li>
              <li>Authentication credentials (passwords are hashed and never stored in plain text).</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed font-medium mt-2">Family & Care Data:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>Calendar events, schedules, and recurring event patterns.</li>
              <li>Medication names, dosages, schedules, and administration logs.</li>
              <li>Care documents uploaded to the Care Documentation Vault.</li>
              <li>Caregiver time entries, pay rates, and invoicing data.</li>
              <li>Family messages and event notes.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed font-medium mt-2">Connected Google Accounts (optional):</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>If you choose to connect Google Calendar or Google Drive, we store an access token tied to <span className="font-medium">your individual user account</span> — never shared across family members. Each person connects their own Google account, and disconnecting removes the stored token and revokes our access.</li>
              <li><span className="font-medium">Google Calendar (read):</span> We read events from the calendars you select so we can show them inside Kindora. This is one-way (Google → Kindora) and is the default.</li>
              <li><span className="font-medium">Google Calendar (two-way sync, optional):</span> If you turn on two-way sync, you grant Kindora permission to create, update, and delete events in the single Google calendar you designate. We only write events that you create or edit inside Kindora — we do not alter unrelated events in your Google account. You can turn two-way sync off, or change the target calendar, at any time in Settings.</li>
              <li><span className="font-medium">Google Drive (read):</span> We access only the specific files you choose to import. We never modify or delete content in your Google Drive.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed font-medium mt-2">Automatically Collected Information:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>Session data and cookies for authentication.</li>
              <li>Browser type, device information, and IP address for security and analytics.</li>
              <li>Usage patterns and feature interactions to improve the Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h3>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Facilitate family and caregiver coordination through shared calendars.</li>
              <li>Send email notifications, including family invitations and weekly summary emails (configurable by users).</li>
              <li>Process AI-powered schedule imports using anonymized or pseudonymized data where possible.</li>
              <li>Ensure security, detect fraud, and prevent abuse.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">4. Information Sharing & Disclosure</h3>
            <p className="text-muted-foreground leading-relaxed">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li><span className="font-medium">Family Members & Caregivers:</span> As directed by you through family group invitations and role-based access controls.</li>
              <li><span className="font-medium">Service Providers:</span> Third-party services that help us operate (e.g., email delivery via SendGrid, AI processing via Google Gemini, file storage, database hosting). These providers are bound by contractual obligations to protect your data.</li>
              <li><span className="font-medium">Legal Requirements:</span> When required by law, subpoena, or government request, or to protect our rights and safety.</li>
              <li><span className="font-medium">Emergency Bridge:</span> Limited information may be shared via time-limited secure links during emergency situations, as configured by authorized family members.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">5. Google API Services — Limited Use Disclosure</h3>
            <p className="text-muted-foreground leading-relaxed">
              Kindora's use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 hover:decoration-primary transition-colors" data-testid="link-google-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>We use Google Calendar and Google Drive data only to provide and improve the features you explicitly connect (showing your calendar in Kindora, syncing events you create in Kindora, and importing Drive files you select).</li>
              <li>We do not transfer or sell this data to third parties, except as needed to provide the Service at your direction, for security, or to comply with applicable law.</li>
              <li>We do not use Google user data for advertising, and we do not allow humans to read it unless we have your consent, it is necessary for security or to comply with law, or the data has been aggregated and anonymized.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">6. Data Security & Family Isolation</h3>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including encrypted connections (TLS/SSL) for all data in transit, secure password hashing (bcrypt), HTTP-only session cookies, rate limiting, and security headers.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Your family's data is isolated from other families. Every request to read or change calendar events, documents, health and symptom data, messages, and other records is checked on the server to confirm you are a member of that specific family, and your role (owner, member, or caregiver) determines what you can see and do. Connected Google accounts are scoped to the individual user who connected them and are never shared with other members. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">7. Data Retention</h3>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service. When you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law. Care documents and medical information will be permanently deleted upon account deletion.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">8. Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1 ml-4">
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent for optional data processing (e.g., weekly summary emails).</li>
              <li>Lodge a complaint with a data protection authority.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at <a href="mailto:privacy@kindora.ai" className="text-primary underline decoration-primary/40 hover:decoration-primary transition-colors" data-testid="link-privacy-email-rights">privacy@kindora.ai</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">9. Cookies & Tracking</h3>
            <p className="text-muted-foreground leading-relaxed">
              We use session cookies to maintain your login state. We do not use third-party advertising cookies or tracking pixels. Session cookies are HTTP-only and expire when you log out or after a period of inactivity.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">10. Children's Privacy</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed at children under 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly. Family members may enter schedule and care information about minors, but this data is managed by the adult account holder.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">11. International Users</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you access the Service from outside the United States, your data may be transferred to and processed in the United States. By using the Service, you consent to this transfer. We endeavor to comply with applicable data protection laws, including GDPR for users in the European Economic Area.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">12. Changes to This Policy</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">13. Contact Us</h3>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or concerns, contact us at:
            </p>
            <div className="text-muted-foreground leading-relaxed ml-4">
              <p>Kindora Family, Inc.</p>
              <p>Email: <a href="mailto:privacy@kindora.ai" className="text-primary underline decoration-primary/40 hover:decoration-primary transition-colors" data-testid="link-privacy-email-contact">privacy@kindora.ai</a></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
