// app/api/admin/videos/[uid]/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { deleteVideo, updateVideoMeta } from '@/lib/cloudflare'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/admin/videos/[uid]'>) {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Protection réelle côté serveur : seul un admin peut supprimer.
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Accès réservé à l’administrateur' }, { status: 403 })
  }

  const { uid } = await ctx.params
  if (!uid) {
    return NextResponse.json({ error: 'Identifiant de vidéo manquant' }, { status: 400 })
  }

  try {
    await deleteVideo(uid)
    return NextResponse.json({ success: true, uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/admin/videos/[uid]'>) {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Protection réelle côté serveur : seul un admin peut modifier.
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Accès réservé à l’administrateur' }, { status: 403 })
  }

  const { uid } = await ctx.params
  if (!uid) {
    return NextResponse.json({ error: 'Identifiant de vidéo manquant' }, { status: 400 })
  }

  let body: { title?: string; summary?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'Le titre ne peut pas être vide' }, { status: 400 })
  }
  const summary = typeof body.summary === 'string' ? body.summary.trim() : ''

  try {
    await updateVideoMeta(uid, { title, summary })
    return NextResponse.json({ success: true, uid, title, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
