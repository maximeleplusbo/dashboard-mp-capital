// lib/cloudflare.ts

interface CreateDirectUploadParams {
  title: string
  summary?: string
}

export interface DirectUploadResult {
  uploadURL: string
  uid: string
}

interface CloudflareError {
  code?: number
  message?: string
}

interface CloudflareDirectUploadResponse {
  success: boolean
  errors?: CloudflareError[]
  messages?: unknown[]
  result?: {
    uploadURL: string
    uid: string
  }
}

/**
 * Crée une URL d'upload direct Cloudflare Stream.
 * Le client pourra ensuite envoyer le fichier vidéo directement à `uploadURL`
 * sans passer par notre serveur.
 */
export async function createDirectUpload({
  title,
  summary,
}: CreateDirectUploadParams): Promise<DirectUploadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Configuration Cloudflare manquante : CLOUDFLARE_ACCOUNT_ID et/ou CLOUDFLARE_STREAM_API_TOKEN absents.'
    )
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        meta: {
          name: title,
          summary: summary ?? '',
        },
      }),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  let data: CloudflareDirectUploadResponse | null = null
  try {
    data = (await res.json()) as CloudflareDirectUploadResponse
  } catch {
    data = null
  }

  if (!res.ok || !data?.success || !data.result?.uploadURL || !data.result?.uid) {
    const cloudflareMessage = data?.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join(' ; ')

    throw new Error(
      `Échec de la création de l'upload Cloudflare (HTTP ${res.status})` +
        (cloudflareMessage ? ` : ${cloudflareMessage}` : '')
    )
  }

  return {
    uploadURL: data.result.uploadURL,
    uid: data.result.uid,
  }
}

// Durée maximale autorisée par vidéo (Cloudflare réserve cette durée à la
// création de l'upload). 6 h — largement au-dessus du besoin, ajustable ici.
const MAX_DURATION_SECONDS = 21600

interface CreateTusUploadParams {
  title: string
  summary?: string
  size: number
}

/**
 * Crée un upload Cloudflare Stream via le protocole tus (résumable), nécessaire
 * pour les fichiers > 200 Mo (l'upload "basique" en un POST y est limité).
 * tus supporte jusqu'à ~30 Go par vidéo. Le serveur crée l'upload (le token
 * n'est jamais exposé au client) et renvoie l'URL d'upload tus + l'uid.
 */
export async function createTusUpload({
  title,
  summary,
  size,
}: CreateTusUploadParams): Promise<DirectUploadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Configuration Cloudflare manquante : CLOUDFLARE_ACCOUNT_ID et/ou CLOUDFLARE_STREAM_API_TOKEN absents.'
    )
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('Taille de fichier invalide pour l’upload.')
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`

  // Upload-Metadata : paires « clé base64(valeur) » séparées par des virgules.
  const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')
  const uploadMetadata = [
    `maxDurationSeconds ${b64(String(MAX_DURATION_SECONDS))}`,
    `name ${b64(title)}`,
    `summary ${b64(summary ?? '')}`,
  ].join(',')

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(Math.floor(size)),
        'Upload-Metadata': uploadMetadata,
      },
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  if (res.status !== 201) {
    let detail = ''
    try {
      detail = (await res.text()).slice(0, 300)
    } catch {
      detail = ''
    }
    throw new Error(
      `Échec de la création de l'upload Cloudflare (HTTP ${res.status})` +
        (detail ? ` : ${detail}` : '')
    )
  }

  const uploadURL = res.headers.get('Location') ?? ''
  let uid = res.headers.get('stream-media-id') ?? ''
  // Repli : extraire l'uid (32 hex) de l'URL d'upload si l'en-tête manque.
  if (!uid && uploadURL) {
    const m = uploadURL.match(/[0-9a-f]{32}/i)
    if (m) uid = m[0]
  }

  if (!uploadURL || !uid) {
    throw new Error(
      'Réponse Cloudflare incomplète : en-tête Location ou stream-media-id manquant.'
    )
  }

  return { uploadURL, uid }
}

export interface StreamVideo {
  uid: string
  title: string
  summary: string
  thumbnail: string
  duration: number
  created: string
  ready: boolean
}

interface CloudflareRawVideo {
  uid: string
  thumbnail?: string
  duration?: number
  created?: string
  readyToStream?: boolean
  meta?: { name?: string; summary?: string } | null
}

interface CloudflareListResponse {
  success: boolean
  errors?: CloudflareError[]
  result?: CloudflareRawVideo[]
}

/**
 * Liste les vidéos Cloudflare Stream du compte, nettoyées et triées par date
 * de création décroissante (plus récentes en premier).
 */
