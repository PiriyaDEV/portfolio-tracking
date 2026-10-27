"use client";

import {
  fNumber,
  getLogo,
  getName,
  isCash,
  isThaiStock,
} from "@/app/lib/utils";
import type { Asset } from "@/app/lib/interface";
import type { StockResult } from "@/shared/pages/ViewScreen";
import type { CalculatorCompanionContext } from "@/shared/types_foldable";
import { getSignal } from "@/app/lib/market.logic";
import { useMarketStore } from "@/store/useMarketStore";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export type FoldablePage = "portfolio" | "market" | "calculator" | "view";

interface Props {
  page: FoldablePage;
  assets: Asset[];
  selectedSymbol: string | null;
  viewData: StockResult[];
  calculatorContext: CalculatorCompanionContext | null;
}

const PAGE_COPY: Record<FoldablePage, { eyebrow: string; title: string }> = {
  portfolio: { eyebrow: "พอร์ตของคุณ", title: "รายละเอียดสินทรัพย์" },
  market: { eyebrow: "วิเคราะห์ตลาด", title: "ภาพรวมสัญญาณ" },
  calculator: { eyebrow: "คำนวณ", title: "สรุปการคำนวณ" },
  view: { eyebrow: "สำรวจหุ้น", title: "แนวโน้มราคา" },
};

const number = (value: number) => fNumber(value, { decimalNumber: 2 });

