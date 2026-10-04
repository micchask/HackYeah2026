import type { Difficulty } from '../api/client'

// Kontrast min. 3:1 względem jasnego tła mapy (WCAG 1.4.11)
export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: '#1a7f37',
  moderate: '#b35900',
  hard: '#c4122f',
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'łatwy odcinek',
  moderate: 'utrudnienia lub brak danych',
  hard: 'trudny odcinek (bariera na trasie)',
}
