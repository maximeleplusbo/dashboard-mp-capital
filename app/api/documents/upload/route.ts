// app/api/documents/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { getOrCreateClientFolder } from '@/lib/drive'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const folderId = await getOrCreateClientFolder(session.user.email!)

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  console.log('Sending to n8n, folderId:', folderId)

  const res = await fetch('https://automations.mailcaptain.io/webhook/mp-capital-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileData: base64,
      folderId: folderId,
      clientEmail: session.user.email,
      clientName: session.user.name,
    }),
  })

  console.log('n8n status:', res.status)
  const responseText = await res.text()
  console.log('n8n response:', responseText)

  if (!res.ok) return NextResponse.json({ error: 'Upload echoue' }, { status: 500 })

  return NextResponse.json({ success: true })
}