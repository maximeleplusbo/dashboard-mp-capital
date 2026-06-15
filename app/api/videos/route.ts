// app/api/videos/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listVideos } from '@/lib/cloudflare'
import { NextResponse } from 'next/server'

export async function GET() {
  // Accès public : aucune session requise pour consulter la galerie.
  // Si une session admin existe, on renvoie isAdmin=true pour afficher les
  // actions d'édition/suppression ; sinon false. La liste est identique pour tous.
  const session = await auth0.getSession()
  const admin = session ? isAdmin(session.user.email) : false
  try {
    const videos = await listVideos()
    return NextResponse.json({ videos, isAdmin: admin })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
