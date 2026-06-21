'use client'
import Link from 'next/link'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-amber-400 text-sm mb-6 block">← Back to BrickValue</Link>
        <img src="/brickvalue-wordmark.png" alt="BrickValue" className="h-10 object-contain mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
        <p className="text-white/50 text-sm mb-8">We are here to help</p>

        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Contact Us</h2>
            <p className="text-white/60 text-sm mb-3">Have a question or found a bug? We would love to hear from you.</p>
            <a href="mailto:support@brickvalue.app" className="text-amber-400 font-semibold">support@brickvalue.app</a>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Frequently Asked Questions</h2>
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-white font-medium text-sm">How are SELL/HOLD recommendations calculated?</p>
                <p className="text-white/50 text-sm mt-1">Our recommendations are based on retirement status, market demand, scarcity, liquidity and historical appreciation data for each theme.</p>
              </div>
              <div>
                <p className="text-white font-medium text-sm">How often is pricing data updated?</p>
                <p className="text-white/50 text-sm mt-1">Live eBay AU pricing is fetched in real time when you view a set. BrickLink sold prices are fetched on demand.</p>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Is my portfolio data private?</p>
                <p className="text-white/50 text-sm mt-1">Yes — your portfolio is private and only visible to you. We never share your data with third parties.</p>
              </div>
              <div>
                <p className="text-white font-medium text-sm">How do I delete my account?</p>
                <p className="text-white/50 text-sm mt-1">Email us at support@brickvalue.app and we will delete your account and all associated data within 30 days.</p>
              </div>
              <div>
                <p className="text-white font-medium text-sm">Which LEGO sets are covered?</p>
                <p className="text-white/50 text-sm mt-1">We currently track 1,500+ sets across 20+ themes including Star Wars, Modular, Icons, Ideas, Technic, Speed Champions, Harry Potter, Marvel and more.</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Privacy Policy</h2>
            <p className="text-white/60 text-sm mb-3">Read our full privacy policy to understand how we handle your data.</p>
            <Link href="/privacy" className="text-amber-400 font-semibold text-sm">Read Privacy Policy →</Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/30 text-sm">© 2026 BrickValue. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
