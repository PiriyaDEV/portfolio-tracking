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
import { GraphModal } from "../AnalystScreen/components/GraphPrice/components/GraphModal";
import { useMarketStore } from "@/store/useMarketStore";
import GoogleNewsPanel from "./GoogleNewsPanel";

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

type GoogleNewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
};

export type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type Props = {
  assets?: Asset[];
};

/* =======================
   TickerChip Component
======================= */
function TickerChip({
  ticker,
  setSelectedSymbol,
}: {
  ticker: string;
  setSelectedSymbol: any;
}) {
  const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
  const logoUrl = token
    ? `https://img.logokit.com/ticker/${ticker}?token=${token}`
    : null;
  const [imgError, setImgError] = useState(false);

  return (
    <span
      className="bg-accent-yellow inline-flex items-center gap-1.5 mx-0.5 px-2 py-0.5 rounded-full border border-white/20 text-white/90 text-[13px] font-semibold align-middle mb-1"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedSymbol(ticker);
      }}
    >
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
   DateChip Component
======================= */
function DateChip({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center">
      <span className="px-5 py-1 bg-black/40 backdrop-blur-sm border border-white/[0.1] rounded-full text-[11px] text-white/45 font-medium tracking-wide select-none">
        {label}
      </span>
    </div>
  );
}

