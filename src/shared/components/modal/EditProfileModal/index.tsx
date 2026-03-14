import { useRef, useState, useCallback } from "react";
import { FaTimes, FaSignOutAlt } from "react-icons/fa";
import { FaCamera, FaCheck, FaUser, FaCrop, FaLock } from "react-icons/fa6";
import Cropper from "react-easy-crop";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Crop Image Helper ──────────────────────────────────────────────────────────
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 256,
  quality = 0.35,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return canvas.toDataURL("image/jpeg", quality);
}

// ─── Image Crop Modal ───────────────────────────────────────────────────────────
function ImageCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  onConfirm: (croppedUrl: string) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(cropped);
    } catch {
      // fallback
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-[15px] flex items-center gap-2">
            <FaCrop className="text-accent-yellow" />
            ครอบตัดรูปภาพ
          </h2>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[13px]"
          >
            <FaTimes />
          </button>
        </div>

        <div className="relative w-full" style={{ height: 300 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: {
                border: "2px solid #FFD700",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
              },
            }}
          />
        </div>

        <div className="px-5 pt-4 pb-2 space-y-1">
          <label className="text-[11px] text-gray-500">ซูม</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        <p className="px-5 pb-2 text-[11px] text-gray-600">
          รูปจะถูกบีบอัดให้เหลือ 256×256px / JPEG 35%
        </p>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-[13px] hover:bg-white/5 transition-all"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl bg-accent-yellow text-black font-semibold text-[13px] hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isProcessing ? "กำลังตัด..." : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ─────────────────────────────────────────────────────────
export function EditProfileModal({
  userId, // column A internal key — used for the API call
  username, // column K — login username, shown read-only
  displayName, // column D — editable display name
  profileImage,
  onClose,
  onSave,
  onLogout,
}: {
  userId: string;
  username: string; // column K — read-only
  displayName: string; // column D — editable
  profileImage: string | null;
  onClose: () => void;
  onSave: (data: {
    displayName: string;
    oldPassword: string;
    newPassword: string;
    imageUrl: string | null;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(profileImage);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("ขนาดรูปต้องไม่เกิน 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRawImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = (croppedUrl: string) => {
    setImagePreview(croppedUrl);
    setRawImageSrc(null);
  };

  const handleSave = async () => {
    setError("");

    if (!newDisplayName.trim()) {
      setError("กรุณากรอกชื่อที่แสดง");
      return;
    }
    if (!oldPassword) {
      setError("กรุณากรอกรหัสผ่านเดิมเพื่อยืนยัน");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (newPassword && newPassword.length < 4) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        displayName: newDisplayName.trim(),
        oldPassword,
        newPassword,
        imageUrl: imagePreview,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setRawImageSrc(null)}
        />
      )}

      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold text-[15px]">
              แก้ไขโปรไฟล์
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[13px]"
            >
              <FaTimes />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <ProfileAvatar
                  username={displayName || username}
                  imageUrl={imagePreview}
                  size="lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent-yellow flex items-center justify-center text-black text-[12px] shadow-lg hover:brightness-110 transition-all"
                >
                  <FaCamera />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent-yellow hover:underline"
                >
                  เลือกรูปภาพ
                </button>
                {imagePreview && (
                  <>
                    <span className="text-gray-600">•</span>
                    <button
                      onClick={() => setImagePreview(null)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ลบรูป
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Read-only username (column K) */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <FaUser className="text-gray-600" />
                ชื่อผู้ใช้
                <span className="text-gray-600 text-[10px]">
                  (เปลี่ยนไม่ได้)
                </span>
              </label>
              <div className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-gray-500 text-[13px] select-none">
                {username}
              </div>
            </div>

            {/* Editable display name (column D) */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <FaUser className="text-accent-yellow/60" />
                ชื่อที่แสดง
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                placeholder="กรอกชื่อที่แสดง"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 pt-1">
              <p className="text-[11px] text-gray-600 mb-3 flex items-center gap-1.5">
                <FaLock className="text-gray-600" />
                เปลี่ยนรหัสผ่าน
              </p>

              {/* Old password — always required to save */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-500">
                    รหัสผ่านเดิม *
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                    placeholder="กรอกรหัสผ่านเดิมเพื่อยืนยัน"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-500">
                    รหัสผ่านใหม่{" "}
                    <span className="text-gray-600">
                      (เว้นว่างถ้าไม่ต้องการเปลี่ยน)
                    </span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                    placeholder="รหัสผ่านใหม่"
                  />
                </div>

                {newPassword.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-500">
                      ยืนยันรหัสผ่านใหม่
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600 pr-9"
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                      />
                      {confirmPassword && (
                        <span
                          className={`absolute right-3 top-1/2 -translate-y-1/2 text-[12px] ${
                            confirmPassword === newPassword
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {confirmPassword === newPassword ? (
                            <FaCheck />
                          ) : (
                            <FaTimes />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-[12px] bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-3 space-y-2 border-t border-white/5">
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-[13px] hover:bg-white/5 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-accent-yellow text-black font-semibold text-[13px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>

            {!showLogoutConfirm ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400/70 text-[13px] hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
              >
                <FaSignOutAlt />
                ออกจากระบบ
              </button>
            ) : (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 space-y-2">
                <p className="text-red-400 text-[12px] text-center">
                  ยืนยันการออกจากระบบ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg border border-white/10 text-gray-400 text-[12px] hover:bg-white/5 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex-1 py-1.5 rounded-lg bg-red-500/80 text-white font-semibold text-[12px] hover:bg-red-500 transition-all"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Profile Avatar ─────────────────────────────────────────────────────────────
export function ProfileAvatar({
  username,
  imageUrl,
  size = "md",
}: {
  username: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const initials = username?.slice(0, 2).toUpperCase() || "?";
  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#DDA0DD",
  ];
  const color = colors[username.charCodeAt(0) % colors.length];
  const sizeClass =
    size === "lg"
      ? "w-16 h-16 text-xl"
      : size === "sm"
        ? "w-7 h-7 text-xs"
        : "w-9 h-9 text-sm";

  if (imageUrl) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 border-2 border-white/10`}
        style={{ boxShadow: `0 0 12px ${color}55` }}
      >
        <img
          src={imageUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-black shrink-0`}
      style={{ background: color, boxShadow: `0 0 12px ${color}55` }}
    >
      {initials}
    </div>
  );
}
