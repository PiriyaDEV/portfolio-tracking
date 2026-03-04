"use client";

import { FC } from "react";
import { Sarabun } from "next/font/google";
import type { Metadata } from "next";

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "P'Tracker",
  description: "Portfolio Tracking",
  themeColor: "#171616ff",
  openGraph: {
    images: `https://ptracker.netlify.app/images/metaImg.png`,
  },
};

const BackgroundLayout: FC<BackgroundLayoutProps> = ({ children }) => {
  return (
    <html lang="en" className={`${sarabun.variable}`}>
      <body className="antialiased font-sarabun">
        <div className="bg-black bg-opacity-70 min-h-screen flex flex-col items-center">
          {/* ── App Bar ─────────────────────────────────────────── */}
          <div
            className="fixed top-0 w-full sm:max-w-[450px] z-[98]"
            style={{
              background: "linear-gradient(180deg, #0d0d0d 0%, #111111 100%)",
              borderBottom: "1px solid rgba(255, 215, 0, 0.12)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              {/* Left: Logo mark */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-black text-xs font-black"
                style={{
                  background:
                    "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                  boxShadow: "0 2px 10px rgba(255,215,0,0.35)",
                  letterSpacing: "-0.5px",
                }}
              >
                PT
              </div>

              {/* Center: Title */}
              <div className="flex flex-col items-center">
                <span
                  className="font-black text-[20px] text-white tracking-tight leading-none"
                  style={{ letterSpacing: "-0.5px" }}
                >
                  P&apos;Tracker
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-gray-500">
                    Live Portfolio
                  </span>
                </div>
              </div>

              {/* Right: Author */}
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-gray-600 leading-tight">
                  by
                </span>
                <span
                  className="text-[11px] font-semibold text-accent-yellow underline cursor-pointer hover:opacity-80 transition-opacity leading-tight"
                  onClick={() =>
                    window.open(
                      "https://www.instagram.com/pd.piriya/#",
                      "_blank",
                    )
                  }
                >
                  @pd.piriya
                </span>
                <span className="text-[11px]">🤪✨</span>
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              className="h-[2px] w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.4) 30%, rgba(255,165,0,0.6) 50%, rgba(255,215,0,0.4) 70%, transparent 100%)",
              }}
            />
          </div>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="container sm:max-w-[450px] mx-auto sm:mx-0 flex-grow bg-black">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
};

export default BackgroundLayout;
