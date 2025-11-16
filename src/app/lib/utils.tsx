import { MemberObj } from "@/app/lib/interface";
import { MODE } from "./constants";
import { replace } from "lodash";
import numeral from "numeral";

export const getMemberObjByName = (
  name: string,
  members: MemberObj[]
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
      char.charCodeAt(0)
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

// Function to call the /api/shorten endpoint
export async function getShortUrl(longUrl: string) {
  try {
    const response = await fetch("/api/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ longUrl }),
    });

    // Handle the response from the API
    if (response.ok) {
      const data = await response.json();
      console.log("Shortened URL:", data.shortUrl);
      return data.shortUrl; // Return the shortened URL
    } else {
      const errorData = await response.json();
      console.error("Error shortening URL:", errorData);
      throw new Error(errorData.error || "Unknown error");
    }
  } catch (error) {
    console.error("Failed to shorten URL:", error);
    return longUrl; // Return the original longUrl in case of error
  }
}

export function getPrice(
  price: number,
  vat?: number | null,
  serviceCharge?: number | null
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
  options?: { disabledDecimal?: boolean; decimalNumber?: number }
) {
  const { disabledDecimal = false, decimalNumber = 2 } = options || {};

  if (disabledDecimal) return numeral(number).format("0,0");

  const format = `0,0.${"0".repeat(decimalNumber)}`;
  return numeral(number).format(format);
}

export function f3Number(
  number: string | number,
  options?: { disabledDecimal: boolean }
) {
  if (options) {
    if (options.disabledDecimal) return numeral(number).format();
  }
  return numeral(number).format("0,0.000");
}

export function fInteger(
  number: string | number,
  options?: { disabledDecimal: boolean }
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
    Number.isInteger(formattedVal) ? "0" : "0.[00]"
  );
}

export function fTon(number: string | number) {
  const n = Number(number) / 1000;
  return numeral(n).format(
    Number.isInteger(n) ? "0,0" : "$0,0.00".replace("$", "")
  );
}

//Assets

const defaultStockLogo =
  "https://png.pngtree.com/png-vector/20190331/ourmid/pngtree-growth-icon-vector--glyph-or-solid-style-icon-stock-png-image_876941.jpg";
const defaultCryptoLogo =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png";

export function getLogo(symbol: string, logos: any): string {
  if (symbol === "BINANCE:BTCUSDT") return defaultCryptoLogo;
  return logos?.[symbol] ?? defaultStockLogo;
}

export function getName(symbol: string) {
  if (symbol === "BINANCE:BTCUSDT") return "BTC";
  return symbol;
}

export function getProfitColor(profit: number): string {
  if (profit > 0) return "!text-green-500";
  if (profit < 0) return "!text-red-500";
  return "!text-gray-500";
}
