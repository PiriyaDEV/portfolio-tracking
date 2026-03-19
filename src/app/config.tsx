export const AUTO_REFRESH_INTERVAL_MS = 10_000;
export const AUTO_REFRESH_GRAPH_INTERVAL_MS = 10_000;
export const AUTO_REFRESH_1M_INTERVAL_MS = 60_000;

export const MARKET_KEY_TO_SYMBOL: Record<string, string> = {
  sp500: "^GSPC",
  gold: "GC=F",
  set: "^SET.BK",
  btc: "BTC-USD",
  oil: "CL=F",
};