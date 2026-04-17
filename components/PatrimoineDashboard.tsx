// components/PatrimoineDashboard.tsx
'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const PatrimoineChart = dynamic(() => import('./PatrimoineChart'), { ssr: false })

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

type ClientData = {
  releves: { quarter: string; value: number }[]
  montantInvesti: number
  montantRetire: number
  nbVersements: number
  nbRetraits: number
  adresseClient: string
  numRefClient: string
  gainReel: number
  gainPct: number
  gainTrimestre: number
  gainTrimestrePct: number
  dernierTrimestre: string
  avantDernierTrimestre: string
  premiereValeur: number
  derniereValeur: number
  dataRows: { quarter: string; value: number; versement: number; retrait: number }[]
} | null

function HistoriquePerformances({ releves, dataRows }: { releves: { quarter: string; value: number }[], dataRows: { quarter: string; value: number; versement: number; retrait: number }[] }) {
  console.log('HistoriquePerformances rendered, releves:', releves.length, 'dataRows:', dataRows.length)
  console.log('dataRows sample:', JSON.stringify(dataRows.slice(0, 3)))
  console.log('releves sample:', JSON.stringify(releves.slice(0, 3)))
  const [visibleCount, setVisibleCount] = useState(20)

  const dataByQuarter = new Map(dataRows.map(d => [d.quarter, d]))

  const performances = releves.map((r, i) => {
    const cloture = r.value
    const row = dataByQuarter.get(r.quarter)
    const versement = row?.versement || 0
    const retrait = row?.retrait || 0
    if (i === 0) {
      const pct = versement > 0 ? ((cloture - versement) / versement) * 100 : null
      console.log('perf calc (first):', r.quarter, cloture, versement, pct)
      return { quarter: r.quarter, pct }
    }
    const ouverture = releves[i - 1].value
    const pct = ouverture > 0 ? ((cloture - ouverture - versement + retrait) / ouverture) * 100 : 0
    console.log('perf calc:', r.quarter, ouverture, cloture, versement, retrait, pct)
    return { quarter: r.quarter, pct }
  }).reverse()

  const visible = performances.slice(0, visibleCount)
  const hasMore = visibleCount < performances.length

  return (
    <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#e8eaf0', marginBottom: '16px' }}>Historique des performances</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,234,240,0.4)', padding: '0 0 10px 0' }}>Trimestre</th>
            <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,234,240,0.4)', padding: '0 0 10px 0' }}>Performance</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.quarter} style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              <td style={{ padding: '10px 0', fontSize: '13px', color: '#e8eaf0' }}>{row.quarter}</td>
              <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: 500, textAlign: 'right', color: row.pct === null ? 'rgba(232,234,240,0.3)' : row.pct >= 0 ? '#4ade80' : '#f87171' }}>
                {row.pct === null ? '—' : `${row.pct >= 0 ? '+' : ''}${row.pct.toFixed(2)} %`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          style={{ display: 'block', width: '100%', marginTop: '14px', padding: '10px', background: 'rgba(200,169,110,0.08)', border: '0.5px solid rgba(200,169,110,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: 500, color: '#c8a96e', cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          Charger plus
        </button>
      )}
    </div>
  )
}

function NewDocsIndicator() {
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/documents')
        const data = await res.json()
        const files = data.files || []
        if (files.length === 0) return
        const seen = JSON.parse(localStorage.getItem('seen_docs') || '[]')
        const hasUnseen = files.some((f: { id: string }) => !seen.includes(f.id))
        setHasNew(hasUnseen)
      } catch {
        // silently fail
      }
    }
    check()
  }, [])

  if (!hasNew) return null

  return (
    <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0d0f14' }} />
  )
}

