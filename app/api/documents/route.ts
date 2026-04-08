// app/api/documents/route.ts
import { auth0 } from '@/lib/auth0'
import { listClientFiles } from '@/lib/drive'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const files = await listClientFiles(session.user.email!)
  return NextResponse.json({ files })
}