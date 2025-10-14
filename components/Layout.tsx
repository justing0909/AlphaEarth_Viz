import Link from 'next/link'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  darkMode?: boolean
}

export default function Layout({ children, darkMode = false }: LayoutProps){
  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    navBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#e8eaed',
    linkHover: darkMode ? '#2a2a2a' : '#f1f3f4',
    accent: '#1967d2'
  }

  return (
    <div style={{
      display:'grid', 
      gridTemplateRows:'auto 1fr', 
      minHeight:'100vh',
      background: theme.bg,
      transition: 'background 0.3s ease'
    }}>
      <nav style={{
        display:'flex', 
        gap: 8, 
        padding: '16px 24px', 
        borderBottom: `1px solid ${theme.border}`,
        background: theme.navBg,
        transition: 'all 0.3s ease',
        justifyContent: 'center'
      }}>
        {[
          { href: '/', label: 'Overview' },
          { href: '/conceptual', label: 'Class Analysis' },
          { href: '/geo', label: 'Geographic' },
          { href: '/chat', label: 'Chat' }
        ].map(({ href, label }) => (
          <Link 
            key={href}
            href={href}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              textDecoration: 'none',
              color: theme.textPrimary,
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s ease',
              letterSpacing: '0.2px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.linkHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main style={{padding: 0}}>{children}</main>
    </div>
  )
}