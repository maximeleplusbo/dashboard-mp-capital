// components/LogoutButton.tsx
'use client'

import { useState } from 'react'

/**
 * Déconnexion Auth0 v4 : la route /auth/logout est montée par le proxy
 * (proxy.ts -> auth0.middleware), donc navigation pleine page volontaire.
 */
export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [hover, setHover] = useState(false)

  return (
    <a
      href="/auth/logout"
      title="Se déconnecter"
      aria-label="Se déconnecter"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        background: hover ? 'rgba(200,169,110,0.18)' : 'rgba(200,169,110,0.08)',
        border: '0.5px solid rgba(200,169,110,0.3)',
        borderRadius: '10px',
        padding: compact ? '8px 10px' : '8px 14px',
        fontSize: '13px',
        fontWeight: 500,
        color: '#c8a96e',
        textDecoration: 'none',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M5.5 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2.5M9 9.5L11.5 7 9 4.5M11.5 7H5.5"
          stroke="#c8a96e"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && 'Déconnexion'}
    </a>
  )
}
