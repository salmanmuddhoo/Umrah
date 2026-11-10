"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, requireUser } from "@/lib/auth";
import { TOPICS } from "@/lib/constants";
import { str, type FormState } from "@/lib/form";

export async function createPost(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/community/new");
  const title = str(fd, "title", 200);
  const body = str(fd, "body", 10000);
  const topic = str(fd, "topic", 40);
  if (title.length < 5) return { error: "Give your post a title of at least 5 characters." };
  if (body.length < 10) return { error: "Write at least a sentence or two." };
  if (!TOPICS.some((t) => t.slug === topic)) return { error: "Choose a topic." };

  const post = await db.post.create({
    data: { title, body, topic, authorId: user.id, score: 1, votes: { create: { userId: user.id, value: 1 } } },
  });
  redirect(`/community/${post.id}`);
}

export async function addComment(postId: string, parentId: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${postId}`)}`);
  const body = str(fd, "body", 5000);
  if (body.length < 2) return { error: "Your comment is empty." };

  if (parentId) {
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { postId: true } });
    if (!parent || parent.postId !== postId) return { error: "The comment you are replying to no longer exists." };
  } else if (!(await db.post.findUnique({ where: { id: postId }, select: { id: true } }))) {
    return { error: "This post no longer exists." };
  }

  await db.comment.create({ data: { postId, parentId, authorId: user.id, body } });
  revalidatePath(`/community/${postId}`);
  return { ok: "Comment posted." };
}

/** Clicking the same arrow twice removes the vote, like Reddit. */
export async function vote(postId: string, value: 1 | -1) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/community/${postId}`)}`);
  if (value !== 1 && value !== -1) return;

  await db.$transaction(async (tx) => {
    const key = { userId_postId: { userId: user.id, postId } };
    const existing = await tx.vote.findUnique({ where: key });
    if (existing?.value === value) await tx.vote.delete({ where: key });
    else await tx.vote.upsert({ where: key, create: { userId: user.id, postId, value }, update: { value } });
    const sum = await tx.vote.aggregate({ where: { postId }, _sum: { value: true } });
    await tx.post.update({ where: { id: postId }, data: { score: sum._sum.value ?? 0 } });
  });
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}

export async function deletePost(postId: string) {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post || (post.authorId !== user.id && user.role !== "ADMIN")) return;
  await db.post.delete({ where: { id: postId } });
  redirect("/community");
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const comment = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true, postId: true } });
  if (!comment || (comment.authorId !== user.id && user.role !== "ADMIN")) return;
  await db.comment.delete({ where: { id: commentId } });
  revalidatePath(`/community/${comment.postId}`);
}
