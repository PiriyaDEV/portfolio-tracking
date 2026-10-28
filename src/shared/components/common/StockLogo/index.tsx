"use client";

import { useEffect, useState } from "react";
import { getLogo, getName } from "@/app/lib/utils";

interface StockLogoProps {
  symbol: string;
  className?: string;
  imageClassName?: string;
}

const fallbackLabel = (symbol: string) => {
  const cleaned = symbol.replace(/[^a-z0-9]/gi, "");
  return cleaned.slice(0, 2).toUpperCase() || "?";
};

/** Stock logo with a readable ticker fallback when the remote image is unavailable. */
export default function StockLogo({
  symbol,
  className = "h-9 w-9",
  imageClassName = "",
}: StockLogoProps) {
  const logoUrl = getLogo(symbol);
  const [imageFailed, setImageFailed] = useState(!logoUrl);

  useEffect(() => {
    setImageFailed(!logoUrl);
  }, [logoUrl, symbol]);

  const name = getName(symbol);

  return (
    <span
      role="img"
      aria-label={`${name} logo`}
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white text-[10px] font-bold text-[#1b1607] ${className}`}
    >
      {logoUrl && !imageFailed ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${imageClassName}`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{fallbackLabel(symbol)}</span>
      )}
    </span>
  );
}
