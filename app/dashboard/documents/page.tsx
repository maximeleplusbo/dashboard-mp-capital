// app/dashboard/documents/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { listClientEmails } from '@/lib/sheets'
import DocumentsPage from '@/components/DocumentsPage'

export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')

  const admin = isAdmin(session.user.email)

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

  const displayUser = viewedClient ? { name: viewedClient, email: viewedClient } : session.user

  return (
    <DocumentsPage
      user={displayUser}
      isAdmin={admin}
      clients={clients}
      viewedClient={viewedClient}
    />
  )
}