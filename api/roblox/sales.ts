import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { groupId, cookie, cursor } = req.body;
  if (!groupId || !cookie) {
    return res.status(400).json({ error: "Missing groupId or cookie" });
  }

  try {
    const url = new URL(`https://economy.roblox.com/v2/groups/${groupId}/transactions`);
    url.searchParams.append("transactionType", "Sale");
    url.searchParams.append("limit", "100");
    url.searchParams.append("cb", Date.now().toString());
    if (cursor) {
      url.searchParams.append("cursor", cursor);
    }

    const response = await fetch(url.toString(), {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Roblox API error: ${response.statusText}`, details: text });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
