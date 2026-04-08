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
} | null

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
  const perfPct = last && first ? (((last.value - first.value) / first.value) * 100).toFixed(1) : '0'

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Topbar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <img 
  src="https://framerusercontent.com/images/5OUDwHm9zVSVlHsm0LE0jEts.png?width=512&height=117" 
  alt="MP Capital" 
  style={{ height: '28px', width: 'auto' }} 
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

        {/* Bouton documents */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.2)' }}>
            ▲ +{perfPct}% depuis le début
          </span>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)', marginTop: '8px' }}>Dernier relevé : {last?.quarter}</p>
        </div>

        {/* Graphique */}
        <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#e8eaf0' }}>Evolution du patrimoine</p>
            <p style={{ fontSize: '11px', color: 'rgba(200,169,110,0.6)' }}>{"<- Glisser pour naviguer"}</p>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.35)', marginBottom: '16px' }}>10 derniers releves trimestriels</p>
          <PatrimoineChart data={RELEVES} />
        </div>

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
        <Link href="/dashboard/documents" style={{ display: 'block', textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#c8a96e', textDecoration: 'none' }}>
          Mes documents →
        </Link>

      </main>
    </div>
  )
}