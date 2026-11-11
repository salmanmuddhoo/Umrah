import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';

import { FadeInUp, PressableScale } from './motion';

afterEach(() => {
  jest.restoreAllMocks();
  // React Native's test setup already mocks this, so restoreAllMocks does not undo an override.
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
});

describe('FadeInUp', () => {
  it('renders its children (they are in the tree from the first frame, for screen readers and tests)', async () => {
    await render(
      <FadeInUp delay={300}>
        <Text>Visa guide</Text>
      </FadeInUp>,
    );
    expect(screen.getByText('Visa guide')).toBeTruthy();
  });

  it('animates over time, after the stagger delay', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await render(
      <FadeInUp delay={120}>
        <Text>Card</Text>
      </FadeInUp>,
    );
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 420, delay: 120 }));
  });

  it('appears instantly when the phone is set to reduce motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    await render(
      <FadeInUp delay={120}>
        <Text>Card</Text>
      </FadeInUp>,
    );
    await act(async () => {});
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 0, delay: 0 }));
  });
});

describe('PressableScale', () => {
  it('still works as a button', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale accessibilityRole="button" accessibilityLabel="Transport" onPress={onPress}>
        <Text>Transport</Text>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Transport' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shrinks while held and springs back on release', async () => {
    const spring = jest.spyOn(Animated, 'spring');
    await render(
      <PressableScale accessibilityRole="button" accessibilityLabel="Transport" onPress={() => {}}>
        <Text>Transport</Text>
      </PressableScale>,
    );
    // userEvent sends the real press-in / press-out sequence, unlike fireEvent.press.
    await userEvent.setup().press(screen.getByRole('button'));
    expect(spring.mock.calls.map(([, config]) => config.toValue)).toEqual([0.96, 1]);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale accessibilityRole="button" accessibilityLabel="Ad" disabled onPress={onPress}>
        <Text>Ad</Text>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
