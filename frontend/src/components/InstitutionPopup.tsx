import type { Institution, InstitutionAttribute } from '../api/client'
import { formatDate } from './format'
import { AlertIcon } from './icons'
import { MapPopupCard, type MapPopupActions } from './MapPopupCard'

type Status = InstitutionAttribute['status']

// Brak informacji ma osobny, neutralny status - nigdy nie wygląda jak "dostępne"
const STATUS: Record<Status, { label: string; badge: string }> = {
  confirmed: { label: 'potwierdzone', badge: 'badge-verified' },
  confirmed_no_date: { label: 'bez daty weryfikacji', badge: 'badge-outdated' },
  unknown: { label: 'brak informacji', badge: 'badge-unverified' },
}

interface Props extends MapPopupActions {
  institution: Institution
}

/** Okienko instytucji: dostępność z deklaracji dostępności (BIP). */
export function InstitutionPopup({ institution: inst, ...actions }: Props) {
  const attributes = inst.attributes ?? []

  return (
    <MapPopupCard
      id={inst.id}
      kind={inst.kind}
      title={inst.name}
      subtitle={inst.address}
      {...actions}
      details={
        <>
          {inst.location && !inst.location.exact && (
            <p className="callout callout-warning">
              <AlertIcon size={18} />
              <span>Punkt na mapie jest przybliżony – adres nie ma numeru budynku.</span>
            </p>
          )}
          <h3>Dostępność</h3>
          <ul className="attributes">
            {attributes.map((a) => {
              const status = STATUS[a.status]
              return (
                <li key={a.category} className="attribute institution-attribute">
                  <span className="attribute-main">
                    {a.label}: <strong>{a.value ?? 'brak informacji'}</strong>
                  </span>
                  <span className="attribute-meta">
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                    <span className="meta">
                      pewność {Math.round(a.confidence * 100)}%
                      {a.last_verified ? ` · ${formatDate(a.last_verified)}` : ''}
                    </span>
                  </span>
                  {a.note && <span className="meta institution-note">{a.note}</span>}
                </li>
              )
            })}
          </ul>
          <p className="meta">
            Źródło: {attributes[0]?.source ?? 'deklaracja dostępności'}.
            {inst.location && ` Lokalizacja: ${inst.location.source}.`}
          </p>
        </>
      }
    />
  )
}
