import { useEffect, useState } from "react";
import CommonLoading from "../CommonLoading";
import { getName } from "@/app/lib/utils";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type Entity = {
  symbol?: string;
  name?: string;
  country?: string;
  industry?: string;
  sentiment_score?: number;
};

type NewsItem = {
  uuid?: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
  published_at?: string;
  source?: string;
  entities?: Entity[];
};

export default function MarketScreen({ assets }: { assets: Asset[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    assets?.[0]?.symbol || ""
  );
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedSymbol) {
      setNews([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`/api/news?symbols=${encodeURIComponent(selectedSymbol)}`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data?.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setNews([]);
        setLoading(false);
      });
  }, [selectedSymbol]);

  if (loading) return <CommonLoading />;

  return (
    <div className="w-full">
      <div className="px-4 fixed w-full z-50 sm:w-[450px] bg-black">
        <h2 className="text-xl font-bold mb-4">ข่าวสารตลาด</h2>

        {/* Asset selector */}
        <div className="mb-4 w-full">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white w-full"
          >
            {assets?.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {getName(a.symbol) || a.symbol}
              </option>
            )) || <option>ไม่มีข้อมูล</option>}
          </select>
        </div>
      </div>

      <div className="p-4 mt-[100px]">
        {news?.length === 0 ? (
          <p>ไม่พบข่าวสำหรับ {getName(selectedSymbol) || selectedSymbol}.</p>
        ) : (
          <div className="space-y-6">
            {news.map((item) => (
              <div
                key={item.uuid || Math.random()}
                className="border rounded p-4 flex flex-col md:flex-row gap-4"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title || "ภาพข่าว"}
                    className="w-full md:w-48 h-32 object-cover rounded"
                  />
                ) : (
                  <div className="w-full md:w-48 h-32 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                    ไม่มีภาพ
                  </div>
                )}
                <div className="flex-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold hover:underline"
                    >
                      {item.title || "ไม่มีหัวข้อ"}
                    </a>
                  ) : (
                    <p className="text-lg font-semibold">
                      {item.title || "ไม่มีหัวข้อ"}
                    </p>
                  )}
                  <p className="text-gray-600 text-sm mt-1">
                    {item.description || "ไม่มีรายละเอียดข่าว"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleString("th-TH")
                      : "วันที่ไม่ระบุ"}{" "}
                    | {item.source || "แหล่งข่าวไม่ระบุ"}
                  </p>

                  {item.entities && item.entities?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.entities.map((e, idx) => (
                        <span
                          key={e.symbol || idx}
                          className="bg-yellow-100 !text-black px-2 py-1 rounded text-xs"
                        >
                          {e.symbol || "ไม่ระบุ"} (
                          {e.sentiment_score?.toFixed(2) ?? "N/A"})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
