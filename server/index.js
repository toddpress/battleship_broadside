import express from "express";
import { createServer } from "node:http";
import Gun from "gun";
import { Matchmaker } from "./matchmaker.js";
const app = express();
app.use(express.json({ limit: "12kb" }));
const server = createServer(app);
const gun = Gun({
  web: server,
  file: "radata",
  radisk: false,
  localStorage: false,
});
const publicState = (m) => ({
  id: m.id,
  status: m.status,
  turn: m.turn,
  winner: m.winner ?? -1,
  revision: m.revision,
  lastShot: m.lastShot ? JSON.stringify(m.lastShot) : "",
});
const mm = new Matchmaker({
  publish: (m) =>
    gun.get("broadside-v1").get("matches").get(m.id).put(publicState(m)),
});
app.post("/api/join", (req, res) => {
  const token =
    typeof req.body?.token === "string" && /^[\w-]{36}$/.test(req.body.token)
      ? req.body.token
      : undefined;
  res.json(mm.join(token));
});
app.get("/api/state/:token", (req, res) => {
  const s = mm.heartbeat(req.params.token);
  if (!s) return res.status(404).json({ error: "Session expired" });
  res.json(s);
});
app.post("/api/shoot", (req, res) => {
  const { token, x, y } = req.body ?? {};
  const result = mm.shoot(token, x, y);
  res.status(result.status ?? 200).json(result);
});
app.post("/api/leave", (req, res) => {
  mm.leave(req.body?.token);
  res.json({ ok: true });
});
app.get("/api/health", (_req, res) => res.json({ ok: true }));
setInterval(() => mm.sweep(), 10000).unref();
server.listen(Number(process.env.PORT ?? 8787), () =>
  console.log(
    "Broadside relay and game server on http://localhost:" +
      (process.env.PORT ?? 8787),
  ),
);
