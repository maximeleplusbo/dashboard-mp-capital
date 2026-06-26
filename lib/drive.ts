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
 * Cherche le dossier d'un client (nommé par son email) sous le dossier racine,
 * et le crée s'il n'existe pas. Le compte de service peut créer un dossier
 * (0 octet, pas de quota requis) ; n8n (contact.oktopus) y écrit ensuite les
 * fichiers, qui restent visibles par le compte de service (vérifié).
 */
export async function getOrCreateClientFolder(clientEmail: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!

  const res = await drive.files.list({
    q: `name='${clientEmail}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name: clientEmail,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  })

  return folder.data.id!
}

export async function listClientFiles(clientEmail: string) {
  const folderId = await getOrCreateClientFolder(clientEmail)

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