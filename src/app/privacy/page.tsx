'use client'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-amber-400 text-sm mb-6 block">← Back to BrickValue</Link>
          <img src="/brickvalue-wordmark.png" alt="BrickValue" className="h-10 object-contain mb-6" />
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/50 text-sm">Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-white/80 leading-relaxed">
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>BrickValue (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the BrickValue application and website (brickvalue.app).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li><strong className="text-white">Account Information:</strong> When you create an account, we collect your email address and name via Clerk authentication.</li>
              <li><strong className="text-white">Portfolio Data:</strong> LEGO sets you add to your portfolio, including purchase prices, conditions, and investment intent.</li>
              <li><strong className="text-white">Watchlist Data:</strong> Sets you add to your watchlist and price targets.</li>
              <li><strong className="text-white">Usage Data:</strong> How you interact with the app, including searches and features used.</li>
              <li><strong className="text-white">Device Information:</strong> Device type, operating system, and browser type for app optimisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>To provide and improve the BrickValue service</li>
              <li>To sync your portfolio and watchlist across devices</li>
              <li>To generate personalised SELL/HOLD recommendations</li>
              <li>To send you alerts about your portfolio sets</li>
              <li>To communicate important updates about the service</li>
              <li>To analyse usage patterns and improve the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Storage</h2>
            <p className="mb-3">Your data is stored securely using the following services:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li><strong className="text-white">Supabase:</strong> Portfolio and watchlist data is stored in Supabase&apos;s secure PostgreSQL database hosted in Singapore.</li>
              <li><strong className="text-white">Clerk:</strong> Authentication and account information is managed by Clerk.</li>
              <li><strong className="text-white">Local Storage:</strong> Some data may be cached locally on your device for performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Third Party Services</h2>
            <p className="mb-3">BrickValue uses the following third party services:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li><strong className="text-white">eBay API:</strong> To fetch live marketplace pricing data. We do not share your personal data with eBay.</li>
              <li><strong className="text-white">BrickLink API:</strong> To fetch sold price data. We do not share your personal data with BrickLink.</li>
              <li><strong className="text-white">Anthropic Claude API:</strong> To generate AI-powered marketplace listings. Listing generation requests are processed but not stored by Anthropic.</li>
              <li><strong className="text-white">Google Sign In:</strong> Optional authentication via your Google account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data Sharing</h2>
            <p>We do not sell, trade, or share your personal information with third parties for marketing purposes. We may share anonymised, aggregated data for analytics purposes. We may disclose your information if required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days. Anonymised usage data may be retained for analytics purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-white/70">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your portfolio data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>BrickValue is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Security</h2>
            <p>We implement industry-standard security measures to protect your data including encrypted connections (HTTPS), secure authentication via Clerk, and row-level security on our database. However no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of BrickValue after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or your data, please contact us at:</p>
            <div className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-amber-400 font-semibold">BrickValue</p>
              <p className="text-white/60 text-sm mt-1">Email: privacy@brickvalue.app</p>
              <p className="text-white/60 text-sm">Website: brickvalue.app</p>
              <p className="text-white/60 text-sm">Location: Melbourne, Victoria, Australia</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/30 text-sm">© 2026 BrickValue. All rights reserved.</p>
          <Link href="/" className="text-amber-400 text-sm mt-2 block">Back to BrickValue</Link>
        </div>

      </div>
    </div>
  )
}
