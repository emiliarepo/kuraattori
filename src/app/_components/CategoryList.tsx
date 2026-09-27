import { HoverPrefetchLink } from "~/app/_components/HoverPrefetchLink";

export type Category = { label: string; lang?: "fi"; href?: string };

export function CategoryList({
  categories,
  className = "text-xs leading-relaxed",
}: {
  categories: readonly Category[];
  className?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <p className={`text-muted font-sans ${className}`}>
      {categories.map((category, index) => (
        <span key={category.label} lang={category.lang}>
          {index > 0 && " · "}
          {category.href ? (
            <HoverPrefetchLink
              href={category.href}
              className="hover:text-fg underline-offset-2 hover:underline"
            >
              {category.label}
            </HoverPrefetchLink>
          ) : (
            category.label
          )}
        </span>
      ))}
    </p>
  );
}
