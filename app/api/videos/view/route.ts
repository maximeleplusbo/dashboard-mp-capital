// app/api/videos/view/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { recordView } from '@/lib/videoViews'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // La page /videos est publique : un visiteur anonyme n'est pas suivi.
  const session = await auth0.getSession()
  if (!session?.user?.email) return NextResponse.json({ tracked: false })

  // On ne compte pas l'admin (Maxime) comme spectateur.
  if (isAdmin(session.user.email)) return NextResponse.json({ tracked: false })

  let uid = ''
  try {
    uid = ((await request.json())?.uid ?? '').trim()
  } catch {
    uid = ''
  }
  if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

  try {
    await recordView(uid, session.user.email, session.user.name || '')
  } catch {
    /* best-effort : ne bloque jamais la lecture */
  }
  return NextResponse.json({ tracked: true })
}
