import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { groupId } = req.query;

  try {
    const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
    const data = await response.json();

    const iconResponse = await fetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=150x150&format=Png&isCircular=false`);
    const iconData = await iconResponse.json();

    res.json({
      ...data,
      iconUrl: iconData?.data?.[0]?.imageUrl || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
