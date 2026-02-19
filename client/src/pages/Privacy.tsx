import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570]">
      <Helmet>
        <title>Privacy Policy - Kindora</title>
        <meta name="description" content="Learn how Kindora collects, uses, and protects your personal and family data. Our Privacy Policy covers data security, retention, cookies, and your rights." />
        <meta property="og:title" content="Privacy Policy - Kindora" />
        <meta property="og:description" content="Learn how Kindora protects your personal and family data. Read our Privacy Policy." />
        <meta property="og:url" content="https://calendora.replit.app/privacy" />
        <link rel="canonical" href="https://calendora.replit.app/privacy" />
      </Helmet>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/70 hover-elevate" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-white font-['Space_Grotesk']">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-md p-6 md:p-10 text-white/90 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-2" data-testid="text-privacy-title">Privacy Policy</h2>
            <p className="text-white/60 text-sm">Last updated: February 19, 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">1. Introduction</h3>
            <p className="text-white/80 leading-relaxed">
              Kindora Family, Inc. ("Kindora," "we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Kindora application and related services (the "Service"). By using the Service, you consent to the practices described in this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">2. Information We Collect</h3>
            <p className="text-white/80 leading-relaxed font-medium">Account Information:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Name, email address, and profile picture (when provided or obtained via Google sign-in).</li>
              <li>Authentication credentials (passwords are hashed and never stored in plain text).</li>
            </ul>
            <p className="text-white/80 leading-relaxed font-medium mt-2">Family & Care Data:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Calendar events, schedules, and recurring event patterns.</li>
              <li>Medication names, dosages, schedules, and administration logs.</li>
              <li>Care documents uploaded to the Care Documentation Vault.</li>
              <li>Caregiver time entries, pay rates, and invoicing data.</li>
              <li>Family messages and event notes.</li>
            </ul>
            <p className="text-white/80 leading-relaxed font-medium mt-2">Automatically Collected Information:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Session data and cookies for authentication.</li>
              <li>Browser type, device information, and IP address for security and analytics.</li>
              <li>Usage patterns and feature interactions to improve the Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">3. How We Use Your Information</h3>
            <p className="text-white/80 leading-relaxed">We use your information to:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Facilitate family and caregiver coordination through shared calendars.</li>
              <li>Send email notifications, including family invitations and weekly summary emails (configurable by users).</li>
              <li>Process AI-powered schedule imports using anonymized or pseudonymized data where possible.</li>
              <li>Ensure security, detect fraud, and prevent abuse.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">4. Information Sharing & Disclosure</h3>
            <p className="text-white/80 leading-relaxed">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li><span className="font-medium">Family Members & Caregivers:</span> As directed by you through family group invitations and role-based access controls.</li>
              <li><span className="font-medium">Service Providers:</span> Third-party services that help us operate (e.g., email delivery via SendGrid, AI processing via Google Gemini, file storage, database hosting). These providers are bound by contractual obligations to protect your data.</li>
              <li><span className="font-medium">Legal Requirements:</span> When required by law, subpoena, or government request, or to protect our rights and safety.</li>
              <li><span className="font-medium">Emergency Bridge:</span> Limited information may be shared via time-limited secure links during emergency situations, as configured by authorized family members.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">5. Data Security</h3>
            <p className="text-white/80 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encrypted connections (TLS/SSL), secure password hashing (bcrypt), HTTP-only session cookies, rate limiting, and security headers. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">6. Data Retention</h3>
            <p className="text-white/80 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service. When you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law. Care documents and medical information will be permanently deleted upon account deletion.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">7. Your Rights</h3>
            <p className="text-white/80 leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent for optional data processing (e.g., weekly summary emails).</li>
              <li>Lodge a complaint with a data protection authority.</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-2">
              To exercise these rights, contact us at <a href="mailto:privacy@kindora.ai" className="text-white underline decoration-white/40 hover:decoration-white transition-colors" data-testid="link-privacy-email-rights">privacy@kindora.ai</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">8. Cookies & Tracking</h3>
            <p className="text-white/80 leading-relaxed">
              We use session cookies to maintain your login state. We do not use third-party advertising cookies or tracking pixels. Session cookies are HTTP-only and expire when you log out or after a period of inactivity.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">9. Children's Privacy</h3>
            <p className="text-white/80 leading-relaxed">
              The Service is not directed at children under 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly. Family members may enter schedule and care information about minors, but this data is managed by the adult account holder.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">10. International Users</h3>
            <p className="text-white/80 leading-relaxed">
              If you access the Service from outside the United States, your data may be transferred to and processed in the United States. By using the Service, you consent to this transfer. We endeavor to comply with applicable data protection laws, including GDPR for users in the European Economic Area.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">11. Changes to This Policy</h3>
            <p className="text-white/80 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">12. Contact Us</h3>
            <p className="text-white/80 leading-relaxed">
              For privacy-related questions or concerns, contact us at:
            </p>
            <div className="text-white/80 leading-relaxed ml-4">
              <p>Kindora Family, Inc.</p>
              <p>Email: <a href="mailto:privacy@kindora.ai" className="text-white underline decoration-white/40 hover:decoration-white transition-colors" data-testid="link-privacy-email-contact">privacy@kindora.ai</a></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
