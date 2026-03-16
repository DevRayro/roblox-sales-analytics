import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { cookie, userId } = req.body;
  if (!cookie || !userId) return res.status(400).json({ error: "Missing cookie or userId" });

  try {
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch groups" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
