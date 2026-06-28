'use client'

import { useEffect, useState, CSSProperties } from 'react'
import Link from 'next/link'
import { getPlaybackUrl, type StreamVideo } from '@/lib/cloudflare'

type Status = 'loading' | 'ready' | 'error'

function formatDateFr(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function formatDateTimeParis(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris',
  }).format(d)
}

function formatDuree(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

type Flash = { text: string; error: boolean }

export default function VideosGallery() {
  const [status, setStatus] = useState<Status>('loading')
  const [videos, setVideos] = useState<StreamVideo[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [selected, setSelected] = useState<StreamVideo | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/videos')
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)
        if (!active) return
        setVideos(Array.isArray(data?.videos) ? data.videos : [])
        setIsAdminUser(data?.isAdmin === true)
        setStatus('ready')
      } catch (err) {
        if (!active) return
        setErrorMessage(err instanceof Error ? err.message : 'Erreur inconnue')
        setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Le message éphémère (succès/erreur) s'efface automatiquement.
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(t)
  }, [flash])

  // Ouvre une vidéo + enregistre le visionnage (best-effort, le serveur ignore
  // les visiteurs anonymes et l'admin).
  function openVideo(video: StreamVideo) {
    setSelected(video)
    fetch('/api/videos/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: video.uid }),
    }).catch(() => {})
  }

  async function handleDelete(video: StreamVideo) {
    setDeletingUid(video.uid)
    setFlash(null)
    try {
      const res = await fetch(`/api/admin/videos/${video.uid}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)
      setVideos((prev) => prev.filter((v) => v.uid !== video.uid))
      if (selected?.uid === video.uid) setSelected(null)
      setFlash({ text: `Vidéo « ${video.title} » supprimée.`, error: false })
    } catch (err) {
      setFlash({
        text: err instanceof Error ? err.message : 'Erreur lors de la suppression.',
        error: true,
      })
    } finally {
      setDeletingUid(null)
    }
  }

  // Met à jour titre + résumé via l'API, puis reflète le changement dans la
  // liste locale et dans la vidéo ouverte. Relance l'erreur pour que le
  // lecteur reste en mode édition et affiche le message.
  async function handleUpdateMeta(video: StreamVideo, title: string, summary: string) {
    const res = await fetch(`/api/admin/videos/${video.uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || `Erreur serveur (HTTP ${res.status})`)

    const newTitle: string = data?.title ?? title
    const newSummary: string = data?.summary ?? summary
    setVideos((prev) =>
      prev.map((v) => (v.uid === video.uid ? { ...v, title: newTitle, summary: newSummary } : v))
    )
    setSelected((prev) =>
      prev && prev.uid === video.uid ? { ...prev, title: newTitle, summary: newSummary } : prev
    )
    setFlash({ text: `Vidéo « ${newTitle} » mise à jour.`, error: false })
  }

  return (
    <main style={styles.page}>
      <style>{EXTRA_CSS}</style>

      <div style={styles.container}>
        <div style={styles.topbar}>
          <Link href="/dashboard" style={styles.goldButton}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#c8a96e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour au tableau de bord
          </Link>
        </div>

        {flash && (
          <div style={{ ...styles.flash, ...(flash.error ? styles.flashError : styles.flashSuccess) }}>
            {flash.error ? '❌' : '✅'} {flash.text}
          </div>
        )}

        {selected ? (
          <Player
            video={selected}
            onBack={() => setSelected(null)}
            isAdmin={isAdminUser}
            onSave={(title, summary) => handleUpdateMeta(selected, title, summary)}
          />
        ) : (
          <>
            <header style={styles.header}>
              <h1 style={styles.title}>Analyses de marché</h1>
              <p style={styles.subtitle}>Retrouvez les dernières vidéos d’analyse</p>
            </header>

            {status === 'loading' && (
              <div style={styles.stateBox}>
                <svg width="22" height="22" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="7" cy="7" r="5" stroke="#c8a96e" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" />
                </svg>
                <p style={styles.stateText}>Chargement des vidéos…</p>
              </div>
            )}

            {status === 'error' && (
              <div style={styles.stateBox}>
                <p style={{ ...styles.stateText, color: '#f87171' }}>❌ {errorMessage}</p>
              </div>
            )}

            {status === 'ready' && videos.length === 0 && (
              <div style={styles.stateBox}>
                <p style={styles.stateText}>Aucune vidéo disponible pour le moment.</p>
              </div>
            )}

            {status === 'ready' && videos.length > 0 && (
              <div className="videos-grid">
                {videos.map((v) => (
                  <VideoCard
                    key={v.uid}
                    video={v}
                    onOpen={() => v.ready && openVideo(v)}
                    isAdmin={isAdminUser}
                    deleting={deletingUid === v.uid}
                    onDelete={() => handleDelete(v)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function VideoCard({
  video,
  onOpen,
  isAdmin,
  deleting,
  onDelete,
}: {
  video: StreamVideo
  onOpen: () => void
  isAdmin: boolean
  deleting: boolean
  onDelete: () => void
}) {
  const disabled = !video.ready
  const [confirming, setConfirming] = useState(false)

  // Empêche le clic sur les contrôles de suppression d'ouvrir le lecteur.
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  function askSecondConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(false)
    // Seconde confirmation explicite et définitive.
    const ok = window.confirm(
      `Supprimer définitivement la vidéo « ${video.title} » ?\n\n` +
        'Cette action est IRRÉVERSIBLE : la vidéo sera retirée de Cloudflare Stream et ne pourra pas être récupérée.'
    )
    if (ok) onDelete()
  }

  return (
    <div
      className={disabled ? 'video-card video-card-disabled' : 'video-card'}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onOpen}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      style={{
        ...styles.card,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={styles.thumbWrap}>
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt={video.title} style={styles.thumbImg} />
        ) : (
          <div style={styles.thumbPlaceholder}>
            <svg width="34" height="34" viewBox="0 0 14 14" fill="none">
              <path d="M5 3.5l5 3.5-5 3.5z" stroke="#c8a96e" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {disabled ? (
          <span style={styles.badgeProcessing}>En cours de traitement</span>
        ) : (
          <span style={styles.durationBadge}>{formatDuree(video.duration)}</span>
        )}
      </div>

      <div style={styles.cardBody}>
        <h2 style={styles.cardTitle}>{video.title}</h2>
        <p style={styles.cardDate}>{formatDateFr(video.created)}</p>

        {isAdmin && (
          <div style={styles.adminRow} onClick={stop}>
            {deleting ? (
              <span style={styles.deletingText}>Suppression…</span>
            ) : confirming ? (
              <div style={styles.confirmRow}>
                <span style={styles.confirmText}>Confirmer ?</span>
                <button type="button" onClick={askSecondConfirm} style={styles.confirmYes}>
                  Oui, supprimer
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirming(false)
                  }}
                  style={styles.confirmNo}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirming(true)
                }}
                style={styles.deleteButton}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M3 4h8M5.5 4V3h3v1M4 4l.5 7h5L10 4" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Player({
  video,
  onBack,
  isAdmin,
  onSave,
}: {
  video: StreamVideo
  onBack: () => void
  isAdmin: boolean
  onSave: (title: string, summary: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(video.title)
  const [summaryDraft, setSummaryDraft] = useState(video.summary)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Suivi des visionnages (admin uniquement).
  const [watched, setWatched] = useState<{ email: string; name: string; watchedAt: string }[]>([])
  const [notWatched, setNotWatched] = useState<{ email: string; name: string }[]>([])
  const [viewsLoading, setViewsLoading] = useState(false)
  const [viewsError, setViewsError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    setViewsLoading(true)
    setViewsError('')
    fetch(`/api/admin/videos/${video.uid}/views`)
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || `Erreur (HTTP ${res.status})`)
        if (!active) return
        setWatched(Array.isArray(data?.watched) ? data.watched : [])
        setNotWatched(Array.isArray(data?.notWatched) ? data.notWatched : [])
      })
      .catch((err) => {
        if (active) setViewsError(err instanceof Error ? err.message : 'Erreur de chargement')
      })
      .finally(() => {
        if (active) setViewsLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAdmin, video.uid])

  function startEdit() {
    setTitleDraft(video.title)
    setSummaryDraft(video.summary)
    setEditError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError('')
  }

  async function save() {
    const title = titleDraft.trim()
    if (!title) {
      setEditError('Le titre ne peut pas être vide.')
      return
    }
    setSaving(true)
    setEditError('')
    try {
      await onSave(title, summaryDraft.trim())
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} style={styles.goldButton}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="#c8a96e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour
      </button>

      <div style={styles.playerWrap}>
        <iframe
          src={getPlaybackUrl(video.uid)}
          title={video.title}
          style={styles.iframe}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>

      <div style={styles.playerMeta}>
        {editing ? (
          <>
            <label style={styles.editLabel}>Titre</label>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              disabled={saving}
              style={styles.editInput}
              placeholder="Titre de la vidéo"
            />

            <label style={{ ...styles.editLabel, marginTop: 14 }}>Résumé</label>
            <textarea
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              disabled={saving}
              rows={4}
              style={{ ...styles.editInput, resize: 'vertical', minHeight: 96 }}
              placeholder="Résumé de l’analyse"
            />

            {editError && <p style={styles.editError}>❌ {editError}</p>}

            <div style={styles.editActions}>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{ ...styles.savePrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={cancelEdit} disabled={saving} style={styles.cancelSecondary}>
                Annuler
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.titleRow}>
              <h1 style={{ ...styles.title, margin: 0 }}>{video.title}</h1>
              {isAdmin && (
                <button type="button" onClick={startEdit} style={styles.editButton}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" stroke="#c8a96e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Modifier
                </button>
              )}
            </div>
            <p style={styles.subtitle}>{formatDateFr(video.created)}</p>
            <div style={styles.summaryBox}>
              <p style={styles.summaryText}>
                {video.summary ? video.summary : 'Pas de résumé disponible'}
              </p>
            </div>

            {isAdmin && (
              <div style={styles.viewsBox}>
                <div style={styles.viewsHeader}>
                  <span style={styles.viewsTitle}>Suivi des visionnages</span>
                  {!viewsLoading && !viewsError && (
                    <span style={styles.viewsCount}>
                      {watched.length} vu · {notWatched.length} pas encore
                    </span>
                  )}
                </div>

                {viewsLoading && <p style={styles.viewsMuted}>Chargement…</p>}
                {viewsError && <p style={{ ...styles.viewsMuted, color: '#f87171' }}>❌ {viewsError}</p>}

                {!viewsLoading && !viewsError && (
                  <>
                    <p style={styles.viewsSub}>✅ A regardé ({watched.length}) — 1er visionnage</p>
                    {watched.length === 0 ? (
                      <p style={styles.viewsMuted}>Personne pour le moment.</p>
                    ) : (
                      watched.map((w) => (
                        <div key={w.email} style={styles.viewerRow}>
                          <div style={styles.viewerMeta}>
                            <span style={styles.viewerName}>{w.name || w.email}</span>
                            <span style={styles.viewerEmail}>{w.email}</span>
                          </div>
                          <span style={styles.viewerDate} title="Premier visionnage">{formatDateTimeParis(w.watchedAt)}</span>
                        </div>
                      ))
                    )}

                    <p style={{ ...styles.viewsSub, marginTop: 16 }}>⚪ Pas encore regardé ({notWatched.length})</p>
                    {notWatched.length === 0 ? (
                      <p style={styles.viewsMuted}>Tous les clients ont regardé 🎉</p>
                    ) : (
                      notWatched.map((c) => (
                        <div key={c.email} style={styles.viewerRow}>
                          <div style={styles.viewerMeta}>
                            <span style={{ ...styles.viewerName, color: 'rgba(232,234,240,0.55)' }}>{c.name || '—'}</span>
                            <span style={styles.viewerEmail}>{c.email}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const EXTRA_CSS = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.videos-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 640px) { .videos-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 980px) { .videos-grid { grid-template-columns: repeat(3, 1fr); } }
.video-card { transition: transform 0.15s ease, border-color 0.15s ease; }
.video-card:not(.video-card-disabled):hover { transform: translateY(-2px); border-color: rgba(200,169,110,0.55); }
`

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0b0f',
    color: '#e8eaf0',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '20px 16px 48px',
    boxSizing: 'border-box',
  },
  topbar: {
    marginBottom: 24,
  },
  goldButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(200,169,110,0.08)',
    border: '0.5px solid rgba(200,169,110,0.3)',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 500,
    color: '#c8a96e',
    textDecoration: 'none',
    letterSpacing: '0.02em',
    cursor: 'pointer',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    margin: '0 0 4px',
    fontSize: 22,
    fontWeight: 500,
    color: '#e8eaf0',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(232,234,240,0.45)',
    letterSpacing: '0.02em',
  },
  stateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '64px 16px',
    textAlign: 'center',
  },
  stateText: {
    margin: 0,
    fontSize: 14,
    color: 'rgba(232,234,240,0.6)',
  },
  card: {
    background: '#141720',
    border: '0.5px solid rgba(200,169,110,0.2)',
    borderRadius: 14,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
    background: '#0e1016',
  },
  thumbImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    background: 'rgba(0,0,0,0.7)',
    color: '#e8eaf0',
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 7px',
    borderRadius: 6,
    letterSpacing: '0.02em',
  },
  badgeProcessing: {
    position: 'absolute',
    left: 8,
    top: 8,
    background: 'rgba(200,169,110,0.12)',
    border: '0.5px solid rgba(200,169,110,0.4)',
    color: '#c8a96e',
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: '0.02em',
  },
  cardBody: {
    padding: '14px 16px 16px',
  },
  cardTitle: {
    margin: '0 0 6px',
    fontSize: 15,
    fontWeight: 500,
    color: '#e8eaf0',
    lineHeight: 1.3,
  },
  cardDate: {
    margin: 0,
    fontSize: 12,
    color: 'rgba(232,234,240,0.4)',
    letterSpacing: '0.02em',
  },
  playerWrap: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
    marginTop: 20,
    background: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    border: '0.5px solid rgba(200,169,110,0.2)',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  playerMeta: {
    marginTop: 20,
  },
  summaryBox: {
    marginTop: 16,
    background: '#141720',
    border: '0.5px solid rgba(200,169,110,0.2)',
    borderRadius: 14,
    padding: 18,
  },
  summaryText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'rgba(232,234,240,0.8)',
    whiteSpace: 'pre-wrap',
  },
  flash: {
    marginBottom: 20,
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
  },
  flashSuccess: {
    background: 'rgba(74,222,128,0.1)',
    border: '0.5px solid rgba(74,222,128,0.4)',
    color: '#4ade80',
  },
  flashError: {
    background: 'rgba(248,113,113,0.1)',
    border: '0.5px solid rgba(248,113,113,0.4)',
    color: '#f87171',
  },
  adminRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '0.5px solid rgba(255,255,255,0.06)',
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(248,113,113,0.07)',
    border: '0.5px solid rgba(248,113,113,0.3)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#f87171',
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  confirmRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#f87171',
  },
  confirmYes: {
    background: 'rgba(248,113,113,0.16)',
    border: '0.5px solid rgba(248,113,113,0.5)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fca5a5',
    cursor: 'pointer',
  },
  confirmNo: {
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(232,234,240,0.7)',
    cursor: 'pointer',
  },
  deletingText: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(232,234,240,0.6)',
  },
  titleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  editButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(200,169,110,0.08)',
    border: '0.5px solid rgba(200,169,110,0.3)',
    borderRadius: 8,
    padding: '5px 11px',
    fontSize: 12,
    fontWeight: 500,
    color: '#c8a96e',
    cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  editLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(232,234,240,0.6)',
    marginBottom: 6,
  },
  editInput: {
    width: '100%',
    padding: '10px 13px',
    fontSize: 14,
    color: '#e8eaf0',
    background: '#0e1016',
    border: '0.5px solid rgba(200,169,110,0.3)',
    borderRadius: 10,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  },
  editError: {
    margin: '12px 0 0',
    fontSize: 13,
    fontWeight: 500,
    color: '#f87171',
  },
  editActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  savePrimary: {
    background: 'rgba(200,169,110,0.14)',
    border: '0.5px solid rgba(200,169,110,0.5)',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    color: '#c8a96e',
    letterSpacing: '0.02em',
  },
  cancelSecondary: {
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(232,234,240,0.7)',
    cursor: 'pointer',
  },
  viewsBox: {
    marginTop: 16,
    background: '#141720',
    border: '0.5px solid rgba(200,169,110,0.2)',
    borderRadius: 14,
    padding: 18,
  },
  viewsHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  viewsTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#c8a96e',
  },
  viewsCount: {
    fontSize: 12,
    color: 'rgba(232,234,240,0.5)',
  },
  viewsSub: {
    margin: '0 0 8px',
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(232,234,240,0.8)',
  },
  viewsMuted: {
    margin: '0 0 4px',
    fontSize: 13,
    color: 'rgba(232,234,240,0.4)',
  },
  viewerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '8px 0',
    borderTop: '0.5px solid rgba(255,255,255,0.05)',
  },
  viewerMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  viewerName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e8eaf0',
  },
  viewerEmail: {
    fontSize: 12,
    color: 'rgba(232,234,240,0.45)',
    wordBreak: 'break-all',
  },
  viewerDate: {
    flexShrink: 0,
    fontSize: 12,
    color: 'rgba(232,234,240,0.5)',
  },
}
