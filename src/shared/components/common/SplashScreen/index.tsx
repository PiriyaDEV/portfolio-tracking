"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logoImg from "../../../../../public/images/metaImg.png";

interface SplashScreenProps {
  exiting?: boolean;
}

export default function SplashScreen({ exiting = false }: SplashScreenProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 !z-[99999] flex flex-col items-center justify-center bg-black"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        transition: exiting
          ? "opacity 0.6s ease-in, transform 0.6s ease-in"
          : "none",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(234,179,8,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          opacity: entered ? 1 : 0,
          transform: entered
            ? "translateY(0) scale(1)"
            : "translateY(16px) scale(0.92)",
          transition:
            "opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
          transitionDelay: "0.1s",
        }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo */}
        <div className="relative">
          <Image
            src={logoImg}
            alt="P'Tracker Logo"
            width={80}
            height={80}
            className="relative rounded-xl object-cover"
            style={{ border: "1px solid rgba(255,215,0,0.3)" }}
          />
          <div
            className="absolute inset-0 rounded-xl border border-yellow-400/20 animate-ping"
            style={{ animationDuration: "2s", animationDelay: "0.5s" }}
          />
        </div>

        {/* App name */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-white font-bold tracking-tight"
            style={{ fontSize: "26px", letterSpacing: "-0.5px" }}
          >
            P'Tracker
          </span>
          <span className="text-yellow-400/60 text-[13px] tracking-widest font-medium">
            Portfolio Tracking
          </span>
        </div>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-yellow-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
