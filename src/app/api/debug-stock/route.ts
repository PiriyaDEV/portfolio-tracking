export async function GET() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1h&range=2d";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const data = await res.json();
  return Response.json(data);
}
