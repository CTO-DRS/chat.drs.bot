import { auth } from "@/app/(auth)/auth";
import { getUsageStats } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await getUsageStats({ id: session.user.id });

  return Response.json(stats);
}
