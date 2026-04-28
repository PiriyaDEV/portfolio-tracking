"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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
   Constants
======================= */
const FIXED_SYMBOLS = ["อิหร่าน"];

/* =======================
   DateChip Component
======================= */
const THAI_MONTHS: Record<string, number> = {
  มกราคม: 0,
  กุมภาพันธ์: 1,
  มีนาคม: 2,
  เมษายน: 3,
  พฤษภาคม: 4,
  มิถุนายน: 5,
  กรกฎาคม: 6,
  สิงหาคม: 7,
  กันยายน: 8,
  ตุลาคม: 9,
  พฤศจิกายน: 10,
  ธันวาคม: 11,
};

function parseThaiDate(dateStr: string): Date | null {
  const parts = dateStr.split(" ");
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = THAI_MONTHS[parts[1]];
  const yearBE = Number(parts[2]);

  if (month === undefined || isNaN(day) || isNaN(yearBE)) return null;

  const yearCE = yearBE - 543;

  return new Date(yearCE, month, day);
}

function DateChip({ label }: { label: string }) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const msgDay = parseThaiDate(label);

  if (!msgDay) {
    return <span>{label}</span>;
  }

  const toLocal = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const t = toLocal(today);
  const y = toLocal(yesterday);
  const m = toLocal(msgDay);

  let displayLabel = label;

  if (m.getTime() === t.getTime()) {
    displayLabel = "วันนี้";
  } else if (m.getTime() === y.getTime()) {
    displayLabel = "เมื่อวาน";
  }

  return (
    <div className="flex items-center justify-center pb-2">
      <span className="px-5 py-1 bg-black/40 backdrop-blur-sm border border-white/[0.1] rounded-full text-[11px] text-white/45 font-medium tracking-wide select-none">
        {displayLabel}
      </span>
    </div>
  );
}

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

function getDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isFresh(dateStr: string) {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t <= 5 * 60 * 60 * 1000;
}

/* =======================
   Ref Type
======================= */
export type GoogleNewsPanelRef = {
  refresh: () => void;
};

type Props = {
  assets: Asset[];
  detectNewsType: any;
};

/* =======================
   Component
======================= */
const GoogleNewsPanel = forwardRef<GoogleNewsPanelRef, Props>(
  ({ assets, detectNewsType }, ref) => {
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
       Expose refresh via ref
    ======================= */
    useImperativeHandle(ref, () => ({
      refresh: () => fetchNews(true),
    }));

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
      <div>
        {/* News list */}
        {!loading &&
          news.map((item, i) => {
            const fresh = isFresh(item.pubDate);
            const isMarketOverview = FIXED_SYMBOLS.includes(item.symbol);

            const currentDate = getDateLabel(item.pubDate);
            const prevDate = i > 0 ? getDateLabel(news[i - 1].pubDate) : null;

            const showDateChip = i === 0 || currentDate !== prevDate;

            return (
              <div key={`${item.link}-${i}`}>
                {/* DATE CHIP */}
                {showDateChip && <DateChip label={currentDate} />}

                {/* NEWS CARD */}
                <a
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
                    mb-2
                  "
                >
                  {/* left border */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${
                      isMarketOverview
                        ? "bg-blue-400/60"
                        : "bg-accent-yellow/60"
                    }`}
                  />

                  <div className="px-4 pt-3.5 pb-4 pl-5 bg-white !text-black">
                    {/* HEADER */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {(() => {
                            const newsType = detectNewsType(
                              item.title,
                              item.symbol,
                            );
                            return (
                              <>
                                <img
                                  src={newsType.image}
                                  alt="author"
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-accent-yellow/50"
                                />
                                {newsType.emoji && (
                                  <span className="absolute -right-1 -bottom-1 text-base leading-none">
                                    {newsType.emoji}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const newsType = detectNewsType(
                                item.title,
                                item.symbol,
                              );
                              return (
                                <span className="text-[13px] font-semibold text-white/90 leading-tight">
                                  {newsType.name}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-[11px] text-white/35">
                            {formatDateTime(item.pubDate)} น.
                          </span>
                        </div>
                      </div>

                      {fresh && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 !text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse shrink-0">
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
              </div>
            );
          })}

        {/* Loading more */}
        {loadingMore && (
          <div className="pt-[100px]">
            <CommonLoading isFullScreen={false} />
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
  },
);

GoogleNewsPanel.displayName = "GoogleNewsPanel";
export default GoogleNewsPanel;
