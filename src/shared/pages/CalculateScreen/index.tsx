"use client";

import { useState } from "react";
import { TiChartPieOutline as ChartIcon } from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
  FaCalculator,
  FaBullseye,
} from "react-icons/fa6";
import { fNumber, getLogo, getName } from "@/app/lib/utils";
import { useMaskNumber } from "@/shared/hooks/useMaskNumber";

export type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type CalculatorScreenProps = {
  assets: Asset[];
  prices: any; // current price (THB for Thai stocks, USD for US stocks)
  currencyRate: number; // USD -> THB
};

// Helper function to check if stock is Thai
const isThaiStock = (symbol: string): boolean => {
  return symbol.toUpperCase().endsWith(".BK");
};

export default function CalculatorScreen({
  assets,
  prices,
  currencyRate,
}: CalculatorScreenProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    assets.length > 0 ? assets[0].symbol : "",
  );
  const [newInvestment, setNewInvestment] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [estimatePrice, setEstimatePrice] = useState<string>("");
  const [newCostPerShare, setNewCostPerShare] = useState<number | null>(null);
  const maskNumber = useMaskNumber();

  const [activeTab, setActiveTab] = useState<"calculator" | "estimate">(
    "calculator",
  );

  const [afterData, setAfterData] = useState<{
    quantity: number;
    costPerShare: number;
    totalCost: number;
    marketValueBase: number; // in original currency
    marketValueThb: number;
    profit: number;
    profitPercent: number;
    estimateCost?: number;
  } | null>(null);

  const calculateNewCost = () => {
    const asset = assets.find((a) => a.symbol === selectedSymbol);
    if (!asset) return;

    const isThai = isThaiStock(selectedSymbol);
    const investment = parseFloat(newInvestment);
    const price = parseFloat(newPrice);

    if (isNaN(investment) || isNaN(price) || price <= 0) return;

    // Convert investment THB to stock currency
    const investmentInStockCurrency = isThai
      ? investment
      : investment / currencyRate;
    const newQty = investmentInStockCurrency / price;
    const existingQty = parseFloat(asset.quantity.toString());
    const existingCost = parseFloat(asset.costPerShare.toString());
    const totalQty = existingQty + newQty;
    const totalCostInStockCurrency =
      existingQty * existingCost + investmentInStockCurrency;
    const averageCostInStockCurrency = totalCostInStockCurrency / totalQty;

    setNewCostPerShare(averageCostInStockCurrency);

    // Update after card data
    const currentPrice = prices[asset.symbol] ?? 0;
    const marketValueBase = currentPrice * totalQty;
    const marketValueThb = isThai
      ? marketValueBase
      : marketValueBase * currencyRate;
    const profit = marketValueBase - totalCostInStockCurrency;
    const profitPercent =
      totalCostInStockCurrency > 0
        ? (profit / totalCostInStockCurrency) * 100
        : 0;

    setAfterData({
      quantity: totalQty,
      costPerShare: averageCostInStockCurrency,
      totalCost: totalCostInStockCurrency,
      marketValueBase,
      marketValueThb,
      profit,
      profitPercent,
    });
  };

  const calculateEstimateCost = () => {
    const asset = assets.find((a) => a.symbol === selectedSymbol);
    if (!asset) return;

    const isThai = isThaiStock(selectedSymbol);
    const price = parseFloat(estimatePrice);

    const totalQty = asset.quantity;
    const totalCostInStockCurrency = asset.quantity * asset.costPerShare;
    const averageCostInStockCurrency = totalCostInStockCurrency / totalQty;

    setNewCostPerShare(averageCostInStockCurrency);

    // Update after card data
    const currentPrice = price;
    const marketValueBase = currentPrice * totalQty;
    const marketValueThb = isThai
      ? marketValueBase
      : marketValueBase * currencyRate;
    const profit = marketValueBase - totalCostInStockCurrency;
    const profitPercent =
      totalCostInStockCurrency > 0
        ? (profit / totalCostInStockCurrency) * 100
        : 0;

    setAfterData({
      quantity: totalQty,
      costPerShare: averageCostInStockCurrency,
      totalCost: totalCostInStockCurrency,
      marketValueBase,
      marketValueThb,
      profit,
      profitPercent,
      estimateCost: currentPrice,
    });
  };

  const asset = assets.find((a) => a.symbol === selectedSymbol);
  if (!asset) return null;

  const isThai = isThaiStock(selectedSymbol);
  const currencyLabel = isThai ? "THB" : "USD";

  // --- Before calculations ---
  const currentPrice = prices[asset.symbol] ?? 0;
  const cost = asset.quantity * asset.costPerShare; // in stock currency
  const marketValueBase = currentPrice * asset.quantity; // in stock currency
  const marketValueThb = isThai
    ? marketValueBase
    : marketValueBase * currencyRate;
  const profit = marketValueBase - cost;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
  const profitColor =
    profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-white";
  const profitThb = isThai ? profit : profit * currencyRate;

  const tabs = [
    {
      key: "calculator",
      label: "คำนวณต้นทุน",
      icon: <FaCalculator />, // change icon as needed
    },
    {
      key: "estimate",
      label: "คำนวณเป้าหมาย",
      icon: <FaBullseye />, // change icon as needed
    },
  ];

  return (
    <div className="p-4 w-full pb-[100px]">
      {/* Tabs mapping */}
      <div className="fixed top-[80px] left-1/2 -translate-x-1/2 max-w-[450px] w-full bg-black w-full py-3 px-5 px-1 border-b border-black-lighter2">
        <div className="flex justify-start gap-[35px]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            if (tab?.label == "") return null;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as "calculator" | "estimate");

                  // Clear all data on tab change
                  setAfterData(null);
                  setNewInvestment("");
                  setNewPrice("");
                  setEstimatePrice("");
                  setNewCostPerShare(null);
                }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition
              ${
                isActive
                  ? "bg-yellow-500 text-white"
                  : "bg-black-lighter2 text-white"
              }
            `}
                >
                  {tab.icon}
                </div>

                <span
                  className={`text-xs ${
                    isActive ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset selector */}
      <div className="pt-[95px] mb-6 flex flex-col gap-2">
        <label className="text-white text-sm">เลือกหุ้น</label>
        <select
          value={selectedSymbol}
          onChange={(e) => {
            setSelectedSymbol(e.target.value);
            // Clear all input and output data when changing asset
            setAfterData(null);
            setNewInvestment("");
            setNewPrice("");
            setEstimatePrice("");
            setNewCostPerShare(null);
          }}
          className="p-2 rounded bg-black-lighter2 text-white w-full"
        >
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {getName(a.symbol)}
            </option>
          ))}
        </select>

        <div>
          <label className="text-white text-sm">
            ราคาตอนนี้:{" "}
            <span className="font-bold">
              ({currentPrice} {currencyLabel})
            </span>
          </label>
        </div>
      </div>

      {/* Inputs column */}

      {activeTab == "calculator" && (
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-white text-sm">จำนวนเงินลงทุนใหม่ (บาท)</label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="จำนวนเงินลงทุนใหม่ (บาท)"
            value={newInvestment}
            onChange={(e) => setNewInvestment(e.target.value)}
            className="p-2 rounded bg-black-lighter2 text-white"
          />

          <label className="text-white text-sm">
            ราคาหุ้นใหม่ ({currencyLabel})
          </label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder={`ราคาหุ้นใหม่ (${currencyLabel})`}
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="p-2 rounded bg-black-lighter2 text-white"
          />

          <button
            onClick={calculateNewCost}
            className="bg-yellow-500 text-black p-2 rounded font-bold"
          >
            คำนวณต้นทุนเฉลี่ย
          </button>
        </div>
      )}

      {activeTab == "estimate" && (
        <div className="mb-4 flex flex-col gap-2">
          <label className="text-white text-sm">
            ราคาหุ้นเป้าหมาย ({currencyLabel})
          </label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder={`ราคาหุ้นเป้าหมาย (${currencyLabel})`}
            value={estimatePrice}
            onChange={(e) => setEstimatePrice(e.target.value)}
            className="p-2 rounded bg-black-lighter2 text-white"
          />

          <button
            onClick={calculateEstimateCost}
            className="bg-yellow-500 text-black p-2 rounded font-bold"
          >
            คำนวณเป้าหมาย
          </button>
        </div>
      )}
      {/* Show before/after cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Before card */}
        <div className="w-full shadow-sm">
          <div className="text-white font-bold px-4 py-1 bg-gray-700">ก่อน</div>
          <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-black-lighter">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                    getLogo(asset.symbol) ? "" : "bg-white"
                  }`}
                  style={{
                    backgroundImage: `url(${getLogo(asset.symbol)})`,
                  }}
                />
                <div className="font-bold text-[16px]">
                  {getName(asset.symbol)}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end whitespace-nowrap">
              <div className="font-bold text-[16px]">
                {maskNumber(fNumber(marketValueThb))} THB
              </div>
              <div className="text-[12px] text-gray-300">
                ≈{" "}
                {maskNumber(
                  fNumber(
                    isThai ? marketValueBase / currencyRate : marketValueBase,
                  ),
                )}{" "}
                USD
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
                {maskNumber(fNumber(profitThb))} บาท)
              </div>
            </div>
          </div>

          <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
            <div>
              จำนวนหุ้น:{" "}
              <span className="text-white">
                {maskNumber(fNumber(asset.quantity, { decimalNumber: 7 }))}
              </span>
            </div>
            <div>
              ราคาปัจจุบัน:{" "}
              <span className="text-white">{fNumber(currentPrice)}</span>{" "}
              {currencyLabel}
            </div>
            <div>
              ต้นทุนต่อหุ้น:{" "}
              <span className="text-white">
                {maskNumber(fNumber(asset.costPerShare, { decimalNumber: 4 }))}
              </span>{" "}
              {currencyLabel}
            </div>
            <div>
              ต้นทุนรวม:{" "}
              <span className="text-white">{maskNumber(fNumber(cost))}</span>{" "}
              {currencyLabel}
            </div>
          </div>
        </div>

        {/* After card */}
        {afterData && (
          <div className="w-full shadow-sm">
            <div className="text-white font-bold px-4 py-1 bg-gray-700">
              หลัง{" "}
              {activeTab === "calculator" && afterData
                ? `(ต้นทุนใหม่: ${fNumber(afterData.costPerShare, {
                    decimalNumber: 4,
                  })} ${currencyLabel})`
                : activeTab === "estimate" && afterData.estimateCost
                  ? `(ที่ราคา: ${afterData.estimateCost} ${currencyLabel})`
                  : ""}
            </div>
            <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-black-lighter">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                      getLogo(asset.symbol) ? "" : "bg-white"
                    }`}
                    style={{
                      backgroundImage: `url(${getLogo(asset.symbol)})`,
                    }}
                  />
                  <div className="font-bold text-[16px]">
                    {getName(asset.symbol)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end whitespace-nowrap">
                <div className="font-bold text-[16px]">
                  {maskNumber(fNumber(afterData.marketValueThb))} THB
                </div>
                {!isThai && (
                  <div className="text-[12px] text-gray-300">
                    ≈ {maskNumber(fNumber(afterData.marketValueBase))} USD
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end text-right">
                <div
                  className={`font-bold text-[16px] flex items-center gap-1 ${
                    afterData.profit > 0
                      ? "text-green-500"
                      : afterData.profit < 0
                        ? "text-red-500"
                        : "text-white"
                  }`}
                >
                  {afterData.profit > 0 ? (
                    <UpIcon className="text-[12px]" />
                  ) : afterData.profit < 0 ? (
                    <DownIcon className="text-[12px]" />
                  ) : null}
                  {fNumber(afterData.profitPercent)}%
                </div>
                <div
                  className={`text-[12px] ${
                    afterData.profit > 0
                      ? "text-green-500"
                      : afterData.profit < 0
                        ? "text-red-500"
                        : "text-white"
                  }`}
                >
                  ({afterData.profit > 0 ? "+" : ""}
                  {maskNumber(
                    fNumber(
                      isThai
                        ? afterData.profit
                        : afterData.profit * currencyRate,
                    ),
                  )}{" "}
                  บาท)
                </div>
              </div>
            </div>

            <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
              <div>
                จำนวนหุ้น:{" "}
                <span className="text-white">
                  {maskNumber(
                    fNumber(afterData.quantity, { decimalNumber: 7 }),
                  )}
                </span>
              </div>
              <div>
                ราคาปัจจุบัน:{" "}
                <span className="text-white">
                  {activeTab === "estimate" && afterData.estimateCost
                    ? `${fNumber(afterData.estimateCost)} ${currencyLabel}`
                    : `${fNumber(currentPrice)} ${currencyLabel}`}
                </span>
              </div>

              <div>
                ต้นทุนต่อหุ้นใหม่:{" "}
                <span className="text-white">
                  {maskNumber(fNumber(afterData.costPerShare))}
                </span>{" "}
                {currencyLabel}
              </div>
              <div>
                ต้นทุนรวม:{" "}
                <span className="text-white">
                  {maskNumber(fNumber(afterData.totalCost))}
                </span>{" "}
                {currencyLabel}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
