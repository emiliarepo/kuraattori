import { notFound, redirect } from "next/navigation";

import { todayInHelsinki } from "~/domain/dates";
import { editionRegionBySlug, latestSunday } from "~/domain/edition";

export default async function LatestEditionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  if (!editionRegionBySlug(region)) notFound();
  redirect(`/edition/${region}/${latestSunday(todayInHelsinki())}`);
}
