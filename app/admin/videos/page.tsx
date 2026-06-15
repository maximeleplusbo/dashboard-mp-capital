// app/admin/videos/page.tsx
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { notFound } from 'next/navigation'
import UploadForm from './UploadForm'

export default async function AdminVideosPage() {
  const session = await auth0.getSession()

  // Non connecté ou non-admin : on renvoie une 404 pour ne pas révéler
  // l'existence de la page.
  if (!session || !isAdmin(session.user.email)) {
    notFound()
  }

  return <UploadForm />
}
