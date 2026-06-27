// lib/email.ts
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DOCUMENTS_URL = 'https://account.mpcapitalfund.com/dashboard/documents'

/**
 * Notifie des clients qu'un nouveau document est disponible.
 * Best-effort : si Resend n'est pas configuré (clé/expéditeur absents) ou si
 * un envoi échoue, on n'interrompt jamais le dépôt du document. Les emails
 * sont envoyés individuellement (pas d'exposition des adresses entre clients).
 */
export async function notifyNewDocument(recipients: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const unique = Array.from(new Set(recipients.map((e) => e.trim()).filter(Boolean)))

  if (!apiKey || !from || unique.length === 0) return // email désactivé / rien à envoyer

  const subject = 'Nouveau document disponible — MP Capital'
  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a2e;line-height:1.6">` +
    `<p>Bonjour,</p>` +
    `<p>Un nouveau document est disponible dans votre espace <strong>MP Capital</strong>.</p>` +
    `<p><a href="${DOCUMENTS_URL}" style="display:inline-block;background:#c8a96e;color:#0d0f14;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Consulter mes documents</a></p>` +
    `<p style="color:#6b7280;font-size:13px">— MP Capital</p>` +
    `</div>`

  await Promise.allSettled(
    unique.map(async (to) => {
      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to: [to], subject, html }),
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          console.error('Resend: envoi échoué', to, res.status, detail.slice(0, 200))
        }
      } catch (err) {
        console.error('Resend: erreur réseau', to, err)
      }
    })
  )
}
