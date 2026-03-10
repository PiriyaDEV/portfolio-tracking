"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TiRefresh as RefreshIcon } from "react-icons/ti";
import CommonLoading from "@/shared/components/common/CommonLoading";
import {
  DEFAULT_AUTHOR,
  NEWS_CONFIG,
  CHANNELS,
  CHANNEL_DEFAULT_AUTHOR,
} from "./config.constants";

/* =======================
   Types
======================= */
type TelegramMessage = {
  id: number;
  text: string;
  date: number;
  image: string | null;
};

type ChannelCache = {
  messages: TelegramMessage[];
  offset: number;
  hasMore: boolean;
};

/* =======================
   TickerChip Component
======================= */
function TickerChip({ ticker }: { ticker: string }) {
  const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
  const logoUrl = token
    ? `https://img.logokit.com/ticker/${ticker}?token=${token}`
    : null;
  const [imgError, setImgError] = useState(false);

  return (
    <span className="bg-accent-yellow inline-flex items-center gap-1.5 mx-0.5 px-2 py-0.5 rounded-full border border-white/20 text-white/90 text-[13px] font-semibold align-middle mb-1">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={ticker}
          onError={() => setImgError(true)}
          className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 shrink-0"
        />
      ) : (
        <span className="w-5 h-5 rounded-full bg-accent-yellow/20 flex items-center justify-center text-[9px] font-bold text-accent-yellow shrink-0">
          {ticker[0]}
        </span>
      )}
      <span>{ticker}</span>
    </span>
  );
}

