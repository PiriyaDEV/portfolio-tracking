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
import { FaEye as EyeIcon, FaEyeSlash as EyeSlashIcon } from "react-icons/fa";
import { fNumber, getLogo, getName, getProfitColor } from "./lib/utils";
import { Asset } from "./lib/interface";
import FooterPortfolio from "@/shared/components/Footer";
import LoginModal from "@/shared/components/LoginModal";
import EditModal from "@/shared/components/EditModal";
import { NoItem } from "@/shared/components/NoItem";
import BottomNavbar from "@/shared/components/Navbar";
import MarketScreen from "@/shared/components/MarketScreen";
import CalculateScreen from "@/shared/components/CalculateScreen";

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

const isMock = false;

export default function StockPrice() {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [previousPrice, setPreviousPrice] = useState<
    Record<string, number | null>
  >({});
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [technicalLevels, setTechnicalLevels] = useState<any>({});
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
  const [editAssets, setEditAssets] = useState<Asset[]>([]);

  // Sorting state
  const [sortBy, setSortBy] = useState<"asset" | "value" | "profit">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Page state for bottom navbar
  const [currentPage, setCurrentPage] = useState<
    "portfolio" | "market" | "calculator"
  >("portfolio");

  // Hide/show numbers state
  const [isNumbersHidden, setIsNumbersHidden] = useState(false);

  // Open the edit modal and populate with current assets
  const openEditModal = () => {
    setEditAssets(JSON.parse(JSON.stringify(assets))); // Deep copy
    setIsEditOpen(true);
  };

  const addNewAsset = () => {
    setEditAssets([
      ...editAssets,
      { symbol: "", quantity: 0, costPerShare: 0 },
    ]);
  };

  const removeAsset = (index: number) => {
    setEditAssets(editAssets.filter((_, i) => i !== index));
  };

  const updateAsset = (
    index: number,
    field: keyof Asset,
    value: string | number
  ) => {
    const updated = [...editAssets];
    updated[index] = { ...updated[index], [field]: value };
    setEditAssets(updated);
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
    }
  }

  async function fetchUserData() {
    if (!userId) throw new Error("กรุณากรอกรหัสผ่าน");

    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) throw new Error("ไม่เจอผู้ใช้งาน");

    let parsedAssets: Asset[];
    let parsedUserId: string;

    try {
      const responseText = await response.text();
      if (
        !responseText ||
        responseText.trim() === "" ||
        responseText.trim() === '""'
      ) {
        setAssets([]);
        setUserColId(userId);
        setIsLoggedIn(true);
        return;
      }

      const data = JSON.parse(responseText);
      if (!data.assets || data.assets === "" || data.assets === '""') {
        setAssets([]);
        setUserColId(data.userId || userId);
        setIsLoggedIn(true);
        return;
      }

      parsedAssets =
        typeof data.assets === "string"
          ? JSON.parse(data.assets)
          : data.assets || [];
      parsedUserId =
        typeof data.userId === "string" && data.userId.startsWith('"')
          ? JSON.parse(data.userId)
          : data.userId || userId;
    } catch (err) {
      console.error("Parse error:", err);
      throw new Error("ไม่สามารถอ่านข้อมูลผู้ใช้งาน");
    }

    if (!parsedAssets || parsedAssets.length === 0) {
      setAssets([]);
      setUserColId(parsedUserId);
      setIsLoggedIn(true);
      return;
    }

    setAssets(parsedAssets);
    setUserColId(parsedUserId);
    setIsLoggedIn(true);
  }

  async function loadData() {
    if (!assets || assets.length === 0) return;

    setIsLoading(true);
    try {
      await Promise.all([fetchFinancialData(), fetchFxRate()]);
      const now = new Date();
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = (now.getFullYear() + 543) % 100;
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setFormattedDate(`${day} ${month} ${year} ${hours}:${minutes} น.`);
    } catch (err) {
      console.error(err);
    } finally {
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
      setTechnicalLevels(data.technicalLevels || {})
      setPreviousPrice(data.previousPrice || {});
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
    // setCurrencyRate(32.01);
  }

  const saveAssets = async () => {
    try {
      for (const a of editAssets) {
        if (!a.symbol || !a.symbol.trim()) {
          alert("กรุณากรอก Symbol");
          return;
        }
        if (a.quantity == null || a.quantity < 0) {
          alert("กรุณากรอกจำนวนหุ้นที่มากกว่าหรือเท่ากับ 0");
          return;
        }
        if (a.costPerShare == null || a.costPerShare <= 0) {
          alert("กรุณากรอกต้นทุนต่อหุ้นที่มากกว่า 0");
          return;
        }
      }

      const res = await fetch(`/api/user/${userColId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: editAssets, isMock }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Error saving assets: " + JSON.stringify(data));
        return;
      } else {
        setIsEditOpen(false);
        await fetchUserData();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Helper function to mask numbers
  const maskNumber = (value: string | number) => {
    if (!isNumbersHidden) return value;
    return "*****";
  };

  // Loading state
  if (isLoading) return <CommonLoading />;

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

  if (assets === null) return <CommonLoading />;

  assets?.length === 0 && (
    <NoItem
      onAddClick={openEditModal}
      isEditOpen={isEditOpen}
      editAssets={editAssets}
      setEditAssets={setEditAssets}
      addNewAsset={addNewAsset}
      removeAsset={removeAsset}
      saveAssets={saveAssets}
      setIsEditOpen={setIsEditOpen}
      EditModal={EditModal}
    />
  );

  // Sorting function
  const sortedAssets = [...assets].sort((a, b) => {
    const priceA = prices[a.symbol] ?? 0;
    const priceB = prices[b.symbol] ?? 0;
    const valueA = priceA * a.quantity;
    const valueB = priceB * b.quantity;
    const profitA = valueA - a.costPerShare * a.quantity;
    const profitB = valueB - b.costPerShare * b.quantity;

    let compare = 0;
    if (sortBy === "asset") compare = a.symbol.localeCompare(b.symbol);
    else if (sortBy === "value") compare = valueA - valueB;
    else if (sortBy === "profit") compare = profitA - profitB;

    return sortOrder === "asc" ? compare : -compare;
  });

  const toggleSort = (column: "asset" | "value" | "profit") => {
    if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(column);
      // Default order based on column
      if (column === "asset") setSortOrder("asc"); // asset default asc
      else setSortOrder("desc"); // value and profit default desc
    }
  };

  return (
    <div className="mt-[81px] mb-[172px]">
      {isEditOpen && (
        <EditModal
          editAssets={editAssets}
          setEditAssets={setEditAssets}
          addNewAsset={addNewAsset}
          removeAsset={removeAsset}
          saveAssets={saveAssets}
          setIsEditOpen={setIsEditOpen}
        />
      )}

      {/* Refresh Button */}
      {currentPage === "portfolio" && (
        <div className="fixed bg-black px-4 flex justify-between items-center w-full z-[99] sm:max-w-[450px] pb-5">
          <div className="flex items-center gap-3">
            <button
              className="bg-accent-yellow text-black p-2 rounded text-[14px] flex items-center justify-center h-[40px]"
              onClick={openEditModal}
            >
              แก้ไขสินทรัพย์
            </button>
            <button
              onClick={() => setIsNumbersHidden(!isNumbersHidden)}
              className="text-[24px] cursor-pointer"
              aria-label={isNumbersHidden ? "Show numbers" : "Hide numbers"}
            >
              {isNumbersHidden ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>

          <RefreshIcon
            className="cursor-pointer text-[30px]"
            onClick={loadData}
          />
        </div>
      )}

      {/* Portfolio Header */}
      <div className="flex flex-wrap w-full">
        {currentPage === "market" && (
          <MarketScreen prices={prices} technicalLevels={technicalLevels} logos={logos} />
        )}
        {currentPage === "calculator" && (
          <CalculateScreen
            assets={assets}
            prices={prices}
            currencyRate={currencyRate}
            logos={logos}
          />
        )}
        {currentPage === "portfolio" && (
          <>
            <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer fixed top-[140px] z-[99] sm:max-w-[450px] bg-black">
              <div
                className="text-[12px] text-gray-400 flex items-center gap-1"
                onClick={() => toggleSort("asset")}
              >
                สินทรัพย์{" "}
                {sortBy === "asset" && (sortOrder === "asc" ? "▲" : "▼")}
              </div>
              <div
                className="text-[12px] text-gray-400 text-right flex items-center justify-end gap-1"
                onClick={() => toggleSort("value")}
              >
                มูลค่า (THB){" "}
                {sortBy === "value" && (sortOrder === "asc" ? "▲" : "▼")}
              </div>
              <div
                className="text-[12px] text-gray-400 text-right flex items-center justify-end gap-1"
                onClick={() => toggleSort("profit")}
              >
                % กำไร{" "}
                {sortBy === "profit" && (sortOrder === "asc" ? "▲" : "▼")}
              </div>
            </div>

            <div className="mt-[100px] mb-[50px] w-full">
              {/* Portfolio Rows */}
              {sortedAssets.map((asset) => {
                const currentPrice = prices[asset.symbol] ?? 0;
                const cost = asset.costPerShare * asset.quantity;
                const marketValueUsd = currentPrice * asset.quantity;
                const marketValueThb = marketValueUsd * currencyRate;
                const profit = currentPrice > 0 ? marketValueUsd - cost : 0;
                const profitPercent =
                  currentPrice > 0 && cost > 0 ? (profit / cost) * 100 : 0;
                const profitColor = getProfitColor(profit);
                const isExpanded = !!expanded[asset.symbol];
                const portfolioValueUsd = assets.reduce(
                  (sum, a) => sum + (prices[a.symbol] ?? 0) * a.quantity,
                  0
                );

                const previousClose = previousPrice[asset.symbol] ?? 0;
                const percentChange =
                  previousClose > 0
                    ? ((currentPrice - previousClose) / previousClose) * 100
                    : 0;

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
                              backgroundImage: `url(${getLogo(
                                asset.symbol,
                                logos
                              )})`,
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
                          {maskNumber(fNumber(marketValueThb))} THB
                        </div>
                        <div className="text-[12px] text-gray-300">
                          ≈ {maskNumber(fNumber(marketValueUsd))} USD
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right">
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
                          {maskNumber(fNumber(profit * currencyRate))} บาท)
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-2 px-4 py-2 text-gray-300">
                        <div>
                          จำนวนหุ้น:{" "}
                          <span className="text-white">
                            {maskNumber(
                              fNumber(asset.quantity, { decimalNumber: 7 })
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1">
                            ราคาปัจจุบัน:{" "}
                            <span className="text-white">
                              {maskNumber(fNumber(currentPrice))} USD
                            </span>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <div
                              className={`font-bold flex items-center gap-1 ${getProfitColor(
                                percentChange
                              )}`}
                            >
                              {percentChange > 0 ? (
                                <UpIcon className="text-[12px]" />
                              ) : percentChange < 0 ? (
                                <DownIcon className="text-[12px]" />
                              ) : null}
                              {percentChange > 0 ? "+" : ""}{" "}
                              {fNumber(percentChange)}%
                            </div>
                          </div>
                        </div>
                        <div>
                          ต้นทุนต่อหุ้น:{" "}
                          <span className="text-white">
                            {maskNumber(
                              fNumber(asset.costPerShare, { decimalNumber: 4 })
                            )}{" "}
                            USD
                          </span>
                        </div>
                        <div>
                          ต้นทุนรวม:{" "}
                          <span className="text-white">
                            {maskNumber(fNumber(cost))}
                          </span>{" "}
                          USD
                        </div>
                      </div>
                    )}

                    <div className="border-b border-white opacity-10 mx-4 my-2"></div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <FooterPortfolio
        assets={assets}
        prices={prices}
        previousPrice={previousPrice}
        currencyRate={currencyRate}
        formattedDate={formattedDate}
        getProfitColor={getProfitColor}
        isNumbersHidden={isNumbersHidden}
      />

      {/* Bottom Navbar */}
      <BottomNavbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
}
