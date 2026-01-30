"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TiRefresh as RefreshIcon } from "react-icons/ti";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { DEFAULT_AUTHOR, NEWS_CONFIG } from "./config.constants";

/* =======================
   Types
======================= */
type TelegramMessage = {
  id: number;
  text: string;
  date: number;
};

/* =======================
   Component
======================= */
export default function NewsScreen() {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const observerTarget = useRef<HTMLDivElement>(null);

  /* =======================
     Helpers
  ======================= */
  function getTickerFromText(text?: string): string | null {
    if (!text) return null;
    const first50 = text.slice(0, 50);
    const match = first50.match(/\b[A-Z]{3,5}\b/);
    return match ? match[0] : null;
  }

  function detectNewsType(text?: string) {
    if (!text) return DEFAULT_AUTHOR;

    const lower = text.toLowerCase();

    // เช็คตาม priority จากบนลงล่าง (array order)
    for (const config of NEWS_CONFIG) {
      const hasKeyword = config.keywords.some((keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // ไม่ให้มีอักษรไทยก่อนหรือหลังคำ
        const regex = new RegExp(`(^|[^ก-๙])${escaped}([^ก-๙]|$)`, "i");

        return regex.test(lower);
      });

      if (hasKeyword) {
        return config;
      }
    }

    // ถ้าเจอ ticker ให้ใช้ logokit
    const ticker = getTickerFromText(text);
    if (ticker) {
      const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
      return {
        key: "ticker",
        name: ticker,
        image: token
          ? `https://img.logokit.com/ticker/${ticker}?token=${token}`
          : DEFAULT_AUTHOR.image,
        emoji: null,
        keywords: [],
      };
    }

    // ถ้าไม่เจออะไรเลย ใช้ default
    return DEFAULT_AUTHOR;
  }

  /* =======================
     Fetch News
  ======================= */
  const fetchNews = async (reset = false) => {
    if (!reset && messages.length >= 50) {
      setHasMore(false);
      return;
    }

    try {
      if (reset) {
        setRefreshing(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const res = await fetch(`/api/news?offset=${currentOffset}&limit=5`);
      const data = await res.json();

      const newMessages = Array.isArray(data) ? data : [];

      if (reset) {
        setMessages(newMessages);
        setOffset(5);
      } else {
        setMessages((prev) => [...prev, ...newMessages]);
        setOffset((prev) => prev + 5);
      }

      // ถ้าได้ข้อมูลน้อยกว่า 5 แสดงว่าหมดแล้ว
      if (newMessages.length < 5) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch {
      if (reset) {
        setMessages([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  /* =======================
     Initial Load
  ======================= */
  useEffect(() => {
    fetchNews(true);
  }, []);

  /* =======================
     Infinite Scroll Observer
  ======================= */
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loadingMore && !loading) {
        fetchNews(false);
      }
    },
    [hasMore, loadingMore, loading, offset],
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  const filteredMessages = messages.filter(
    (msg) => msg.text && msg.text.trim() !== "",
  );

  const renderTextWithLinks = (text: string) => {
    if (!text) return "-";

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-words"
          >
            {part}
          </a>
        );
      }

      return part;
    });
  };

  /* =======================
     Render
  ======================= */
  return (
    <div className="max-w-[600px] mx-auto py-4">
      {/* =======================
          HEADER (ALWAYS SHOW)
      ======================= */}
      <div className="fixed top-[173px] left-1/2 -translate-x-1/2 max-w-[450px] w-full py-2 px-5 bg-black z-[99] border-b border-black-lighter2">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold flex items-center gap-2 text-white">
            📢 อัพเดทข่าวหุ้นล่าสุดจาก กลุ่ม "ข่าวด่วนหุ้นสหรัฐ"
          </h2>

          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className="
              w-8 h-8
              flex items-center justify-center
              rounded-full
              hover:bg-black-lighter2
              transition
              disabled:opacity-50
            "
          >
            <RefreshIcon
              className={`text-white text-xl ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* =======================
          CONTENT
      ======================= */}
      <div className="space-y-3 pt-[30px]">
        {/* Loading */}
        {loading && (
          <div className="pt-[150px]">
            <CommonLoading isFullScreen={false} />
          </div>
        )}

        {/* Empty */}
        {!loading && messages.length === 0 && (
          <div className="p-4">
            <div className="bg-white rounded-xl p-4 text-gray-500 text-sm text-center shadow-sm border">
              วันนี้ไม่มีข่าวจ้า 😢
            </div>
          </div>
        )}

        {/* News list */}
        {!loading &&
          filteredMessages.map((msg) => {
            const newsType = detectNewsType(msg.text);

            // ตรวจสอบว่าข่าวใหม่หรือไม่ (ห่างจากปัจจุบันไม่เกิน 30 นาที)
            const messageDate = new Date(msg.date * 1000);
            const now = new Date();
            const diffMinutes =
              (now.getTime() - messageDate.getTime()) / (1000 * 60);
            const isNew = diffMinutes <= 30;

            return (
              <div
                key={msg.id}
                className="
                  bg-gradient-to-b from-white via-white to-gray-50
                  rounded-2xl
                  p-4
                  shadow-sm
                  border border-gray-200
                  hover:shadow-md
                  transition-shadow
                "
              >
                <div className="text-[14px] text-gray-500 mb-2 flex items-center justify-between pb-2">
                  <div className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 shrink-0">
                      <img
                        src={newsType.image}
                        alt="author"
                        className="w-12 h-12 rounded-full object-cover border-[2px] border-accent-yellow"
                      />

                      {newsType.emoji && (
                        <span className="absolute -right-1 -bottom-1 text-lg">
                          {newsType.emoji}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="font-semibold text-gray-800">
                        {newsType.name}
                      </div>
                      {new Date(msg.date * 1000).toLocaleString("th-TH", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}{" "}
                      น.
                    </div>
                  </div>

                  {isNew && (
                    <span className="!text-white inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                      🔥 ข่าวใหม่
                    </span>
                  )}
                </div>

                <div className="text-[16px] text-gray-800 whitespace-pre-line leading-relaxed">
                  {renderTextWithLinks(msg.text) || "-"}
                </div>
              </div>
            );
          })}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="py-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-yellow"></div>
          </div>
        )}

        {/* Intersection Observer Target */}
        <div ref={observerTarget} className="h-4" />

        {/* No More Messages */}
        {!loading && !hasMore && messages.length > 0 && (
          <div className="py-4 text-center text-gray-500 text-sm">
            ไม่มีข่าวเพิ่มเติมแล้ว
          </div>
        )}
      </div>
    </div>
  );
}
