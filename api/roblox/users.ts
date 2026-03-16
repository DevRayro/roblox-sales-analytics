import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ error: "Missing or invalid userIds array" });
  }

  try {
    const response = await fetch("https://users.roblox.com/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ userIds, excludeBannedUsers: false }),
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
