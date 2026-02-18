/**
 * Reusable table cell styles for DPWH forms
 * Using Tailwind CSS utility classes
 */

// ============================================================================
// Base Table Styles
// ============================================================================

export const tableBase = 'w-full border-collapse text-[0.65rem] leading-tight';

export const tableGrid = 'w-full border-collapse table-layout-fixed';

// ============================================================================
// Cell Styles
// ============================================================================

export const cellBase = 'border border-black px-1 py-[3px]';

export const cellBorder = 'border border-black';

export const cellText = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const cellPadding = {
  xs: 'px-1 py-[2px]',
  sm: 'px-1 py-[3px]',
  md: 'px-1 py-1',
};

// ============================================================================
// Header Cell Styles
// ============================================================================

export const headerCellBase = `${cellBase} text-[0.55rem] font-normal`;

export const headerDark = 'bg-[#4a4a4a] text-white';

export const headerGray = 'bg-[#808080]';

export const headerLight = 'bg-[#d3d3d3]';

// ============================================================================
// Background Colors for Rows
// ============================================================================

export const rowColors = {
  division: 'bg-[#808080] font-semibold uppercase',
  part: 'bg-[#d3d3d3] font-semibold uppercase',
  subPart: 'bg-[#a9a9a9] font-semibold uppercase',
  total: 'bg-[#696969] text-white font-bold uppercase',
  grandTotal: 'bg-[#4a4a4a] text-white font-bold uppercase',
  normal: '',
};

// ============================================================================
// Font Sizes
// ============================================================================

export const fontSizes = {
  xs: 'text-[7px]',
  sm: 'text-[8px]',
  md: 'text-[8.5px]',
  lg: 'text-[10px]',
  xl: 'text-[0.55rem]',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build a complete cell class string
 */
export function buildCellClass(
  align: 'left' | 'center' | 'right' = 'left',
  size: 'xs' | 'sm' | 'md' = 'sm',
  additionalClasses: string = ''
): string {
  return [
    cellBase,
    cellText[align],
    cellPadding[size],
    additionalClasses,
  ].filter(Boolean).join(' ');
}

/**
 * Build a header cell class string
 */
export function buildHeaderClass(
  bgColor: 'dark' | 'gray' | 'light' = 'dark',
  additionalClasses: string = ''
): string {
  const bgClasses = {
    dark: headerDark,
    gray: headerGray,
    light: headerLight,
  };

  return [
    headerCellBase,
    bgClasses[bgColor],
    additionalClasses,
  ].filter(Boolean).join(' ');
}
