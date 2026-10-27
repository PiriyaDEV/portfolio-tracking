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
    <div className="app-background-layout bg-black min-h-screen flex flex-col items-center">
      {/* ── App Bar ─────────────────────────────────────────── */}
      <header className="app-header fixed top-0 w-full sm:max-w-[450px] lg:max-w-[1120px] z-[98] overflow-hidden">
        <div className="relative flex items-center px-4 py-3 gap-3 bg-black">
          {/* App mark */}
          <div className="relative shrink-0">
            <Image
              src={logoImg}
              alt="P'Tracker Logo"
              width={40}
              height={40}
              className="relative rounded-xl object-cover border border-white/10"
            />
          </div>

          {/* Title + tagline */}
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-white text-[19px] leading-none tracking-tight"
              >
                P&apos;Tracker
              </span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 tracking-[0.08em] uppercase">
              Portfolio Tracking
            </span>
          </div>

          {/* Author button */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] text-gray-500 leading-none mb-1 uppercase tracking-[0.12em]">
              created by
            </span>
            <button
              onClick={() =>
                window.open("https://www.instagram.com/pd.piriya/#", "_blank")
              }
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-white/[0.08] bg-white/[0.035] transition-colors hover:border-accent-yellow/30 active:scale-[0.98]"
            >
              <span className="text-[11px] font-medium text-gray-300">
                @pd.piriya
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="app-content container w-full sm:max-w-[450px] lg:max-w-[1120px] mx-auto flex-grow bg-black">
        {children}
      </div>
    </div>
  );
};

export default BackgroundLayout;
