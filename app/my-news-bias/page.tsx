import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authStore";
import { MyNewsBiasDashboardClient } from "@/components/MyNewsBiasDashboardClient";

export const dynamic = "force-dynamic";

export default async function MyNewsBiasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my-news-bias");

  return (
    <main className="container u-page-pad">
      <MyNewsBiasDashboardClient />
    </main>
  );
}
