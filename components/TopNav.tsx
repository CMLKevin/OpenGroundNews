import { PromoBanner } from "@/components/PromoBanner";
import { UtilityBar } from "@/components/UtilityBar";
import { TopNavClient } from "@/components/TopNavClient";

export function TopNav() {
  return (
    <header className="topbar">
      <PromoBanner />
      <UtilityBar />
      <TopNavClient />
    </header>
  );
}
