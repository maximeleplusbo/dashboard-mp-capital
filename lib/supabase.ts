// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Client Supabase « admin » (clé secrète / service role) — SERVEUR UNIQUEMENT.
// Ne jamais importer ce module depuis un composant client.
let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    throw new Error(
      'Configuration Supabase manquante : SUPABASE_URL et/ou SUPABASE_SECRET_KEY absents.'
    )
  }
  _client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export const DOCUMENTS_BUCKET = 'documents'
