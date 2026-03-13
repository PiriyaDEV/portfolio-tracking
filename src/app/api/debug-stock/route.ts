export async function GET() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=3mo";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const data = await res.json();
  return Response.json(data);
}
