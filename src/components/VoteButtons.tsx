import { vote } from "@/app/actions/community";

/** Up/down arrows. `mine` is the viewer's current vote: 1, -1 or 0. */
export function VoteButtons({ postId, score, mine }: { postId: string; score: number; mine: number }) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center text-sm">
      <form action={vote.bind(null, postId, 1)}>
        <button
          aria-label="Upvote"
          aria-pressed={mine === 1}
          className={`cursor-pointer rounded px-2 py-0.5 hover:bg-brand-50 ${mine === 1 ? "text-brand-600" : "text-slate-400"}`}
        >
          ▲
        </button>
      </form>
      <span className="font-semibold text-slate-800">{score}</span>
      <form action={vote.bind(null, postId, -1)}>
        <button
          aria-label="Downvote"
          aria-pressed={mine === -1}
          className={`cursor-pointer rounded px-2 py-0.5 hover:bg-red-50 ${mine === -1 ? "text-red-600" : "text-slate-400"}`}
        >
          ▼
        </button>
      </form>
    </div>
  );
}
