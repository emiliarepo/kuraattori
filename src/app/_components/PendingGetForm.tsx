"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, type ComponentProps } from "react";

import { usePendingNavigation } from "~/app/_components/PendingNavigation";
import { usePendingLink } from "~/app/_components/usePendingLink";
import { useI18n } from "~/i18n/client";

const FormPending = createContext(false);

/** A `method="get"` form that navigates client-side under the Pending state. */
export function PendingGetForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "method" | "onSubmit"> & {
  action?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { pending, start } = usePendingNavigation();
  return (
    <form
      {...props}
      method="get"
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of data)
          if (typeof value === "string") params.append(key, value);
        start(() => router.push(`${action ?? pathname}?${params.toString()}`));
      }}
    >
      <FormPending.Provider value={pending}>{children}</FormPending.Provider>
    </form>
  );
}

export function PendingSubmit({
  children,
  ...props
}: Omit<ComponentProps<"button">, "type">) {
  const { t } = useI18n();
  const pending = useContext(FormPending);
  return (
    <button {...props} type="submit">
      {pending ? t.ui.updating : children}
    </button>
  );
}

export function PendingLink(props: ComponentProps<typeof Link>) {
  const { onClick } = usePendingLink();
  return <Link {...props} onClick={onClick} />;
}
