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
    range: `${email}!A:F`,
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
    return sum + Math.abs(parseFloat(row[3]) || 0)
  }, 0)

  const nbVersements = dataRows.filter(row => parseFloat(row[2]) > 0).length
  const nbRetraits = dataRows.filter(row => Math.abs(parseFloat(row[3]) || 0) > 0).length

  const adresseClient = dataRows[0]?.[4] || ''
  const numRefClient = dataRows[0]?.[5] || ''

  const derniereValeur = releves[releves.length - 1]?.value || 0
  const gainReel = derniereValeur - montantInvesti + montantRetire
  const gainPct = montantInvesti > 0 ? (gainReel / montantInvesti) * 100 : 0

  const premiereValeur = releves[0]?.value || 0
  const avantDernierReleve = releves[releves.length - 2]?.value || premiereValeur
  const gainTrimestre = derniereValeur - avantDernierReleve
  const gainTrimestrePct = avantDernierReleve > 0 ? (gainTrimestre / avantDernierReleve) * 100 : 0
  const dernierTrimestre = releves[releves.length - 1]?.quarter || ''
  const avantDernierTrimestre = releves[releves.length - 2]?.quarter || ''
  
  const capitalNet = montantInvesti - montantRetire

  const dataRowsParsed = dataRows.map(row => ({
    quarter: row[0] || '',
    value: parseFloat(row[1]) || 0,
    versement: parseFloat(row[2]) || 0,
    retrait: Math.abs(parseFloat(row[3]) || 0),
  })).filter(r => r.quarter)

  return {
    releves,
    dataRows: dataRowsParsed,
    montantInvesti,
    montantRetire,
    nbVersements,
    nbRetraits,
    adresseClient,
    numRefClient,
    gainReel,
    gainPct,
    gainTrimestre,
    gainTrimestrePct,
    dernierTrimestre,
    avantDernierTrimestre,
    premiereValeur,
    derniereValeur,
    capitalNet,
  }
}