export default function PatrimoineDashboard({ user, data }: {
  user: { name?: string, email?: string },
  data: ClientData
}) {
  const RELEVES = data?.releves || []
  const MONTANT_INVESTI = data?.montantInvesti || 0
  const MONTANT_RETIRE = data?.montantRetire || 0
  const NB_VERSEMENTS = data?.nbVersements || 0
  const NB_RETRAITS = data?.nbRetraits || 0

  const last = RELEVES[RELEVES.length - 1]
  const first = RELEVES[0]
  
  const [rapportLoading, setRapportLoading] = useState(false)
  
  const gainEur = data?.gainReel || 0
  const gainPct = data?.gainPct || 0

  console.log('RELEVES length:', RELEVES.length)
  console.log('RELEVES for chart:', RELEVES.length, JSON.stringify(RELEVES))
  console.log('data?.releves:', data?.releves)

  return (
  <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    {/* Topbar */}
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <img 
  src="https://framerusercontent.com/images/5OUDwHm9zVSVlHsm0LE0jEts.png?width=512&height=117" 
  alt="MP Capital" 
  style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)' }} 
/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(232,234,240,0.5)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a2a4a, #2a3a6a)', border: '1px solid rgba(200,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: '#c8a96e' }}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <span>{user.name}</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
      <button
  onClick={async () => {
    setRapportLoading(true)
    try {
      const res = await fetch('/api/rapport/generate')
      if (!res.ok) throw new Error('Erreur')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rapport-trimestriel.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors de la génération du rapport')
    } finally {
      setRapportLoading(false)
    }
  }}
  disabled={rapportLoading}
  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,169,110,0.08)', border: '0.5px solid rgba(200,169,110,0.3)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 500, color: '#c8a96e', cursor: rapportLoading ? 'not-allowed' : 'pointer', opacity: rapportLoading ? 0.6 : 1, letterSpacing: '0.02em' }}>
  {rapportLoading ? (
    <>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="7" cy="7" r="5" stroke="#c8a96e" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10"/>
      </svg>
      Génération...
    </>
  ) : (
    <>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v7M4 6l3 3 3-3M2 11h10" stroke="#c8a96e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Rapport trimestriel
    </>
  )}
</button>

          <Link href="/dashboard/documents" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,169,110,0.08)', border: '0.5px solid rgba(200,169,110,0.3)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 500, color: '#c8a96e', textDecoration: 'none', letterSpacing: '0.02em' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M2 7h10M2 10.5h6" stroke="#c8a96e" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Mes documents
            <NewDocsIndicator />
          </Link>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(232,234,240,0.4)', letterSpacing: '0.04em', marginBottom: '4px' }}>Bonjour, {user.name}</p>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', marginBottom: '28px' }}>Mon espace investisseur</h1>

        {/* KPI patrimoine */}
        <div style={{ position: 'relative', background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #c8a96e, #e8c98e)' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,234,240,0.4)', marginBottom: '10px' }}>Valeur du patrimoine</p>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#c8a96e', letterSpacing: '-0.02em', marginBottom: '8px' }}>{last ? fmt(last.value) : '—'}</p>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>Dernier relevé : {last?.quarter}</p>
        </div>

        {/* Gains / Pertes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: gainEur >= 0 ? '#4ade80' : '#f87171' }} />
            <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,234,240,0.4)', marginBottom: '10px' }}>Gains / Pertes</p>
            <p style={{ fontSize: '24px', fontWeight: 500, color: gainEur >= 0 ? '#4ade80' : '#f87171', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              {gainEur >= 0 ? '+' : ''}{fmt(gainEur)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>Dernier relevé : {last?.quarter}</p>
          </div>
          <div style={{ position: 'relative', background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: gainPct >= 0 ? '#4ade80' : '#f87171' }} />
            <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,234,240,0.4)', marginBottom: '10px' }}>Performance</p>
            <p style={{ fontSize: '24px', fontWeight: 500, color: gainPct >= 0 ? '#4ade80' : '#f87171', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>Dernier relevé : {last?.quarter}</p>
          </div>
        </div>

        {/* Graphique */}
        <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#e8eaf0' }}>Evolution du patrimoine</p>
            <p style={{ fontSize: '11px', color: 'rgba(200,169,110,0.6)' }}>{"<- Glisser pour naviguer"}</p>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.35)', marginBottom: '16px' }}>10 derniers releves trimestriels</p>
          <div style={{ height: '200px' }}>
            <PatrimoineChart data={RELEVES} />
          </div>
        </div>

        <HistoriquePerformances releves={RELEVES} dataRows={data?.dataRows || []} />

        {/* Indicateurs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7l5-5 5 5" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,234,240,0.4)', marginBottom: '8px' }}>Montant total investi</p>
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', letterSpacing: '-0.02em' }}>{fmt(MONTANT_INVESTI)}</p>
            <p style={{ fontSize: '11px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>{NB_VERSEMENTS} versements cumules</p>
          </div>
          <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M2 7l5 5 5-5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,234,240,0.4)', marginBottom: '8px' }}>Montant total retire</p>
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', letterSpacing: '-0.02em' }}>{fmt(MONTANT_RETIRE)}</p>
            <p style={{ fontSize: '11px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>{NB_RETRAITS} retraits effectues</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(232,234,240,0.2)', marginTop: '24px', letterSpacing: '0.04em' }}>
          Donnees mises a jour chaque trimestre par MP Capital
        </p>
        <Link href="/dashboard/documents" style={{ display: 'block', textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#c8a96e', textDecoration: 'none' }}>
          Mes documents →
        </Link>
      </main>
    </div>
  )
}