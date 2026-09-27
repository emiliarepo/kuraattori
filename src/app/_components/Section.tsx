import Link from "next/link";

export function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="border-rule mt-10 border-t pt-3">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-headline text-2xl sm:text-3xl">{title}</h2>
        {more && (
          <Link
            href={more.href}
            aria-label={`${more.label}: ${title}`}
            className="hover:text-signal font-sans text-sm underline underline-offset-4"
          >
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
