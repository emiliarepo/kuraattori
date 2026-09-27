"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { t } from "~/i18n/fi";

export function UserMenu({
  label,
  signOutAction,
}: {
  label: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="hover:text-signal font-sans text-[0.8125rem]"
      >
        {label} <span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Sulje"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10"
          />
          <div
            id={panelId}
            role="dialog"
            aria-label={label}
            className="border-rule bg-bg absolute top-full right-0 z-20 mt-2 w-48 border p-3 font-sans"
          >
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="hover:text-signal block py-1 text-sm font-semibold"
            >
              {t.ui.nav.profile}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="hover:text-signal w-full py-1 text-left text-sm font-semibold"
              >
                {t.auth.signOut}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
