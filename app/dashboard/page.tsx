// app/dashboard/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { getClientData, listClientEmails } from '@/lib/sheets'
import { isAdmin } from '@/lib/admin'
import PatrimoineDashboard from '@/components/PatrimoineDashboard'
import UploadForm from '@/app/admin/videos/UploadForm'
import type { CSSProperties } from 'react'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')

  const admin = isAdmin(session.user.email)

  // Admin « voir l'espace d'un client » : ?client=<email> (validé contre la liste).
  let clients: string[] = []
  let viewedClient: string | null = null
  if (admin) {
    try {
      clients = await listClientEmails()
    } catch {
      clients = []
    }
    const requested = (await searchParams).client?.trim()
    if (requested) {
      viewedClient = clients.find((c) => c.toLowerCase() === requested.toLowerCase()) ?? null
    }
  }

  const effectiveEmail = viewedClient || session.user.email!
  const data = await getClientData(effectiveEmail)
  const displayUser = viewedClient ? { name: viewedClient, email: viewedClient } : session.user

  return (
    <>
      {admin && !viewedClient && (
        <section style={adminStyles.wrapper}>
          <div style={adminStyles.card}>
            <h2 style={adminStyles.title}>Espace administrateur — Déposer une vidéo</h2>
            <UploadForm />
          </div>
        </section>
      )}
      <PatrimoineDashboard
        user={displayUser}
        data={data as any}
        isAdmin={admin}
        clients={clients}
        viewedClient={viewedClient}
      />
    </>
  )
}

const adminStyles: Record<string, CSSProperties> = {
  wrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px 0',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    marginBottom: 32,
    background: '#f1f5ff',
    border: '1px solid #c7d7fe',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 8px 24px rgba(37,99,235,0.08)',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  title: {
    margin: '0 0 16px',
    fontSize: 18,
    fontWeight: 700,
    color: '#1e3a8a',
    letterSpacing: '-0.01em',
  },
}