// app/api/videos/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listVideos } from '@/lib/cloudflare'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Tout membre connecté est autorisé (pas besoin d'être admin).
  // Le flag isAdmin sert uniquement au front pour décider d'afficher ou non
  // le bouton supprimer ; la liste des vidéos est identique pour tous.
  const admin = isAdmin(session.user.email)
  try {
    const videos = await listVideos()
    return NextResponse.json({ videos, isAdmin: admin })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
