/**
 * Emerald green on light green surfaces, with gold highlights.
 * The `brand*` scale is the emerald; change it here to recolour the whole app.
 */
export const colors = {
  brand50: '#ecfdf5',
  brand100: '#d1fae5',
  brand200: '#a7f3d0',
  brand600: '#059669',
  brand700: '#047857',
  brand800: '#065f46',
  brand900: '#064e3b',
  gold100: '#fbf1d3',
  gold400: '#e6bf4a',
  gold600: '#7a5c0c',
  /** The page background: a very light green. */
  sand: '#f0f9f4',
  white: '#ffffff',
  text: '#12241c',
  muted: '#5b6f66',
  border: '#d6e7dd',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  amber: '#92400e',
  amberBg: '#fef3c7',
  slateBg: '#dfece5',
  /** Translucent tints for the star pattern drawn over banners and backgrounds. */
  patternGold: '#f3d57a2b',
  patternEmerald: '#0478571f',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { md: 10, lg: 16, pill: 999 } as const;
