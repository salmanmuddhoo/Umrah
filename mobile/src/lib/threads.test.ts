import { comment } from '@/test/fixtures';

import { applyVote, threadComments } from './threads';

describe('threadComments', () => {
  it('puts each reply directly under its parent, however the list is ordered', () => {
    const list = [comment('a'), comment('b'), comment('a1', 'a'), comment('b1', 'b'), comment('a1x', 'a1'), comment('a2', 'a')];
    expect(threadComments(list).map((c) => `${c.id}:${c.depth}`)).toEqual(['a:0', 'a1:1', 'a1x:2', 'a2:1', 'b:0', 'b1:1']);
  });
  it('caps the indent so deep threads stay readable on a phone', () => {
    const chain = [comment('1'), comment('2', '1'), comment('3', '2'), comment('4', '3'), comment('5', '4')];
    expect(threadComments(chain, 2).map((c) => c.depth)).toEqual([0, 1, 2, 2, 2]);
  });
  it('shows a reply at the top level when its parent is missing', () => {
    expect(threadComments([comment('orphan', 'deleted')])).toEqual([expect.objectContaining({ id: 'orphan', depth: 0 })]);
  });
  it('returns an empty list for no comments', () => {
    expect(threadComments([])).toEqual([]);
  });
});

describe('applyVote', () => {
  it('adds a new vote', () => {
    expect(applyVote({ score: 4, myVote: 0 }, 1)).toEqual({ score: 5, myVote: 1 });
    expect(applyVote({ score: 4, myVote: 0 }, -1)).toEqual({ score: 3, myVote: -1 });
  });
  it('removes the vote when the same arrow is tapped again', () => {
    expect(applyVote({ score: 5, myVote: 1 }, 1)).toEqual({ score: 4, myVote: 0 });
  });
  it('swings by two when switching sides', () => {
    expect(applyVote({ score: 5, myVote: 1 }, -1)).toEqual({ score: 3, myVote: -1 });
  });
});
