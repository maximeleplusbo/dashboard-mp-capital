// app/api/rapport/generate/route.ts
import { auth0 } from '@/lib/auth0'
import { getClientData } from '@/lib/sheets'
import { NextResponse } from 'next/server'

interface ClientDataRow {
  quarter: string
  value: number
  versement: number
  retrait: number
}

function cell(text: string, bg: string, bold = false, color = '000000', w = '1800') {
  return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' +
    '<w:shd w:val="clear" w:color="auto" w:fill="' + bg + '"/>' +
    '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>' +
    '</w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr>' +
    (bold ? '<w:b/>' : '') +
    '<w:color w:val="' + color + '"/><w:sz w:val="18"/><w:szCs w:val="18"/>' +
    '</w:rPr><w:t>' + text + '</w:t></w:r></w:p></w:tc>'
}

function generateTableauXml(
  releves: { quarter: string; value: number }[],
  dataRows: { quarter: string; value: number; versement: number; retrait: number }[],
  fmt: (n: number) => string
): string {
  if (!releves || releves.length < 2) return ''

  const GOLD = 'C8A96E'
  const BLACK = '000000'
  const WHITE = 'FFFFFF'
  const LIGHT = 'F5F5F5'

  const dataByQuarter = new Map((dataRows || []).map(d => [d.quarter, d]))

  const lignes = []
  for (let i = 0; i < releves.length; i++) {
    const cloture = releves[i].value
    const row = dataByQuarter.get(releves[i].quarter)
    const versement = row?.versement || 0
    const retrait = row?.retrait || 0
    let ouverture: number
    let gain: number
    let perf: number
    if (i === 0) {
      ouverture = versement
      gain = cloture - versement
      perf = versement > 0 ? (gain / versement) * 100 : 0
    } else {
      ouverture = releves[i - 1].value
      gain = cloture - ouverture - versement + retrait
      perf = ouverture > 0 ? (gain / ouverture) * 100 : 0
    }
    const gainStr = (gain >= 0 ? '+ ' : '- ') + fmt(Math.abs(gain)) + ' \u20ac'
    const perfStr = (perf >= 0 ? '+ ' : '- ') + Math.abs(perf).toFixed(2) + ' %'
    const bg = i % 2 === 0 ? LIGHT : WHITE
    const gainColor = gain >= 0 ? '16A34A' : 'DC2626'
    lignes.push({ quarter: releves[i].quarter, ouverture, cloture, gainStr, perfStr, bg, gainColor })
  }

  const headers = ['P\u00e9riode', 'Valeur d\'ouverture', 'Valeur de cl\u00f4ture', 'Gain / Perte (\u20ac)', 'Performance (%)']
  const headerRow = '<w:tr>' + headers.map(h => cell(h, BLACK, true, GOLD)).join('') + '</w:tr>'

  const tableRows = lignes.map(l =>
    '<w:tr>' +
    cell(l.quarter, l.bg, false, BLACK) +
    cell(fmt(l.ouverture) + ' \u20ac', l.bg, false, BLACK) +
    cell(fmt(l.cloture) + ' \u20ac', l.bg, false, BLACK) +
    cell(l.gainStr, l.bg, true, l.gainColor) +
    cell(l.perfStr, l.bg, true, l.gainColor) +
    '</w:tr>'
  ).join('')

  return '<w:tbl>' +
    '<w:tblPr><w:tblW w:w="9000" w:type="dxa"/>' +
    '<w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="' + GOLD + '"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="' + GOLD + '"/>' +
    '<w:insideH w:val="single" w:sz="2" w:space="0" w:color="DDDDDD"/>' +
    '</w:tblBorders></w:tblPr>' +
    '<w:tblGrid>' +
    '<w:gridCol w:w="1800"/><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/>' +
    '</w:tblGrid>' +
    headerRow + tableRows + '</w:tbl>'
}

