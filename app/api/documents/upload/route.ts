// app/api/documents/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { uploadFileToDrive } from '@/lib/drive'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await uploadFileToDrive(
    session.user.email!,
    file.name,
    file.type,
    buffer
  )

  return NextResponse.json({ success: true, file: result })
}