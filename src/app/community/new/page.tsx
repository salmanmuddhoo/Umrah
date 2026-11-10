import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TOPICS } from "@/lib/constants";
import { createPost } from "@/app/actions/community";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUser("/community/new");
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="h1">Start a discussion</h1>
      <ActionForm action={createPost} className="card mt-6 space-y-4 p-6">
        <Field label="Topic">
          <select name="topic" required className="input" defaultValue="general">
            {TOPICS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input name="title" required minLength={5} maxLength={200} className="input" />
        </Field>
        <Field label="Your post">
          <textarea name="body" required minLength={10} maxLength={10000} rows={8} className="input" />
        </Field>
        <div className="flex justify-end gap-2">
          <Link href="/community" className="btn-ghost">
            Cancel
          </Link>
          <SubmitButton>Post</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
