import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { TOPICS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Empty } from "@/components/ui";
import { VoteButtons } from "@/components/VoteButtons";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const topic = TOPICS.find((t) => t.slug === sp.topic)?.slug;
  const sort = sp.sort === "new" ? "new" : "top";
  const user = await getUser();

  const posts = await db.post.findMany({
    where: topic ? { topic } : undefined,
    orderBy: sort === "new" ? { createdAt: "desc" } : [{ score: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } },
      votes: user ? { where: { userId: user.id }, select: { value: true } } : false,
    },
  });

  const link = (t?: string, s = sort) => {
    const qs = new URLSearchParams();
    if (t) qs.set("topic", t);
    if (s !== "top") qs.set("sort", s);
    const q = qs.toString();
    return q ? `/community?${q}` : "/community";
  };
  const pill = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm whitespace-nowrap ${on ? "bg-brand-700 text-white" : "bg-white text-slate-600 hover:bg-brand-50"}`;

  return (
    <div className="container-page max-w-4xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Community</h1>
          <p className="muted mt-1">Questions, advice and experiences from fellow pilgrims.</p>
        </div>
        <Link href="/community/new" className="btn-primary">
          New post
        </Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <Link href={link()} className={pill(!topic)}>
          All
        </Link>
        {TOPICS.map((t) => (
          <Link key={t.slug} href={link(t.slug)} className={pill(topic === t.slug)}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-sm">
        <Link href={link(topic, "top")} className={sort === "top" ? "font-semibold text-brand-800" : "text-slate-500 hover:text-brand-700"}>
          Top
        </Link>
        <Link href={link(topic, "new")} className={sort === "new" ? "font-semibold text-brand-800" : "text-slate-500 hover:text-brand-700"}>
          New
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {posts.length === 0 ? (
          <Empty>Nothing here yet. Be the first to start a discussion.</Empty>
        ) : (
          posts.map((p) => (
            <article key={p.id} className="card flex gap-4 p-4">
              <VoteButtons postId={p.id} score={p.score} mine={p.votes?.[0]?.value ?? 0} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">
                  <Link href={link(p.topic)} className="font-medium text-brand-700 hover:underline">
                    {TOPICS.find((t) => t.slug === p.topic)?.label ?? p.topic}
                  </Link>{" "}
                  · {p.author.name} · {timeAgo(p.createdAt)}
                </p>
                <h2 className="mt-1 font-semibold text-slate-900">
                  <Link href={`/community/${p.id}`} className="hover:underline">
                    {p.title}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.body}</p>
                <Link href={`/community/${p.id}`} className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-brand-700">
                  {p._count.comments} {p._count.comments === 1 ? "comment" : "comments"}
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
