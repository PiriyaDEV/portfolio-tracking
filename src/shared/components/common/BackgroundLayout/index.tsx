// components/common/BackgroundLayout.tsx
"use client";

import { FC } from "react";
import Image from "next/image";
import logoImg from "../../../../../public/images/metaImg.png";

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

const BackgroundLayout: FC<BackgroundLayoutProps> = ({ children }) => {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center">
      {/* ── App Bar ─────────────────────────────────────────── */}
      <header className="fixed top-0 w-full sm:max-w-[450px] z-[98] overflow-hidden">
        <div className="relative flex items-center px-4 py-4 gap-3 bg-black">
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
                window.open("https://www.instagram.com/pd.piriya/#", "_blank")
              }
              className="flex items-center gap-1 rounded-lg transition-all hover:opacity-80 active:scale-95"
            >
              <span className="text-[11px] font-bold text-accent-yellow">
                @pd.piriya
              </span>
              <span className="text-[11px]">🤪</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="container sm:max-w-[450px] mx-auto sm:mx-0 flex-grow bg-black">
        {children}
      </div>
    </div>
  );
};

export default BackgroundLayout;
