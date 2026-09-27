import {
  InterestControl,
  type InterestWeight,
} from "~/app/_components/InterestControl";
import { groupBySelection } from "~/domain/categories";
import { useI18n } from "~/i18n/client";

export type Category = { id: number; name: string; lang?: "fi" };

export function InterestsList({
  categories,
  interests,
  onChange,
}: {
  categories: readonly Category[];
  interests: ReadonlyMap<number, InterestWeight>;
  onChange: (categoryId: number, weight: InterestWeight | null) => void;
}) {
  const { t } = useI18n();
  const { selected, rest } = groupBySelection(
    categories,
    new Set(interests.keys()),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-sm">{t.ui.interest.explanation}</p>
      {[selected, rest]
        .filter((group) => group.length > 0)
        .map((group, index) => (
          <ul
            key={index}
            className={`flex flex-col gap-2.5 ${index > 0 ? "border-rule-soft border-t pt-4" : ""}`}
          >
            {group.map((category) => (
              <li
                key={category.id}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span lang={category.lang} className="min-w-0 text-lg">
                  {category.name}
                </span>
                <InterestControl
                  categoryName={category.name}
                  value={interests.get(category.id) ?? null}
                  onChange={(weight) => onChange(category.id, weight)}
                />
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
