import { exportUserData } from "~/server/account";
import { auth } from "~/server/auth";
import { getDb } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const data = await exportUserData(await getDb(), session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kuraattori-tiedot.json"',
      "Cache-Control": "no-store",
    },
  });
}
