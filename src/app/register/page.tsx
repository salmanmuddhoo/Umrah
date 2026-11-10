import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { register } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export const metadata: Metadata = { title: "Create an account" };

const COPY = {
  pilgrim: { title: "Create your account", intro: "Book packages and transport, and join the community." },
  umrah: { title: "List your Umrah packages", intro: "Create a provider account. We review every provider before listings go live." },
  transport: { title: "List your transport services", intro: "Create a transport provider account. We review every provider before listings go live." },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ as?: string; next?: string }> }) {
  const sp = await searchParams;
  if (await getUser()) redirect("/");
  const as = sp.as === "umrah" || sp.as === "transport" ? sp.as : "pilgrim";
  const isProvider = as !== "pilgrim";

  return (
    <div className="container-page max-w-md py-14">
      <h1 className="h1">{COPY[as].title}</h1>
      <p className="muted mt-1">{COPY[as].intro}</p>
      <ActionForm action={register} className="card mt-6 space-y-4 p-6">
        <input type="hidden" name="as" value={as} />
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="Your name">
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className="input" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className="input" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        {isProvider && (
          <>
            <hr className="border-black/5" />
            <Field label="Company name">
              <input name="companyName" required minLength={2} maxLength={120} autoComplete="organization" className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input name="city" maxLength={80} className="input" />
              </Field>
              <Field label="Country">
                <input name="country" maxLength={80} className="input" />
              </Field>
            </div>
            <Field label="Business phone">
              <input name="phone" type="tel" maxLength={40} className="input" />
            </Field>
            <Field label="Licence / registration number" hint="Helps us verify your business faster.">
              <input name="licenseNo" maxLength={80} className="input" />
            </Field>
          </>
        )}
        <SubmitButton className="btn-primary w-full">Create account</SubmitButton>
      </ActionForm>
      <p className="muted mt-4 text-center">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
        {!isProvider && (
          <>
            {" · "}
            <Link href="/partners" className="font-medium text-brand-700 hover:underline">
              I am a provider
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
