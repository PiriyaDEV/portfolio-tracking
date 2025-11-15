import React, { useState, useEffect } from "react";
import "./styles.css";

export interface Settings {
  vat: number;
  serviceCharge: number;
  isVat: boolean;
  isService: boolean;
}

interface SettingsPopupProps {
  isOpen: boolean;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onCancel: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({
  isOpen,
  settings,
  setSettings,
  onCancel,
}) => {
  const [tempSettings, setTempSettings] = useState<{
    vat: string;
    serviceCharge: string;
    isVat: boolean;
    isService: boolean;
  }>({
    vat: settings.vat.toString(),
    serviceCharge: settings.serviceCharge.toString(),
    isVat: settings.isVat ?? false,
    isService: settings.isService ?? false,
  });

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    setTempSettings({
      vat: settings.vat.toString(),
      serviceCharge: settings.serviceCharge.toString(),
      isVat: settings.isVat ?? false,
      isService: settings.isService ?? false,
    });
  }, [settings]);

  const handleSave = () => {
    if (tempSettings.serviceCharge === "") {
      alert("กรุณาใส่ Service Charge ให้ครบถ้วน");
      return;
    }

    if (tempSettings.vat === "") {
      alert("กรุณาใส่ VAT ให้ครบถ้วน");
      return;
    }

    setSettings({
      vat: parseFloat(tempSettings.vat),
      serviceCharge: parseFloat(tempSettings.serviceCharge),
      isVat: tempSettings.isVat,
      isService: tempSettings.isService,
    });
    onCancel();
  };

  const handleCancel = () => {
    setTempSettings({
      vat: settings.vat.toString(),
      serviceCharge: settings.serviceCharge.toString(),
      isVat: settings.isVat,
      isService: settings.isService,
    });
    onCancel();
  };

  const handleChange =
    (field: "vat" | "serviceCharge") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempSettings((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleToggleChange =
    (field: "isVat" | "isService") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTempSettings({
        ...tempSettings,
        [field]: e.target.checked,
      });
    };

  const handleClearAll = () => {
    window.location.href = "/";
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div className="bg-base-100 p-6 rounded-xl shadow-lg w-96 m-4">
            <h3 className="font-bold text-lg text-center">ตั้งค่าเริ่มต้น</h3>
            <div className="pt-4">
              <p className="!text-[#4366f4] font-bold text-sm mb-2">
                เปิดใช้งาน VAT{" "}
                <span
                  className={
                    !tempSettings.isVat ? "!text-red-500" : "!text-green-500"
                  }
                >
                  {!tempSettings.isVat ? "(ปิดอยู่)" : "(เปิดอยู่)"}
                </span>
              </p>
              <label>
                <input
                  className="toggle"
                  type="checkbox"
                  checked={tempSettings.isVat}
                  onChange={handleToggleChange("isVat")}
                />
                <span className="toggle-switch"></span>
              </label>
            </div>
            <div className="py-4">
              <p className="!text-[#4366f4] font-bold text-sm mb-2">VAT (%)</p>
              <input
                id="vat"
                type="number"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") {
                    e.preventDefault();
                  }
                }}
                value={tempSettings.vat}
                onChange={handleChange("vat")}
                placeholder="กรุณาใส่ VAT"
                className="input input-bordered w-full"
              />
            </div>
            <div className="pt-4">
              <p className="!text-[#4366f4] font-bold text-sm mb-2">
                เปิดใช้งาน Service Charge{" "}
                <span
                  className={
                    !tempSettings.isService
                      ? "!text-red-500"
                      : "!text-green-500"
                  }
                >
                  {!tempSettings.isService ? "(ปิดอยู่)" : "(เปิดอยู่)"}
                </span>
              </p>
              <label>
                <input
                  className="toggle"
                  type="checkbox"
                  checked={tempSettings.isService}
                  onChange={handleToggleChange("isService")}
                />
                <span className="toggle-switch"></span>
              </label>
            </div>
            <div className="py-4">
              <p className="!text-[#4366f4] font-bold text-sm mb-2">
                Service Charge (%)
              </p>
              <input
                id="serviceCharge"
                type="number"
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") {
                    e.preventDefault();
                  }
                }}
                value={tempSettings.serviceCharge}
                onChange={handleChange("serviceCharge")}
                placeholder="กรุณาใส่ Service Charge"
                className="input input-bordered w-full"
              />
            </div>

            <p className="!text-red-500 font-bold text-sm mb-2">
              * รีเซ็ตข้อมูล (ทุกอย่าง)
            </p>
            <div className="flex justify-between mt-4 flex-col gap-12">
              {!showConfirmClear ? (
                <button
                  className="btn btn-sm text-red-500 border border-red-500 flex-1 bg-white"
                  onClick={() => setShowConfirmClear(true)}
                >
                  ล้างทั้งหมด
                </button>
              ) : (
                <button
                  className="btn btn-sm bg-red-500 text-white flex-1"
                  onClick={handleClearAll}
                >
                  ยืนยันล้างทั้งหมด
                </button>
              )}
              <button
                className="btn bg-[#4366f4] btn-sm text-white w-full"
                onClick={handleSave}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPopup;
