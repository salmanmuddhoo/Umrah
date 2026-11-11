import { render } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { colors } from '@/theme';

import { TabIcon, TAB_LIFT } from './TabIcon';

jest.mock('@expo/vector-icons', () => {
  const { Text } = jest.requireActual('react-native');
  return { Ionicons: ({ name, color }: { name: string; color: string }) => <Text>{`${name}:${color}`}</Text> };
});

afterEach(() => {
  jest.restoreAllMocks();
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
});

const icon = (focused: boolean) => <TabIcon name="home" focused={focused} color="#64748b" size={24} />;

describe('TabIcon', () => {
  it('springs up when its tab is selected and back down when another is', async () => {
    const spring = jest.spyOn(Animated, 'spring');
    const view = await render(icon(false));
    await view.rerender(icon(true));
    expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
    await view.rerender(icon(false));
    expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  });

  it('rises by a visible amount', () => {
    expect(TAB_LIFT).toBeGreaterThanOrEqual(8);
  });

  it('turns white on its filled bubble when selected, and keeps the bar colour otherwise', async () => {
    const view = await render(icon(true));
    expect(view.getByText(`home:${colors.white}`)).toBeTruthy();
    await view.rerender(icon(false));
    expect(view.getByText('home:#64748b')).toBeTruthy();
  });

  it('starts raised when the app opens on that tab, without animating', async () => {
    const spring = jest.spyOn(Animated, 'spring');
    await render(icon(true));
    // The opening spring only confirms the resting position (1 → 1).
    expect(spring.mock.calls.every(([, config]) => config.toValue === 1)).toBe(true);
  });
});
