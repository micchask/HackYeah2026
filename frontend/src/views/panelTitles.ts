import type { ListKind, PanelState } from '../app/state'

export const LIST_TITLE: Record<ListKind, string> = {
  places: 'Miejsca w pobliżu',
  health: 'Toalety i zdrowie',
  barriers: 'Bariery w widoku',
  institutions: 'Instytucje publiczne',
  events: 'Wydarzenia',
  gaps: 'Braki danych',
}

const TITLE: Record<Exclude<PanelState['kind'], 'list'>, string> = {
  explore: 'Dla Ciebie',
  route: 'Trasa',
  place: 'Miejsce',
  report: 'Zgłoś problem',
}

export function panelTitle(panel: PanelState | undefined): string {
  if (!panel) return TITLE.explore
  return panel.kind === 'list' ? LIST_TITLE[panel.list] : TITLE[panel.kind]
}
