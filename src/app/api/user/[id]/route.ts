// app/user/[id]/route.ts
export async function GET(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const apiToken = process.env.DB_TOKEN;

    if (!apiToken) {
      return new Response(JSON.stringify({ error: "API Token is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const query = `
      query {
        boards(ids: 5024696835) {
          items_page(limit: 5) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;

    const mondayRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!mondayRes.ok) {
      const text = await mondayRes.text();
      console.error("Monday API error:", text);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data from Monday API" }),
        {
          status: mondayRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const json = await mondayRes.json();

    const board = json.data.boards[0];

    // Assuming the items you want are inside board.items_page.items
    const user = board.items_page.items.find(
      (item: any) => item.name === String(id)
    );

    let textValue = "";

    if (user) {
      textValue = user.column_values[0].text;
    } else {
      console.log("User not found");
    }

    return new Response(
      JSON.stringify({ assets: textValue, userId: user.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { id } = await context.params;
    const apiToken = process.env.DB_TOKEN;
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "API Token is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the assets from the request body
    const { assets } = await req.json();
    if (!assets || !Array.isArray(assets)) {
      return new Response(JSON.stringify({ error: "Invalid assets data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert assets array to JSON string and escape quotes for GraphQL
    const value = JSON.stringify(assets).replace(/"/g, '\\"');

    const query = `
      mutation {
        change_simple_column_value(
          item_id: ${id},  # ID of item "0002"
          board_id: 5024696835,   # your board ID
          column_id: "text_mkxq500d",  # actual column ID
          value: "${value}"         # use user assets here
        ) {
          id
        }
      }
    `;

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send data to the API" }),
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
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
