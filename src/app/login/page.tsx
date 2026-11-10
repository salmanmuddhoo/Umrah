import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  if (await getUser()) redirect("/");
  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h1">Sign in</h1>
      <ActionForm action={login} className="card mt-6 space-y-4 p-6">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className="input" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className="input" />
        </Field>
        <SubmitButton className="btn-primary w-full">Sign in</SubmitButton>
      </ActionForm>
      <p className="muted mt-4 text-center">
        New here?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
