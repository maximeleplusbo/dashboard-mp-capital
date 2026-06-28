// lib/videoViews.ts
import { getSupabaseAdmin } from '@/lib/supabase'

const BUCKET = 'video-views'

export interface Viewer {
  email: string
  name: string
  watchedAt: string
}

function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

async function readJson<T>(path: string): Promise<T | null> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.storage.from(BUCKET).download(path)
  if (error || !data) return null
  try {
    return JSON.parse(await data.text()) as T
  } catch {
    return null
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const sb = getSupabaseAdmin()
  const body = new Blob([JSON.stringify(value)], { type: 'application/json' })
  await sb.storage.from(BUCKET).upload(path, body, { contentType: 'application/json', upsert: true })
}

/**
 * Enregistre qu'un membre a regardé une vidéo (idempotent : un fichier par
 * couple vidéo/membre, ré-écrit à chaque visionnage). Met aussi à jour un
 * profil membre (email -> nom), utile pour afficher le nom des non-spectateurs.
 */
export async function recordView(uid: string, email: string, name: string): Promise<void> {
  const key = emailKey(email)
  const now = new Date().toISOString()
  const displayName = (name || '').trim() || email

  // On conserve la date du PREMIER visionnage : si un enregistrement existe déjà,
  // on ne réécrit pas le fichier de vue (watchedAt reste la première fois).
  const existing = await readJson<{ watchedAt?: string }>(`views/${uid}/${key}.json`)
  const tasks: Promise<void>[] = [
    writeJson(`members/${key}.json`, { email: key, name: displayName, lastSeen: now }),
  ]
  if (!existing?.watchedAt) {
    tasks.push(writeJson(`views/${uid}/${key}.json`, { email: key, name: displayName, watchedAt: now }))
  }
  await Promise.all(tasks)
}

/** Liste les membres ayant regardé une vidéo (plus récents en premier). */
export async function listWatchers(uid: string): Promise<Viewer[]> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.storage.from(BUCKET).list(`views/${uid}`, { limit: 1000 })
  if (error || !data) return []
  const objs = data.filter((o) => o.name.endsWith('.json'))
  const viewers = await Promise.all(
    objs.map((o) => readJson<Viewer>(`views/${uid}/${o.name}`))
  )
  return viewers
    .filter((v): v is Viewer => !!v)
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
}

/** Nom connu d'un membre (depuis son profil), ou null. */
export async function getMemberName(email: string): Promise<string | null> {
  const profile = await readJson<{ name?: string }>(`members/${emailKey(email)}.json`)
  return profile?.name ?? null
}
