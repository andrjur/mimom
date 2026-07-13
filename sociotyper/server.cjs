var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/umami/stats", async (req, res) => {
    try {
      const shareId = req.query.shareId;
      const websiteId = req.query.websiteId;
      if (!shareId && !process.env.UMAMI_API_KEY) {
        return res.status(400).json({ error: "Share ID or UMAMI_API_KEY is required" });
      }
      const headers = {
        "Content-Type": "application/json"
      };
      if (shareId) {
        const tokenRes = await fetch(`https://cloud.umami.is/api/share/${shareId}`);
        if (!tokenRes.ok) {
          return res.status(tokenRes.status).json({ error: "Failed to fetch share token" });
        }
        const tokenData = await tokenRes.json();
        if (tokenData.token) {
          headers["x-umami-share-token"] = tokenData.token;
        }
      } else if (process.env.UMAMI_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.UMAMI_API_KEY}`;
      }
      const now = Date.now();
      const startAt = now - 24 * 60 * 60 * 1e3 * 30;
      const statsRes = await fetch(
        `https://cloud.umami.is/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${now}`,
        { headers }
      );
      if (!statsRes.ok) {
        const err = await statsRes.text();
        return res.status(statsRes.status).json({ error: "Failed to fetch Umami stats: " + err });
      }
      const stats = await statsRes.json();
      res.json(stats);
    } catch (error) {
      const err = error;
      console.error(err.message || error);
      res.status(500).json({ error: err.message || "Unknown error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
