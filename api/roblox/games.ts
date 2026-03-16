import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { universeIds } = req.query;
  if (!universeIds) return res.status(400).json({ error: "Missing universeIds" });

  try {
    const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds}`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
