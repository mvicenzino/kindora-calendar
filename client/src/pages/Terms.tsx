import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570]">
      <Helmet>
        <title>Terms of Service - Kindora</title>
        <meta name="description" content="Read the Kindora Terms of Service. Understand the rules and guidelines for using the Kindora family calendar and caregiving coordination platform." />
        <meta property="og:title" content="Terms of Service - Kindora" />
        <meta property="og:description" content="Read the Kindora Terms of Service for the family calendar and caregiving coordination platform." />
        <meta property="og:url" content="https://calendora.replit.app/terms" />
        <link rel="canonical" href="https://calendora.replit.app/terms" />
      </Helmet>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/70 hover-elevate" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-white font-['Space_Grotesk']">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-md p-6 md:p-10 text-white/90 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white font-['Space_Grotesk'] mb-2" data-testid="text-terms-title">Terms of Service</h2>
            <p className="text-white/60 text-sm">Last updated: February 19, 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">1. Acceptance of Terms</h3>
            <p className="text-white/80 leading-relaxed">
              By accessing or using Kindora ("the Service"), operated by Kindora Family, Inc. ("we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. We may update these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">2. Description of Service</h3>
            <p className="text-white/80 leading-relaxed">
              Kindora is a family calendar and caregiving coordination platform designed to help families, caregivers, and healthcare providers manage schedules, medical appointments, medications, care documentation, and related activities. The Service is provided on an "as-is" basis and is not a substitute for professional medical or legal advice.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">3. Account Registration</h3>
            <p className="text-white/80 leading-relaxed">
              To use certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">4. User Responsibilities</h3>
            <p className="text-white/80 leading-relaxed">You agree to:</p>
            <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-1 ml-4">
              <li>Use the Service only for lawful purposes and in accordance with these Terms.</li>
              <li>Ensure that any information you enter (including medical, financial, and personal data) is accurate and that you have the right to share it.</li>
              <li>Not use the Service to harass, abuse, or harm others.</li>
              <li>Not attempt to gain unauthorized access to any part of the Service.</li>
              <li>Not use automated means (bots, scrapers) to access the Service without our written consent.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">5. Family & Caregiver Access</h3>
            <p className="text-white/80 leading-relaxed">
              The Service allows you to invite family members and caregivers to share calendar access and care information. By inviting others, you acknowledge that they will be able to view and interact with shared data according to their assigned roles. You are responsible for managing access permissions within your family groups.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">6. Health & Medical Information</h3>
            <p className="text-white/80 leading-relaxed">
              Kindora may store health-related information such as medication schedules, medical appointments, and care notes. This information is provided by users for coordination purposes only. Kindora is not a medical device, does not provide medical advice, and is not subject to HIPAA unless a separate Business Associate Agreement is executed. Always consult qualified healthcare providers for medical decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">7. Intellectual Property</h3>
            <p className="text-white/80 leading-relaxed">
              The Service and its original content, features, and functionality are owned by Kindora Family, Inc. and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of content you submit but grant us a limited license to use, store, and display it as needed to provide the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">8. Third-Party Services</h3>
            <p className="text-white/80 leading-relaxed">
              The Service may integrate with third-party services (e.g., Google Drive, email providers, AI services). Your use of these integrations is subject to the respective third-party terms and privacy policies. We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">9. Limitation of Liability</h3>
            <p className="text-white/80 leading-relaxed">
              To the fullest extent permitted by law, Kindora Family, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claims arising from these Terms shall not exceed the amount you have paid us in the twelve (12) months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">10. Disclaimer of Warranties</h3>
            <p className="text-white/80 leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">11. Termination</h3>
            <p className="text-white/80 leading-relaxed">
              We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately, and we may delete your data in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">12. Governing Law</h3>
            <p className="text-white/80 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Delaware.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-white">13. Contact</h3>
            <p className="text-white/80 leading-relaxed">
              If you have questions about these Terms, please contact us at <a href="mailto:support@kindora.ai" className="text-white underline decoration-white/40 hover:decoration-white transition-colors" data-testid="link-terms-email">support@kindora.ai</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
