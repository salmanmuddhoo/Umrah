import { fireEvent, render, screen } from '@testing-library/react-native';

import { PinPad } from './PinPad';

async function tap(...keys: string[]) {
  for (const key of keys) await fireEvent.press(screen.getByRole('button', { name: key }));
}

describe('PinPad', () => {
  it('reports the PIN as soon as the fourth digit is entered, then clears', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="Enter your PIN" onComplete={onComplete} />);
    await tap('4', '8', '2');
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('3 of 4 digits entered')).toBeTruthy();
    await tap('1');
    expect(onComplete).toHaveBeenCalledWith('4821');
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
  });

  it('keeps leading zeros', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="Enter your PIN" onComplete={onComplete} />);
    await tap('0', '0', '4', '2');
    expect(onComplete).toHaveBeenCalledWith('0042');
  });

  it('lets a mistyped digit be deleted', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="Enter your PIN" onComplete={onComplete} />);
    await tap('1', '2', 'Delete', '3', '4', '5');
    expect(onComplete).toHaveBeenCalledWith('1345');
  });

  it('never shows the digits that were typed', async () => {
    await render(<PinPad title="Enter your PIN" onComplete={() => {}} />);
    await tap('7', '7');
    // Only the two keypad "7" keys exist; nothing echoes the entry.
    expect(screen.queryByText('77')).toBeNull();
    expect(screen.getAllByText('7')).toHaveLength(1);
  });

  it('ignores taps while a PIN is being checked', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="Enter your PIN" busy onComplete={onComplete} />);
    await tap('1', '2', '3', '4');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the error from the last attempt', async () => {
    await render(<PinPad title="Enter your PIN" error="Wrong PIN. 4 attempts left." onComplete={() => {}} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Wrong PIN. 4 attempts left.')).toBeTruthy();
  });
});
