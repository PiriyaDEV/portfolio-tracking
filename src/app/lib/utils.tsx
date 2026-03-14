import { MemberObj } from "@/app/lib/interface";
import { MODE } from "./constants";
import { replace } from "lodash";
import numeral from "numeral";
import crypto from "crypto";

const ENCRYPT_KEY = process.env.GOOGLE_SHEET_ID;
const IV_LENGTH = 16;

export const getMemberObjByName = (
  name: string,
  members: MemberObj[],
): MemberObj | undefined => {
  return members.find((m) => m.name === name);
};

// Helper functions (encode and decode as before)
export const encodeBase64 = (data: any) => {
  const jsonString = JSON.stringify(data);
  const utf8Array = new TextEncoder().encode(jsonString);
  let binary = "";
  utf8Array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const decodeBase64 = (data: string) => {
  try {
    const decodedString = atob(data);
    const utf8Array = Array.from(decodedString).map((char) =>
      char.charCodeAt(0),
    );
    const jsonString = new TextDecoder().decode(new Uint8Array(utf8Array));
    return JSON.parse(jsonString);
  } catch (e) {
    return [];
  }
};

// Function to get URL parameters (Base64 encoded)
export const getURLParams = () => {
  const params = new URLSearchParams(window.location.search);
  const membersParam = params.get("members");
  const itemArrParam = params.get("itemArr");
  const billNameParam = params.get("billName");
  const modeParam = params.get("mode");
  const settingParam = params.get("setting");

  return {
    members: membersParam ? decodeBase64(membersParam) : [],
    itemArr: itemArrParam ? decodeBase64(itemArrParam) : [],
    billName: billNameParam ? decodeBase64(billNameParam) : "",
    mode: modeParam ? decodeBase64(modeParam) : MODE.EDIT,
    setting: settingParam
      ? decodeBase64(settingParam)
      : {
          vat: 7,
          serviceCharge: 10,
        },
  };
};

export function getPrice(
  price: number,
  vat?: number | null,
  serviceCharge?: number | null,
): number {
  let basePrice = price;

  // Add service charge first
  if (serviceCharge != null) {
    basePrice += price * (serviceCharge / 100);
  }

  // Apply VAT on top of the price + service charge
  if (vat != null) {
    basePrice += basePrice * (vat / 100);
  }

  return basePrice;
}

// ----------------------------------------------------------------------

export function fCurrency(number: string | number) {
  return numeral(number).format(Number.isInteger(number) ? "$0,0" : "$0,0.00");
}

export function fPercent(number: number) {
  return numeral(number / 100).format("0.0%");
}

export function fNumber(
  number: string | number,
  options?: { disabledDecimal?: boolean; decimalNumber?: number },
) {
  const { disabledDecimal = false, decimalNumber = 2 } = options || {};

  if (disabledDecimal) return numeral(number).format("0,0");

  const format = `0,0.${"0".repeat(decimalNumber)}`;
  return numeral(number).format(format);
}

export function f3Number(
  number: string | number,
  options?: { disabledDecimal: boolean },
) {
  if (options) {
    if (options.disabledDecimal) return numeral(number).format();
  }
  return numeral(number).format("0,0.000");
}

export function fInteger(
  number: string | number,
  options?: { disabledDecimal: boolean },
) {
  if (options) {
    if (options.disabledDecimal) return numeral(number).format();
  }
  return numeral(number).format("0,0");
}

export function fShortenNumber(number: string | number) {
  return replace(numeral(number).format("0.00a"), ".00", "");
}

export function fData(number: string | number) {
  return numeral(number).format("0.0 b");
}

export function formatNumber(val: string, min?: number) {
  const numVal = parseFloat(val);
  const formattedVal = min !== undefined && numVal < min ? min : numVal;

  return numeral(formattedVal).format(
    Number.isInteger(formattedVal) ? "0" : "0.[00]",
  );
}

export function fTon(number: string | number) {
  const n = Number(number) / 1000;
  return numeral(n).format(
    Number.isInteger(n) ? "0,0" : "$0,0.00".replace("$", ""),
  );
}

//Assets

const DEFAULT_STOCK_LOGO =
  "https://png.pngtree.com/png-vector/20190331/ourmid/pngtree-growth-icon-vector--glyph-or-solid-style-icon-stock-png-image_876941.jpg";
const DEFAULT_PVD_LOGO =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiz97SSXXGQFeyG7trM62emx0p3HtM73cjPg&s";

export const DEFAULT_SP500_LOGO =
  "https://cdn-icons-png.flaticon.com/512/3909/3909383.png";

export const DEFAULT_GOLD_LOGO =
  "https://cdn-icons-png.flaticon.com/512/9590/9590147.png";

export const DEFAULT_CRYPTO_LOGO =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxjVTE3M2v2tGkmuoZKAL7roppVSJuL9IN3w&s";

export const DEFAULT_OIL_LOGO =
  "https://static.thenounproject.com/png/1053409-200.png";

export const DEFAULT_SET_LOGO =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRe8tM3-t2BDnm-9vKA-mN5yEQci4cOHUBGrw&s";

export function getLogo(symbol: string): string {
  if (!symbol) return DEFAULT_STOCK_LOGO;

  // Special assets
  switch (symbol) {
    case "BTC-USD":
      return DEFAULT_CRYPTO_LOGO;

    case "GOLD-USD":
      return DEFAULT_GOLD_LOGO;

    case "GC=F":
      return DEFAULT_GOLD_LOGO;

    case "CL=F":
      return DEFAULT_OIL_LOGO;

    case "^GSPC":
      return DEFAULT_SP500_LOGO;

    case "^SET.BK":
      return DEFAULT_SET_LOGO;

    case "TISCO-PVD":
      return DEFAULT_PVD_LOGO;
  }

  const ticker = symbol.includes(":") ? symbol.split(":")[1] : symbol;
  const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;

  if (!token) return DEFAULT_STOCK_LOGO;

  return `https://img.logokit.com/ticker/${ticker}?token=${token}`;
}

export function getName(symbol: string) {
  switch (symbol) {
    case "BTC-USD":
      return "BTC";
    case "GC=F":
      return "GOLD";
    case "CL=F":
      return "OIL";
    case "^GSPC":
      return "S&P 500";
    case "^SET.BK":
      return "SET";
    case "TISCO-PVD":
      return "TISCO-PVD";
    default:
      return symbol;
  }
}

export function getProfitColor(profit: number): string {
  if (profit > 0) return "!text-green-500";
  if (profit < 0) return "!text-red-500";
  return "!text-gray-500";
}

// Helper function to check if stock is Thai
export const isThaiStock = (symbol: string): boolean => {
  return symbol.toUpperCase().endsWith(".BK") || symbol === "THB=X";
};

export const isCash = (symbol: string): boolean => {
  return symbol === "THB=X" || symbol === "TISCO-PVD";
};

// ─── Encrypt Function ─────────────────────────────────────────────
export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.createHash("sha256").update(ENCRYPT_KEY!).digest();

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  // return iv + encrypted (so we can decrypt later)
  return iv.toString("base64") + ":" + encrypted;
}

// ─── Decrypt Function ─────────────────────────────────────────────
export function decrypt(text: string) {
  const [ivBase64, encryptedData] = text.split(":");

  const iv = Buffer.from(ivBase64, "base64");
  const key = crypto.createHash("sha256").update(ENCRYPT_KEY!).digest();

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
