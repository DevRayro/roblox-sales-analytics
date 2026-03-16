import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { userIds } = req.query;
  if (!userIds) return res.status(400).json({ error: "Missing userIds" });

  try {
    const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=48x48&format=Png&isCircular=true`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