function generateTableauMouvementsXml(
  dataRows: { quarter: string; value: number; versement: number; retrait: number }[],
  fmt: (n: number) => string
): string {
  if (!dataRows || dataRows.length === 0) return ''

  const GOLD = 'C8A96E'
  const BLACK = '000000'
  const WHITE = 'FFFFFF'
  const LIGHT = 'F5F5F5'

  const mouvements: { quarter: string; type: string; montant: number }[] = []
  for (const row of dataRows) {
    if (row.versement > 0) {
      mouvements.push({ quarter: row.quarter, type: 'Versement', montant: row.versement })
    }
    if (Math.abs(row.retrait) > 0) {
      mouvements.push({ quarter: row.quarter, type: 'Retrait', montant: Math.abs(row.retrait) })
    }
  }

  const headers = ['Trimestre', 'Type', 'Montant']
  const headerRow = '<w:tr>' + headers.map(h => cell(h, BLACK, true, GOLD, '3000')).join('') + '</w:tr>'

  const tableRows = mouvements.map((m, i) => {
    const bg = i % 2 === 0 ? LIGHT : WHITE
    return '<w:tr>' +
      cell(m.quarter, bg, false, BLACK, '3000') +
      cell(m.type, bg, false, BLACK, '3000') +
      cell(fmt(m.montant) + ' \u20ac', bg, false, BLACK, '3000') +
      '</w:tr>'
  }).join('')

  return '<w:tbl>' +
    '<w:tblPr><w:tblW w:w="9000" w:type="dxa"/>' +
    '<w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="' + GOLD + '"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="' + GOLD + '"/>' +
    '<w:insideH w:val="single" w:sz="2" w:space="0" w:color="DDDDDD"/>' +
    '</w:tblBorders></w:tblPr>' +
    '<w:tblGrid>' +
    '<w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/>' +
    '</w:tblGrid>' +
    headerRow + tableRows + '</w:tbl>'
}

