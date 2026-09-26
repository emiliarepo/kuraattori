import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export default async function Home() {
  const [museumCount, session] = await Promise.all([
    api.system.museumCount(),
    auth(),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">{t.app.name}</h1>
      <p className="text-muted">
        {museumCount} museota tietokannassa (D1, {process.env.NODE_ENV}).
      </p>
      <p>
        {session?.user
          ? `Kirjautunut: ${session.user.name ?? session.user.email}`
          : "Ei kirjautunut"}
      </p>
    </main>
  );
}
