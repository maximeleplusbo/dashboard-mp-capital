// app/api/rapport/generate/route.ts
import { auth0 } from '@/lib/auth0'
import { getClientData } from '@/lib/sheets'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth0.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const data = await getClientData(session.user.email!)
  if (!data) return NextResponse.json({ error: 'Aucune donnée' }, { status: 404 })

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
  const templateBuffer = await templateRes.arrayBuffer()

  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(templateBuffer)

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
    zip.file(fileName, xml)
  }

  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' })

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
  console.log('CC job:', JSON.stringify(job).substring(0, 500))

  if (!job.data || !job.data.tasks) {
    return NextResponse.json({ error: 'CloudConvert error', details: job }, { status: 500 })
  }

  const uploadTask = job.data.tasks.find((t: { name: string }) => t.name === 'upload-file')
  const uploadForm = uploadTask.result.form

  const formData = new FormData()
  for (const [k, v] of Object.entries(uploadForm.parameters as Record<string, string>)) {
    formData.append(k, v)
  }
  formData.append('file', new Blob([outputBuffer.buffer]), 'rapport.docx')

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
}