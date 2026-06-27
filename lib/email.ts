// lib/email.ts
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DOCUMENTS_URL = 'https://account.mpcapitalfund.com/dashboard/documents'
const LOGO_URL = 'https://framerusercontent.com/images/5OUDwHm9zVSVlHsm0LE0jEts.png?width=512&height=117'
// Expéditeur figé sur le sous-domaine vérifié dans Resend.
const FROM = 'MP Capital <notifications@notification.mpcapitalfund.com>'

function buildHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #ececf0;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#c8a96e;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:36px 40px 12px;">
              <img src="${LOGO_URL}" alt="MP Capital" width="180" style="display:block;width:180px;max-width:60%;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 44px 0;">
              <h1 style="margin:16px 0 10px;font-size:21px;font-weight:600;color:#1a1a2e;text-align:center;letter-spacing:-0.01em;">Nouveau document disponible</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4b5563;text-align:center;">
                Un nouveau document vient d'être ajouté à votre espace investisseur <strong style="color:#1a1a2e;">MP&nbsp;Capital</strong>. Vous pouvez le consulter dès maintenant.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 8px;">
                <tr>
                  <td style="border-radius:10px;background:#c8a96e;">
                    <a href="${DOCUMENTS_URL}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:600;color:#1a1a2e;text-decoration:none;border-radius:10px;">Consulter mes documents</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;text-align:center;word-break:break-all;">
                ou copiez ce lien : <a href="${DOCUMENTS_URL}" style="color:#c8a96e;text-decoration:none;">${DOCUMENTS_URL}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 44px 34px;">
              <div style="border-top:1px solid #f0f0f3;padding-top:18px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                  Vous recevez cet email car vous disposez d'un espace investisseur MP Capital.<br/>© MP Capital
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Notifie des clients qu'un nouveau document est disponible.
 * Best-effort : si la clé Resend est absente ou si un envoi échoue, on
 * n'interrompt jamais le dépôt du document. Envois individuels (pas
 * d'exposition des adresses entre clients).
 */
export async function notifyNewDocument(recipients: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const unique = Array.from(new Set(recipients.map((e) => e.trim()).filter(Boolean)))
  if (!apiKey || unique.length === 0) return

  const subject = 'Nouveau document disponible — MP Capital'
  const html = buildHtml()

  await Promise.allSettled(
    unique.map(async (to) => {
      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: FROM, to: [to], subject, html }),
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
