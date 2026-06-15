// app/api/admin/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { createTusUpload } from '@/lib/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

function dateFrancaise(): string {
  // JJ/MM/AAAA
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Accès réservé à l’administrateur' }, { status: 403 })
  }

  let body: { title?: string; summary?: string; size?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const title =
    body.title && body.title.trim() ? body.title.trim() : `Analyse : ${dateFrancaise()}`
  const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
  const size = typeof body.size === 'number' ? body.size : 0

  if (!size || size <= 0) {
    return NextResponse.json({ error: 'Taille de fichier manquante ou invalide' }, { status: 400 })
  }

  try {
    // Upload tus (résumable) : autorise les fichiers > 200 Mo (jusqu'à ~30 Go).
    const { uploadURL, uid } = await createTusUpload({ title, summary, size })
    // On renvoie le titre/résumé effectifs : Cloudflare écrase meta.name avec
    // le nom du fichier lors de l'upload, le client les réimpose ensuite.
    return NextResponse.json({ uploadURL, uid, title, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