export async function GET() {
  try {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rawData = await getClientData(session.user.email!)
  if (!rawData) return NextResponse.json({ error: 'Aucune donnée' }, { status: 404 })
  const data = rawData as unknown as {
    releves: { quarter: string; value: number }[]
    dataRows: ClientDataRow[]
    montantInvesti: number
    montantRetire: number
    derniereValeur: number
    gainReel: number
    gainPct: number
    gainTrimestre: number
    gainTrimestrePct: number
    dernierTrimestre: string
    adresseClient: string
    numRefClient: string
  }
  console.log('data received, releves:', data.releves?.length, 'dataRows:', data.dataRows?.length)

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const dernierReleve = data.releves[data.releves.length - 1]
  const avantDernierReleve = data.releves[data.releves.length - 2]
  const premierReleve = data.releves[0]

  const replacements: Record<string, string> = {
    TRIMESTRE_EN_COURS: data.dernierTrimestre,
    PERIODE_TRIMESTRE: data.dernierTrimestre,
    NOM_CLIENT: session.user.name || session.user.email || '',
    ADRESSE_CLIENT: data.adresseClient,
    NUM_REF_CLIENT: data.numRefClient,
    DATE_ENTRE_FOND: premierReleve?.quarter || '',
    MONTANT_INVEST: fmt(data.montantInvesti),
    VALEUR_PORTEFEUILLE: fmt(data.derniereValeur),
    PLUS_VALUE_LATENTE: (data.gainReel >= 0 ? '+ ' : '- ') + fmt(Math.abs(data.gainReel)),
    PERFORMANCE_GLOBALE: (data.gainPct >= 0 ? '+ ' : '- ') + Math.abs(data.gainPct).toFixed(2) + ' %',
    VALEUR_OUVERTURE_TRIM: fmt(avantDernierReleve?.value || premierReleve?.value || 0),
    VALEUR_CLOTURE_TRIM: fmt(dernierReleve?.value || 0),
    GAIN_TRIM_EUR: (data.gainTrimestre >= 0 ? '+ ' : '- ') + fmt(Math.abs(data.gainTrimestre)),
    GAIN_TRIM_PCT: (data.gainTrimestrePct >= 0 ? '+ ' : '- ') + Math.abs(data.gainTrimestrePct).toFixed(2) + ' %',
    VALEUR_OUVERTURE_DEBUT: fmt(premierReleve?.value || 0),
    GAIN_DEBUT_EUR: (data.gainReel >= 0 ? '+ ' : '- ') + fmt(Math.abs(data.gainReel)),
    GAIN_DEBUT_PCT: (data.gainPct >= 0 ? '+ ' : '- ') + Math.abs(data.gainPct).toFixed(2) + ' %',
DATEDUJOUR: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  }

  const templateUrl = process.env.RAPPORT_TEMPLATE_URL!
  const templateRes = await fetch(templateUrl)
  console.log('template status:', templateRes.status)
  const templateBuffer = await templateRes.arrayBuffer()

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(templateBuffer)
  console.log('zip files:', Object.keys(zip.files).join(', '))

  const filesToProcess = Object.keys(zip.files).filter(name =>
    name.startsWith('word/') && name.endsWith('.xml')
  )

  for (const fileName of filesToProcess) {
    const xmlFile = zip.file(fileName)
    if (!xmlFile) continue
    let xml = await xmlFile.async('string')
    for (const [key, value] of Object.entries(replacements)) {
      xml = xml.split('{{' + key + '}}').join(value)
    }
    console.log('Processing file:', fileName, '| contains TABLEAU_PERFORMANCE:', xml.includes('{{TABLEAU_PERFORMANCE}}'), '| contains TABLEAU_MOUVEMENTS:', xml.includes('{{TABLEAU_MOUVEMENTS}}'))
    if (xml.includes('{{TABLEAU_PERFORMANCE}}')) {
      const tableXml = generateTableauXml(data.releves, data.dataRows || [], fmt)
      console.log('tableXml preview:', tableXml.substring(0, 100))
      console.log('tableXml length:', tableXml.length)
      xml = xml.split('{{TABLEAU_PERFORMANCE}}').join(tableXml)
      console.log('after replace, still contains TABLEAU_PERFORMANCE:', xml.includes('{{TABLEAU_PERFORMANCE}}'))
    }
    if (xml.includes('{{TABLEAU_MOUVEMENTS}}')) {
      const mouvXml = generateTableauMouvementsXml(data.dataRows || [], fmt)
      console.log('mouvXml preview:', mouvXml.substring(0, 100))
      console.log('mouvXml length:', mouvXml.length)
      xml = xml.split('{{TABLEAU_MOUVEMENTS}}').join(mouvXml)
      console.log('after replace, still contains TABLEAU_MOUVEMENTS:', xml.includes('{{TABLEAU_MOUVEMENTS}}'))
    }
    zip.file(fileName, xml)
  }
  console.log('Files processed:', filesToProcess.join(', '))

  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  console.log('buffer size:', outputBuffer.length)

  const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.CLOUDCONVERT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'upload-file': { operation: 'import/upload' },
        'convert-file': {
          operation: 'convert',
          input: 'upload-file',
          input_format: 'docx',
          output_format: 'pdf',
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file',
        }
      }
    })
  })

  const job = await jobRes.json()
  console.log('CC job full:', JSON.stringify(job))

  if (!job.data || !job.data.tasks) {
    return NextResponse.json({ error: 'CloudConvert error', details: job }, { status: 500 })
  }

  const uploadTask = job.data.tasks.find((t: { name: string }) => t.name === 'upload-file')
  const uploadForm = uploadTask.result.form

  const formData = new FormData()
  for (const [k, v] of Object.entries(uploadForm.parameters as Record<string, string>)) {
    formData.append(k, v)
  }
  formData.append('file', new Blob([new Uint8Array(outputBuffer)]), 'rapport.docx')

  await fetch(uploadForm.url, { method: 'POST', body: formData })

  let pdfUrl = ''
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch('https://api.cloudconvert.com/v2/jobs/' + job.data.id, {
      headers: { 'Authorization': 'Bearer ' + process.env.CLOUDCONVERT_API_KEY }
    })
    const status = await statusRes.json()
    const exportTask = status.data.tasks.find((t: { name: string }) => t.name === 'export-file')
    if (exportTask?.status === 'finished') {
      pdfUrl = exportTask.result.files[0].url
      break
    }
    if (status.data.status === 'error') {
      console.log('CC error:', JSON.stringify(status).substring(0, 500))
      break
    }
  }

  if (!pdfUrl) return NextResponse.json({ error: 'Conversion echouee' }, { status: 500 })

  const pdfRes = await fetch(pdfUrl)
  const pdfBuffer = await pdfRes.arrayBuffer()

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="rapport-' + data.dernierTrimestre.replace(' ', '-') + '.pdf"',
    }
  })
  } catch (error) {
    console.error('FULL ERROR:', error instanceof Error ? error.message : String(error))
    console.error('FULL STACK:', error instanceof Error ? error.stack : 'no stack')
    return NextResponse.json({ error: 'Erreur interne', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}