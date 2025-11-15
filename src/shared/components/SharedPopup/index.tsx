import React, { useState } from "react";

interface SharePopupProps {
  billName: string;
  isOpen: boolean;
  onShare: (allowEdit: boolean) => void; // Pass allowEdit boolean
  onCancel: () => void;
}

const SharePopup: React.FC<SharePopupProps> = ({
  billName,
  isOpen,
  onShare,
  onCancel,
}) => {
  const [allowEdit, setAllowEdit] = useState(false);

  const handleShare = () => {
    onShare(allowEdit); // Send the allowEdit value to the parent on share
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onCancel();
              setAllowEdit(false);
            }
          }}
        >
          <div className="bg-base-100 p-6 rounded-xl shadow-lg w-96 m-4">
            <h3 className="font-bold text-lg text-center">
              แชร์บิล "{billName !== "" ? billName : "ไม่มีชื่อบิล"}"
            </h3>
            <div className="py-4 mt-3">
              <label className="flex items-center space-x-2 gap-2">
                <input
                  type="checkbox"
                  checked={allowEdit}
                  className="transform scale-150"
                  onChange={() => setAllowEdit(!allowEdit)}
                />
                <span>อนุญาติให้แก้ไข</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                className="btn bg-[#4366f4] btn-sm text-white w-full"
                onClick={handleShare} // Use handleShare to pass allowEdit
              >
                แชร์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SharePopup;
