import { useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { FaCamera, FaCheck, FaUser } from "react-icons/fa6";

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
export function EditProfileModal({
  userId,
  username,
  profileImage,
  onClose,
  onSave,
}: {
  userId: string;
  profileImage: string | null;
  username: string;
  onClose: () => void;
  onSave: (data: {
    newUsername: string;
    newPassword: string;
    imageUrl: string | null;
  }) => Promise<void>;
}) {
  const [newUsername, setNewUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(profileImage);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("ขนาดรูปต้องไม่เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    if (!newUsername.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (newPassword && newPassword.length < 4) {
      setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        newUsername: newUsername.trim(),
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-[15px]">แก้ไขโปรไฟล์</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[13px]"
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <ProfileAvatar
                username={username || userId}
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
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <FaUser className="text-accent-yellow/60" />
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
              placeholder="กรอกชื่อผู้ใช้ใหม่"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-500">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600"
              placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน"
            />
          </div>

          {/* Confirm Password */}
          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none focus:border-accent-yellow/50 transition-colors placeholder-gray-600 pr-9"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
                {confirmPassword && (
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-[12px] ${confirmPassword === newPassword ? "text-green-400" : "text-red-400"}`}
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

          {/* Error */}
          {error && (
            <p className="text-red-400 text-[12px] bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
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
      </div>
    </div>
  );
}

// ─── Profile Avatar ────────────────────────────────────────────────────────────
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
