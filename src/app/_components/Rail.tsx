import { EmptyState } from "~/app/_components/EmptyState";
import { ExhibitionCard } from "~/app/_components/ExhibitionCard";
import { Section } from "~/app/_components/Section";
import { type ExhibitionRowView } from "~/app/_lib/row";

export type RailItem = { view: ExhibitionRowView; lead?: React.ReactNode };

export function Rail({
  title,
  items,
  emptyMessage,
  more,
  signedIn = false,
}: {
  title: string;
  items: readonly RailItem[];
  emptyMessage: string;
  more?: { href: string; label: string };
  signedIn?: boolean;
}) {
  return (
    <Section title={title} more={more}>
      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul
          aria-label={title}
          className="rail -mx-4 scroll-px-4 gap-3 px-4 pt-1 pb-3 sm:-mx-6 sm:scroll-px-6 sm:gap-5 sm:px-6"
        >
          {items.map(({ view, lead }) => (
            <li key={view.href} className="flex w-[40vw] sm:w-52">
              <ExhibitionCard item={view} lead={lead} signedIn={signedIn} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
