'use client'

import { useEffect, useRef, useState, CSSProperties } from 'react'

type Status = 'idle' | 'uploading' | 'success' | 'error'

const ACCEPT_DOC = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv'

function formatTaille(bytes: number): string {
  const mo = bytes / (1024 * 1024)
  if (mo >= 1) return `${mo.toFixed(1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

export default function AdminDocumentUpload() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [clients, setClients] = useState<string[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [allClients, setAllClients] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fetchedRef = useRef(false)

  // Charge la liste des clients à la première ouverture (une seule fois ;
  // on relance seulement si une erreur a empêché le chargement).
  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true
    setClientsLoading(true)
    setClientsError('')
    fetch('/api/admin/clients')
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)
        setClients(Array.isArray(data?.clients) ? data.clients : [])
      })
      .catch((err) => {
        fetchedRef.current = false // autorise une nouvelle tentative à la réouverture
        setClientsError(err instanceof Error ? err.message : 'Erreur de chargement des clients')
      })
      .finally(() => setClientsLoading(false))
  }, [open])

  function resetAll() {
    setFile(null)
    setSelectedClient('')
    setAllClients(false)
    setStatus('idle')
    setMessage('')
    setIsDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function closeModal() {
    if (status === 'uploading') return
    setOpen(false)
    resetAll()
  }

  function selectFile(f: File | null) {
    setFile(f)
    if (status === 'error' || status === 'success') {
      setStatus('idle')
      setMessage('')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (status === 'uploading') return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) selectFile(dropped)
  }

  const canSubmit = !!file && (allClients || !!selectedClient) && status !== 'uploading'

  async function handleSubmit() {
    if (!file) {
      setStatus('error')
      setMessage('Veuillez choisir un document.')
      return
    }
    if (!allClients && !selectedClient) {
      setStatus('error')
      setMessage('Veuillez choisir un client (ou cocher « Tous les clients »).')
      return
    }

    setStatus('uploading')
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('all', allClients ? 'true' : 'false')
      if (!allClients) fd.append('client', selectedClient)

      const res = await fetch('/api/admin/documents', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)

      setStatus('success')
      setMessage(
        allClients
          ? 'Document commun ajouté — visible par tous les clients (présents et futurs).'
          : `Document envoyé à ${selectedClient}.`
      )
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Erreur lors de l’envoi.')
    }
  }

  const uploading = status === 'uploading'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={styles.triggerButton}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 1.5h5l3 3v8h-8z"
            stroke="#c8a96e"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M7 5.5v4M5 7.5l2-2 2 2" stroke="#c8a96e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Déposer un document
      </button>

      {open && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Déposer un document</h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={uploading}
                style={styles.closeButton}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {/* Zone fichier (drag & drop + clic) */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_DOC}
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (!uploading) setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragging(false)
              }}
              onDrop={handleDrop}
              style={{
                ...styles.dropzone,
                borderColor: isDragging ? '#c8a96e' : file ? 'rgba(200,169,110,0.4)' : 'rgba(200,169,110,0.25)',
                background: isDragging ? 'rgba(200,169,110,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {file ? (
                <div style={styles.fileRow}>
                  <span style={styles.fileIcon}>📄</span>
                  <div style={styles.fileMeta}>
                    <span style={styles.fileName}>{file.name}</span>
                    <span style={styles.fileSize}>{formatTaille(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      selectFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    disabled={uploading}
                    style={styles.removeButton}
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <div style={styles.dropPrompt}>
                  <span style={styles.dropIcon}>⬆️</span>
                  <span style={styles.dropText}>Glissez un document ici ou cliquez pour le choisir</span>
                  <span style={styles.dropHint}>PDF, Word, Excel, image…</span>
                </div>
              )}
            </div>

            {/* Destinataire */}
            <div style={styles.field}>
              <label style={styles.label}>Client destinataire</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                disabled={allClients || uploading || clientsLoading}
                style={{
                  ...styles.select,
                  opacity: allClients || clientsLoading ? 0.5 : 1,
                }}
              >
                <option value="">
                  {clientsLoading ? 'Chargement des clients…' : '— Choisir un client —'}
                </option>
                {clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {clientsError && <p style={styles.inlineError}>⚠️ {clientsError}</p>}
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={allClients}
                onChange={(e) => {
                  setAllClients(e.target.checked)
                  if (e.target.checked) setSelectedClient('')
                }}
                disabled={uploading}
                style={styles.checkbox}
              />
              <span>
                Document commun à tous les clients{' '}
                <span style={styles.countHint}>(présents et futurs)</span>
              </span>
            </label>

            {/* Messages */}
            {status === 'success' && <div style={{ ...styles.banner, ...styles.bannerSuccess }}>✅ {message}</div>}
            {status === 'error' && <div style={{ ...styles.banner, ...styles.bannerError }}>❌ {message}</div>}

            {/* Actions */}
            <div style={styles.actions}>
              {status === 'success' ? (
                <>
                  <button type="button" onClick={resetAll} style={styles.primaryButton(false)}>
                    Déposer un autre
                  </button>
                  <button type="button" onClick={closeModal} style={styles.secondaryButton}>
                    Fermer
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={styles.primaryButton(!canSubmit)}
                  >
                    {uploading ? 'Envoi en cours…' : 'Envoyer'}
                  </button>
                  <button type="button" onClick={closeModal} disabled={uploading} style={styles.secondaryButton}>
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type StyleMap = {
  [k: string]: CSSProperties | ((arg: boolean) => CSSProperties)
}

const styles = {
  triggerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(200,169,110,0.08)',
    border: '0.5px solid rgba(200,169,110,0.3)',
    borderRadius: '10px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#c8a96e',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    fontFamily: 'inherit',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000,
    boxSizing: 'border-box',
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#16181f',
    border: '0.5px solid rgba(200,169,110,0.25)',
    borderRadius: 16,
    padding: 22,
    boxSizing: 'border-box',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#e8eaf0',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    color: '#e8eaf0',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(232,234,240,0.6)',
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
  },
  dropzone: {
    width: '100%',
    boxSizing: 'border-box',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    transition: 'background 0.15s ease, border-color 0.15s ease',
    userSelect: 'none',
  },
  dropPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 6,
  },
  dropIcon: {
    fontSize: 22,
    lineHeight: 1,
  },
  dropText: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(232,234,240,0.85)',
  },
  dropHint: {
    fontSize: 11,
    color: 'rgba(232,234,240,0.4)',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  fileIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  fileMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e8eaf0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    fontSize: 11,
    color: 'rgba(232,234,240,0.5)',
  },
  removeButton: {
    flexShrink: 0,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#f8b4b4',
    background: 'rgba(248,113,113,0.08)',
    border: '0.5px solid rgba(248,113,113,0.3)',
    borderRadius: 7,
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(232,234,240,0.6)',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    color: '#e8eaf0',
    background: '#0e1016',
    border: '0.5px solid rgba(200,169,110,0.3)',
    borderRadius: 10,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  },
  inlineError: {
    margin: '2px 0 0',
    fontSize: 12,
    color: '#f87171',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontSize: 13,
    color: 'rgba(232,234,240,0.85)',
    cursor: 'pointer',
    marginBottom: 18,
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: '#c8a96e',
    cursor: 'pointer',
  },
  countHint: {
    color: 'rgba(232,234,240,0.45)',
  },
  banner: {
    padding: '11px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    wordBreak: 'break-word',
  },
  bannerSuccess: {
    background: 'rgba(74,222,128,0.1)',
    border: '0.5px solid rgba(74,222,128,0.4)',
    color: '#4ade80',
  },
  bannerError: {
    background: 'rgba(248,113,113,0.1)',
    border: '0.5px solid rgba(248,113,113,0.4)',
    color: '#f87171',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: (disabled: boolean): CSSProperties => ({
    flex: '1 1 auto',
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: disabled ? 'rgba(200,169,110,0.5)' : '#0a0b0f',
    background: disabled ? 'rgba(200,169,110,0.15)' : '#c8a96e',
    border: 'none',
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s ease',
  }),
  secondaryButton: {
    flex: '0 0 auto',
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(232,234,240,0.7)',
    background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    cursor: 'pointer',
  },
} satisfies StyleMap
