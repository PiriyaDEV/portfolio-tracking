"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TiRefresh as RefreshIcon } from "react-icons/ti";
import CommonLoading from "@/shared/components/common/CommonLoading";
import { DEFAULT_AUTHOR, NEWS_CONFIG, CHANNELS, CHANNEL_DEFAULT_AUTHOR } from "./config.constants";

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
  const [messages, setMessages]       = useState<TelegramMessage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [offset, setOffset]           = useState(0);
  const [activeChannel, setActiveChannel] = useState<string>(CHANNELS[0]?.id ?? "usstockthailand1");

  const observerTarget = useRef<HTMLDivElement>(null);

  /* =======================
     Helpers
  ======================= */
  function getTickerFromText(text?: string): string | null {
    if (!text) return null;
    const first = text.slice(0, 40);
    const match = first.match(/\b[A-Z]{3,5}\b/);
    return match ? match[0] : null;
  }

  function detectNewsType(text?: string) {
    if (!text) return DEFAULT_AUTHOR;

    const lower = text.normalize("NFC").toLowerCase();

    function isThaiLetter(c?: string) {
      if (!c) return false;
      const code = c.charCodeAt(0);
      if (code >= 0x0e01 && code <= 0x0e2e) return true;
      if (code >= 0x0e2f && code <= 0x0e5b) return true;
      return false;
    }

    let matchedConfig: (typeof NEWS_CONFIG)[number] | null = null;
    let earliestIndex = Infinity;

    for (const config of NEWS_CONFIG) {
      for (const keyword of config.keywords) {
        const key   = keyword.normalize("NFC").toLowerCase();
        const index = lower.indexOf(key);
        if (index === -1) continue;

        const before = lower[index - 1];
        const after  = lower[index + key.length];
        if (isThaiLetter(before) || isThaiLetter(after)) continue;

        if (index < earliestIndex) {
          earliestIndex = index;
          matchedConfig  = config;
        }
      }
    }

    if (matchedConfig) return matchedConfig;

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

    const channelDefault = activeChannel
      ? CHANNEL_DEFAULT_AUTHOR[activeChannel]
      : undefined;
    return channelDefault ?? DEFAULT_AUTHOR;
  }

  /* =======================
     Fetch News
  ======================= */
  const fetchNews = useCallback(
    async (reset = false, channelOverride?: string) => {
      const channel = channelOverride ?? activeChannel;

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
        const res  = await fetch(
          `/api/news?offset=${currentOffset}&limit=5&channel=${channel}`
        );
        const data = await res.json();
        const newMessages: TelegramMessage[] = Array.isArray(data) ? data : [];

        if (reset) {
          setMessages(newMessages);
          setOffset(5);
        } else {
          setMessages((prev) => [...prev, ...newMessages]);
          setOffset((prev) => prev + 5);
        }

        setHasMore(newMessages.length >= 5);
      } catch {
        if (reset) setMessages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeChannel, messages.length, offset]
  );

  /* =======================
     Channel Switch
  ======================= */
  const handleChannelChange = (channelId: string) => {
    if (channelId === activeChannel) return;
    setActiveChannel(channelId);
    setMessages([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
  };

  /* =======================
     Effects
  ======================= */
  useEffect(() => {
    fetchNews(true, activeChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loadingMore && !loading) {
        fetchNews(false);
      }
    },
    [hasMore, loadingMore, loading, fetchNews]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  /* =======================
     Derived
  ======================= */
  const filteredMessages = messages.filter(
    (msg) => msg.text && msg.text.trim() !== ""
  );

  const activeChannelInfo = CHANNELS.find((c) => c.id === activeChannel);

  const renderTextWithLinks = (text: string) => {
    if (!text) return "-";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${index}-${part.substring(0, 20)}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-words hover:text-blue-300 transition-colors"
          >
            {part}
          </a>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  /* =======================
     Render
  ======================= */
  return (
    <div className="max-w-[600px] mx-auto">

      {/* ======================= HEADER ======================= */}
      <div className="fixed top-[160px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[99]">

        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black-lighter border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h2 className="text-[13px] font-semibold text-white/90 tracking-wide">
              {activeChannelInfo?.emoji} {activeChannelInfo?.label ?? "ข่าวหุ้น"}
            </h2>
            {refreshing && (
              <span className="text-[11px] text-white/40 animate-pulse">กำลังโหลด…</span>
            )}
          </div>

          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            aria-label="Refresh"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition disabled:opacity-40"
          >
            <RefreshIcon
              className={`text-white/80 text-xl ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Channel tab pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-black border-b !border-yellow-400/[0.5] overflow-x-auto scrollbar-none">
          {CHANNELS.map((ch) => {
            const isActive = ch.id === activeChannel;
            return (
              <button
                key={ch.id}
                onClick={() => handleChannelChange(ch.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                  whitespace-nowrap shrink-0 transition-all duration-200
                  ${isActive
                    ? "bg-accent-yellow text-black shadow-[0_0_12px_rgba(255,200,0,0.35)]"
                    : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white/90"
                  }
                `}
              >
                <span>{ch.emoji}</span>
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================= CONTENT ======================= */}
      {/* top padding accounts for both fixed bars (~104px) */}
      <div className="space-y-3 px-3 pt-[108px] pb-6">

        {/* Loading skeleton */}
        {loading && (
          <div className="pt-[100px]">
            <CommonLoading isFullScreen={false} />
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">😢</span>
            <p className="text-white/40 text-sm">วันนี้ไม่มีข่าวในช่องนี้เลย</p>
          </div>
        )}

        {/* News cards */}
        {!loading &&
          filteredMessages.map((msg, index) => {
            const newsType = detectNewsType(msg.text);
            const messageDate  = new Date(msg.date * 1000);
            const diffMinutes  = (Date.now() - messageDate.getTime()) / 60_000;
            const isNew        = diffMinutes <= 30;

            return (
              <div
                key={`${msg.id}-${index}`}
                className="
                  group relative
                  bg-[#161616]
                  rounded-2xl
                  border border-white/[0.07]
                  hover:border-white/[0.15]
                  hover:bg-[#1a1a1a]
                  transition-all duration-200
                  overflow-hidden
                "
              >
                {/* Subtle left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-yellow/60 rounded-l-2xl" />

                <div className="px-4 pt-3.5 pb-4 pl-5 bg-white !text-black">
                  {/* Author row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
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
                      </div>

                      {/* Name + date */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-white/90 leading-tight">
                          {newsType.name}
                        </span>
                        <span className="text-[11px] text-white/35">
                          {messageDate.toLocaleString("th-TH", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}{" "}
                          น.
                        </span>
                      </div>
                    </div>

                    {/* NEW badge */}
                    {isNew && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse shrink-0">
                        🔥 ใหม่
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-line">
                    {renderTextWithLinks(msg.text) || "-"}
                  </p>
                </div>
              </div>
            );
          })}

        {/* Loading more spinner */}
        {loadingMore && (
          <div className="py-6 flex justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-accent-yellow animate-spin" />
          </div>
        )}

        {/* Intersection observer anchor */}
        <div ref={observerTarget} className="h-2" />

        {/* End of feed */}
        {!loading && !hasMore && messages.length > 0 && (
          <div className="py-1 flex flex-col items-center gap-1.5">
            <div className="w-8 h-px bg-white/20" />
            <p className="text-[12px] text-white/30">อ่านครบทุกข่าวแล้ว</p>
          </div>
        )}
      </div>
    </div>
  );
}