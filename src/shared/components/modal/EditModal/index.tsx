"use client";

import { Asset } from "@/app/lib/interface";
import { getLogo } from "@/app/lib/utils";
import StockSearchSelect from "@/shared/pages/ViewScreen/components/StockSearchSelect";
import { useState } from "react";

type AssetType = "US" | "TH" | "GOLD" | "BTC";

const ASSET_TYPES: {
  value: AssetType;
  label: string;
  emoji: string;
  exchange?: "US" | "BK";
  forcedSymbol?: string;
}[] = [
  { value: "US", label: "หุ้น US", emoji: "🇺🇸", exchange: "US" },
  { value: "TH", label: "หุ้นไทย", emoji: "🇹🇭", exchange: "BK" },
  { value: "GOLD", label: "ทอง", emoji: "🥇", forcedSymbol: "GC=F" },
  { value: "BTC", label: "Bitcoin", emoji: "₿", forcedSymbol: "BTC-USD" },
];

// Raw string values for numeric inputs (to preserve "0.000..." while typing)
type RawValues = Record<number, { quantity?: string; costPerShare?: string }>;

const EditModal = ({
  editAssets,
  setEditAssets,
  addNewAsset,
  removeAsset,
  saveAssets,
  setIsEditOpen,
}: {
  editAssets: Asset[];
  setEditAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  addNewAsset: () => void;
  removeAsset: (index: number) => void;
  saveAssets: () => Promise<void>;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [assetTypes, setAssetTypes] = useState<Record<number, AssetType>>({});
  const [newCardIndices, setNewCardIndices] = useState<Set<number>>(new Set());
  // Store raw string values so "0.000001" isn't eaten by || "" coercion
  const [rawValues, setRawValues] = useState<RawValues>({});

  const updateAsset = (
    index: number,
    field: keyof Asset,
    value: string | number,
  ) => {
    const updated = [...editAssets];
    updated[index] = { ...updated[index], [field]: value };
    setEditAssets(updated);
  };

  const hasIncompleteCards = newCardIndices.size > 0;

  const hasInvalidAssets = editAssets.some(
    (a) => !a.symbol?.trim() || !a.quantity || !a.costPerShare,
  );

  const canSave = !isSaving && !hasIncompleteCards && !hasInvalidAssets;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setIsSaving(true);
      await saveAssets();
      setIsEditOpen(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    addNewAsset();
    const newIndex = editAssets.length;
    setNewCardIndices((prev) => new Set(prev).add(newIndex));
  };

  const handleRemoveAsset = (index: number) => {
    removeAsset(index);
    // Clean up raw values for this card
    setRawValues((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleSelectAssetType = (cardIndex: number, type: AssetType) => {
    setAssetTypes((prev) => ({ ...prev, [cardIndex]: type }));
    const config = ASSET_TYPES.find((t) => t.value === type)!;
    if (config.forcedSymbol) {
      updateAsset(cardIndex, "symbol", config.forcedSymbol);
      setNewCardIndices((prev) => {
        const next = new Set(prev);
        next.delete(cardIndex);
        return next;
      });
    }
  };

  const handleSymbolSearch = (cardIndex: number, symbol: string) => {
    updateAsset(cardIndex, "symbol", symbol);
    setNewCardIndices((prev) => {
      const next = new Set(prev);
      next.delete(cardIndex);
      return next;
    });
  };

  const handleQuantityChange = (index: number, raw: string) => {
    // Always store the raw string so leading zeros / "0.000..." are preserved
    setRawValues((prev) => ({
      ...prev,
      [index]: { ...prev[index], quantity: raw },
    }));
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      updateAsset(index, "quantity", num);
    }
  };

  const handleCostPerShareChange = (index: number, raw: string) => {
    setRawValues((prev) => ({
      ...prev,
      [index]: { ...prev[index], costPerShare: raw },
    }));
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      updateAsset(index, "costPerShare", num);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 !z-[100] p-4 backdrop-blur-sm">
      <div className="bg-black-lighter rounded-2xl w-full max-w-[500px] max-h-[88vh] flex flex-col overflow-hidden border border-accent-yellow border-opacity-20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-accent-yellow border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-yellow bg-opacity-10 border border-accent-yellow border-opacity-30 flex items-center justify-center text-sm">
              📊
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                แก้ไขสินทรัพย์
              </h2>
              <p className="text-accent-yellow text-opacity-50 text-xs">
                {editAssets.length} รายการ
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditOpen(false)}
            disabled={isSaving}
            className="w-8 h-8 rounded-full bg-white bg-opacity-5 border border-white border-opacity-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Asset List */}
        <div className="overflow-y-auto flex-1 px-5 py-4 pb-[140px] space-y-3">
          {editAssets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="text-4xl opacity-20">📂</div>
              <p className="text-gray-500 text-sm">
                ยังไม่มีสินทรัพย์ กดเพิ่มด้านล่าง
              </p>
            </div>
          )}

          {editAssets.map((asset, index) => {
            const logoUrl = asset.symbol ? getLogo(asset.symbol) : null;
            const isNew = newCardIndices.has(index);
            const selectedType = assetTypes[index];
            const typeConfig = selectedType
              ? ASSET_TYPES.find((t) => t.value === selectedType)
              : null;

            // Use rawValues while the user is typing; fall back to asset value
            const quantityDisplay =
              rawValues[index]?.quantity !== undefined
                ? rawValues[index].quantity
                : asset.quantity
                  ? String(asset.quantity)
                  : "";

            const costDisplay =
              rawValues[index]?.costPerShare !== undefined
                ? rawValues[index].costPerShare
                : asset.costPerShare
                  ? String(asset.costPerShare)
                  : "";

            return (
              <div
                key={index}
                className="bg-black rounded-xl p-4 space-y-3 border border-accent-yellow border-opacity-10"
              >
                {/* Card Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black-lighter border border-accent-yellow border-opacity-20 overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <div
                          className="w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600"
                          style={{
                            backgroundImage: `url(${getLogo(asset.symbol)})`,
                          }}
                        />
                      ) : (
                        <span className="text-accent-yellow text-xs font-bold">
                          {asset.symbol?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-white font-semibold text-sm">
                      {asset.symbol || (
                        <span className="text-gray-500 font-normal">
                          สินทรัพย์ใหม่
                        </span>
                      )}
                    </span>
                    {typeConfig && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-5 text-gray-400">
                        {typeConfig.emoji} {typeConfig.label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveAsset(index)}
                    disabled={isSaving}
                    className="text-xs px-3 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 border border-red-500 border-opacity-20 transition-all disabled:opacity-40"
                  >
                    ลบ
                  </button>
                </div>

                {/* New card: show type chips first */}
                {isNew && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      เลือกประเภทสินทรัพย์
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ASSET_TYPES.map((t) => {
                        const active = selectedType === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() =>
                              handleSelectAssetType(index, t.value)
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                            style={{
                              background: active ? "#1a2e1a" : "#1a1a1a",
                              border: `1px solid ${active ? "#4ade80" : "#2a2a2a"}`,
                              color: active ? "#4ade80" : "#888",
                              boxShadow: active
                                ? "0 0 8px rgba(74,222,128,0.15)"
                                : "none",
                            }}
                          >
                            <span>{t.emoji}</span>
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedType &&
                      (selectedType === "US" || selectedType === "TH") && (
                        <div className="pt-1">
                          <StockSearchSelect
                            key={`search-${index}-${selectedType}`}
                            onSelect={(symbol) =>
                              handleSymbolSearch(index, symbol)
                            }
                            defaultExchange={
                              typeConfig?.exchange as "US" | "BK"
                            }
                            hideExchangeChips
                            placeholder={
                              selectedType === "US"
                                ? "ค้นหาหุ้น US เช่น AAPL"
                                : "ค้นหาหุ้นไทย เช่น PTT"
                            }
                          />
                        </div>
                      )}
                  </div>
                )}

                {/* Fields — show once symbol is set */}
                {!isNew && (
                  <div className="space-y-2">
                    <FieldGroup label="Symbol" emoji="🔤">
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg bg-black border border-accent-yellow border-opacity-30 text-accent-yellow font-bold tracking-widest text-sm outline-none focus:border-opacity-70 transition-all placeholder-gray-600 uppercase"
                        value={asset.symbol}
                        onChange={(e) =>
                          updateAsset(
                            index,
                            "symbol",
                            e.target.value.toUpperCase(),
                          )
                        }
                        placeholder="เช่น AAPL"
                        disabled={isSaving}
                      />
                    </FieldGroup>

                    <div className="grid grid-cols-2 gap-2">
                      <FieldGroup label="จำนวนหุ้น" emoji="📦">
                        <input
                          type="number"
                          step="any"
                          className="w-full px-3 py-2 rounded-lg bg-black border border-accent-yellow border-opacity-30 text-white text-sm outline-none focus:border-opacity-70 transition-all placeholder-gray-600"
                          value={quantityDisplay}
                          onChange={(e) =>
                            handleQuantityChange(index, e.target.value)
                          }
                          placeholder="0"
                          disabled={isSaving}
                        />
                      </FieldGroup>

                      <FieldGroup label="ต้นทุน/หุ้น (USD)" emoji="💵">
                        <input
                          type="number"
                          step="any"
                          className="w-full px-3 py-2 rounded-lg bg-black border border-accent-yellow border-opacity-30 text-white text-sm outline-none focus:border-opacity-70 transition-all placeholder-gray-600"
                          value={costDisplay}
                          onChange={(e) =>
                            handleCostPerShareChange(index, e.target.value)
                          }
                          placeholder="0.00"
                          disabled={isSaving}
                        />
                      </FieldGroup>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-accent-yellow border-opacity-10 space-y-3">
          <button
            onClick={handleAddNew}
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl border border-dashed border-accent-yellow border-opacity-40 text-accent-yellow text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent-yellow hover:bg-opacity-5 transition-all disabled:opacity-40"
          >
            <span className="text-base leading-none">+</span> เพิ่มสินทรัพย์
          </button>

          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 rounded-xl bg-white bg-opacity-5 border border-white border-opacity-10 text-gray-400 hover:text-white text-sm font-medium transition-all disabled:opacity-40"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              ยกเลิก
            </button>

            <button
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
                ${
                  isSaving
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : !canSave
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
                      : "bg-accent-yellow text-black hover:opacity-90"
                }`}
              onClick={handleSave}
              disabled={!canSave}
              title={
                hasIncompleteCards
                  ? "กรุณาเลือก symbol ให้ครบก่อนบันทึก"
                  : hasInvalidAssets
                    ? "กรุณากรอกข้อมูลให้ครบทุกช่อง"
                    : undefined
              }
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                  กำลังบันทึก...
                </span>
              ) : (
                "บันทึก"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldGroup = ({
  label,
  emoji,
  children,
}: {
  label: string;
  emoji: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-xs text-gray-500">
      <span>{emoji}</span> {label}
    </label>
    {children}
  </div>
);

export default EditModal;