export async function listVideos(): Promise<StreamVideo[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Configuration Cloudflare manquante : CLOUDFLARE_ACCOUNT_ID et/ou CLOUDFLARE_STREAM_API_TOKEN absents.'
    )
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  let data: CloudflareListResponse | null = null
  try {
    data = (await res.json()) as CloudflareListResponse
  } catch {
    data = null
  }

  if (!res.ok || !data?.success || !Array.isArray(data.result)) {
    const cloudflareMessage = data?.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join(' ; ')

    throw new Error(
      `Échec de la récupération des vidéos Cloudflare (HTTP ${res.status})` +
        (cloudflareMessage ? ` : ${cloudflareMessage}` : '')
    )
  }

  return data.result
    .map((v) => ({
      uid: v.uid,
      title: v.meta?.name?.trim() || 'Sans titre',
      summary: v.meta?.summary?.trim() || '',
      thumbnail: v.thumbnail || '',
      duration: typeof v.duration === 'number' ? v.duration : 0,
      created: v.created || '',
      ready: v.readyToStream === true,
    }))
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
}

/**
 * URL de lecture d'une vidéo Cloudflare Stream.
 * Point d'isolation unique : pour passer plus tard en lecture par signed URL,
 * il suffira de modifier cette fonction.
 */
export function getPlaybackUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`
}

interface UpdateVideoMetaParams {
  title: string
  summary?: string
}

interface CloudflareSingleVideoResponse {
  success: boolean
  errors?: CloudflareError[]
  result?: CloudflareRawVideo
}

/**
 * Met à jour le titre (meta.name) et le résumé (meta.summary) d'une vidéo
 * Cloudflare Stream sans perdre les autres champs du meta : on récupère
 * d'abord le meta existant, puis on le fusionne avant de renvoyer l'objet
 * meta complet. Ainsi modifier le résumé n'écrase jamais le titre (et inverse).
 */
export async function updateVideoMeta(
  uid: string,
  { title, summary }: UpdateVideoMetaParams
): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Configuration Cloudflare manquante : CLOUDFLARE_ACCOUNT_ID et/ou CLOUDFLARE_STREAM_API_TOKEN absents.'
    )
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`
  const authHeaders = { Authorization: `Bearer ${token}` }

  // 1) Récupère le meta existant pour ne perdre aucun champ.
  let getRes: Response
  try {
    getRes = await fetch(endpoint, { method: 'GET', headers: authHeaders, cache: 'no-store' })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  let getData: CloudflareSingleVideoResponse | null = null
  try {
    getData = (await getRes.json()) as CloudflareSingleVideoResponse
  } catch {
    getData = null
  }

  if (!getRes.ok || !getData?.success) {
    const cloudflareMessage = getData?.errors
      ?.map((e) => e.message)
      .filter(Boolean)
      .join(' ; ')
    throw new Error(
      `Échec de la lecture de la vidéo Cloudflare (HTTP ${getRes.status})` +
        (cloudflareMessage ? ` : ${cloudflareMessage}` : '')
    )
  }

  const existingMeta = getData.result?.meta ?? {}
  const mergedMeta = { ...existingMeta, name: title, summary: summary ?? '' }

  // 2) Envoie la mise à jour avec l'objet meta complet fusionné.
  let postRes: Response
  try {
    postRes = await fetch(endpoint, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta: mergedMeta }),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  if (postRes.ok) return

  let postData: { errors?: CloudflareError[] } | null = null
  try {
    postData = (await postRes.json()) as { errors?: CloudflareError[] }
  } catch {
    postData = null
  }

  const updateMessage = postData?.errors
    ?.map((e) => e.message)
    .filter(Boolean)
    .join(' ; ')

  throw new Error(
    `Échec de la mise à jour de la vidéo Cloudflare (HTTP ${postRes.status})` +
      (updateMessage ? ` : ${updateMessage}` : '')
  )
}

/**
 * Supprime définitivement une vidéo Cloudflare Stream.
 */
export async function deleteVideo(uid: string): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN

  if (!accountId || !token) {
    throw new Error(
      'Configuration Cloudflare manquante : CLOUDFLARE_ACCOUNT_ID et/ou CLOUDFLARE_STREAM_API_TOKEN absents.'
    )
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Impossible de contacter Cloudflare Stream : ${reason}`)
  }

  // Cloudflare renvoie 200 (souvent avec un corps vide) sur suppression réussie.
  if (res.ok) return

  let data: { errors?: CloudflareError[] } | null = null
  try {
    data = (await res.json()) as { errors?: CloudflareError[] }
  } catch {
    data = null
  }

  const cloudflareMessage = data?.errors
    ?.map((e) => e.message)
    .filter(Boolean)
    .join(' ; ')

  throw new Error(
    `Échec de la suppression de la vidéo Cloudflare (HTTP ${res.status})` +
      (cloudflareMessage ? ` : ${cloudflareMessage}` : '')
  )
}
