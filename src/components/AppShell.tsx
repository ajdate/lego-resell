'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/', label: 'Search' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/watchlist', label: 'Watchlist' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/tools', label: 'Tools' },
  ]

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0a0a]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[44px] min-h-[44px] justify-center text-xs ${
                pathname === item.href ? 'text-amber-400' : 'text-white/40'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
