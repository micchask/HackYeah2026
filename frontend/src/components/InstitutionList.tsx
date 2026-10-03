import type { Institution } from '../api/client'

interface Props {
  institutions: Institution[]
  selected: string | null
  onSelect: (id: string) => void
}

/** Tekstowa alternatywa warstwy instytucji na mapie - wybór także z klawiatury. */
export function InstitutionList({ institutions, selected, onSelect }: Props) {
  if (!institutions.length) return null
  return (
    <section className="card" aria-labelledby="institutions-heading">
      <h2 id="institutions-heading">Instytucje publiczne</h2>
      <p className="meta">
        Dane z deklaracji dostępności (BIP). Wybierz instytucję albo kliknij jej punkt na mapie.
      </p>
      <details className="institution-list">
        <summary>Pokaż listę ({institutions.length})</summary>
        <ul>
          {institutions.map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                className="institution-button"
                aria-pressed={inst.id === selected}
                onClick={() => onSelect(inst.id)}
              >
                <span>{inst.name}</span>
                <span className="meta">
                  {inst.kind} · {inst.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
