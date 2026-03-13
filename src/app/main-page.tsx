"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TiChartPieOutline as ChartIcon,
  TiRefresh as RefreshIcon,
} from "react-icons/ti";
import {
  FaArrowTrendUp as UpIcon,
  FaArrowTrendDown as DownIcon,
  FaBell,
} from "react-icons/fa6";
import {
  FaEye as EyeIcon,
  FaEyeSlash as EyeSlashIcon,
  FaPen,
} from "react-icons/fa";
import {
  fNumber,
  getLogo,
  getName,
  getProfitColor,
  isCash,
  isThaiStock,
} from "./lib/utils";
import { Asset } from "./lib/interface";
import ViewScreen, { StockResult } from "@/shared/pages/ViewScreen";
import AnalystScreen from "@/shared/pages/AnalystScreen";
import CalculateScreen from "@/shared/pages/CalculateScreen";
import { useNumbersHidden } from "@/shared/hooks/useNumbersHidden";
import { useMaskNumber } from "@/shared/hooks/useMaskNumber";
import EditModal from "@/shared/components/modal/EditModal";
import { NoItem } from "@/shared/components/common/NoItem";
import CommonLoading from "@/shared/components/common/CommonLoading";
import FooterPortfolio from "@/shared/components/common/Footer";
import BottomNavbar from "@/shared/components/common/Navbar";
import {
  EditProfileModal,
  ProfileAvatar,
} from "@/shared/components/modal/EditProfileModal";
import {
  defaultMarketResponse,
  MarketResponse,
} from "@/shared/pages/AnalystScreen/components/GraphPrice";
import NotificationModal from "@/shared/components/modal/NotificationModal";
import {
  MAX_WISHLIST_PINS,
  SESSION_COOKIE_MAX_AGE,
  SESSION_DURATION_MS,
  SESSION_KEY,
} from "./lib/constants";

const thaiMonths = [
  "ม.ค",
  "ก.พ",
  "มี.ค",
  "เม.ย",
  "พ.ค",
  "มิ.ย",
  "ก.ค",
  "ส.ค",
  "ก.ย",
  "ต.ค",
  "พ.ย",
  "ธ.ค",
];

const isMock = false;

interface SessionData {
  userId: string;
  userColId: string;
  expiresAt: number;
}

