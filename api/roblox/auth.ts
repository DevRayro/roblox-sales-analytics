import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { cookie } = req.body;
  if (!cookie) return res.status(400).json({ error: "Missing cookie" });

  try {
    const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
    });

    if (!response.ok) {
      return res.status(401).json({ error: "Invalid cookie" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
