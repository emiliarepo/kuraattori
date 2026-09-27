import { groupRegions } from "~/domain/regions";

export function RegionsList({
  allRegions,
  regions,
  onChange,
}: {
  allRegions: readonly string[];
  regions: readonly string[];
  onChange: (region: string) => void;
}) {
  const regionGroups = groupRegions(allRegions);

  return (
    <>
      {[regionGroups.cities, regionGroups.others]
        .filter((group) => group.length > 0)
        .map((group, index) => (
          <ul
            key={index}
            className={`flex flex-col ${index > 0 ? "border-rule-soft mt-3 border-t pt-3" : ""}`}
          >
            {group.map((region) => (
              <li key={region}>
                <label className="flex min-h-11 items-center gap-2.5 text-lg">
                  <input
                    type="checkbox"
                    checked={regions.includes(region)}
                    onChange={() => onChange(region)}
                    className="accent-signal h-4 w-4 flex-none"
                  />
                  {region}
                </label>
              </li>
            ))}
          </ul>
        ))}
    </>
  );
}
