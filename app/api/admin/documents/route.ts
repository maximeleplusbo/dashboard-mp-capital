// app/api/admin/documents/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listClientEmails } from '@/lib/sheets'
import { uploadClientDocument, uploadCommonDocument } from '@/lib/documents'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Accès réservé à l’administrateur' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const target = ((formData.get('client') as string | null) ?? '').trim()
  // « all » = document commun à tous les clients, présents ET futurs.
  const shared = formData.get('all') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name
  const mimeType = file.type || 'application/octet-stream'

  // Document commun : stocké une seule fois dans l'espace partagé, fusionné
  // automatiquement dans « Mes documents » de chaque client (présent ou futur).
  if (shared) {
    try {
      await uploadCommonDocument(fileName, mimeType, buffer)
      return NextResponse.json({ success: true, shared: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec du dépôt du document commun'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  // Sinon : dépôt pour un client précis (validé contre la liste réelle).
  if (!target) {
    return NextResponse.json({ error: 'Aucun client sélectionné' }, { status: 400 })
  }
  try {
    const clients = await listClientEmails()
    if (!clients.includes(target)) {
      return NextResponse.json({ error: 'Client inconnu' }, { status: 400 })
    }
    await uploadClientDocument(target, fileName, mimeType, buffer)
    return NextResponse.json({ success: true, shared: false, count: 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Échec du dépôt du document'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
