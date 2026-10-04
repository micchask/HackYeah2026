import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const WheelchairIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="16" cy="4" r="1" />
    <path d="m18 19 1-7-6 1" />
    <path d="m5 8 3-3 5.5 3-2.36 3.5" />
    <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
    <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
  </Icon>
)

export const StrollerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 10V3a7 7 0 0 1 7 7" />
    <path d="M3 10h14a6 6 0 0 1-6 6H8a5 5 0 0 1-5-5z" />
    <path d="M17 10l2-6h2" />
    <circle cx="7" cy="20" r="1.8" />
    <circle cx="15" cy="20" r="1.8" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
)

export const SwapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </Icon>
)

export const RouteIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
)

export const StairsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 20h5v-5h5v-5h5V5h3" />
  </Icon>
)

export const CobbleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="7" height="6" rx="1.5" />
    <rect x="13" y="4" width="8" height="6" rx="1.5" />
    <rect x="3" y="13" width="9" height="7" rx="1.5" />
    <rect x="15" y="13" width="6" height="7" rx="1.5" />
  </Icon>
)

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Icon>
)

export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <path d="M1 14h6M9 8h6M17 16h6" />
  </Icon>
)

export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </Icon>
)

export const LogoMark = (p: IconProps) => (
  <svg width={p.size ?? 32} height={p.size ?? 32} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#0b5cad" />
    <path
      d="M9 23c0-4 3-5 7-5s7-1 7-5"
      fill="none"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <circle cx="9" cy="23" r="2.6" fill="#7fd6a4" />
    <circle cx="23" cy="10" r="2.6" fill="#fff" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const SeniorIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="4.5" r="2" />
    <path d="M11 7.5 9.5 14l2.5 2.5V21" />
    <path d="M9.5 14 7 21" />
    <path d="M10.5 9.5 14 11" />
    <path d="M16 11.5V21" />
  </Icon>
)

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
)

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
)

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Icon>
)

export const PanelIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </Icon>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const ToiletIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="4.5" r="1.5" />
    <circle cx="17" cy="4.5" r="1.5" />
    <path d="M5 8h4l1 7H8v6M6 15v6" />
    <path d="m17 8-3 8h6zM16 16v5M18 16v5" />
  </Icon>
)

export const ParkingIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5" />
  </Icon>
)

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
)

export const BenchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h16M3 14h18M6 14v5M18 14v5M6 10V6M18 10V6" />
  </Icon>
)

export const BuildingIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 21h18M5 21V10l7-5 7 5v11" />
    <path d="M9 21v-6h6v6M9 11h.01M15 11h.01" />
  </Icon>
)

export const CoffeeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
    <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" />
  </Icon>
)

export const MegaphoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4h3l8 4V6L7 10z" />
    <path d="M19 9a4 4 0 0 1 0 6M8 14l1 5h3l-1-4" />
  </Icon>
)

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5-9 9" />
  </Icon>
)

export const CarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 16V11l2-5h10l2 5v5M3 11h18v6H3z" />
    <circle cx="7.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </Icon>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </Icon>
)

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)
