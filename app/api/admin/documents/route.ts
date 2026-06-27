// app/api/admin/documents/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listClientEmails } from '@/lib/sheets'
import { uploadClientDocument, uploadCommonDocument } from '@/lib/documents'
import { notifyNewDocument } from '@/lib/email'
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
  // future = commun à tous (présents ET futurs) ; members = copie chez tous les
  // clients actuels uniquement. future a priorité s'il est coché.
  const future = formData.get('future') === 'true'
  const members = formData.get('members') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name
  const mimeType = file.type || 'application/octet-stream'

  // 1) Commun présents + futurs : stocké une seule fois dans l'espace partagé.
  if (future) {
    try {
      await uploadCommonDocument(fileName, mimeType, buffer)
      // Notifie les clients actuels (hors admin) ; les futurs verront le doc
      // dans leur espace à leur création.
      try {
        const clients = (await listClientEmails()).filter((c) => !isAdmin(c))
        await notifyNewDocument(clients)
      } catch {
        /* notification best-effort */
      }
      return NextResponse.json({ success: true, mode: 'future' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec du dépôt du document commun'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  // 2) Tous les clients actuels (hors admin) : une copie dans chaque dossier.
  if (members) {
    let clients: string[]
    try {
      clients = (await listClientEmails()).filter((c) => !isAdmin(c))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      return NextResponse.json({ error: message }, { status: 502 })
    }
    if (clients.length === 0) {
      return NextResponse.json({ error: 'Aucun client destinataire' }, { status: 400 })
    }
    const results = await Promise.allSettled(
      clients.map((email) => uploadClientDocument(email, fileName, mimeType, buffer))
    )
    const count = results.filter((r) => r.status === 'fulfilled').length
    const failed = clients.length - count
    if (count === 0) {
      const firstError = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined
      const reason =
        firstError && firstError.reason instanceof Error
          ? firstError.reason.message
          : 'Échec du dépôt du document'
      return NextResponse.json({ error: reason }, { status: 502 })
    }
    await notifyNewDocument(clients)
    return NextResponse.json({ success: true, mode: 'members', count, failed, total: clients.length })
  }

  // 3) Un client précis (validé contre la liste réelle).
  if (!target) {
    return NextResponse.json({ error: 'Aucun client sélectionné' }, { status: 400 })
  }
  try {
    const clients = await listClientEmails()
    if (!clients.includes(target)) {
      return NextResponse.json({ error: 'Client inconnu' }, { status: 400 })
    }
    await uploadClientDocument(target, fileName, mimeType, buffer)
    await notifyNewDocument([target])
    return NextResponse.json({ success: true, mode: 'client', count: 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Échec du dépôt du document'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
