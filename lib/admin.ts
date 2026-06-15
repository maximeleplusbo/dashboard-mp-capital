// lib/admin.ts

// Emails autorisés par défaut. On peut en ajouter d'autres via la variable
// d'environnement ADMIN_EMAILS (valeurs séparées par des virgules).
const DEFAULT_ADMIN_EMAILS = ['maxime.poujaud@gmail.com']

function buildAdminEmails(): string[] {
  // Set pour dédupliquer, tout en minuscules pour comparer sans tenir compte de la casse.
  const emails = new Set<string>(DEFAULT_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()))

  const fromEnv = process.env.ADMIN_EMAILS
  if (fromEnv) {
    for (const raw of fromEnv.split(',')) {
      const email = raw.trim().toLowerCase()
      if (email) emails.add(email)
    }
  }

  return Array.from(emails)
}

export const ADMIN_EMAILS = buildAdminEmails()

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}
