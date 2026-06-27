// lib/documents.ts
import { getSupabaseAdmin, DOCUMENTS_BUCKET } from '@/lib/supabase'

export interface ClientDocument {
  id: string // chemin complet dans le bucket (unique)
  name: string // nom de fichier affiché (sans le préfixe horodatage)
  mimeType: string
  createdTime: string
  size: string
  url: string // signed URL de téléchargement (temporaire)
}

const SIGNED_URL_TTL = 3600 // 1 h

function displayName(objectName: string): string {
  // On stocke « {timestamp}-{nom} » ; on retire le préfixe pour l'affichage.
  return objectName.replace(/^\d+-/, '')
}

/**
 * Liste les documents d'un client (objets sous le préfixe = email), avec une
 * signed URL pour chacun. Le bucket est privé : pas d'accès sans cette URL.
 */
// Les emails sont insensibles à la casse : on normalise le préfixe de stockage
// pour que l'admin (emails du Sheet) et le client (email Auth0) ciblent le même.
function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

export async function listClientDocuments(email: string): Promise<ClientDocument[]> {
  const sb = getSupabaseAdmin()
  const key = emailKey(email)
  const { data, error } = await sb.storage.from(DOCUMENTS_BUCKET).list(key, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) throw new Error(error.message)

  const objects = (data || []).filter((o) => o.name !== '.emptyFolderPlaceholder')

  return Promise.all(
    objects.map(async (o) => {
      const path = `${key}/${o.name}`
      const { data: signed } = await sb.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL)
      const meta = (o.metadata ?? {}) as { size?: number; mimetype?: string }
      return {
        id: path,
        name: displayName(o.name),
        mimeType: meta.mimetype || 'application/octet-stream',
        createdTime: o.created_at || o.updated_at || '',
        size: meta.size != null ? String(meta.size) : '',
        url: signed?.signedUrl || '',
      }
    })
  )
}

/**
 * Dépose un document dans l'espace d'un client. Préfixe horodaté pour éviter
 * les écrasements et garder l'historique. Renvoie le chemin stocké.
 */
export async function uploadClientDocument(
  email: string,
  fileName: string,
  mimeType: string,
  body: Buffer
): Promise<string> {
  const sb = getSupabaseAdmin()
  const safeName = fileName.replace(/[/\\]/g, '_').trim() || 'document'
  const path = `${emailKey(email)}/${Date.now()}-${safeName}`
  const { error } = await sb.storage.from(DOCUMENTS_BUCKET).upload(path, body, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

/** Supprime un document par son chemin complet. */
export async function deleteClientDocument(path: string): Promise<void> {
  const sb = getSupabaseAdmin()
  const { error } = await sb.storage.from(DOCUMENTS_BUCKET).remove([path])
  if (error) throw new Error(error.message)
}
