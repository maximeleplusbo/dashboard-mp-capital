'use client'

import { useEffect, useRef, useState, CSSProperties } from 'react'
import * as tus from 'tus-js-client'

type Status = 'ready' | 'uploading' | 'success' | 'error'

// Filtre large : video/* seul empêche la sélection de certains .mov sur macOS
// (type MIME QuickTime non reconnu), d'où l'ajout explicite des extensions/types.
const ACCEPT_VIDEO = 'video/*,.mov,.mp4,.m4v,.webm,.avi,.mkv,video/quicktime,video/x-m4v'

function dateFrancaise(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

function formatTaille(bytes: number): string {
  const mo = bytes / (1024 * 1024)
  if (mo >= 1024) return `${(mo / 1024).toFixed(2)} Go`
  return `${mo.toFixed(1)} Mo`
}

export default function UploadForm() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('ready')
  const [progress, setProgress] = useState(0)
  const [uid, setUid] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prérempli le titre côté client pour éviter tout décalage d'hydratation.
  useEffect(() => {
    setTitle(`Analyse : ${dateFrancaise()}`)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!file) {
      setStatus('error')
      setErrorMessage('Veuillez sélectionner un fichier vidéo.')
      return
    }

    setStatus('uploading')
    setProgress(0)
    setUid('')
    setErrorMessage('')

    try {
      // 1) Demande une URL d'upload direct à notre API (vérifie l'admin).
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, size: file.size }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.uploadURL) {
        throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)
      }

      const {
        uploadURL,
        uid: returnedUid,
        title: effectiveTitle,
        summary: effectiveSummary,
      } = data as { uploadURL: string; uid: string; title: string; summary: string }

      // 2) Envoie le fichier directement à Cloudflare avec suivi de progression.
      await uploadToCloudflare(uploadURL, file, (pct) => setProgress(pct))

      // 3) Cloudflare a écrasé meta.name avec le nom du fichier pendant l'upload :
      //    on réimpose le titre/résumé voulus une fois l'upload terminé.
      const patchRes = await fetch(`/api/admin/videos/${returnedUid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: effectiveTitle, summary: effectiveSummary }),
      })
      if (!patchRes.ok) {
        const patchData = await patchRes.json().catch(() => null)
        throw new Error(
          'Vidéo envoyée, mais le titre n’a pas pu être appliqué : ' +
            (patchData?.error || `HTTP ${patchRes.status}`)
        )
      }

      setUid(returnedUid)
      setStatus('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue lors de l’upload.'
      setErrorMessage(message)
      setStatus('error')
    }
  }

  function uploadToCloudflare(
    uploadURL: string,
    videoFile: File,
    onProgress: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Upload résumable tus : pas de limite des 200 Mo (l'upload a déjà été
      // créé côté serveur, on reprend ici l'URL one-time via `uploadUrl`).
      // chunkSize requis par Cloudflare et multiple de 256 Kio.
      const upload = new tus.Upload(videoFile, {
        uploadUrl: uploadURL,
        chunkSize: 52428800, // 50 Mio
        retryDelays: [0, 3000, 5000, 10000, 20000],
        onProgress: (bytesUploaded, bytesTotal) => {
          if (bytesTotal > 0) {
            onProgress(Math.round((bytesUploaded / bytesTotal) * 100))
          }
        },
        onSuccess: () => {
          onProgress(100)
          resolve()
        },
        onError: (err) => {
          reject(
            new Error(
              `Échec de l’envoi vers Cloudflare : ${err instanceof Error ? err.message : String(err)}`
            )
          )
        },
      })
      upload.start()
    })
  }

  function resetForm() {
    setStatus('ready')
    setProgress(0)
    setUid('')
    setErrorMessage('')
    setFile(null)
    setSummary('')
    setTitle(`Analyse : ${dateFrancaise()}`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Sélection de fichier (clic OU drop) : même état alimenté dans les deux cas. ---
  // Validation volontairement tolérante : on n'inspecte pas le type MIME (souvent
  // vide pour les .mov), on accepte le fichier déposé/choisi tel quel.
  function selectFile(f: File | null) {
    setFile(f)
    // Repartir d'un état propre si une tentative précédente avait échoué/réussi.
    if (status === 'error' || status === 'success') {
      setStatus('ready')
      setErrorMessage('')
      setProgress(0)
      setUid('')
    }
  }

  function openFilePicker() {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  function removeFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (isUploading) return
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (isUploading) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) selectFile(dropped)
  }

  const isUploading = status === 'uploading'

  // Bordures en propriétés séparées (borderWidth/Style/Color) pour éviter le
  // warning React "Removing a style property (borderColor) when a conflicting
  // property is set (border)" : on n'utilise jamais le raccourci `border` ici.
  const dropzoneStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: file ? 'solid' : 'dashed',
    borderColor: isDragging ? '#2563eb' : file ? '#bfdbfe' : '#cbd5e1',
    borderRadius: 10,
    background: isDragging ? '#eff6ff' : file ? '#f8fafc' : '#fafbfc',
    cursor: isUploading ? 'not-allowed' : file ? 'default' : 'pointer',
    opacity: isUploading ? 0.6 : 1,
    transition: 'background 0.15s ease, border-color 0.15s ease',
    userSelect: 'none',
  }

  return (
    <main style={styles.page}>
      {/* Bascule responsive : colonne sur mobile, rangée compacte dès 700px. */}
      <style>{RESPONSIVE_CSS}</style>
      <div style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.heading}>Dépôt de vidéo</h1>
          <p style={styles.subtitle}>Espace administrateur — Cloudflare Stream</p>
        </header>

        <form onSubmit={handleSubmit} className="uf-form">
          <div className="uf-toprow">
            <label className="uf-col uf-col-title">
              <span style={styles.labelText}>Titre</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                style={styles.input}
                placeholder="Titre de la vidéo"
              />
            </label>

            <div className="uf-col uf-col-file">
              <span style={styles.labelText}>Fichier vidéo</span>

              {/* Input natif caché : alimenté par le clic sur la dropzone. */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_VIDEO}
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
                disabled={isUploading}
                style={{ display: 'none' }}
              />

              <div
                role="button"
                tabIndex={0}
                aria-disabled={isUploading}
                onClick={openFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFilePicker()
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="uf-dropzone"
                style={dropzoneStyle}
              >
                {file ? (
                  <div style={styles.fileRow}>
                    <span style={styles.fileIcon}>🎬</span>
                    <div style={styles.fileMeta}>
                      <span style={styles.fileName}>{file.name}</span>
                      <span style={styles.fileSize}>{formatTaille(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile()
                      }}
                      disabled={isUploading}
                      style={styles.removeButton}
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <div style={styles.dropPrompt}>
                    <span style={styles.dropIcon}>⬆️</span>
                    <span style={styles.dropTitle}>
                      Glissez une vidéo ici ou cliquez pour choisir un fichier
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="uf-col">
            <span style={styles.labelText}>Résumé</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={isUploading}
              rows={2}
              style={{ ...styles.input, resize: 'vertical', minHeight: 52 }}
              placeholder="Résumé / description de l’analyse"
            />
          </label>

          <button
            type="submit"
            disabled={isUploading || !file}
            className="uf-submit"
            style={styles.button(isUploading || !file)}
          >
            {isUploading ? `Envoi en cours… ${progress}%` : 'Envoyer la vidéo'}
          </button>
        </form>

        {/* État : upload en cours */}
        {isUploading && (
          <div style={styles.statusBlock}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>
            <p style={styles.statusText}>Upload : {progress}%</p>
          </div>
        )}

        {/* État : succès */}
        {status === 'success' && (
          <div style={{ ...styles.statusBlock, ...styles.successBlock }}>
            <p style={styles.successText}>✅ Vidéo envoyée avec succès.</p>
            <p style={styles.uidText}>
              UID Cloudflare : <code style={styles.code}>{uid}</code>
            </p>
            <button type="button" onClick={resetForm} style={styles.secondaryButton}>
              Déposer une autre vidéo
            </button>
          </div>
        )}

        {/* État : erreur */}
        {status === 'error' && (
          <div style={{ ...styles.statusBlock, ...styles.errorBlock }}>
            <p style={styles.errorText}>❌ {errorMessage}</p>
            <button type="button" onClick={() => setStatus('ready')} style={styles.secondaryButton}>
              Réessayer
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

// Disposition responsive : une seule colonne tactile sous 700px, rangée
// horizontale compacte (Titre + dropzone côte à côte) au-delà.
const RESPONSIVE_CSS = `
.uf-form { display: flex; flex-direction: column; gap: 12px; }
.uf-toprow { display: flex; flex-direction: column; gap: 12px; }
.uf-col { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.uf-dropzone { padding: 16px; min-height: 108px; }
.uf-submit { width: 100%; }
@media (min-width: 700px) {
  .uf-toprow { flex-direction: row; align-items: flex-start; }
  .uf-col-title { flex: 1 1 0; }
  .uf-col-file { flex: 1 1 0; }
  .uf-dropzone { padding: 8px 12px; min-height: 62px; }
  .uf-submit { width: auto; align-self: flex-start; }
}
`

type StyleMap = {
  [k: string]: CSSProperties | ((arg: boolean) => CSSProperties)
}

const styles = {
  page: {
    minHeight: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '20px 16px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#111827',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: '#ffffff',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: 14,
  },
  heading: {
    margin: '0 0 2px',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    color: '#6b7280',
  },
  labelText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '8px 11px',
    fontSize: 13,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#111827',
    background: '#fafafa',
    outline: 'none',
  },
  dropPrompt: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
  },
  dropIcon: {
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
  },
  dropTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#4b5563',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  fileIcon: {
    fontSize: 20,
    lineHeight: 1,
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
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    fontSize: 11,
    color: '#6b7280',
  },
  removeButton: {
    flexShrink: 0,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#dc2626',
    background: '#fff',
    border: '1px solid #fecaca',
    borderRadius: 7,
    cursor: 'pointer',
  },
  button: (disabled: boolean): CSSProperties => ({
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: disabled ? '#93b4f5' : '#2563eb',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s ease',
  }),
  secondaryButton: {
    marginTop: 12,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#2563eb',
    background: 'transparent',
    border: '1px solid #2563eb',
    borderRadius: 8,
    cursor: 'pointer',
  },
  statusBlock: {
    marginTop: 14,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    background: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
    borderRadius: 999,
    transition: 'width 0.2s ease',
  },
  statusText: {
    margin: '6px 0 0',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  successBlock: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: 10,
    padding: 14,
  },
  successText: {
    margin: '0 0 4px',
    fontSize: 14,
    fontWeight: 600,
    color: '#065f46',
  },
  uidText: {
    margin: 0,
    fontSize: 13,
    color: '#065f46',
    wordBreak: 'break-all',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: '#d1fae5',
    padding: '2px 6px',
    borderRadius: 4,
  },
  errorBlock: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#991b1b',
    wordBreak: 'break-word',
  },
} satisfies StyleMap
