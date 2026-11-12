import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { date } from "@/lib/format";
import { deleteReviewAsAdmin } from "@/app/actions/admin";
import { Empty } from "@/components/ui";

export default async function AdminReviews() {
  await requireAdmin();
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      package: { select: { title: true, provider: { select: { companyName: true } } } },
      service: { select: { title: true, provider: { select: { companyName: true } } } },
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-brand-900">Reviews</h2>
      <p className="muted mt-1">The latest reviews pilgrims have left on packages and transport. Remove anything abusive, off-topic or fake.</p>
      <div className="mt-4">
        {reviews.length === 0 ? (
          <Empty>No reviews yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => {
              const listing = r.package ?? r.service;
              return (
                <li key={r.id} className="card flex flex-wrap items-start gap-4 p-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      <span className="text-gold-600" aria-label={`${r.rating} out of 5 stars`}>
                        {"★".repeat(r.rating)}
                        <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                      </span>{" "}
                      {listing?.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {listing?.provider.companyName} · by {r.user.name} ({r.user.email ?? r.user.phone}) · {date(r.createdAt)}
                    </p>
                    {r.comment && <p className="mt-2 text-slate-700">{r.comment}</p>}
                  </div>
                  <form action={deleteReviewAsAdmin.bind(null, r.id)}>
                    <button className="btn-danger btn-sm">Remove</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
