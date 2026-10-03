import type { Place } from '../api/client'

export function PlaceList({ places }: { places: Place[] }) {
  return (
    <section aria-labelledby="places-heading">
      <h2 id="places-heading">Miejsca w okolicy</h2>
      <ul>
        {places.map((p) => (
          <li key={p.id}>
            <strong>{p.name ?? 'Bez nazwy'}</strong>
            <ul>
              {p.attributes?.map((a) => (
                <li key={a.key}>
                  {a.key}: {String(a.value)} (źródło: {a.provenance.source}, pewność{' '}
                  {Math.round(a.confidence * 100)}%)
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
