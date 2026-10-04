// Krótkie nazwy i ikony trybów do interfejsu (ekran startowy, chip profilu).
// Pełne opisy i preferencje przychodzą z GET /api/profiles (useModes).
import type { ComponentType, SVGProps } from 'react'
import { CameraIcon, SeniorIcon, StrollerIcon, UserIcon, WheelchairIcon } from '../components/icons'
import type { ProfileId } from './state'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export interface ModeMeta {
  /** Nazwa na kafelku startowym */
  title: string
  /** Nazwa na chipie profilu */
  short: string
  /** Jedna linia pod nazwą */
  tagline: string
  Icon: IconComponent
}

export const MODE_META: Record<ProfileId, ModeMeta> = {
  wheelchair: {
    title: 'Osoba na wózku',
    short: 'Wózek',
    tagline: 'Bez schodów, łagodne podjazdy',
    Icon: WheelchairIcon,
  },
  senior: {
    title: 'Senior',
    short: 'Senior',
    tagline: 'Spokojne tempo, mniej podejść',
    Icon: SeniorIcon,
  },
  tourist: {
    title: 'Turysta',
    short: 'Turysta',
    tagline: 'Zabytki i najkrótsze trasy',
    Icon: CameraIcon,
  },
  stroller: {
    title: 'Rodzina z wózkiem dziecięcym',
    short: 'Rodzina',
    tagline: 'Gładkie chodniki, przewijaki',
    Icon: StrollerIcon,
  },
  guest: {
    title: 'Gość',
    short: 'Gość',
    tagline: 'Mapa bez personalizacji',
    Icon: UserIcon,
  },
}

export const MODE_ORDER: ProfileId[] = ['wheelchair', 'senior', 'tourist', 'stroller', 'guest']
