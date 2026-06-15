// app/videos/page.tsx
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import VideosGallery from './VideosGallery'

export default async function VideosPage() {
  const session = await auth0.getSession()
  // Membre non connecté : on le renvoie au login (pas de 404).
  if (!session) redirect('/auth/login')

  return <VideosGallery />
}
