import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';

import { FadeInUp, PressableScale, ProgressBar, SkeletonList, stagger } from './motion';

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

describe('ProgressBar', () => {
  it('reports its value to screen readers as a percentage', async () => {
    await render(<ProgressBar value={0.25} label="Checklist progress" />);
    expect(screen.getByRole('progressbar', { name: 'Checklist progress' }).props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });
  });

  it('clamps out-of-range and invalid values', async () => {
    const view = await render(<ProgressBar value={1.7} label="p" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
    await view.rerender(<ProgressBar value={NaN} label="p" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('animates to a new value', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await render(<ProgressBar value={0.2} label="p" />);
    await view.rerender(<ProgressBar value={0.8} label="p" />);
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.8, duration: 500 }));
  });
});

describe('SkeletonList / stagger', () => {
  it('announces loading while showing placeholder cards', async () => {
    await render(<SkeletonList count={2} />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('staggers the first few list items and then stops adding delay', () => {
    expect([0, 1, 2, 6, 7, 40].map((i) => stagger(i))).toEqual([0, 60, 120, 360, 360, 360]);
  });
});
