"use client";

import CommonLoading from "@/shared/components/common/CommonLoading";
import { useEffect, useState } from "react";

type TelegramMessage = {
  id: number;
  text: string;
  date: number;
};

export default function NewsScreen() {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[600px] mx-auto py-4">
      {/* =======================
          HEADER (ALWAYS SHOW)
      ======================= */}
      <div className="fixed top-[173px] left-1/2 -translate-x-1/2 max-w-[450px] w-full py-2 px-5 bg-black z-[99] border-b border-black-lighter2">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          📢 อัพเดทข่าวหุ้นล่าสุด โดย จาง
          <img
            src="https://scontent.fbkk29-8.fna.fbcdn.net/v/t39.30808-6/485042252_629097329913075_3057198464528152612_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=3kqRyClMuaMQ7kNvwH8qIVv&_nc_oc=AdnDOw7o5Rfjcbnn-WZNAFB6n_Bm4Z5COeStq4sGK8RC_xtZUiGgzKslb0uDVqj2TjI&_nc_zt=23&_nc_ht=scontent.fbkk29-8.fna&_nc_gid=3b1unHQ-T78qtNBBjcoSLA&oh=00_AfpHFu4ZhnBxVfKDYV7e3FGBlialSyzrSXwnOsz6mMzU7w&oe=69811CEA"
            alt="jang"
            className="w-8 h-8 rounded-full object-cover"
          />
        </h2>
      </div>

      {/* =======================
          CONTENT
      ======================= */}
      <div className="space-y-3 pt-[35px]">
        {/* Loading */}
        {loading && (
          <div className="pt-[50px]">
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
          messages.map((msg) => (
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
              <div className="text-xs text-gray-500 mb-2">
                {new Date(msg.date * 1000).toLocaleString("th-TH", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })} น.
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
