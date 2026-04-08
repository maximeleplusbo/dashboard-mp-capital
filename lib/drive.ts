// lib/drive.ts
import { google } from 'googleapis'
import { Readable } from 'stream'

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

export async function uploadFileToDrive(
  clientEmail: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
) {
  const folderId = await getOrCreateClientFolder(clientEmail)

  const stream = Readable.from(buffer)

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, createdTime, size',
  })

  return res.data
}

export async function getFileDownloadUrl(fileId: string) {
  const res = await drive.files.get({
    fileId,
    fields: 'webContentLink, name',
  })
  return res.data
}