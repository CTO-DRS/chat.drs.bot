import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { StatsView } from "@/components/chat/stats-view";
import { getUsageStats } from "@/lib/db/queries";

export default async function StatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const stats = await getUsageStats({ id: session.user.id });

  return <StatsView stats={stats} />;
}