export default function FoldableCompanionPanel({
  page,
  assets,
  selectedSymbol,
  viewData,
  calculatorContext,
}: Props) {
  const { prices, previousPrice, advancedLevels, graphs, currencyRate } =
    useMarketStore();

  const selectedAsset = assets.find((asset) => asset.symbol === selectedSymbol);
  const viewResult = viewData.find((item) => item.symbol === selectedSymbol);
  const selectedLevels = selectedSymbol
    ? (advancedLevels[selectedSymbol] ?? viewResult?.levels)
    : undefined;
  const selectedPrice = selectedSymbol
    ? (prices[selectedSymbol] ?? viewResult?.price ?? 0)
    : 0;
  const previous = selectedSymbol
    ? (previousPrice[selectedSymbol] ?? selectedLevels?.previousClose ?? 0)
    : 0;
  const changePercent = previous > 0
    ? ((selectedPrice - previous) / previous) * 100
    : 0;
  const holdingCost = selectedAsset && !isCash(selectedAsset.symbol)
    ? selectedAsset.quantity * selectedAsset.costPerShare *
      (isThaiStock(selectedAsset.symbol) ? 1 : currencyRate)
    : null;
  const graphPoints = (
    graphs[selectedSymbol ?? ""]?.data ??
    viewResult?.levels?.graphData ??
    []
  )
    .map((point: { time?: number; price?: number }) => ({
      value: Number(point.price),
    }))
    .filter((point: { value: number }) => Number.isFinite(point.value));

  const signalCounts = Object.keys(advancedLevels)
    .filter((symbol) => !isCash(symbol) && (prices[symbol] ?? 0) > 0)
    .reduce(
      (counts, symbol) => {
        const signal = getSignal(prices[symbol], advancedLevels[symbol]);
        if (signal === "STRONG_BUY") counts.strongBuy += 1;
        else if (signal === "BUY") counts.buy += 1;
        else if (signal === "SELL") counts.sell += 1;
        else counts.neutral += 1;
        return counts;
      },
      { strongBuy: 0, buy: 0, sell: 0, neutral: 0 },
    );

  return (
    <aside
      className="foldable-companion-pane"
      aria-label={PAGE_COPY[page].title}
    >
      <div className="foldable-companion-content">
        <header className="mb-5 border-b border-white/10 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-400/70">
            {PAGE_COPY[page].eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {PAGE_COPY[page].title}
          </h2>
        </header>

        {page === "portfolio" && (
          <PortfolioDetails
            selectedSymbol={selectedSymbol}
            selectedAsset={selectedAsset}
            selectedPrice={selectedPrice}
            cost={holdingCost}
            changePercent={changePercent}
            points={graphPoints}
          />
        )}

        {page === "market" && (
          <MarketSignals
            counts={signalCounts}
            selectedSymbol={selectedSymbol}
            selectedPrice={selectedPrice}
            levels={selectedLevels}
          />
        )}

        {page === "calculator" && (
          <CalculatorResults
            context={calculatorContext}
            assets={assets}
            prices={prices}
            currencyRate={currencyRate}
          />
        )}

        {page === "view" && (
          <StockHistory
            selectedSymbol={selectedSymbol}
            points={graphPoints}
          />
        )}
      </div>
    </aside>
  );
}

function PortfolioDetails({
  selectedSymbol,
  selectedAsset,
  selectedPrice,
  cost,
  changePercent,
  points,
}: {
  selectedSymbol: string | null;
  selectedAsset?: Asset;
  selectedPrice: number;
  cost: number | null;
  changePercent: number;
  points: { value: number }[];
}) {
  if (!selectedSymbol) return <EmptyState text="เลือกสินทรัพย์เพื่อดูรายละเอียดต้นทุนและมูลค่า" />;

  if (isCash(selectedSymbol)) {
    return (
      <section className="foldable-detail-card" aria-live="polite">
        <SymbolHeading symbol={selectedSymbol} />
        <div className="mt-5">
          <Metric label="อัตราแปลง USD/THB" value={selectedPrice > 0 ? number(selectedPrice) : "กำลังโหลด"} />
        </div>
        <p className="mt-5 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-gray-500">
          สินทรัพย์นี้ใช้ราคาแลกเปลี่ยนเพื่อแปลงมูลค่าเงินบาท และไม่คำนวณกำไรขาดทุนจากราคาตลาด
        </p>
      </section>
    );
  }

  return (
    <section className="foldable-detail-card" aria-live="polite">
      <SymbolHeading symbol={selectedSymbol} />
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Metric label="ราคาต่อหน่วย" value={selectedPrice > 0 ? number(selectedPrice) : "กำลังโหลด"} />
        <Metric label="เปลี่ยนแปลงวันนี้" value={`${changePercent > 0 ? "+" : ""}${number(changePercent)}%`} />
        {selectedAsset && <Metric label="จำนวนหน่วย" value={fNumber(selectedAsset.quantity, { decimalNumber: 4 })} />}
        {cost != null && <Metric label="ต้นทุนรวม" value={`${number(cost)} ฿`} />}
      </div>
      {points.length > 1 && (
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-gray-400">แนวโน้มระหว่างวัน</p>
            <span className={`text-[11px] font-semibold ${changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {changePercent > 0 ? "+" : ""}{number(changePercent)}%
            </span>
          </div>
          <PriceSparkline points={points} color={changePercent >= 0 ? "#34d399" : "#fb7185"} height={76} />
        </div>
      )}
      {selectedAsset && (
        <p className="mt-5 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-gray-500">
          {isThaiStock(selectedSymbol)
            ? "ต้นทุนและมูลค่าถือครองคำนวณเป็นเงินบาท"
            : "มูลค่าเงินบาทแปลงด้วยอัตราแลกเปลี่ยนล่าสุด"}
        </p>
      )}
    </section>
  );
}

function MarketSignals({
  counts,
  selectedSymbol,
  selectedPrice,
  levels,
}: {
  counts: { strongBuy: number; buy: number; sell: number; neutral: number };
  selectedSymbol: string | null;
  selectedPrice: number;
  levels?: StockResult["levels"];
}) {
  return (
    <>
      <section className="foldable-detail-card">
        <p className="text-xs font-semibold text-gray-300">สัญญาณจากสินทรัพย์ที่ติดตาม</p>
        <p className="mt-1 text-xs text-gray-500">ภาพรวมจุดซื้อและแนวต้าน ไม่ใช่คำแนะนำการลงทุน</p>
        <SignalDistribution counts={counts} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SignalMetric label="ซื้อเด่น" count={counts.strongBuy} color="text-emerald-300" />
          <SignalMetric label="อยู่โซนซื้อ" count={counts.buy} color="text-green-300" />
          <SignalMetric label="ใกล้แนวต้าน" count={counts.sell} color="text-orange-300" />
          <SignalMetric label="รอดูจังหวะ" count={counts.neutral} color="text-gray-300" />
        </div>
      </section>
      {selectedSymbol && (
        <section className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <SymbolHeading symbol={selectedSymbol} />
          <SignalBadge price={selectedPrice} levels={levels} />
          {levels && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3">
              <Metric label="ซื้อ 1" value={formatLevel(levels.entry1)} />
              <Metric label="ซื้อ 2" value={formatLevel(levels.entry2)} />
              <Metric label="แนวต้าน" value={formatLevel(levels.resistance)} />
            </div>
          )}
        </section>
      )}
    </>
  );
}

function CalculatorResults({
  context,
  assets,
  prices,
  currencyRate,
}: {
  context: CalculatorCompanionContext | null;
  assets: Asset[];
  prices: Record<string, number | null>;
  currencyRate: number;
}) {
  if (!context) {
    return <EmptyState text="ผลลัพธ์เพิ่มเติมจะแสดงที่นี่หลังจากคำนวณที่แผงหลัก" />;
  }
  if (context.activeTab === "dividend") {
    return <EmptyState text="รายละเอียดเงินปันผลแสดงในแผงหลัก" />;
  }
  if (context.activeTab === "predict") {
    return <EmptyState text="รายละเอียดการคาดการณ์แสดงในแผงหลัก" />;
  }
  if (!context.result) {
    return <EmptyState text="ผลลัพธ์เพิ่มเติมจะแสดงที่นี่หลังจากคำนวณที่แผงหลัก" />;
  }

  const { result, selectedSymbol, activeTab } = context;
  const asset = assets.find((item) => item.symbol === selectedSymbol);
  const isThai = isThaiStock(selectedSymbol);
  const currentValueBase = (prices[selectedSymbol] ?? 0) * (asset?.quantity ?? 0);
  const currentValueThb = isThai ? currentValueBase : currentValueBase * currencyRate;
  const additionalUnits = Math.max(0, result.quantity - (asset?.quantity ?? 0));
  const addedCostBase = Math.max(
    0,
    result.totalCost - (asset ? asset.quantity * asset.costPerShare : 0),
  );
  const addedCostThb = isThai ? addedCostBase : addedCostBase * currencyRate;
  const changeFromCurrent = result.marketValueThb - currentValueThb;

  return (
    <section className="foldable-detail-card" aria-live="polite">
      <p className="text-xs font-semibold text-gray-300">
        {activeTab === "estimate" ? "ผลต่างจากมูลค่าปัจจุบัน" : "รายการลงทุนที่เพิ่ม"}
      </p>
      <p className="mt-1 text-xs text-gray-500">{getName(selectedSymbol)} · {selectedSymbol}</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {activeTab === "estimate" ? (
          <>
            <Metric label="ราคาเป้าหมาย" value={number(result.estimateCost ?? 0)} />
            <Metric label="ผลต่างโดยประมาณ" value={`${changeFromCurrent > 0 ? "+" : ""}${number(changeFromCurrent)} ฿`} />
          </>
        ) : (
          <>
            <Metric label="หน่วยที่เพิ่ม" value={fNumber(additionalUnits, { decimalNumber: 4 })} />
            <Metric label="เงินลงทุนเพิ่ม" value={`${number(addedCostThb)} ฿`} />
            <Metric label="มูลค่าเปลี่ยนจากเดิม" value={`${changeFromCurrent > 0 ? "+" : ""}${number(changeFromCurrent)} ฿`} />
          </>
        )}
      </div>
    </section>
  );
}

function StockHistory({
  selectedSymbol,
  points,
}: {
  selectedSymbol: string | null;
  points: { value: number }[];
}) {
  if (!selectedSymbol) return <EmptyState text="ค้นหาหุ้นเพื่อเปิดกราฟและระดับราคาในแผงนี้" />;

  return (
    <section className="foldable-detail-card" aria-live="polite">
      <SymbolHeading symbol={selectedSymbol} />
      <p className="mt-1 text-xs text-gray-500">การเคลื่อนไหวระหว่างวัน</p>
      {points.length > 1 ? (
        <PriceSparkline points={points} color="#facc15" height={144} />
      ) : (
        <EmptyState text="ยังไม่มีข้อมูลกราฟสำหรับช่วงเวลานี้" compact />
      )}

    </section>
  );
}

function PriceSparkline({
  points,
  color,
  height,
}: {
  points: { value: number }[];
  color: string;
  height: number;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SignalDistribution({
  counts,
}: {
  counts: { strongBuy: number; buy: number; sell: number; neutral: number };
}) {
  const entries = [
    { name: "Strong buy", count: counts.strongBuy, color: "bg-emerald-400" },
    { name: "Buy", count: counts.buy, color: "bg-green-400" },
    { name: "Near resistance", count: counts.sell, color: "bg-orange-400" },
    { name: "Wait", count: counts.neutral, color: "bg-slate-500" },
  ];
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="mt-4" aria-label="สัดส่วนสัญญาณตลาด">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {entries.filter((entry) => entry.count > 0).map((entry) => (
          <span
            key={entry.name}
            className={`${entry.color} h-full transition-[width] duration-300`}
            style={{ width: `${(entry.count / total) * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-right text-[10px] text-gray-500">{total} สัญญาณ</p>
    </div>
  );
}

function SymbolHeading({ symbol }: { symbol: string }) {
  const logoUrl = getLogo(symbol);
  const name = getName(symbol);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white text-sm font-bold text-[#11100e]">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          name.slice(0, 1)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-white">{name}</p>
        <p className="truncate text-xs text-gray-500">{symbol}</p>
      </div>
    </div>
  );
}

function SignalBadge({
  price,
  levels,
}: {
  price: number;
  levels?: StockResult["levels"];
}) {
  const signal = getSignal(price, levels);
  const signalContent = {
    STRONG_BUY: { label: "ราคาอยู่ในโซนซื้อเด่น", color: "text-emerald-300", tone: "border-emerald-400/20 bg-emerald-400/[0.07]" },
    BUY: { label: "ราคาอยู่ในโซนซื้อ", color: "text-green-300", tone: "border-green-400/20 bg-green-400/[0.06]" },
    SELL: { label: "ราคาใกล้แนวต้าน", color: "text-orange-300", tone: "border-orange-400/20 bg-orange-400/[0.06]" },
    NORMAL: { label: "รอดูจังหวะ", color: "text-gray-300", tone: "border-white/[0.08] bg-white/[0.03]" },
  }[signal];

  return (
    <p className={`mt-4 rounded-xl border px-3 py-2 text-xs font-semibold ${signalContent.tone} ${signalContent.color}`}>
      {signalContent.label}
    </p>
  );
}

function SignalMetric({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{count}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-gray-500">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-gray-200">{value}</p>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-white/10 text-sm text-gray-500 ${compact ? "p-3" : "p-4"}`}>
      {text}
    </div>
  );
}

function formatLevel(value?: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : number(value);
}
