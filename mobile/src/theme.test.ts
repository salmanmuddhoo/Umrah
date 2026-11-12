import { colors, gradients } from './theme';

/** WCAG relative luminance and contrast ratio, for checking text stays readable on the palette. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colour palette', () => {
  it.each([
    ['white text on the emerald used for headers and primary buttons', colors.white, colors.brand700],
    ['body text on the light green page', colors.text, colors.sand],
    ['body text on white cards', colors.text, colors.white],
    ['muted text on the light green page', colors.muted, colors.sand],
    ['dark green text on gold buttons', colors.brand900, colors.gold400],
    ['headings on the light green page', colors.brand900, colors.sand],
    ['gold label text on its pale gold background', colors.gold600, colors.gold100],
  ])('%s is readable (contrast at least 4.5:1)', (_what, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['white text on the brand gradient', colors.white, gradients.brand],
    ['white text on the night gradient', colors.white, gradients.night],
    ['dark green text on the gold gradient', colors.brand900, gradients.gold],
    ['dark green text on the pale gold gradient', colors.brand900, gradients.goldSoft],
    ['body text on the page gradient', colors.text, gradients.page],
    ['muted text on the page gradient', colors.muted, gradients.page],
  ])('%s is readable at both ends of the gradient', (_what, fg, stops) => {
    for (const stop of stops) expect(contrast(fg, stop)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps gold lettering legible at both ends of the brand gradient (large text, at least 3:1)', () => {
    for (const stop of gradients.brand) expect(contrast(colors.gold400, stop)).toBeGreaterThanOrEqual(3);
  });

  it('keeps gold lettering legible on emerald banners (large text, at least 3:1)', () => {
    expect(contrast(colors.gold400, colors.brand700)).toBeGreaterThanOrEqual(3);
  });
});
