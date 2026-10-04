import type { PanelState } from '../app/state'

export const PANEL_TITLE: Record<PanelState['kind'], string> = {
  explore: 'Dla Ciebie',
  route: 'Trasa',
  place: 'Miejsce',
  report: 'Zgłoś barierę',
}
