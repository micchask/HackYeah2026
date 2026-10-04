import type { TurnKind } from '../app/navigation'

// Strzałka manewru w karcie nawigacji (jak w mapach Google): prosto, skręt, odbicie, zawracanie
const PATHS: Record<TurnKind, string> = {
  straight: 'M12 21V4m-6 6 6-6 6 6',
  start: 'M12 21V4m-6 6 6-6 6 6',
  right: 'M7 21v-8a4 4 0 0 1 4-4h9m-5-5 5 5-5 5',
  left: 'M17 21v-8a4 4 0 0 0-4-4H4m5-5-5 5 5 5',
  'slight-right': 'M8 21v-6l9-9m-7 0h7v7',
  'slight-left': 'M16 21v-6L7 6m7 0H7v7',
  uturn: 'M8 21V9a4 4 0 0 1 8 0v6m-4-3 4 4 4-4',
  arrive:
    'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
}

export function TurnIcon({ kind, size = 48 }: { kind: TurnKind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[kind]} />
    </svg>
  )
}
