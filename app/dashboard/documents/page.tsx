// app/dashboard/documents/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import DocumentsPage from '@/components/DocumentsPage'

export default async function Documents() {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')
  return <DocumentsPage user={session.user} />
}