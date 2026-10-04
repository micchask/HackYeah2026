// Wskazówki głosowe nawigacji - synteza mowy przeglądarki po polsku.

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : null
  } catch {
    return null
  }
}

export function canSpeak(): boolean {
  return synth() !== null
}

/** Mówi tekst, przerywając poprzednią wskazówkę (nowa jest zawsze ważniejsza). */
export function speak(text: string): void {
  const s = synth()
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return
  s.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pl-PL'
  const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith('pl'))
  if (voice) utterance.voice = voice
  s.speak(utterance)
}

export function stopSpeaking(): void {
  synth()?.cancel()
}

const MUTE_KEY = 'kbb-nav-muted'

export function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // brak localStorage - wyciszenie tylko do końca sesji
  }
}

/** iPhone mówi dopiero po pierwszej wypowiedzi w geście użytkownika - wołamy przy „Rozpocznij”. */
export function unlockSpeech(): void {
  const s = synth()
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return
  s.speak(new SpeechSynthesisUtterance(''))
}
