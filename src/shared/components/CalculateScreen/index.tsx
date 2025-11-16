"use client";

import { useState } from "react";
import { TiChartPieOutline as ChartIcon } from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
} from "react-icons/fa6";
import { fNumber, getLogo, getName } from "@/app/lib/utils";

export type Asset = {
  symbol: string;
  quantity: number;
  costPerShare: number;
};

type CalculatorScreenProps = {
  assets: Asset[];
  prices: any; // current price USD
  currencyRate: number; // USD -> THB
  logos: any; // asset logos
};

export default function CalculatorScreen({
  assets,
  prices,
  currencyRate,
  logos,
}: CalculatorScreenProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    assets.length > 0 ? assets[0].symbol : ""
  );
  const [newInvestment, setNewInvestment] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newCostPerShare, setNewCostPerShare] = useState<number | null>(null);

  const calculateNewCost = () => {
    const asset = assets.find((a) => a.symbol === selectedSymbol);
    if (!asset) return;

    const investment = parseFloat(newInvestment);
    const price = parseFloat(newPrice);

    if (isNaN(investment) || isNaN(price) || price <= 0) return;

    const newQuantity = investment / price;
    const newTotalQuantity = asset.quantity + newQuantity;
    const newTotalCost =
      asset.quantity * asset.costPerShare + investment / currencyRate; // THB -> USD

    const averageCost = newTotalCost / newTotalQuantity;
    setNewCostPerShare(averageCost * currencyRate); // show in THB
  };

  const asset = assets.find((a) => a.symbol === selectedSymbol);
  if (!asset) return null;

  // Calculations for before
  const currentPrice = prices[asset.symbol] ?? 0;
  const cost = asset.quantity * asset.costPerShare;
  const marketValueUsd = currentPrice * asset.quantity;
  const marketValueThb = marketValueUsd * currencyRate;
  const profit = marketValueUsd - cost;
  const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
  const profitColor =
    profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-white";

  // Calculations for after
  let afterQuantity = asset.quantity;
  let afterCostPerShare = asset.costPerShare;
  let afterCost = cost;
  let afterMarketValueUsd = marketValueUsd;
  let afterMarketValueThb = marketValueThb;
  let afterProfit = profit;
  let afterProfitPercent = profitPercent;

  if (newCostPerShare !== null) {
    const investment = parseFloat(newInvestment);
    const price = parseFloat(newPrice);
    const newQty = investment / price;
    afterQuantity += newQty;
    afterCostPerShare = newCostPerShare;
    afterCost = afterQuantity * (afterCostPerShare / currencyRate);
    afterMarketValueUsd = currentPrice * afterQuantity;
    afterMarketValueThb = afterMarketValueUsd * currencyRate;
    afterProfit = afterMarketValueUsd - afterCost;
    afterProfitPercent = afterCost > 0 ? (afterProfit / afterCost) * 100 : 0;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">เครื่องคิดต้นทุนและกำไรหุ้น</h2>

      {/* Asset selector */}
      <div className="mb-4">
        <select
          value={selectedSymbol}
          onChange={(e) => {
            setSelectedSymbol(e.target.value);
            setNewCostPerShare(null);
          }}
          className="p-2 rounded bg-gray-800 text-white w-full"
        >
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {getName(a.symbol)}
            </option>
          ))}
        </select>
      </div>

      {/* Inputs column */}
      <div className="mb-4 flex flex-col gap-2">
        <input
          type="number"
          step="any"
          min="0"
          placeholder="จำนวนเงินลงทุนใหม่ (บาท)"
          value={newInvestment}
          onChange={(e) => setNewInvestment(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="number"
          step="any"
          min="0"
          placeholder="ราคาหุ้นใหม่ (USD)"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white"
        />
        <button
          onClick={calculateNewCost}
          className="bg-yellow-500 text-black p-2 rounded font-bold"
        >
          คำนวณต้นทุนเฉลี่ย
        </button>
      </div>

      {/* Show before/after cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before card */}
        <div className="w-full shadow-sm">
          <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-900">
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

          <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
            <div>
              จำนวนหุ้น:{" "}
              <span className="text-white">
                {fNumber(asset.quantity, { decimalNumber: 7 })}
              </span>
            </div>
            <div>
              ราคาปัจจุบัน:{" "}
              <span className="text-white">{fNumber(currentPrice)}</span> USD
            </div>
            <div>
              ต้นทุนต่อหุ้น:{" "}
              <span className="text-white">{fNumber(asset.costPerShare)}</span>{" "}
              USD
            </div>
            <div>
              ต้นทุนรวม: <span className="text-white">{fNumber(cost)}</span> USD
            </div>
          </div>
        </div>

        {/* After card */}
        {newCostPerShare !== null && (
          <div className="w-full shadow-sm">
            <div className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-900">
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
              </div>

              <div className="flex flex-col items-end whitespace-nowrap">
                <div className="font-bold text-[16px]">
                  {fNumber(afterMarketValueThb)} THB
                </div>
                <div className="text-[12px] text-gray-300">
                  ≈ {fNumber(afterMarketValueUsd)} USD
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div
                  className={`font-bold text-[16px] flex items-center gap-1 ${
                    afterProfit > 0
                      ? "text-green-500"
                      : afterProfit < 0
                      ? "text-red-500"
                      : "text-white"
                  }`}
                >
                  {afterProfit > 0 ? (
                    <UpIcon className="text-[12px]" />
                  ) : afterProfit < 0 ? (
                    <DownIcon className="text-[12px]" />
                  ) : null}
                  {fNumber(afterProfitPercent)}%
                </div>
                <div
                  className={`text-[12px] ${
                    afterProfit > 0
                      ? "text-green-500"
                      : afterProfit < 0
                      ? "text-red-500"
                      : "text-white"
                  }`}
                >
                  ({afterProfit > 0 ? "+" : ""}
                  {fNumber(afterProfit * currencyRate)} บาท)
                </div>
                <div className="text-[12px] mt-1">
                  ต้นทุนต่อหุ้นใหม่: {fNumber(afterCostPerShare)}
                </div>
              </div>
            </div>

            <div className="mt-2 bg-black-lighter text-[12px] grid grid-cols-2 gap-1 px-4 py-2 text-gray-300">
              <div>
                จำนวนหุ้น:{" "}
                <span className="text-white">
                  {fNumber(asset.quantity, { decimalNumber: 7 })}
                </span>
              </div>
              <div>
                ราคาปัจจุบัน:{" "}
                <span className="text-white">{fNumber(currentPrice)} USD</span>
              </div>
              <div>
                ต้นทุนต่อหุ้น:{" "}
                <span className="text-white">
                  {fNumber(asset.costPerShare)} USD
                </span>
              </div>
              <div>
                ต้นทุนรวม: <span className="text-white">{fNumber(cost)}</span>{" "}
                USD
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
