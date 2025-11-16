// src/app/api/news/route.ts
export async function GET(req: Request) {
  const apiToken = process.env.NEWS_API; // store your API token in .env
  const url = new URL(req.url);
  let symbols = url.searchParams.get("symbols"); // e.g., "TSLA,AMZN,MSFT"

  if (symbols === "BINANCE:BTCUSDT") {
    symbols = "BTC";
  }

  if (!symbols) {
    return new Response(
      JSON.stringify({ error: "Missing 'symbols' query parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    let url = "";
    if (symbols === "BTC") {
      // Use search for Bitcoin
      url = `https://api.stockdata.org/v1/news/all?search=Bitcoin&filter_entities=true&language=en&sort=published_on&sort_order=desc&api_token=${apiToken}`;
    } else {
      // Use symbols normally
      url = `https://api.stockdata.org/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&sort=published_on&sort_order=desc&api_token=${apiToken}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch news",
          status: response.status,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error", detail: error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
