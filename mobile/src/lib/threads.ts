import type { Comment } from './types';

export type CommentNode = Comment & { depth: number };

/**
 * Flattens comments into display order: each comment is followed by its replies,
 * with `depth` telling the list how far to indent. Comments whose parent is
 * missing are shown at the top level rather than dropped.
 */
export function threadComments(comments: Comment[], maxDepth = 4): CommentNode[] {
  const ids = new Set(comments.map((c) => c.id));
  const byParent = new Map<string | null, Comment[]>();
  for (const c of comments) {
    const parent = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), c]);
  }

  const out: CommentNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push({ ...c, depth: Math.min(depth, maxDepth) });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** What the vote arrows should show immediately after a tap, before the server answers. */
export function applyVote(current: { score: number; myVote: number }, value: 1 | -1) {
  const myVote = current.myVote === value ? 0 : value;
  return { score: current.score - current.myVote + myVote, myVote };
}
