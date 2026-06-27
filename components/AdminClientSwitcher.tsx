'use client'

import { useRouter, usePathname } from 'next/navigation'

// Sélecteur admin : permet de consulter le dashboard / les documents d'un client
// précis, exactement comme ce client les voit. Réservé à l'admin.
export default function AdminClientSwitcher({
  clients,
  current,
}: {
  clients: string[]
  current: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <select
      value={current ?? ''}
      onChange={(e) => {
        const v = e.target.value
        router.push(v ? `${pathname}?client=${encodeURIComponent(v)}` : pathname)
      }}
      title="Voir l'espace d'un client"
      style={{
        background: current ? 'rgba(200,169,110,0.18)' : 'rgba(255,255,255,0.05)',
        color: '#c8a96e',
        border: '0.5px solid rgba(200,169,110,0.4)',
        borderRadius: 8,
        padding: '7px 10px',
        fontSize: 12,
        fontWeight: 500,
        maxWidth: 210,
        cursor: 'pointer',
        outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      <option value="">Mon espace (admin)</option>
      {clients.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}
