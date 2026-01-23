"use client";

import { useState } from "react";
import { TiChartPieOutline as ChartIcon } from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
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
  prices: any; // current price USD
  currencyRate: number; // USD -> THB
};

export default function CalculatorScreen({
  assets,
  prices,
  currencyRate,
}: CalculatorScreenProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    assets.length > 0 ? assets[0].symbol : ""
  );
  const [newInvestment, setNewInvestment] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [estimatePrice, setEstimatePrice] = useState<string>("");
  const [newCostPerShare, setNewCostPerShare] = useState<number | null>(null);
  const maskNumber = useMaskNumber();

  const [activeTab, setActiveTab] = useState<"calculator" | "estimate">(
    "calculator"
  );

  const [afterData, setAfterData] = useState<{
    quantity: number;
    costPerShare: number;
    totalCost: number;
    marketValueUsd: number;
    marketValueThb: number;
    profit: number;
    profitPercent: number;
    estimateCost?: number;
  } | null>(null);

  const calculateNewCost = () => {
    const asset = assets.find((a) => a.symbol === selectedSymbol);
    if (!asset) return;

    const investment = parseFloat(newInvestment);
    const price = parseFloat(newPrice);

    if (isNaN(investment) || isNaN(price) || price <= 0) return;

    const investmentUSD = investment / currencyRate;
    const newQty = investmentUSD / price;
    const existingQty = parseFloat(asset.quantity.toString());
    const existingCost = parseFloat(asset.costPerShare.toString());
    const totalQty = existingQty + newQty;
    const totalCostUSD = existingQty * existingCost + investmentUSD;
    const averageCostUSD = totalCostUSD / totalQty;

    setNewCostPerShare(averageCostUSD);

    // Update after card data
    const currentPrice = prices[asset.symbol] ?? 0;
    const marketValueUsd = currentPrice * totalQty;
    const marketValueThb = marketValueUsd * currencyRate;
    const profit = marketValueUsd - totalCostUSD;
    const profitPercent = totalCostUSD > 0 ? (profit / totalCostUSD) * 100 : 0;

    setAfterData({
      quantity: totalQty,
      costPerShare: averageCostUSD,
      totalCost: totalCostUSD,
      marketValueUsd,
      marketValueThb,
      profit,
      profitPercent,
    });
  };

  const calculateEstimateCost = () => {
    const asset = assets.find((a) => a.symbol === selectedSymbol);
    if (!asset) return;

    // const investment = parseFloat(newInvestment);
    const price = parseFloat(estimatePrice);

    const totalQty = asset.quantity;
    const totalCostUSD = asset.quantity * asset.costPerShare;
    const averageCostUSD = totalCostUSD / totalQty;

    setNewCostPerShare(averageCostUSD);

    // Update after card data
    const currentPrice = price;
    const marketValueUsd = currentPrice * totalQty;
    const marketValueThb = marketValueUsd * currencyRate;
    const profit = marketValueUsd - totalCostUSD;
    const profitPercent = totalCostUSD > 0 ? (profit / totalCostUSD) * 100 : 0;

    setAfterData({
      quantity: totalQty,
      costPerShare: averageCostUSD,
      totalCost: totalCostUSD,
      marketValueUsd,
      marketValueThb,
      profit,
      profitPercent,
      estimateCost: currentPrice,
    });
  };

  const asset = assets.find((a) => a.symbol === selectedSymbol);
  if (!asset) return null;

  // --- Before calculations ---
  const currentPrice = prices[asset.symbol] ?? 0;
  const cost = asset.quantity * asset.costPerShare; // USD
  const marketValueUsd = currentPrice * asset.quantity;
  const marketValueThb = marketValueUsd * currencyRate;
  const profit = marketValueUsd - cost;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
  const profitColor =
    profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-white";

  return (
    <div className="p-4 w-full pb-[50px]">
      {/* Tabs mapping */}
      <div className="fixed top-[80px] flex mb-4 gap-2 z-[99] bg-black w-full py-4">
        {[
          { key: "calculator", label: "เครื่องคิดต้นทุนและกำไร" },
          { key: "estimate", label: "คำนวณเป้าหมาย" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded ${
              activeTab === tab.key
                ? "bg-yellow-500 text-black"
                : "bg-black-lighter2 text-white"
            }`}
            onClick={() => {
              setActiveTab(tab.key as "calculator" | "estimate");
              // Clear all data on tab change
              setAfterData(null);
              setNewInvestment("");
              setNewPrice("");
              setEstimatePrice("");
              setNewCostPerShare(null);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Asset selector */}
      <div className="pt-[55px] mb-6 flex flex-col gap-2">
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
            ราคาตอนนี้: <span className="font-bold">({currentPrice} USD)</span>
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

          <label className="text-white text-sm">ราคาหุ้นใหม่ (USD)</label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="ราคาหุ้นใหม่ (USD)"
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
          <label className="text-white text-sm">ราคาหุ้นเป้าหมาย (USD)</label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="ราคาหุ้นใหม่ (USD)"
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

          <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
            <div>
              จำนวนหุ้น:{" "}
              <span className="text-white">
                {maskNumber(fNumber(asset.quantity, { decimalNumber: 7 }))}
              </span>
            </div>
            <div>
              ราคาปัจจุบัน:{" "}
              <span className="text-white">{fNumber(currentPrice)}</span> USD
            </div>
            <div>
              ต้นทุนต่อหุ้น:{" "}
              <span className="text-white">
                {maskNumber(fNumber(asset.costPerShare, { decimalNumber: 4 }))}
              </span>{" "}
              USD
            </div>
            <div>
              ต้นทุนรวม: <span className="text-white">{maskNumber(fNumber(cost))}</span> USD
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
                  })} USD)`
                : activeTab === "estimate" && afterData.estimateCost
                ? `(ที่ราคา: ${afterData.estimateCost} USD)`
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
                <div className="text-[12px] text-gray-300">
                  ≈ {maskNumber(fNumber(afterData.marketValueUsd))} USD
                </div>
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
                  {maskNumber(fNumber(afterData.profit * currencyRate))} บาท)
                </div>
              </div>
            </div>

            <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
              <div>
                จำนวนหุ้น:{" "}
                <span className="text-white">
                  {maskNumber(fNumber(afterData.quantity, { decimalNumber: 7 }))}
                </span>
              </div>
              <div>
                ราคาปัจจุบัน:{" "}
                <span className="text-white">
                  {activeTab === "estimate" && afterData.estimateCost
                    ? `${fNumber(afterData.estimateCost)} USD`
                    : `${fNumber(currentPrice)} USD`}
                </span>
              </div>

              <div>
                ต้นทุนต่อหุ้นใหม่:{" "}
                <span className="text-white">
                  {maskNumber(fNumber(afterData.costPerShare))}
                </span>{" "}
                USD
              </div>
              <div>
                ต้นทุนรวม:{" "}
                <span className="text-white">
                  {maskNumber(fNumber(afterData.totalCost))}
                </span>{" "}
                USD
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
