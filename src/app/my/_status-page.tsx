import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { SignInPrompt } from "~/app/_components/SignInPrompt";
import { toRowView } from "~/app/_lib/row";
import { todayInHelsinki } from "~/domain/dates";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export async function MyStatusPage({
  status,
  emptyMessage,
}: {
  status: "interested" | "visited" | "hidden";
  emptyMessage: string;
}) {
  const session = await auth();
  if (!session?.user) return <SignInPrompt message={t.pages.signIn.my} />;

  const items = await api.my.list({ status });
  const today = todayInHelsinki();

  return (
    <ExhibitionList
      items={items.map((item) => toRowView(item, today))}
      emptyMessage={emptyMessage}
      signedIn
    />
  );
}
