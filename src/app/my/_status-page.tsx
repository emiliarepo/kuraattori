import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { sortForStatus, type MyStatus } from "~/domain/my-sort";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

type MyListItem = Awaited<ReturnType<typeof api.my.list>>[number];

export async function MyStatusPage({
  status,
  emptyMessage,
  searchParams,
  renderHeader,
}: {
  status: MyStatus;
  emptyMessage: string;
  searchParams: Promise<{ sort?: string | string[] }>;
  renderHeader?: (items: MyListItem[]) => React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) return <SignInPrompt message={t.pages.signIn.my} />;

  const sort = sortForStatus(status, (await searchParams).sort);
  const items = await api.my.list({ status, sort });
  const today = todayInHelsinki();
  const endedAt =
    status === "interested" && sort === "ending"
      ? items.findIndex((item) => item.endDate !== null && item.endDate < today)
      : -1;

  return (
    <>
      {renderHeader?.(items)}
      {endedAt !== 0 && (
        <ExhibitionList
          items={items
            .slice(0, endedAt < 0 ? undefined : endedAt)
            .map((item) => toRowView(item, today))}
          emptyMessage={emptyMessage}
          signedIn
        />
      )}
      {endedAt >= 0 && (
        <section className="mt-8">
          <h2 className="text-headline border-rule border-t pt-3 text-2xl">
            {t.pages.my.ended}
          </h2>
          <ExhibitionList
            items={items.slice(endedAt).map((item) => toRowView(item, today))}
            emptyMessage={emptyMessage}
            signedIn
          />
        </section>
      )}
    </>
  );
}
