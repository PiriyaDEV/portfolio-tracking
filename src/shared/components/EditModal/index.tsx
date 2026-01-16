"use client";

import { Asset } from "@/app/lib/interface";
import { useState } from "react";

// Extract modal as a separate component
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
    value: string | number
  ) => {
    const updated = [...editAssets];
    updated[index] = { ...updated[index], [field]: value };
    setEditAssets(updated);
  };

  const handleSave = async () => {
    if (isSaving) return; // prevent double click
    try {
      setIsSaving(true);
      await saveAssets();
      setIsEditOpen(false); // close modal after save (optional)
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 !z-[100] p-4">
      <div className="bg-black-lighter p-6 rounded-lg w-full max-w-[500px] max-h-[80vh] flex flex-col gap-4">
        <h2 className="text-white font-bold text-xl text-center">
          แก้ไขสินทรัพย์
        </h2>

        <div className="overflow-y-auto flex-1 space-y-3">
          {editAssets.map((asset, index) => (
            <div key={index} className="bg-black p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">
                  สินทรัพย์ #{index + 1}
                </span>
                <button
                  onClick={() => removeAsset(index)}
                  className="text-red-500 hover:text-red-400"
                  disabled={isSaving}
                >
                  ✖
                </button>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Symbol</label>
                <input
                  type="text"
                  className="w-full p-2 rounded bg-white !text-black uppercase border-accent-yellow border"
                  value={asset.symbol}
                  onChange={(e) =>
                    updateAsset(index, "symbol", e.target.value.toUpperCase())
                  }
                  placeholder="เช่น AAPL"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">จำนวนหุ้น</label>
                <input
                  type="number"
                  step="any"
                  className="w-full p-2 rounded bg-white !text-black border-accent-yellow border"
                  value={asset.quantity || ""}
                  onChange={(e) =>
                    updateAsset(index, "quantity", Number(e.target.value))
                  }
                  placeholder="0"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">
                  ต้นทุนต่อหุ้น (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full p-2 rounded bg-white !text-black border-accent-yellow border"
                  value={asset.costPerShare || ""}
                  onChange={(e) =>
                    updateAsset(index, "costPerShare", Number(e.target.value))
                  }
                  placeholder="0.00"
                  disabled={isSaving}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addNewAsset}
          className={`p-3 rounded flex items-center justify-center gap-2 text-white
            ${
              isSaving
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          disabled={isSaving}
        >
          เพิ่มสินทรัพย์
        </button>

        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-600 text-white p-2 rounded px-4 disabled:opacity-50"
            onClick={() => setIsEditOpen(false)}
            disabled={isSaving}
          >
            ยกเลิก
          </button>

          <button
            className={`p-2 rounded px-4 font-semibold
              ${
                isSaving
                  ? "bg-gray-400 text-black cursor-not-allowed"
                  : "bg-accent-yellow text-black hover:opacity-90"
              }`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
