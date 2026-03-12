"use client";

import { Asset } from "@/app/lib/interface";
import { getLogo, getName } from "@/app/lib/utils";
import { useEffect, useState } from "react";
import { FaTimes, FaCheck, FaBell } from "react-icons/fa";
import { usePushNotification } from "@/shared/hooks/usePushNotification";

type NotifType = "support" | "price" | null;

interface StockNotifSetting {
  symbol: string;
  enabled: boolean;
  type: NotifType;
  targetPrice: string;
}

interface NotificationModalProps {
  assets: Asset[];
  userColId: string;
  onClose: () => void;
}

export default function NotificationModal({
  assets,
  userColId,
  onClose,
}: NotificationModalProps) {
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [settings, setSettings] = useState<StockNotifSetting[]>(
    assets.map((a) => ({
      symbol: a.symbol,
      enabled: false,
      type: null,
      targetPrice: "",
    })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { permission, isSubscribed, subscribe } =
    usePushNotification(userColId);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/notification/${userColId}`);
        if (!res.ok) return;
        const json = await res.json();
        const saved = json.notification;
        setGlobalEnabled(saved.globalEnabled ?? false);
        setSettings(
          assets.map((a) => {
            const match = saved.notifications?.find(
              (n: StockNotifSetting) => n.symbol === a.symbol,
            );
            return match
              ? { ...match }
              : {
                  symbol: a.symbol,
                  enabled: false,
                  type: null,
                  targetPrice: "",
                };
          }),
        );
      } catch (err) {
        console.error("Failed to load notification settings", err);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [userColId]);

  const updateSetting = (symbol: string, patch: Partial<StockNotifSetting>) => {
    setSettings((prev) =>
      prev.map((s) => (s.symbol === symbol ? { ...s, ...patch } : s)),
    );
    setErrors((prev) => ({ ...prev, [symbol]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const s of settings) {
      if (!s.enabled) continue;
      if (!s.type) {
        newErrors[s.symbol] = "กรุณาเลือกประเภทการแจ้งเตือน";
      } else if (s.type === "price") {
        if (
          !s.targetPrice ||
          isNaN(Number(s.targetPrice)) ||
          Number(s.targetPrice) <= 0
        ) {
          newErrors[s.symbol] = "กรุณากรอกราคาเป้าหมายที่ถูกต้อง";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    // If turning on and not yet subscribed → ask for push permission
    if (globalEnabled && !isSubscribed) {
      const ok = await subscribe();
      if (!ok) {
        setIsSaving(false);
        return;
      }
    }

    try {
      await fetch(`/api/notification/${userColId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          globalEnabled,
          notifications: settings.filter((s) => s.enabled),
        }),
      });
      onClose();
    } catch (err) {
      console.error("Failed to save notification settings", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[500px] max-h-[88vh] flex flex-col bg-black-lighter rounded-2xl border border-accent-yellow/20 shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-accent-yellow/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-yellow/10 border border-accent-yellow/30 flex items-center justify-center">
              <FaBell className="text-accent-yellow text-[13px]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                การแจ้งเตือน
              </h2>
              <p className="text-accent-yellow/50 text-xs">
                {assets.length} สินทรัพย์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="text-[12px]" />
          </button>
        </div>

        {/* Master on/off — just this user's global switch, doesn't touch individual settings */}
        <div className="px-6 py-4 border-b border-accent-yellow/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-[13px] font-semibold">
                ใช้งานการแจ้งเตือน
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                {permission === "denied"
                  ? "⚠️ กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์"
                  : isSubscribed
                    ? "✓ อนุญาตแล้ว"
                    : "จะขอสิทธิ์เมื่อกด บันทึก"}
              </p>
            </div>
            <Toggle
              enabled={globalEnabled}
              onToggle={() => setGlobalEnabled((v) => !v)}
              accent
            />
          </div>
        </div>

        {/* Stock list */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {isFetching ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-6 h-6">
                <svg className="animate-spin w-full h-full" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.15"
                    strokeWidth="4"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="80 200"
                    strokeDashoffset="-10"
                  />
                </svg>
              </div>
            </div>
          ) : (
            settings.map((s) => {
              const logoUrl = getLogo(s.symbol);
              return (
                <div
                  key={s.symbol}
                  className={`rounded-xl border transition-colors p-4 space-y-3 ${
                    s.enabled
                      ? "border-accent-yellow/20 bg-black"
                      : "border-accent-yellow/10 bg-black"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full bg-cover bg-center border border-white/10 shrink-0 ${logoUrl ? "" : "bg-white"}`}
                        style={{ backgroundImage: `url(${logoUrl})` }}
                      />
                      <span className="text-white font-semibold text-[13px]">
                        {getName(s.symbol)}
                      </span>
                      <span className="text-gray-600 text-[11px]">
                        {s.symbol}
                      </span>
                    </div>
                    <Toggle
                      enabled={s.enabled}
                      onToggle={() =>
                        updateSetting(s.symbol, {
                          enabled: !s.enabled,
                          type: null,
                          targetPrice: "",
                        })
                      }
                    />
                  </div>

                  {s.enabled && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateSetting(s.symbol, {
                              type: "support",
                              targetPrice: "",
                            })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            s.type === "support"
                              ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                              : "bg-transparent text-gray-500 border-white/10 hover:border-white/20"
                          }`}
                        >
                          ตามแนวรับ
                        </button>
                        <button
                          onClick={() =>
                            updateSetting(s.symbol, { type: "price" })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            s.type === "price"
                              ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                              : "bg-transparent text-gray-500 border-white/10 hover:border-white/20"
                          }`}
                        >
                          ราคาที่กำหนด
                        </button>
                      </div>

                      {s.type === "price" && (
                        <input
                          type="number"
                          placeholder="กรอกราคาเป้าหมาย"
                          value={s.targetPrice}
                          onChange={(e) =>
                            updateSetting(s.symbol, {
                              targetPrice: e.target.value,
                            })
                          }
                          className="w-full bg-black border border-accent-yellow/30 rounded-lg px-3 py-2 text-white text-[12px] placeholder-gray-600 focus:outline-none focus:border-accent-yellow/60 transition-colors"
                        />
                      )}

                      {errors[s.symbol] && (
                        <p className="text-red-400 text-[11px]">
                          {errors[s.symbol]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-accent-yellow/10 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white transition-all disabled:opacity-40"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-accent-yellow text-black text-[13px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <>
                <FaCheck className="text-[11px]" /> บันทึก
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  accent = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
        enabled
          ? accent
            ? "bg-accent-yellow"
            : "bg-accent-yellow/80"
          : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${enabled ? "left-[22px] bg-black" : "left-0.5 bg-gray-400"}`}
      />
    </button>
  );
}
