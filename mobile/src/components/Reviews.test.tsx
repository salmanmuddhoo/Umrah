import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ReviewList } from '@/lib/types';
import { user } from '@/test/fixtures';

import { RatingSummary, Reviews, StarPicker } from './Reviews';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useIsFocused: () => true }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const list = (overrides: Partial<ReviewList> = {}): ReviewList => ({
  ratingAverage: 4.5,
  ratingCount: 2,
  reviews: [
    { id: 'r1', rating: 5, comment: 'Wonderful, well organised trip.', authorName: 'Yusuf', verified: true, mine: false, createdAt: new Date().toISOString() },
    { id: 'r2', rating: 4, comment: '', authorName: 'Huda', verified: false, mine: false, createdAt: new Date().toISOString() },
  ],
  ...overrides,
});

const api = { reviews: jest.fn(), saveReview: jest.fn(), deleteReview: jest.fn() };
const as = (current: unknown) => (useAuth as jest.Mock).mockReturnValue({ api, user: current });

beforeEach(() => {
  jest.clearAllMocks();
  api.reviews.mockResolvedValue(list());
  api.saveReview.mockResolvedValue({});
});

describe('RatingSummary', () => {
  it('shows the average and count', async () => {
    await render(<RatingSummary average={4.5} count={12} />);
    expect(screen.getByLabelText('Rated 4.5 out of 5 from 12 reviews')).toBeTruthy();
  });
  it('says when there are no reviews yet', async () => {
    await render(<RatingSummary average={null} count={0} />);
    expect(screen.getByText('No reviews yet')).toBeTruthy();
  });
});

describe('StarPicker', () => {
  it('reports the tapped star and marks it chosen', async () => {
    const onChange = jest.fn();
    await render(<StarPicker value={3} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '3 stars' }).props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe('Reviews', () => {
  it('lists reviews with stars, first names and a verified-booking badge', async () => {
    as(null);
    await render(<Reviews kind="package" listingId="pkg1" />);
    expect(await screen.findByText('Wonderful, well organised trip.')).toBeTruthy();
    expect(screen.getByLabelText('5 stars out of 5')).toBeTruthy();
    expect(screen.getByText(/^Yusuf ·/)).toBeTruthy();
    expect(screen.getAllByText('✓ Verified booking')).toHaveLength(1);
    expect(api.reviews).toHaveBeenCalledWith('package', 'pkg1');
  });

  it('asks a visitor to sign in before writing a review', async () => {
    as(null);
    await render(<Reviews kind="transport" listingId="svc1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Sign in to write a review' }));
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('lets a signed-in pilgrim post a rating with a comment', async () => {
    as(user);
    const onChange = jest.fn();
    await render(<Reviews kind="package" listingId="pkg1" onChange={onChange} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Write a review' }));
    await fireEvent.press(screen.getByRole('radio', { name: '4 stars' }));
    await fireEvent.changeText(screen.getByLabelText('Your review (optional)'), 'Good value.');
    await fireEvent.press(screen.getByRole('button', { name: 'Post review' }));

    await waitFor(() => expect(api.saveReview).toHaveBeenCalledWith('package', 'pkg1', { rating: 4, comment: 'Good value.' }));
    expect(api.reviews).toHaveBeenCalledTimes(2); // reloaded to show it
    expect(onChange).toHaveBeenCalledTimes(1); // and the page refreshes its rating
  });

  it('needs a rating before posting', async () => {
    as(user);
    await render(<Reviews kind="package" listingId="pkg1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Write a review' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Post review' }));
    expect(screen.getByText('Tap the stars to choose a rating.')).toBeTruthy();
    expect(api.saveReview).not.toHaveBeenCalled();
  });

  it("opens the person's own review for editing, pre-filled", async () => {
    as(user);
    api.reviews.mockResolvedValue(
      list({ reviews: [{ id: 'mine', rating: 2, comment: 'Late pickup.', authorName: 'Aisha', verified: true, mine: true, createdAt: new Date().toISOString() }] }),
    );
    await render(<Reviews kind="transport" listingId="svc1" />);
    expect(await screen.findByText(/^You ·/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit your review' }));
    expect(screen.getByRole('radio', { name: '2 stars' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByLabelText('Your review (optional)').props.value).toBe('Late pickup.');
  });

  it("shows the server's message when saving fails", async () => {
    as(user);
    api.saveReview.mockRejectedValue(new ApiError(403, 'You cannot review your own listing.'));
    await render(<Reviews kind="package" listingId="pkg1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Write a review' }));
    await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Post review' }));
    expect(await screen.findByText('You cannot review your own listing.')).toBeTruthy();
  });

  it('hides the form from the listing’s own provider', async () => {
    as({ ...user, provider: { id: 'prov1' } });
    await render(<Reviews kind="package" listingId="pkg1" canReview={false} />);
    await screen.findByText('Wonderful, well organised trip.');
    expect(screen.queryByRole('button', { name: 'Write a review' })).toBeNull();
  });

  it('invites the first review when there are none', async () => {
    as(user);
    api.reviews.mockResolvedValue(list({ ratingAverage: null, ratingCount: 0, reviews: [] }));
    await render(<Reviews kind="package" listingId="pkg1" />);
    expect(await screen.findByText('Be the first to share how it went.')).toBeTruthy();
    expect(screen.getByText('No reviews yet')).toBeTruthy();
  });
});
