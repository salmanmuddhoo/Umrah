/**
 * Light grey surfaces with an indigo accent and a warm amber highlight.
 * The `brand*` scale is the accent; change it here to recolour the whole app.
 */
export const colors = {
  brand50: '#eef1fd',
  brand100: '#e0e5fb',
  brand200: '#c3cbf7',
  brand600: '#4f56d3',
  brand700: '#3f44b8',
  brand800: '#33378f',
  brand900: '#1f2257',
  gold100: '#fdf0d5',
  gold400: '#f5a524',
  gold600: '#a15c00',
  /** The page background. */
  sand: '#f2f3f7',
  white: '#ffffff',
  text: '#1b1d2a',
  muted: '#667085',
  border: '#e3e5ec',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  amber: '#92400e',
  amberBg: '#fef3c7',
  slateBg: '#e4e7ec',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { md: 10, lg: 16, pill: 999 } as const;
