export async function POST() {
  try {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const authKey = process.env.BOT_CLIENT_ID || "";

    const headers = new Headers({
      Accept: "*/*",
      Authorization: authKey,
    });

    async function callApi(date: string) {
      const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${date}&end_period=${date}&currency=USD`;
      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) {
        throw new Error(`BOT API error, status ${response.status}`);
      }
      return response.json();
    }

    // First call with today's date
    let data = await callApi(today);

    const lastUpdated = data?.result?.data?.data_header?.last_updated;
    if (!lastUpdated) {
      throw new Error("API response missing last_updated field");
    }

    // If today's data is not available, fallback to last_updated
    if (lastUpdated !== today) {
      console.log(
        `No data for today (${today}). Fetching last updated: ${lastUpdated}`
      );
      data = await callApi(lastUpdated);
    }

    // Return the full result object
    return new Response(
      JSON.stringify({ rate: data.result.data.data_detail[0].mid_rate }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
