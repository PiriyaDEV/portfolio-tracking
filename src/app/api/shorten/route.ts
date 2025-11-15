export async function POST(req: Request) {
  const { longUrl } = await req.json();
  const apiToken = process.env.TINY_TOKEN;

  try {
    const response = await fetch(`https://api.tinyurl.com/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        url: longUrl,
        domain: "tinyurl.com",
      }),
    });

    const result = await response.json();

    // Check if the API returned the expected result
    if (result && result.data && result.data.tiny_url) {
      return new Response(JSON.stringify({ shortUrl: result.data.tiny_url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to shorten URL", detail: result }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to shorten URL", detail: error }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
