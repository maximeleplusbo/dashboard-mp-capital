// app/dashboard/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { getClientData } from '@/lib/sheets'
import PatrimoineDashboard from '@/components/PatrimoineDashboard'

export default async function DashboardPage() {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')

  const data = await getClientData(session.user.email!)

  return <PatrimoineDashboard user={session.user} data={data} />
}