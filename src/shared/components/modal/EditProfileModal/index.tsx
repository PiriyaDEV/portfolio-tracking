import { useRef, useState, useCallback } from "react";
import { FaTimes, FaSignOutAlt } from "react-icons/fa";
import {
  FaCamera,
  FaCheck,
  FaUser,
  FaCrop,
  FaLock,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa6";
import Cropper from "react-easy-crop";
import {
  getPasswordStrength,
  validateNewPassword,
} from "@/app/lib/password.utils";
import { PasswordStrengthHint } from "../../common/PasswordHint";

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
  userId,
  username,
  displayName,
  profileImage,
  onClose,
  onSave,
  onLogout,
}: {
  userId: string;
  username: string;
  displayName: string;
  profileImage: string | null;
  onClose: () => void;
  onSave: (data: {
    displayName: string;
    newUsername: string;
    oldPassword: string;
    newPassword: string;
    imageUrl: string | null;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [newDisplayName, setNewDisplayName] = useState(displayName);

  // ── Username ──
  const [newUsername, setNewUsername] = useState(username);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ── Password section ──
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Image ──
  const [imagePreview, setImagePreview] = useState<string | null>(profileImage);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // ── UI state ──
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Username change with debounced uniqueness check ──
  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setUsernameStatus("idle");

    if (usernameCheckTimeout.current)
      clearTimeout(usernameCheckTimeout.current);
    if (value.trim() === username || !value.trim()) return;

    usernameCheckTimeout.current = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const res = await fetch(
          `/api/profile/check-username?username=${encodeURIComponent(value.trim())}`,
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("error");
      }
    }, 500);
  };

  // ── Image handlers ──
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

  // ── Password section toggle — reset fields when closing ──
  const togglePasswordSection = () => {
    if (showPasswordSection) {
      setNewPassword("");
      setConfirmPassword("");
    }
    setShowPasswordSection((v) => !v);
    setError("");
  };

  // ── Save handler ──
  const handleSave = async () => {
    setError("");

    if (!newDisplayName.trim()) {
      setError("กรุณากรอกชื่อที่แสดง");
      return;
    }
    if (!newUsername.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    if (usernameStatus === "checking") {
      setError("กำลังตรวจสอบชื่อผู้ใช้ กรุณารอสักครู่");
      return;
    }
    if (usernameStatus === "taken") {
      setError("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
      return;
    }
    if (!oldPassword) {
      setError("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน");
      return;
    }

    if (showPasswordSection && newPassword) {
      const pwError = validateNewPassword(newPassword, confirmPassword);
      if (pwError) {
        setError(pwError);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        displayName: newDisplayName.trim(),
        newUsername: newUsername.trim(),
        oldPassword,
        newPassword: showPasswordSection ? newPassword : "",
        imageUrl: imagePreview,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived states ──
  const confirmMatch =
    confirmPassword !== "" && confirmPassword === newPassword;
  const confirmMismatch =
    confirmPassword !== "" && confirmPassword !== newPassword;

  const canSave =
    !isSaving &&
    usernameStatus !== "checking" &&
    usernameStatus !== "taken" &&
    !(showPasswordSection && newPassword && confirmMismatch);

  // ── Username indicator ──
  const usernameIndicator = () => {
    if (newUsername.trim() === username) return null;
    if (usernameStatus === "checking")
      return <span className="text-gray-400 text-[11px]">กำลังตรวจสอบ...</span>;
    if (usernameStatus === "available")
      return (
        <span className="text-green-400 text-[11px] flex items-center gap-1">
          <FaCheck className="text-[10px]" /> ใช้ได้
        </span>
      );
    if (usernameStatus === "taken")
      return (
        <span className="text-red-400 text-[11px] flex items-center gap-1">
          <FaTimes className="text-[10px]" /> ถูกใช้งานแล้ว
        </span>
      );
    if (usernameStatus === "error")
      return <span className="text-yellow-400 text-[11px]">ตรวจสอบไม่ได้</span>;
    return null;
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

            {/* Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <FaUser className="text-gray-600" /> ชื่อผู้ใช้
                </label>
                {usernameIndicator()}
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full bg-black border rounded-xl px-3 py-2.5 text-white text-[13px] outline-none transition-colors placeholder-gray-600
                  ${
                    usernameStatus === "taken"
                      ? "border-red-500/50 focus:border-red-500/70"
                      : usernameStatus === "available"
                        ? "border-green-500/50 focus:border-green-500/70"
                        : "border-white/10 focus:border-accent-yellow/50"
                  }`}
                placeholder="กรอกชื่อผู้ใช้"
              />
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <FaUser className="text-accent-yellow/60" /> ชื่อที่แสดง
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                placeholder="กรอกชื่อที่แสดง"
              />
            </div>

            {/* Current password — always visible */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <FaLock className="text-gray-600" />
                รหัสผ่านปัจจุบัน{" "}
                <span className="text-gray-600">(ต้องกรอกเพื่อบันทึก)</span>
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                placeholder="กรอกรหัสผ่านปัจจุบัน"
              />
            </div>

            {/* Change password — collapsible */}
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <button
                type="button"
                onClick={togglePasswordSection}
                className="w-full flex items-center justify-between px-4 py-3 text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/3 transition-colors group"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <FaLock className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                  เปลี่ยนรหัสผ่าน
                </span>
                {showPasswordSection ? (
                  <FaChevronUp className="text-[10px]" />
                ) : (
                  <FaChevronDown className="text-[10px]" />
                )}
              </button>

              {showPasswordSection && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/8 bg-white/[0.02]">
                  {/* New password + strength */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-500">
                      รหัสผ่านใหม่
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError("");
                      }}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
                      placeholder="รหัสผ่านใหม่"
                    />
                    {/* Reuse shared strength hint — same rules, same look */}
                    <PasswordStrengthHint password={newPassword} />
                  </div>

                  {/* Confirm new password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-gray-500">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[11px] flex items-center gap-1 ${confirmMatch ? "text-green-400" : "text-red-400"}`}
                        >
                          {confirmMatch ? (
                            <>
                              <FaCheck className="text-[10px]" /> ตรงกัน
                            </>
                          ) : (
                            <>
                              <FaTimes className="text-[10px]" /> ไม่ตรงกัน
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      className={`w-full bg-black border rounded-xl px-3 py-2.5 text-white text-[13px] outline-none transition-colors placeholder-gray-600
                        ${
                          confirmMatch
                            ? "border-green-500/50 focus:border-green-500/70"
                            : confirmMismatch
                              ? "border-red-500/50 focus:border-red-500/70"
                              : "border-white/10 focus:border-accent-yellow/50"
                        }`}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>

                  <p className="text-[11px] text-gray-600">
                    เว้นว่างทั้งสองช่องหากไม่ต้องการเปลี่ยนรหัสผ่าน
                  </p>
                </div>
              )}
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
                disabled={!canSave}
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
                <FaSignOutAlt /> ออกจากระบบ
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
