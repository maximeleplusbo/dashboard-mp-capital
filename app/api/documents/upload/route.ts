// app/api/documents/upload/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { uploadClientDocument } from '@/lib/documents'
import { notifyAdminClientUpload } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const clientEmail = session.user.email!

  try {
    await uploadClientDocument(
      clientEmail,
      file.name,
      file.type || 'application/octet-stream',
      buffer
    )
    // Alerte l'admin uniquement quand c'est un vrai client qui dépose
    // (Maxime déposant chez lui ne s'auto-notifie pas). Best-effort.
    if (!isAdmin(clientEmail)) {
      await notifyAdminClientUpload(clientEmail, file.name)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload échoué'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}