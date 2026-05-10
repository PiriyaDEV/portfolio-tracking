// shared/components/ConfirmDeleteModal.tsx

"use client";

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDeleteModal({
  open,
  title = "ลบรายการ",
  description = "ดำเนินการนี้ไม่สามารถย้อนกลับได้",
  itemName,
  confirmText = "ลบเลย",
  cancelText = "ยกเลิก",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center !z-[110] p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-black-lighter rounded-2xl w-full max-w-[320px] border border-red-500 border-opacity-30 shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1 w-full bg-red-500 bg-opacity-60" />

        <div className="px-6 py-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 flex items-center justify-center text-lg shrink-0">
              🗑️
            </div>

            <div>
              <h3 className="text-white font-bold text-base leading-tight">
                {title}
              </h3>

              <p className="text-gray-500 text-xs mt-0.5">{description}</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-gray-300 text-sm leading-relaxed">
            คุณต้องการลบ{" "}
            <span className="text-accent-yellow font-bold tracking-wide">
              {itemName || "รายการนี้"}
            </span>{" "}
            หรือไม่?
          </p>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-white bg-opacity-5 border border-white border-opacity-10 text-gray-400 hover:text-white text-sm font-medium transition-all disabled:opacity-40"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 bg-opacity-90 hover:bg-opacity-100 text-white text-sm font-bold transition-all disabled:opacity-40"
            >
              {loading ? "กำลังลบ..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
