// app/api/documents/route.ts
import { auth0 } from '@/lib/auth0'
import { isAdmin } from '@/lib/admin'
import { listClientDocuments } from '@/lib/documents'
import { listClientEmails } from '@/lib/sheets'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Par défaut : ses propres documents. Un admin peut consulter ceux d'un client
  // précis via ?client=<email> (validé contre la liste réelle des clients).
  let email = session.user.email!
  const requested = request.nextUrl.searchParams.get('client')?.trim()
  if (requested && isAdmin(session.user.email)) {
    try {
      const clients = await listClientEmails()
      const match = clients.find((c) => c.toLowerCase() === requested.toLowerCase())
      if (match) email = match
    } catch {
      /* on retombe sur l'email de session */
    }
  }

  const files = await listClientDocuments(email)
  return NextResponse.json({ files })
}