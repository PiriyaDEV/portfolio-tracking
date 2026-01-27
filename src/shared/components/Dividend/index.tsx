"use client";

type Currency = "THB" | "USD";

type DividendAsset = {
  originalCurrency: Currency;
  dividendPerShare: number | null;
  annualDividend: number | null;
  annualDividendBase: number | null;
  dividendYieldPercent: number | null; // อัตราปันผล (%)
};

type DividendSummaryProps = {
  data?: {
    baseCurrency: Currency;
    totalAnnualDividend: number | null;
    perAsset: Record<string, DividendAsset> | null;
  };
};

/* =======================
   Helpers
======================= */

const formatCurrency = (
  value: number | null | undefined,
  currency: Currency,
) => {
  if (value == null || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
};

const rankEmoji = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
};

/* =======================
   Component
======================= */

export default function DividendSummary({ data }: DividendSummaryProps) {
  if (!data) {
    return (
      <div className="bg-black-lighter text-gray-400 p-4 rounded-lg">
        ไม่มีข้อมูลเงินปันผล
      </div>
    );
  }

  const { baseCurrency, totalAnnualDividend, perAsset } = data;

  const entries = Object.entries(perAsset ?? {});

  // 🔥 อันดับหลัก: เงินปันผลต่อปี
  const sortedByAnnual = [...entries].sort(
    ([, a], [, b]) =>
      (b.annualDividendBase ?? -Infinity) - (a.annualDividendBase ?? -Infinity),
  );

  // 🪙 อันดับอัตราปันผล (%)
  const yieldRanks = [...entries]
    .filter(([, d]) => d.dividendYieldPercent != null)
    .sort(
      ([, a], [, b]) =>
        (b.dividendYieldPercent ?? -Infinity) -
        (a.dividendYieldPercent ?? -Infinity),
    )
    .slice(0, 3)
    .map(([symbol]) => symbol);

  return (
    <div className="bg-black-lighter text-white p-4 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">📊 สรุปเงินปันผลรายปี</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-left">
              <th className="py-2 align-middle">อันดับ</th>
              <th className="py-2 align-middle">สัญลักษณ์</th>
              <th className="py-2 align-middle">ปันผล/หุ้น</th>
              <th className="py-2 align-middle text-right">
                🪙 อัตราปันผล (%)
              </th>
              <th className="py-2 align-middle text-right">
                ต่อปี ({baseCurrency})
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedByAnnual.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-gray-500 align-middle"
                >
                  ไม่มีข้อมูลรายสินทรัพย์
                </td>
              </tr>
            )}

            {sortedByAnnual.map(([symbol, d], index) => {
              const rank = rankEmoji(index);

              const yieldRankIndex = yieldRanks.indexOf(symbol);
              const yieldEmoji =
                yieldRankIndex === 0
                  ? "🥇"
                  : yieldRankIndex === 1
                    ? "🥈"
                    : yieldRankIndex === 2
                      ? "🥉"
                      : null;

              return (
                <tr
                  key={symbol}
                  className="border-b border-gray-800 last:border-b-0"
                >
                  {/* Rank (by annual dividend) */}
                  <td className="py-3 text-center text-lg align-middle">
                    {rank ?? index + 1}
                  </td>

                  {/* Symbol */}
                  <td className="py-3 font-medium align-middle">
                    <span className="inline-flex items-center gap-2">
                      {symbol}
                      {rank && (
                        <span className="text-xs bg-black-lighter2 px-2 py-0.5 rounded text-yellow-400">
                          อันดับ {index + 1}
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Dividend per share */}
                  <td className="py-3 text-gray-300 align-middle">
                    {formatCurrency(d.dividendPerShare, d.originalCurrency)}
                  </td>

                  {/* Dividend Yield with medal */}
                  <td className="py-3 text-right font-semibold text-blue-400 align-middle">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {yieldEmoji && <span>{yieldEmoji}</span>}
                      {formatPercent(d.dividendYieldPercent)}
                    </span>
                  </td>

                  {/* Annual dividend */}
                  <td className="py-3 text-right font-semibold align-middle">
                    {formatCurrency(d.annualDividendBase, baseCurrency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="w-full mt-6 text-center">
        <div className="bg-black-lighter2 p-4 rounded">
          <p className="text-gray-400 text-sm">💰 เงินปันผลรวมต่อปี</p>
          <p className="text-3xl font-bold text-yellow-400">
            {formatCurrency(totalAnnualDividend, baseCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}
