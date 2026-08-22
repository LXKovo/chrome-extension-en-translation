/**
 * 内联 SVG 图标集合（stroke 风格，统一继承 currentColor）。
 * 用于替代 emoji，保证跨平台渲染一致、视觉更精致；不引入额外图标依赖。
 */
import type { SVGProps } from 'react';

export interface IconProps {
  className?: string;
  size?: number;
}

/** 构建图标 SVG 公共属性 */
function svgBase({ className, size = 16 }: IconProps): SVGProps<SVGSVGElement> {
  return {
    className,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function TranslateIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  );
}

export function StopIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.4 7.3 5 12 5s8.58 3.4 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.6 16.7 19 12 19s-8.58-3.4-9.94-6.65Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c4.7 0 8.58 3.4 9.94 6.65a1 1 0 0 1 0 .7 10.4 10.4 0 0 1-1.86 2.77" />
      <path d="M6.61 6.61A10.4 10.4 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.42 15.6 7.3 19 12 19c1.31 0 2.57-.28 3.69-.79" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...svgBase(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
