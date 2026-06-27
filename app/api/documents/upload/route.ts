// app/api/documents/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { uploadClientDocument } from '@/lib/documents'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadClientDocument(
      session.user.email!,
      file.name,
      file.type || 'application/octet-stream',
      buffer
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload échoué'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}