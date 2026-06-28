// app/api/admin/videos/[uid]/views/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listClientEmails } from '@/lib/sheets'
import { listWatchers, getMemberName } from '@/lib/videoViews'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/admin/videos/[uid]/views'>) {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Accès réservé à l’administrateur' }, { status: 403 })
  }

  const { uid } = await ctx.params
  if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

  try {
    const watchers = await listWatchers(uid)
    const watchedKeys = new Set(watchers.map((w) => w.email.toLowerCase()))

    // Clients (hors admin) qui n'ont pas encore regardé.
    const clients = (await listClientEmails()).filter((c) => !isAdmin(c))
    const notWatchedEmails = clients.filter((c) => !watchedKeys.has(c.toLowerCase()))
    const notWatched = await Promise.all(
      notWatchedEmails.map(async (email) => ({
        email,
        name: (await getMemberName(email)) || '',
      }))
    )

    return NextResponse.json({ watched: watchers, notWatched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
