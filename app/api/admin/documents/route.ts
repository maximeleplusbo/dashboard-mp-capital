// app/api/admin/documents/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listClientEmails } from '@/lib/sheets'
import { findClientFolderId } from '@/lib/drive'
import { NextRequest, NextResponse } from 'next/server'

// Même webhook que l'upload client : le compte de service Google n'a pas de
// quota de stockage et ne peut pas écrire de fichier, donc on délègue l'écriture
// Drive à n8n (qui utilise un vrai compte OAuth disposant d'un quota).
const N8N_UPLOAD_WEBHOOK = 'https://automations.mailcaptain.io/webhook/mp-capital-upload'

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
  const all = formData.get('all') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  // Détermine les destinataires et valide les emails contre la liste réelle des
  // clients (évite la création de dossiers Drive arbitraires).
  let recipients: string[]
  try {
    const clients = await listClientEmails()
    if (all) {
      recipients = clients
    } else {
      if (!target) {
        return NextResponse.json({ error: 'Aucun client sélectionné' }, { status: 400 })
      }
      if (!clients.includes(target)) {
        return NextResponse.json({ error: 'Client inconnu' }, { status: 400 })
      }
      recipients = [target]
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun client destinataire' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const fileName = file.name
  const mimeType = file.type || 'application/octet-stream'

  // Dépose le document dans le dossier Drive d'un client via le webhook n8n.
  // On ne transmet le folderId que s'il existe un vrai dossier (possédé par
  // contact.oktopus) ; sinon n8n crée le dossier par email.
  async function depositForClient(clientEmail: string): Promise<void> {
    const folderId = await findClientFolderId(clientEmail)
    const payload: Record<string, string> = {
      fileName,
      mimeType,
      fileData: base64,
      clientEmail,
      clientName: clientEmail,
    }
    if (folderId) payload.folderId = folderId

    const res = await fetch(N8N_UPLOAD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`Dépôt échoué pour ${clientEmail} (HTTP ${res.status})`)
    }
  }

  const results = await Promise.allSettled(recipients.map((email) => depositForClient(email)))

  const count = results.filter((r) => r.status === 'fulfilled').length
  const failed = recipients.length - count

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

  return NextResponse.json({ success: true, count, failed, total: recipients.length })
}
