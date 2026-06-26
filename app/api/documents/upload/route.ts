// app/api/documents/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { findClientFolderId } from '@/lib/drive'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  // On ne transmet le folderId que s'il existe un vrai dossier (possédé par
  // contact.oktopus) ; sinon n8n crée le dossier par email. Le compte de service
  // ne crée plus de dossier fantôme.
  const folderId = await findClientFolderId(session.user.email!)

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  console.log('Sending to n8n, folderId:', folderId)

  const payload: Record<string, string> = {
    fileName: file.name,
    mimeType: file.type,
    fileData: base64,
    clientEmail: session.user.email ?? '',
    clientName: session.user.name ?? '',
  }
  if (folderId) payload.folderId = folderId

  const res = await fetch('https://automations.mailcaptain.io/webhook/mp-capital-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  console.log('n8n status:', res.status)
  const responseText = await res.text()
  console.log('n8n response:', responseText)

  if (!res.ok) return NextResponse.json({ error: 'Upload echoue' }, { status: 500 })

  return NextResponse.json({ success: true })
}