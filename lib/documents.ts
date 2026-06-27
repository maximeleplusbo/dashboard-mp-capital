// lib/documents.ts
import { getSupabaseAdmin, DOCUMENTS_BUCKET } from '@/lib/supabase'

export interface ClientDocument {
  id: string // chemin complet dans le bucket (unique)
  name: string // nom de fichier affiché (sans le préfixe horodatage)
  mimeType: string
  createdTime: string
  size: string
  url: string // signed URL de téléchargement (temporaire)
  shared?: boolean // true = document commun à tous les clients
}

const SIGNED_URL_TTL = 3600 // 1 h

// Préfixe réservé aux documents communs à tous les clients (présents et futurs).
// Aucune collision possible avec un email (pas de « @ »).
const COMMON_PREFIX = '__shared__'

type StorageObject = {
  name: string
  created_at?: string
  updated_at?: string
  metadata?: { size?: number; mimetype?: string } | null
}

// Les emails sont insensibles à la casse : on normalise le préfixe de stockage
// pour que l'admin (emails du Sheet) et le client (email Auth0) ciblent le même.
function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

function displayName(objectName: string): string {
  // On stocke « {timestamp}-{nom} » ; on retire le préfixe pour l'affichage.
  return objectName.replace(/^\d+-/, '')
}

async function listPrefix(prefix: string): Promise<StorageObject[]> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.storage.from(DOCUMENTS_BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) throw new Error(error.message)
  return (data || []) as StorageObject[]
}

async function mapToDocuments(
  prefix: string,
  objects: StorageObject[],
  shared: boolean
): Promise<ClientDocument[]> {
  const sb = getSupabaseAdmin()
  return Promise.all(
    objects
      .filter((o) => o.name !== '.emptyFolderPlaceholder')
      .map(async (o) => {
        const path = `${prefix}/${o.name}`
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
          shared,
        }
      })
  )
}

/** Documents communs à tous les clients. */
export async function listCommonDocuments(): Promise<ClientDocument[]> {
  return mapToDocuments(COMMON_PREFIX, await listPrefix(COMMON_PREFIX), true)
}

/**
 * Documents visibles par un client = ses documents personnels + les documents
 * communs (présents pour tous, y compris les nouveaux comptes), triés par date.
 */
export async function listClientDocuments(email: string): Promise<ClientDocument[]> {
  const key = emailKey(email)
  const [personal, common] = await Promise.all([
    listPrefix(key).then((objs) => mapToDocuments(key, objs, false)),
    listCommonDocuments(),
  ])
  return [...personal, ...common].sort(
    (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
  )
}

function buildPath(prefix: string, fileName: string): string {
  const safeName = fileName.replace(/[/\\]/g, '_').trim() || 'document'
  return `${prefix}/${Date.now()}-${safeName}`
}

/** Dépose un document dans l'espace d'un client. Renvoie le chemin stocké. */
export async function uploadClientDocument(
  email: string,
  fileName: string,
  mimeType: string,
  body: Buffer
): Promise<string> {
  const sb = getSupabaseAdmin()
  const path = buildPath(emailKey(email), fileName)
  const { error } = await sb.storage.from(DOCUMENTS_BUCKET).upload(path, body, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

/** Dépose un document commun, visible par tous les clients (présents et futurs). */
export async function uploadCommonDocument(
  fileName: string,
  mimeType: string,
  body: Buffer
): Promise<string> {
  const sb = getSupabaseAdmin()
  const path = buildPath(COMMON_PREFIX, fileName)
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
