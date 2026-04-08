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

export default function PatrimoineDashboard() {
  const last    = RELEVES[RELEVES.length - 1]
  const first   = RELEVES[0]
  const perfPct = (((last.value - first.value) / first.value) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0]">
      {/* Topbar */}
      <header className="flex items-center justify-between px-7 py-[18px] border-b border-white/[0.08]">
        <span className="text-[15px] font-medium tracking-[0.12em] uppercase text-[#c8a96e]">
          MP Capital
        </span>
        <div className="flex items-center gap-3 text-sm text-white/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2a4a] to-[#2a3a6a] border border-[#c8a96e]/25 flex items-center justify-center text-[11px] font-medium text-[#c8a96e]">
            JD
          </div>
          <span>Jean Dupont</span>
        </div>
      </header>

      {/* Main */}
      <main className="px-7 py-8">
        <p className="text-[13px] text-white/40 tracking-[0.04em] mb-1">Bonjour, Jean</p>
        <h1 className="text-[22px] font-medium text-[#e8eaf0] mb-7">Mon espace investisseur</h1>

        {/* KPI patrimoine total */}
        <div className="relative bg-[#141720] border border-white/[0.07] rounded-2xl px-6 py-5 mb-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c8a96e] to-[#e8c98e]" />
          <p className="text-[11px] tracking-[0.08em] uppercase text-white/40 mb-2">Valeur du patrimoine</p>
          <p className="text-[28px] font-medium text-[#c8a96e] tracking-tight">{fmt(last.value)}</p>
          <span className="inline-flex items-center gap-1 mt-2 text-[11px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            ▲ +{perfPct}% depuis le début
          </span>
          <p className="text-[12px] text-white/30 mt-2">Dernier relevé : {last.quarter}</p>
        </div>

        {/* Graphique */}
        <div className="bg-[#141720] border border-white/[0.07] rounded-2xl px-6 py-5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[#e8eaf0]">Évolution du patrimoine</p>
            <p className="text-[11px] text-[#c8a96e]/60">← Glisser pour naviguer</p>
          </div>
          <p className="text-[12px] text-white/35 mb-4">10 derniers relevés trimestriels</p>
          <PatrimoineChart data={RELEVES} />
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-[#141720] border border-white/[0.07] rounded-2xl px-5 py-5">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center mb-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7l5-5 5 5" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/40 mb-2">Montant total investi</p>
            <p className="text-[22px] font-medium text-[#e8eaf0] tracking-tight">{fmt(MONTANT_INVESTI)}</p>
            <p className="text-[11px] text-white/30 mt-1">{NB_VERSEMENTS} versements cumulés</p>
          </div>
          <div className="bg-[#141720] border border-white/[0.07] rounded-2xl px-5 py-5">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center mb-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 12V2M2 7l5 5 5-5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-white/40 mb-2">Montant total retiré</p>
            <p className="text-[22px] font-medium text-[#e8eaf0] tracking-tight">{fmt(MONTANT_RETIRE)}</p>
            <p className="text-[11px] text-white/30 mt-1">{NB_RETRAITS} retraits effectués</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20 mt-6 tracking-[0.04em]">
          Données mises à jour chaque trimestre par MP Capital
        </p>
      </main>
    </div>
  )
}