"use client";

import CommonLoading from "@/shared/components/CommonLoading";
import { useEffect, useState } from "react";
import {
  TiChartPieOutline as ChartIcon,
  TiRefresh as RefreshIcon,
} from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { fNumber, getLogo, getName, getProfitColor } from "./lib/utils";
import { Asset } from "./lib/interface";
import FooterPortfolio from "@/shared/components/Footer";
import LoginModal from "@/shared/components/LoginModal";

const now = new Date();
const thaiMonths = [
  "ม.ค",
  "ก.พ",
  "มี.ค",
  "เม.ย",
  "พ.ค",
  "มิ.ย",
  "ก.ค",
  "ส.ค",
  "ก.ย",
  "ต.ค",
  "พ.ย",
  "ธ.ค",
];
const day = now.getDate();
const month = thaiMonths[now.getMonth()];
const year = (now.getFullYear() + 543) % 100;
const hours = now.getHours().toString().padStart(2, "0");
const minutes = now.getMinutes().toString().padStart(2, "0");

const isMock = true;

export default function StockPrice() {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [currencyRate, setCurrencyRate] = useState<number>(0);
  const [formattedDate, setFormattedDate] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [userId, setUserId] = useState("");
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [userColId, setUserColId] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editText, setEditText] = useState("");

  // Open the edit modal and populate with current assets
  const openEditModal = () => {
    setEditText(JSON.stringify(assets, null, 2));
    setIsEditOpen(true);
  };

  // Format date every render
  useEffect(() => {
    setFormattedDate(`${day} ${month} ${year} ${hours}:${minutes} น.`);
  }, [isLoggedIn]);

  // Load data when assets are available
  useEffect(() => {
    if (assets && assets.length > 0 && isLoggedIn) {
      loadData();
    }
  }, [assets, isLoggedIn]);

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  async function handleLogin() {
    if (!userId) {
      setLoginError("กรุณากรอกรหัสผ่าน");
      return;
    }
    setIsLoading(true);
    setLoginError("");

    try {
      await fetchUserData();
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "ไม่เจอผู้ใช้งาน");
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserData() {
    if (!userId) throw new Error("กรุณากรอกรหัสผ่าน");

    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) throw new Error("ไม่เจอผู้ใช้งาน");

    const dataText = await response.text();
    let parsedAssets: Asset[];
    let parsedUserId: string;

    try {
      const data = JSON.parse(dataText);
      parsedAssets = JSON.parse(data.assets);
      parsedUserId = JSON.parse(data.userId);
    } catch {
      throw new Error("ไม่สามารถอ่านข้อมูลผู้ใช้งาน");
    }

    // Set states synchronously - useEffect will trigger loadData
    setAssets(parsedAssets);
    setUserColId(parsedUserId);
    setIsLoggedIn(true);
  }

  async function loadData() {
    if (!assets || assets.length === 0) return;

    console.log("load data");
    setIsLoading(true);
    try {
      console.log("enter load data");
      await Promise.all([fetchFinancialData(), fetchFxRate()]);
    } catch (err) {
      console.error(err);
    } finally {
      console.log("finish load data");
      setIsLoading(false);
    }
  }

  async function fetchFinancialData() {
    if (!assets || assets.length === 0) return;

    try {
      let data: any;

      if (!isMock) {
        const res = await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets, isMock }),
        });
        if (!res.ok) throw new Error("Failed to fetch API");
        data = await res.json();
      } else {
        const mockPrices: Record<string, number> = {};
        const validAssets: Asset[] = [];
        for (const asset of assets) {
          mockPrices[asset.symbol] = 190.17;
          validAssets.push(asset);
        }
        data = { prices: mockPrices, assets: validAssets };
      }

      setPrices(data.prices || {});
      setLogos(data.logos || {});
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchFxRate() {
    if (isMock) {
      setCurrencyRate(32.31);
    } else {
      const res = await fetch("/api/rate", { method: "POST" });
      if (!res.ok) throw new Error(`BOT API Error: ${res.status}`);
      const data = await res.json();
      setCurrencyRate(Number(data.rate) ?? 0);
    }
  }

  const saveAssets = async () => {
    try {
      const parsed: Asset[] = JSON.parse(editText);

      // Basic validation
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
      for (const a of parsed) {
        if (!a.symbol || a.quantity == null || a.costPerShare == null) {
          throw new Error(
            "Each asset must have symbol, quantity, costPerShare"
          );
        }
      }

      const res = await fetch(`/api/user/${userColId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: parsed, isMock }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Error saving assets: " + JSON.stringify(data));
        return;
      } else {
        setIsEditOpen(false);
        await fetchUserData();
      }

      console.log("Assets saved successfully:", data);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Loading state (covers login + data loading)
  if (isLoading) {
    return <CommonLoading />;
  }

  // Not logged in → show login modal
  if (!isLoggedIn) {
    return (
      <LoginModal
        isLoggedIn={isLoggedIn}
        isLoading={isLoading}
        userId={userId}
        loginError={loginError}
        setUserId={setUserId}
        handleLogin={handleLogin}
      />
    );
  }

  // After logged in → wait for assets
  if (!assets) {
    return <CommonLoading />;
  }

  // Render main portfolio
  return (
    <div className="mt-[81px] mb-[172px]">
      {isEditOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-black-lighter p-6 rounded-lg w-[400px] flex flex-col gap-4">
            <h2 className="text-white font-bold text-xl text-center">
              แก้ไขสินทรัพย์
            </h2>
            <textarea
              className="p-2 rounded bg-white !text-black h-60"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-600 text-white p-2 rounded"
                onClick={() => setIsEditOpen(false)}
              >
                ยกเลิก
              </button>
              <button
                className="bg-accent-yellow text-black p-2 rounded"
                onClick={async () => {
                  setIsLoading(true);
                  await saveAssets();
                  setIsLoading(false);
                }}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="fixed bg-black px-4 flex justify-between w-full z-[99] sm:max-w-[450px]">
        <button
          className="bg-accent-yellow text-black p-2 rounded text-[14px]"
          onClick={openEditModal}
        >
          แก้ไขสินทรัพย์
        </button>
        <RefreshIcon
          className="cursor-pointer text-[30px] mb-4"
          onClick={loadData}
        />
      </div>

      <div className="flex flex-wrap w-full pt-[70px]">
        {/* Header */}
        <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2">
          <div className="text-[12px] text-gray-400">
            {assets.length} สินทรัพย์
          </div>
          <div className="text-[12px] text-gray-400 text-right">
            มูลค่า (THB)
          </div>
          <div className="text-[12px] text-gray-400 text-right">% กำไร</div>
        </div>

        {assets.map((asset) => {
          const currentPrice = prices[asset.symbol] ?? 0;
          const cost = asset.costPerShare * asset.quantity;
          const marketValueUsd = currentPrice * asset.quantity;
          const marketValueThb = marketValueUsd * currencyRate;
          const profit = marketValueUsd - cost;
          const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
          const profitColor = getProfitColor(profit);
          const isExpanded = !!expanded[asset.symbol];
          const portfolioValueUsd = assets.reduce(
            (sum, a) => sum + (prices[a.symbol] ?? 0) * a.quantity,
            0
          );

          return (
            <div key={asset.symbol} className="w-full shadow-sm">
              <div
                className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer hover:bg-gray-800"
                onClick={() => toggleExpand(asset.symbol)}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                        getLogo(asset.symbol, logos) ? "" : "bg-white"
                      }`}
                      style={{
                        backgroundImage: `url(${getLogo(asset.symbol, logos)})`,
                      }}
                    />
                    <div className="font-bold text-[16px]">
                      {getName(asset.symbol)}
                    </div>
                  </div>

                  <div className="text-[12px] flex items-center gap-1">
                    <ChartIcon />
                    {portfolioValueUsd > 0
                      ? `${fNumber(
                          (marketValueUsd / portfolioValueUsd) * 100
                        )}%`
                      : "0.00%"}
                  </div>
                </div>

                <div className="flex flex-col items-end whitespace-nowrap">
                  <div className="font-bold text-[16px]">
                    {fNumber(marketValueThb)} THB
                  </div>
                  <div className="text-[12px] text-gray-300">
                    ≈ {fNumber(marketValueUsd)} USD
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div
                    className={`font-bold text-[16px] flex items-center gap-1 ${profitColor}`}
                  >
                    {profit > 0 ? (
                      <UpIcon className="text-[12px]" />
                    ) : profit < 0 ? (
                      <DownIcon className="text-[12px]" />
                    ) : null}
                    {fNumber(profitPercent)}%
                  </div>
                  <div className={`text-[12px] ${profitColor}`}>
                    ({profit > 0 ? "+" : ""}
                    {fNumber(profit * currencyRate)} บาท)
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
                  <div>
                    จำนวนหุ้น:{" "}
                    <span className="text-white">
                      {fNumber(asset.quantity, { decimalNumber: 7 })}
                    </span>
                  </div>
                  <div>
                    ราคาปัจจุบัน:{" "}
                    <span className="text-white">{fNumber(currentPrice)}</span>
                  </div>
                  <div>
                    ต้นทุนต่อหุ้น:{" "}
                    <span className="text-white">
                      {fNumber(asset.costPerShare)}
                    </span>
                  </div>
                  <div>
                    ต้นทุนรวม:{" "}
                    <span className="text-white">{fNumber(cost)}</span>
                  </div>
                </div>
              )}

              <div className="border-b border-accent-yellow opacity-40 mx-4 my-2"></div>
            </div>
          );
        })}
      </div>

      <FooterPortfolio
        assets={assets}
        prices={prices}
        currencyRate={currencyRate}
        formattedDate={formattedDate}
        getProfitColor={getProfitColor}
      />
    </div>
  );
}
