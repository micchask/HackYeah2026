/*
 * Wyszukiwarka miejsc na mapie (jak w Google Maps). Wzorzec ARIA combobox jak w AddressSearch:
 * fokus zostaje w polu, aktywną podpowiedź wskazuje aria-activedescendant.
 */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/interactive-supports-focus, jsx-a11y/click-events-have-key-events */
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { api, type LatLon, type SearchResult } from '../api/client'
import { formatKm, plural } from './format'

const MIN_LENGTH = 2
const DEBOUNCE_MS = 300

const SOURCE_BADGE: Record<SearchResult['source'], string | null> = {
  institution: 'deklaracja dostępności',
  place: null, // ustalane niżej: z danymi albo bez
  address: null,
}

interface Props {
  city: string
  /** Środek widoku mapy - bliższe wyniki wyżej */
  near: LatLon | null
  onSelect: (result: SearchResult) => void
  /** Zapytanie o rodzaj/cechę ("hotel", "przewijak"): pokaż wszystkie wyniki na mapie */
  onShowAll?: (results: SearchResult[], query: string) => void
}

// Pierwsza opcja listy przy zapytaniu o rodzaj - "Pokaż wszystkie na mapie"
type Option = { type: 'all' } | { type: 'result'; result: SearchResult }

type Status = 'idle' | 'loading' | 'done' | 'error'

function badgeFor(r: SearchResult): string | null {
  if (r.source === 'place') return r.place?.attributes?.length ? 'dane o dostępności' : null
  return SOURCE_BADGE[r.source]
}

export function MapSearch({ city, near, onSelect, onShowAll }: Props) {
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const errorId = `${id}-error`

  const [query, setQuery] = useState('')
  const [dirty, setDirty] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const term = query.trim()
  const isCategory = !!onShowAll && results[0]?.match === 'category'
  const options: Option[] = [
    ...(isCategory ? [{ type: 'all' } as const] : []),
    ...results.map((result) => ({ type: 'result' as const, result })),
  ]
  // Zaokrąglony środek - przesuwanie mapy o kilka metrów nie wywołuje nowego zapytania
  const nearKey = near ? `${near.lat.toFixed(3)},${near.lon.toFixed(3)}` : ''

  useEffect(() => {
    if (!dirty || term.length < MIN_LENGTH) return
    const controller = new AbortController()
    const [lat, lon] = nearKey ? nearKey.split(',').map(Number) : [undefined, undefined]
    const timer = setTimeout(async () => {
      setStatus('loading')
      setError(null)
      try {
        const found = await api.search(
          term,
          city,
          lat !== undefined && lon !== undefined ? { lat, lon } : null,
          controller.signal,
        )
        setResults(found)
        setActive(-1)
        setStatus('done')
        setOpen(true)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setResults([])
        setOpen(false)
        setStatus('error')
        setError((err as Error).message)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, dirty, city, nearKey])

  function select(result: SearchResult) {
    onSelect(result)
    setQuery(result.label)
    setDirty(false)
    setOpen(false)
    setStatus('idle')
  }

  function showAll() {
    onShowAll?.(results, term)
    setDirty(false)
    setOpen(false)
    setStatus('idle')
  }

  function choose(option: Option) {
    if (option.type === 'all') showAll()
    else select(option.result)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const count = options.length
    switch (e.key) {
      case 'ArrowDown':
        if (!count) return
        e.preventDefault()
        setOpen(true)
        setActive((i) => (i + 1) % count)
        break
      case 'ArrowUp':
        if (!count) return
        e.preventDefault()
        setOpen(true)
        setActive((i) => (i <= 0 ? count - 1 : i - 1))
        break
      case 'Enter': {
        // Enter bez wybranej podpowiedzi bierze pierwszą - jak w mapach Google
        // (przy zapytaniu o rodzaj pierwsza to "Pokaż wszystkie na mapie")
        const pick = options[active >= 0 ? active : 0]
        if (open && pick) {
          e.preventDefault()
          choose(pick)
        }
        break
      }
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
          setActive(-1)
        } else if (query) {
          e.preventDefault()
          setQuery('')
          setResults([])
          setDirty(false)
        }
        break
    }
  }

  const expanded = open && results.length > 0
  const noResults = status === 'done' && dirty && results.length === 0
  const count = `${results.length} ${plural(results.length, 'wynik', 'wyniki', 'wyników')}`
  const announcement =
    status === 'loading'
      ? 'Szukam…'
      : expanded
        ? isCategory
          ? `${count}. Enter pokazuje wszystkie na mapie, strzałki wybierają jeden.`
          : `${count}. Strzałki wybierają, Enter zatwierdza.`
        : noResults
          ? 'Brak wyników w obszarze demo.'
          : ''

  return (
    <div role="search" className="map-search" aria-label="Szukaj miejsca">
      <label htmlFor={inputId} className="visually-hidden">
        Szukaj miejsca, adresu albo rodzaju (np. apteka)
      </label>
      <input
        id={inputId}
        className="address-input map-search-input"
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={status === 'error' || undefined}
        placeholder="Szukaj miejsca, np. apteka, Wawel, Grodzka 20"
        value={query}
        onChange={(e) => {
          const text = e.target.value
          setQuery(text)
          setDirty(true)
          setActive(-1)
          if (text.trim().length < MIN_LENGTH) {
            setResults([])
            setOpen(false)
            setStatus('idle')
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => {
          if (results.length && dirty) setOpen(true)
        }}
      />
      <div
        id={listId}
        role="listbox"
        aria-label="Wyniki wyszukiwania"
        className="suggestions map-search-results"
        hidden={!expanded}
      >
        {isCategory && (
          <div
            id={`${listId}-0`}
            role="option"
            aria-selected={active === 0}
            className={`suggestion show-all${active === 0 ? ' active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={showAll}
          >
            <span className="suggestion-label">Pokaż wszystkie na mapie ({results.length})</span>
            <span className="suggestion-meta">„{term}” – od najbliższych środka mapy</span>
          </div>
        )}
        {results.map((r, index) => {
          const i = isCategory ? index + 1 : index
          const badge = badgeFor(r)
          const meta = [
            r.kind,
            r.description,
            r.distance_m != null ? formatKm(r.distance_m) : null,
          ].filter(Boolean)
          return (
            <div
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'suggestion active' : 'suggestion'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(r)}
            >
              <span className="suggestion-label">
                {r.label}
                {badge && <span className="badge badge-verified search-badge">{badge}</span>}
              </span>
              {meta.length > 0 && <span className="suggestion-meta">{meta.join(' · ')}</span>}
            </div>
          )
        })}
      </div>
      {noResults && <p className="field-hint map-search-hint">Brak wyników w obszarze demo.</p>}
      {error && (
        <p id={errorId} role="alert" className="field-error map-search-hint">
          {error}
        </p>
      )}
      <output className="visually-hidden" htmlFor={inputId}>
        {announcement}
      </output>
    </div>
  )
}
