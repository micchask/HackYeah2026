// Karta miejsca (plan §5.5) - zrobi #93. Szkielet: na razie okienko miejsca jest na mapie.
import type { SelectedPlace } from '../../app/selectedPlace'

export function PlacePanel({ place }: { place: SelectedPlace }) {
  const name =
    place.kind === 'place'
      ? (place.place.name ?? 'Miejsce')
      : place.kind === 'search'
        ? place.result.label
        : 'Instytucja'
  return (
    <section className="card">
      <p>{name}</p>
      <p className="meta">Karta miejsca w przygotowaniu (#93).</p>
    </section>
  )
}
