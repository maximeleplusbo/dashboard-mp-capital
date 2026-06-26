// lib/drive.ts
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/drive',
  ],
})

const drive = google.drive({ version: 'v3', auth })

/**
 * Cherche le dossier d'un client (nommé par son email) sous le dossier racine.
 * IMPORTANT : on IGNORE les dossiers possédés par le compte de service (il n'a
 * pas de quota et ne peut pas stocker de fichiers → ce sont des « fantômes »).
 * On ne garde que les dossiers possédés par le compte qui stocke réellement
 * (contact.oktopus via n8n). Ne crée jamais de dossier. Renvoie null si aucun
 * dossier exploitable n'existe encore (n8n le créera au prochain dépôt).
 */
export async function findClientFolderId(clientEmail: string): Promise<string | null> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

  const res = await drive.files.list({
    q: `name='${clientEmail}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, owners(emailAddress))',
  })

  const folders = res.data.files || []
  const real = folders.find(
    (f) => !(f.owners || []).some((o) => o.emailAddress === serviceEmail)
  )
  return real?.id ?? null
}

export async function listClientFiles(clientEmail: string) {
  const folderId = await findClientFolderId(clientEmail)
  if (!folderId) return []

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, createdTime, size)',
    orderBy: 'createdTime desc',
  })

  return res.data.files || []
}

export async function getFileDownloadUrl(fileId: string) {
  const res = await drive.files.get({
    fileId,
    fields: 'webContentLink, name',
  })
  return res.data
}