export default function MainApp() {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [previousPrice, setPreviousPrice] = useState<
    Record<string, number | null>
  >({});
  const [dividend, setDividend] = useState<any>({});
  const [advancedLevels, setAdvancedLevels] = useState<any>({});
  const [graphs, setGraphs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [currencyRate, setCurrencyRate] = useState<number>(0);
  const [formattedDate, setFormattedDate] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState<any>("");
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [userColId, setUserColId] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAssets, setEditAssets] = useState<Asset[]>([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isFirstBatchLoaded, setIsFirstBatchLoaded] = useState(false);
  const [market, setMarket] = useState<MarketResponse | null>(
    defaultMarketResponse,
  );
  const maskNumber = useMaskNumber();

  const [sortBy, setSortBy] = useState<"asset" | "value" | "profit">("value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<
    "portfolio" | "market" | "calculator" | "view"
  >("portfolio");

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [data, setData] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedSymbol, setSearchedSymbol] = useState<string | null>(null);

  const { isNumbersHidden, setIsNumbersHidden } = useNumbersHidden();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // ─── Session helpers ───────────────────────────────────────────────────────
  const saveSession = (uid: string, colId: string) => {
    const sessionData: SessionData = {
      userId: uid,
      userColId: colId,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    document.cookie = `${SESSION_KEY}=1; max-age=${SESSION_COOKIE_MAX_AGE}; path=/`;
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    document.cookie = `${SESSION_KEY}=; max-age=0; path=/`;
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  // ─── On mount: read session, redirect if missing ───────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          router.replace("/");
          return;
        }

        const session: SessionData = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
          clearSession();
          router.replace("/");
          return;
        }

        // Renew session on every app open
        saveSession(session.userId, session.userColId);
        setUserId(session.userId);
        setUserColId(session.userColId);

        await fetchUserData(session.userId);
      } catch (error) {
        console.error("Session restore failed:", error);
        clearSession();
        router.replace("/");
      }
    };
    checkSession();
  }, []);

  // ─── Wishlist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userColId) return;
    const loadWishlist = async () => {
      try {
        const res = await fetch(`/api/wishlist/${userColId}`);
        const json = await res.json();
        setWishlist(json.assets || []);
      } catch (err) {
        console.error("Failed to load wishlist", err);
        setWishlist([]);
      }
    };
    loadWishlist();
  }, [userColId]);

  const togglePin = (symbol: string) => {
    setWishlist((prev) => {
      const isPinned = prev.includes(symbol);
      const next = isPinned
        ? prev.filter((s) => s !== symbol)
        : prev.length < MAX_WISHLIST_PINS
          ? [...prev, symbol]
          : prev;
      if (!isPinned) {
        setSearchedSymbol((current) => (current === symbol ? null : current));
      }
      fetch(`/api/wishlist/${userColId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlist: next }),
      }).catch((err) => console.error("Wishlist sync failed", err));
      return next;
    });
  };

  const fetchSymbols = async (symbols: string[]) => {
    if (!symbols.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/view-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const json = await res.json();
      setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const symbols = Array.from(
      new Set([...(searchedSymbol ? [searchedSymbol] : []), ...wishlist]),
    );
    fetchSymbols(symbols);
  }, [searchedSymbol, wishlist]);

  // ─── Edit modal ────────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditAssets(JSON.parse(JSON.stringify(assets)));
    setIsEditOpen(true);
  };

  const addNewAsset = () => {
    setEditAssets([
      ...editAssets,
      { symbol: "", quantity: 0, costPerShare: 0 },
    ]);
  };

  const removeAsset = (index: number) => {
    setEditAssets(editAssets.filter((_, i) => i !== index));
  };

  // ─── Load data when assets change ─────────────────────────────────────────
  useEffect(() => {
    if (assets && assets.length > 0) {
      loadData();
    } else if (assets !== null && assets.length === 0) {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [assets]);

  const toggleExpand = (symbol: string) => {
    setExpanded((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  // ─── Fetch user data ───────────────────────────────────────────────────────
  async function fetchUserData(userIdParam?: string) {
    const targetUserId = userIdParam || userId;
    if (!targetUserId) throw new Error("กรุณากรอกรหัสผ่าน");

    const response = await fetch(`/api/user/${targetUserId}`);
    if (!response.ok) throw new Error("ไม่เจอผู้ใช้งาน");

    let parsedAssets: Asset[];
    let parsedUserId: string;
    let parsedUsername: string;
    let parsedUserImage: string | null;

    try {
      const responseText = await response.text();
      if (
        !responseText ||
        responseText.trim() === "" ||
        responseText.trim() === '""'
      ) {
        setAssets([]);
        setUserColId(targetUserId);
        return;
      }

      const data = JSON.parse(responseText);
      if (!data.assets || data.assets === "" || data.assets === '""') {
        setAssets([]);
        setUserColId(data.userId || targetUserId);
        return;
      }

      parsedAssets =
        typeof data.assets === "string"
          ? JSON.parse(data.assets)
          : data.assets || [];
      parsedUserId =
        typeof data.userId === "string" && data.userId.startsWith('"')
          ? JSON.parse(data.userId)
          : data.userId || targetUserId;
      parsedUsername =
        typeof data.username === "string" && data.username.startsWith('"')
          ? JSON.parse(data.username)
          : data.username || targetUserId;
      if (typeof data.image === "string" && data.image.trim() !== "") {
        try {
          parsedUserImage = JSON.parse(data.image);
        } catch {
          parsedUserImage = data.image;
        }
      } else {
        parsedUserImage = null;
      }
    } catch (err) {
      console.error("Parse error:", err);
      throw new Error("ไม่สามารถอ่านข้อมูลผู้ใช้งาน");
    }

    if (!parsedAssets || parsedAssets.length === 0) {
      setAssets([]);
      setUserColId(parsedUserId);
      setUsername(parsedUsername);
      setProfileImage(parsedUserImage);
      return;
    }

    setAssets(parsedAssets);
    setUserColId(parsedUserId);
    setProfileImage(parsedUserImage);
    setUsername(parsedUsername);
  }

  // ─── Load market data ──────────────────────────────────────────────────────
  async function loadData() {
    if (!assets || assets.length === 0) return;

    saveSession(userId, userColId); // renew session on every refresh

    setIsLoading(true);
    setIsFirstBatchLoaded(false);
    setPrices({});
    setPreviousPrice({});
    setGraphs({});
    setAdvancedLevels({});
    setDividend({});

    try {
      await Promise.all([fetchFinancialData(), fetchFxRate(), fetchMarket()]);
      const now = new Date();
      const day = now.getDate();
      const month = thaiMonths[now.getMonth()];
      const year = (now.getFullYear() + 543) % 100;
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setFormattedDate(`${day} ${month} ${year} ${hours}:${minutes} น.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }

  async function fetchFinancialData() {
    if (!assets || assets.length === 0) return;
    const BATCH_SIZE = 5;
    const batches: Asset[][] = [];
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      batches.push(assets.slice(i, i + BATCH_SIZE));
    }
    try {
      for (const [index, batch] of batches.entries()) {
        const res = await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets: batch, isMock }),
        });
        if (!res.ok) throw new Error("Failed to fetch API");
        const data = await res.json();
        setPrices((prev) => ({ ...prev, ...(data.prices || {}) }));
        setAdvancedLevels((prev: Record<string, any>) => ({
          ...prev,
          ...(data.advancedLevels || {}),
        }));
        setPreviousPrice((prev) => ({
          ...prev,
          ...(data.previousPrice || {}),
        }));
        setGraphs((prev) => ({ ...prev, ...(data.graphs || {}) }));
        setDividend((prev: any) => ({
          ...prev,
          baseCurrency: data.dividendSummary?.baseCurrency,
          perAsset: {
            ...prev?.perAsset,
            ...(data.dividendSummary?.perAsset || {}),
          },
          totalAnnualDividend:
            (prev?.totalAnnualDividend || 0) +
            (data.dividendSummary?.totalAnnualDividend || 0),
        }));
        if (index === batches.length - 1) {
          setIsFirstBatchLoaded(true);
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchFxRate() {
    if (isMock) {
      setCurrencyRate(32.31);
    } else {
      const res = await fetch("/api/rate", { method: "POST" });
      if (!res.ok) throw new Error(`BOT API Error: ${res.status}`);
      const data = await res.json();
      setCurrencyRate(Number(data.rate) ?? 0);
    }
  }

  async function fetchMarket() {
    const res = await fetch("/api/market");
    const json = await res.json();
    setMarket(json.data);
  }

  // ─── Save Profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async ({
    newUsername,
    newPassword,
    imageUrl,
  }: {
    newUsername: string;
    newPassword: string;
    imageUrl: string | null;
  }) => {
    const payload: any = {
      oldPassword: userId,
      username: newUsername,
      image: imageUrl,
    };

    if (newPassword && newPassword !== userId) {
      payload.newPassword = newPassword;
    } else {
      payload.newPassword = userId;
    }

    const res = await fetch(`/api/profile/${userColId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "บันทึกไม่สำเร็จ");
    }

    const result = await res.json();

    if (newPassword && newPassword !== userId) {
      setUserId(newPassword);
      saveSession(newPassword, userColId);
    }

    setProfileImage(imageUrl);
    await fetchUserData(result.user.id);
  };

  // ─── Save Assets ───────────────────────────────────────────────────────────
  const saveAssets = async () => {
    try {
      for (const a of editAssets) {
        if (!a.symbol || !a.symbol.trim()) {
          alert("กรุณากรอก Symbol");
          return;
        }
        if (a.quantity == null || a.quantity < 0) {
          alert("กรุณากรอกจำนวนหุ้นที่มากกว่าหรือเท่ากับ 0");
          return;
        }
        if (a.costPerShare == null || a.costPerShare <= 0) {
          alert("กรุณากรอกต้นทุนต่อหุ้นที่มากกว่า 0");
          return;
        }
      }
      const res = await fetch(`/api/user/${userColId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: editAssets, isMock }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Error saving assets: " + JSON.stringify(data));
        return;
      }
      setIsEditOpen(false);
      await fetchUserData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // ─── Profile Header ────────────────────────────────────────────────────────
  const ProfileHeader = ({ showActions = true }: { showActions?: boolean }) => (
    <div className="fixed top-[67px] left-0 right-0 bg-black z-[99] sm:max-w-[450px] mx-auto">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-accent-yellow/10">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setIsEditProfileOpen(true)}
        >
          <ProfileAvatar username={username} imageUrl={profileImage} />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {username}'s
            </p>
            <p className="text-accent-yellow/50 text-[11px]">พอร์ตโฟลิโอ</p>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNumbersHidden(!isNumbersHidden)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-black-lighter border border-white/10 transition-all text-[14px]"
            >
              {isNumbersHidden ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-accent-yellow bg-black-lighter border border-white/10 transition-all text-[13px]"
              onClick={openEditModal}
            >
              <FaPen />
            </button>
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-black-lighter border border-white/10 transition-all text-[13px]"
            >
              <FaBell />
            </button>
            <button
              onClick={loadData}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-black-lighter border border-white/10 transition-all text-[18px]"
            >
              <RefreshIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render guards ─────────────────────────────────────────────────────────
  if (isLoading && !isFirstBatchLoaded) return <CommonLoading />;
  if (assets === null) return <CommonLoading />;

  if (assets?.length === 0) {
    return (
      <div className="mt-[81px]">
        {isEditOpen && (
          <EditModal
            editAssets={editAssets}
            setEditAssets={setEditAssets}
            addNewAsset={addNewAsset}
            removeAsset={removeAsset}
            saveAssets={saveAssets}
            setIsEditOpen={setIsEditOpen}
          />
        )}
        {isEditProfileOpen && (
          <EditProfileModal
            onLogout={handleLogout}
            username={username}
            userId={userId}
            profileImage={profileImage}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleSaveProfile}
          />
        )}
        <ProfileHeader showActions={false} />
        <NoItem
          onAddClick={openEditModal}
          isEditOpen={isEditOpen}
          editAssets={editAssets}
          setEditAssets={setEditAssets}
          addNewAsset={addNewAsset}
          removeAsset={removeAsset}
          saveAssets={saveAssets}
          setIsEditOpen={setIsEditOpen}
          EditModal={EditModal}
        />
        <BottomNavbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    );
  }

  // ─── Sort ──────────────────────────────────────────────────────────────────
  const sortedAssets = [...assets].sort((a, b) => {
    const priceA = prices[a.symbol] ?? 0;
    const priceB = prices[b.symbol] ?? 0;
    const isThaiA = isThaiStock(a.symbol);
    const isThaiB = isThaiStock(b.symbol);
    const valueA = isThaiA
      ? priceA * a.quantity
      : priceA * a.quantity * currencyRate;
    const valueB = isThaiB
      ? priceB * b.quantity
      : priceB * b.quantity * currencyRate;
    const profitA =
      valueA - a.costPerShare * a.quantity * (isThaiA ? 1 : currencyRate);
    const profitB =
      valueB - b.costPerShare * b.quantity * (isThaiB ? 1 : currencyRate);
    let compare = 0;
    if (sortBy === "asset") compare = a.symbol.localeCompare(b.symbol);
    else if (sortBy === "value") compare = valueA - valueB;
    else if (sortBy === "profit") compare = profitA - profitB;
    return sortOrder === "asc" ? compare : -compare;
  });

  const toggleSort = (column: "asset" | "value" | "profit") => {
    if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(column);
      setSortOrder(column === "asset" ? "asc" : "desc");
    }
  };

  const isFullyLoaded = assets?.every((a) => a.symbol in prices) ?? false;

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div
      className={`mt-[81px] ${currentPage === "portfolio" ? "mb-[172px]" : ""}`}
    >
      {isEditOpen && (
        <EditModal
          editAssets={editAssets}
          setEditAssets={setEditAssets}
          addNewAsset={addNewAsset}
          removeAsset={removeAsset}
          saveAssets={saveAssets}
          setIsEditOpen={setIsEditOpen}
        />
      )}
      {isEditProfileOpen && (
        <EditProfileModal
          onLogout={handleLogout}
          username={username}
          userId={userId}
          profileImage={profileImage}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
      {isNotificationOpen && (
        <NotificationModal
          assets={assets}
          userColId={userColId}
          wishlist={wishlist}
          wishlistAdvancedLevels={data.reduce<Record<string, any>>(
            (acc, item) => {
              acc[item.symbol] = {
                currentPrice: item.levels?.currentPrice ?? null,
                shortName: item.levels?.shortName ?? item.symbol,
                entry1: item.levels?.entry1 ?? null,
                entry2: item.levels?.entry2 ?? null,
              };
              return acc;
            },
            {},
          )}
          advancedLevels={advancedLevels}
          onClose={() => setIsNotificationOpen(false)}
        />
      )}

      {currentPage === "portfolio" && (
        <div className="fixed top-[67px] left-0 right-0 bg-black z-[99] sm:max-w-[450px] mx-auto">
          <ProfileHeader showActions={true} />
          <div className="mt-[68px] grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-black border-b border-black-lighter">
            <div
              className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors select-none"
              onClick={() => toggleSort("asset")}
            >
              สินทรัพย์{" "}
              {sortBy === "asset" && (
                <span className="text-accent-yellow">
                  {sortOrder === "asc" ? "▲" : "▼"}
                </span>
              )}
            </div>
            <div
              className="text-[11px] text-gray-500 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-gray-300 transition-colors select-none"
              onClick={() => toggleSort("value")}
            >
              มูลค่า (THB){" "}
              {sortBy === "value" && (
                <span className="text-accent-yellow">
                  {sortOrder === "asc" ? "▲" : "▼"}
                </span>
              )}
            </div>
            <div
              className="text-[11px] text-gray-500 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-gray-300 transition-colors select-none"
              onClick={() => toggleSort("profit")}
            >
              % กำไร{" "}
              {sortBy === "profit" && (
                <span className="text-accent-yellow">
                  {sortOrder === "asc" ? "▲" : "▼"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap w-full">
        {currentPage === "view" && (
          <ViewScreen
            data={data}
            wishlist={wishlist}
            loading={loading}
            searchedSymbol={searchedSymbol}
            onSearch={setSearchedSymbol}
            onTogglePin={togglePin}
          />
        )}
        {currentPage === "market" && (
          <AnalystScreen
            prices={prices}
            advancedLevels={advancedLevels}
            assets={assets}
            graphs={graphs}
            previousPrice={previousPrice}
            wishlist={wishlist}
            currencyRate={currencyRate}
            userId={userId}
            market={market!}
          />
        )}
        {currentPage === "calculator" && (
          <CalculateScreen
            assets={assets}
            prices={prices}
            dividend={dividend}
            currencyRate={currencyRate}
          />
        )}

        {currentPage === "portfolio" && (
          <div className="mt-[90px] mb-[50px] w-full">
            {sortedAssets.map((asset) => {
              const isThai = isThaiStock(asset.symbol);
              const currentPrice = prices[asset.symbol] ?? 0;
              const cost = asset.costPerShare * asset.quantity;
              const marketValueBase = currentPrice * asset.quantity;
              const marketValueThb = isThai
                ? marketValueBase
                : marketValueBase * currencyRate;

              let profitBase = currentPrice > 0 ? marketValueBase - cost : 0;
              let profitThb = isThai ? profitBase : profitBase * currencyRate;

              if (isCash(asset.symbol)) {
                profitBase = 0;
                profitThb = 0;
              }

              const profitPercent =
                currentPrice > 0 && cost > 0 ? (profitBase / cost) * 100 : 0;
              const profitColor = getProfitColor(profitBase);
              const isExpanded = !!expanded[asset.symbol];

              const portfolioValueThb = assets.reduce((sum, a) => {
                const price = prices[a.symbol] ?? 0;
                const isThaiAsset = isThaiStock(a.symbol);
                const value = price * a.quantity;
                return sum + (isThaiAsset ? value : value * currencyRate);
              }, 0);

              const previousClose = previousPrice[asset.symbol] ?? 0;
              const percentChange =
                previousClose > 0
                  ? ((currentPrice - previousClose) / previousClose) * 100
                  : 0;
              const currencyLabel = isThai ? "THB" : "USD";
              const logoUrl = getLogo(asset.symbol);
              const isLoadingThis = !(asset.symbol in prices);

              return (
                <div key={asset.symbol} className="w-full">
                  <div
                    className="w-full grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-3 cursor-pointer hover:bg-black-lighter/40 transition-colors"
                    onClick={() => toggleExpand(asset.symbol)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-[32px] h-[32px] rounded-full bg-cover bg-center border border-white/10 shrink-0 ${logoUrl ? "" : "bg-white"}`}
                          style={{ backgroundImage: `url(${logoUrl})` }}
                        />
                        <div>
                          <div className="font-bold text-[15px] text-white leading-tight">
                            {getName(asset.symbol)}
                          </div>
                          <div className="font-normal text-[11px] text-gray-500 max-w-[90px] truncate">
                            {graphs[asset.symbol]?.shortName ?? ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1">
                        <ChartIcon className="text-accent-yellow/60" />
                        {portfolioValueThb > 0
                          ? `${fNumber((marketValueThb / portfolioValueThb) * 100)}%`
                          : "0.00%"}
                      </div>
                    </div>

                    <div className="flex flex-col items-end whitespace-nowrap">
                      <div className="font-bold text-[15px] text-white">
                        {isLoadingThis ? (
                          <span className="inline-block w-16 h-4 bg-white/10 rounded animate-pulse" />
                        ) : (
                          <>
                            {maskNumber(fNumber(marketValueThb))}
                            <span className="text-[10px] text-gray-500 ml-1">
                              บาท
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ≈{" "}
                        {maskNumber(
                          fNumber(
                            isThai
                              ? marketValueBase / currencyRate
                              : marketValueBase,
                          ),
                        )}
                        <span className="ml-1">USD</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <div
                        className={`font-bold text-[15px] flex items-center gap-1 ${profitColor}`}
                      >
                        {profitBase > 0 ? (
                          <UpIcon className="text-[11px]" />
                        ) : profitBase < 0 ? (
                          <DownIcon className="text-[11px]" />
                        ) : null}
                        {isLoadingThis ? (
                          <span className="inline-block w-10 h-4 bg-white/10 rounded animate-pulse" />
                        ) : (
                          <>{fNumber(profitPercent)}%</>
                        )}
                      </div>
                      <div className={`text-[11px] ${profitColor}`}>
                        ({profitBase > 0 ? "+" : ""}
                        {maskNumber(fNumber(profitThb))} บาท)
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-black-lighter border-y border-accent-yellow/10 text-[12px] grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3">
                      <div className="col-span-2 flex items-center gap-2 mb-1">
                        <span className="text-gray-500 text-[11px]">
                          เปลี่ยนแปลงวันนี้
                        </span>
                        <span
                          className={`flex items-center gap-1 font-bold text-[12px] px-2 py-0.5 rounded-full ${getProfitColor(percentChange)} bg-black/40`}
                        >
                          {percentChange > 0 ? (
                            <UpIcon className="text-[10px]" />
                          ) : percentChange < 0 ? (
                            <DownIcon className="text-[10px]" />
                          ) : null}
                          {percentChange > 0 ? "+" : ""}
                          {fNumber(percentChange)}%
                        </span>
                      </div>
                      <div className="text-gray-400">
                        จำนวนหุ้น{" "}
                        <span className="text-white font-medium">
                          {maskNumber(
                            fNumber(asset.quantity, { decimalNumber: 7 }),
                          )}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        ราคาปัจจุบัน{" "}
                        <span className="text-white font-medium">
                          {fNumber(currentPrice)} {currencyLabel}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        ต้นทุน/หุ้น{" "}
                        <span className="text-white font-medium">
                          {maskNumber(
                            fNumber(asset.costPerShare, { decimalNumber: 4 }),
                          )}{" "}
                          {currencyLabel}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        ต้นทุนรวม{" "}
                        <span className="text-white font-medium">
                          {maskNumber(fNumber(cost))} {currencyLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-b border-white/5 mx-4" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {currentPage === "portfolio" && (
        <FooterPortfolio
          assets={assets}
          prices={prices}
          previousPrice={previousPrice}
          currencyRate={currencyRate}
          formattedDate={formattedDate}
          getProfitColor={getProfitColor}
          isNumbersHidden={isNumbersHidden}
        />
      )}

      <BottomNavbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isFullyLoaded={isFullyLoaded}
      />
    </div>
  );
}
