// ConfirmPopup.tsx
import React from "react";

interface ConfirmPopupProps {
  title?: string;
  message?: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  title = "ยืนยันการลบ ?",
  message,
  isOpen,
  onConfirm,
  onCancel,
  confirmText = "ลบ",
}) => {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCancel();
            }
          }}
        >
          <div className="bg-base-100 p-6 rounded-xl shadow-lg w-96 m-4">
            <h3 className="font-bold text-lg text-center">{title}</h3>
            {message && <p className="py-4">{message}</p>}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                className="btn bg-[#4366f4] btn-sm text-white w-full"
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmPopup;
