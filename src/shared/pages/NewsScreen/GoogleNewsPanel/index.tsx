"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { getLogo } from "@/app/lib/utils";

/* =======================
   Types
======================= */
type GoogleNewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  symbol: string;
};

type Asset = {
  symbol: string;
};

/* =======================
   Helpers
======================= */
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isFresh(dateStr: string) {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t <= 30 * 60 * 1000;
}

/* =======================
   Ticker Avatar
======================= */
function TickerAvatar({ ticker }: { ticker: string }) {
  return (
    <div
      className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
        getLogo(ticker) ? "" : "bg-white"
      }`}
      style={{ backgroundImage: `url(${getLogo(ticker)})` }}
    />
  );
}

/* =======================
   Component
======================= */
export default function GoogleNewsPanel({ assets }: { assets: Asset[] }) {
  const [news, setNews] = useState<GoogleNewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<HTMLDivElement>(null);

  /* =======================
     Fetch
  ======================= */
  const fetchNews = async (reset = false) => {
    if (!assets.length) return;
    if (loadingMore) return;

    const symbols = assets.map((a) => a.symbol).join(",");
    const currentOffset = reset ? 0 : offset;

    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/google-news?symbols=${symbols}&offset=${currentOffset}&limit=10`,
      );

      const data = await res.json();

      if (reset) {
        setNews(data.news ?? []);
        setOffset(10);
      } else {
        setNews((prev) => [...prev, ...(data.news ?? [])]);
        setOffset((prev) => prev + 10);
      }

      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.error("fetch news error", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /* =======================
     First Load
  ======================= */
  useEffect(() => {
    fetchNews(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================
     Infinite Scroll
  ======================= */
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];

      if (target.isIntersecting && hasMore && !loadingMore) {
        fetchNews();
      }
    },
    [hasMore, loadingMore],
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [handleObserver]);

  /* =======================
     Empty State
  ======================= */
  if (!assets.length) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">📭</span>
        <p className="text-white/40 text-sm">ยังไม่มีหุ้นในพอร์ต</p>
      </div>
    );
  }

  /* =======================
     Render
  ======================= */
  return (
    <div className="space-y-3 pt-3">
      {/* Loading */}
      {loading && <CommonLoading isFullScreen={false} />}

      {/* News list */}
      {!loading &&
        news.map((item, i) => {
          const fresh = isFresh(item.pubDate);

          return (
            <a
              key={`${item.link}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group relative block
                bg-[#161616]
                rounded-2xl
                border border-white/[0.07]
                hover:border-white/[0.15]
                hover:bg-[#1a1a1a]
                transition-all duration-200
                overflow-hidden
              "
            >
              {/* left border */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-yellow/60 rounded-l-2xl" />

              <div className="px-4 pt-3.5 pb-4 pl-5 bg-white !text-black">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <TickerAvatar ticker={item.symbol} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-white/90 leading-tight">
                        {item.symbol}
                      </span>

                      <span className="text-[11px] text-white/35">
                        {formatDateTime(item.pubDate)} น.
                      </span>
                    </div>
                  </div>

                  {fresh && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse shrink-0">
                      🔥 ใหม่
                    </span>
                  )}
                </div>

                {/* CONTENT */}
                <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-line">
                  {item.title}
                </p>

                {/* SOURCE */}
                <div className="mt-2 text-[11px] text-black/80">
                  จาก {item.source ?? "Google News"}
                </div>

                {/* CTA */}
                <div className="w-full flex justify-end">
                  <div className="w-fit bg-accent-yellow inline-flex items-center gap-1.5 mx-0.5 px-2 py-0.5 rounded-full border border-white/20 !text-black text-[13px] font-semibold align-middle mb-1">
                    <span>อ่านต่อ</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}

      {/* Loading more */}
      {loadingMore && (
        <div className="py-6 flex justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-accent-yellow animate-spin" />
        </div>
      )}

      {/* Observer */}
      <div ref={observerRef} className="h-2" />

      {/* End */}
      {!loading && !hasMore && news.length > 0 && (
        <div className="py-1 flex flex-col items-center gap-1.5">
          <div className="w-8 h-px bg-white/20" />
          <p className="text-[12px] text-white/30">โหลดครบทุกข่าวแล้ว</p>
        </div>
      )}
    </div>
  );
}
