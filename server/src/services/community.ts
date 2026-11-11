import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { TOPICS } from "@/lib/constants";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { str, type Input } from "@/lib/validate";

const author = { select: { name: true } };

export async function listPosts(user: SessionUser | null, query: URLSearchParams) {
  const topic = TOPICS.find((t) => t.slug === query.get("topic"))?.slug;
  const posts = await db.post.findMany({
    where: topic ? { topic } : undefined,
    orderBy: query.get("sort") === "new" ? { createdAt: "desc" } : [{ score: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      author,
      _count: { select: { comments: true } },
      votes: user ? { where: { userId: user.id }, select: { value: true } } : false,
    },
  });
  return posts.map(({ votes, _count, author: a, ...p }) => ({
    ...p,
    authorName: a.name,
    commentCount: _count.comments,
    myVote: votes?.[0]?.value ?? 0,
  }));
}

export async function getPost(user: SessionUser | null, id: string) {
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author,
      comments: { orderBy: { createdAt: "asc" }, include: { author } },
      votes: user ? { where: { userId: user.id }, select: { value: true } } : false,
    },
  });
  if (!post) throw notFound("This post does not exist.");
  const { votes, author: a, comments, ...rest } = post;
  return {
    ...rest,
    authorName: a.name,
    commentCount: comments.length,
    myVote: votes?.[0]?.value ?? 0,
    comments: comments.map(({ author: ca, ...c }) => ({ ...c, authorName: ca.name })),
  };
}

export async function createPost(user: SessionUser, input: Input) {
  const title = str(input, "title", 200);
  const body = str(input, "body", 10000);
  const topic = str(input, "topic", 40);
  if (title.length < 5) throw badRequest("Give your post a title of at least 5 characters.");
  if (body.length < 10) throw badRequest("Write at least a sentence or two.");
  if (!TOPICS.some((t) => t.slug === topic)) throw badRequest("Choose a topic.");

  // Authors start with their own upvote, like Reddit.
  return db.post.create({
    data: { title, body, topic, authorId: user.id, score: 1, votes: { create: { userId: user.id, value: 1 } } },
  });
}

export async function addComment(user: SessionUser, postId: string, input: Input) {
  const body = str(input, "body", 5000);
  const parentId = str(input, "parentId", 40) || null;
  if (body.length < 2) throw badRequest("Your comment is empty.");

  if (parentId) {
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { postId: true } });
    if (!parent || parent.postId !== postId) throw badRequest("The comment you are replying to no longer exists.");
  } else if (!(await db.post.findUnique({ where: { id: postId }, select: { id: true } }))) {
    throw notFound("This post no longer exists.");
  }
  const comment = await db.comment.create({ data: { postId, parentId, authorId: user.id, body }, include: { author } });
  const { author: a, ...c } = comment;
  return { ...c, authorName: a.name };
}

/** Voting the same way twice removes the vote, like Reddit. Returns the new score and the caller's vote. */
export async function vote(user: SessionUser, postId: string, value: number) {
  if (value !== 1 && value !== -1) throw badRequest("A vote must be 1 or -1.");
  if (!(await db.post.findUnique({ where: { id: postId }, select: { id: true } }))) throw notFound("This post no longer exists.");

  return db.$transaction(async (tx) => {
    const key = { userId_postId: { userId: user.id, postId } };
    const existing = await tx.vote.findUnique({ where: key });
    const myVote = existing?.value === value ? 0 : value;
    if (myVote === 0) await tx.vote.delete({ where: key });
    else await tx.vote.upsert({ where: key, create: { userId: user.id, postId, value }, update: { value } });
    const sum = await tx.vote.aggregate({ where: { postId }, _sum: { value: true } });
    const score = sum._sum.value ?? 0;
    await tx.post.update({ where: { id: postId }, data: { score } });
    return { score, myVote };
  });
}

export async function deletePost(user: SessionUser, postId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw notFound("This post does not exist.");
  if (post.authorId !== user.id && user.role !== "ADMIN") throw forbidden("You can only delete your own posts.");
  await db.post.delete({ where: { id: postId } });
  return { deleted: true };
}

export async function deleteComment(user: SessionUser, commentId: string) {
  const comment = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment) throw notFound("This comment does not exist.");
  if (comment.authorId !== user.id && user.role !== "ADMIN") throw forbidden("You can only delete your own comments.");
  await db.comment.delete({ where: { id: commentId } });
  return { deleted: true };
}
