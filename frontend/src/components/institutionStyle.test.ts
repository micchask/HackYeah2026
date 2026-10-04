import { describe, expect, it } from 'vitest'
import { institutionMarkerLabel, shortInstitutionName } from './institutionStyle'

describe('shortInstitutionName', () => {
  it('skraca nazwy jednostek, ale zostawia kontekst', () => {
    expect(shortInstitutionName('Urząd Miasta Krakowa — Wydział Geodezji')).toBe(
      'UMK · Wydział Geodezji',
    )
    expect(shortInstitutionName('Zarząd Dróg Miasta Krakowa — siedziba główna')).toBe(
      'ZDMK · siedziba główna',
    )
    expect(shortInstitutionName('Muzeum Krakowa — Pałac Krzysztofory')).toBe('Pałac Krzysztofory')
    expect(shortInstitutionName('Teatr KTO')).toBe('Teatr KTO')
  })

  it('bierze pierwszy wydział i przycina długie podpisy', () => {
    const short = shortInstitutionName(
      'Urząd Miasta Krakowa — Wydział Ewidencji Pojazdów i Kierowców / Spraw Administracyjnych',
    )
    expect(short.startsWith('UMK · Wydział Ewidencji')).toBe(true)
    expect(short.length).toBeLessThanOrEqual(34)
    expect(short.endsWith('…')).toBe(true)
  })
})

describe('institutionMarkerLabel (WCAG 2.5.3 Label in Name)', () => {
  it('zaczyna się od widocznego podpisu znacznika i zawiera pełną nazwę', () => {
    const name = 'Urząd Miasta Krakowa — Magistrat (Kancelaria Prezydenta)'
    const visible = shortInstitutionName(name).replace(/…$/, '').trimEnd()
    const label = institutionMarkerLabel(name)
    expect(label.startsWith(visible)).toBe(true)
    expect(label).toContain(name)
  })

  it('nie powtarza nazwy, gdy podpis jest pełną nazwą', () => {
    expect(institutionMarkerLabel('Teatr KTO')).toBe('Teatr KTO – pokaż szczegóły')
  })
})
