import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { placeIds } = req.query;
  if (!placeIds) return res.status(400).json({ error: "Missing placeIds" });

  try {
    const response = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeIds}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
