import { describe, expect, it } from 'vitest'
import { shortInstitutionName } from './institutionStyle'

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