/* =======================
   Google News Helpers
======================= */
function formatTimeAgo(pubDate: string): string {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (isNaN(date.getTime())) return pubDate;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "เมื่อกี้";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "เมื่อวาน";
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTickerColor(ticker: string): string {
  const colors = [
    "from-yellow-500 to-orange-500",
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-red-500 to-rose-500",
    "from-indigo-500 to-violet-500",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash += ticker.charCodeAt(i);
  return colors[hash % colors.length];
}

function TickerAvatar({ ticker }: { ticker: string }) {
  const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
  const logoUrl = token
    ? `https://img.logokit.com/ticker/${ticker}?token=${token}`
    : null;
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={ticker}
        onError={() => setImgError(true)}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-accent-yellow/50 shrink-0"
      />
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getTickerColor(ticker)} flex items-center justify-center ring-2 ring-accent-yellow/50 shrink-0`}
    >
      <span className="text-[11px] font-black text-white">
        {ticker.slice(0, 2)}
      </span>
    </div>
  );
}

/* =======================
   Main NewsScreen
======================= */
const GOOGLE_NEWS_TAB_ID = "__google_news__";

export default function NewsScreen({ assets = [] }: Props) {
  const cacheRef = useRef<Record<string, ChannelCache>>({});
  const { currencyRate } = useMarketStore();

  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeChannel, setActiveChannel] = useState<string>(
    CHANNELS[0]?.id ?? "usstockthailand1",
  );

  const observerTarget = useRef<HTMLDivElement>(null);

  const isGoogleTab = activeChannel === GOOGLE_NEWS_TAB_ID;

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
      return (
        (code >= 0x0e01 && code <= 0x0e2e) || (code >= 0x0e2f && code <= 0x0e5b)
      );
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
     Fetch News (Telegram)
  ======================= */
  const fetchNews = useCallback(
    async (reset = false, channelOverride?: string) => {
      const channel = channelOverride ?? activeChannel;
      if (channel === GOOGLE_NEWS_TAB_ID) return;

      const cached = cacheRef.current[channel];
      if (!reset && cached && cached.messages.length >= 50) {
        setHasMore(false);
        return;
      }

      try {
        if (reset) setRefreshing(true);
        else setLoadingMore(true);

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
    setActiveChannel(channelId);

    if (channelId === GOOGLE_NEWS_TAB_ID) {
      setLoading(false);
      return;
    }

    const cached = cacheRef.current[channelId];
    if (cached) {
      setMessages(cached.messages);
      setOffset(cached.offset);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
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
    if (activeChannel === GOOGLE_NEWS_TAB_ID) return;
    const cached = cacheRef.current[activeChannel];
    if (cached) {
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
      if (
        target.isIntersecting &&
        hasMore &&
        !loadingMore &&
        !loading &&
        !isGoogleTab
      ) {
        fetchNews(false);
      }
    },
    [hasMore, loadingMore, loading, fetchNews, isGoogleTab],
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
     Derived (Telegram)
  ======================= */
  const filteredMessages = messages.filter(
    (msg) => msg.text && msg.text.trim() !== "",
  );

  function formatDateChip(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const msgDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    if (msgDay.getTime() === today.getTime()) return "วันนี้";
    if (msgDay.getTime() === yesterday.getTime()) return "เมื่อวาน";
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  type DisplayItem =
    | { type: "date"; label: string; key: string }
    | { type: "message"; msg: TelegramMessage; index: number };

  const displayItems: DisplayItem[] = [];
  let lastDateKey = "";

  filteredMessages.forEach((msg, index) => {
    const msgDate = new Date(msg.date * 1000);
    const dateKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;
    if (dateKey !== lastDateKey) {
      displayItems.push({
        type: "date",
        label: formatDateChip(msgDate),
        key: `date-${dateKey}`,
      });
      lastDateKey = dateKey;
    }
    displayItems.push({ type: "message", msg, index });
  });

  const renderTextWithLinks = (text: string) => {
    if (!text) return "-";
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
      if (matchStart > lastIndex) {
        parts.push(
          <span key={`t-${keyCounter++}`}>
            {text.slice(lastIndex, matchStart)}
          </span>,
        );
      }
      if (tickerCapture) {
        parts.push(
          <TickerChip
            key={`chip-${keyCounter++}`}
            ticker={tickerCapture}
            setSelectedSymbol={setSelectedSymbol}
          />,
        );
      } else if (signalEmoji !== undefined || signalText2 !== undefined) {
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

    if (lastIndex < text.length) {
      parts.push(
        <span key={`t-${keyCounter++}`}>{text.slice(lastIndex)}</span>,
      );
    }
    return parts.length > 0 ? parts : "-";
  };

  const activeChannelInfo = CHANNELS.find((c) => c.id === activeChannel);

  /* =======================
     Render
  ======================= */
  return (
    <div className="max-w-[600px] mx-auto">
      {selectedSymbol && (
        <GraphModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
          currencyRate={currencyRate}
        />
      )}

      {/* ======================= HEADER ======================= */}
      <div className="fixed top-[160px] left-1/2 -translate-x-1/2 max-w-[450px] w-full z-[99]">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black-lighter border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isGoogleTab ? "📰" : "📢"}</span>
            <h2 className="text-[13px] font-semibold text-white/90 tracking-wide">
              {isGoogleTab
                ? "ข่าวหุ้นของคุณ"
                : `${activeChannelInfo?.emoji ?? ""} ${activeChannelInfo?.label ?? "ข่าวหุ้น"}`}
            </h2>
            {refreshing && (
              <span className="text-[11px] text-white/40 animate-pulse">
                กำลังโหลด…
              </span>
            )}
          </div>

          {!isGoogleTab && (
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
          )}
        </div>

        {/* Channel tab pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-black border-b !border-yellow-400/[0.5] overflow-x-auto scrollbar-none">
          {/* Google News tab — only shown if assets provided */}
          {assets.length > 0 && (
            <button
              onClick={() => handleChannelChange(GOOGLE_NEWS_TAB_ID)}
              className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium
                whitespace-nowrap shrink-0 transition-all duration-200
                ${
                  isGoogleTab
                    ? "bg-accent-yellow text-black shadow-[0_0_12px_rgba(255,200,0,0.35)]"
                    : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white/90"
                }
              `}
            >
              <span>📰</span>
              <span>ข่าวหุ้น</span>
            </button>
          )}

          {/* Telegram channels */}
          {CHANNELS.map((ch) => {
            const isActive = ch.id === activeChannel;
            return (
              <button
                key={ch.id}
                onClick={() => handleChannelChange(ch.id)}
                disabled={loading && !isGoogleTab}
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
      <div className="space-y-3 pt-[98px] pb-6">
        {/* ── Google News Panel ── */}
        {isGoogleTab && <GoogleNewsPanel assets={assets} />}

        {/* ── Telegram Feed ── */}
        {!isGoogleTab && (
          <>
            {loading && (
              <div className="pt-[100px]">
                <CommonLoading isFullScreen={false} />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="mt-16 flex flex-col items-center gap-3 text-center">
                <span className="text-5xl">😢</span>
                <p className="text-white/40 text-sm">
                  วันนี้ไม่มีข่าวในช่องนี้เลย
                </p>
              </div>
            )}

            {!loading &&
              displayItems.map((item) => {
                if (item.type === "date") {
                  return <DateChip key={item.key} label={item.label} />;
                }

                const { msg, index } = item;
                const newsType = detectNewsType(msg.text);
                const messageDate = new Date(msg.date * 1000);
                const diffMinutes =
                  (Date.now() - messageDate.getTime()) / 60_000;
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
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-yellow/60 rounded-l-2xl" />
                    <div className="px-4 pt-3.5 pb-4 pl-5 bg-white !text-black">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
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
                        {isNew && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse shrink-0">
                            🔥 ใหม่
                          </span>
                        )}
                      </div>

                      <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-line">
                        {renderTextWithLinks(msg.text) || "-"}
                      </p>

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

            {loadingMore && (
              <div className="py-6 flex justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-accent-yellow animate-spin" />
              </div>
            )}

            <div ref={observerTarget} className="h-2" />

            {!loading && !hasMore && messages.length > 0 && (
              <div className="py-1 flex flex-col items-center gap-1.5">
                <div className="w-8 h-px bg-white/20" />
                <p className="text-[12px] text-white/30">อ่านครบทุกข่าวแล้ว</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
