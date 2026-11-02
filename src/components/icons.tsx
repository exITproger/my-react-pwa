import type { SVGProps } from 'react'

/**
 * Плоские SVG-иконки в стиле Lucide — заменяют эмодзи в интерфейсе.
 * Цвет наследуется через currentColor, размер задаётся классом.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps) {
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
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </Icon>
)

export const NoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 5-5" />
  </Icon>
)

export const FlameIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c1 3-1 4.5-2.5 6C7.5 11 6 13 6 15.5A6 6 0 0 0 18 16c0-2.5-1-4-2-5.5-.7 1-1.5 1.5-2.5 1.5.8-2.5.3-6-1.5-9Z" />
  </Icon>
)

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
  </Icon>
)

export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </Icon>
)

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </Icon>
)

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
)

export const PaletteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2 0-2.5 1.5-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5Z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" />
  </Icon>
)

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </Icon>
)

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Icon>
)

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h16" />
    <path d="M7 16v-5M12 16V7M17 16v-8" />
  </Icon>
)

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icon>
)

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8v.5" />
  </Icon>
)

export const WarnIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4M12 17.5v.5" />
  </Icon>
)

export const CoinsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="6" />
    <path d="M15.5 4.2A6 6 0 1 1 9 20a6 6 0 0 0 6.5-15.8Z" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3h6l-1 6 4 3v2H6v-2l4-3-1-6Z" />
    <path d="M12 14v7" />
  </Icon>
)

export const LogoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3.5" />
    <path d="M9 2.5V1M9 17v-1.5M2.5 9H1M17 9h-1.5M4.4 4.4 3.3 3.3M13.7 13.7l-1.1-1.1M4.4 13.7 3.3 14.8M13.7 4.4l-1.1 1.1" />
    <path d="M14 19a3.5 3.5 0 1 1 .6-6.95A4.5 4.5 0 0 1 23 14.5 3.5 3.5 0 0 1 19.5 19H14Z" />
  </Icon>
)

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const TypeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6V4h16v2M9 20h6M12 4v16" />
  </Icon>
)

export const CornerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V10a6 6 0 0 1 6-6h10" />
  </Icon>
)

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 19 5-5 3 3 3-3 3 3" />
  </Icon>
)
