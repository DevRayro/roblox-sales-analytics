import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  app.post("/api/roblox/sales", async (req, res) => {
    const { groupId, cookie, cursor } = req.body;
    if (!groupId || !cookie) {
      return res.status(400).json({ error: "Missing groupId or cookie" });
    }

    try {
      const url = new URL(`https://economy.roblox.com/v2/groups/${groupId}/transactions`);
      url.searchParams.append("transactionType", "Sale");
      url.searchParams.append("limit", "100");
      url.searchParams.append("cb", Date.now().toString()); // Cache buster
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
        },
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
  });

  app.get("/api/roblox/thumbnails/users", async (req, res) => {
    const { userIds } = req.query;
    if (!userIds) return res.status(400).json({ error: "Missing userIds" });
    
    try {
      const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=48x48&format=Png&isCircular=true`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/roblox/thumbnails/games", async (req, res) => {
    const { universeIds } = req.query;
    if (!universeIds) return res.status(400).json({ error: "Missing universeIds" });
    
    try {
      const response = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/roblox/thumbnails/places", async (req, res) => {
    const { placeIds } = req.query;
    if (!placeIds) return res.status(400).json({ error: "Missing placeIds" });
    
    try {
      const response = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeIds}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/roblox/games", async (req, res) => {
    const { universeIds } = req.query;
    if (!universeIds) return res.status(400).json({ error: "Missing universeIds" });
    
    try {
      const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/roblox/group-info/:groupId", async (req, res) => {
    const { groupId } = req.params;
    try {
      const response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}`);
      const data = await response.json();
      
      const iconResponse = await fetch(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=150x150&format=Png&isCircular=false`);
      const iconData = await iconResponse.json();
      
      res.json({
        ...data,
        iconUrl: iconData?.data?.[0]?.imageUrl || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roblox/users", async (req, res) => {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "Missing or invalid userIds array" });
    }
    
    try {
      const response = await fetch(`https://users.roblox.com/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ userIds, excludeBannedUsers: false })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roblox/auth", async (req, res) => {
    const { cookie } = req.body;
    if (!cookie) return res.status(400).json({ error: "Missing cookie" });

    try {
      const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
        headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
      });
      
      if (!response.ok) {
        return res.status(401).json({ error: "Invalid cookie" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roblox/groups", async (req, res) => {
    const { cookie, userId } = req.body;
    if (!cookie || !userId) return res.status(400).json({ error: "Missing cookie or userId" });

    try {
      const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, {
        headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch groups" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
