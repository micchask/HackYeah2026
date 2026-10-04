// Losowy identyfikator urządzenia do głosowania na zgłoszenia (#62) - bez kont i danych osobowych.
// Serwer zapisuje tylko jego skrót; dzięki niemu jedna osoba nie zagłosuje dwa razy,
// a autor nie potwierdzi własnego zgłoszenia.
const KEY = 'kbb.device'
let fallback: string | null = null

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`
}

export function getDeviceId(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved
    const id = randomId()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    // tryb prywatny / zablokowane dane strony: identyfikator tylko na czas tej karty
    fallback ??= randomId()
    return fallback
  }
}
