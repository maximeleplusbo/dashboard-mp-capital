// app/api/rapport/route.ts
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

  const payload = {
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
  }

  return NextResponse.json(payload)
}