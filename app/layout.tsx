import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "@/app/globals.css";

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

function ThemeBootScript() {
  // Set `data-theme` early to avoid a flash of the wrong theme.
  // Default: dark (to match Ground News), with persisted local override.
  const code = `
(() => {
  try {
    const key = "ogn_theme";
    const saved = window.localStorage.getItem(key);
    const theme = saved === "light" || saved === "dark" ? saved : "dark";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${sans.variable} ${serif.variable}`}>
        <ThemeBootScript />
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
