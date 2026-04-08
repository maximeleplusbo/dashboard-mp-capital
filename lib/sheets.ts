// lib/sheets.ts
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

export async function getClientData(email: string) {
  const sheets = google.sheets({ version: 'v4', auth })
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${email}!A:D`,
  })

  const rows = response.data.values
  if (!rows || rows.length < 2) return null

  const dataRows = rows.slice(1)

  const releves = dataRows.map(row => ({
    quarter: row[0] || '',
    value: parseFloat(row[1]) || 0,
  })).filter(r => r.quarter && r.value)

  const montantInvesti = dataRows.reduce((sum, row) => {
    return sum + (parseFloat(row[2]) || 0)
  }, 0)

  const montantRetire = dataRows.reduce((sum, row) => {
    return sum + (parseFloat(row[3]) || 0)
  }, 0)

  const nbVersements = dataRows.filter(row => parseFloat(row[2]) > 0).length
  const nbRetraits = dataRows.filter(row => parseFloat(row[3]) > 0).length

  return {
    releves,
    montantInvesti,
    montantRetire,
    nbVersements,
    nbRetraits,
  }
}