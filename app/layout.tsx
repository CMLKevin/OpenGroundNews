import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import { TopNavSkeleton } from "@/components/TopNavSkeleton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import "@/app/globals.css";
import { cookies } from "next/headers";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand-serif",
});

export const metadata: Metadata = {
  title: "OpenGroundNews",
  description: "Open-source Ground News alternative with perspective-aware aggregation.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon-32x32.png"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

function ThemeBootScript({ initialTheme }: { initialTheme: "light" | "dark" | "auto" }) {
  // Set `data-theme` early to avoid a flash of the wrong theme.
  // IMPORTANT: do not resolve `auto` to light/dark here; CSS handles it to prevent hydration mismatch.
  const code = `
(() => {
  try {
    var pref = ${JSON.stringify(initialTheme)};
    document.documentElement.dataset.theme = pref;
  } catch {}
})();`.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("ogn_theme")?.value || "";
  const initialTheme: "light" | "dark" | "auto" =
    cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "auto" ? (cookieTheme as any) : "light";

  return (
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning className={`${bricolage.variable} ${newsreader.variable}`}>
      <body>
        <ThemeBootScript initialTheme={initialTheme} />
        <Suspense fallback={<TopNavSkeleton />}>
          <TopNav />
        </Suspense>
        {children}
        <MobileBottomNav />
        <SiteFooter />
      </body>
    </html>
  );
}
