"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/validate";

/** A form bound to a server action that shows the action's error / success message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {state.ok}
        </p>
      )}
      {children}
    </form>
  );
}
