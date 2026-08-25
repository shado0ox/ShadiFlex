import React from 'react';

interface ShadiFlexLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  showSubtitle?: boolean;
  subtitleText?: string;
  variant?: 'dark' | 'light' | 'white';
  showIconOnly?: boolean;
}

export const ShadiFlexLogo: React.FC<ShadiFlexLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  subtitleText,
  variant = 'dark',
  showIconOnly = false,
}) => {
  // Dimensions and scaling based on size
  const sizeMap = {
    xs: { width: 90, height: 28, textClass: 'text-xs', subClass: 'text-[8px]' },
    sm: { width: 125, height: 38, textClass: 'text-sm', subClass: 'text-[9px]' },
    md: { width: 155, height: 48, textClass: 'text-base', subClass: 'text-[10px]' },
    lg: { width: 210, height: 64, textClass: 'text-xl', subClass: 'text-xs' },
    xl: { width: 270, height: 82, textClass: 'text-2xl', subClass: 'text-sm' },
    '2xl': { width: 340, height: 104, textClass: 'text-3xl', subClass: 'text-base' },
    hero: { width: 420, height: 128, textClass: 'text-4xl', subClass: 'text-lg' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const navyColor = variant === 'light' || variant === 'white' ? '#FFFFFF' : '#0B1A30';
  const greenColor = '#00B87C';

  if (showIconOnly) {
    return (
      <div
        className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
        dir="ltr"
        style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
      >
        <svg
          viewBox="0 0 64 64"
          width={currentSize.height}
          height={currentSize.height}
          fill="none"
          dir="ltr"
          style={{ direction: 'ltr' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shadiFlexIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#00A86B" />
            </linearGradient>
            <linearGradient id="shadiFlexBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B1A30" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
          </defs>

          {/* Rounded Squircle Container */}
          <rect width="64" height="64" rx="16" fill={variant === 'white' ? 'white' : 'url(#shadiFlexBgGrad)'} />

          {/* Dynamic Checkmark Arrow */}
          <g transform="translate(11, 14)">
            {/* Tick Mark ending in arrow */}
            <path
              d="M 5 22 L 15 32 L 34 8"
              stroke="url(#shadiFlexIconGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrowhead */}
            <polygon
              points="32,2 43,8 36,20"
              fill="url(#shadiFlexIconGrad)"
            />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none shrink-0 ${className}`}
      dir="ltr"
      style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
    >
      <svg
        viewBox="0 0 280 75"
        width={currentSize.width}
        height={currentSize.height}
        fill="none"
        dir="ltr"
        style={{ direction: 'ltr', overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shadiFlexGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#00A86B" />
          </linearGradient>
          <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10B981" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Left Icon Mark: Dynamic Growth Checkmark-Arrow */}
        <g transform="translate(6, 12)">
          {/* Background Badge Accent */}
          <rect
            x="0"
            y="2"
            width="48"
            height="48"
            rx="14"
            fill={variant === 'light' || variant === 'white' ? 'rgba(255,255,255,0.15)' : '#F0FDF4'}
            stroke={variant === 'light' || variant === 'white' ? 'rgba(255,255,255,0.25)' : '#DCFCE7'}
            strokeWidth="1.5"
          />

          {/* Growth Checkmark-Arrow */}
          <g transform="translate(6, 7) scale(0.85)">
            <path
              d="M 6 22 L 14 30 L 32 8"
              stroke="url(#shadiFlexGreenGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="30,2 40,8 34,19"
              fill="url(#shadiFlexGreenGrad)"
            />
          </g>
        </g>

        {/* 2. Unified High-Precision Brand Typography */}
        <g transform="translate(64, 46)">
          <text
            x="0"
            y="0"
            direction="ltr"
            textAnchor="start"
            style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
            fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="36"
            fontWeight="900"
            letterSpacing="-0.8"
          >
            {/* Shadi */}
            <tspan fill={navyColor} fontWeight="900">
              Shadi
            </tspan>

            {/* Flex in Brand Emerald Green */}
            <tspan fill="url(#shadiFlexGreenGrad)" fontWeight="900">
              Flex
            </tspan>
          </text>

          {/* Stylized Floating Accent Arrow over the 'F' */}
          <g transform="translate(94, -32) scale(0.65)" filter="url(#subtleGlow)">
            <path
              d="M 2 14 L 8 20 L 22 4"
              stroke="url(#shadiFlexGreenGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="20,0 28,4 23,12"
              fill="url(#shadiFlexGreenGrad)"
            />
          </g>
        </g>

        {/* 3. Small Clean Tagline inside SVG for crispness */}
        <g transform="translate(66, 62)">
          <text
            x="0"
            y="0"
            direction="ltr"
            textAnchor="start"
            style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}
            fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="1.8"
            fill={variant === 'light' || variant === 'white' ? '#A7F3D0' : '#64748B'}
          >
            CLOUD ERP • ZATCA PHASE 2
          </text>
        </g>
      </svg>

      {showSubtitle && subtitleText && (
        <span
          className={`font-semibold tracking-wider uppercase mt-1 text-center ${currentSize.subClass} ${
            variant === 'light' || variant === 'white' ? 'text-emerald-300' : 'text-slate-500'
          }`}
        >
          {subtitleText}
        </span>
      )}
    </div>
  );
};