/* =======================
   Component
======================= */
export default function NewsScreen() {
  // Per-channel cache: keyed by channel id
  const cacheRef = useRef<Record<string, ChannelCache>>({});

  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeChannel, setActiveChannel] = useState<string>(
    CHANNELS[0]?.id ?? "usstockthailand1",
  );

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
        const key = keyword.normalize("NFC").toLowerCase();
        const index = lower.indexOf(key);
        if (index === -1) continue;

        const before = lower[index - 1];
        const after = lower[index + key.length];
        if (isThaiLetter(before) || isThaiLetter(after)) continue;

        if (index < earliestIndex) {
          earliestIndex = index;
          matchedConfig = config;
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
      const cached = cacheRef.current[channel];

      // If not a reset and we already have cached data, load more from cache state
      if (!reset && cached && cached.messages.length >= 50) {
        setHasMore(false);
        return;
      }

      try {
        if (reset) {
          setRefreshing(true);
        } else {
          setLoadingMore(true);
        }

        const currentOffset = reset ? 0 : (cached?.offset ?? 0);
        const res = await fetch(
          `/api/news?offset=${currentOffset}&limit=5&channel=${channel}`,
        );
        const data = await res.json();
        const newMessages: TelegramMessage[] = Array.isArray(data) ? data : [];

        if (reset) {
          const updated: ChannelCache = {
            messages: newMessages,
            offset: 5,
            hasMore: newMessages.length >= 5,
          };
          cacheRef.current[channel] = updated;
          setMessages(newMessages);
          setOffset(5);
          setHasMore(updated.hasMore);
        } else {
          const prevMessages = cached?.messages ?? [];
          const merged = [...prevMessages, ...newMessages];
          const newOffset = (cached?.offset ?? 0) + 5;
          const newHasMore = newMessages.length >= 5;

          cacheRef.current[channel] = {
            messages: merged,
            offset: newOffset,
            hasMore: newHasMore,
          };

          setMessages(merged);
          setOffset(newOffset);
          setHasMore(newHasMore);
        }
      } catch {
        if (reset) {
          cacheRef.current[channel] = {
            messages: [],
            offset: 0,
            hasMore: false,
          };
          setMessages([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeChannel],
  );

  /* =======================
     Channel Switch
  ======================= */
  const handleChannelChange = (channelId: string) => {
    if (channelId === activeChannel) return;

    const cached = cacheRef.current[channelId];

    setActiveChannel(channelId);

    if (cached) {
      // Restore from cache — no fetch needed
      setMessages(cached.messages);
      setOffset(cached.offset);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
      // First visit to this channel
      setMessages([]);
      setOffset(0);
      setHasMore(true);
      setLoading(true);
    }
  };

  /* =======================
     Effects
  ======================= */
  useEffect(() => {
    const cached = cacheRef.current[activeChannel];
    if (cached) {
      // Already have data, just restore UI state
      setMessages(cached.messages);
      setOffset(cached.offset);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
      fetchNews(true, activeChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loadingMore && !loading) {
        fetchNews(false);
      }
    },
    [hasMore, loadingMore, loading, fetchNews],
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  /* =======================
     Derived
  ======================= */
  const filteredMessages = messages.filter(
    (msg) => msg.text && msg.text.trim() !== "",
  );

  const activeChannelInfo = CHANNELS.find((c) => c.id === activeChannel);

  /**
   * Renders text with:
   * - Clickable URLs
   * - 🛒/💰 **TICKER** patterns replaced with <TickerChip>
   * - 🟢/**text** and 🔴/**text** rendered bold + colored
   */
  const renderTextWithLinks = (text: string) => {
    if (!text) return "-";

    // Matches:
    // 1. URLs
    // 2. 🛒/💰 **TICKER**  (ticker chip)
    // 3. 🟢/🔴 **text**    (emoji before **)
    // 4. **🟢/🔴 text**    (emoji inside **)
    const segmentRegex =
      /(https?:\/\/[^\s]+|(?:🛒|💰)\s*\*\*([A-Z]{1,6})\*\*|((?:🟢|🔴)\s*)\*\*([^*]+)\*\*|\*\*((?:🟢|🔴)[^*]+)\*\*)/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = segmentRegex.exec(text)) !== null) {
      const [
        fullMatch,
        ,
        tickerCapture,
        signalEmoji,
        signalText1,
        signalText2,
      ] = match;
      const matchStart = match.index;

      // Push plain text before this match
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`t-${keyCounter++}`}>
            {text.slice(lastIndex, matchStart)}
          </span>,
        );
      }

      if (tickerCapture) {
        // Render ticker chip
        parts.push(
          <TickerChip key={`chip-${keyCounter++}`} ticker={tickerCapture} />,
        );
      } else if (signalEmoji !== undefined || signalText2 !== undefined) {
        // Render buy/sell signal bold + colored
        const raw =
          signalEmoji !== undefined
            ? `${signalEmoji}${signalText1}`
            : signalText2!;
        const isGreen = raw.includes("🟢");
        parts.push(
          <span
            key={`signal-${keyCounter++}`}
            className={`font-bold ${isGreen ? "!text-green-600" : "!text-red-600"}`}
          >
            {raw.trim()}
          </span>,
        );
      } else {
        // Render URL link
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={fullMatch}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline break-words hover:text-blue-300 transition-colors"
          >
            {fullMatch}
          </a>,
        );
      }

      lastIndex = matchStart + fullMatch.length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`t-${keyCounter++}`}>{text.slice(lastIndex)}</span>,
      );
    }

    return parts.length > 0 ? parts : "-";
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
              {activeChannelInfo?.emoji}{" "}
              {activeChannelInfo?.label ?? "ข่าวหุ้น"}
            </h2>
            {refreshing && (
              <span className="text-[11px] text-white/40 animate-pulse">
                กำลังโหลด…
              </span>
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
                disabled={loading}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                  whitespace-nowrap shrink-0 transition-all duration-200
                  ${
                    isActive
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
            const messageDate = new Date(msg.date * 1000);
            const diffMinutes = (Date.now() - messageDate.getTime()) / 60_000;
            const isNew = diffMinutes <= 30;

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

                  {/* Post image */}
                  {msg.image && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/[0.08]">
                      <img
                        src={msg.image}
                        alt="post image"
                        className="w-full object-cover max-h-[320px]"
                      />
                    </div>
                  )}
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
