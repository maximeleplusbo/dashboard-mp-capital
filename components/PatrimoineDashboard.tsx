// components/PatrimoineDashboard.tsx
'use client'

import dynamic from 'next/dynamic'

const PatrimoineChart = dynamic(() => import('./PatrimoineChart'), { ssr: false })

const RELEVES = [
  { quarter: 'T4 2022', value: 100000 },
  { quarter: 'T1 2023', value: 104500 },
  { quarter: 'T2 2023', value: 109200 },
  { quarter: 'T3 2023', value: 108800 },
  { quarter: 'T4 2023', value: 115600 },
  { quarter: 'T1 2024', value: 121000 },
  { quarter: 'T2 2024', value: 128400 },
  { quarter: 'T3 2024', value: 133200 },
  { quarter: 'T4 2024', value: 141800 },
  { quarter: 'T1 2025', value: 147320 },
]

const MONTANT_INVESTI = 124500
const MONTANT_RETIRE  = 8000
const NB_VERSEMENTS   = 5
const NB_RETRAITS     = 2

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export default function PatrimoineDashboard({ user }: { user: { name?: string, email?: string } }) {
  const last    = RELEVES[RELEVES.length - 1]
  const first   = RELEVES[0]
  const perfPct = (((last.value - first.value) / first.value) * 100).toFixed(1)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Topbar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8a96e' }}>
          MP Capital
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(232,234,240,0.5)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #1a2a4a, #2a3a6a)', border: '1px solid rgba(200,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: '#c8a96e' }}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
         <span>{user.name}</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: '32px 28px' }}>
<p style={{ fontSize: '13px', color: 'rgba(232,234,240,0.4)', letterSpacing: '0.04em', marginBottom: '4px' }}>Bonjour, {user.name}</p>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', marginBottom: '28px' }}>Mon espace investisseur</h1>

        {/* KPI patrimoine */}
        <div style={{ position: 'relative', background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #c8a96e, #e8c98e)' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,234,240,0.4)', marginBottom: '10px' }}>Valeur du patrimoine</p>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#c8a96e', letterSpacing: '-0.02em', marginBottom: '8px' }}>{fmt(last.value)}</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.2)' }}>
            ▲ +{perfPct}% depuis le début
          </span>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)', marginTop: '8px' }}>Dernier relevé : {last.quarter}</p>
        </div>

        {/* Graphique */}
        <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#e8eaf0' }}>Évolution du patrimoine</p>
            <p style={{ fontSize: '11px', color: 'rgba(200,169,110,0.6)' }}>← Glisser pour naviguer</p>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(232,234,240,0.35)', marginBottom: '16px' }}>10 derniers relevés trimestriels</p>
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
            <p style={{ fontSize: '11px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>{NB_VERSEMENTS} versements cumulés</p>
          </div>
          <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px 22px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M2 7l5 5 5-5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(232,234,240,0.4)', marginBottom: '8px' }}>Montant total retiré</p>
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', letterSpacing: '-0.02em' }}>{fmt(MONTANT_RETIRE)}</p>
            <p style={{ fontSize: '11px', color: 'rgba(232,234,240,0.3)', marginTop: '4px' }}>{NB_RETRAITS} retraits effectués</p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(232,234,240,0.2)', marginTop: '24px', letterSpacing: '0.04em' }}>
          Données mises à jour chaque trimestre par MP Capital
        </p>
      </main>
    </div>
  )
}