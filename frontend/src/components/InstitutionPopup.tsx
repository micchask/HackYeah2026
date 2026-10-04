import type { Institution } from '../api/client'
import { MapPopupCard, type MapPopupActions } from './MapPopupCard'

interface Props extends MapPopupActions {
  institution: Institution
}

/** Dymek instytucji. Dostępność z deklaracji (BIP) - w karcie miejsca w panelu. */
export function InstitutionPopup({ institution: inst, ...actions }: Props) {
  return (
    <MapPopupCard
      id={inst.id}
      kind={inst.kind}
      title={inst.name}
      subtitle={inst.address}
      {...actions}
    />
  )
}
