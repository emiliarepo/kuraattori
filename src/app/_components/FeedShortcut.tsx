import Link from "next/link";

/** A feed-top entry point: serif title with an arrow, a short muted hint below. */
export function FeedShortcut({
  href,
  title,
  hint,
  onClick,
}: {
  href: string;
  title: string;
  hint: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex min-h-11 flex-col justify-center py-3"
    >
      <span className="text-headline group-hover:text-signal text-lg italic sm:text-xl">
        {title} →
      </span>
      <span className="text-muted font-sans text-sm">{hint}</span>
    </Link>
  );
}
