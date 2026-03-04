"use client";

import { FC } from "react";
import { Sarabun } from "next/font/google";
import type { Metadata } from "next";
import Image from "next/image";

import logoImg from "../../../../../public/images/metaImg.png";

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
        <div className="bg-black min-h-screen flex flex-col items-center">
          {/* ── App Bar ─────────────────────────────────────────── */}
          <header
            className="fixed top-0 w-full sm:max-w-[450px] z-[98] overflow-hidden"
            style={{ background: "#0a0a0a" }}
          >
            {/* Top glow line */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
              }}
            />

            <div className="relative flex items-center px-4 py-3 gap-3">
              {/* Logo with glow */}
              <div className="relative shrink-0">
                <div
                  className="absolute inset-0 rounded-xl blur-sm opacity-40"
                  style={{ background: "rgba(255,215,0,0.5)" }}
                />
                <Image
                  src={logoImg}
                  alt="P'Tracker Logo"
                  width={40}
                  height={40}
                  className="relative rounded-xl object-cover"
                  style={{ border: "1px solid rgba(255,215,0,0.3)" }}
                />
              </div>

              {/* Title + tagline */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-black text-white text-[20px] leading-none"
                    style={{ letterSpacing: "-0.5px" }}
                  >
                    P&apos;Tracker
                  </span>
                </div>
                <span className="text-[10px] text-gray-600 mt-0.5">
                  Portfolio Tracking
                </span>
              </div>

              {/* Author button */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] text-gray-600 leading-none mb-1">
                  created by
                </span>
                <button
                  onClick={() =>
                    window.open(
                      "https://www.instagram.com/pd.piriya/#",
                      "_blank",
                    )
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: "rgba(255,215,0,0.08)",
                    border: "1px solid rgba(255,215,0,0.22)",
                  }}
                >
                  <span className="text-[11px] font-bold text-accent-yellow">
                    @pd.piriya
                  </span>
                  <span className="text-[11px]">🤪</span>
                </button>
              </div>
            </div>

            {/* Bottom gold shimmer line */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.5) 35%, rgba(255,180,0,0.85) 50%, rgba(255,215,0,0.5) 65%, transparent 100%)",
              }}
            />
          </header>

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
