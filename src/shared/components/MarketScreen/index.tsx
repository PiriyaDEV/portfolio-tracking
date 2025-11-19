import { useEffect, useState } from "react";
import CommonLoading from "../CommonLoading";

type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type QuoteItem = {
  exchange: string;
  shortname: string;
  quoteType: string;
  symbol: string;
  index: string;
  score: number;
  typeDisp: string;
  longname: string;
  exchDisp: string;
  sector?: string;
  sectorDisp?: string;
  industry?: string;
  industryDisp?: string;
  dispSecIndFlag?: boolean;
  isYahooFinance: boolean;
  prevName?: string;
  nameChangeDate?: string;
};

type NewsItem = {
  uuid?: string;
  title?: string;
  publisher?: string;
  url?: string;
  image_url?: string;
  providerPublishTime?: string;
  type?: string;
  relatedTickers?: string[];
};

export default function MarketScreen({ assets }: { assets: Asset[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    assets?.[0]?.symbol || ""
  );

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSymbol) {
        setNews([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("/api/news-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: selectedSymbol }),
        });

        const resData = await res.json();
        const data = resData.results;

        // Map news with ALL fields including thumbnail
        const mappedNews: NewsItem[] =
          data.news?.map((item: any) => ({
            uuid: item.uuid,
            title: item.title,
            publisher: item.publisher,
            url: item.link,
            image_url: item.thumbnail?.resolutions?.[0]?.url || "",
            providerPublishTime: item.providerPublishTime,
            type: item.type,
            relatedTickers: item.relatedTickers,
          })) || [];

        setNews(mappedNews);
      } catch (err) {
        console.error(err);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSymbol]);

  if (loading) return <CommonLoading />;

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Header & Asset Selector */}
      <div className="px-4 py-4 fixed w-full z-50 sm:w-[450px] bg-black border-b border-gray-800">
        <h2 className="text-xl font-bold mb-4">ข่าวสารตลาด</h2>

        <div className="mb-2 w-full">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white w-full border border-gray-700"
          >
            {assets?.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.symbol}
              </option>
            )) || <option>ไม่มีข้อมูล</option>}
          </select>
        </div>
      </div>

      <div className="p-4 mt-[120px] space-y-6">
        {/* News Cards */}
        <div>
          <h3 className="text-lg font-bold mb-3">ข่าวสาร ({news.length})</h3>
          {news.length === 0 ? (
            <p className="text-gray-400">ไม่พบข่าวสำหรับ {selectedSymbol}</p>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div
                  key={item.uuid || Math.random()}
                  className="border border-gray-700 rounded-lg p-4 bg-black-lighter hover:bg-gray-800 transition-colors duration-300"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Thumbnail */}
                    <div
                      className="w-full md:w-48 h-32 rounded-lg bg-gray-700 bg-center bg-cover flex-shrink-0"
                      style={{
                        backgroundImage: `url('${
                          item.image_url || "https://i.sstatic.net/y9DpT.jpg"
                        }')`,
                      }}
                    ></div>

                    {/* Content */}
                    <div className="flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold hover:text-blue-400 transition-colors"
                      >
                        {item.title}
                      </a>

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-gray-700 rounded">
                          {item.publisher || "Unknown"}
                        </span>
                        {item.type && (
                          <span className="px-2 py-1 bg-gray-700 rounded">
                            {item.type}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-400 text-sm mt-2">
                        {item.providerPublishTime
                          ? new Date(item.providerPublishTime).toLocaleString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "วันที่ไม่ระบุ"}
                      </p>

                      {/* Related Tickers */}
                      {item.relatedTickers &&
                        item.relatedTickers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.relatedTickers.map((ticker) => (
                              <span
                                key={ticker}
                                className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded"
                              >
                                {ticker}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
