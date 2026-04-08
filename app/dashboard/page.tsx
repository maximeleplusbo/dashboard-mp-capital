// app/dashboard/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import PatrimoineDashboard from '@/components/PatrimoineDashboard'

export default async function DashboardPage() {
  const session = await auth0.getSession()
  if (!session) redirect('/auth/login')
  return <PatrimoineDashboard user={session.user} />
}