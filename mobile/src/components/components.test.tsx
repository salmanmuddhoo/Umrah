import { fireEvent, render, screen } from '@testing-library/react-native';

import { pkg, service } from '@/test/fixtures';

import { PackageCard } from './PackageCard';
import { ServiceCard } from './ServiceCard';
import { Button, Chips, Input, Notice, StatusBadge, Toggle } from './ui';
import { VoteButtons } from './VoteButtons';

describe('PackageCard', () => {
  it('shows the price, dates, provider and what is included', async () => {
    await render(<PackageCard pkg={pkg} onPress={() => {}} />);
    expect(screen.getByText('10-day Economy Umrah')).toBeTruthy();
    expect(screen.getByText('$1,450')).toBeTruthy();
    expect(screen.getByText('by Noor Travel')).toBeTruthy();
    expect(screen.getByText('37 seats left')).toBeTruthy();
    expect(screen.getByText(/Departs 15 Dec 2026 · 5 nights Makkah, 4 Madinah/)).toBeTruthy();
    expect(screen.getByText('Flights')).toBeTruthy();
    expect(screen.queryByText('Meals')).toBeNull();
  });

  it('says when a package is fully booked', async () => {
    await render(<PackageCard pkg={{ ...pkg, seatsLeft: 0 }} onPress={() => {}} />);
    expect(screen.getByText('Fully booked')).toBeTruthy();
  });

  it('opens the package when tapped', async () => {
    const onPress = jest.fn();
    await render(<PackageCard pkg={pkg} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ServiceCard', () => {
  it('shows the route, vehicle and per-trip price', async () => {
    await render(<ServiceCard service={service} onPress={() => {}} />);
    expect(screen.getByText('Jeddah Airport → Makkah')).toBeTruthy();
    expect(screen.getByText('SUV')).toBeTruthy();
    expect(screen.getByText('Up to 7 passengers')).toBeTruthy();
    expect(screen.getByText('$75.50')).toBeTruthy();
  });
});

describe('VoteButtons', () => {
  it('reports which arrow was tapped', async () => {
    const onVote = jest.fn();
    await render(<VoteButtons score={12} myVote={0} onVote={onVote} />);
    expect(screen.getByText('12')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Upvote'));
    await fireEvent.press(screen.getByLabelText('Downvote'));
    expect(onVote.mock.calls).toEqual([[1], [-1]]);
  });

  it("marks the viewer's current vote as selected", async () => {
    await render(<VoteButtons score={3} myVote={-1} onVote={() => {}} />);
    expect(screen.getByLabelText('Downvote').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Upvote').props.accessibilityState).toMatchObject({ selected: false });
  });
});

describe('Button', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Request booking" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Request booking' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cannot be pressed twice while a request is in flight', async () => {
    const onPress = jest.fn();
    await render(<Button title="Request booking" onPress={onPress} loading />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Request booking')).toBeNull(); // replaced by a spinner
  });
});

describe('form controls', () => {
  it('Input is labelled for screen readers and reports typing', async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Contact phone" hint="Include your country code." value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Contact phone'), '+44 7700 900123');
    expect(onChangeText).toHaveBeenCalledWith('+44 7700 900123');
    expect(screen.getByText('Include your country code.')).toBeTruthy();
  });

  it('Chips selects an option', async () => {
    const onChange = jest.fn();
    const options = [
      { value: 'top', label: 'Top' },
      { value: 'new', label: 'New' },
    ];
    await render(<Chips options={options} value="top" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Top' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'New' }));
    expect(onChange).toHaveBeenCalledWith('new');
  });

  it('Toggle flips its value', async () => {
    const onChange = jest.fn();
    await render(<Toggle label="Open for booking" value={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('StatusBadge / Notice', () => {
  it('shows a readable status', async () => {
    await render(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('announces errors to screen readers', async () => {
    await render(<Notice>This package is fully booked.</Notice>);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
