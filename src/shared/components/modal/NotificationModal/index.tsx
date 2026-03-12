"use client";

import { Asset } from "@/app/lib/interface";
import { getLogo, getName } from "@/app/lib/utils";
import { useEffect, useState } from "react";
import { FaTimes, FaCheck, FaBell, FaRedo } from "react-icons/fa";
import { usePushNotification } from "@/shared/hooks/usePushNotification";

type NotifType = "support1" | "support2" | "price" | null;

interface AdvancedLevel {
  entry1?: number;
  entry2?: number;
  [key: string]: any;
}

interface StockNotifSetting {
  symbol: string;
  enabled: boolean;
  type: NotifType;
  targetPrice: string;
}

interface NotificationModalProps {
  assets: Asset[];
  userColId: string;
  advancedLevels?: Record<string, AdvancedLevel>;
  onClose: () => void;
}

export default function NotificationModal({
  assets,
  userColId,
  advancedLevels = {},
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
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [notifiedToday, setNotifiedToday] = useState<string[]>([]);
  const { permission, isSubscribed, subscribe, ensureSubscription } =
    usePushNotification(userColId);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/notification/${userColId}`);
        if (!res.ok) return;
        const json = await res.json();
        const saved = json.notification;
        const isGlobalEnabled = saved.globalEnabled ?? false;
        const hasSubscriptionInSheet = json.hasSubscription ?? false;

        setGlobalEnabled(isGlobalEnabled);
        setNotifiedToday(json.notifiedToday ?? []);
        setSettings(
          assets.map((a) => {
            const match = saved.notifications?.find(
              (n: StockNotifSetting) => n.symbol === a.symbol,
            );
            return match
              ? {
                  symbol: match.symbol,
                  enabled: match.enabled,
                  type: match.type,
                  targetPrice: match.targetPrice ?? "",
                }
              : {
                  symbol: a.symbol,
                  enabled: false,
                  type: null,
                  targetPrice: "",
                };
          }),
        );

        if (isGlobalEnabled) {
          await ensureSubscription(hasSubscriptionInSheet);
        }
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
      console.error("Failed to save", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch(`/api/notification-reset/${userColId}`, { method: "POST" });
      setResetDone(true);
      setNotifiedToday([]); // clear banner ทันทีหลัง reset
      setTimeout(() => setResetDone(false), 3000);
    } catch (err) {
      console.error("Reset failed", err);
    } finally {
      setIsResetting(false);
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

        {/* Global toggles + Reset */}
        <div className="px-6 py-4 border-b border-accent-yellow/10 space-y-3">
          {/* Global enable */}
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/8">
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

          {/* วันนี้แจ้งเตือนแล้ว banner */}
          {notifiedToday.length > 0 && (
            <div className="flex items-start gap-2 py-2.5 px-3 rounded-xl bg-accent-yellow/5 border border-accent-yellow/20">
              <FaBell className="text-accent-yellow text-[11px] mt-0.5 shrink-0" />
              <div className="flex items-center gap-1">
                <p className="text-accent-yellow text-[12px] font-semibold leading-tight">
                  วันนี้แจ้งเตือนแล้ว
                </p>
                <p className="text-accent-yellow/60 text-[11px] mt-0.5">
                  {notifiedToday.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={isResetting}
            className={`w-full py-2 rounded-xl border text-[12px] font-medium flex items-center justify-center gap-2 transition-all ${
              resetDone
                ? "border-green-500/40 text-green-400 bg-green-500/5"
                : "border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-white/[0.02]"
            } disabled:opacity-40`}
          >
            {isResetting ? (
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-500 border-t-white animate-spin" />
            ) : resetDone ? (
              <>
                <FaCheck className="text-[11px]" /> รีเซ็ตแล้ว
                สามารถแจ้งเตือนใหม่ได้วันนี้
              </>
            ) : (
              <>
                <FaRedo className="text-[11px]" /> รีเซ็ตการแจ้งเตือนวันนี้
              </>
            )}
          </button>
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
              const levels = advancedLevels[s.symbol];
              const shortName = levels.shortName ?? s.symbol;
              const entry1 = levels?.entry1;
              const entry2 = levels?.entry2;

              return (
                <div
                  key={s.symbol}
                  className={`rounded-xl border transition-colors p-4 space-y-3 ${
                    s.enabled
                      ? "border-accent-yellow/20 bg-black"
                      : "border-accent-yellow/10 bg-black"
                  }`}
                >
                  {/* Symbol row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full bg-cover bg-center border border-white/10 shrink-0 ${logoUrl ? "" : "bg-white"}`}
                        style={{ backgroundImage: `url(${logoUrl})` }}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-semibold text-[13px]">
                          {getName(s.symbol)}
                        </span>
                        <span className="!text-gray-400 text-[11px]">
                          {shortName}
                        </span>
                      </div>
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
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            updateSetting(s.symbol, {
                              type: "support1",
                              targetPrice: "",
                            })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            s.type === "support1"
                              ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                              : "bg-transparent text-gray-500 border-white/10 hover:border-white/20"
                          }`}
                        >
                          แนวรับ 1
                          {entry1 != null && (
                            <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                              {entry1.toFixed(2)}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            updateSetting(s.symbol, {
                              type: "support2",
                              targetPrice: "",
                            })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            s.type === "support2"
                              ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/40"
                              : "bg-transparent text-gray-500 border-white/10 hover:border-white/20"
                          }`}
                        >
                          แนวรับ 2
                          {entry2 != null && (
                            <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                              {entry2.toFixed(2)}
                            </span>
                          )}
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
  small = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative rounded-full transition-colors duration-200 shrink-0 ${
        small ? "w-8 h-4" : "w-11 h-6"
      } ${enabled ? (accent ? "bg-accent-yellow" : "bg-accent-yellow/80") : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 rounded-full transition-all duration-200 ${
          small ? "w-3 h-3" : "w-5 h-5"
        } ${
          enabled
            ? small
              ? "left-[18px] bg-black"
              : "left-[22px] bg-black"
            : "left-0.5 bg-gray-400"
        }`}
      />
    </button>
  );
}
