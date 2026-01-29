"use client";

import { useEffect, useState } from "react";
import { TiRefresh as RefreshIcon } from "react-icons/ti";
import CommonLoading from "@/shared/components/common/CommonLoading";

/* =======================
   Types
======================= */
type TelegramMessage = {
  id: number;
  text: string;
  date: number;
};

/* =======================
   Images
======================= */
const JANG_IMG =
  "https://scontent.fbkk29-8.fna.fbcdn.net/v/t39.30808-6/485042252_629097329913075_3057198464528152612_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=3kqRyClMuaMQ7kNvwH8qIVv&_nc_oc=AdnDOw7o5Rfjcbnn-WZNAFB6n_Bm4Z5COeStq4sGK8RC_xtZUiGgzKslb0uDVqj2TjI&_nc_zt=23&_nc_ht=scontent.fbkk29-8.fna&_nc_gid=3b1unHQ-T78qtNBBjcoSLA&oh=00_AfpHFu4ZhnBxVfKDYV7e3FGBlialSyzrSXwnOsz6mMzU7w&oe=69811CEA";

const TRUMP_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg/960px-Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg";

const FED_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg/250px-Jerome_H._Powell%2C_Federal_Reserve_Chair_%28cropped%29.jpg";

const BLOOMBERG_IMG =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLK1AOVgt-A3X8YCOi2XAJ_VyDl3dMfB57uQ&s";

/* =======================
   Component
======================= */
export default function NewsScreen() {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================
     Helpers
  ======================= */
  function getTickerFromText(text?: string): string | null {
    if (!text) return null;
    const first50 = text.slice(0, 50);
    const match = first50.match(/\b[A-Z]{4,5}\b/);
    return match ? match[0] : null;
  }

  function getNewsType(text?: string) {
    if (!text) return null;
    const lower = text.toLowerCase();

    if (lower.includes("ทรัมป์") || lower.includes("ประธานาธิบดี")) {
      return "trump";
    }
    if (
      lower.includes("fomc") ||
      lower.includes("เฟด") ||
      lower.includes("พาวเวลล์")
    ) {
      return "fed";
    }
    if (lower.includes("bloomberg")) {
      return "bloomberg";
    }
    return null;
  }

  function getAuthorName(text?: string) {
    const ticker = getTickerFromText(text);
    const type = getNewsType(text);

    if (type === "trump") return "โดนัลด์ ทรัมป์";
    if (type === "fed") return "ประธานเฟด (เจอโรม พาวเวลล์)";
    if (type === "bloomberg") return "Bloomberg";
    if (ticker) return ticker;
    return "คุณ จาง";
  }

  function getAuthorImage(text?: string) {
    const ticker = getTickerFromText(text);
    const type = getNewsType(text);
    const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;

    if (type === "trump") return TRUMP_IMG;
    if (type === "fed") return FED_IMG;
    if (type === "bloomberg") return BLOOMBERG_IMG;

    if (ticker && token) {
      return `https://img.logokit.com/ticker/${ticker}?token=${token}`;
    }
    return JANG_IMG;
  }

  /* =======================
     Fetch News
  ======================= */
  const fetchNews = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/news");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredMessages = messages.filter(
    (msg) => msg.text && msg.text.trim() !== "",
  );

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
            onClick={fetchNews}
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
        {(refreshing || loading) && (
          <div className="pt-[50px]">
            <CommonLoading isFullScreen={false} />
          </div>
        )}

        {/* Empty */}
        {!(refreshing || loading) && messages.length === 0 && (
          <div className="p-4">
            <div className="bg-white rounded-xl p-4 text-gray-500 text-sm text-center shadow-sm border">
              วันนี้ไม่มีข่าวจ้า 😢
            </div>
          </div>
        )}

        {/* News list */}
        {!(refreshing || loading) &&
          filteredMessages.map((msg) => (
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
              <div className="text-[14px] text-gray-500 mb-2 flex items-center gap-3 pb-2">
                <div className="relative w-12 h-12 shrink-0">
                  <img
                    src={getAuthorImage(msg.text)}
                    alt="author"
                    className="w-12 h-12 rounded-full object-cover border-[2px] border-accent-yellow"
                  />

                  {getNewsType(msg.text) === "trump" && (
                    <span className="absolute -right-1 -bottom-1 text-lg">
                      😡
                    </span>
                  )}
                  {getNewsType(msg.text) === "fed" && (
                    <span className="absolute -right-1 -bottom-1 text-lg">
                      😢
                    </span>
                  )}
                  {getNewsType(msg.text) === "bloomberg" && (
                    <span className="absolute -right-1 -bottom-1 text-lg">
                      📰
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-gray-800">
                    {getAuthorName(msg.text)}
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

              <div className="text-[16px] text-gray-800 whitespace-pre-line leading-relaxed">
                {msg.text || "-"}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
