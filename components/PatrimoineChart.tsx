// components/PatrimoineChart.tsx
'use client'

import { useRef, useEffect } from 'react'

type Releve = { quarter: string; value: number }

export default function PatrimoineChart({ data }: { data: Releve[] }) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const POINT_W = 90
  const H       = 200
  const PAD_T   = 30, PAD_B = 28, PAD_L = 10

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const values = data.map(d => d.value)
    const TOTAL_W = POINT_W * data.length
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range  = maxVal - minVal
    const safeRange = range === 0 ? 1 : range

    const toY = (v: number) => PAD_T + (1 - (v - minVal) / safeRange) * (H - PAD_T - PAD_B)
    const toX = (i: number) => PAD_L + i * POINT_W + POINT_W / 2

    canvas.width = TOTAL_W
    canvas.height = H

    ctx.clearRect(0, 0, TOTAL_W, H)

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let g = 0; g <= 4; g++) {
      const y = PAD_T + g * (H - PAD_T - PAD_B) / 4
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TOTAL_W, y); ctx.stroke()
    }

    const grad = ctx.createLinearGradient(0, PAD_T, 0, H)
    grad.addColorStop(0, 'rgba(200,169,110,0.18)')
    grad.addColorStop(1, 'rgba(200,169,110,0.00)')
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(values[0]))
    for (let i = 1; i < values.length; i++) ctx.lineTo(toX(i), toY(values[i]))
    ctx.lineTo(toX(values.length - 1), H - PAD_B)
    ctx.lineTo(toX(0), H - PAD_B)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(toX(0), toY(values[0]))
    for (let i = 1; i < values.length; i++) ctx.lineTo(toX(i), toY(values[i]))
    ctx.strokeStyle = '#c8a96e'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    for (let i = 0; i < values.length; i++) {
      ctx.fillStyle = i === values.length - 1 ? '#c8a96e' : 'rgba(200,169,110,0.4)'
      ctx.beginPath()
      ctx.arc(toX(i), toY(values[i]), i === values.length - 1 ? 5 : 3.5, 0, Math.PI * 2)
      ctx.fill()
      if (i === values.length - 1) {
        ctx.fillStyle = '#0d0f14'
        ctx.beginPath()
        ctx.arc(toX(i), toY(values[i]), 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.fillStyle = 'rgba(232,234,240,0.35)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    data.forEach((d, i) => ctx.fillText(d.quarter, toX(i), H - 8))
  }, [data])

  const TOTAL_W = POINT_W * data.length

  useEffect(() => {
    const wrap = wrapRef.current
    if (wrap) wrap.scrollLeft = TOTAL_W

    let isDragging = false, startX = 0, startScroll = 0
    const onDown = (e: MouseEvent) => { isDragging = true; startX = e.pageX; startScroll = wrap!.scrollLeft }
    const onUp   = () => { isDragging = false }
    const onMove = (e: MouseEvent) => { if (isDragging && wrap) wrap.scrollLeft = startScroll - (e.pageX - startX) }
    wrap?.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    return () => {
      wrap?.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  const showTooltip = (mx: number) => {
    const values = data.map(d => d.value)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const safeRange = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal)
    const toX = (i: number) => PAD_L + i * POINT_W + POINT_W / 2
    const toY = (v: number) => PAD_T + (1 - (v - minVal) / safeRange) * (H - PAD_T - PAD_B)

    let closest = -1, minDist = 999
    for (let i = 0; i < values.length; i++) {
      const dist = Math.abs(toX(i) - mx)
      if (dist < minDist) { minDist = dist; closest = i }
    }
    const tt = tooltipRef.current
    if (!tt) return
    if (closest >= 0 && minDist < 40) {
      const perf = ((values[closest] - values[0]) / values[0] * 100).toFixed(1)
      const wrapEl = wrapRef.current!
      let tx = toX(closest) - wrapEl.scrollLeft + 10
      if (tx + 160 > wrapEl.clientWidth) tx = toX(closest) - wrapEl.scrollLeft - 170
      const pointY = toY(values[closest])
      const ttTop = pointY < 70 ? pointY + 15 : pointY - 75
      tt.style.display = 'block'
      tt.style.left = `${tx}px`
      tt.style.top  = `${ttTop}px`
      tt.innerHTML  = `
        <div style="font-size:10px;color:rgba(232,234,240,0.4);margin-bottom:2px">${data[closest].quarter}</div>
        <div style="font-size:14px;font-weight:500;color:#c8a96e">${values[closest].toLocaleString('fr-FR')} €</div>
        ${closest > 0 ? `<div style="font-size:10px;color:#4ade80;margin-top:1px">▲ +${perf}% depuis le début</div>` : ''}
      `
    } else {
      tt.style.display = 'none'
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    showTooltip(e.clientX - rect.left)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    showTooltip(e.touches[0].clientX - rect.left)
  }

  return (
    <div
      ref={wrapRef}
      style={{ overflowX: 'auto', overflowY: 'hidden', position: 'relative', cursor: 'grab', height: H + 'px' }}
    >
      <canvas
        ref={canvasRef}
        width={TOTAL_W}
        height={H}
        style={{ width: TOTAL_W + 'px', height: H + 'px', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = 'none' }}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { if (tooltipRef.current) tooltipRef.current.style.display = 'none' }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute', display: 'none', pointerEvents: 'none',
          background: '#1e2330', border: '0.5px solid rgba(200,169,110,0.3)',
          borderRadius: '8px', padding: '8px 12px', zIndex: 10
        }}
      />
    </div>
  )
}