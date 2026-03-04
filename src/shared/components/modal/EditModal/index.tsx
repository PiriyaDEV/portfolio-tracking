"use client";

import { Asset } from "@/app/lib/interface";
import { getLogo } from "@/app/lib/utils";
import { useState } from "react";

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

  const updateAsset = (
    index: number,
    field: keyof Asset,
    value: string | number,
  ) => {
    const updated = [...editAssets];
    updated[index] = { ...updated[index], [field]: value };
    setEditAssets(updated);
  };

  const handleSave = async () => {
    if (isSaving) return;
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
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
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

            return (
              <div
                key={index}
                className="bg-black rounded-xl p-4 space-y-3 border border-accent-yellow border-opacity-10"
              >
                {/* Card Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="w-8 h-8 rounded-full bg-black-lighter border border-accent-yellow border-opacity-20 overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <div
                          className={`w-[30px] h-[30px] rounded-full bg-cover bg-center border border-gray-600 ${
                            getLogo(asset.symbol) ? "" : "bg-white"
                          }`}
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
                  </div>

                  <button
                    onClick={() => removeAsset(index)}
                    disabled={isSaving}
                    className="text-xs px-3 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 border border-red-500 border-opacity-20 transition-all disabled:opacity-40"
                  >
                    ลบ
                  </button>
                </div>

                {/* Fields */}
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
                        value={asset.quantity || ""}
                        onChange={(e) =>
                          updateAsset(index, "quantity", Number(e.target.value))
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
                        value={asset.costPerShare || ""}
                        onChange={(e) =>
                          updateAsset(
                            index,
                            "costPerShare",
                            Number(e.target.value),
                          )
                        }
                        placeholder="0.00"
                        disabled={isSaving}
                      />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-accent-yellow border-opacity-10 space-y-3">
          <button
            onClick={addNewAsset}
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
                    : "bg-accent-yellow text-black hover:opacity-90"
                }`}
              onClick={handleSave}
              disabled={isSaving}
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
