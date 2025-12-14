import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | SocialClubs',
  description: 'Privacy Policy for SocialClubs platform. Learn how we collect, use, protect, and manage your personal information and data.',
  robots: 'index, follow',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'December 14, 2025'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
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
              Welcome to SocialClubs (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and services (collectively, the &quot;Service&quot;).
            </p>
            <p className="text-foreground/90 leading-relaxed">
              Please read this Privacy Policy carefully. By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Information You Provide to Us</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We collect information that you voluntarily provide when using our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Account Information:</strong> Name, email address, username, password, profile picture, and bio</li>
              <li><strong>Club Information:</strong> Club name, description, images, and other content you create or upload</li>
              <li><strong>User Content:</strong> Posts, comments, messages, photos, videos, and other content you share</li>
              <li><strong>Payment Information:</strong> Billing address and payment card details (processed securely by our payment providers)</li>
              <li><strong>Communication Data:</strong> Correspondence you send to us, including support tickets and feedback</li>
              <li><strong>Profile Data:</strong> Preferences, interests, and settings you configure</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              When you access our Service, we automatically collect certain information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Device Information:</strong> Device type, operating system, browser type, and version</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, links clicked, and features used</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs, and error logs</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address (with your consent for precise location)</li>
              <li><strong>Cookies and Similar Technologies:</strong> Data collected through cookies, web beacons, and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Information from Third Parties</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may receive information about you from third parties:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Social Media:</strong> If you link your social media accounts, we receive profile information</li>
              <li><strong>Payment Processors:</strong> Transaction and payment status information</li>
              <li><strong>Analytics Providers:</strong> Usage statistics and behavioral data</li>
              <li><strong>Other Users:</strong> Information shared by other users about you (e.g., tagging in posts)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 To Provide and Maintain Our Service</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Create and manage your account</li>
              <li>Enable core features and functionality</li>
              <li>Process transactions and payments</li>
              <li>Provide customer support</li>
              <li>Send service-related communications</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 To Improve and Personalize Our Service</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Analyze usage patterns and trends</li>
              <li>Develop new features and improvements</li>
              <li>Personalize content and recommendations</li>
              <li>Optimize user experience</li>
              <li>Conduct research and testing</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 For Safety and Security</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Detect and prevent fraud, abuse, and illegal activities</li>
              <li>Enforce our Terms of Use</li>
              <li>Protect our rights and property</li>
              <li>Monitor and maintain security</li>
              <li>Respond to legal requests and prevent harm</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 For Marketing and Communications</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Send promotional emails and newsletters (with your consent)</li>
              <li>Provide personalized advertising</li>
              <li>Measure advertising effectiveness</li>
              <li>Conduct surveys and gather feedback</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.5 For Legal Compliance</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Comply with legal obligations</li>
              <li>Respond to legal processes</li>
              <li>Establish, exercise, or defend legal claims</li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 With Other Users</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Information you choose to make public (profile, posts, comments) is visible to other users according to your privacy settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 With Service Providers</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We share information with third-party service providers who perform services on our behalf:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Cloud hosting providers (data storage and processing)</li>
              <li>Payment processors (transaction processing)</li>
              <li>Email service providers (communications)</li>
              <li>Analytics providers (usage analysis)</li>
              <li>Customer support tools</li>
              <li>Security and fraud prevention services</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 For Business Transfers</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you before your information is transferred and becomes subject to a different privacy policy.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.4 For Legal Reasons</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas, law enforcement).
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.5 With Your Consent</h3>
            <p className="text-foreground/90 leading-relaxed">
              We may share your information with third parties when you give us your explicit consent to do so.
            </p>
          </section>

          {/* Cookies and Tracking Technologies */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking Technologies</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to track activity on our Service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Essential Cookies:</strong> Required for basic functionality (cannot be disabled)</li>
              <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our Service</li>
              <li><strong>Functional Cookies:</strong> Enable personalized features and remember your preferences</li>
              <li><strong>Targeting Cookies:</strong> Used to deliver relevant advertisements</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Managing Cookies</h3>
            <p className="text-foreground/90 leading-relaxed">
              You can control cookies through your browser settings and our cookie consent tool. Note that disabling certain cookies may impact the functionality of our Service.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
              <li>Incident response procedures</li>
              <li>Regular backups and disaster recovery plans</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Account Data:</strong> Retained while your account is active and for a period after deletion (to comply with legal obligations)</li>
              <li><strong>Transaction Records:</strong> Retained for accounting and tax purposes (typically 7 years)</li>
              <li><strong>Communications:</strong> Retained for customer service and legal purposes</li>
              <li><strong>Analytics Data:</strong> Typically aggregated and anonymized after a certain period</li>
            </ul>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights and Choices</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Access and Portability</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You have the right to access and receive a copy of your personal information in a structured, commonly used format.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Correction and Update</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You can update your account information at any time through your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Deletion</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You can request deletion of your personal information, subject to certain legal exceptions (e.g., transaction records for tax purposes).
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.4 Opt-Out of Marketing</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You can unsubscribe from marketing emails by clicking the unsubscribe link or managing your email preferences in your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.5 Object to Processing</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You may object to certain processing of your personal information, such as for marketing purposes.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.6 Restrict Processing</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You may request that we restrict processing of your information in certain circumstances.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.7 Lodge a Complaint</h3>
            <p className="text-foreground/90 leading-relaxed mb-4">
              You have the right to lodge a complaint with a data protection authority about our collection and use of your personal information.
            </p>

            <p className="text-foreground/90 leading-relaxed mt-6">
              To exercise any of these rights, please contact us using the information provided in the Contact section below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Our Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and become aware that your child has provided us with personal information, please contact us.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              For users between 13 and 18 years of age, we recommend that parents or legal guardians supervise their use of the Service and help them understand our privacy practices.
            </p>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              When we transfer your information internationally, we take appropriate safeguards to ensure that your information remains protected in accordance with this Privacy Policy and applicable laws, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90 mt-4">
              <li>Standard contractual clauses approved by regulatory authorities</li>
              <li>Data processing agreements with service providers</li>
              <li>Compliance with applicable data protection frameworks</li>
            </ul>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Third-Party Links and Services</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Our Service may contain links to third-party websites, applications, or services that are not operated by us. If you click on a third-party link, you will be directed to that third party&apos;s site.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              We strongly advise you to review the privacy policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you are a California resident, you have specific rights regarding your personal information under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li><strong>Right to Know:</strong> You can request information about the categories and specific pieces of personal information we collect</li>
              <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> You can opt-out of the sale of your personal information (we do not sell personal information)</li>
              <li><strong>Right to Non-Discrimination:</strong> You have the right not to receive discriminatory treatment for exercising your CCPA rights</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-4">
              To exercise these rights, please contact us using the information in the Contact section.
            </p>
          </section>

          {/* GDPR Privacy Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. European Privacy Rights (GDPR)</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you are in the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Right of access to your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>Right to restriction of processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Rights related to automated decision-making and profiling</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-4">
              Our legal basis for processing your information includes: consent, contractual necessity, legal obligation, vital interests, and legitimate interests.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to This Privacy Policy</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the &quot;Last Updated&quot; date at the top</li>
              <li>Sending you an email notification for material changes</li>
              <li>Displaying a prominent notice on our Service</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-4">
              We encourage you to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-foreground/90 mb-2">
                <strong>Email:</strong> privacy@socialclubs.com
              </p>
              <p className="text-foreground/90 mb-2">
                <strong>Data Protection Officer:</strong> dpo@socialclubs.com
              </p>
              <p className="text-foreground/90 mb-2">
                <strong>Website:</strong> https://socialclubs.com/contact
              </p>
              <p className="text-foreground/90 mb-2">
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
              <p className="text-foreground/90">
                <strong>Data Subject Requests:</strong> We will respond to your requests within 30 days as required by applicable law
              </p>
            </div>
          </section>

          {/* Effective Date */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Effective Date and Acknowledgment</h2>
            <p className="text-foreground/90 leading-relaxed">
              This Privacy Policy is effective as of {lastUpdated}. By using our Service, you acknowledge that you have read and understood this Privacy Policy and agree to its terms. If you do not agree with this Privacy Policy, please do not use our Service.
            </p>
          </section>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SocialClubs. All rights reserved.</p>
          <p className="mt-2">
            This Privacy Policy is effective as of {lastUpdated}
          </p>
          <div className="mt-4 space-x-4">
            <a href="/terms-of-use" className="hover:text-foreground transition-colors">
              Terms of Use
            </a>
            <span>•</span>
            <a href="/contact" className="hover:text-foreground transition-colors">
              Contact Us
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
