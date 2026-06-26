'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/', label: 'Search', emoji: '🔍' },
  { href: '/portfolio', label: 'Portfolio', emoji: '📊' },
  { href: '/watchlist', label: 'Watchlist', emoji: '👀' },
  { href: '/alerts', label: 'Alerts', emoji: '🔔' },
  { href: '/tools', label: 'Tools', emoji: '🔧' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      <div style={{ paddingBottom: '64px' }}>
        {children}
      </div>
      <nav 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 100,
          backgroundColor: '#0a0a0a',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '4px 12px',
                minWidth: '44px',
                minHeight: '44px',
                justifyContent: 'center',
                color: pathname === item.href ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                fontSize: '10px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
