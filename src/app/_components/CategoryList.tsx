import Link from "next/link";

export type Category = { label: string; href?: string };

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
        <span key={category.label}>
          {index > 0 && " · "}
          {category.href ? (
            <Link
              href={category.href}
              className="hover:text-fg underline-offset-2 hover:underline"
            >
              {category.label}
            </Link>
          ) : (
            category.label
          )}
        </span>
      ))}
    </p>
  );
}
