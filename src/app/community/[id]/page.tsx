import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { TOPICS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { addComment, deleteComment, deletePost } from "@/app/actions/community";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { VoteButtons } from "@/components/VoteButtons";

type CommentRow = { id: string; parentId: string | null; body: string; createdAt: Date; authorId: string; author: { name: string } };
type Viewer = { id: string; role: string } | null;

function CommentForm({ postId, parentId, viewer }: { postId: string; parentId: string | null; viewer: Viewer }) {
  return (
    <ActionForm action={addComment.bind(null, postId, parentId)} className="space-y-2">
      <textarea
        name="body"
        required
        minLength={2}
        maxLength={5000}
        rows={parentId ? 2 : 3}
        className="input"
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
        aria-label={parentId ? "Reply" : "Comment"}
      />
      <SubmitButton className="btn-primary btn-sm">{viewer ? (parentId ? "Reply" : "Comment") : "Sign in to comment"}</SubmitButton>
    </ActionForm>
  );
}

function Thread({
  comments,
  parentId,
  postId,
  viewer,
  depth = 0,
}: {
  comments: Map<string | null, CommentRow[]>;
  parentId: string | null;
  postId: string;
  viewer: Viewer;
  depth?: number;
}) {
  const list = comments.get(parentId) ?? [];
  if (list.length === 0) return null;
  return (
    <ul className={depth > 0 ? "mt-3 space-y-3 border-l-2 border-brand-100 pl-4" : "space-y-4"}>
      {list.map((c) => (
        <li key={c.id}>
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-800">{c.author.name}</span> · {timeAgo(c.createdAt)}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-slate-800">{c.body}</p>
          <div className="mt-1 flex items-start gap-3 text-xs">
            {/* Deep threads stop offering replies so the layout stays readable on phones. */}
            {depth < 4 && (
              <details className="flex-1">
                <summary className="cursor-pointer font-medium text-slate-500 hover:text-brand-700">Reply</summary>
                <div className="mt-2 max-w-xl">
                  <CommentForm postId={postId} parentId={c.id} viewer={viewer} />
                </div>
              </details>
            )}
            {viewer && (viewer.id === c.authorId || viewer.role === "ADMIN") && (
              <form action={deleteComment.bind(null, c.id)}>
                <button className="cursor-pointer text-slate-400 hover:text-red-600">Delete</button>
              </form>
            )}
          </div>
          <Thread comments={comments} parentId={c.id} postId={postId} viewer={viewer} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      votes: user ? { where: { userId: user.id }, select: { value: true } } : false,
    },
  });
  if (!post) notFound();

  const byParent = new Map<string | null, CommentRow[]>();
  for (const c of post.comments) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const viewer = user && { id: user.id, role: user.role };

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/community" className="text-sm text-brand-700 hover:underline">
        ← Community
      </Link>
      <article className="card mt-4 flex gap-4 p-5">
        <VoteButtons postId={post.id} score={post.score} mine={post.votes?.[0]?.value ?? 0} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">
            <Link href={`/community?topic=${post.topic}`} className="font-medium text-brand-700 hover:underline">
              {TOPICS.find((t) => t.slug === post.topic)?.label ?? post.topic}
            </Link>{" "}
            · {post.author.name} · {timeAgo(post.createdAt)}
          </p>
          <h1 className="mt-1 text-xl font-bold text-brand-900">{post.title}</h1>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-800">{post.body}</p>
          {viewer && (viewer.id === post.authorId || viewer.role === "ADMIN") && (
            <form action={deletePost.bind(null, post.id)} className="mt-4">
              <button className="btn-danger btn-sm">Delete post</button>
            </form>
          )}
        </div>
      </article>

      <section className="card mt-4 p-5">
        <h2 className="mb-3 font-semibold text-brand-900">
          {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
        </h2>
        <CommentForm postId={post.id} parentId={null} viewer={viewer} />
        <div className="mt-6">
          <Thread comments={byParent} parentId={null} postId={post.id} viewer={viewer} />
        </div>
      </section>
    </div>
  );
}
