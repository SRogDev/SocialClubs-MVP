import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use | SocialClubs',
  description: 'Terms of Use and Terms of Service for SocialClubs platform. Read our terms and conditions for using our social club management service.',
  robots: 'index, follow',
}

export default function TermsOfUsePage() {
  const lastUpdated = 'December 14, 2025'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Terms of Use</h1>
          <p className="text-muted-foreground">
            Last Updated: <time dateTime="2025-12-14">{lastUpdated}</time>
          </p>
        </header>

        {/* Content */}
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Welcome to SocialClubs (&quot;Platform&quot;, &quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms of Use (&quot;Terms&quot;) govern your access to and use of the SocialClubs platform, including our website, mobile applications, and any related services.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service. These Terms constitute a legally binding agreement between you and SocialClubs.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Acceptance of Terms</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              By creating an account, accessing, or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You must be at least 13 years old to use SocialClubs. If you are under 18 years old, you may only use the Service with the involvement and consent of a parent or legal guardian. By using the Service, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>You meet the minimum age requirement</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You will provide accurate and complete information during registration</li>
              <li>You will maintain the accuracy of your information</li>
              <li>You are not prohibited from using the Service under applicable laws</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Accounts</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Account Creation</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              To access certain features of the Service, you must create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Account Security</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Use a strong and unique password</li>
              <li>Not share your account credentials with others</li>
              <li>Notify us immediately of any unauthorized access or security breach</li>
              <li>Log out from your account at the end of each session</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Account Termination</h3>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including violation of these Terms. You may also delete your account at any time through your account settings.
            </p>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Your Content</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You retain all rights to content you submit, post, or display on or through the Service (&quot;User Content&quot;). By posting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content in connection with providing and promoting the Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Content Standards</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You agree that your User Content will not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Contain hate speech, harassment, or discrimination</li>
              <li>Include explicit, violent, or offensive material</li>
              <li>Promote illegal activities or harm to individuals or groups</li>
              <li>Contain spam, malware, or malicious code</li>
              <li>Impersonate any person or entity</li>
              <li>Violate the privacy rights of others</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Content Moderation</h3>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right, but have no obligation, to monitor, review, and remove User Content that violates these Terms or is otherwise objectionable. We may take action against users who repeatedly violate our content policies.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Activities</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Copying, distributing, or disclosing any part of the Service without authorization</li>
              <li>Using any automated system to access the Service (bots, scrapers, etc.)</li>
              <li>Attempting to gain unauthorized access to any portion of the Service</li>
              <li>Interfering with or disrupting the Service or servers</li>
              <li>Reverse engineering or attempting to extract source code</li>
              <li>Transmitting viruses, malware, or other malicious code</li>
              <li>Collecting or harvesting user information without consent</li>
              <li>Using the Service for any illegal or unauthorized purpose</li>
              <li>Circumventing any security features or access controls</li>
              <li>Engaging in any activity that could harm minors</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Our Property</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              The Service and its original content (excluding User Content), features, and functionality are owned by SocialClubs and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Our trademarks and trade dress may not be used without our prior written consent.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.2 DMCA Policy</h3>
            <p className="text-foreground/90 leading-relaxed">
              We respect the intellectual property rights of others and expect users to do the same. If you believe that content on our Service infringes your copyright, please contact us with detailed information including the copyrighted work, the allegedly infringing content, and your contact information.
            </p>
          </section>

          {/* Club Management */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Club Creation and Management</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Club Ownership</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Users who create clubs (&quot;Club Creators&quot;) have administrative control over their clubs. Club Creators are responsible for managing their club&apos;s content, members, and activities in accordance with these Terms.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Club Responsibilities</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Club Creators and administrators must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Ensure club content complies with these Terms</li>
              <li>Moderate club activities and member behavior</li>
              <li>Respect member privacy and data protection laws</li>
              <li>Not use clubs for illegal or harmful purposes</li>
              <li>Handle member disputes professionally and fairly</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Club Termination</h3>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to remove or restrict access to any club that violates these Terms or poses risks to users or the platform. Club Creators may delete their clubs at any time, which will permanently remove all club content and member associations.
            </p>
          </section>

          {/* Payments and Subscriptions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Payments and Subscriptions</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">9.1 Paid Services</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Some features of the Service may require payment. By purchasing a subscription or paid feature, you agree to pay all fees and charges associated with your purchase. All fees are non-refundable unless otherwise stated or required by law.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 Subscriptions</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Subscription fees are billed in advance on a recurring basis (monthly or annually). Your subscription will automatically renew unless you cancel before the renewal date. You can manage your subscription through your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.3 Price Changes</h3>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to change our pricing at any time. Price changes will not affect your current subscription period but will apply upon renewal. We will provide at least 30 days notice of any price increases.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimers</h2>
            <p className="text-foreground/90 leading-relaxed mb-4 uppercase font-semibold">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p className="text-foreground/90 leading-relaxed mb-4">
              To the fullest extent permitted by law, we disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>The results obtained from using the Service will be accurate or reliable</li>
              <li>Any errors in the Service will be corrected</li>
              <li>The Service will meet your requirements or expectations</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-foreground/90 leading-relaxed mb-4 uppercase font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SOCIALCLUBS, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              This includes, without limitation, loss of profits, data, use, goodwill, or other intangible losses resulting from: (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; or (iv) unauthorized access, use, or alteration of your transmissions or content.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
            <p className="text-foreground/90 leading-relaxed">
              You agree to defend, indemnify, and hold harmless SocialClubs and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney&apos;s fees) arising from: (i) your use of and access to the Service; (ii) your violation of these Terms; (iii) your violation of any third-party right, including without limitation any copyright, property, or privacy right; or (iv) any claim that your User Content caused damage to a third party.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law and Dispute Resolution</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">13.1 Governing Law</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SocialClubs operates, without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">13.2 Dispute Resolution</h3>
            <p className="text-foreground/90 leading-relaxed">
              Any disputes arising out of or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiations. If negotiations fail, disputes shall be resolved through binding arbitration in accordance with the rules of the applicable arbitration association, unless otherwise required by law.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
            <p className="text-foreground/90 leading-relaxed">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-foreground/90 mb-2">
                <strong>Email:</strong> legal@socialclubs.com
              </p>
              <p className="text-foreground/90 mb-2">
                <strong>Website:</strong> https://socialclubs.com/contact
              </p>
              <p className="text-foreground/90">
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
            </div>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Entire Agreement</h2>
            <p className="text-foreground/90 leading-relaxed">
              These Terms, together with our Privacy Policy and any other legal notices published by us on the Service, shall constitute the entire agreement between you and SocialClubs concerning the Service. If any provision of these Terms is deemed invalid by a court of competent jurisdiction, the invalidity of such provision shall not affect the validity of the remaining provisions, which shall remain in full force and effect.
            </p>
          </section>

          {/* Waiver */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Waiver</h2>
            <p className="text-foreground/90 leading-relaxed">
              No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term, and our failure to assert any right or provision under these Terms shall not constitute a waiver of such right or provision.
            </p>
          </section>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SocialClubs. All rights reserved.</p>
          <p className="mt-2">
            These Terms of Use are effective as of {lastUpdated}
          </p>
        </footer>
      </div>
    </div>
  )
}
