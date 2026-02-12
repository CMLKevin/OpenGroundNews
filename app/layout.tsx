import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "@/app/globals.css";
import { cookies } from "next/headers";

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "OpenGroundNews",
  description: "Open-source Ground News alternative with perspective-aware aggregation.",
  icons: {
    icon: "/images/story-fallback.svg",
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
    cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "auto" ? (cookieTheme as any) : "auto";

  return (
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>
        <ThemeBootScript initialTheme={initialTheme} />
        <Suspense fallback={<header className="topbar" />}>
          <TopNav />
        </Suspense>
        {children}
        <footer className="footer">
          <div className="container">
            OpenGroundNews • Fully open-source perspective-aware news reader • Remote-browser ingestion via Browser Use CDP.
          </div>
        </footer>
      </body>
    </html>
  );
}
