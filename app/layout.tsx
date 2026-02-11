import type { Metadata } from "next";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <TopNav />
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
