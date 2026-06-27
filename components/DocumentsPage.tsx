// components/DocumentsPage.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import AdminClientSwitcher from './AdminClientSwitcher'

type DriveFile = {
  id: string
  name: string
  mimeType: string
  createdTime: string
  size: string
  url: string
}

export default function DocumentsPage({
  user,
  isAdmin = false,
  clients = [],
  viewedClient = null,
}: {
  user: { name?: string; email?: string }
  isAdmin?: boolean
  clients?: string[]
  viewedClient?: string | null
}) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const docsQuery = viewedClient ? `?client=${encodeURIComponent(viewedClient)}` : ''

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents${docsQuery}`)
      const data = await res.json()
      const files = data.files || []
      setFiles(files)
      const seenIds = files.map((f: DriveFile) => f.id)
      localStorage.setItem('seen_docs', JSON.stringify(seenIds))
    } catch {
      setError('Erreur lors du chargement des documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload echoue')
      await fetchFiles()
    } catch {
      setError("Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatSize = (bytes: string) => {
    const b = parseInt(bytes)
    if (!b) return ''
    if (b < 1024) return b + ' o'
    if (b < 1024 * 1024) return Math.round(b / 1024) + ' Ko'
    return (b / 1024 / 1024).toFixed(1) + ' Mo'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return 'PDF'
    if (mimeType.startsWith('image/')) return 'IMG'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'XLS'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC'
    return 'FIL'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <img 
  src="https://framerusercontent.com/images/5OUDwHm9zVSVlHsm0LE0jEts.png?width=512&height=117" 
  alt="MP Capital" 
  style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)' }} 
/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(232,234,240,0.5)' }}>
          {isAdmin && <AdminClientSwitcher clients={clients} current={viewedClient} />}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a2a4a', border: '1px solid rgba(200,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: '#c8a96e' }}>
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <span>{user.name}</span>
        </div>
      </header>

      {viewedClient && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(200,169,110,0.1)', borderBottom: '0.5px solid rgba(200,169,110,0.3)', fontSize: '13px', color: '#c8a96e' }}>
          <span>👁️ Documents de <strong>{viewedClient}</strong></span>
          <Link href="/dashboard" style={{ color: '#c8a96e', textDecoration: 'underline' }}>Revenir à mon espace</Link>
        </div>
      )}

      <main style={{ padding: '32px 28px' }}>
        <Link href={viewedClient ? `/dashboard?client=${encodeURIComponent(viewedClient)}` : '/dashboard'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(232,234,240,0.4)', textDecoration: 'none', marginBottom: '24px' }}>
          {"<- Retour au dashboard"}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#e8eaf0', margin: 0 }}>Mes documents</h1>
          {!viewedClient && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#c8a96e', color: '#0d0f14', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? 'Envoi...' : '+ Deposer un document'}
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
            </>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ background: '#141720', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(232,234,240,0.3)', fontSize: '14px' }}>
              Chargement...
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(232,234,240,0.3)', fontSize: '14px' }}>
              Aucun document pour le moment
            </div>
          ) : (
            files.map((file, i) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: i < files.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(200,169,110,0.1)', border: '0.5px solid rgba(200,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, color: '#c8a96e' }}>
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#e8eaf0', margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(232,234,240,0.35)', margin: '3px 0 0' }}>{formatDate(file.createdTime)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {file.size && <span style={{ fontSize: '12px', color: 'rgba(232,234,240,0.3)' }}>{formatSize(file.size)}</span>}
                  <span style={{ fontSize: '12px', color: '#c8a96e' }}>{'Ouvrir ->'}</span>
                </div>
              </a>
            ))
          )}
        </div>
      </main>
    </div>
  )
}